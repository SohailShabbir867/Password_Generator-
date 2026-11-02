/**
 * Password Strength & Entropy Analyzer Module
 *
 * Evaluates password strength using Shannon-based pool entropy (E = L * log2(R)),
 * applies pattern deductions for repetitions, sequential runs, and dictionary matches,
 * calculates brute-force crack-time estimates across threat profiles, and produces
 * real-time criteria checks and actionable security feedback.
 *
 * Pure JavaScript, zero external dependencies. Dual environment (Browser + Node.js).
 */

(function () {
  'use strict';

  /**
   * Character pool sizes by class
   */
  const POOL_SIZES = {
    lowercase: 26,
    uppercase: 26,
    numbers: 10,
    symbols: 33
  };

  /**
   * Common sequential patterns to detect
   */
  const SEQUENCES = Object.freeze([
    '01234567890',
    '09876543210',
    'abcdefghijklmnopqrstuvwxyz',
    'zyxwvutsrqponmlkjihgfedcba',
    'qwertyuiop',
    'poiuytrewq',
    'asdfghjkl',
    'lkjhgfdsa',
    'zxcvbnm',
    'mnbvcxz'
  ]);

  /**
   * Common dictionary words and notoriously weak passwords
   */
  const COMMON_DICTIONARY_WORDS = Object.freeze([
    'password', '123456', '12345678', '123456789', '12345', 'qwerty',
    'admin', 'welcome', 'letmein', 'monkey', 'dragon', 'football',
    'iloveyou', 'master', 'access', 'shadow', 'superman', 'trustno1',
    'login', 'root', 'abc123', 'pass123', 'admin123', 'guest',
    'starwars', 'princess', 'solo', 'hello', 'charlie', 'donald',
    'freedom', 'computer', 'secret', 'default', 'test', 'pass',
    'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'p@ssword', 'p@ssw0rd'
  ]);

  const COMMON_DICTIONARY_SET = new Set(COMMON_DICTIONARY_WORDS);

  /**
   * Detect repeated character frequencies and consecutive runs
   *
   * @param {string} str Password string
   * @returns {{ uniqueCount: number, duplicateCount: number, consecutiveRunCount: number, hasRepeats: boolean }}
   */
  function detectRepeats(str) {
    const charCounts = Object.create(null);
    let duplicateCount = 0;

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      charCounts[ch] = (charCounts[ch] || 0) + 1;
      if (charCounts[ch] > 1) {
        duplicateCount++;
      }
    }

    const uniqueCount = Object.keys(charCounts).length;

    // Check consecutive identical runs of 3+ chars (e.g., "aaa", "1111")
    let consecutiveRunCount = 0;
    let currentRun = 1;
    const scanLimit = Math.min(str.length, 1000);

    for (let i = 1; i < scanLimit; i++) {
      if (str[i] === str[i - 1]) {
        currentRun++;
        if (currentRun >= 3) {
          consecutiveRunCount++;
        }
      } else {
        currentRun = 1;
      }
    }

    const hasRepeats = duplicateCount > (str.length * 0.3) || consecutiveRunCount > 0;
    return { uniqueCount, duplicateCount, consecutiveRunCount, hasRepeats };
  }

  /**
   * Detect sequential alphabetical, numerical, or keyboard runs
   *
   * @param {string} str Password string
   * @returns {{ hasSequence: boolean, seqChars: number }}
   */
  function detectSequences(str) {
    const lower = str.toLowerCase();
    const scanLen = Math.min(lower.length, 500);
    let hasSequence = false;
    let seqChars = 0;
    const inSeq = new Uint8Array(scanLen);

    for (const seq of SEQUENCES) {
      const maxL = Math.min(scanLen, seq.length);
      for (let len = 3; len <= maxL; len++) {
        for (let i = 0; i <= scanLen - len; i++) {
          const sub = lower.slice(i, i + len);
          if (seq.includes(sub)) {
            hasSequence = true;
            for (let k = i; k < i + len; k++) {
              inSeq[k] = 1;
            }
          }
        }
      }
    }

    for (let i = 0; i < scanLen; i++) {
      if (inSeq[i] === 1) {
        seqChars++;
      }
    }

    return { hasSequence, seqChars };
  }

  /**
   * Detect common dictionary matches and weak passwords
   *
   * @param {string} str Password string
   * @returns {{ hasDict: boolean, dictPenalty: number }}
   */
  function detectDictionary(str) {
    const lower = str.toLowerCase();

    // Exact match against dictionary
    if (COMMON_DICTIONARY_SET.has(lower)) {
      return { hasDict: true, dictPenalty: 50 };
    }

    // Substring match for common patterns of length >= 4
    let hasDict = false;
    let dictPenalty = 0;
    const checkSlice = lower.length > 300 ? lower.slice(0, 300) : lower;

    for (const word of COMMON_DICTIONARY_WORDS) {
      if (word.length >= 4 && checkSlice.includes(word)) {
        hasDict = true;
        dictPenalty = Math.max(dictPenalty, 25);
        break;
      }
    }

    return { hasDict, dictPenalty };
  }

  /**
   * Format duration in seconds into human-readable string
   * e.g. "Instant", "3 seconds", "5 minutes", "2 years", "Centuries"
   *
   * @param {number} seconds
   * @returns {string}
   */
  function formatCrackTime(seconds) {
    if (seconds === Infinity) {
      return 'Centuries';
    }
    if (typeof seconds !== 'number' || Number.isNaN(seconds) || seconds < 1) {
      return 'Instant';
    }

    const MINUTE = 60;
    const HOUR = 3600;
    const DAY = 86400;
    const MONTH = 30 * DAY;     // 2,592,000 seconds
    const YEAR = 365 * DAY;     // 31,536,000 seconds
    const CENTURY = 100 * YEAR; // 3,153,600,000 seconds

    if (seconds < MINUTE) {
      const s = Math.round(seconds);
      if (s < 1) return 'Instant';
      if (s === 1) return '1 second';
      if (s >= 60) return '1 minute';
      return `${s} seconds`;
    }
    if (seconds < HOUR) {
      const m = Math.round(seconds / MINUTE);
      if (m <= 1) return '1 minute';
      if (m >= 60) return '1 hour';
      return `${m} minutes`;
    }
    if (seconds < DAY) {
      const h = Math.round(seconds / HOUR);
      if (h <= 1) return '1 hour';
      if (h >= 24) return '1 day';
      return `${h} hours`;
    }
    if (seconds < MONTH) {
      const d = Math.round(seconds / DAY);
      if (d <= 1) return '1 day';
      if (d >= 30) return '1 month';
      return `${d} days`;
    }
    if (seconds < YEAR) {
      const mo = Math.round(seconds / MONTH);
      if (mo <= 1) return '1 month';
      if (mo >= 12) return '1 year';
      return `${mo} months`;
    }
    if (seconds < CENTURY) {
      const y = Math.round(seconds / YEAR);
      if (y <= 1) return '1 year';
      if (y >= 100) return 'Centuries';
      return `${y} years`;
    }
    return 'Centuries';
  }

  /**
   * Calculate Shannon-based pool entropy with pattern deductions
   * E = L * log2(R) minus penalties
   *
   * @param {string} password
   * @returns {number} Non-negative entropy in bits (rounded integer)
   */
  function calculateEntropy(password) {
    const str = typeof password === 'string' ? password : '';
    if (!str || str.length === 0) {
      return 0;
    }

    const hasLower = /[a-z]/.test(str);
    const hasUpper = /[A-Z]/.test(str);
    const hasNumber = /[0-9]/.test(str);
    const hasSymbol = /[^a-zA-Z0-9]/.test(str);

    let poolSize = 0;
    if (hasLower) poolSize += POOL_SIZES.lowercase;
    if (hasUpper) poolSize += POOL_SIZES.uppercase;
    if (hasNumber) poolSize += POOL_SIZES.numbers;
    if (hasSymbol) poolSize += POOL_SIZES.symbols;

    if (poolSize === 0) {
      return 0;
    }

    const length = str.length;
    const baseEntropy = length * (Math.log(poolSize) / Math.LN2);

    const repeatInfo = detectRepeats(str);
    const seqInfo = detectSequences(str);
    const dictInfo = detectDictionary(str);

    // If password consists of only 1 single unique character, entropy is minimal
    if (repeatInfo.uniqueCount === 1 && length > 1) {
      return 0;
    }

    // Calculate deductions
    let deductions = 0;

    // Repeated characters deduction
    if (repeatInfo.duplicateCount > 0) {
      deductions += repeatInfo.duplicateCount * 1.5;
    }
    if (repeatInfo.consecutiveRunCount > 0) {
      deductions += repeatInfo.consecutiveRunCount * 4;
    }

    // Sequential characters deduction
    if (seqInfo.hasSequence) {
      deductions += seqInfo.seqChars * 1.5;
      if (seqInfo.seqChars >= Math.min(length, 26)) {
        deductions += 10;
      }
    }

    // Dictionary pattern deduction
    if (dictInfo.hasDict) {
      deductions += dictInfo.dictPenalty;
    }

    const effectiveEntropy = Math.max(0, baseEntropy - deductions);
    return Math.round(effectiveEntropy);
  }

  /**
   * Estimate brute-force crack times across threat models
   * - Online attack: ~1,000 guesses/sec
   * - Fast offline GPU hashing: ~10^10 guesses/sec
   * - Massive GPU/ASIC cluster: ~10^12 guesses/sec
   *
   * @param {number} bits
   * @returns {{ online: string, offline: string, cluster: string }}
   */
  function estimateCrackTime(bits) {
    if (!Number.isFinite(bits) || bits <= 0) {
      return {
        online: 'Instant',
        offline: 'Instant',
        cluster: 'Instant'
      };
    }

    const RATE_ONLINE = 1000;              // 10^3
    const RATE_OFFLINE = 10000000000;      // 10^10
    const RATE_CLUSTER = 1000000000000;    // 10^12

    const combinations = Math.pow(2, bits);

    return {
      online: formatCrackTime(combinations / RATE_ONLINE),
      offline: formatCrackTime(combinations / RATE_OFFLINE),
      cluster: formatCrackTime(combinations / RATE_CLUSTER)
    };
  }

  /**
   * Generate actionable feedback recommendations
   *
   * @param {string} str
   * @param {Object} checks
   * @param {Object} seqInfo
   * @param {Object} repeatInfo
   * @param {Object} dictInfo
   * @param {number} score
   * @returns {Array<string>}
   */
  function generateFeedback(str, checks, seqInfo, repeatInfo, dictInfo, score) {
    const feedback = [];

    if (!str || str.length === 0) {
      feedback.push('Enter a password to evaluate.');
      return feedback;
    }

    if (!checks.minLength) {
      feedback.push('Use at least 12 characters for stronger security.');
    }
    if (!checks.lowercase) {
      feedback.push('Include lowercase letters (a-z).');
    }
    if (!checks.uppercase) {
      feedback.push('Include uppercase letters (A-Z).');
    }
    if (!checks.numbers) {
      feedback.push('Include numbers (0-9).');
    }
    if (!checks.symbols) {
      feedback.push('Include special symbols or punctuation (!@#$).');
    }
    if (seqInfo.hasSequence) {
      feedback.push('Avoid sequential characters or patterns (e.g., 1234, abcd).');
    }
    if (repeatInfo.hasRepeats) {
      feedback.push('Avoid repeated identical characters.');
    }
    if (dictInfo.hasDict) {
      feedback.push('Avoid common dictionary words and common passwords.');
    }

    if (score >= 3 && feedback.length === 0) {
      feedback.push('Password meets recommended strength and complexity criteria.');
    }

    return feedback;
  }

  /**
   * Analyze password strength, entropy, crack times, criteria checks, and feedback
   *
   * @param {string} password Password to analyze
   * @returns {{
   *   score: number,
   *   bits: number,
   *   label: string,
   *   color: string,
   *   crackTime: { online: string, offline: string, cluster: string },
   *   checks: { minLength: boolean, lowercase: boolean, uppercase: boolean, numbers: boolean, symbols: boolean },
   *   feedback: Array<string>
   * }}
   */
  function analyze(password) {
    const str = typeof password === 'string' ? password : '';

    const checks = {
      minLength: str.length >= 12,
      lowercase: /[a-z]/.test(str),
      uppercase: /[A-Z]/.test(str),
      numbers: /[0-9]/.test(str),
      symbols: /[^a-zA-Z0-9]/.test(str)
    };

    if (!str || str.length === 0) {
      return {
        score: 0,
        bits: 0,
        label: 'Very Weak',
        color: '#ef4444',
        crackTime: {
          online: 'Instant',
          offline: 'Instant',
          cluster: 'Instant'
        },
        checks,
        feedback: ['Enter a password to evaluate.']
      };
    }

    const repeatInfo = detectRepeats(str);
    const seqInfo = detectSequences(str);
    const dictInfo = detectDictionary(str);

    const bits = calculateEntropy(str);

    // Entropy Tiers & Scoring:
    // 0: Very Weak (< 28 bits) -> #ef4444
    // 1: Weak (28–45 bits) -> #f59e0b
    // 2: Fair (46–59 bits) -> #eab308
    // 3: Strong (60–85 bits) -> #00f0ff (cyan)
    // 4: Very Strong (86+ bits) -> #10b981 (green)
    let score = 0;
    let label = 'Very Weak';
    let color = '#ef4444';

    if (bits >= 86) {
      score = 4;
      label = 'Very Strong';
      color = '#10b981';
    } else if (bits >= 60) {
      score = 3;
      label = 'Strong';
      color = '#00f0ff';
    } else if (bits >= 46) {
      score = 2;
      label = 'Fair';
      color = '#eab308';
    } else if (bits >= 28) {
      score = 1;
      label = 'Weak';
      color = '#f59e0b';
    } else {
      score = 0;
      label = 'Very Weak';
      color = '#ef4444';
    }

    const crackTime = estimateCrackTime(bits);
    const feedback = generateFeedback(str, checks, seqInfo, repeatInfo, dictInfo, score);

    return {
      score,
      bits,
      label,
      color,
      crackTime,
      checks,
      feedback
    };
  }

  const StrengthMeter = {
    POOL_SIZES,
    SEQUENCES,
    COMMON_DICTIONARY_WORDS,
    calculateEntropy,
    estimateCrackTime,
    formatCrackTime,
    analyze
  };

  // Dual environment export: Browser window / globalThis and Node.js module.exports
  if (typeof window !== 'undefined') {
    window.StrengthMeter = StrengthMeter;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.StrengthMeter = StrengthMeter;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StrengthMeter;
  }
})();
