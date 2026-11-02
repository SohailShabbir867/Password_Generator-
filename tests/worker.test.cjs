/**
 * Tests for Task 6: High-Speed Web Worker Module
 * Pure Node.js assert tests (zero npm dependencies).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('Running WordlistWorkerEngine test suite...\n');

  const modulePath = path.resolve(__dirname, '../js/wordlist-worker.js');
  assert.ok(fs.existsSync(modulePath), 'js/wordlist-worker.js must exist');

  const WordlistWorkerEngine = require(modulePath);
  assert.ok(WordlistWorkerEngine, 'WordlistWorkerEngine must be exported');
  assert.strictEqual(typeof WordlistWorkerEngine, 'function', 'WordlistWorkerEngine must be a constructor');
  assert.ok(WordlistWorkerEngine.FastPRNG, 'WordlistWorkerEngine.FastPRNG must be exported');
  assert.ok(WordlistWorkerEngine.CHARSETS, 'WordlistWorkerEngine.CHARSETS must be exported');
  assert.strictEqual(typeof WordlistWorkerEngine.generatePassword, 'function', 'WordlistWorkerEngine.generatePassword must be a static function');
  assert.strictEqual(typeof WordlistWorkerEngine.getUtf8ByteLength, 'function', 'WordlistWorkerEngine.getUtf8ByteLength must be exported');

  // =========================================================================
  // Test 1: FastPRNG implementation & statistical sanity
  // =========================================================================
  console.log('Test 1: FastPRNG randomness & bounds');
  const prng = new WordlistWorkerEngine.FastPRNG();
  for (let i = 0; i < 1000; i++) {
    const val = prng.nextUint32();
    assert.ok(val >= 0 && val <= 0xffffffff, 'nextUint32 must be in [0, 0xFFFFFFFF]');
  }

  // Bounds check for nextInt
  for (let i = 0; i < 1000; i++) {
    const r1 = prng.nextInt(1);
    assert.strictEqual(r1, 0, 'nextInt(1) must always be 0');

    const r2 = prng.nextInt(2);
    assert.ok(r2 === 0 || r2 === 1, 'nextInt(2) must be 0 or 1');

    const r10 = prng.nextInt(10);
    assert.ok(r10 >= 0 && r10 < 10, 'nextInt(10) must be in [0, 9]');

    const r94 = prng.nextInt(94);
    assert.ok(r94 >= 0 && r94 < 94, 'nextInt(94) must be in [0, 93]');
  }

  // Uniformity check on nextInt(10) over 20,000 samples
  const counts = new Array(10).fill(0);
  for (let i = 0; i < 20000; i++) {
    counts[prng.nextInt(10)]++;
  }
  for (let d = 0; d < 10; d++) {
    // Expected 2,000 each (10%); tolerance 1,600 - 2,400 (8% - 12%)
    assert.ok(counts[d] >= 1600 && counts[d] <= 2400, `Digit ${d} frequency ${counts[d]} within expected statistical range`);
  }

  // Deterministic custom seed check
  const prngA = new WordlistWorkerEngine.FastPRNG([1234, 5678, 9012, 3456]);
  const prngB = new WordlistWorkerEngine.FastPRNG([1234, 5678, 9012, 3456]);
  for (let i = 0; i < 50; i++) {
    assert.strictEqual(prngA.nextUint32(), prngB.nextUint32(), 'PRNG with identical seeds must produce identical stream');
  }

  // =========================================================================
  // Test 2: Mode 'num_sym' (Legacy Mode)
  // 8-10 characters digits + at least one '@', '$', or '#'
  // =========================================================================
  console.log('Test 2: Mode "num_sym" (Legacy Mode)');
  const engine = new WordlistWorkerEngine();

  const numSymSample = [];
  const symbolPositions = new Set();
  const seenSpecials = new Set();

  for (let i = 0; i < 1000; i++) {
    const pw = engine.generatePassword({ mode: 'num_sym', minLength: 8, maxLength: 10 });
    numSymSample.push(pw);

    // 1. Length within [8, 10]
    assert.ok(pw.length >= 8 && pw.length <= 10, `Length must be 8-10, got ${pw.length}`);

    // 2. Contains ONLY digits and @, $, #
    assert.ok(/^[0-9@$#]+$/.test(pw), `Password ${pw} must only contain digits and [@$#]`);

    // 3. Contains AT LEAST ONE special character [@$#]
    const specials = pw.match(/[@$#]/g);
    assert.ok(specials !== null && specials.length >= 1, `Password ${pw} must contain at least one special char`);

    for (let charIdx = 0; charIdx < pw.length; charIdx++) {
      if ('@$#'.includes(pw[charIdx])) {
        symbolPositions.add(charIdx);
        seenSpecials.add(pw[charIdx]);
      }
    }
  }

  // Shuffling distribution: symbols should not be locked to position 0
  assert.ok(symbolPositions.size >= 7, 'Special characters must appear at diverse index positions (shuffled)');
  assert.strictEqual(seenSpecials.size, 3, 'All 3 special characters (@, $, #) must appear across 1000 items');

  // Fixed length check for num_sym
  for (let i = 0; i < 50; i++) {
    const pw = engine.generatePassword({ mode: 'num_sym', minLength: 9, maxLength: 9 });
    assert.strictEqual(pw.length, 9, 'Fixed length 9 must produce exact length 9');
    assert.ok(/[@$#]/.test(pw), 'Must contain special char');
  }

  // =========================================================================
  // Test 3: Mode 'numeric' (Pure numeric pins / serials)
  // =========================================================================
  console.log('Test 3: Mode "numeric"');
  for (let i = 0; i < 500; i++) {
    const pw = engine.generatePassword({ mode: 'numeric', minLength: 6, maxLength: 6 });
    assert.strictEqual(pw.length, 6, 'Must be length 6');
    assert.ok(/^[0-9]+$/.test(pw), `Must be purely numeric: ${pw}`);
  }

  for (let i = 0; i < 500; i++) {
    const pw = engine.generatePassword({ mode: 'numeric', minLength: 4, maxLength: 8 });
    assert.ok(pw.length >= 4 && pw.length <= 8, `Length must be in [4, 8], got ${pw.length}`);
    assert.ok(/^[0-9]+$/.test(pw), `Must be purely numeric: ${pw}`);
  }

  // =========================================================================
  // Test 4: Mode 'alpha_num' (Alphanumeric: a-z, A-Z, 0-9)
  // =========================================================================
  console.log('Test 4: Mode "alpha_num"');
  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;

  for (let i = 0; i < 500; i++) {
    const pw = engine.generatePassword({ mode: 'alpha_num', minLength: 12, maxLength: 14 });
    assert.ok(pw.length >= 12 && pw.length <= 14, `Length must be in [12, 14], got ${pw.length}`);
    assert.ok(/^[a-zA-Z0-9]+$/.test(pw), `Must be alphanumeric: ${pw}`);

    if (/[a-z]/.test(pw)) hasLower = true;
    if (/[A-Z]/.test(pw)) hasUpper = true;
    if (/[0-9]/.test(pw)) hasDigit = true;
  }
  assert.ok(hasLower && hasUpper && hasDigit, 'Sample must contain lowercase, uppercase, and digits');

  // =========================================================================
  // Test 5: Mode 'all_chars' (Full ASCII printables: codes 33 to 126)
  // =========================================================================
  console.log('Test 5: Mode "all_chars"');
  let hasPrintableSymbols = false;

  for (let i = 0; i < 500; i++) {
    const pw = engine.generatePassword({ mode: 'all_chars', minLength: 16, maxLength: 16 });
    assert.strictEqual(pw.length, 16, `Length must be 16, got ${pw.length}`);

    // Verify all chars are printable ASCII codes [33, 126]
    for (let c = 0; c < pw.length; c++) {
      const code = pw.charCodeAt(c);
      assert.ok(code >= 33 && code <= 126, `Char ${pw[c]} (code ${code}) must be printable ASCII [33, 126]`);
    }

    if (/[^a-zA-Z0-9]/.test(pw)) {
      hasPrintableSymbols = true;
    }
  }
  assert.ok(hasPrintableSymbols, 'all_chars must include ASCII punctuation/symbols');

  // =========================================================================
  // Test 6: Mode 'custom' & Unicode surrogate pair safety
  // =========================================================================
  console.log('Test 6: Mode "custom" & Unicode / Emoji support');
  const customSet = 'ABCxyz123!#';
  for (let i = 0; i < 500; i++) {
    const pw = engine.generatePassword({ mode: 'custom', customChars: customSet, minLength: 10, maxLength: 10 });
    assert.strictEqual(pw.length, 10);
    for (const ch of pw) {
      assert.ok(customSet.includes(ch), `Character "${ch}" must be from custom set`);
    }
  }

  // Unicode surrogate pair support (emojis)
  const emojiSet = '🔑🛡️⚡🔥';
  const emojiChars = Array.from(emojiSet);
  for (let i = 0; i < 200; i++) {
    const pw = engine.generatePassword({ mode: 'custom', customChars: emojiSet, minLength: 5, maxLength: 5 });
    const pwChars = Array.from(pw);
    assert.strictEqual(pwChars.length, 5, 'Length in Unicode characters must be 5');
    for (const ch of pwChars) {
      assert.ok(emojiChars.includes(ch), `Character "${ch}" must be from emoji set`);
    }
  }

  // Error handling: empty customChars
  assert.throws(() => {
    engine.generatePassword({ mode: 'custom', customChars: '' });
  }, /customChars cannot be empty/i);

  // =========================================================================
  // Test 7: Length boundaries & defensive normalization
  // =========================================================================
  console.log('Test 7: Length boundaries & normalization');
  // minLength > maxLength -> auto swapped
  const swapped = engine.generatePassword({ mode: 'numeric', minLength: 12, maxLength: 6 });
  assert.ok(swapped.length >= 6 && swapped.length <= 12, 'Auto swapped minLength and maxLength');

  // Single character password
  const single = engine.generatePassword({ mode: 'numeric', minLength: 1, maxLength: 1 });
  assert.strictEqual(single.length, 1, 'Single character password generated');

  // Long password (128 characters)
  const longPw = engine.generatePassword({ mode: 'alpha_num', minLength: 128, maxLength: 128 });
  assert.strictEqual(longPw.length, 128, '128 character password generated');

  // Static helper method check
  const staticResult = WordlistWorkerEngine.generatePassword({ mode: 'numeric', minLength: 5, maxLength: 5 });
  assert.strictEqual(staticResult.length, 5);

  // =========================================================================
  // Test 8: Cooperative Batch Execution & Streaming Memory (START, PROGRESS, BATCH, COMPLETE)
  // =========================================================================
  console.log('Test 8: Cooperative Async Batch Execution (START, PROGRESS, BATCH, COMPLETE)');

  const messages = [];
  const testEngine = new WordlistWorkerEngine({
    postMessage: (msg) => messages.push(msg)
  });

  const completionPromise = new Promise((resolve, reject) => {
    const origPost = testEngine.postMessage;
    testEngine.postMessage = (msg) => {
      origPost(msg);
      if (msg.type === 'COMPLETE') resolve(msg);
      if (msg.type === 'ERROR') reject(new Error(msg.payload.message));
    };
  });

  testEngine.handleMessage({
    type: 'START',
    payload: {
      count: 12000,
      batchSize: 4000,
      mode: 'numeric',
      minLength: 8,
      maxLength: 8
    }
  });

  const completeMsg = await completionPromise;

  assert.strictEqual(testEngine.state, 'COMPLETED', 'Engine state must be COMPLETED');
  assert.strictEqual(completeMsg.type, 'COMPLETE');
  assert.strictEqual(completeMsg.payload.total, 12000);
  assert.ok(completeMsg.payload.elapsed >= 0);
  assert.strictEqual(completeMsg.payload.sizeBytes, 12000 * 9, '8 chars + newline = 9 bytes * 12000 = 108,000 bytes');
  assert.strictEqual(completeMsg.payload.preview.length, 50, 'Preview must contain 50 sample passwords');

  // Verify BATCH messages
  const batchMsgs = messages.filter((m) => m.type === 'BATCH');
  assert.strictEqual(batchMsgs.length, 3, 'Must have emitted 3 batch chunks for 12,000 total with batchSize 4,000');
  assert.strictEqual(batchMsgs[0].payload.chunk.length, 4000);
  assert.strictEqual(batchMsgs[1].payload.chunk.length, 4000);
  assert.strictEqual(batchMsgs[2].payload.chunk.length, 4000);
  assert.strictEqual(batchMsgs[2].payload.generated, 12000);

  // Verify PROGRESS messages
  const progressMsgs = messages.filter((m) => m.type === 'PROGRESS');
  assert.strictEqual(progressMsgs.length, 3, 'Must have emitted 3 progress updates');
  assert.strictEqual(progressMsgs[0].payload.generated, 4000);
  assert.strictEqual(progressMsgs[0].payload.total, 12000);
  assert.ok(progressMsgs[0].payload.percent >= 33);
  assert.strictEqual(typeof progressMsgs[0].payload.sample, 'string');
  assert.strictEqual(progressMsgs[0].payload.sample.length, 8);

  // Test chunkFormat: 'string'
  const stringBatchMessages = [];
  const stringEngine = new WordlistWorkerEngine({
    postMessage: (msg) => stringBatchMessages.push(msg)
  });

  await new Promise((resolve) => {
    const origPost = stringEngine.postMessage;
    stringEngine.postMessage = (msg) => {
      origPost(msg);
      if (msg.type === 'COMPLETE') resolve();
    };
    stringEngine.start({
      count: 200,
      batchSize: 100,
      chunkFormat: 'string',
      mode: 'numeric',
      minLength: 6,
      maxLength: 6
    });
  });

  const strBatches = stringBatchMessages.filter((m) => m.type === 'BATCH');
  assert.strictEqual(strBatches.length, 2);
  assert.strictEqual(typeof strBatches[0].payload.chunk, 'string', 'Chunk must be a string when chunkFormat is "string"');
  assert.strictEqual(strBatches[0].payload.chunk.split('\n').length, 100, 'Chunk must contain 100 newline-delimited passwords');

  // =========================================================================
  // Test 9: State Machine (PAUSE, RESUME, and STOP)
  // =========================================================================
  console.log('Test 9: State Machine (PAUSE, RESUME, and STOP)');

  // 9A: PAUSE & RESUME
  const pauseTestMessages = [];
  const pauseEngine = new WordlistWorkerEngine({
    postMessage: (msg) => pauseTestMessages.push(msg)
  });

  let pausedAtCount = 0;
  pauseEngine.start({
    count: 30000,
    batchSize: 2000,
    mode: 'numeric',
    minLength: 6,
    maxLength: 6
  });

  // Wait until at least 2 batches run
  while (pauseTestMessages.filter((m) => m.type === 'BATCH').length < 2) {
    await sleep(5);
  }

  // Send PAUSE
  pauseEngine.handleMessage({ type: 'PAUSE' });
  assert.strictEqual(pauseEngine.state, 'PAUSED', 'Engine state must be PAUSED');
  pausedAtCount = pauseEngine.generated;
  assert.ok(pausedAtCount >= 4000, `Paused at count >= 4000 (actual: ${pausedAtCount})`);

  // Wait 40ms to ensure no batches process while paused
  await sleep(40);
  assert.strictEqual(pauseEngine.generated, pausedAtCount, 'Generated count must not change while paused');

  // Resume
  const pauseCompletionPromise = new Promise((resolve) => {
    const origPost = pauseEngine.postMessage;
    pauseEngine.postMessage = (msg) => {
      origPost(msg);
      if (msg.type === 'COMPLETE') resolve(msg);
    };
  });

  pauseEngine.handleMessage({ type: 'RESUME' });
  assert.strictEqual(pauseEngine.state, 'RUNNING', 'Engine state must be RUNNING after RESUME');

  const pauseResumedComplete = await pauseCompletionPromise;
  assert.strictEqual(pauseResumedComplete.payload.total, 30000, 'Resumed job must complete full count');
  assert.strictEqual(pauseEngine.state, 'COMPLETED', 'Engine state must be COMPLETED');

  // 9B: STOP
  const stopTestMessages = [];
  const stopEngine = new WordlistWorkerEngine({
    postMessage: (msg) => stopTestMessages.push(msg)
  });

  stopEngine.start({
    count: 50000,
    batchSize: 2000,
    mode: 'numeric',
    minLength: 6,
    maxLength: 6
  });

  while (stopTestMessages.filter((m) => m.type === 'BATCH').length < 3) {
    await sleep(5);
  }

  stopEngine.handleMessage({ type: 'STOP' });
  assert.strictEqual(stopEngine.state, 'STOPPED', 'Engine state must be STOPPED');

  const stoppedMsgs = stopTestMessages.filter((m) => m.type === 'STOPPED');
  assert.strictEqual(stoppedMsgs.length, 1, 'Must emit exactly one STOPPED message');
  assert.ok(stoppedMsgs[0].payload.generated >= 6000, 'Stopped message payload records generated count');
  assert.strictEqual(stoppedMsgs[0].payload.total, 50000);
  assert.ok(stoppedMsgs[0].payload.elapsed >= 0);

  const stoppedCount = stopEngine.generated;
  await sleep(40);
  assert.strictEqual(stopEngine.generated, stoppedCount, 'No further batches must execute after STOP');

  // =========================================================================
  // Test 10: Real Worker Thread Integration (Node worker_threads)
  // =========================================================================
  console.log('Test 10: Real Worker Thread Integration');
  const threadWorker = new Worker(modulePath);
  const threadMessages = [];

  const threadComplete = await new Promise((resolve, reject) => {
    threadWorker.on('message', (msg) => {
      threadMessages.push(msg);
      if (msg.type === 'COMPLETE') {
        resolve(msg);
      } else if (msg.type === 'ERROR') {
        reject(new Error(msg.payload.message));
      }
    });

    threadWorker.on('error', reject);

    threadWorker.postMessage({
      type: 'START',
      payload: {
        count: 6000,
        batchSize: 2000,
        mode: 'alpha_num',
        minLength: 10,
        maxLength: 10
      }
    });
  });

  await threadWorker.terminate();

  assert.strictEqual(threadComplete.type, 'COMPLETE');
  assert.strictEqual(threadComplete.payload.total, 6000);
  assert.strictEqual(threadComplete.payload.preview.length, 50);
  assert.strictEqual(threadMessages.filter((m) => m.type === 'BATCH').length, 3);
  assert.strictEqual(threadMessages.filter((m) => m.type === 'PROGRESS').length, 3);

  // =========================================================================
  // Test 11: High-Speed Throughput Benchmark
  // Requirement: at least 20,000+ passwords generated in under 500ms
  // =========================================================================
  console.log('Test 11: High-Speed Throughput Benchmark');
  const benchEngine = new WordlistWorkerEngine();
  const BENCH_COUNT = 25000;

  const t0 = Date.now();
  for (let i = 0; i < BENCH_COUNT; i++) {
    benchEngine.generatePassword({ mode: 'num_sym', minLength: 8, maxLength: 10 });
  }
  const elapsedMs = Date.now() - t0;
  const passwordsPerSec = Math.round(BENCH_COUNT / (Math.max(1, elapsedMs) / 1000));

  console.log(`  Benchmark: Generated ${BENCH_COUNT} "num_sym" passwords in ${elapsedMs}ms (${passwordsPerSec.toLocaleString()} pw/sec)`);
  assert.ok(elapsedMs < 500, `Benchmark took ${elapsedMs}ms, which must be under 500ms`);
  assert.ok(passwordsPerSec >= 20000, `Throughput was ${passwordsPerSec}/sec, must exceed 20,000/sec`);

  // =========================================================================
  // Test 12: UTF-8 Cleanliness & Byte Calculation
  // =========================================================================
  console.log('Test 12: UTF-8 Cleanliness & Byte Calculation');
  const testCases = [
    { text: 'hello', expectedBytes: 5 },
    { text: 'café', expectedBytes: 5 }, // é is 2 bytes
    { text: '漢字', expectedBytes: 6 }, // 3 bytes each
    { text: '🔑🛡️⚡', expectedBytes: 14 }, // surrogate pairs
    { text: '12345678@#$', expectedBytes: 11 }
  ];

  for (const tc of testCases) {
    const calc = WordlistWorkerEngine.getUtf8ByteLength(tc.text);
    const nodeBuf = Buffer.byteLength(tc.text, 'utf8');
    assert.strictEqual(calc, tc.expectedBytes, `Custom byte calc for "${tc.text}" must match expected`);
    assert.strictEqual(calc, nodeBuf, `Custom byte calc for "${tc.text}" must match Buffer.byteLength`);
  }

  // Check file encoding is clean UTF-8
  const fileBytes = fs.readFileSync(modulePath);
  // Ensure no UTF-8 BOM (EF BB BF)
  assert.ok(!(fileBytes[0] === 0xef && fileBytes[1] === 0xbb && fileBytes[2] === 0xbf), 'File must not have UTF-8 BOM');
  // Re-encode check
  const fileContent = fs.readFileSync(modulePath, 'utf8');
  assert.ok(fileContent.length > 0, 'File content must be valid UTF-8 string');

  console.log('\nAll WordlistWorkerEngine tests passed successfully! (12/12 test suites)');
}

runTests().catch((err) => {
  console.error('\nTest failed:', err);
  process.exit(1);
});
