'use strict';

// ─── State ──────────────────────────────────────────────────────────────────────
let dirty = false;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const geminiKey   = document.getElementById('geminiKey');
const saveBtn     = document.getElementById('saveBtn');
const saveMsg     = document.getElementById('saveMsg');
const versionSpan = document.getElementById('versionSpan');
const versionText = document.getElementById('version');

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

geminiKey.addEventListener('input', markDirty);

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
  });

  geminiKey.value = s.geminiApiKey || s.apiKeys?.gemini || '';
})();
