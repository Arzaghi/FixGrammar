# FixGrammar Chrome Extension

This is a Chrome extension that adds a context menu item to fix grammar in selected text. Currently, it reverses the selected text as a placeholder.

## Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right.
3. Click "Load unpacked" and select this folder (`c:\Users\arzag\Desktop\FixGrammar`).

## Usage

1. Select text in any input field or textarea in Chrome.
2. Right-click and choose "FixGrammar".
3. The selected text will be reversed.

## Development

- `manifest.json`: Extension manifest.
- `background.js`: Service worker that handles context menu creation and execution.

## Adding Icons

The manifest references icon files in the `icons/` folder: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`. Place your PNG files in the `icons/` directory.

You can use any image editor or online tools to create simple icons.

## Future Features

- Integrate a grammar checking API to actually fix grammar instead of reversing text.