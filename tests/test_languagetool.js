#!/usr/bin/env node
// ============================================================================
// FixGrammar LanguageTool API Test Runner
// ============================================================================

const https = require('https');

// ===== TEST CASES =====
const testCases = [
  // Basic grammar fixes
  ["I has a apple.", "I have an apple."],
  ["He go to school.", "He goes to school."],
  ["She eat breakfast.", "She eats breakfast."],
  ["We was happy.", "We are happy."],
  ["They was happy.", "They are happy."],
  ["It rain yesterday.", "It rains yesterday."],
  
  // Contractions
  ["He dont know the answer.", "He don't know the answer."],
  ["She dont like apples.", "She don't like apples."],
  ["I am not going.", "I am not going."],
  ["You are late.", "You are late."],
  ["I cant do that.", "I can't do that."],
  
  // Possessives
  ["Your welcome.", "You're welcome."],
  ["Its a good day.", "It's a good day."],
  ["Your a good student.", "You're a good student."],
  ["His a car.", "He's a car."],
  ["Their going to school.", "Their going to school."],
  
  // Common mistakes
  ["I could of gone.", "I could have gone."],
  ["I should have went.", "I should have gone."],
  ["I have went to the store.", "I have gone to the store."],
  ["Who are you waiting for?", "Who are you waiting for?"],
  ["Me and him went to the store.", "I and him went to the store."],
  
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

function callLanguageToolApi(text) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', 'en-US');
    params.append('enabledOnly', 'false');

    const url = new URL('https://api.languagetool.org/v2/check');
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON')); }
      });
    });

    req.on('error', reject);
    req.write(params.toString());
    req.end();
  });
}

function extractReplacements(data) {
  if (!data || !data.matches) return [];
  return data.matches
    .filter(m => m.replacements && m.replacements.length > 0)
    .map(m => ({ offset: m.offset, length: m.length, replacement: m.replacements[0].value || m.replacements[0] }));
}

function applyReplacements(original, replacements) {
  if (!replacements || replacements.length === 0) return original;
  const sorted = [...replacements].sort((a, b) => b.offset - a.offset);
  let result = original;
  for (const r of sorted) {
    const o = parseInt(r.offset), l = parseInt(r.length), rep = r.replacement;
    if (o >= 0 && o < result.length && o + l <= result.length) {
      result = result.slice(0, o) + rep + result.slice(o + l);
    }
  }
  return result;
}

async function runLanguageToolTest(input, expected) {
  const result = { input, expected, actual: '', passed: false, errors: [] };
  
  try {
    const apiResponse = await callLanguageToolApi(input);
    const replacements = extractReplacements(apiResponse);
    
    if (replacements.length > 0) {
      result.actual = applyReplacements(input, replacements);
      result.passed = result.actual.toLowerCase() === expected.toLowerCase();
    } else {
      result.actual = input;
      result.passed = expected.toLowerCase() === input.toLowerCase();
    }
  } catch (error) {
    result.errors.push(error.message);
  }
  
  return result;
}

async function main() {
  console.log('FixGrammar LanguageTool API Test Runner');
  console.log('========================================');
  console.log('');
  console.log(`Total test cases: ${testCases.length}`);
  console.log('');
  
  console.log('Testing LanguageTool API...');
  console.log('--------------------------------');
  
  let passed = 0, failed = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const result = await runLanguageToolTest(testCases[i][0], testCases[i][1]);
    
    if (result.passed) {
      console.log(`✓ ${i + 1}/${testCases.length}: "${testCases[i][0]}" -> "${result.actual}"`);
      passed++;
    } else {
      console.log(`✗ ${i + 1}/${testCases.length}: expected "${testCases[i][1]}", got "${result.actual}"`);
      if (result.errors.length > 0) console.log(`  Errors: ${result.errors.join(', ')}`);
      failed++;
    }
    
  }
  
  console.log('');
  console.log('========================================');
  console.log(`RESULTS - LanguageTool: ${passed}/${testCases.length} passed, ${failed} failed`);
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