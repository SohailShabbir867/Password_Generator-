/**
 * Test Suite for Task 3: Targeted Wordlist & Pattern Generator Module
 * Pure Node.js assert tests (zero npm dependencies).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

function runTests() {
  console.log('Running TargetedGenerator test suite...\n');

  const modulePath = path.resolve(__dirname, '../js/targeted-gen.js');
  assert.ok(fs.existsSync(modulePath), 'js/targeted-gen.js must exist');

  const TargetedGenerator = require(modulePath);
  assert.ok(TargetedGenerator, 'TargetedGenerator must be exported');
  assert.strictEqual(typeof TargetedGenerator.generate, 'function', 'TargetedGenerator.generate must be a function');

  // Test 1: LEET_MAP specification verification
  console.log('Test 1: LEET_MAP specifications');
  assert.ok(TargetedGenerator.DEFAULT_LEET_MAP, 'DEFAULT_LEET_MAP must exist');
  const leetMap = TargetedGenerator.DEFAULT_LEET_MAP;
  assert.ok(leetMap.a.includes('@') && leetMap.a.includes('4'), 'Leet map "a" must include @ and 4');
  assert.ok(leetMap.e.includes('3'), 'Leet map "e" must include 3');
  assert.ok(leetMap.i.includes('1') && leetMap.i.includes('!'), 'Leet map "i" must include 1 and !');
  assert.ok(leetMap.o.includes('0'), 'Leet map "o" must include 0');
  assert.ok(leetMap.s.includes('$') && leetMap.s.includes('5'), 'Leet map "s" must include $ and 5');
  assert.ok(leetMap.t.includes('7'), 'Leet map "t" must include 7');

  // Test 2: Default generation & empty inputs
  console.log('Test 2: Empty and default inputs');
  const emptyRes = TargetedGenerator.generate();
  assert.ok(Array.isArray(emptyRes), 'generate() should return an array');
  assert.strictEqual(emptyRes.length, 0, 'empty generate() should return 0 items');

  const emptyRes2 = TargetedGenerator.generate({ words: [], numbers: [], symbols: [] });
  assert.ok(Array.isArray(emptyRes2));
  assert.strictEqual(emptyRes2.length, 0);

  // String input normalization (comma/space/newline separated)
  const normRes = TargetedGenerator.generate({
    words: 'admin, root\nuser',
    casing: 'lower'
  });
  assert.ok(normRes.includes('admin'), 'Should parse comma-separated words');
  assert.ok(normRes.includes('root'), 'Should parse space-separated words');
  assert.ok(normRes.includes('user'), 'Should parse newline-separated words');

  // Test 3: Casing transformations
  console.log('Test 3: Casing options (lower, upper, title, alternate, inverted)');
  const lowerRes = TargetedGenerator.generate({ words: ['PassWord'], casing: 'lower' });
  assert.ok(lowerRes.includes('password'), 'lower casing should include lowercase');
  assert.ok(!lowerRes.includes('PASSWORD'), 'lower casing should not include uppercase');

  const upperRes = TargetedGenerator.generate({ words: ['password'], casing: 'upper' });
  assert.ok(upperRes.includes('PASSWORD'), 'upper casing should include uppercase');

  const titleRes = TargetedGenerator.generate({ words: ['password'], casing: 'title' });
  assert.ok(titleRes.includes('Password'), 'title casing should include Titlecase');

  const altRes = TargetedGenerator.generate({ words: ['password'], casing: 'alternate' });
  const hasAlt = altRes.some(p => p === 'pAsSwOrD' || p === 'PaSsWoRd');
  assert.ok(hasAlt, 'alternate casing should generate alternating characters');

  const invRes = TargetedGenerator.generate({ words: ['Password'], casing: 'inverted' });
  assert.ok(invRes.includes('pASSWORD'), 'inverted casing of Password should be pASSWORD');

  const allCasingRes = TargetedGenerator.generate({ words: ['target'], casing: 'all' });
  assert.ok(allCasingRes.includes('target'), 'all casing includes lower');
  assert.ok(allCasingRes.includes('TARGET'), 'all casing includes upper');
  assert.ok(allCasingRes.includes('Target'), 'all casing includes title');

  // Helper function test: applyCasing
  if (typeof TargetedGenerator.applyCasing === 'function') {
    const cased = TargetedGenerator.applyCasing('hello', 'all');
    assert.ok(cased.includes('hello'));
    assert.ok(cased.includes('HELLO'));
    assert.ok(cased.includes('Hello'));
  }

  // Test 4: Leetspeak transformations
  console.log('Test 4: Leetspeak transformations');
  const leetRes = TargetedGenerator.generate({
    words: ['hacker'],
    casing: 'lower',
    leetTransforms: true
  });
  // a -> @ or 4, e -> 3
  assert.ok(leetRes.includes('h@ck3r') || leetRes.includes('h4ck3r'), 'Should produce full leet h@ck3r or h4ck3r');
  assert.ok(leetRes.includes('h@cker') || leetRes.includes('h4cker'), 'Should produce partial leet a->@/4');
  assert.ok(leetRes.includes('hack3r'), 'Should produce partial leet e->3');

  // Testing i -> 1 / !, s -> $ / 5, t -> 7, o -> 0
  const leetRes2 = TargetedGenerator.generate({
    words: ['testing'],
    casing: 'lower',
    leetTransforms: true
  });
  // t->7, e->3, s->$/5, i->1/!
  assert.ok(leetRes2.some(p => p.includes('7')), 'Should substitute t with 7');
  assert.ok(leetRes2.some(p => p.includes('3')), 'Should substitute e with 3');
  assert.ok(leetRes2.some(p => p.includes('$') || p.includes('5')), 'Should substitute s with $ or 5');
  assert.ok(leetRes2.some(p => p.includes('1') || p.includes('!')), 'Should substitute i with 1 or !');

  const leetRes3 = TargetedGenerator.generate({
    words: ['root'],
    casing: 'lower',
    leetTransforms: true
  });
  assert.ok(leetRes3.includes('r00t'), 'Should substitute o with 0');

  // Verify leet disabled doesn't produce leet strings
  const noLeetRes = TargetedGenerator.generate({
    words: ['admin'],
    casing: 'lower',
    leetTransforms: false
  });
  assert.ok(!noLeetRes.includes('@dmin'), 'Disabled leet should not replace a with @');
  assert.ok(!noLeetRes.includes('4dmin'), 'Disabled leet should not replace a with 4');

  // Test 5: Reversal
  console.log('Test 5: String reversal');
  const revRes = TargetedGenerator.generate({
    words: ['secret'],
    casing: 'lower',
    includeReversed: true
  });
  assert.ok(revRes.includes('secret'), 'Must include original');
  assert.ok(revRes.includes('terces'), 'Must include reversed word');

  // Test 6: Permutations with numbers and symbols
  console.log('Test 6: Word + Number + Symbol permutations');
  const permRes = TargetedGenerator.generate({
    words: ['admin'],
    numbers: ['123'],
    symbols: ['!'],
    delimiters: [''],
    casing: 'lower',
    affixes: 'both'
  });
  assert.ok(permRes.includes('admin'), 'Includes base word');
  assert.ok(permRes.includes('admin123'), 'Includes word + number suffix');
  assert.ok(permRes.includes('123admin'), 'Includes number + word prefix');
  assert.ok(permRes.includes('admin!'), 'Includes word + symbol suffix');
  assert.ok(permRes.includes('!admin'), 'Includes symbol + word prefix');
  assert.ok(permRes.includes('admin123!'), 'Includes word + number + symbol');
  assert.ok(permRes.includes('!admin123'), 'Includes symbol + word + number');

  // Test 7: Delimiters
  console.log('Test 7: Delimiters');
  const delimRes = TargetedGenerator.generate({
    words: ['admin'],
    numbers: ['2024'],
    delimiters: ['_', '.', '-'],
    casing: 'lower'
  });
  assert.ok(delimRes.includes('admin_2024'), 'Includes delimiter _');
  assert.ok(delimRes.includes('admin.2024'), 'Includes delimiter .');
  assert.ok(delimRes.includes('admin-2024'), 'Includes delimiter -');

  // Test 8: Compound word combinations
  console.log('Test 8: Compound word combinations');
  const compRes = TargetedGenerator.generate({
    words: ['super', 'man'],
    casing: 'lower',
    includeCompounds: true
  });
  assert.ok(compRes.includes('superman'), 'Includes superman');
  assert.ok(compRes.includes('mansuper'), 'Includes mansuper');

  // Test 9: Affix control options
  console.log('Test 9: Affix control (suffix, prefix, none, both)');
  const suffixOnly = TargetedGenerator.generate({
    words: ['user'],
    numbers: ['99'],
    affixes: 'suffix',
    delimiters: ['']
  });
  assert.ok(suffixOnly.includes('user99'), 'Suffix only includes user99');
  assert.ok(!suffixOnly.includes('99user'), 'Suffix only does not include 99user');

  const prefixOnly = TargetedGenerator.generate({
    words: ['user'],
    numbers: ['99'],
    affixes: 'prefix',
    delimiters: ['']
  });
  assert.ok(prefixOnly.includes('99user'), 'Prefix only includes 99user');
  assert.ok(!prefixOnly.includes('user99'), 'Prefix only does not include user99');

  const noneAffix = TargetedGenerator.generate({
    words: ['user'],
    numbers: ['99'],
    symbols: ['#'],
    affixes: 'none'
  });
  assert.ok(!noneAffix.includes('user99'), 'None affix does not attach numbers');
  assert.ok(!noneAffix.includes('user#'), 'None affix does not attach symbols');

  // Verify affixes: 'suffix' with BOTH numbers and symbols has zero prefix contamination
  const suffixCompound = TargetedGenerator.generate({
    words: ['pass'],
    numbers: ['123'],
    symbols: ['!'],
    delimiters: [''],
    casing: 'lower',
    affixes: 'suffix'
  });
  assert.ok(suffixCompound.includes('pass123!'), 'Suffix mode should include pass123!');
  assert.ok(suffixCompound.includes('pass!123'), 'Suffix mode should include pass!123');
  for (const pw of suffixCompound) {
    assert.ok(!pw.startsWith('!') && !pw.startsWith('123'),
      `In suffix-only mode, password "${pw}" must not start with a prefix symbol or number`);
  }

  // Verify affixes: 'prefix' with BOTH numbers and symbols has zero suffix contamination
  const prefixCompound = TargetedGenerator.generate({
    words: ['pass'],
    numbers: ['123'],
    symbols: ['!'],
    delimiters: [''],
    casing: 'lower',
    affixes: 'prefix'
  });
  assert.ok(prefixCompound.includes('!123pass'), 'Prefix mode should include !123pass');
  assert.ok(prefixCompound.includes('123!pass'), 'Prefix mode should include 123!pass');
  for (const pw of prefixCompound) {
    assert.ok(!pw.endsWith('!') && !pw.endsWith('123'),
      `In prefix-only mode, password "${pw}" must not end with a suffix symbol or number`);
  }

  // Verify affixes: 'both' DOES generate sandwich combinations
  const bothCompound = TargetedGenerator.generate({
    words: ['pass'],
    numbers: ['123'],
    symbols: ['!'],
    delimiters: [''],
    casing: 'lower',
    affixes: 'both'
  });
  assert.ok(bothCompound.includes('!pass123'), 'Both mode includes sandwich !pass123');
  assert.ok(bothCompound.includes('123pass!'), 'Both mode includes sandwich 123pass!');

  // Test 10: Length filtering (minLength, maxLength)
  console.log('Test 10: Min and Max length filtering');
  const lenRes = TargetedGenerator.generate({
    words: ['a', 'ab', 'admin', 'administrator'],
    minLength: 4,
    maxLength: 6,
    casing: 'lower'
  });
  assert.ok(!lenRes.includes('a'), 'Words shorter than minLength must be excluded');
  assert.ok(!lenRes.includes('ab'), 'Words shorter than minLength must be excluded');
  assert.ok(lenRes.includes('admin'), 'admin (5 chars) is between 4 and 6');
  assert.ok(!lenRes.includes('administrator'), 'Words longer than maxLength must be excluded');
  for (const pw of lenRes) {
    assert.ok(pw.length >= 4 && pw.length <= 6, `Password "${pw}" length ${pw.length} must be in [4, 6]`);
  }

  // Test 11: Deduplication
  console.log('Test 11: Deduplication');
  const dupRes = TargetedGenerator.generate({
    words: ['admin', 'admin', 'admin'],
    numbers: ['1', '1'],
    casing: 'lower'
  });
  const uniqueCount = new Set(dupRes).size;
  assert.strictEqual(dupRes.length, uniqueCount, 'All generated items must be unique (no duplicates)');

  // Test 12: Limit parameter
  console.log('Test 12: Limit constraint');
  const limitRes = TargetedGenerator.generate({
    words: ['alpha', 'beta', 'gamma'],
    numbers: ['1', '2', '3', '4', '5'],
    symbols: ['!', '@', '#'],
    limit: 25
  });
  assert.strictEqual(limitRes.length, 25, 'Result length must match limit');

  // Test 13: Output formats (Array, Set, Object)
  console.log('Test 13: Output formats');
  const setRes = TargetedGenerator.generate({
    words: ['test'],
    asSet: true
  });
  assert.ok(setRes instanceof Set, 'asSet: true must return a Set');

  const objRes = TargetedGenerator.generate({
    words: ['test'],
    returnObject: true
  });
  assert.ok(typeof objRes === 'object' && !Array.isArray(objRes), 'returnObject: true must return an Object');
  assert.ok(Array.isArray(objRes.passwords), 'objRes.passwords must be an Array');
  assert.strictEqual(typeof objRes.total, 'number', 'objRes.total must be a number');
  assert.strictEqual(objRes.total, objRes.passwords.length);

  // Default array has .total attached as well
  const arrRes = TargetedGenerator.generate({ words: ['test'] });
  assert.ok(Array.isArray(arrRes));
  assert.strictEqual(arrRes.total, arrRes.length);

  // Test 14: Combinatorial safety and performance
  console.log('Test 14: Combinatorial safety with heavy word');
  const heavyStart = Date.now();
  const heavyRes = TargetedGenerator.generate({
    words: ['assassination'], // 4 s's, 3 a's, 2 i's, 1 t, 1 o = 11 leet characters!
    leetTransforms: true,
    limit: 500
  });
  const elapsed = Date.now() - heavyStart;
  assert.ok(heavyRes.length > 0, 'Heavy generation should succeed');
  assert.ok(elapsed < 2000, `Heavy word leet generation took ${elapsed}ms, should be < 2000ms`);

  console.log('\nAll TargetedGenerator tests passed successfully!');
}

runTests();

