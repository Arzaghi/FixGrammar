#!/usr/bin/env node
// ============================================================================
// FixGrammar Test Runner Wrapper
// ============================================================================

const { spawnSync } = require('child_process');
const path = require('path');

function runRunner(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });

  if (result.error) {
    console.error(`Failed to start ${path.basename(script)}:`, result.error.message);
    return { status: 1, succeeded: false };
  }

  return { status: result.status === null ? 1 : result.status, succeeded: result.status === 0 };
}

function runGeminiRunner(key) {
  const runner = path.join(__dirname, 'test_gemini.js');
  const args = [];
  if (key) args.push('--key', key);
  return runRunner(runner, args);
}

function main() {
  const args = process.argv.slice(2);
  let geminiKey = process.env.GEMINI_API_KEY || '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--key' && args[i + 1]) geminiKey = args[++i];
    if (args[i] === '--gemini-key' && args[i + 1]) geminiKey = args[++i];
  }

  if (args.length === 0 || args.includes('--all')) {
    if (!geminiKey) {
      console.log('Skipping Gemini test: provide --key <key> or --gemini-key <key> (or set GEMINI_API_KEY) to run it.');
      process.exit(0);
    }

    const geminiResult = runGeminiRunner(geminiKey);
    process.exit(geminiResult.succeeded ? 0 : 1);
  }

  console.log('USAGE:');
  console.log('  node test_runner.js --all [--key <key>]');
  console.log('  node test_runner.js');
  process.exit(1);
}

main();
