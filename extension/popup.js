'use strict';

// All languages Google Translate/Gemini can translate into.
const LANGUAGES = [
  'Abkhaz', 'Acehnese', 'Acholi', 'Afrikaans', 'Albanian', 'Alur', 'Amharic', 'Arabic',
  'Armenian', 'Assamese', 'Awadhi', 'Aymara', 'Azerbaijani', 'Balinese', 'Bambara', 'Bashkir',
  'Basque', 'Batak Karo', 'Batak Simalungun', 'Batak Toba', 'Belarusian', 'Bemba', 'Bengali',
  'Betawi', 'Bhojpuri', 'Bikol', 'Bosnian', 'Breton', 'Bulgarian', 'Buryat', 'Cantonese',
  'Catalan', 'Cebuano', 'Chichewa (Nyanja)', 'Chinese (Simplified)', 'Chinese (Traditional)',
  'Chuvash', 'Corsican', 'Crimean Tatar', 'Croatian', 'Czech', 'Danish', 'Dinka', 'Divehi',
  'Dogri', 'Dombe', 'Dutch', 'Dzongkha', 'English', 'Esperanto', 'Estonian', 'Ewe', 'Fijian',
  'Filipino (Tagalog)', 'Finnish', 'French', 'French (Canadian)', 'Frisian', 'Fulfulde', 'Ga',
  'Galician', 'Ganda (Luganda)', 'Georgian', 'German', 'Greek', 'Guarani', 'Gujarati',
  'Haitian Creole', 'Hakha Chin', 'Hausa', 'Hawaiian', 'Hebrew', 'Hiligaynon', 'Hindi', 'Hmong',
  'Hungarian', 'Hunsrik', 'Icelandic', 'Igbo', 'Iloko', 'Indonesian', 'Irish', 'Italian',
  'Japanese', 'Javanese', 'Kannada', 'Kapampangan', 'Kazakh', 'Khmer', 'Kiga', 'Kinyarwanda',
  'Kituba', 'Konkani', 'Korean', 'Krio', 'Kurdish (Kurmanji)', 'Kurdish (Sorani)', 'Kyrgyz',
  'Lao', 'Latgalian', 'Latin', 'Latvian', 'Ligurian', 'Limburgan', 'Lingala', 'Lithuanian',
  'Lombard', 'Luo', 'Luxembourgish', 'Macedonian', 'Maithili', 'Makassar', 'Malagasy', 'Malay',
  'Malayalam', 'Maltese', 'Maori', 'Marathi', 'Meadow Mari', 'Meiteilon (Manipuri)', 'Minang',
  'Mizo', 'Mongolian', 'Myanmar (Burmese)', 'Ndebele (South)', 'Nepalbhasa (Newari)', 'Nepali',
  'Northern Sotho (Sepedi)', 'Norwegian', 'Nuer', 'Occitan', 'Odia (Oriya)', 'Oromo',
  'Pangasinan', 'Papiamento', 'Pashto', 'Persian', 'Polish', 'Portuguese', 'Portuguese (Brazil)',
  'Portuguese (Portugal)', 'Punjabi', 'Quechua', 'Romani', 'Romanian', 'Rundi', 'Russian',
  'Samoan', 'Sango', 'Sanskrit', 'Scots Gaelic', 'Serbian', 'Sesotho', 'Seychellois Creole',
  'Shan', 'Shona', 'Sicilian', 'Silesian', 'Sindhi', 'Sinhala', 'Slovak', 'Slovenian', 'Somali',
  'Spanish', 'Sundanese', 'Swahili', 'Swati', 'Swedish', 'Tajik', 'Tamil', 'Tatar', 'Telugu',
  'Tetum', 'Thai', 'Tigrinya', 'Tsonga', 'Tswana', 'Turkish', 'Turkmen', 'Twi (Akan)',
  'Ukrainian', 'Urdu', 'Uyghur', 'Uzbek', 'Vietnamese', 'Welsh', 'Xhosa', 'Yiddish', 'Yoruba',
  'Yucatec Maya', 'Zulu',
];
const DEFAULT_LANGUAGE = 'English';

const errorBanner      = document.getElementById('errorBanner');
const errorText        = document.getElementById('errorText');
const textInput        = document.getElementById('textInput');
const copyBtn          = document.getElementById('copyBtn');
const loadingOverlay   = document.getElementById('loadingOverlay');
const languageSelect   = document.getElementById('languageSelect');
const toneSelect       = document.getElementById('toneSelect');
const translateBtn     = document.getElementById('translateBtn');
const translateBtnText = document.getElementById('translateBtnText');
const undoBtn          = document.getElementById('undoBtn');
const settingsBtn      = document.getElementById('settingsBtn');

// Tracks the text as it was before the most recent translation, so the user
// can either Undo back to it, or retry with a different language/tone
// without the result compounding on top of an already-translated string.
let originalText = null;
// Set while we programmatically update the textarea's value, so the
// `input` listener below can tell that change apart from a manual edit.
let isProgrammaticChange = false;

function populateLanguages() {
  for (const language of LANGUAGES) {
    const option = document.createElement('option');
    option.value = language;
    option.textContent = language;
    if (language === DEFAULT_LANGUAGE) option.selected = true;
    languageSelect.appendChild(option);
  }
}

function showError(message) {
  errorText.textContent = message;
  errorBanner.classList.add('visible');
}

function hideError() {
  errorBanner.classList.remove('visible');
}

function setUndoEnabled(enabled) {
  undoBtn.disabled = !enabled;
}

function setLoading(isLoading) {
  translateBtn.disabled = isLoading;
  translateBtn.classList.toggle('loading', isLoading);
  translateBtnText.textContent = isLoading ? 'Translating…' : 'Translate';
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
    copyBtn.textContent = '✅';
    copyBtn.classList.add('copied');
  } catch {
    copyBtn.textContent = '⚠️';
  }
  setTimeout(() => {
    copyBtn.textContent = '📋';
    copyBtn.classList.remove('copied');
  }, 1500);
});

async function translate() {
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
      targetLanguage: languageSelect.value,
      tone: toneSelect.value,
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

async function init() {
  populateLanguages();

  const { geminiApiKey, apiKeys } = await chrome.storage.sync.get({ geminiApiKey: '', apiKeys: {} });
  if (!geminiApiKey && !apiKeys?.gemini) {
    showError('Add your Gemini API key in Settings to enable translation.');
  }
}

init();
