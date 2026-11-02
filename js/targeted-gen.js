/**
 * Targeted Wordlist & Pattern Generator Module
 *
 * Combines target intelligence (names, keywords, years, symbols) into permutations
 * used for ethical penetration testing, dictionary auditing, and security analysis.
 * Features leetspeak transformations, casing variations, affixes, delimiters,
 * word reversal, compound combinations, and length filtering.
 *
 * Zero external dependencies. Browser & Node.js compatible.
 */

(function () {
  'use strict';

  /**
   * Standard Leetspeak mapping dictionary
   */
  const DEFAULT_LEET_MAP = Object.freeze({
    a: ['@', '4'],
    e: ['3'],
    i: ['1', '!'],
    o: ['0'],
    s: ['$', '5'],
    t: ['7']
  });

  /**
   * Default intermediate delimiters
   */
  const DEFAULT_DELIMITERS = Object.freeze(['', '_', '.', '-', '@', '#']);

  /**
   * Supported casing modes
   */
  const CASING_MODES = Object.freeze([
    'lower',
    'upper',
    'title',
    'alternate',
    'inverted',
    'all'
  ]);

  /**
   * Invert casing of each character in a string
   * @param {string} str
   * @returns {string}
   */
  function invertCase(str) {
    if (!str) return '';
    let res = '';
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c >= 'a' && c <= 'z') {
        res += c.toUpperCase();
      } else if (c >= 'A' && c <= 'Z') {
        res += c.toLowerCase();
      } else {
        res += c;
      }
    }
    return res;
  }

  /**
   * Titlecase a string (first char upper, rest lower)
   * @param {string} str
   * @returns {string}
   */
  function toTitleCase(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Alternate casing for a string
   * @param {string} str
   * @param {boolean} startUpper
   * @returns {string}
   */
  function toAlternateCase(str, startUpper = false) {
    if (!str) return '';
    let res = '';
    for (let i = 0; i < str.length; i++) {
      const shouldUpper = startUpper ? i % 2 === 0 : i % 2 !== 0;
      res += shouldUpper ? str[i].toUpperCase() : str[i].toLowerCase();
    }
    return res;
  }

  /**
   * Reverse a string
   * @param {string} str
   * @returns {string}
   */
  function reverseString(str) {
    if (!str) return '';
    return str.split('').reverse().join('');
  }

  /**
   * Normalize an input argument into an array of trimmed, non-empty strings
   * @param {string|Array<string|number>} input
   * @param {boolean} [splitChars=false] If true and string has no separators, split by characters
   * @returns {Array<string>}
   */
  function normalizeInput(input, splitChars = false) {
    if (!input && input !== 0) return [];
    if (Array.isArray(input)) {
      const result = [];
      for (const item of input) {
        if (item !== null && item !== undefined) {
          const str = String(item).trim();
          if (str.length > 0) result.push(str);
        }
      }
      return result;
    }
    if (typeof input === 'number') {
      return [String(input)];
    }
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) return [];
      if (/[,\s\r\n]/.test(trimmed)) {
        return trimmed
          .split(/[,\s\r\n]+/)
          .map(s => s.trim())
          .filter(Boolean);
      }
      if (splitChars) {
        return trimmed.split('').filter(s => s.trim().length > 0);
      }
      return [trimmed];
    }
    return [];
  }

  /**
   * Apply casing rules to a word
   * @param {string} word
   * @param {string|Array<string>} casing
   * @returns {Array<string>}
   */
  function applyCasing(word, casing = 'all') {
    if (!word) return [];
    const lower = word.toLowerCase();
    const upper = word.toUpperCase();
    const title = toTitleCase(word);
    const altLower = toAlternateCase(word, false);
    const altUpper = toAlternateCase(word, true);
    const inverted = invertCase(word);
    const invertedTitle = invertCase(title);

    const modes = Array.isArray(casing)
      ? casing.map(c => String(c).toLowerCase())
      : [String(casing || 'all').toLowerCase()];

    const set = new Set();

    for (const mode of modes) {
      switch (mode) {
        case 'lower':
          set.add(lower);
          break;
        case 'upper':
          set.add(upper);
          break;
        case 'title':
          set.add(title);
          break;
        case 'alternate':
          set.add(altLower);
          set.add(altUpper);
          break;
        case 'inverted':
          set.add(inverted);
          if (invertedTitle) set.add(invertedTitle);
          break;
        case 'all':
        default:
          set.add(word);
          set.add(lower);
          set.add(upper);
          set.add(title);
          set.add(altLower);
          set.add(altUpper);
          set.add(inverted);
          set.add(invertedTitle);
          break;
      }
    }

    return Array.from(set).filter(Boolean);
  }

  /**
   * Generate Leetspeak variants for a word
   * @param {string} word
   * @param {object} [leetMap=DEFAULT_LEET_MAP]
   * @param {number} [maxVariants=64]
   * @returns {Array<string>}
   */
  function applyLeet(word, leetMap = DEFAULT_LEET_MAP, maxVariants = 64) {
    if (!word) return [];
    const map = leetMap && typeof leetMap === 'object' ? leetMap : DEFAULT_LEET_MAP;

    // Collect positions and their replacement options
    const chars = word.split('');
    const positions = [];
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i].toLowerCase();
      if (map[c] && Array.isArray(map[c]) && map[c].length > 0) {
        positions.push({
          index: i,
          original: chars[i],
          replacements: map[c]
        });
      }
    }

    if (positions.length === 0) {
      return [word];
    }

    const resultSet = new Set();
    resultSet.add(word);

    // 1. Full primary substitution (all positions replaced with first leet option)
    const primaryArr = [...chars];
    for (const pos of positions) {
      primaryArr[pos.index] = pos.replacements[0];
    }
    resultSet.add(primaryArr.join(''));

    // 2. Full secondary substitution (all positions replaced with second leet option if available)
    const secondaryArr = [...chars];
    for (const pos of positions) {
      secondaryArr[pos.index] = pos.replacements[1] || pos.replacements[0];
    }
    resultSet.add(secondaryArr.join(''));

    // 3. Single-character substitutions (replace one character at a time)
    for (const pos of positions) {
      for (const rep of pos.replacements) {
        const singleArr = [...chars];
        singleArr[pos.index] = rep;
        resultSet.add(singleArr.join(''));
        if (resultSet.size >= maxVariants) break;
      }
      if (resultSet.size >= maxVariants) break;
    }

    // 4. Cartesian combination if positions are reasonable
    if (positions.length <= 8 && resultSet.size < maxVariants) {
      // Build options array for each position
      const posOptions = positions.map(pos => [pos.original, ...pos.replacements]);

      function backtrack(posIdx, currentChars) {
        if (resultSet.size >= maxVariants) return;
        if (posIdx === positions.length) {
          resultSet.add(currentChars.join(''));
          return;
        }
        const { index } = positions[posIdx];
        for (const opt of posOptions[posIdx]) {
          currentChars[index] = opt;
          backtrack(posIdx + 1, currentChars);
          if (resultSet.size >= maxVariants) return;
        }
      }

      backtrack(0, [...chars]);
    }

    return Array.from(resultSet);
  }

  /**
   * Main Targeted Wordlist Generator
   *
   * @param {object} [options={}]
   * @param {string|Array<string>} [options.words] Base target words / names / terms
   * @param {string|Array<string|number>} [options.numbers] Numbers / birth years / dates
   * @param {string|Array<string>} [options.symbols] Special characters / symbols
   * @param {string|Array<string>} [options.delimiters] Delimiters between word and affix
   * @param {string|Array<string>} [options.casing='all'] Casing transformations
   * @param {boolean|object} [options.leetTransforms=false] Leetspeak enable or custom map
   * @param {string|Array<string>} [options.affixes='both'] 'both' | 'suffix' | 'prefix' | 'none'
   * @param {boolean} [options.includeReversed=false] Include reversed words
   * @param {boolean} [options.includeCompounds=true] Combine 2 words together
   * @param {number} [options.minLength=0] Minimum password length
   * @param {number} [options.maxLength=Infinity] Maximum password length
   * @param {number} [options.limit=10000] Maximum passwords to generate
   * @param {boolean} [options.asSet=false] If true, return Set<string>
   * @param {boolean} [options.returnObject=false] If true, return { passwords, total }
   * @param {boolean} [options.details=false] Alias for returnObject
   * @returns {Array<string>|Set<string>|{passwords: Array<string>, total: number}}
   */
  function generate(options = {}) {
    const opts = options || {};

    const rawWords = normalizeInput(opts.words);
    const numbers = normalizeInput(opts.numbers);
    const symbols = normalizeInput(opts.symbols, true);

    const delimiters = opts.delimiters !== undefined
      ? normalizeInput(opts.delimiters)
      : (numbers.length > 0 || symbols.length > 0 ? Array.from(DEFAULT_DELIMITERS) : ['']);

    // Ensure empty delimiter is tested if delimiters list is empty
    const delimList = delimiters.length > 0 ? delimiters : [''];

    const casing = opts.casing !== undefined ? opts.casing : 'all';
    const leetOption = opts.leetTransforms;
    const isLeetEnabled = Boolean(leetOption);
    const leetMap = typeof leetOption === 'object' && leetOption !== null ? leetOption : DEFAULT_LEET_MAP;

    const affixesMode = typeof opts.affixes === 'string' ? opts.affixes.toLowerCase() : 'both';
    const customAffixes = Array.isArray(opts.affixes) ? normalizeInput(opts.affixes) : null;

    const allowSuffix = customAffixes !== null || affixesMode === 'both' || affixesMode === 'suffix';
    const allowPrefix = customAffixes !== null || affixesMode === 'both' || affixesMode === 'prefix';

    const includeReversed = Boolean(opts.includeReversed);
    const includeCompounds = opts.includeCompounds !== false;

    const minLength = typeof opts.minLength === 'number' && !isNaN(opts.minLength) ? Math.max(0, opts.minLength) : 0;
    const maxLength = typeof opts.maxLength === 'number' && !isNaN(opts.maxLength) ? opts.maxLength : Infinity;
    const limit = typeof opts.limit === 'number' && opts.limit > 0 ? opts.limit : 10000;

    const resultSet = new Set();

    /**
     * Helper to test and add candidate password
     * Returns true when limit is reached
     */
    function tryAdd(candidate) {
      if (typeof candidate !== 'string') return false;
      if (candidate.length < minLength || candidate.length > maxLength) return false;
      resultSet.add(candidate);
      return resultSet.size >= limit;
    }

    if (rawWords.length === 0) {
      return finishResult(resultSet, opts);
    }

    // Step 1: Expand base words with casing
    const casedWordsSet = new Set();
    for (const w of rawWords) {
      const cased = applyCasing(w, casing);
      for (const cw of cased) {
        casedWordsSet.add(cw);
      }
      if (includeReversed) {
        const rev = reverseString(w);
        const casedRev = applyCasing(rev, casing);
        for (const cr of casedRev) {
          casedWordsSet.add(cr);
        }
      }
    }

    // Step 2: Expand with Leetspeak if enabled
    const expandedWords = new Set();
    for (const w of casedWordsSet) {
      expandedWords.add(w);
      if (isLeetEnabled) {
        const leeted = applyLeet(w, leetMap);
        for (const lw of leeted) {
          expandedWords.add(lw);
        }
      }
    }

    const wordList = Array.from(expandedWords);

    // Step 3: Add base words themselves
    for (const w of wordList) {
      if (tryAdd(w)) return finishResult(resultSet, opts);
    }

    // Step 4: Compound Words (if 2+ words and enabled)
    const compoundWords = [];
    if (includeCompounds && rawWords.length >= 2) {
      for (let i = 0; i < wordList.length; i++) {
        for (let j = 0; j < wordList.length; j++) {
          if (i === j) continue;
          const w1 = wordList[i];
          const w2 = wordList[j];

          // Direct concatenation
          const direct = w1 + w2;
          compoundWords.push(direct);
          if (tryAdd(direct)) return finishResult(resultSet, opts);

          // With delimiters
          for (const d of delimList) {
            if (d === '') continue;
            const delimited = w1 + d + w2;
            compoundWords.push(delimited);
            if (tryAdd(delimited)) return finishResult(resultSet, opts);
          }
        }
      }
    }

    // Combine base words and compound words for affix permutations
    const targets = compoundWords.length > 0 ? wordList.concat(compoundWords) : wordList;

    // Step 5: Affixes & Combinations (Numbers, Symbols, Custom Affixes)
    if (customAffixes && customAffixes.length > 0) {
      for (const target of targets) {
        for (const affix of customAffixes) {
          if (allowSuffix && tryAdd(target + affix)) return finishResult(resultSet, opts);
          if (allowPrefix && tryAdd(affix + target)) return finishResult(resultSet, opts);
          for (const d of delimList) {
            if (d && allowSuffix && tryAdd(target + d + affix)) return finishResult(resultSet, opts);
            if (d && allowPrefix && tryAdd(affix + d + target)) return finishResult(resultSet, opts);
          }
        }
      }
    } else if (affixesMode !== 'none') {
      // 5a. Word + Number
      for (const target of targets) {
        for (const num of numbers) {
          for (const d of delimList) {
            if (allowSuffix && tryAdd(target + d + num)) return finishResult(resultSet, opts);
            if (allowPrefix && tryAdd(num + d + target)) return finishResult(resultSet, opts);
          }
        }
      }

      // 5b. Word + Symbol
      for (const target of targets) {
        for (const sym of symbols) {
          for (const d of delimList) {
            if (allowSuffix && tryAdd(target + d + sym)) return finishResult(resultSet, opts);
            if (allowPrefix && tryAdd(sym + d + target)) return finishResult(resultSet, opts);
          }
        }
      }

      // 5c. Word + Number + Symbol (and variants)
      for (const target of targets) {
        for (const num of numbers) {
          for (const sym of symbols) {
            for (const d of delimList) {
              // word + delim + num + sym
              if (allowSuffix && tryAdd(target + d + num + sym)) return finishResult(resultSet, opts);
              // word + sym + delim + num
              if (allowSuffix && tryAdd(target + sym + d + num)) return finishResult(resultSet, opts);
              // sym + word + delim + num
              if (tryAdd(sym + target + d + num)) return finishResult(resultSet, opts);
              // num + delim + word + sym
              if (tryAdd(num + d + target + sym)) return finishResult(resultSet, opts);
              // sym + delim + num + delim + word
              if (allowPrefix && tryAdd(sym + d + num + d + target)) return finishResult(resultSet, opts);
              // num + delim + sym + delim + word
              if (allowPrefix && tryAdd(num + d + sym + d + target)) return finishResult(resultSet, opts);
            }
          }
        }
      }
    }

    return finishResult(resultSet, opts);
  }

  /**
   * Finalize and format generator result
   * @param {Set<string>} resultSet
   * @param {object} opts
   * @returns {Array<string>|Set<string>|{passwords: Array<string>, total: number}}
   */
  function finishResult(resultSet, opts) {
    if (opts.asSet) {
      return resultSet;
    }
    const arr = Array.from(resultSet);
    // Attach total and passwords properties for convenience & backward compatibility
    arr.total = arr.length;
    arr.passwords = arr;

    if (opts.returnObject || opts.details) {
      return {
        passwords: arr,
        total: arr.length
      };
    }

    return arr;
  }

  const TargetedGenerator = {
    DEFAULT_LEET_MAP,
    DEFAULT_DELIMITERS,
    CASING_MODES,
    generate,
    applyCasing,
    applyLeet,
    invertCase,
    toTitleCase,
    toAlternateCase,
    reverseString,
    normalizeInput
  };

  // UMD / CommonJS / Browser Global Export
  if (typeof window !== 'undefined') {
    window.TargetedGenerator = TargetedGenerator;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.TargetedGenerator = TargetedGenerator;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TargetedGenerator;
  }
})();
