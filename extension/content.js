let currentEditable = null;
let savedInputSelection = null;
let savedRange = null;

function isEditable(element) {
  // `element.contentEditable` is a string reflecting the raw attribute
  // ('true' | 'false' | 'inherit' | 'plaintext-only') — many modern text
  // boxes (e.g. Google Translate's input, GitHub's description fields) use
  // contenteditable="plaintext-only" to get a plain-text editing area
  // without rich-text paste, which the old `=== 'true'` check missed.
  // `isContentEditable` is the resolved boolean and correctly covers both
  // variants as well as inherited editability from an ancestor.
  return !!(element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable));
}

// Inspects a live Selection object and, if it sits inside an editable
// element (input, textarea, or contenteditable), updates the module-level
// currentEditable/savedInputSelection/savedRange state. Returns true if an
// editable selection was found, false otherwise (and clears the state).
function captureSelectionFromEditable(selection) {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    currentEditable = null;
    savedInputSelection = null;
    savedRange = null;
    return false;
  }

  const range = selection.getRangeAt(0);
  let editableElement = null;
  let node = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  while (node) {
    if (isEditable(node)) {
      editableElement = node;
      break;
    }
    if (node === document.body || node === document) break;
    // Cross out of a shadow tree (many web-component-based editors render
    // their editable area inside a shadow root) instead of stopping dead
    // once parentNode returns null at the shadow root boundary.
    node = node.parentNode || (node instanceof ShadowRoot ? node.host : null);
  }

  if (!editableElement) {
    currentEditable = null;
    savedInputSelection = null;
    savedRange = null;
    return false;
  }

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
  return true;
}


// ─── Grammar/tone fixing ─────────────────────────────────────────────────────
// The actual API calls run in the background service worker (background.js),
// not here, because fetch() in a content script is subject to the host
// page's Content-Security-Policy and can be silently blocked on some sites.
async function fixGrammarText(text, tone = 'fix') {
  if (!text) return text;
  const response = await chrome.runtime.sendMessage({ action: 'fixText', text, tone });
  if (response?.error) {
    throw new Error(response.error);
  }
  return response?.fixedText ?? text;
}

// Shows a small dismissible toast near the bottom-right of the page so
// failures (bad API key, wrong model, quota, network, etc.) are visible
// instead of silently leaving the selected text unchanged.
function showToast(message, isError = true) {
  ensureProcessingStyles();

  const toast = document.createElement('div');
  toast.className = 'fixgrammar-toast';

  const icon = document.createElement('span');
  icon.className = 'fixgrammar-toast-icon';
  icon.textContent = isError ? '⚠️' : '✅';

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  Object.assign(toast.style, {
    background: isError ? '#fdecea' : '#e6f4ea',
    color: isError ? '#a30d11' : '#137333',
    border: `2px solid ${isError ? '#f5a19c' : '#8fd3a1'}`,
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fixgrammar-toast-hide');
    setTimeout(() => toast.remove(), 200);
  }, 7000);
}

// ─── Processing indicator ───────────────────────────────────────────────────
// A small pill shown near the bottom-right of the page while a fix/rewrite
// request is in flight, so the user gets instant feedback that something is
// happening after picking a context menu item.
let processingIndicator = null;

function ensureProcessingStyles() {
  if (document.getElementById('fixgrammar-processing-style')) return;
  const style = document.createElement('style');
  style.id = 'fixgrammar-processing-style';
  style.textContent = `
    .fixgrammar-processing {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 24px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.98);
      color: #202124;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 17px;
      font-weight: 700;
      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.22), 0 0 0 2px rgba(66, 133, 244, 0.25);
      animation: fixgrammar-fade-in 0.18s ease-out;
    }
    @media (prefers-color-scheme: dark) {
      .fixgrammar-processing {
        background: rgba(32, 33, 36, 0.98);
        color: #e8eaed;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(66, 133, 244, 0.35);
      }
    }
    .fixgrammar-spinner {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      border-radius: 50%;
      background: conic-gradient(from 0deg, #4285f4, #9b72cb, #d96570, #4285f4);
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));
      mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));
      animation: fixgrammar-spin 0.8s linear infinite;
    }
    @keyframes fixgrammar-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fixgrammar-fade-in {
      from { opacity: 0; transform: translateY(10px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .fixgrammar-toast {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 420px;
      padding: 16px 22px;
      border-radius: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.45;
      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.28);
      animation: fixgrammar-fade-in 0.18s ease-out;
    }
    .fixgrammar-toast-hide {
      opacity: 0;
      transform: translateY(10px) scale(0.96);
      transition: opacity 0.2s ease-in, transform 0.2s ease-in;
    }
    .fixgrammar-toast-icon {
      font-size: 22px;
      line-height: 1;
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);
}

function showProcessingIndicator(tone) {
  ensureProcessingStyles();
  if (!processingIndicator) {
    processingIndicator = document.createElement('div');
    processingIndicator.className = 'fixgrammar-processing';

    const spinner = document.createElement('div');
    spinner.className = 'fixgrammar-spinner';

    const label = document.createElement('span');
    label.className = 'fixgrammar-processing-label';

    processingIndicator.appendChild(spinner);
    processingIndicator.appendChild(label);
    document.body.appendChild(processingIndicator);
  }

  const label = processingIndicator.querySelector('.fixgrammar-processing-label');
  label.textContent = tone && tone !== 'fix'
    ? `Rewriting (${tone.charAt(0).toUpperCase()}${tone.slice(1)})…`
    : 'Fixing grammar…';
  processingIndicator.style.display = 'flex';
}

function hideProcessingIndicator() {
  if (processingIndicator) processingIndicator.style.display = 'none';
}

// ─── Apply the fix to the current selection, triggered by the right-click
// context menu. `tone` defaults to a plain grammar fix; the context menu's
// tone items pass a specific tone instead. ─────────────────────────────────
async function applyGrammarFix(tone = 'fix') {
  // Capture the current selection now, at the moment the context menu item
  // is clicked, since nothing tracks it proactively any more.
  captureSelectionFromEditable(window.getSelection());

  if (!currentEditable) {
    showToast('Select text inside an input, textarea, or editable field, then try again.');
    return;
  }

  showProcessingIndicator(tone);
  try {
    if (currentEditable.tagName === 'INPUT' || currentEditable.tagName === 'TEXTAREA') {
      const start = savedInputSelection?.start;
      const end = savedInputSelection?.end;
      if (start != null && end != null && start !== end) {
        const selectedText = currentEditable.value.substring(start, end);
        const fixedText = await fixGrammarText(selectedText, tone);
        currentEditable.setRangeText(fixedText, start, end, 'select');
      }
    } else if (savedRange) {
      const selectedText = savedRange.toString();
      if (selectedText) {
        const fixedText = await fixGrammarText(selectedText, tone);
        savedRange.deleteContents();
        savedRange.insertNode(document.createTextNode(fixedText));
      }
    }
  } catch (error) {
    showToast(`FixGrammar error: ${error.message}`);
  } finally {
    hideProcessingIndicator();
  }

  currentEditable = null;
  savedInputSelection = null;
  savedRange = null;
}

// Triggered by background.js when the user picks "Fix Grammar" or a
// tone item from the right-click context menu.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === 'fixGrammarSelection') {
    applyGrammarFix(message.tone || 'fix')
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // keep the message channel open for the async response
  }
});

