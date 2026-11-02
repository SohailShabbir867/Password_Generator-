/**
 * High-Speed Wordlist Generator Web Worker Module
 *
 * Runs inside a dedicated Web Worker thread in browsers (and worker_threads in Node.js)
 * to generate massive wordlists without blocking the main UI thread.
 *
 * Uses high-performance Xoshiro128+ pseudo-random number generation seeded via Web Crypto,
 * cooperative non-blocking batch execution with setTimeout, and streaming memory management.
 *
 * Zero external dependencies. Browser & Node.js compatible.
 */

(function () {
  'use strict';

  /**
   * Character sets and constants
   */
  const DIGITS = '0123456789';
  const NUM_SYM_SPECIALS = Object.freeze(['@', '$', '#']);
  const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const ALPHA_NUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  // Standard printable ASCII characters (codes 33 through 126, 94 chars)
  let ALL_CHARS = '';
  for (let c = 33; c <= 126; c++) {
    ALL_CHARS += String.fromCharCode(c);
  }

  const VALID_MODES = ['num_sym', 'numeric', 'alpha_num', 'all_chars', 'custom'];

  const CHARSETS = Object.freeze({
    DIGITS,
    NUM_SYM_SPECIALS,
    LOWERCASE,
    UPPERCASE,
    ALPHA_NUM,
    ALL_CHARS,
    VALID_MODES
  });

  /**
   * Resolve Web Crypto implementation if available
   * @returns {Crypto|null}
   */
  function getCryptoObj() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
      return globalThis.crypto;
    }
    if (typeof self !== 'undefined' && self.crypto && typeof self.crypto.getRandomValues === 'function') {
      return self.crypto;
    }
    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
      return window.crypto;
    }
    if (typeof require !== 'undefined') {
      try {
        const nodeCrypto = require('crypto');
        if (nodeCrypto.webcrypto && typeof nodeCrypto.webcrypto.getRandomValues === 'function') {
          return nodeCrypto.webcrypto;
        }
      } catch (_) {}
    }
    return null;
  }

  /**
   * High-resolution timestamp helper (returns milliseconds)
   * @returns {number}
   */
  function getNow() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }

  /**
   * Calculate UTF-8 byte length for a string
   * Correctly accounts for ASCII (1 byte), Latin/Greek/Cyrillic (2 bytes),
   * CJK (3 bytes), and UTF-16 surrogate pairs (4 bytes).
   *
   * @param {string} str
   * @returns {number}
   */
  function getUtf8ByteLength(str) {
    if (!str || typeof str !== 'string') return 0;
    let bytes = 0;
    const len = str.length;
    for (let i = 0; i < len; i++) {
      const code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes += 1;
      } else if (code < 0x800) {
        bytes += 2;
      } else if (code >= 0xd800 && code <= 0xdbff) {
        // High surrogate; low surrogate follows
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    }
    return bytes;
  }

  /**
   * High-speed Xoshiro128+ 32-bit PRNG
   * Period of 2^128 - 1, passes BigCrush statistical tests.
   * Produces hundreds of millions of uniform random integers per second.
   */
  class FastPRNG {
    /**
     * @param {Array<number>} [seed] Optional 4-element 32-bit unsigned integer array
     */
    constructor(seed) {
      this.s0 = 0;
      this.s1 = 0;
      this.s2 = 0;
      this.s3 = 0;
      this.seed(seed);
    }

    /**
     * Seed PRNG using Web Crypto if available, falling back to Math.random/Date.now
     * @param {Array<number>} [customSeed]
     */
    seed(customSeed) {
      if (Array.isArray(customSeed) && customSeed.length >= 4) {
        this.s0 = customSeed[0] >>> 0;
        this.s1 = customSeed[1] >>> 0;
        this.s2 = customSeed[2] >>> 0;
        this.s3 = customSeed[3] >>> 0;
      } else {
        let s = [0, 0, 0, 0];
        const cryptoObj = getCryptoObj();
        if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
          const buf = new Uint32Array(4);
          cryptoObj.getRandomValues(buf);
          s[0] = buf[0];
          s[1] = buf[1];
          s[2] = buf[2];
          s[3] = buf[3];
        }
        // Fallback seed if crypto unavailable or returned all zeros
        if ((s[0] | s[1] | s[2] | s[3]) === 0) {
          const now = Date.now();
          s[0] = (now ^ 0x12345678) >>> 0;
          s[1] = ((now * 1812433253) ^ 0x87654321) >>> 0;
          s[2] = (Math.floor(Math.random() * 0xffffffff) ^ 0xdeadbeef) >>> 0;
          s[3] = (Math.floor(Math.random() * 0xffffffff) ^ 0xcafebabe) >>> 0;
        }
        this.s0 = s[0] >>> 0;
        this.s1 = s[1] >>> 0;
        this.s2 = s[2] >>> 0;
        this.s3 = s[3] >>> 0;
      }

      // State must not be all zeros
      if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) {
        this.s0 = 1;
      }
    }

    /**
     * Generate next unsigned 32-bit pseudo-random integer
     * @returns {number} Unsigned 32-bit integer [0, 2^32 - 1]
     */
    nextUint32() {
      const result = (this.s0 + this.s3) >>> 0;
      const t = (this.s1 << 9) >>> 0;

      this.s2 ^= this.s0;
      this.s3 ^= this.s1;
      this.s1 ^= this.s2;
      this.s0 ^= this.s3;

      this.s2 ^= t;
      this.s3 = ((this.s3 << 11) | (this.s3 >>> 21)) >>> 0;

      return result;
    }

    /**
     * Generate random integer in range [0, max - 1]
     * Fast modulo sampling with negligible bias (< 30 / 2^32)
     *
     * @param {number} max Upper bound (exclusive)
     * @returns {number}
     */
    nextInt(max) {
      if (max <= 1) return 0;
      return (this.nextUint32() >>> 0) % max;
    }
  }

  /**
   * WordlistWorkerEngine
   *
   * Core generator engine managing generation states, cooperative batch scheduling,
   * metrics tracking, memory streaming, and message passing.
   */
  class WordlistWorkerEngine {
    /**
     * @param {Object} [options={}] Configuration options
     * @param {Function} [options.postMessage] Custom postMessage callback
     */
    constructor(options = {}) {
      this.postMessage = typeof options.postMessage === 'function'
        ? options.postMessage
        : (msg) => {
            if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
              self.postMessage(msg);
            }
          };

      this.prng = new FastPRNG();
      this.state = 'IDLE'; // 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED'
      this.timerId = null;

      // Active generation parameters
      this.total = 0;
      this.minLength = 8;
      this.maxLength = 10;
      this.mode = 'num_sym';
      this.customChars = '';
      this.customCharsArr = [];
      this.batchSize = 5000;
      this.chunkFormat = 'array'; // 'array' | 'string'
      this.emitBatch = true;
      this.isAsciiMode = true;

      // Live metrics & accumulator
      this.generated = 0;
      this.totalBytes = 0;
      this.preview = [];
      this.startTime = 0;
      this.totalPausedTime = 0;
      this.pauseStartTime = 0;
    }

    /**
     * Handle incoming message from worker or host
     * @param {Object} message Message object with type and optional payload
     */
    handleMessage(message) {
      if (!message || typeof message !== 'object') return;
      const { type, payload } = message;

      try {
        switch (type) {
          case 'START':
            this.start(payload || {});
            break;
          case 'PAUSE':
            this.pause();
            break;
          case 'RESUME':
            this.resume();
            break;
          case 'STOP':
            this.stop();
            break;
          default:
            // Unknown message type
            break;
        }
      } catch (err) {
        this.postMessage({
          type: 'ERROR',
          payload: { message: err.message || String(err) }
        });
      }
    }

    /**
     * Start a new wordlist generation job
     * @param {Object} payload Job configuration
     */
    start(payload = {}) {
      // Clear any pending tick
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }

      // Validate & normalize count
      const count = Math.max(1, Math.floor(Number(payload.count) || 10000));

      // Validate & normalize lengths
      let minLen = Math.max(1, Math.floor(Number(payload.minLength) || 8));
      let maxLen = Math.max(1, Math.floor(Number(payload.maxLength) || 10));
      if (minLen > maxLen) {
        const tmp = minLen;
        minLen = maxLen;
        maxLen = tmp;
      }

      // Validate mode
      const mode = payload.mode ? String(payload.mode).toLowerCase() : 'num_sym';
      if (!VALID_MODES.includes(mode)) {
        const err = new Error(`Invalid generation mode: "${mode}". Valid modes: ${VALID_MODES.join(', ')}`);
        this.state = 'IDLE';
        throw err;
      }

      // Validate custom character set if custom mode
      let customArr = [];
      let isAscii = true;
      if (mode === 'custom') {
        const rawCustom = payload.customChars !== undefined ? String(payload.customChars) : '';
        if (rawCustom.length === 0) {
          const err = new Error('customChars cannot be empty when mode is "custom"');
          this.state = 'IDLE';
        throw err;
        }
        // Deduplicate and support Unicode surrogate pairs
        customArr = Array.from(new Set(Array.from(rawCustom)));
        if (customArr.length === 0) {
          const err = new Error('customChars contains no valid characters');
          this.state = 'IDLE';
        throw err;
        }
        isAscii = customArr.every(ch => ch.charCodeAt(0) <= 127);
      }

      // Configure engine
      this.total = count;
      this.minLength = minLen;
      this.maxLength = maxLen;
      this.mode = mode;
      this.customChars = payload.customChars || '';
      this.customCharsArr = customArr;
      this.batchSize = Math.max(1, Math.floor(Number(payload.batchSize) || 5000));
      this.chunkFormat = payload.chunkFormat === 'string' ? 'string' : 'array';
      this.emitBatch = payload.emitBatch !== false;
      this.isAsciiMode = (mode !== 'custom') || isAscii;

      // Reset statistics
      this.generated = 0;
      this.totalBytes = 0;
      this.preview = [];
      this.startTime = getNow();
      this.totalPausedTime = 0;
      this.pauseStartTime = 0;
      this.state = 'RUNNING';

      // Schedule first batch
      this._scheduleBatch();
    }

    /**
     * Pause ongoing generation
     */
    pause() {
      if (this.state !== 'RUNNING') return;
      this.state = 'PAUSED';
      this.pauseStartTime = getNow();
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
    }

    /**
     * Resume paused generation
     */
    resume() {
      if (this.state !== 'PAUSED') return;
      this.state = 'RUNNING';
      if (this.pauseStartTime > 0) {
        this.totalPausedTime += (getNow() - this.pauseStartTime);
        this.pauseStartTime = 0;
      }
      this._scheduleBatch();
    }

    /**
     * Stop generation immediately
     */
    stop() {
      if (this.state !== 'RUNNING' && this.state !== 'PAUSED') return;
      if (this.state === 'PAUSED' && this.pauseStartTime > 0) {
        this.totalPausedTime += (getNow() - this.pauseStartTime);
        this.pauseStartTime = 0;
      }
      this.state = 'STOPPED';
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }

      const elapsedMs = Math.max(0, getNow() - this.startTime - this.totalPausedTime);
      const elapsed = Number((elapsedMs / 1000).toFixed(2));

      this.postMessage({
        type: 'STOPPED',
        payload: {
          generated: this.generated,
          total: this.total,
          elapsed: elapsed
        }
      });
    }

    /**
     * Schedule next cooperative batch via setTimeout(..., 0)
     * @private
     */
    _scheduleBatch() {
      if (this.state !== 'RUNNING') return;
      this.timerId = setTimeout(() => {
        this._processBatch();
      }, 0);
    }

    /**
     * Process a single batch chunk
     * @private
     */
    _processBatch() {
      if (this.state !== 'RUNNING') return;

      const remaining = this.total - this.generated;
      const currentBatchSize = Math.min(this.batchSize, remaining);

      const chunk = new Array(currentBatchSize);
      let batchBytes = 0;

      for (let i = 0; i < currentBatchSize; i++) {
        const pw = this.generatePassword();
        chunk[i] = pw;
        const pwBytes = this.isAsciiMode ? (pw.length + 1) : (getUtf8ByteLength(pw) + 1);
        batchBytes += pwBytes;
      }

      this.generated += currentBatchSize;
      this.totalBytes += batchBytes;

      // Retain preview of initial generated passwords (up to 50 items)
      if (this.preview.length < 50) {
        const needed = 50 - this.preview.length;
        for (let i = 0; i < Math.min(needed, chunk.length); i++) {
          this.preview.push(chunk[i]);
        }
      }

      const elapsedMs = Math.max(0, getNow() - this.startTime - this.totalPausedTime);
      const elapsedSec = Math.max(0.0001, elapsedMs / 1000);
      const speed = Math.round(this.generated / elapsedSec);
      const percent = Math.min(100, Number(((this.generated / this.total) * 100).toFixed(1)));
      const sample = chunk.length > 0 ? chunk[chunk.length - 1] : '';

      // Emit BATCH message if requested
      if (this.emitBatch) {
        const chunkData = (this.chunkFormat === 'string') ? chunk.join('\n') : chunk;
        this.postMessage({
          type: 'BATCH',
          payload: {
            chunk: chunkData,
            generated: this.generated,
            total: this.total
          }
        });
      }

      // Emit PROGRESS message
      this.postMessage({
        type: 'PROGRESS',
        payload: {
          generated: this.generated,
          total: this.total,
          percent: percent,
          speed: speed,
          elapsed: Number(elapsedSec.toFixed(2)),
          sizeBytes: this.totalBytes,
          sample: sample
        }
      });

      // Check if complete
      if (this.generated >= this.total) {
        this.state = 'COMPLETED';
        this.postMessage({
          type: 'COMPLETE',
          payload: {
            total: this.generated,
            elapsed: Number(elapsedSec.toFixed(3)),
            sizeBytes: this.totalBytes,
            preview: this.preview
          }
        });
        return;
      }

      // Cooperative loop: schedule next slice
      if (this.state === 'RUNNING') {
        this._scheduleBatch();
      }
    }

    /**
     * Generate a single password based on engine config or optional overrides
     *
     * @param {Object} [opts] Optional overrides for mode, minLength, maxLength, customChars
     * @returns {string} Generated password
     */
    generatePassword(opts) {
      let mode = this.mode;
      let minLen = this.minLength;
      let maxLen = this.maxLength;
      let customArr = this.customCharsArr;

      if (opts && typeof opts === 'object') {
        if (opts.mode) mode = String(opts.mode).toLowerCase();
        if (opts.minLength !== undefined) minLen = Math.max(1, Math.floor(Number(opts.minLength) || 8));
        if (opts.maxLength !== undefined) maxLen = Math.max(1, Math.floor(Number(opts.maxLength) || 10));
        if (minLen > maxLen) {
          const t = minLen; minLen = maxLen; maxLen = t;
        }
        if (opts.customChars !== undefined) {
          customArr = Array.from(new Set(Array.from(String(opts.customChars))));
        }
      }

      switch (mode) {
        case 'num_sym':
          return this._generateNumSym(minLen, maxLen);
        case 'numeric':
          return this._generateNumeric(minLen, maxLen);
        case 'alpha_num':
          return this._generateAlphaNum(minLen, maxLen);
        case 'all_chars':
          return this._generateAllChars(minLen, maxLen);
        case 'custom':
          if (!customArr || customArr.length === 0) {
            throw new Error('customChars cannot be empty for custom mode');
          }
          return this._generateCustom(minLen, maxLen, customArr);
        default:
          return this._generateNumSym(minLen, maxLen);
      }
    }

    /**
     * Mode: 'num_sym'
     * Legacy wordlist mode: minLength-maxLength (default 8-10) digits
     * with at least one '@', '$', or '#' guaranteed.
     * @private
     */
    _generateNumSym(minLen, maxLen) {
      const len = minLen === maxLen ? minLen : minLen + this.prng.nextInt(maxLen - minLen + 1);
      // Ensure at least 1 special char; pick 1-2 if length permits
      const numSpecial = len <= 1 ? 1 : (this.prng.nextInt(2) + 1);
      const numDigits = len - numSpecial;

      const chars = new Array(len);
      let idx = 0;
      for (let i = 0; i < numSpecial; i++) {
        chars[idx++] = NUM_SYM_SPECIALS[this.prng.nextInt(3)];
      }
      for (let i = 0; i < numDigits; i++) {
        chars[idx++] = DIGITS[this.prng.nextInt(10)];
      }

      // Fast Fisher-Yates shuffle
      for (let i = len - 1; i > 0; i--) {
        const j = this.prng.nextInt(i + 1);
        const tmp = chars[i];
        chars[i] = chars[j];
        chars[j] = tmp;
      }

      return chars.join('');
    }

    /**
     * Mode: 'numeric'
     * Pure numeric pins / serials: digits 0-9
     * @private
     */
    _generateNumeric(minLen, maxLen) {
      const len = minLen === maxLen ? minLen : minLen + this.prng.nextInt(maxLen - minLen + 1);
      let str = '';
      for (let i = 0; i < len; i++) {
        str += DIGITS[this.prng.nextInt(10)];
      }
      return str;
    }

    /**
     * Mode: 'alpha_num'
     * Alphanumeric: a-z, A-Z, 0-9
     * @private
     */
    _generateAlphaNum(minLen, maxLen) {
      const len = minLen === maxLen ? minLen : minLen + this.prng.nextInt(maxLen - minLen + 1);
      let str = '';
      for (let i = 0; i < len; i++) {
        str += ALPHA_NUM[this.prng.nextInt(62)];
      }
      return str;
    }

    /**
     * Mode: 'all_chars'
     * Full ASCII printables: lowercase, uppercase, digits, symbols (codes 33-126)
     * @private
     */
    _generateAllChars(minLen, maxLen) {
      const len = minLen === maxLen ? minLen : minLen + this.prng.nextInt(maxLen - minLen + 1);
      let str = '';
      for (let i = 0; i < len; i++) {
        str += ALL_CHARS[this.prng.nextInt(94)];
      }
      return str;
    }

    /**
     * Mode: 'custom'
     * User-defined custom character set with Unicode surrogate pair safety
     * @private
     */
    _generateCustom(minLen, maxLen, customArr) {
      const len = minLen === maxLen ? minLen : minLen + this.prng.nextInt(maxLen - minLen + 1);
      const charCount = customArr.length;
      let str = '';
      for (let i = 0; i < len; i++) {
        str += customArr[this.prng.nextInt(charCount)];
      }
      return str;
    }

    /**
     * Static helper for standalone one-off generation
     * @param {Object} [options]
     * @returns {string}
     */
    static generatePassword(options = {}) {
      const engine = new WordlistWorkerEngine();
      return engine.generatePassword(options);
    }
  }

  // 1. Browser Web Worker auto-bootstrap
  if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined') {
    const engine = new WordlistWorkerEngine({
      postMessage: (msg) => self.postMessage(msg)
    });
    self.onmessage = function (e) {
      if (e && e.data) {
        engine.handleMessage(e.data);
      }
    };
  }

  // 2. Node.js worker_threads auto-bootstrap (for integration tests in Node.js)
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const wt = require('worker_threads');
      if (!wt.isMainThread && wt.parentPort) {
        const engine = new WordlistWorkerEngine({
          postMessage: (msg) => wt.parentPort.postMessage(msg)
        });
        wt.parentPort.on('message', (data) => {
          engine.handleMessage(data);
        });
      }
    } catch (_) {}
  }

  // 3. Module & Global exports
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WordlistWorkerEngine;
    WordlistWorkerEngine.WordlistWorkerEngine = WordlistWorkerEngine;
    WordlistWorkerEngine.FastPRNG = FastPRNG;
    WordlistWorkerEngine.CHARSETS = CHARSETS;
    WordlistWorkerEngine.getUtf8ByteLength = getUtf8ByteLength;
  }
  if (typeof window !== 'undefined') {
    window.WordlistWorkerEngine = WordlistWorkerEngine;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.WordlistWorkerEngine = WordlistWorkerEngine;
  }
})();
