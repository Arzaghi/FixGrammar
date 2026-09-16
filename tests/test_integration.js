#!/usr/bin/env node
// ============================================================================
// FixGrammar API Integration Test
// ============================================================================
// Sends a single trivial request to the Gemini API (the only backend this
// extension uses) and confirms a valid response comes back. This is a
// connectivity smoke test only — it does not validate grammar-correction
// quality.

const https = require('https');

const MODEL = 'gemini-3.6-flash';

function callGeminiApi(text, apiKey) {
  return new Promise((resolve, reject) => {
    const requestBody = { contents: [{ parts: [{ text }] }] };

    const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(requestBody));
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);

  let apiKey = process.env.GEMINI_API_KEY || '';

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--key' || args[i] === '--gemini-key') && args[i + 1]) apiKey = args[++i];
  }

  if (!apiKey) {
    console.log('Skipping integration test: provide --key <key> or --gemini-key <key> (or set GEMINI_API_KEY) to run it.');
    process.exit(0);
  }

  console.log('FixGrammar API Integration Test');
  console.log('================================');

  try {
    const apiResponse = await callGeminiApi('Say "OK".', apiKey);

    if (apiResponse.error) {
      console.log(`✗ Gemini API returned an error: ${apiResponse.error.message || JSON.stringify(apiResponse.error)}`);
      process.exit(1);
    }

    const text = apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      console.log(`✓ Connected to Gemini API successfully. Response: "${text.trim()}"`);
      process.exit(0);
    } else {
      console.log('✗ No response content found in Gemini API reply');
      console.log(JSON.stringify(apiResponse));
      process.exit(1);
    }
  } catch (error) {
    console.log(`✗ Failed to reach Gemini API: ${error.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
