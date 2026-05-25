const DEFAULT_SERVICE = 'languagetool';

function saveOptions() {
  const serviceSelect = document.getElementById('service');
  const service = serviceSelect.value;
  const apiKeyInput = document.getElementById('aiApiKey');
  
  const settings = {
    grammarService: service
  };
  
  // Only save API key if Groq is selected and key is provided
  if (service === 'groq' && apiKeyInput.value.trim()) {
    settings.aiApiKey = apiKeyInput.value.trim();
  }
  
  chrome.storage.sync.set(settings, () => {
    showStatusMessage('Settings saved successfully.');
  });
}

function showStatusMessage(message) {
  const status = document.getElementById('statusMessage');
  status.textContent = message;
  status.classList.remove('d-none');
  window.clearTimeout(showStatusMessage.timeout);
  showStatusMessage.timeout = window.setTimeout(() => {
    status.classList.add('d-none');
  }, 3200);
}

function toggleAISettings() {
  const service = document.getElementById('service').value;
  const aiSettings = document.getElementById('aiSettings');
  if (service === 'groq') {
    aiSettings.classList.add('show');
    aiSettings.style.display = 'block';
  } else {
    aiSettings.classList.remove('show');
    aiSettings.style.display = 'none';
  }
}

function restoreOptions() {
  chrome.storage.sync.get({ 
    grammarService: DEFAULT_SERVICE,
    aiApiKey: ''
  }, (items) => {
    document.getElementById('service').value = items.grammarService || DEFAULT_SERVICE;
    document.getElementById('aiApiKey').value = items.aiApiKey || '';
    toggleAISettings();
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('service').addEventListener('change', toggleAISettings);