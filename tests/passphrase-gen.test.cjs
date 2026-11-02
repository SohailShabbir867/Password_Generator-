/**
 * Tests for Task 4: Memorable Passphrase Engine Module
 * Pure Node.js assert tests (zero npm dependencies).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

function runTests() {
  console.log('Running PassphraseGenerator test suite...\n');

  const modulePath = path.resolve(__dirname, '../js/passphrase-gen.js');
  assert.ok(fs.existsSync(modulePath), 'js/passphrase-gen.js must exist');

  const PassphraseGenerator = require(modulePath);
  assert.ok(PassphraseGenerator, 'PassphraseGenerator must be exported');
  assert.strictEqual(typeof PassphraseGenerator.generate, 'function', 'PassphraseGenerator.generate must be a function');
  assert.strictEqual(typeof PassphraseGenerator.generateOne, 'function', 'PassphraseGenerator.generateOne must be a function');

  // Test 1: Wordlist Verification (1,500+ curated clean words)
  console.log('Test 1: Wordlist Verification');
  assert.ok(Array.isArray(PassphraseGenerator.WORDLIST), 'WORDLIST must be an array');
  assert.ok(PassphraseGenerator.WORDLIST.length >= 1500, `WORDLIST must contain at least 1500 words, got ${PassphraseGenerator.WORDLIST.length}`);

  const uniqueWords = new Set(PassphraseGenerator.WORDLIST);
  assert.strictEqual(uniqueWords.size, PassphraseGenerator.WORDLIST.length, 'WORDLIST must contain no duplicate words');

  for (const word of PassphraseGenerator.WORDLIST) {
    assert.strictEqual(typeof word, 'string', 'Every word must be a string');
    assert.ok(/^[a-z]+$/.test(word), `Word "${word}" must contain only lowercase letters [a-z]`);
    assert.ok(word.length >= 3 && word.length <= 12, `Word "${word}" length must be between 3 and 12 chars`);
  }

  // Test 2: Default Generation
  console.log('Test 2: Default Generation');
  const defaultPass = PassphraseGenerator.generate();
  assert.strictEqual(typeof defaultPass, 'string', 'generate() with default options must return a string');
  const defaultParts = defaultPass.split('-');
  assert.strictEqual(defaultParts.length, 4, 'Default wordCount must be 4 words separated by hyphen');
  for (const part of defaultParts) {
    assert.ok(/^[A-Z][a-z]+$/.test(part), `Default part "${part}" must be Title Case`);
    assert.ok(uniqueWords.has(part.toLowerCase()), `Word "${part}" must exist in WORDLIST`);
  }
  assert.ok(!/\d/.test(defaultPass), 'Default passphrase must not contain numbers');

  // Test 3: Word Count Range (3 to 10)
  console.log('Test 3: Word Count Range (3 to 10)');
  for (let count = 3; count <= 10; count++) {
    const res = PassphraseGenerator.generate({ wordCount: count, separator: '-' });
    assert.strictEqual(typeof res, 'string');
    const words = res.split('-');
    assert.strictEqual(words.length, count, `wordCount ${count} must yield exactly ${count} words`);
    for (const w of words) {
      assert.ok(uniqueWords.has(w.toLowerCase()), `Word "${w}" must exist in WORDLIST`);
    }
  }

  // Invalid word count constraints
  assert.throws(() => {
    PassphraseGenerator.generate({ wordCount: 2 });
  }, /wordCount/i, 'wordCount < 3 must throw');

  assert.throws(() => {
    PassphraseGenerator.generate({ wordCount: 11 });
  }, /wordCount/i, 'wordCount > 10 must throw');

  assert.throws(() => {
    PassphraseGenerator.generate({ wordCount: 0 });
  }, /wordCount/i, 'wordCount 0 must throw');

  assert.throws(() => {
    PassphraseGenerator.generate({ wordCount: -3 });
  }, /wordCount/i, 'negative wordCount must throw');

  assert.throws(() => {
    PassphraseGenerator.generate({ wordCount: NaN });
  }, /wordCount/i, 'NaN wordCount must throw');

  assert.throws(() => {
    PassphraseGenerator.generate({ wordCount: 4.5 });
  }, /wordCount/i, 'non-integer wordCount must throw');

  // Test 4: Separator Options
  console.log('Test 4: Separator Options');

  // Hyphen '-'
  const hypRes = PassphraseGenerator.generate({ wordCount: 4, separator: '-' });
  assert.strictEqual(hypRes.split('-').length, 4);

  const hypNamed = PassphraseGenerator.generate({ wordCount: 4, separator: 'hyphen' });
  assert.strictEqual(hypNamed.split('-').length, 4);

  // Underscore '_'
  const underRes = PassphraseGenerator.generate({ wordCount: 4, separator: '_' });
  assert.strictEqual(underRes.split('_').length, 4);

  const underNamed = PassphraseGenerator.generate({ wordCount: 4, separator: 'underscore' });
  assert.strictEqual(underNamed.split('_').length, 4);

  // Period '.'
  const dotRes = PassphraseGenerator.generate({ wordCount: 4, separator: '.' });
  assert.strictEqual(dotRes.split('.').length, 4);

  const dotNamed = PassphraseGenerator.generate({ wordCount: 4, separator: 'period' });
  assert.strictEqual(dotNamed.split('.').length, 4);

  const dotNamed2 = PassphraseGenerator.generate({ wordCount: 4, separator: 'dot' });
  assert.strictEqual(dotNamed2.split('.').length, 4);

  // Slash '/'
  const slashRes = PassphraseGenerator.generate({ wordCount: 4, separator: '/' });
  assert.strictEqual(slashRes.split('/').length, 4);

  const slashNamed = PassphraseGenerator.generate({ wordCount: 4, separator: 'slash' });
  assert.strictEqual(slashNamed.split('/').length, 4);

  // Space ' '
  const spaceRes = PassphraseGenerator.generate({ wordCount: 4, separator: ' ' });
  assert.strictEqual(spaceRes.split(' ').length, 4);

  const spaceNamed = PassphraseGenerator.generate({ wordCount: 4, separator: 'space' });
  assert.strictEqual(spaceNamed.split(' ').length, 4);

  // Custom string separator
  const customSep = PassphraseGenerator.generate({ wordCount: 4, separator: '::' });
  assert.strictEqual(customSep.split('::').length, 4);

  // Random Number separator
  const numSep1 = PassphraseGenerator.generate({ wordCount: 4, separator: 'random-number' });
  const numWords1 = numSep1.split(/\d/);
  assert.strictEqual(numWords1.length, 4, `random-number separator should place digits between words: ${numSep1}`);
  for (const w of numWords1) {
    assert.ok(uniqueWords.has(w.toLowerCase()), `Word "${w}" should be in wordlist`);
  }

  const numSep2 = PassphraseGenerator.generate({ wordCount: 4, separator: 'number' });
  const numWords2 = numSep2.split(/\d/);
  assert.strictEqual(numWords2.length, 4);

  // Random Symbol separator
  const symSep1 = PassphraseGenerator.generate({ wordCount: 4, separator: 'random-symbol' });
  assert.ok(PassphraseGenerator.RANDOM_SYMBOLS, 'RANDOM_SYMBOLS should be exposed');
  const symEscaped = PassphraseGenerator.RANDOM_SYMBOLS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const symRegex = new RegExp(`[${symEscaped}]`);
  const symWords = symSep1.split(symRegex);
  assert.strictEqual(symWords.length, 4, `random-symbol separator should place symbols between words: ${symSep1}`);
  for (const w of symWords) {
    assert.ok(uniqueWords.has(w.toLowerCase()), `Word "${w}" should be in wordlist`);
  }

  const symSep2 = PassphraseGenerator.generate({ wordCount: 4, separator: 'symbol' });
  const symWords2 = symSep2.split(symRegex);
  assert.strictEqual(symWords2.length, 4);

  // Test 5: Casing Options (title, lower, upper, capitalize)
  console.log('Test 5: Casing Options');

  // title
  const titleRes = PassphraseGenerator.generate({ wordCount: 4, separator: '-', casing: 'title' });
  for (const w of titleRes.split('-')) {
    assert.ok(/^[A-Z][a-z]+$/.test(w), `Word "${w}" must be Title Case`);
  }

  // capitalize (alias for title)
  const capRes = PassphraseGenerator.generate({ wordCount: 4, separator: '-', casing: 'capitalize' });
  for (const w of capRes.split('-')) {
    assert.ok(/^[A-Z][a-z]+$/.test(w), `Word "${w}" must be Capitalized`);
  }

  // lower
  const lowerRes = PassphraseGenerator.generate({ wordCount: 4, separator: '-', casing: 'lower' });
  for (const w of lowerRes.split('-')) {
    assert.ok(/^[a-z]+$/.test(w), `Word "${w}" must be lowercase`);
  }

  // upper
  const upperRes = PassphraseGenerator.generate({ wordCount: 4, separator: '-', casing: 'upper' });
  for (const w of upperRes.split('-')) {
    assert.ok(/^[A-Z]+$/.test(w), `Word "${w}" must be UPPERCASE`);
  }

  // Invalid casing throws
  assert.throws(() => {
    PassphraseGenerator.generate({ casing: 'invalid-casing' });
  }, /casing/i, 'Invalid casing must throw');

  // Test 6: Number Inclusion (append, prepend, random placement)
  console.log('Test 6: Number Inclusion');

  // append
  for (let i = 0; i < 10; i++) {
    const appRes = PassphraseGenerator.generate({ wordCount: 4, separator: '-', includeNumber: 'append' });
    assert.ok(/\d$/.test(appRes), `includeNumber 'append' must end with a digit: "${appRes}"`);
  }

  // prepend
  for (let i = 0; i < 10; i++) {
    const prepRes = PassphraseGenerator.generate({ wordCount: 4, separator: '-', includeNumber: 'prepend' });
    assert.ok(/^\d/.test(prepRes), `includeNumber 'prepend' must start with a digit: "${prepRes}"`);
  }

  // random placement
  for (let i = 0; i < 10; i++) {
    const randNumRes = PassphraseGenerator.generate({ wordCount: 4, separator: '-', includeNumber: 'random' });
    assert.ok(/\d/.test(randNumRes), `includeNumber 'random' must contain a digit: "${randNumRes}"`);
  }

  // boolean includeNumber: true (default append)
  const boolTrueRes = PassphraseGenerator.generate({ wordCount: 4, separator: '-', includeNumber: true });
  assert.ok(/\d/.test(boolTrueRes), 'includeNumber: true must insert a digit');

  // boolean includeNumber: false
  const boolFalseRes = PassphraseGenerator.generate({ wordCount: 4, separator: '-', includeNumber: false });
  assert.ok(!/\d/.test(boolFalseRes), 'includeNumber: false must not insert digits');

  // None
  const noneRes = PassphraseGenerator.generate({ wordCount: 4, separator: '-', includeNumber: 'none' });
  assert.ok(!/\d/.test(noneRes), 'includeNumber: "none" must not insert digits');

  // Object configuration with numberPosition
  const optPosPre = PassphraseGenerator.generate({ wordCount: 4, separator: '-', includeNumber: true, numberPosition: 'prepend' });
  assert.ok(/^\d/.test(optPosPre), 'numberPosition: prepend must start with digit');

  const optPosApp = PassphraseGenerator.generate({ wordCount: 4, separator: '-', includeNumber: true, numberPosition: 'append' });
  assert.ok(/\d$/.test(optPosApp), 'numberPosition: append must end with digit');

  // Test 7: Quantity & generateOne()
  console.log('Test 7: Quantity & generateOne()');

  // quantity: 1 returns a single string
  const q1 = PassphraseGenerator.generate({ quantity: 1 });
  assert.strictEqual(typeof q1, 'string', 'quantity: 1 must return a string');

  // quantity > 1 returns Array<string>
  const q5 = PassphraseGenerator.generate({ quantity: 5 });
  assert.ok(Array.isArray(q5), 'quantity: 5 must return an Array');
  assert.strictEqual(q5.length, 5, 'quantity: 5 must return 5 passphrases');
  for (const item of q5) {
    assert.strictEqual(typeof item, 'string');
    assert.strictEqual(item.split('-').length, 4);
  }

  // quantity: 50 uniqueness check
  const q50 = PassphraseGenerator.generate({ quantity: 50, wordCount: 5 });
  assert.strictEqual(q50.length, 50);
  const q50Set = new Set(q50);
  assert.strictEqual(q50Set.size, 50, '50 generated 5-word passphrases should all be distinct');

  // generateOne() convenience method
  const one = PassphraseGenerator.generateOne({ wordCount: 6, separator: '_' });
  assert.strictEqual(typeof one, 'string', 'generateOne() must return a string');
  assert.strictEqual(one.split('_').length, 6);

  // Invalid quantity constraints
  assert.throws(() => {
    PassphraseGenerator.generate({ quantity: 0 });
  }, /quantity/i, 'quantity 0 must throw');

  assert.throws(() => {
    PassphraseGenerator.generate({ quantity: -2 });
  }, /quantity/i, 'negative quantity must throw');

  assert.throws(() => {
    PassphraseGenerator.generate({ quantity: NaN });
  }, /quantity/i, 'NaN quantity must throw');

  // Test 8: CSPRNG Uniformity & Selection Spread
  console.log('Test 8: CSPRNG Uniformity & Selection Spread');
  // Sample 2,000 words generated across multiple passphrases and verify healthy spread
  const samples = PassphraseGenerator.generate({ quantity: 500, wordCount: 4, casing: 'lower', separator: '-' });
  const observedWords = new Set();
  for (const s of samples) {
    for (const w of s.split('-')) {
      observedWords.add(w);
    }
  }
  // With 2000 draws from 2048 words, coupon collector says observed should be > 700 distinct words
  assert.ok(observedWords.size > 700, `Expected diverse word selection across 2000 draws, got ${observedWords.size} unique words`);

  // Test 9: UTF-8 Cleanliness
  console.log('Test 9: UTF-8 Cleanliness');
  const fileBuf = fs.readFileSync(modulePath);
  assert.ok(!(fileBuf[0] === 0xFF && fileBuf[1] === 0xFE), 'js/passphrase-gen.js must not have UTF-16 BOM');
  assert.ok(!fileBuf.includes(0x00), 'js/passphrase-gen.js must not contain null bytes');

  // Test 10: Edge Cases & Defensive Programming
  console.log('Test 10: Edge Cases & Defensive Programming');
  // Null and empty options
  const nullOptRes = PassphraseGenerator.generate(null);
  assert.strictEqual(typeof nullOptRes, 'string');
  assert.strictEqual(nullOptRes.split('-').length, 4);

  // Empty separator
  const emptySepRes = PassphraseGenerator.generate({ separator: '', wordCount: 3 });
  assert.strictEqual(typeof emptySepRes, 'string');
  assert.ok(!emptySepRes.includes('-'));

  // Casing case-insensitivity ('TITLE', 'UPPER', 'LOWER', 'CAPITALIZE')
  const upperCaseOpt = PassphraseGenerator.generate({ casing: 'UPPER' });
  for (const w of upperCaseOpt.split('-')) {
    assert.strictEqual(w, w.toUpperCase());
  }
  const lowerCaseOpt = PassphraseGenerator.generate({ casing: 'LOWER' });
  for (const w of lowerCaseOpt.split('-')) {
    assert.strictEqual(w, w.toLowerCase());
  }

  // generateOne with explicit quantity override
  const forceOne = PassphraseGenerator.generateOne({ quantity: 15 });
  assert.strictEqual(typeof forceOne, 'string', 'generateOne must return a single string even if quantity > 1');

  // Invalid includeNumber
  assert.throws(() => {
    PassphraseGenerator.generate({ includeNumber: 'somewhere' });
  }, /includeNumber/i);

  assert.throws(() => {
    PassphraseGenerator.generate({ includeNumber: 123 });
  }, /includeNumber/i);

  // Invalid numberPosition
  assert.throws(() => {
    PassphraseGenerator.generate({ includeNumber: true, numberPosition: 'middle' });
  }, /numberPosition/i);

  // getRandomInt checks
  assert.strictEqual(PassphraseGenerator.getRandomInt(1), 0);
  assert.throws(() => PassphraseGenerator.getRandomInt(0), /maxExclusive/i);
  assert.throws(() => PassphraseGenerator.getRandomInt(-1), /maxExclusive/i);
  assert.throws(() => PassphraseGenerator.getRandomInt(NaN), /maxExclusive/i);
  assert.throws(() => PassphraseGenerator.getRandomInt(2.5), /maxExclusive/i);

  // Test 11: Global / Browser Environment Exposure
  console.log('Test 11: Global / Browser Environment Exposure');
  assert.ok(globalThis.PassphraseGenerator, 'PassphraseGenerator must attach to globalThis');
  assert.strictEqual(globalThis.PassphraseGenerator, PassphraseGenerator);

  console.log('\nAll PassphraseGenerator tests passed successfully! (11/11 test suites)');
}

runTests();
