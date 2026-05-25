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