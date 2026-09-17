'use strict';

const errorBanner      = document.getElementById('errorBanner');
const errorText        = document.getElementById('errorText');
const statusBar         = document.getElementById('statusBar');
const statusLabel       = document.getElementById('statusLabel');
const statusAction      = document.getElementById('statusAction');
const textInput        = document.getElementById('textInput');
const copyBtn          = document.getElementById('copyBtn');
const loadingOverlay   = document.getElementById('loadingOverlay');
const favPills          = document.getElementById('favPills');
const addLangBtn        = document.getElementById('addLangBtn');
const toneButtons       = document.getElementById('toneButtons');
const translateBtn     = document.getElementById('translateBtn');
const translateBtnText = document.getElementById('translateBtnText');
const translateBtnModelName = document.getElementById('translateBtnModelName');
const undoBtn          = document.getElementById('undoBtn');
const settingsBtn      = document.getElementById('settingsBtn');

// Tracks the text as it was before the most recent translation, so the user
// can either Undo back to it, or retry with a different language/tone
// without the result compounding on top of an already-translated string.
let originalText = null;
let favoriteLanguages = [];
let targetLanguage = AUTO_LANGUAGE;
let selectedTone = 'neutral';
let selectedModel = DEFAULT_GEMINI_MODEL;
let apiKeyConfigured = false;
// Set while we programmatically update the textarea's value, so the
// `input` listener below can tell that change apart from a manual edit.
let isProgrammaticChange = false;

function renderFavorites() {
  favPills.replaceChildren();
  [AUTO_LANGUAGE, ...favoriteLanguages].forEach((language) => {
    const button = document.createElement('button');
    button.className = 'fav-pill' + (language === targetLanguage ? ' active' : '');
    button.textContent = language === AUTO_LANGUAGE ? 'Auto' : language;
    button.title = language === AUTO_LANGUAGE ? 'Keep the original language' : language;
    button.type = 'button';
    button.disabled = !apiKeyConfigured;
    button.addEventListener('click', () => selectLanguage(language));
    favPills.appendChild(button);
  });
  updateActionLabel();
}

function updateActionLabel() {
  if (!translateBtnText || translateBtn.classList.contains('loading')) return;
  translateBtnText.textContent = 'Rewrite';
}

async function selectLanguage(language) {
  if (language === targetLanguage) return;
  targetLanguage = language;
  await chrome.storage.sync.set({ targetLanguage });
  renderFavorites();
}

function renderToneButtons() {
  toneButtons.querySelectorAll('.tone-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tone === selectedTone);
    button.disabled = !apiKeyConfigured;
  });
}

function showError(message) {
  errorText.textContent = message;
  errorBanner.classList.add('visible');
}

function hideError() {
  errorBanner.classList.remove('visible');
}

function updateModelStatus(modelId = DEFAULT_GEMINI_MODEL) {
  selectedModel = modelId || DEFAULT_GEMINI_MODEL;
  const model = GEMINI_MODELS.find((item) => item.id === selectedModel);
  const modelLabel = model?.label || selectedModel;
  statusLabel.textContent = modelLabel;
  translateBtnModelName.textContent = modelLabel;
}

function setApiKeyStatus(configured) {
  apiKeyConfigured = configured;
  updateModelStatus(selectedModel);
  statusBar.classList.toggle('warn', !configured);
  statusAction.classList.toggle('visible', !configured);
  statusLabel.textContent = configured
    ? (GEMINI_MODELS.find((item) => item.id === selectedModel)?.label || selectedModel)
    : 'API Key Not Configured';
  textInput.disabled = !configured;
  copyBtn.disabled = !configured;
  addLangBtn.disabled = !configured;
  translateBtn.disabled = !configured;
  translateBtn.classList.toggle('locked', !configured);
  if (!configured) {
    undoBtn.disabled = true;
    showError('Gemini API key required. Open Settings to add your key and enable FixGrammar.');
  } else {
    hideError();
  }
  renderFavorites();
  renderToneButtons();
}

function setUndoEnabled(enabled) {
  undoBtn.disabled = !enabled;
}

function setLoading(isLoading) {
  translateBtn.disabled = isLoading;
  translateBtn.classList.toggle('loading', isLoading);
  translateBtnText.textContent = isLoading ? 'Working…' : 'Rewrite';
  loadingOverlay.classList.toggle('visible', isLoading);
  textInput.readOnly = isLoading;
}

