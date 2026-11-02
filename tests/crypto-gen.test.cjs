/**
 * Tests for Task 2: Cryptographically Secure Random Password Generator Module
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

function runTests() {
  console.log('Running CryptoPasswordGenerator test suite...\n');

  const modulePath = path.resolve(__dirname, '../js/crypto-gen.js');
  assert.ok(fs.existsSync(modulePath), 'js/crypto-gen.js must exist');

  const CryptoPasswordGenerator = require(modulePath);
  assert.ok(CryptoPasswordGenerator, 'CryptoPasswordGenerator must be exported');
  assert.strictEqual(typeof CryptoPasswordGenerator.generate, 'function', 'CryptoPasswordGenerator.generate must be a function');

  // 1. Default generation
  console.log('Test 1: Default generation');
  const defaultResult = CryptoPasswordGenerator.generate();
  assert.ok(Array.isArray(defaultResult), 'generate() must return an Array');
  assert.strictEqual(defaultResult.length, 1, 'Default quantity must be 1');
  assert.strictEqual(typeof defaultResult[0], 'string', 'Generated item must be a string');
  assert.strictEqual(defaultResult[0].length, 16, 'Default password length must be 16');

  // 2. Length constraints
  console.log('Test 2: Length constraints');
  const lengths = [1, 6, 8, 16, 24, 64, 128];
  for (const len of lengths) {
    const res = CryptoPasswordGenerator.generate({ length: len });
    assert.strictEqual(res[0].length, len, `Password length must match requested length ${len}`);
  }

  // Invalid length checks
  assert.throws(() => {
    CryptoPasswordGenerator.generate({ length: 0 });
  }, /length/i, 'length <= 0 must throw error');

  assert.throws(() => {
    CryptoPasswordGenerator.generate({ length: -5 });
  }, /length/i, 'negative length must throw error');

  assert.throws(() => {
    CryptoPasswordGenerator.generate({ length: NaN });
  }, /length/i, 'NaN length must throw error');

  // 3. Quantity constraints
  console.log('Test 3: Quantity constraints');
  const q5 = CryptoPasswordGenerator.generate({ quantity: 5 });
  assert.strictEqual(q5.length, 5, 'quantity: 5 must return 5 passwords');
  for (const pw of q5) {
    assert.strictEqual(typeof pw, 'string');
    assert.strictEqual(pw.length, 16);
  }

  const q100 = CryptoPasswordGenerator.generate({ quantity: 100 });
  assert.strictEqual(q100.length, 100, 'quantity: 100 must return 100 passwords');
  const uniqueCount = new Set(q100).size;
  assert.ok(uniqueCount >= 98, '100 generated random 16-char passwords should be virtually all unique');

  assert.throws(() => {
    CryptoPasswordGenerator.generate({ quantity: 0 });
  }, /quantity/i, 'quantity: 0 must throw error');

  assert.throws(() => {
    CryptoPasswordGenerator.generate({ quantity: -1 });
  }, /quantity/i, 'quantity: -1 must throw error');

  // 4. Character Set Isolation
  console.log('Test 4: Character Set Isolation');

  // Uppercase only
  const upperOnly = CryptoPasswordGenerator.generate({
    length: 30,
    quantity: 10,
    uppercase: true,
    lowercase: false,
    numbers: false,
    symbols: false
  });
  for (const pw of upperOnly) {
    assert.ok(/^[A-Z]+$/.test(pw), `Password "${pw}" must contain only uppercase letters`);
  }

  // Lowercase only
  const lowerOnly = CryptoPasswordGenerator.generate({
    length: 30,
    quantity: 10,
    uppercase: false,
    lowercase: true,
    numbers: false,
    symbols: false
  });
  for (const pw of lowerOnly) {
    assert.ok(/^[a-z]+$/.test(pw), `Password "${pw}" must contain only lowercase letters`);
  }

  // Numbers only
  const numbersOnly = CryptoPasswordGenerator.generate({
    length: 30,
    quantity: 10,
    uppercase: false,
    lowercase: false,
    numbers: true,
    symbols: false
  });
  for (const pw of numbersOnly) {
    assert.ok(/^[0-9]+$/.test(pw), `Password "${pw}" must contain only digits`);
  }

  // Symbols only
  const symbolsOnly = CryptoPasswordGenerator.generate({
    length: 30,
    quantity: 10,
    uppercase: false,
    lowercase: false,
    numbers: false,
    symbols: true
  });
  // Standard symbols: !@#$%^&*()_+-=[]{}|;:,.<>?
  const symbolRegex = /^[!@#$%^&*()_+\-=[\]{}|;:,.<>?]+$/;
  for (const pw of symbolsOnly) {
    assert.ok(symbolRegex.test(pw), `Password "${pw}" must contain only symbols`);
  }

  // 5. Guaranteed Minimum Set Representation
  console.log('Test 5: Guaranteed Minimum Set Representation');
  // When all 4 sets are active and length >= 4, every password must have at least one from each active set
  const multiSetList = CryptoPasswordGenerator.generate({
    length: 16,
    quantity: 50,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });

  for (const pw of multiSetList) {
    assert.ok(/[A-Z]/.test(pw), `Password "${pw}" must have at least 1 uppercase letter`);
    assert.ok(/[a-z]/.test(pw), `Password "${pw}" must have at least 1 lowercase letter`);
    assert.ok(/[0-9]/.test(pw), `Password "${pw}" must have at least 1 number`);
    assert.ok(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pw), `Password "${pw}" must have at least 1 symbol`);
  }

  // 6. Ambiguous character exclusion
  console.log('Test 6: Ambiguous character exclusion');
  const ambiguousRegex = /[1lI0Oo]/;
  const noAmbiguousList = CryptoPasswordGenerator.generate({
    length: 32,
    quantity: 100,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: true
  });

  for (const pw of noAmbiguousList) {
    assert.ok(!ambiguousRegex.test(pw), `Password "${pw}" must not contain ambiguous chars (1, l, I, 0, O, o)`);
  }

  // 7. Custom Characters
  console.log('Test 7: Custom Characters');
  const customOnly = CryptoPasswordGenerator.generate({
    length: 20,
    quantity: 10,
    uppercase: false,
    lowercase: false,
    numbers: false,
    symbols: false,
    customChars: 'XYZ@'
  });
  for (const pw of customOnly) {
    assert.ok(/^[XYZ@]+$/.test(pw), `Password "${pw}" must only contain characters from custom set`);
  }

  // Custom chars with ambiguous exclusion
  const customAmbiguous = CryptoPasswordGenerator.generate({
    length: 15,
    quantity: 5,
    uppercase: false,
    lowercase: false,
    numbers: false,
    symbols: false,
    customChars: '1A0B',
    excludeAmbiguous: true
  });
  for (const pw of customAmbiguous) {
    assert.ok(/^[AB]+$/.test(pw), `Password "${pw}" must filter out 1 and 0 when ambiguous excluded`);
  }

  // 8. Error handling
  console.log('Test 8: Error handling');
  // No character sets selected
  assert.throws(() => {
    CryptoPasswordGenerator.generate({
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
      customChars: ''
    });
  }, /character set/i, 'No character set selected must throw error');

  // Custom chars empty after ambiguous exclusion
  assert.throws(() => {
    CryptoPasswordGenerator.generate({
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
      customChars: '1lI0Oo',
      excludeAmbiguous: true
    });
  }, /character set|pool/i, 'Empty character pool after filter must throw error');

  // 9. Null & Undefined safety (Review Findings 3 & 4)
  console.log('Test 9: Null & Undefined safety');
  // generate(null) and generate(undefined) must work with defaults
  const fromNull = CryptoPasswordGenerator.generate(null);
  assert.strictEqual(fromNull.length, 1);
  assert.strictEqual(fromNull[0].length, 16);

  const fromUndef = CryptoPasswordGenerator.generate(undefined);
  assert.strictEqual(fromUndef.length, 1);
  assert.strictEqual(fromUndef[0].length, 16);

  const singleNull = CryptoPasswordGenerator.generateOne(null);
  assert.strictEqual(typeof singleNull, 'string');
  assert.strictEqual(singleNull.length, 16);

  // customChars: null or undefined must not throw TypeError
  const nullCustom = CryptoPasswordGenerator.generate({
    customChars: null
  });
  assert.strictEqual(nullCustom.length, 1);
  assert.strictEqual(nullCustom[0].length, 16);

  const undefCustom = CryptoPasswordGenerator.generate({
    customChars: undefined
  });
  assert.strictEqual(undefCustom.length, 1);
  assert.strictEqual(undefCustom[0].length, 16);

  // 10. getRandomInt & shuffleArray resilience (Review Findings 1 & 2)
  console.log('Test 10: getRandomInt & shuffleArray resilience');
  // Must default to cryptoObj without throwing
  const randVal = CryptoPasswordGenerator.getRandomInt(10);
  assert.ok(randVal >= 0 && randVal < 10, 'getRandomInt without cryptoObj must produce valid integer');

  const shuffled = CryptoPasswordGenerator.shuffleArray([1, 2, 3, 4, 5]);
  assert.strictEqual(shuffled.length, 5);

  // Guards against NaN, non-number, <= 1
  assert.strictEqual(CryptoPasswordGenerator.getRandomInt(NaN), 0, 'getRandomInt(NaN) must return 0');
  assert.strictEqual(CryptoPasswordGenerator.getRandomInt('invalid'), 0, 'getRandomInt(string) must return 0');
  assert.strictEqual(CryptoPasswordGenerator.getRandomInt(0), 0, 'getRandomInt(0) must return 0');
  assert.strictEqual(CryptoPasswordGenerator.getRandomInt(1), 0, 'getRandomInt(1) must return 0');
  assert.strictEqual(CryptoPasswordGenerator.getRandomInt(-5), 0, 'getRandomInt(negative) must return 0');

  // 11. Unicode Surrogate Pair Support (Review Finding 5)
  console.log('Test 11: Unicode Surrogate Pair Support');
  const unicodeEmojis = '🔒🚀🛡️🔑';
  const emojiPasswords = CryptoPasswordGenerator.generate({
    length: 10,
    quantity: 5,
    uppercase: false,
    lowercase: false,
    numbers: false,
    symbols: false,
    customChars: unicodeEmojis
  });
  for (const pw of emojiPasswords) {
    const codePoints = Array.from(pw);
    assert.strictEqual(codePoints.length, 10, 'Password must have exactly 10 Unicode code points');
    for (const cp of codePoints) {
      assert.ok(unicodeEmojis.includes(cp), `Character ${cp} must be one of the emojis`);
    }
  }

  // 12. Exposed properties & helper functions
  console.log('Test 12: Exposed properties & helper functions');
  assert.ok(CryptoPasswordGenerator.CHARSETS, 'CHARSETS should be exposed');
  assert.strictEqual(typeof CryptoPasswordGenerator.CHARSETS.UPPERCASE, 'string');
  assert.strictEqual(typeof CryptoPasswordGenerator.CHARSETS.LOWERCASE, 'string');
  assert.strictEqual(typeof CryptoPasswordGenerator.CHARSETS.NUMBERS, 'string');
  assert.strictEqual(typeof CryptoPasswordGenerator.CHARSETS.SYMBOLS, 'string');
  assert.strictEqual(typeof CryptoPasswordGenerator.AMBIGUOUS, 'string');

  if (typeof CryptoPasswordGenerator.generateOne === 'function') {
    const single = CryptoPasswordGenerator.generateOne({ length: 12 });
    assert.strictEqual(typeof single, 'string');
    assert.strictEqual(single.length, 12);
  }

  // 13. CSPRNG randomness distribution sanity check
  console.log('Test 13: CSPRNG randomness distribution sanity check');
  // Generate 4000 single-char passwords from a 4-char pool and verify uniform spread
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  const samplePass = CryptoPasswordGenerator.generate({
    length: 1,
    quantity: 4000,
    uppercase: false,
    lowercase: false,
    numbers: false,
    symbols: false,
    customChars: 'ABCD'
  });
  for (const p of samplePass) {
    counts[p] = (counts[p] || 0) + 1;
  }
  // Expected is 1000 per char. With 4000 samples, each should be well within [800, 1200]
  for (const char of ['A', 'B', 'C', 'D']) {
    assert.ok(counts[char] > 800 && counts[char] < 1200, `Distribution for ${char} (${counts[char]}) should be roughly uniform`);
  }

  // 14. UTF-8 Cleanliness
  console.log('Test 14: UTF-8 Cleanliness');
  const genBuf = fs.readFileSync(modulePath);
  assert.ok(!(genBuf[0] === 0xFF && genBuf[1] === 0xFE), 'crypto-gen.js must not have UTF-16 BOM');
  assert.ok(!genBuf.includes(0x00), 'crypto-gen.js must not contain null bytes');

  console.log('\nAll CryptoPasswordGenerator tests passed successfully! (14/14 test suites)');
}

runTests();
