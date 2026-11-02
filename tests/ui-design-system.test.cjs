/**
 * Tests for Task 1: Design System & Styling Architecture
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTests() {
  console.log('Running Design System & Styling Architecture tests...');

  // 1. Favicon verification
  const faviconPath = path.resolve(__dirname, '../assets/favicon.svg');
  assert.ok(fs.existsSync(faviconPath), 'assets/favicon.svg must exist');
  const faviconContent = fs.readFileSync(faviconPath, 'utf8');
  assert.ok(faviconContent.includes('<svg'), 'favicon.svg must contain <svg root tag');
  assert.ok(faviconContent.includes('</svg>'), 'favicon.svg must close with </svg>');
  assert.ok(faviconContent.includes('viewBox='), 'favicon.svg must define a viewBox');

  // 2. styles.css verification
  const stylesPath = path.resolve(__dirname, '../css/styles.css');
  assert.ok(fs.existsSync(stylesPath), 'css/styles.css must exist');
  const stylesContent = fs.readFileSync(stylesPath, 'utf8');
  const requiredCssVars = [
    '--bg-main',
    '--bg-card',
    '--accent-cyan',
    '--accent-green',
    '--accent-purple',
    '--text-main',
    '--text-muted'
  ];
  for (const v of requiredCssVars) {
    assert.ok(stylesContent.includes(v + ':'), `styles.css must define custom property ${v}`);
  }
  assert.ok(stylesContent.includes('.container'), 'styles.css must include .container layout');
  assert.ok(stylesContent.includes('.app-header'), 'styles.css must include .app-header');
  assert.ok(stylesContent.includes('.dashboard-grid'), 'styles.css must include .dashboard-grid');

  // 3. components.css verification
  const componentsPath = path.resolve(__dirname, '../css/components.css');
  assert.ok(fs.existsSync(componentsPath), 'css/components.css must exist');
  const componentsContent = fs.readFileSync(componentsPath, 'utf8');
  const requiredComponents = [
    '.btn',
    '.tab-btn',
    '.card',
    '.badge',
    '.slider',
    '.switch',
    '.toast',
    '.metric-box'
  ];
  for (const comp of requiredComponents) {
    assert.ok(componentsContent.includes(comp), `components.css must include class ${comp}`);
  }
  assert.ok(componentsContent.includes('.output-terminal'), 'components.css must style output terminal');
  assert.ok(componentsContent.includes('.strength-meter'), 'components.css must style strength meter');
  assert.ok(componentsContent.includes('.modal-backdrop'), 'components.css must style modal backdrop');

  // 4. cyber-theme.css verification
  const cyberPath = path.resolve(__dirname, '../css/cyber-theme.css');
  assert.ok(fs.existsSync(cyberPath), 'css/cyber-theme.css must exist');
  const cyberContent = fs.readFileSync(cyberPath, 'utf8');
  assert.ok(cyberContent.includes('glass-panel'), 'cyber-theme.css must implement glassmorphism');
  assert.ok(cyberContent.includes('glow-cyan'), 'cyber-theme.css must implement neon glows');
  assert.ok(cyberContent.includes('cyber-corners'), 'cyber-theme.css must implement cyber corners');
  assert.ok(cyberContent.includes('cyber-border-gradient'), 'cyber-theme.css must implement animated gradient borders');
  assert.ok(cyberContent.includes('scrollbar'), 'cyber-theme.css must implement custom scrollbars');
  assert.ok(cyberContent.includes('@keyframes'), 'cyber-theme.css must define keyframe animations');

  // 5. UTF-8 Cleanliness
  for (const filePath of [faviconPath, stylesPath, componentsPath, cyberPath]) {
    const buf = fs.readFileSync(filePath);
    assert.ok(!(buf[0] === 0xFF && buf[1] === 0xFE), `${filePath} must not have UTF-16 BOM`);
    assert.ok(!buf.includes(0x00), `${filePath} must not contain null bytes`);
  }

  console.log('All Design System & Styling Architecture tests passed! (5/5 suites)');
}

runTests();