// A manual edit invalidates any pending "undo" — it no longer makes sense to
// revert to text that's now different from what's in the box.
textInput.addEventListener('input', () => {
  if (isProgrammaticChange) return;
  originalText = null;
  setUndoEnabled(false);
});

copyBtn.addEventListener('click', async () => {
  if (!textInput.value) return;
  try {
    await navigator.clipboard.writeText(textInput.value);
    copyBtn.classList.add('copied');
    copyBtn.title = 'Copied';
  } catch {
    copyBtn.classList.add('failed');
    copyBtn.title = 'Copy failed';
  }
  setTimeout(() => {
    copyBtn.classList.remove('copied');
    copyBtn.classList.remove('failed');
    copyBtn.title = 'Copy text';
  }, 1500);
});

async function translate() {
  if (!apiKeyConfigured) return;
  const textToTranslate = (originalText !== null ? originalText : textInput.value).trim();
  if (!textToTranslate) {
    showError('Enter some text first.');
    return;
  }

  if (originalText === null) originalText = textInput.value;

  hideError();
  setLoading(true);

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'translateText',
      text: textToTranslate,
      targetLanguage,
      tone: selectedTone,
    });
    if (response?.error) throw new Error(response.error);

    isProgrammaticChange = true;
    textInput.value = response.translatedText;
    isProgrammaticChange = false;
    setUndoEnabled(true);
  } catch (error) {
    showError(error.message || 'Translation failed.');
  } finally {
    setLoading(false);
  }
}

function undo() {
  if (originalText === null) return;
  isProgrammaticChange = true;
  textInput.value = originalText;
  isProgrammaticChange = false;
  originalText = null;
  setUndoEnabled(false);
  hideError();
}

translateBtn.addEventListener('click', translate);
undoBtn.addEventListener('click', undo);

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

addLangBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

toneButtons.addEventListener('click', (event) => {
  const button = event.target.closest('.tone-button');
  if (!button) return;
  selectedTone = button.dataset.tone;
  updateActionLabel();
  renderToneButtons();
});

statusAction.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

statusBar.addEventListener('click', (event) => {
  if (statusBar.classList.contains('warn') && event.target !== statusAction) {
    chrome.runtime.openOptionsPage();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.favoriteLanguages) {
    favoriteLanguages = Array.isArray(changes.favoriteLanguages.newValue)
      ? changes.favoriteLanguages.newValue
      : DEFAULT_FAVORITE_LANGUAGES;
    if (targetLanguage !== AUTO_LANGUAGE && !favoriteLanguages.includes(targetLanguage)) targetLanguage = AUTO_LANGUAGE;
    renderFavorites();
  }
  if (changes.targetLanguage && (changes.targetLanguage.newValue === AUTO_LANGUAGE || favoriteLanguages.includes(changes.targetLanguage.newValue))) {
    targetLanguage = changes.targetLanguage.newValue;
    renderFavorites();
  }
  if (changes.geminiModel) {
    updateModelStatus(changes.geminiModel.newValue || DEFAULT_GEMINI_MODEL);
  }
  if (changes.geminiApiKey || changes.apiKeys) {
    chrome.storage.sync.get({ geminiApiKey: '', apiKeys: {} }).then(({ geminiApiKey, apiKeys }) => {
      setApiKeyStatus(!!(geminiApiKey || apiKeys?.gemini));
    });
  }
});

async function init() {
  const settings = await chrome.storage.sync.get({
    geminiApiKey: '', apiKeys: {}, favoriteLanguages: DEFAULT_FAVORITE_LANGUAGES, targetLanguage: AUTO_LANGUAGE, geminiModel: DEFAULT_GEMINI_MODEL,
  });
  updateModelStatus(settings.geminiModel);
  favoriteLanguages = Array.isArray(settings.favoriteLanguages) ? settings.favoriteLanguages : DEFAULT_FAVORITE_LANGUAGES;
  targetLanguage = settings.targetLanguage === AUTO_LANGUAGE || favoriteLanguages.includes(settings.targetLanguage)
    ? settings.targetLanguage
    : AUTO_LANGUAGE;
  const configured = !!(settings.geminiApiKey || settings.apiKeys?.gemini);
  setApiKeyStatus(configured);
}

init();
