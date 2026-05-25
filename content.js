let popup = null;
let currentEditable = null;
let savedInputSelection = null;
let savedRange = null;

function isEditable(element) {
  return element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.contentEditable === 'true');
}

async function fixGrammarText(text) {
  if (!text) return text;
  try {
    const serviceUrl = await getGrammarServiceUrl();
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', 'en-US');
    params.append('enabledOnly', 'false');

      let finalService = serviceUrl;
      const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) return text;
    const data = await response.json();
    let replacements = getReplacementsFromResponse(data);
    if ((!replacements || !replacements.length) && serviceUrl !== 'https://api.languagetool.org/v2/check') {
      try {
        const fallbackResp = await fetch('https://api.languagetool.org/v2/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          replacements = getReplacementsFromResponse(fallbackData);
            if (replacements && replacements.length) finalService = 'https://api.languagetool.org/v2/check (fallback)';
        }
      } catch (e) {
        console.warn('Fallback LanguageTool failed:', e);
      }
    }
    if (!replacements || !replacements.length) return text;

    let fixed = text;
    for (const item of replacements) {
      fixed = fixed.slice(0, item.offset) + item.replacement + fixed.slice(item.offset + item.length);
    }
      try {
        console.log('FixGrammar used service:', finalService);
      } catch (e) {}
    return fixed;
  } catch (error) {
    console.error('FixGrammar API error:', error);
    return text;
  }
}

document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  if (selection.rangeCount > 0 && !selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    let editableElement = null;
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    while (node && node !== document.body) {
      if (isEditable(node)) {
        editableElement = node;
        break;
      }
      node = node.parentNode;
    }
    if (editableElement) {
      currentEditable = editableElement;
      if (currentEditable.tagName === 'INPUT' || currentEditable.tagName === 'TEXTAREA') {
        savedInputSelection = {
          start: currentEditable.selectionStart,
          end: currentEditable.selectionEnd
        };
        savedRange = null;
      } else {
        savedInputSelection = null;
        savedRange = range.cloneRange();
      }
      const rect = range.getBoundingClientRect();
      if (!popup) {
        popup = document.createElement('div');
        popup.style.position = 'absolute';
        popup.style.zIndex = '10000';
        popup.style.background = 'transparent';
        popup.style.color = 'transparent';
        popup.style.padding = '0';
        popup.style.border = 'none';
        popup.style.boxShadow = 'none';
        popup.style.borderRadius = '0';
        popup.style.width = '24px';
        popup.style.height = '24px';
        popup.style.cursor = 'pointer';
        popup.style.display = 'flex';
        popup.style.alignItems = 'center';
        popup.style.justifyContent = 'center';
        const icon = document.createElement('img');
        icon.src = chrome.runtime.getURL('icons/icon128.png');
        icon.style.width = '32px';
        icon.style.height = '32px';
        icon.style.display = 'block';
        icon.style.pointerEvents = 'none';
        popup.appendChild(icon);
        popup.addEventListener('mousedown', (event) => {
          event.preventDefault();
        });
        popup.addEventListener('click', async () => {
          if (!currentEditable) {
            hidePopup();
            return;
          }
          if (currentEditable.tagName === 'INPUT' || currentEditable.tagName === 'TEXTAREA') {
            const start = savedInputSelection?.start;
            const end = savedInputSelection?.end;
            if (start != null && end != null && start !== end) {
              const selectedText = currentEditable.value.substring(start, end);
              const fixedText = await fixGrammarText(selectedText);
              currentEditable.setRangeText(fixedText, start, end, 'select');
            }
          } else if (savedRange) {
            const selectedText = savedRange.toString();
            if (selectedText) {
              const fixedText = await fixGrammarText(selectedText);
              savedRange.deleteContents();
              savedRange.insertNode(document.createTextNode(fixedText));
            }
          }
          currentEditable = null;
          savedInputSelection = null;
          savedRange = null;
          hidePopup();
        });
        document.body.appendChild(popup);
      }
      popup.style.left = `${rect.left + window.scrollX}px`;
      popup.style.top = `${rect.top + window.scrollY - 30}px`;
      popup.style.display = 'block';
    } else {
      currentEditable = null;
      savedInputSelection = null;
      savedRange = null;
      hidePopup();
    }
  } else {
    currentEditable = null;
    savedInputSelection = null;
    savedRange = null;
    hidePopup();
  }
});

function hidePopup() {
  if (popup) {
    popup.style.display = 'none';
  }
}

function getReplacementsFromResponse(data) {
  if (!data) return [];
  if (data.matches && Array.isArray(data.matches)) {
    return data.matches
      .map(match => {
        if (match.replacements && match.replacements.length) {
          return {
            offset: match.offset,
            length: match.length,
            replacement: match.replacements[0].value
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.offset - a.offset);
  }
  return [];
}

function getGrammarServiceUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ grammarService: 'https://api.languagetool.org/v2/check' }, (items) => {
      resolve(items.grammarService || 'https://api.languagetool.org/v2/check');
    });
  });
}