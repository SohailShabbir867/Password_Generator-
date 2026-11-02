/**
 * Tests for Task 5: Password Strength & Entropy Analyzer Module
 * Pure Node.js assert tests (zero npm dependencies).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

function runTests() {
  console.log('Running StrengthMeter test suite...\n');

  const modulePath = path.resolve(__dirname, '../js/strength-meter.js');
  assert.ok(fs.existsSync(modulePath), 'js/strength-meter.js must exist');

  const StrengthMeter = require(modulePath);
  assert.ok(StrengthMeter, 'StrengthMeter must be exported');
  assert.strictEqual(typeof StrengthMeter.analyze, 'function', 'StrengthMeter.analyze must be a function');

  // 1. Return structure verification
  console.log('Test 1: Interface and Return Structure');
  const sampleRes = StrengthMeter.analyze('SamplePassword123!');
  assert.ok(typeof sampleRes === 'object' && sampleRes !== null, 'analyze() must return an object');
  assert.ok(typeof sampleRes.score === 'number', 'score must be a number');
  assert.ok(typeof sampleRes.bits === 'number', 'bits must be a number');
  assert.ok(typeof sampleRes.label === 'string', 'label must be a string');
  assert.ok(typeof sampleRes.color === 'string', 'color must be a string');
  assert.ok(typeof sampleRes.crackTime === 'object' && sampleRes.crackTime !== null, 'crackTime must be an object');
  assert.ok(typeof sampleRes.crackTime.online === 'string', 'crackTime.online must be a string');
  assert.ok(typeof sampleRes.crackTime.offline === 'string', 'crackTime.offline must be a string');
  assert.ok(typeof sampleRes.crackTime.cluster === 'string', 'crackTime.cluster must be a string');
  assert.ok(typeof sampleRes.checks === 'object' && sampleRes.checks !== null, 'checks must be an object');
  assert.strictEqual(typeof sampleRes.checks.minLength, 'boolean', 'checks.minLength must be boolean');
  assert.strictEqual(typeof sampleRes.checks.lowercase, 'boolean', 'checks.lowercase must be boolean');
  assert.strictEqual(typeof sampleRes.checks.uppercase, 'boolean', 'checks.uppercase must be boolean');
  assert.strictEqual(typeof sampleRes.checks.numbers, 'boolean', 'checks.numbers must be boolean');
  assert.strictEqual(typeof sampleRes.checks.symbols, 'boolean', 'checks.symbols must be boolean');
  assert.ok(Array.isArray(sampleRes.feedback), 'feedback must be an Array');

  // 2. Safe handling of empty, null, undefined, non-string inputs
  console.log('Test 2: Safe Handling of Empty and Malformed Inputs');
  const emptyInputs = ['', null, undefined, 0, false, {}];
  for (const input of emptyInputs) {
    const res = StrengthMeter.analyze(input);
    assert.strictEqual(res.score, 0, `Input ${JSON.stringify(input)} must have score 0`);
    assert.strictEqual(res.bits, 0, `Input ${JSON.stringify(input)} must have 0 bits`);
    assert.strictEqual(res.label, 'Very Weak', `Input ${JSON.stringify(input)} must be labeled Very Weak`);
    assert.strictEqual(res.color, '#ef4444', `Input ${JSON.stringify(input)} color must be #ef4444`);
    assert.strictEqual(res.crackTime.online, 'Instant');
    assert.strictEqual(res.crackTime.offline, 'Instant');
    assert.strictEqual(res.crackTime.cluster, 'Instant');
    assert.strictEqual(res.checks.minLength, false);
    assert.strictEqual(res.checks.lowercase, false);
    assert.strictEqual(res.checks.uppercase, false);
    assert.strictEqual(res.checks.numbers, false);
    assert.strictEqual(res.checks.symbols, false);
    assert.ok(res.feedback.length > 0, 'Must provide feedback for empty inputs');
  }

  // 3. Criteria checks verification
  console.log('Test 3: Criteria Checks Evaluation');
  // Length check (minLength >= 12)
  assert.strictEqual(StrengthMeter.analyze('12345678901').checks.minLength, false, '11 chars is under minLength');
  assert.strictEqual(StrengthMeter.analyze('123456789012').checks.minLength, true, '12 chars satisfies minLength');
  assert.strictEqual(StrengthMeter.analyze('123456789012345').checks.minLength, true, '15 chars satisfies minLength');

  // Lowercase
  assert.strictEqual(StrengthMeter.analyze('ABCDEFG123!').checks.lowercase, false);
  assert.strictEqual(StrengthMeter.analyze('ABCDeFG123!').checks.lowercase, true);

  // Uppercase
  assert.strictEqual(StrengthMeter.analyze('abcdefg123!').checks.uppercase, false);
  assert.strictEqual(StrengthMeter.analyze('abcDefg123!').checks.uppercase, true);

  // Numbers
  assert.strictEqual(StrengthMeter.analyze('abcdefgHIJK!').checks.numbers, false);
  assert.strictEqual(StrengthMeter.analyze('abcdefgHIJK9!').checks.numbers, true);

  // Symbols
  assert.strictEqual(StrengthMeter.analyze('abcdefgHIJK99').checks.symbols, false);
  assert.strictEqual(StrengthMeter.analyze('abcdefgHIJK99$').checks.symbols, true);
  assert.strictEqual(StrengthMeter.analyze('hello world').checks.symbols, true, 'Spaces are considered symbols/special chars');

  // 4. Shannon Pool Entropy Calculation & Tiers
  console.log('Test 4: Shannon Pool Entropy & Tier Mapping');
  // Tiers:
  // 0: Very Weak (< 28 bits) -> #ef4444
  // 1: Weak (28–45 bits) -> #f59e0b
  // 2: Fair (46–59 bits) -> #eab308
  // 3: Strong (60–85 bits) -> #00f0ff
  // 4: Very Strong (86+ bits) -> #10b981

  const tierSamples = [
    { password: 'abc', expectedScore: 0, expectedLabel: 'Very Weak', expectedColor: '#ef4444' },
    { password: 'x8!k', expectedScore: 0, expectedLabel: 'Very Weak', expectedColor: '#ef4444' }, // 4 chars ~26 bits
    { password: 'aB3#cD4$', expectedScore: 2, expectedLabel: 'Fair', expectedColor: '#eab308' }, // 8 chars * ~6.57 = ~52 bits
    { password: 'mK8$zP1!vQ4@', expectedScore: 3, expectedLabel: 'Strong', expectedColor: '#00f0ff' }, // 12 chars * ~6.57 = ~78 bits
    { password: 'mK8$zP1!vQ4@xL9#bN2&', expectedScore: 4, expectedLabel: 'Very Strong', expectedColor: '#10b981' } // 20 chars = >130 bits
  ];

  for (const item of tierSamples) {
    const res = StrengthMeter.analyze(item.password);
    assert.strictEqual(res.score, item.expectedScore, `Password "${item.password}" score mismatch: got ${res.score}, expected ${item.expectedScore} (${res.bits} bits)`);
    assert.strictEqual(res.label, item.expectedLabel, `Password "${item.password}" label mismatch: got ${res.label}, expected ${item.expectedLabel}`);
    assert.strictEqual(res.color, item.expectedColor, `Password "${item.password}" color mismatch: got ${res.color}, expected ${item.expectedColor}`);
  }

  // 5. Pattern Penalties: Repetition, Sequences, Dictionary Matches
  console.log('Test 5: Pattern Penalties (Repeats, Sequences, Dictionary Words)');
  
  // Repeated characters penalty
  const diverse12 = 'dvkpxbmzqjtw'; // 12 unique lowercase chars: 12 * log2(26) = 56.4 bits
  const repeated12 = 'aaaaaaaaaaaa'; // 12 repeated 'a': effectively 0 entropy
  const diverseRes = StrengthMeter.analyze(diverse12);
  const repeatedRes = StrengthMeter.analyze(repeated12);
  assert.ok(diverseRes.bits > repeatedRes.bits + 30, 'Diverse password must have much higher bits than repeated string');
  assert.strictEqual(repeatedRes.score, 0, 'All repeated characters must score 0 (Very Weak)');

  // Sequential characters penalty
  const seqPassword = 'abcdefgh1234';
  const nonSeqPassword = 'fkqzmvbt8315';
  const seqRes = StrengthMeter.analyze(seqPassword);
  const nonSeqRes = StrengthMeter.analyze(nonSeqPassword);
  assert.ok(nonSeqRes.bits > seqRes.bits, 'Sequential runs (abcdefgh, 1234) must receive entropy penalties');

  // Common dictionary patterns
  const dictPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome', 'letmein'];
  for (const dp of dictPasswords) {
    const dRes = StrengthMeter.analyze(dp);
    assert.strictEqual(dRes.score, 0, `Dictionary password "${dp}" must score 0`);
    assert.strictEqual(dRes.label, 'Very Weak', `Dictionary password "${dp}" must be labeled Very Weak`);
    assert.ok(dRes.bits < 28, `Dictionary password "${dp}" bits must be < 28 (got ${dRes.bits})`);
  }

  // 6. Canonical Spec Passwords Testing
  console.log('Test 6: Canonical Spec Passwords Testing');
  
  // "123456" -> Very Weak, score 0, color #ef4444
  const res123456 = StrengthMeter.analyze('123456');
  assert.strictEqual(res123456.score, 0);
  assert.strictEqual(res123456.label, 'Very Weak');
  assert.strictEqual(res123456.color, '#ef4444');
  assert.strictEqual(res123456.checks.minLength, false);
  assert.strictEqual(res123456.checks.numbers, true);
  assert.strictEqual(res123456.checks.lowercase, false);
  assert.strictEqual(res123456.crackTime.online, 'Instant');
  assert.strictEqual(res123456.crackTime.offline, 'Instant');
  assert.strictEqual(res123456.crackTime.cluster, 'Instant');

  // "password" -> Very Weak, score 0, color #ef4444
  const resPassword = StrengthMeter.analyze('password');
  assert.strictEqual(resPassword.score, 0);
  assert.strictEqual(resPassword.label, 'Very Weak');
  assert.strictEqual(resPassword.color, '#ef4444');
  assert.strictEqual(resPassword.checks.minLength, false);
  assert.strictEqual(resPassword.checks.lowercase, true);
  assert.strictEqual(resPassword.crackTime.online, 'Instant');
  assert.strictEqual(resPassword.crackTime.offline, 'Instant');
  assert.strictEqual(resPassword.crackTime.cluster, 'Instant');

  // "correcthorsebatterystaple" -> Strong or Very Strong passphrase
  const resPassphrase = StrengthMeter.analyze('correcthorsebatterystaple');
  assert.strictEqual(resPassphrase.checks.minLength, true, '25 chars satisfies minLength');
  assert.strictEqual(resPassphrase.checks.lowercase, true);
  assert.ok(resPassphrase.score >= 3, `correcthorsebatterystaple should score at least 3 (got ${resPassphrase.score})`);
  assert.ok(resPassphrase.bits >= 60, `correcthorsebatterystaple should have >= 60 bits (got ${resPassphrase.bits})`);
  assert.ok(resPassphrase.crackTime.online !== 'Instant', 'Online attack should not be instant for long passphrase');

  // "K9#m$P2!vL7@wQ4&" -> Very Strong, 16 chars with 4 char sets
  const resComplex = StrengthMeter.analyze('K9#m$P2!vL7@wQ4&');
  assert.strictEqual(resComplex.score, 4, 'Complex 16-char password must score 4');
  assert.strictEqual(resComplex.label, 'Very Strong');
  assert.strictEqual(resComplex.color, '#10b981');
  assert.ok(resComplex.bits >= 86, `Complex 16-char password must have >= 86 bits (got ${resComplex.bits})`);
  assert.strictEqual(resComplex.checks.minLength, true);
  assert.strictEqual(resComplex.checks.lowercase, true);
  assert.strictEqual(resComplex.checks.uppercase, true);
  assert.strictEqual(resComplex.checks.numbers, true);
  assert.strictEqual(resComplex.checks.symbols, true);
  assert.strictEqual(resComplex.crackTime.cluster, 'Centuries');

  // 7. Threat Crack-Time Estimations & Human Formatting
  console.log('Test 7: Crack-Time Formatting and Threat Models');
  // Threat profiles:
  // Online: 1,000/s
  // Fast offline GPU: 10^10/s
  // Cluster: 10^12/s

  // Medium password (e.g. 40-50 bits)
  const medRes = StrengthMeter.analyze('Pass1234!');
  // Should have valid formatted strings for all crack times
  assert.ok(typeof medRes.crackTime.online === 'string');
  assert.ok(typeof medRes.crackTime.offline === 'string');
  assert.ok(typeof medRes.crackTime.cluster === 'string');
  
  // Human readable time format checks: Instant, X seconds, X minutes, X hours, X days, X months, X years, Centuries
  const validTimeUnits = /Instant|\d+\s+(second|minute|hour|day|month|year)s?|Centuries/;
  assert.ok(validTimeUnits.test(medRes.crackTime.online), `crackTime.online "${medRes.crackTime.online}" must match human time format`);
  assert.ok(validTimeUnits.test(medRes.crackTime.offline), `crackTime.offline "${medRes.crackTime.offline}" must match human time format`);
  assert.ok(validTimeUnits.test(medRes.crackTime.cluster), `crackTime.cluster "${medRes.crackTime.cluster}" must match human time format`);

  // Verify formatCrackTime helper if exposed
  if (typeof StrengthMeter.formatCrackTime === 'function') {
    assert.strictEqual(StrengthMeter.formatCrackTime(0), 'Instant');
    assert.strictEqual(StrengthMeter.formatCrackTime(0.5), 'Instant');
    assert.strictEqual(StrengthMeter.formatCrackTime(3), '3 seconds');
    assert.strictEqual(StrengthMeter.formatCrackTime(1), '1 second');
    assert.strictEqual(StrengthMeter.formatCrackTime(300), '5 minutes');
    assert.strictEqual(StrengthMeter.formatCrackTime(7200), '2 hours');
    assert.strictEqual(StrengthMeter.formatCrackTime(86400 * 5), '5 days');
    assert.strictEqual(StrengthMeter.formatCrackTime(86400 * 60), '2 months');
    assert.strictEqual(StrengthMeter.formatCrackTime(31536000 * 2), '2 years');
    assert.strictEqual(StrengthMeter.formatCrackTime(31536000 * 500), 'Centuries');
    assert.strictEqual(StrengthMeter.formatCrackTime(Infinity), 'Centuries');
  }

  // 8. Feedback Advice
  console.log('Test 8: Feedback Advice Evaluation');
  const weakNoUpper = StrengthMeter.analyze('lowercase123!');
  assert.ok(weakNoUpper.feedback.some(f => /uppercase/i.test(f)), 'Must advise adding uppercase');

  const weakNoLower = StrengthMeter.analyze('UPPERCASE123!');
  assert.ok(weakNoLower.feedback.some(f => /lowercase/i.test(f)), 'Must advise adding lowercase');

  const weakNoNum = StrengthMeter.analyze('AlphabeticalOnly!');
  assert.ok(weakNoNum.feedback.some(f => /number/i.test(f)), 'Must advise adding numbers');

  const weakNoSym = StrengthMeter.analyze('Alphabetical123');
  assert.ok(weakNoSym.feedback.some(f => /symbol|special/i.test(f)), 'Must advise adding symbols');

  const weakShort = StrengthMeter.analyze('Ab1!');
  assert.ok(weakShort.feedback.some(f => /12|length|longer/i.test(f)), 'Must advise increasing length');

  const weakSeq = StrengthMeter.analyze('abcdef123456');
  assert.ok(weakSeq.feedback.some(f => /sequence|pattern/i.test(f)), 'Must advise against sequences');

  const strongRes = StrengthMeter.analyze('K9#m$P2!vL7@wQ4&');
  assert.ok(strongRes.feedback.length >= 0, 'Strong password returns valid feedback array');

  // 9. Stress & Large Input Handling
  console.log('Test 9: Stress and Large Input Handling');
  const startTime = Date.now();
  const largePassword = 'A1!b'.repeat(2500); // 10,000 characters
  const largeRes = StrengthMeter.analyze(largePassword);
  const elapsed = Date.now() - startTime;
  assert.ok(elapsed < 200, `Large password analysis must be fast (took ${elapsed}ms)`);
  assert.strictEqual(largeRes.checks.minLength, true);
  assert.strictEqual(largeRes.score, 4);

  // 10. UTF-8 Cleanliness
  console.log('Test 10: UTF-8 Cleanliness');
  const fileBuf = fs.readFileSync(modulePath);
  assert.ok(!(fileBuf[0] === 0xFF && fileBuf[1] === 0xFE), 'strength-meter.js must not have UTF-16 BOM');
  assert.ok(!fileBuf.includes(0x00), 'strength-meter.js must not contain null bytes');

  console.log('\nAll StrengthMeter tests passed successfully! (10/10 test suites)');
}

runTests();
