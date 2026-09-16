'use strict';

// ─── State ──────────────────────────────────────────────────────────────────────
let dirty = false;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const geminiKey   = document.getElementById('geminiKey');
const geminiModel = document.getElementById('geminiModel');
const modelHint   = document.getElementById('modelHint');
const saveBtn     = document.getElementById('saveBtn');
const saveMsg     = document.getElementById('saveMsg');
const versionSpan = document.getElementById('versionSpan');
const versionText = document.getElementById('version');
const favoriteLanguages = document.getElementById('favoriteLanguages');
const langSearch = document.getElementById('langSearch');
const favPreviewWrap = document.getElementById('favPreviewWrap');
const favPreview = document.getElementById('favPreview');
const apiCard = document.getElementById('apiCard');
let selectedFavoriteLanguages = [];

// ─── Populate model dropdown ───────────────────────────────────────────────────
for (const model of GEMINI_MODELS) {
  const option = document.createElement('option');
  option.value = model.id;
  option.textContent = model.label;
  geminiModel.appendChild(option);
}

function updateModelHint() {
  const selected = GEMINI_MODELS.find((m) => m.id === geminiModel.value);
  modelHint.textContent = selected?.description || '';
}

// ─── Display extension version ─────────────────────────────────────────────────
if (versionText) {
  const manifest = chrome.runtime.getManifest();
  if (manifest?.version) {
    versionText.textContent = manifest.version;
    if (versionSpan) versionSpan.style.display = 'inline';
  }
}

// ─── Show / hide API key ───────────────────────────────────────────────────────
document.querySelectorAll('.eye-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    btn.textContent = hidden ? '🙈' : '👁';
  });
});

geminiKey.addEventListener('input', () => {
  apiCard.classList.toggle('setup-required', !geminiKey.value.trim());
  markDirty();
});
geminiModel.addEventListener('change', () => {
  updateModelHint();
  markDirty();
});

function buildLanguageList(filter = '') {
  const query = filter.trim().toLowerCase();
  const visible = query ? LANGUAGES.filter((language) => language.toLowerCase().includes(query)) : LANGUAGES;
  favoriteLanguages.replaceChildren();
  if (!visible.length) {
    favoriteLanguages.innerHTML = '<div class="language-empty">No languages match your search.</div>';
    return;
  }
  visible.forEach((language) => {
    const label = document.createElement('label');
    label.className = 'language-choice' + (selectedFavoriteLanguages.includes(language) ? ' selected' : '');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedFavoriteLanguages.includes(language);
    checkbox.value = language;
    checkbox.addEventListener('change', () => toggleFavorite(language));
    label.append(checkbox, document.createTextNode(language));
    favoriteLanguages.appendChild(label);
  });
}

function toggleFavorite(language) {
  selectedFavoriteLanguages = selectedFavoriteLanguages.includes(language)
    ? selectedFavoriteLanguages.filter((item) => item !== language)
    : [...selectedFavoriteLanguages, language];
  buildLanguageList(langSearch.value);
  updateFavoritePreview();
  markDirty();
}

function updateFavoritePreview() {
  favPreview.replaceChildren();
  favPreviewWrap.hidden = selectedFavoriteLanguages.length === 0;
  selectedFavoriteLanguages.forEach((language) => {
    const chip = document.createElement('span');
    chip.className = 'fav-chip';
    const label = document.createElement('span');
    label.textContent = language;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'fav-chip-remove';
    remove.textContent = '×';
    remove.title = `Remove ${language}`;
    remove.addEventListener('click', () => toggleFavorite(language));
    chip.append(label, remove);
    favPreview.appendChild(chip);
  });
}

langSearch.addEventListener('input', () => buildLanguageList(langSearch.value));

favoriteLanguages.addEventListener('change', markDirty);

// ─── Dirty tracking & Save ────────────────────────────────────────────────────
function markDirty() {
  if (dirty) return;
  dirty = true;
  saveBtn.disabled = false;
  saveBtn.classList.add('dirty');
  saveMsg.style.visibility = 'hidden';
}

async function saveAllSettings() {
  await chrome.storage.sync.set({
    geminiApiKey: geminiKey.value.trim(),
    geminiModel: geminiModel.value,
    favoriteLanguages: selectedFavoriteLanguages,
  });
  dirty = false;
  saveBtn.disabled = true;
  saveBtn.classList.remove('dirty');
  saveMsg.style.visibility = 'visible';
  setTimeout(() => { saveMsg.style.visibility = 'hidden'; }, 3000);
}

saveBtn.addEventListener('click', saveAllSettings);

// ─── Load saved settings ──────────────────────────────────────────────────────
(async () => {
  const s = await chrome.storage.sync.get({
    geminiApiKey: '',
    apiKeys: {}, // legacy shape, used as a fallback for existing installs
    geminiModel: DEFAULT_GEMINI_MODEL,
    favoriteLanguages: DEFAULT_FAVORITE_LANGUAGES,
  });

  geminiKey.value = s.geminiApiKey || s.apiKeys?.gemini || '';
  apiCard.classList.toggle('setup-required', !(s.geminiApiKey || s.apiKeys?.gemini));
  geminiModel.value = s.geminiModel || DEFAULT_GEMINI_MODEL;
  selectedFavoriteLanguages = Array.isArray(s.favoriteLanguages) && s.favoriteLanguages.length
    ? s.favoriteLanguages
    : DEFAULT_FAVORITE_LANGUAGES;
  buildLanguageList();
  updateFavoritePreview();
  updateModelHint();
})();
