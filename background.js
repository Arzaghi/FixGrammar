chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fixGrammar",
    title: "FixGrammar",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "fixGrammar") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: fixSelectedTextGrammar
    });
  }
});

async function fixSelectedTextGrammar() {
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    if (start !== end) {
      const selectedText = activeElement.value.substring(start, end);
      const fixedText = await fixGrammarText(selectedText);
      activeElement.setRangeText(fixedText, start, end, 'select');
    }
  } else {
    // Handle contenteditable elements
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      if (selectedText) {
        const fixedText = await fixGrammarText(selectedText);
        range.deleteContents();
        range.insertNode(document.createTextNode(fixedText));
      }
    }
  }
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
    // If selected service returned no suggestions, fall back to LanguageTool
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
      // Log which service provided the fix
      console.log('FixGrammar used service:', finalService);
    } catch (e) {
      // ignore logging errors
    }
    return fixed;
  } catch (error) {
    console.error('FixGrammar API error:', error);
    return text;
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
    // Fallbacks for other APIs could be added here.
    return [];
  }

  function getGrammarServiceUrl() {
    return new Promise((resolve) => {
      chrome.storage.sync.get({ grammarService: 'https://api.languagetool.org/v2/check' }, (items) => {
        resolve(items.grammarService || 'https://api.languagetool.org/v2/check');
      });
    });
  }