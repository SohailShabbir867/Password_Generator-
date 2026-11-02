/**
 * Cryptographically Secure Random Password Generator Module
 *
 * Uses Web Crypto API (crypto.getRandomValues) for CSPRNG generation
 * with unbiased rejection sampling and guaranteed character set fulfillment.
 * Zero external dependencies. Browser & Node.js compatible.
 */

(function () {
  'use strict';

  /**
   * Standard character sets
   */
  const CHARSETS = Object.freeze({
    UPPERCASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    LOWERCASE: 'abcdefghijklmnopqrstuvwxyz',
    NUMBERS: '0123456789',
    SYMBOLS: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  });

  /**
   * Ambiguous lookalike characters (1, l, I, 0, O, o)
   */
  const AMBIGUOUS = '1lI0Oo';
  const AMBIGUOUS_SET = new Set(AMBIGUOUS.split(''));

  /**
   * Resolve Web Crypto API implementation
   * @returns {Crypto}
   */
  function getCryptoObj() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
      return globalThis.crypto;
    }
    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
      return window.crypto;
    }
    if (typeof self !== 'undefined' && self.crypto && typeof self.crypto.getRandomValues === 'function') {
      return self.crypto;
    }
    if (typeof require !== 'undefined') {
      try {
        const nodeCrypto = require('crypto');
        if (nodeCrypto.webcrypto && typeof nodeCrypto.webcrypto.getRandomValues === 'function') {
          return nodeCrypto.webcrypto;
        }
      } catch (_) {}
    }
    throw new Error('Web Crypto API (crypto.getRandomValues) is not available');
  }

  /**
   * Generate an unbiased random integer in [0, maxExclusive)
   * Uses 32-bit rejection sampling to eliminate modulo bias.
   *
   * @param {number} maxExclusive Range upper bound (exclusive)
   * @param {Crypto} cryptoObj Crypto implementation
   * @returns {number} Integer in [0, maxExclusive)
   */
  function getRandomInt(maxExclusive, cryptoObj) {
    if (maxExclusive <= 1) return 0;

    const range = maxExclusive;
    // 2^32 = 4294967296
    const maxUint32 = 0x100000000;
    const limit = maxUint32 - (maxUint32 % range);
    const buffer = new Uint32Array(1);

    while (true) {
      cryptoObj.getRandomValues(buffer);
      const val = buffer[0];
      if (val < limit) {
        return val % range;
      }
    }
  }

  /**
   * Unbiased Fisher-Yates array shuffle using CSPRNG
   *
   * @param {Array} array Elements to shuffle (in-place)
   * @param {Crypto} cryptoObj Crypto implementation
   * @returns {Array} Shuffled array
   */
  function shuffleArray(array, cryptoObj) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = getRandomInt(i + 1, cryptoObj);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  /**
   * Filter out ambiguous characters from a string
   *
   * @param {string} str Input string
   * @returns {string} Filtered string
   */
  function removeAmbiguous(str) {
    return str.split('').filter(ch => !AMBIGUOUS_SET.has(ch)).join('');
  }

  /**
   * Generate cryptographically secure random passwords
   *
   * @param {Object} options Configuration options
   * @param {number} [options.length=16] Length of each password (>= 1)
   * @param {boolean} [options.uppercase=true] Include uppercase letters
   * @param {boolean} [options.lowercase=true] Include lowercase letters
   * @param {boolean} [options.numbers=true] Include numeric digits
   * @param {boolean} [options.symbols=true] Include special symbols
   * @param {boolean} [options.excludeAmbiguous=false] Exclude lookalikes (1, l, I, 0, O, o)
   * @param {string} [options.customChars=''] Additional custom characters to include
   * @param {number} [options.quantity=1] Number of passwords to generate (>= 1)
   * @returns {Array<string>} Array of generated passwords
   */
  function generate(options = {}) {
    const {
      length = 16,
      uppercase = true,
      lowercase = true,
      numbers = true,
      symbols = true,
      excludeAmbiguous = false,
      customChars = '',
      quantity = 1
    } = options;

    // Validate length
    if (typeof length !== 'number' || isNaN(length) || length < 1 || !Number.isInteger(length)) {
      throw new Error('Password length must be an integer greater than or equal to 1');
    }

    // Validate quantity
    if (typeof quantity !== 'number' || isNaN(quantity) || quantity < 1 || !Number.isInteger(quantity)) {
      throw new Error('Quantity must be an integer greater than or equal to 1');
    }

    // Process character sets
    let upper = CHARSETS.UPPERCASE;
    let lower = CHARSETS.LOWERCASE;
    let nums = CHARSETS.NUMBERS;
    let syms = CHARSETS.SYMBOLS;
    let custom = typeof customChars === 'string' ? customChars : '';

    if (excludeAmbiguous) {
      upper = removeAmbiguous(upper);
      lower = removeAmbiguous(lower);
      nums = removeAmbiguous(nums);
      syms = removeAmbiguous(syms);
      custom = removeAmbiguous(custom);
    }

    const activeSets = [];
    if (uppercase && upper.length > 0) activeSets.push(upper);
    if (lowercase && lower.length > 0) activeSets.push(lower);
    if (numbers && nums.length > 0) activeSets.push(nums);
    if (symbols && syms.length > 0) activeSets.push(syms);

    // If no standard set was selected, but custom characters are provided
    if (activeSets.length === 0 && custom.length > 0) {
      activeSets.push(custom);
    }

    if (!uppercase && !lowercase && !numbers && !symbols && customChars.length === 0) {
      throw new Error('At least one character set or custom character must be selected');
    }

    // Combine pool of characters
    const combinedPoolChars = [];
    for (const setStr of activeSets) {
      for (const ch of setStr) {
        combinedPoolChars.push(ch);
      }
    }
    if (custom.length > 0) {
      for (const ch of custom) {
        combinedPoolChars.push(ch);
      }
    }

    // Deduplicate pool for uniform distribution
    const uniquePool = Array.from(new Set(combinedPoolChars));

    if (uniquePool.length === 0) {
      throw new Error('Character pool is empty after applying filters');
    }

    const cryptoObj = getCryptoObj();
    const passwords = [];

    for (let q = 0; q < quantity; q++) {
      const chars = [];

      // Guaranteed minimum set representation
      if (length >= activeSets.length) {
        // Guarantee at least one character from each active set
        for (const setStr of activeSets) {
          const idx = getRandomInt(setStr.length, cryptoObj);
          chars.push(setStr[idx]);
        }
        // Fill remaining positions from combined pool
        const remaining = length - chars.length;
        for (let i = 0; i < remaining; i++) {
          const idx = getRandomInt(uniquePool.length, cryptoObj);
          chars.push(uniquePool[idx]);
        }
      } else {
        // When length is less than number of active sets, pick `length` distinct sets randomly
        const chosenSets = shuffleArray([...activeSets], cryptoObj).slice(0, length);
        for (let i = 0; i < length; i++) {
          const setStr = chosenSets[i];
          const idx = getRandomInt(setStr.length, cryptoObj);
          chars.push(setStr[idx]);
        }
      }

      // Shuffle using CSPRNG Fisher-Yates so set positions are not predictable
      shuffleArray(chars, cryptoObj);
      passwords.push(chars.join(''));
    }

    return passwords;
  }

  /**
   * Helper to generate a single password string
   *
   * @param {Object} options Configuration options
   * @returns {string} Single generated password
   */
  function generateOne(options = {}) {
    return generate({ ...options, quantity: 1 })[0];
  }

  const CryptoPasswordGenerator = {
    CHARSETS,
    AMBIGUOUS,
    generate,
    generateOne,
    getRandomInt,
    shuffleArray
  };

  // UMD / CommonJS / Browser global export
  if (typeof window !== 'undefined') {
    window.CryptoPasswordGenerator = CryptoPasswordGenerator;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.CryptoPasswordGenerator = CryptoPasswordGenerator;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoPasswordGenerator;
  }
})();
