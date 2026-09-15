// Tones offered as top-level context menu items alongside "Fix Grammar".
// "Just fix grammar" is the plain "Fix Grammar" action, so it isn't repeated here.
const TONE_MENU_ITEMS = [
  { id: 'formal', title: 'Formal' },
  { id: 'casual', title: 'Casual' },
  { id: 'friendly', title: 'Friendly' },
  { id: 'professional', title: 'Professional' },
  { id: 'concise', title: 'Concise' },
];

function buildContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'fixGrammar',
      title: 'Fix Grammar',
      contexts: ['selection']
    });

    for (const tone of TONE_MENU_ITEMS) {
      chrome.contextMenus.create({
        id: `tone-${tone.id}`,
        title: tone.title,
        contexts: ['selection']
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(buildContextMenus);
chrome.runtime.onStartup.addListener(buildContextMenus);

function sendFixMessage(tabId, tone, frameId) {
  const messageOptions = frameId != null ? { frameId } : undefined;

  chrome.tabs.sendMessage(tabId, { action: 'fixGrammarSelection', tone }, messageOptions).catch(async (error) => {
    // The content script isn't loaded in this frame yet — most commonly
    // because the extension was reloaded/updated after the tab was already
    // open, or the selection is inside an iframe that hadn't been visited
    // before all_frames injection took effect. Inject it on demand and retry.
    try {
      const injectTarget = frameId != null ? { tabId, frameIds: [frameId] } : { tabId };
      await chrome.scripting.executeScript({ target: injectTarget, files: ['content.js'] });
      await chrome.tabs.sendMessage(tabId, { action: 'fixGrammarSelection', tone }, messageOptions);
    } catch (retryError) {
    }
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // tab.id can be `chrome.tabs.TAB_ID_NONE` (-1) for surfaces that aren't a
  // real browser tab (e.g. some PDF viewers, devtools, or other extension
  // UI) — tabs.sendMessage() throws for negative ids, so bail out early.
  if (tab?.id == null || tab.id < 0) return;

  if (info.menuItemId === 'fixGrammar') {
    sendFixMessage(tab.id, 'fix', info.frameId);
  } else if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('tone-')) {
    sendFixMessage(tab.id, info.menuItemId.slice('tone-'.length), info.frameId);
  }
});

// ─── Gemini API calls ───────────────────────────────────────────────────────
// These run in the background service worker (not the page's content script)
// so they aren't subject to the host page's Content-Security-Policy, which
// can otherwise silently block fetch() calls to external APIs.

const TONE_PRESETS = {
  fix: 'Fix any grammar, spelling, and punctuation errors. Do not change the tone, meaning, or wording beyond what is necessary to correct errors.',
  formal: 'Fix grammar, spelling, and punctuation errors, then rewrite the text in a formal, professional tone.',
  casual: 'Fix grammar, spelling, and punctuation errors, then rewrite the text in a casual, relaxed, conversational tone.',
  friendly: 'Fix grammar, spelling, and punctuation errors, then rewrite the text in a warm, friendly tone.',
  professional: 'Fix grammar, spelling, and punctuation errors, then rewrite the text in a polished, business-professional tone.',
  concise: 'Fix grammar, spelling, and punctuation errors, then rewrite the text to be more concise and to the point.',
};

const TRANSLATE_TONE_PRESETS = {
  neutral: 'Keep the tone natural and faithful to the original text.',
  formal: 'Use a formal, professional tone.',
  casual: 'Use a casual, relaxed, conversational tone.',
  friendly: 'Use a warm, friendly tone.',
  professional: 'Use a polished, business-professional tone.',
  concise: 'Make the translation concise and to the point.',
};

function buildPrompt(text, tone) {
  const instruction = TONE_PRESETS[tone] || TONE_PRESETS.fix;
  return `You are a grammar correction assistant. Your task is to:
1. Detect the language of the following text
2. ${instruction}
3. Return ONLY the corrected text without any explanations or comments

Text: "${text}"

Corrected text:`;
}

function buildTranslatePrompt(text, targetLanguage, tone) {
  const toneInstruction = TRANSLATE_TONE_PRESETS[tone] || TRANSLATE_TONE_PRESETS.neutral;
  return `Translate the following text into ${targetLanguage}. ${toneInstruction} Return ONLY the translated text, with no explanations, notes, or surrounding quotation marks.

Text: "${text}"

Translation:`;
}

function stripSurroundingQuotes(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function getGeminiApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ geminiApiKey: '', apiKeys: {} }, (items) => {
      // Falls back to the legacy `apiKeys.gemini` field used before this
      // extension supported only Gemini.
      resolve(items.geminiApiKey || items.apiKeys?.gemini || '');
    });
  });
}

async function callGemini(prompt, apiKey) {
  if (!apiKey) throw new Error('No Gemini API key configured. Add one in Settings.');

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${rawBody}`);
  }

  const data = JSON.parse(rawBody);
  const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) throw new Error('Gemini API returned no content');

  return stripSurroundingQuotes(resultText);
}

async function fixGrammarText(text, tone) {
  const apiKey = await getGeminiApiKey();
  return await callGemini(buildPrompt(text, tone), apiKey);
}

async function translateText(text, targetLanguage, tone) {
  const apiKey = await getGeminiApiKey();
  return await callGemini(buildTranslatePrompt(text, targetLanguage, tone), apiKey);
}

// Handles requests from content.js (floating icon / context menu) and
// popup.js (translate & rewrite box) to run Gemini calls here in the
// service worker, away from any page's CSP.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'fixText') {
    fixGrammarText(message.text, message.tone || 'fix')
      .then((fixedText) => sendResponse({ fixedText }))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // keep the message channel open for the async response
  }

  if (message?.action === 'translateText') {
    translateText(message.text, message.targetLanguage, message.tone || 'neutral')
      .then((translatedText) => sendResponse({ translatedText }))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // keep the message channel open for the async response
  }
});

