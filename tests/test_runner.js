#!/usr/bin/env node
// ============================================================================
// FixGrammar Cross-Platform Test Runner
// ============================================================================

const https = require('https');

// ===== CONFIGURATION: Add your test cases here =====
// Format: ["input", "expected"]
const testCases = [
  ["I has a apple.", "I have an apple."],
  ["He go to school.", "He goes to school."],
  ["They was happy.", "They are happy."],
  ["He don't know the answer.", "He doesn't know the answer."],
  ["Your welcome.", "You're welcome."],
  ["Your the best.", "You're the best."],
  ["Its a good day.", "It's a good day."],
  ["Your a good student.", "You're a good student."],
  ["I could of gone.", "I could have gone."],
  ["I should have went.", "I should have gone."],
  ["The cat sat on the mat.", "The cat sat on the mat."],
  ["Everyone except me knew.", "Everyone except me knew."],
];

const API_URL = 'https://api.languagetool.org/v2/check';

function sendApiRequest(text, language = 'en-US') {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', language);
    params.append('enabledOnly', 'false');

    const url = new URL(API_URL);
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

async function runTest(input, expected, description = '') {
  const result = { input, expected, actual: '', passed: false, matchesFound: 0, changes: [], errors: [] };
  
  try {
    const apiResponse = await sendApiRequest(input);
    const replacements = extractReplacements(apiResponse);
    result.matchesFound = replacements.length;
    result.changes = replacements.map(r => ({
      from: input.slice(parseInt(r.offset), parseInt(r.offset) + parseInt(r.length)),
      to: r.replacement
    }));
    
    if (replacements.length > 0) {
      result.actual = applyReplacements(input, replacements);
      result.passed = result.actual === expected;
    } else {
      result.actual = input;
      result.passed = expected === input;
    }
  } catch (error) {
    result.errors.push(error.message);
    result.passed = false;
  }
  
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const options = { input: '', expected: '', testName: '', all: args.includes('--all'), ci: args.includes('--ci') };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-i' && args[i + 1]) options.input = args[++i];
    if (args[i] === '-e' && args[i + 1]) options.expected = args[++i];
    if (args[i] === '-t' && args[i + 1]) options.testName = args[++i];
    if (args[i] === '--name' && args[i + 1]) options.testName = args[++i];
  }
  
  // CI mode: minimal output
  if (options.ci) {
    let passed = 0, failed = 0;
    for (let i = 0; i < testCases.length; i++) {
      const result = await runTest(testCases[i][0], testCases[i][1]);
      if (result.passed) {
        console.log(`OK ${i + 1}: "${testCases[i][0]}" -> "${result.actual}"`);
        passed++;
      } else {
        console.log(`FAIL ${i + 1}: expected "${testCases[i][1]}", got "${result.actual}"`);
        failed++;
      }
    }
    console.log(`PASS=${passed} FAIL=${failed}`);
    process.exit(failed === 0 ? 0 : 1);
  }
  
  // Quick test mode
  if (options.input && options.expected) {
    const result = await runTest(options.input, options.expected, 'Quick test');
    console.log(`RESULT: ${result.passed ? 'PASSED' : 'FAILED'}`);
    process.exit(result.passed ? 0 : 1);
  }
  
  // Run all tests (verbose but cleaner)
  if (options.all || (!options.input && !options.testName)) {
    console.log('FixGrammar Test Runner');
    console.log('====================');
    
    let passed = 0, failed = 0;
    
    for (let i = 0; i < testCases.length; i++) {
      const result = await runTest(testCases[i][0], testCases[i][1]);
      if (result.passed) {
        console.log(`✓ ${i + 1}`);
        passed++;
      } else {
        console.log(`✗ ${i + 1}: expected "${testCases[i][1]}", got "${result.actual}"`);
        failed++;
      }
    }
    
    console.log(`\nResults: ${passed}/${testCases.length} passed, ${failed} failed`);
    process.exit(failed === 0 ? 0 : 1);
  }
  
  console.log('USAGE:');
  console.log('  node test_runner.js --all [--ci]');
  console.log('  node test_runner.js -i "input" -e "expected"');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});