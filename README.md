# FixGrammar

[![Latest release](https://img.shields.io/github/v/release/Arzaghi/FixGrammar?logo=github&label=release)](https://github.com/Arzaghi/FixGrammar/releases/latest)
[![API integration test](https://github.com/Arzaghi/FixGrammar/actions/workflows/test-api.yml/badge.svg)](https://github.com/Arzaghi/FixGrammar/actions/workflows/test-api.yml)
[![Build CRX](https://github.com/Arzaghi/FixGrammar/actions/workflows/build-crx.yml/badge.svg)](https://github.com/Arzaghi/FixGrammar/actions/workflows/build-crx.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

**FixGrammar** is a Manifest V3 Chromium-based browser extension that fixes grammar,
spelling, and punctuation in text you select on any page. It works on input
fields, textareas, and editable content, and can use either the free
LanguageTool API or the Groq AI API (Llama) for corrections.

## Features

- Right-click context menu action to fix grammar in the selected text
- Works in `<input>`, `<textarea>`, and `contenteditable` elements
- Choice of grammar service: LanguageTool (free, no key) or Groq AI (Llama, API key required)
- Settings page to choose the service and store your API key
- No remotely hosted executable code

## Requirements

- Any recent Chromium-based browser (Chrome, Edge, Opera, Brave)
- Optional: a Groq API key from [Groq Console](https://console.groq.com/keys) if you want AI-based corrections instead of LanguageTool

## Local development

1. Clone this repository.
2. Open your browser extension management page
   (`chrome://extensions`, `edge://extensions`, `opera://extensions`, or `brave://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the [`extension`](./extension) directory — not the repository root.
6. Open **Options** for the extension to choose a grammar service and, if using Groq, enter your API key.

After changing extension files, click **Reload** on the extension card in
`chrome://extensions` before testing again.

## Usage

1. Select text in any input field, textarea, or editable content in the browser.
2. Right-click and choose **FixGrammar**.
3. The selected text is replaced with the corrected version.

## Project structure

```text
extension/
  manifest.json          Extension manifest and version
  background.js          Manifest V3 service worker (context menu, grammar fixing)
  content.js              Content script that fixes text directly in the page
  options/                Extension settings page (service selection, API key)
  icons/                  Toolbar and extension icons
scripts/
  build.mjs               Builds the extension package (CRX + ZIP)
dist/                     Build output (CRX + ZIP) — gitignored
tests/                    LanguageTool and Groq API integration tests
package.json              Node build-tool dependencies
.github/workflows/build-crx.yml  Extension build and GitHub Release workflow
.github/workflows/test-api.yml   Scheduled API integration test workflow
```

## Privacy and data handling

Grammar correction begins only after you select text and choose **FixGrammar**
from the context menu. The selected text is sent directly to the configured
grammar service (LanguageTool or Groq) to generate a corrected version. The
extension stores your chosen service and API key (if any) in browser
extension storage. It does not download or execute remotely hosted JavaScript
or WebAssembly.

Before publishing, provide an accurate privacy policy and complete the
privacy disclosures required by your target browser store.

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
   "version": "1.1.0"
   ```

2. Commit and push:

   ```bash
   git add extension/manifest.json
   git commit -m "Release v1.1.0"
   git push origin main
   ```

3. Create and push the version tag (tag must match manifest version):

   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

4. GitHub Actions will automatically build and create a GitHub Release with:
   - `FixGrammar-v1.1.0.crx` : Signed CRX3 package for sideloading/testing
   - `FixGrammar-v1.1.0.zip` : ZIP package for browser store submission

5. Download the ZIP from [Releases](../../releases) and upload it to your target store:
   - Chrome Web Store: [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Microsoft Edge Add-ons: [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview)
   - Opera Add-ons: [Developer dashboard](https://addons.opera.com/developer/)

### CRX signing key

To keep a stable extension identity across releases, add your extension
private key to the repository secrets as a base64-encoded value named
`EXTENSION_PRIVATE_KEY`:

```bash
# Linux / macOS
base64 -w0 extension.pem
```

```powershell
# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("extension.pem"))
```

- In GitHub, go to `Settings > Secrets and variables > Actions`.
- Create a new secret named `EXTENSION_PRIVATE_KEY` with the base64 output above.

If the secret is missing, CI will fail the release build rather than silently
rotate the extension's identity with a throwaway key.

## Automated API integration tests

[`tests/test_languagetool.js`](./tests/test_languagetool.js) and
[`tests/test_groq.js`](./tests/test_groq.js) connect to the real LanguageTool
and Groq APIs and verify the extension's grammar-correction pipeline still
works end to end.

Runs on every push to `main` and **daily at 07:00 UTC** to catch external API
changes even when no code has been pushed.

Run the tests locally:

```bash
# LanguageTool only (no API key required)
npm test
```

```bash
# LanguageTool + Groq (requires a Groq API key)
node tests/test_runner.js --all --groq-key <your-test-key>
```

---

## License

Copyright © 2026 Hamid Reza Arzaghi

FixGrammar is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option)
any later version.

See [LICENSE](./LICENSE) for the full license text.
