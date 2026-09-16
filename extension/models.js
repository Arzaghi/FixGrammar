'use strict';

// Shared Gemini model catalog. Loaded by both background.js (service worker,
// via importScripts) and options.js (options page, via a <script> tag) so
// the settings dropdown and the actual API calls always agree on model IDs.
//
// These are plain top-level `const`s (no import/export) so the same file
// works unmodified in both a classic service worker and a classic page
// script.
const GEMINI_MODELS = [
  {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash-Lite',
    description: 'Fastest and lightest. Best for quick grammar fixes and short translations. Recommended default.'
  },
  {
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    description: 'Balanced speed and quality. A bit slower than the Flash-Lite models; better for longer or more nuanced text.'
  }
];

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

// Allow tests/test_integration.js (Node/CommonJS) to `require()` this same
// file. `module` doesn't exist in the service worker or the options page, so
// this has no effect there.
if (typeof module !== 'undefined') {
  module.exports = { GEMINI_MODELS, DEFAULT_GEMINI_MODEL };
}

