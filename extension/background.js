// Shared Gemini model catalog (GEMINI_MODELS, DEFAULT_GEMINI_MODEL).
importScripts('models.js');
importScripts('languages.js');

async function initializeSidePanel() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn('Unable to configure the FixGrammar side panel:', error);
  }
}

chrome.runtime.onInstalled.addListener(initializeSidePanel);
chrome.runtime.onStartup.addListener(initializeSidePanel);

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
  funny: 'Fix grammar, spelling, and punctuation errors, then rewrite the text with appropriate, light humor while preserving its meaning.',
};

const TRANSLATE_TONE_PRESETS = {
  neutral: 'Keep the tone natural and faithful to the original text.',
  formal: 'Use a formal, professional tone.',
  casual: 'Use a casual, relaxed, conversational tone.',
  friendly: 'Use a warm, friendly tone.',
  professional: 'Use a polished, business-professional tone.',
  concise: 'Make the translation concise and to the point.',
  funny: 'Use appropriate, light humor while preserving the meaning of the original text.',
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

function buildEmailPrompt(text, targetLanguage) {
  const languageInstruction = targetLanguage === AUTO_LANGUAGE
    ? 'Detect the language of the input and write the email in that same language.'
    : `Write the email in ${targetLanguage}.`;
  return `Transform the following text into a clear, complete email. ${languageInstruction} Correct grammar and spelling, preserve the intended meaning, and use a standard email format with a suitable subject line, greeting, concise body, and professional closing. Return ONLY the email, without explanations or surrounding quotation marks.

Text: "${text}"

Email:`;
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

function getGeminiModel() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ geminiModel: DEFAULT_GEMINI_MODEL }, (items) => {
      resolve(items.geminiModel || DEFAULT_GEMINI_MODEL);
    });
  });
}

async function callGemini(prompt, apiKey, model) {
  if (!apiKey) throw new Error('No Gemini API key configured. Add one in Settings.');

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model || DEFAULT_GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

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
  const [apiKey, model] = await Promise.all([getGeminiApiKey(), getGeminiModel()]);
  return await callGemini(buildPrompt(text, tone), apiKey, model);
}

async function translateText(text, targetLanguage, tone) {
  const [apiKey, model] = await Promise.all([getGeminiApiKey(), getGeminiModel()]);
  return await callGemini(buildTranslatePrompt(text, targetLanguage, tone), apiKey, model);
}

async function emailText(text, targetLanguage) {
  const [apiKey, model] = await Promise.all([getGeminiApiKey(), getGeminiModel()]);
  return await callGemini(buildEmailPrompt(text, targetLanguage), apiKey, model);
}

// Handles requests from popup.js (translate & rewrite box) to run Gemini calls here in the
// service worker, away from any page's CSP.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'translateText') {
    const request = message.tone === 'email'
      ? emailText(message.text, message.targetLanguage)
      : message.targetLanguage === AUTO_LANGUAGE
      ? fixGrammarText(message.text, message.tone || 'neutral')
      : translateText(message.text, message.targetLanguage, message.tone || 'neutral');
    request
      .then((translatedText) => sendResponse({ translatedText }))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // keep the message channel open for the async response
  }
});

