const DEFAULT_SERVICE = 'https://api.languagetool.org/v2/check';

function saveOptions() {
  const select = document.getElementById('service');
  const url = select.value;
  chrome.storage.sync.set({ grammarService: url }, () => {
    alert('Saved');
  });
}

function resetOptions() {
  chrome.storage.sync.set({ grammarService: DEFAULT_SERVICE }, () => {
    document.getElementById('service').value = DEFAULT_SERVICE;
    alert('Reset to default');
  });
}

function restoreOptions() {
  chrome.storage.sync.get({ grammarService: DEFAULT_SERVICE }, (items) => {
    document.getElementById('service').value = items.grammarService || DEFAULT_SERVICE;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('reset').addEventListener('click', resetOptions);
