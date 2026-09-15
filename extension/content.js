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
    const settings = await getSettings();
    
    if (settings.grammarService === 'groq') {
      return await fixWithGroq(text, settings.aiApiKey);
    }
    
    // Fall back to LanguageTool for languagetool service
    return await fixWithLanguageTool(text);
  } catch (error) {
    console.error('FixGrammar API error:', error);
    return text;
  }
}

async function fixWithGroq(text, apiKey) {
  if (!apiKey) {
    console.error('FixGrammar: No Groq API key configured');
    return text;
  }

  const prompt = `You are a grammar correction assistant. Your task is to:
1. Detect the language of the following text
2. Fix any grammar, spelling, or punctuation errors
3. Return ONLY the corrected text without any explanations or comments

Text: "${text}"

Corrected text:`;

  const requestBody = {
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.1,
    max_tokens: 2048
  };

  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('FixGrammar Groq API error:', response.status, errorText);
    return text;
  }

  const data = await response.json();
  
  if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
    let fixedText = data.choices[0].message.content;
    // Clean up the response - remove quotes if present
    fixedText = fixedText.trim();
    if ((fixedText.startsWith('"') && fixedText.endsWith('"')) || 
        (fixedText.startsWith("'") && fixedText.endsWith("'"))) {
      fixedText = fixedText.slice(1, -1);
    }
    console.log('FixGrammar used service: Groq AI (Llama)');
    return fixedText;
  }

  return text;
}

async function fixWithLanguageTool(text) {
  const params = new URLSearchParams();
  params.append('text', text);
  params.append('language', 'en-US');
  params.append('enabledOnly', 'false');

  const serviceUrl = 'https://api.languagetool.org/v2/check';
  const response = await fetch(serviceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) return text;
  
  const data = await response.json();
  let replacements = getReplacementsFromResponse(data);
  
  if (!replacements || !replacements.length) return text;
  
  let fixed = text;
  for (const item of replacements) {
    fixed = fixed.slice(0, item.offset) + item.replacement + fixed.slice(item.offset + item.length);
  }
  
  console.log('FixGrammar used service: LanguageTool');
  return fixed;
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

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ 
      grammarService: 'languagetool',
      aiApiKey: ''
    }, (items) => {
      resolve({
        grammarService: items.grammarService || 'languagetool',
        aiApiKey: items.aiApiKey || ''
      });
    });
  });
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