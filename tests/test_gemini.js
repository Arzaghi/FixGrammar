#!/usr/bin/env node
// ============================================================================
// FixGrammar Gemini API Test Runner
// ============================================================================

const https = require('https');

// ===== CONFIGURATION: Add your API key here =====
const GEMINI_API_KEY = ''; // TODO: Add your Gemini API key here
const DELAY_MS = 500; // delay between requests
const MODEL = 'gemini-3.6-flash';

// ===== TEST CASES =====
const testCases = [
  // Basic grammar fixes
  ["I has a apple.", "I have an apple."],
  ["He go to school.", "He goes to school."],
  ["She eat breakfast.", "She eats breakfast."],
  ["We was happy.", "We were happy."],
  ["They was happy.", "They were happy."],
  ["It rain yesterday.", "It rained yesterday."],

  // Contractions
  ["He dont know the answer.", "He doesn't know the answer."],
  ["She dont like apples.", "She doesn't like apples."],
  ["I am not going.", "I am not going."],
  ["You are late.", "You are late."],
  ["I cant do that.", "I can't do that."],

  // Possessives
  ["Your welcome.", "You're welcome."],
  ["Its a good day.", "It's a good day."],
  ["Your a good student.", "You're a good student."],
  ["His a car.", "He has a car."],
  ["Their going to school.", "They're going to school."],

  // Common mistakes
  ["I could of gone.", "I could have gone."],
  ["I should have went.", "I should have gone."],
  ["I have went to the store.", "I have gone to the store."],
  ["Who are you waiting for?", "Who are you waiting for?"],
  ["Me and him went to the store.", "He and I went to the store."],

  // Already correct (should remain unchanged)
  ["The cat sat on the mat.", "The cat sat on the mat."],
  ["She loves reading books.", "She loves reading books."],
  ["The sun sets in the west.", "The sun sets in the west."],
  ["Everyone except me knew.", "Everyone except me knew."],
  ["This is a well-written essay.", "This is a well-written essay."],
];

// Helper function to add delay between requests
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function callGeminiApi(text, apiKey) {
  return new Promise((resolve, reject) => {
    const prompt = `You are a grammar correction assistant. Your task is to:
1. Detect the language of the following text
2. Fix any grammar, spelling, or punctuation errors
3. Return ONLY the corrected text without any explanations or comments

Text: "${text}"

Corrected text:`;

    const requestBody = { contents: [{ parts: [{ text: prompt }] }] };

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

async function runGeminiTest(input, expected, apiKey) {
  const result = { input, expected, actual: '', passed: false, errors: [] };

  try {
    const apiResponse = await callGeminiApi(input, apiKey);

    if (apiResponse.error) {
      result.errors.push(apiResponse.error.message || JSON.stringify(apiResponse.error));
      return result;
    }

    const fixedTextRaw = apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (fixedTextRaw) {
      let fixedText = fixedTextRaw.trim();
      if ((fixedText.startsWith('"') && fixedText.endsWith('"')) ||
          (fixedText.startsWith("'") && fixedText.endsWith("'"))) {
        fixedText = fixedText.slice(1, -1);
      }
      result.actual = fixedText;
      result.passed = result.actual.toLowerCase() === expected.toLowerCase();
    } else {
      result.errors.push('No response content found');
    }
  } catch (error) {
    result.errors.push(error.message);
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);

  let apiKey = GEMINI_API_KEY;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--key' && args[i + 1]) apiKey = args[++i];
  }

  if (!apiKey) {
    console.log('ERROR: Please provide a Gemini API key');
    console.log('Usage: node test_gemini.js --key YOUR_API_KEY');
    console.log('Or edit this file and set GEMINI_API_KEY at the top');
    process.exit(1);
  }

  console.log('FixGrammar Gemini API Test Runner');
  console.log('=================================');
  console.log('');
  console.log(`Total test cases: ${testCases.length}`);
  console.log(`Delay between requests: ${DELAY_MS}ms`);
  console.log('');

  console.log('Testing Google Gemini...');
  console.log('-------------------------');

  let passed = 0, failed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const result = await runGeminiTest(testCases[i][0], testCases[i][1], apiKey);

    if (result.passed) {
      console.log(`✓ ${i + 1}/${testCases.length}: "${testCases[i][0]}" -> "${result.actual}"`);
      passed++;
    } else {
      console.log(`✗ ${i + 1}/${testCases.length}: expected "${testCases[i][1]}", got "${result.actual}"`);
      if (result.errors.length > 0) console.log(`  Errors: ${result.errors.join(', ')}`);
      failed++;
    }

    if (i < testCases.length - 1) await sleep(DELAY_MS);
  }

  console.log('');
  console.log('=================================');
  console.log(`RESULTS - Gemini: ${passed}/${testCases.length} passed, ${failed} failed`);
  console.log('');

  if (passed === testCases.length) {
    console.log('ALL TESTS PASSED! ✅');
  } else {
    console.log(`${testCases.length - passed} tests still need attention.`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
