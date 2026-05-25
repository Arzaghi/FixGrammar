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

function runLanguageToolRunner() {
  const runner = path.join(__dirname, 'test_languagetool.js');
  return runRunner(runner);
}

function runGroqRunner(key) {
  const runner = path.join(__dirname, 'test_groq.js');
  const args = [];
  if (key) args.push('--key', key);
  return runRunner(runner, args);
}

function main() {
  const args = process.argv.slice(2);
  let groqKey = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--key' && args[i + 1]) groqKey = args[++i];
    if (args[i] === '--groq-key' && args[i + 1]) groqKey = args[++i];
  }

  if (args.length === 0 || args.includes('--all')) {
    const langToolResult = runLanguageToolRunner();
    const groqResult = groqKey
      ? runGroqRunner(groqKey)
      : { status: 0, succeeded: true, skipped: true };

    if (!groqKey) {
      console.log('Skipping Groq tests: provide --groq-key <key> or --key <key> to run them.');
    }

    const allSucceeded = langToolResult.succeeded && groqResult.succeeded;
    process.exit(allSucceeded ? 0 : 1);
  }

  console.log('USAGE:');
  console.log('  node test_runner.js --all [--groq-key <key>]');
  console.log('  node test_runner.js');
  process.exit(1);
}

main();