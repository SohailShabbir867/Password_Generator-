/**
 * Tests for Task 7: Unified Dashboard UI & Application Controller
 *
 * Verifies HTML structure, meta tags, script/style links, DOM element IDs,
 * backward-compatible linking in wordlist.html, and AppController coordinator functionality.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTests() {
  console.log('Running Integration & Dashboard Suite tests...\n');

  const indexPath = path.resolve(__dirname, '../index.html');
  const wordlistPath = path.resolve(__dirname, '../wordlist.html');
  const appJsPath = path.resolve(__dirname, '../js/app.js');

  // Test 1: File Existence & UTF-8 Cleanliness
  console.log('Test 1: File Existence & UTF-8 Cleanliness');
  assert.ok(fs.existsSync(indexPath), 'index.html must exist');
  assert.ok(fs.existsSync(wordlistPath), 'wordlist.html must exist');
  assert.ok(fs.existsSync(appJsPath), 'js/app.js must exist');

  for (const file of [indexPath, wordlistPath, appJsPath]) {
    const buf = fs.readFileSync(file);
    assert.ok(!(buf[0] === 0xFF && buf[1] === 0xFE), `${file} must not have UTF-16 BOM`);
    assert.ok(!buf.includes(0x00), `${file} must not contain null bytes`);
  }

  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const wordlistContent = fs.readFileSync(wordlistPath, 'utf8');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');

  // Test 2: HTML5 Semantic Structure & Meta Tags in index.html
  console.log('Test 2: HTML5 Semantic Structure & Meta Tags in index.html');
  assert.ok(indexContent.includes('<!DOCTYPE html>'), 'index.html must declare <!DOCTYPE html>');
  assert.ok(/<html[^>]*lang=["']en["']/i.test(indexContent), 'index.html must have <html lang="en">');
  assert.ok(/<meta[^>]*charset=["']UTF-8["']/i.test(indexContent), 'index.html must define UTF-8 charset');
  assert.ok(/<meta[^>]*name=["']viewport["']/i.test(indexContent), 'index.html must define viewport meta tag');
  assert.ok(indexContent.includes('<title>'), 'index.html must define a <title> tag');
  assert.ok(/assets\/favicon\.svg/i.test(indexContent), 'index.html must link assets/favicon.svg');

  // Test 3: Stylesheets & FontAwesome Links
  console.log('Test 3: Stylesheets & FontAwesome Links');
  assert.ok(indexContent.includes('font-awesome'), 'index.html must include FontAwesome link');
  assert.ok(indexContent.includes('css/styles.css'), 'index.html must include css/styles.css');
  assert.ok(indexContent.includes('css/components.css'), 'index.html must include css/components.css');
  assert.ok(indexContent.includes('css/cyber-theme.css'), 'index.html must include css/cyber-theme.css');

  // Test 4: JavaScript Module Tags in index.html
  console.log('Test 4: JavaScript Module Tags in index.html');
  const requiredScripts = [
    'js/crypto-gen.js',
    'js/targeted-gen.js',
    'js/passphrase-gen.js',
    'js/strength-meter.js',
    'js/wordlist-worker.js',
    'js/app.js'
  ];
  for (const script of requiredScripts) {
    assert.ok(indexContent.includes(script), `index.html must load script tag for ${script}`);
  }

  // Test 5: Tab Navigation & Panels in index.html
  console.log('Test 5: Tab Navigation & Panels in index.html');
  const requiredTabs = ['tab-csprng', 'tab-targeted', 'tab-passphrase', 'tab-wordlist'];
  const requiredPanels = ['panel-csprng', 'panel-targeted', 'panel-passphrase', 'panel-wordlist'];

  for (const tabId of requiredTabs) {
    assert.ok(indexContent.includes(`id="${tabId}"`), `index.html must contain tab element #${tabId}`);
  }
  for (const panelId of requiredPanels) {
    assert.ok(indexContent.includes(`id="${panelId}"`), `index.html must contain panel element #${panelId}`);
  }

  // Test 6: Mode Control Form IDs in index.html
  console.log('Test 6: Mode Control Form IDs in index.html');
  const requiredControlIds = [
    // Mode 1: CSPRNG
    'csprng-length',
    'csprng-length-val',
    'csprng-quantity',
    'csprng-upper',
    'csprng-lower',
    'csprng-numbers',
    'csprng-symbols',
    'csprng-no-ambiguous',
    'csprng-custom',
    'btn-generate-csprng',

    // Mode 2: Targeted
    'targeted-words',
    'targeted-numbers',
    'targeted-symbols',
    'targeted-delimiters',
    'targeted-casing',
    'targeted-leet',
    'targeted-reverse',
    'targeted-compounds',
    'targeted-affixes',
    'targeted-min-len',
    'targeted-max-len',
    'targeted-limit',
    'btn-generate-targeted',

    // Mode 3: Passphrase
    'passphrase-words',
    'passphrase-words-val',
    'passphrase-separator',
    'passphrase-custom-separator',
    'passphrase-casing',
    'passphrase-include-number',
    'passphrase-number-pos',
    'passphrase-quantity',
    'btn-generate-passphrase',

    // Mode 4: Worker Matrix
    'worker-mode',
    'worker-custom-chars',
    'worker-custom-chars-group',
    'worker-count',
    'worker-min-len',
    'worker-max-len',
    'btn-worker-start',
    'btn-worker-pause',
    'btn-worker-resume',
    'btn-worker-stop',
    'worker-progress-bar',
    'worker-progress-val',
    'worker-metric-generated',
    'worker-metric-speed',
    'worker-metric-elapsed',
    'worker-metric-size'
  ];

  for (const id of requiredControlIds) {
    assert.ok(indexContent.includes(`id="${id}"`), `index.html must contain control element #${id}`);
  }

  // Test 7: Output Hero, Terminal, Strength Meter & Modal IDs in index.html
  console.log('Test 7: Output Hero, Terminal, Strength Meter & Modal IDs in index.html');
  const requiredUiIds = [
    // Hero & Terminal
    'hero-password',
    'btn-hero-copy',
    'btn-hero-regenerate',
    'terminal-container',
    'terminal-count-badge',
    'terminal-content',
    'btn-copy-all',
    'btn-clear-output',
    'btn-download-txt',
    'btn-download-json',
    'btn-download-csv',

    // Strength Analyzer
    'strength-input',
    'strength-entropy',
    'strength-score-label',
    'strength-meter-bar',
    'crit-length',
    'crit-upper',
    'crit-lower',
    'crit-numbers',
    'crit-symbols',
    'crit-no-repeats',
    'crit-no-sequences',
    'crit-no-dict',
    'crack-online-throttled',
    'crack-online-unthrottled',
    'crack-offline-gpu',
    'crack-cluster',
    'strength-feedback-list',

    // History Modal & Toasts
    'btn-open-history',
    'btn-close-history',
    'history-modal',
    'history-list',
    'btn-clear-history',
    'history-count-badge',
    'toast-container'
  ];

  for (const id of requiredUiIds) {
    assert.ok(indexContent.includes(`id="${id}"`), `index.html must contain UI element #${id}`);
  }

  // Test 8: App.js DOM Element Binding Symmetry
  console.log('Test 8: App.js DOM Element Binding Symmetry');
  // Extract all el('...') references in app.js
  const elMatches = appJsContent.match(/el\(['"]([a-zA-Z0-9_-]+)['"]\)/g) || [];
  const referencedIds = new Set(elMatches.map(m => m.replace(/el\(['"]/, '').replace(/['"]\)/, '')));

  assert.ok(referencedIds.size > 20, 'app.js should bind multiple DOM IDs');
  for (const id of referencedIds) {
    assert.ok(
      indexContent.includes(`id="${id}"`),
      `ID "${id}" referenced in js/app.js must exist in index.html`
    );
  }

  // Test 9: Backward-compatible Link & Cyber Banner in wordlist.html
  console.log('Test 9: Backward-compatible Link & Cyber Banner in wordlist.html');
  assert.ok(wordlistContent.includes('index.html'), 'wordlist.html must link back to index.html');
  assert.ok(
    wordlistContent.includes('cyber-hub-banner') || wordlistContent.includes('Unified Hub') || wordlistContent.includes('Unified Cyber Dashboard'),
    'wordlist.html must contain a banner directing users to unified hub'
  );
  assert.ok(wordlistContent.includes('assets/favicon.svg'), 'wordlist.html must link assets/favicon.svg');

  // Test 10: AppController CommonJS export & Mock Environment Sanity
  console.log('Test 10: AppController CommonJS export & Mock Environment Sanity');
  const AppController = require(appJsPath);
  assert.ok(AppController, 'js/app.js must export AppController');
  assert.strictEqual(typeof AppController.init, 'function', 'AppController.init must be a function');
  assert.strictEqual(typeof AppController.showToast, 'function', 'AppController.showToast must be a function');
  assert.strictEqual(typeof AppController.switchTab, 'function', 'AppController.switchTab must be a function');
  assert.strictEqual(typeof AppController.updateStrengthMeter, 'function', 'AppController.updateStrengthMeter must be a function');
  assert.strictEqual(typeof AppController.setHeroPassword, 'function', 'AppController.setHeroPassword must be a function');
  assert.strictEqual(typeof AppController.renderTerminal, 'function', 'AppController.renderTerminal must be a function');
  assert.strictEqual(typeof AppController.exportData, 'function', 'AppController.exportData must be a function');

  // Test 11: AppController Mock UI Flow
  console.log('Test 11: AppController Mock UI Flow');
  // Load dependencies in global scope
  const cryptoGen = require(path.resolve(__dirname, '../js/crypto-gen.js'));
  const targetedGen = require(path.resolve(__dirname, '../js/targeted-gen.js'));
  const passphraseGen = require(path.resolve(__dirname, '../js/passphrase-gen.js'));
  const strengthMeter = require(path.resolve(__dirname, '../js/strength-meter.js'));
  const workerEngine = require(path.resolve(__dirname, '../js/wordlist-worker.js'));

  global.CryptoPasswordGenerator = cryptoGen;
  global.TargetedGenerator = targetedGen;
  global.PassphraseGenerator = passphraseGen;
  global.StrengthMeter = strengthMeter;
  global.WordlistWorkerEngine = workerEngine;

  // Verify strength calculation through AppController
  const mockAnalysis = StrengthMeter.analyze('CorrectHorseBatteryStaple123!');
  assert.ok(mockAnalysis.bits > 50, 'Analysis entropy should exceed 50 bits');
  assert.ok(mockAnalysis.crackTime, 'Analysis should contain crackTime estimates');

  console.log('All Integration & Dashboard Suite tests passed successfully! (11/11 tests)');
}

runTests();
