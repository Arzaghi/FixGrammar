# FixGrammar Privacy Policy

**Effective date:** September 22, 2026

FixGrammar is a Chromium browser extension published by **Hamid Reza
Arzaghi**. This Privacy Policy explains what information FixGrammar handles,
how it is used, and where it is sent.

## Summary

FixGrammar does not operate a server that collects, stores, sells, or analyzes
your data. The extension sends text to the Google Gemini API only when you
click **Rewrite** or **Translate**. The request is sent directly from the
extension to Google. FixGrammar does not send that text to the publisher or to
any other service.

## Information handled by FixGrammar

### Text you submit

When you request a rewrite, grammar correction, email rewrite, or translation,
the text currently in the extension's text box is included in a request to the
Google Gemini API. The selected target language, tone, and Gemini model may
also be included or used to construct that request.

FixGrammar does not read page content, browsing history, form fields, or
website data. It only processes text that you enter or paste into its own text
box.

### Gemini API key

You provide your own Google Gemini API key. FixGrammar stores the key in
Chrome extension sync storage and uses it to authenticate requests to Google's
Gemini API. The key is not sent to the FixGrammar publisher or to a FixGrammar
server.

Because Chrome sync storage is managed by Chrome, Chrome may synchronize this
setting across browsers where you are signed in and have extension sync
enabled. Chrome's handling of synchronized extension data is governed by
Google's applicable policies and your browser settings.

### Extension settings

The extension stores the following settings in Chrome extension sync storage:

- Your Gemini API key
- Your selected Gemini model
- Your favorite languages
- Your selected target language

These settings are used only to provide the extension's functionality. The
extension does not maintain a separate account or user profile.

### Temporary data

The current text and the previous text used by the **Undo** action are held in
the side panel while it is open. They are not written to a FixGrammar server
or to extension storage by FixGrammar.

## Google Gemini API and third parties

Text submitted for rewriting or translation is sent directly to Google through
the Gemini API endpoint. Google processes that information according to its
own terms and privacy practices. Review:

- [Google Privacy Policy](https://policies.google.com/privacy)
- [Gemini API Terms of Service](https://ai.google.dev/gemini-api/terms)
- [Gemini API Usage Policies and Data Handling](https://ai.google.dev/gemini-api/docs/usage-policies)

FixGrammar does not use analytics, advertising, tracking technologies, or
other third-party services.

## Data retention and deletion

FixGrammar does not retain submitted text on its own servers because it has no
server. Text may be handled and retained by Google as described in Google's
policies and the Gemini API terms linked above.

You can remove the extension's stored settings by removing the extension or by
clearing its data through your browser's extension settings. You can also
remove or replace the Gemini API key from FixGrammar's Settings page. Google
API data retention and deletion are controlled by Google and by the applicable
Gemini API account settings and terms.

## Data security

Requests to Google use HTTPS. FixGrammar does not have access to the Gemini
API key or submitted text outside the browser extension and the direct API
request to Google.

## Children's privacy

FixGrammar is not directed to children under 13. We do not knowingly collect
personal information from children.

## Changes to this policy

This policy may be updated when FixGrammar's data practices change. The
effective date at the top of this page will be updated when changes are made.

## Contact

For questions about this Privacy Policy or FixGrammar's data practices, open
an issue in the [FixGrammar GitHub repository](https://github.com/Arzaghi/FixGrammar/issues).