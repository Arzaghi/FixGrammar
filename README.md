# FixGrammar

[![Latest release](https://img.shields.io/github/v/release/Arzaghi/FixGrammar?logo=github&label=release)](https://github.com/Arzaghi/FixGrammar/releases/latest)
[![API integration test](https://github.com/Arzaghi/FixGrammar/actions/workflows/test-integration.yml/badge.svg)](https://github.com/Arzaghi/FixGrammar/actions/workflows/test-integration.yml)
[![Build CRX](https://github.com/Arzaghi/FixGrammar/actions/workflows/build-crx.yml/badge.svg)](https://github.com/Arzaghi/FixGrammar/actions/workflows/build-crx.yml)
[![Chrome Web Store version](https://img.shields.io/chrome-web-store/v/ahcokjmojbabadfdkogeaafpholilkog)](https://chromewebstore.google.com/detail/fixgrammar/ahcokjmojbabadfdkogeaafpholilkog)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

<p align="center">
   <img src="./screenshots/promo%20big.png" alt="FixGrammar banner" width="100%" />
</p>

**FixGrammar** is a Manifest V3 Chromium-based browser extension, powered by
**Google Gemini**, that fixes grammar, spelling, and punctuation in text from a
toolbar side panel — with optional tone rewrites and translation.

## Features

- Toolbar side panel with a text box to translate and rewrite text, with one-click **Undo** back to the original text
- **Auto** target mode to correct and rewrite text without changing its original language
- Settings page with a searchable favorite-language picker; English, French, and Spanish are selected by default
- Graphical tone controls for Neutral, Formal, Casual, Friendly, Professional, Concise, Email, and Funny writing
- The side panel adapts to its available width and remains usable at short heights
- Automatic light/dark theme that follows your system preference
- No remotely hosted executable code

## Requirements

- Any recent Chromium-based browser (Chrome, Edge, Opera, Brave)
- A free [Google Gemini API key](https://aistudio.google.com/app/apikey), added in Settings

## Local development

1. Clone this repository.
2. Open your browser extension management page
   (`chrome://extensions`, `edge://extensions`, `opera://extensions`, or `brave://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the [`extension`](./extension) directory — not the repository root.
6. Click the extension's toolbar icon to open the side panel, then open **Settings** to enter your Gemini API key and pick a model.

After changing extension files, click **Reload** on the extension card in
`chrome://extensions` before testing again.

## Usage

### Translate and rewrite in the side panel

1. Click the FixGrammar toolbar icon.
2. If the key is not configured, click **Open Settings**, add your Gemini API key, and save.
3. Type or paste text into the box, then choose a favorite target language and tone.
4. Choose **Auto** to correct and rewrite the text while keeping its original language. For another language, choose that language and click **Translate**.
5. Choose **Email** to format the text as a standard email in the selected language, or choose **Funny** for light, appropriate humor.
6. The result replaces the text in the same box. Click **Undo** to revert to the original text.

## Project structure

```text
extension/
  manifest.json          Extension manifest and version
   background.js          Manifest V3 service worker that runs Gemini API calls
   popup.html / popup.js   Toolbar side panel — translate, rewrite, and tone controls
   options.html / options.js  Settings page — API key, model, and favorite languages
  models.js               Shared Gemini model catalog (used by background.js and options.js)
   languages.js             Shared language catalog and defaults
  icons/                  Toolbar and extension icons
scripts/
  build.mjs               Builds the extension package (CRX + ZIP)
dist/                     Build output (CRX + ZIP) — gitignored
tests/                    API integration tests
package.json              Node build-tool dependencies
.github/workflows/build-crx.yml  Extension build and GitHub Release workflow
.github/workflows/test-integration.yml   Scheduled API integration test workflow
```

## Privacy and data handling

Translation and rewriting begin only when you click **Rewrite** or
**Translate** in the side panel. The text is sent directly to the Google Gemini
API to generate a corrected or translated version.
The extension stores your Gemini API key in browser extension storage. It
does not download or execute remotely hosted JavaScript or WebAssembly.

Before publishing, provide an accurate privacy policy and complete the
privacy disclosures required by your target browser store.

See the [FixGrammar Privacy Policy](./PRIVACY_POLICY.md) for the extension's
data handling details and the Google policies that apply to data sent through
the Gemini API.

## Building locally

```bash
npm install
npm run build
```

Outputs `FixGrammar-x.y.z.crx` and `FixGrammar-x.y.z.zip` in `dist/`.
The CRX requires a private key to create a signed crx (`extension.pem` in the repo root by default).
Set a custom path with the `EXTENSION_KEY_PATH` environment variable:

```bash
# Linux / macOS
EXTENSION_KEY_PATH=/path/to/key.pem npm run build
```

```powershell
# Windows (PowerShell)
$env:EXTENSION_KEY_PATH="C:\path\to\key.pem"; npm run build
```

## Release and store publishing

Releases are created by pushing a Git tag that matches the version in
[`extension/manifest.json`](./extension/manifest.json).

### Release steps

1. Update the `version` field in `extension/manifest.json`, for example:

   ```json
   "version": "1.2.0"
   ```

2. Commit and push:

   ```bash
   git add extension/manifest.json
   git commit -m "Release v1.2.0"
   git push origin main
   ```

3. Create and push the version tag (tag must match manifest version):

   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```

4. GitHub Actions will automatically build and create a GitHub Release with:
   - `FixGrammar-v1.2.0.crx` : Signed CRX3 package for sideloading/testing
   - `FixGrammar-v1.2.0.zip` : ZIP package for browser store submission

5. Download the ZIP from [Releases](../../releases) and upload it to your target store:
   - Chrome Web Store: [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Microsoft Edge Add-ons: [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview)
   - Opera Add-ons: [Developer dashboard](https://addons.opera.com/developer/)

## Automated API integration tests

[`tests/test_integration.js`](./tests/test_integration.js) sends a single
trivial request to the real Google Gemini API and confirms a valid response
comes back. This is a connectivity smoke test only — it does not validate
grammar-correction quality.

Runs on every push to `main` and **daily at 07:00 UTC** to catch external API
changes even when no code has been pushed.

Run it locally (requires a Gemini API key):

```bash
node tests/test_integration.js --key <your-test-key>
```

---

## License

Copyright © 2026 Hamid Reza Arzaghi

FixGrammar is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option)
any later version.

See [LICENSE](./LICENSE) for the full license text.
