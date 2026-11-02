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
    'original',
    'exact',
    'none',
    'all'
  ]);

  /**
   * Invert casing of each character in a string using Unicode-safe case checking
   * @param {string} str
   * @returns {string}
   */
  function invertCase(str) {
    if (!str) return '';
    let res = '';
    for (const c of str) {
      if (c === c.toLowerCase() && c !== c.toUpperCase()) {
        res += c.toUpperCase();
      } else if (c === c.toUpperCase() && c !== c.toLowerCase()) {
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
    let i = 0;
    for (const c of str) {
      const shouldUpper = startUpper ? i % 2 === 0 : i % 2 !== 0;
      res += shouldUpper ? c.toUpperCase() : c.toLowerCase();
      i++;
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
    return Array.from(str).reverse().join('');
  }

  /**
   * Normalize an input argument into an array of trimmed strings
   * @param {string|Array<string|number>} input
   * @param {boolean} [splitChars=false] If true and string has no separators, split by characters
   * @param {boolean} [allowEmptyString=false] If true, keep empty string '' (for delimiters)
   * @returns {Array<string>}
   */
  function normalizeInput(input, splitChars = false, allowEmptyString = false) {
    if (input === null || input === undefined) return [];
    if (Array.isArray(input)) {
      const result = [];
      for (const item of input) {
        if (item !== null && item !== undefined) {
          const str = String(item);
          const trimmed = str.trim();
          if (trimmed.length > 0 || (allowEmptyString && str === '')) {
            result.push(allowEmptyString && str === '' ? '' : trimmed);
          }
        }
      }
      return result;
    }
    if (typeof input === 'number') {
      return [String(input)];
    }
    if (typeof input === 'string') {
      if (allowEmptyString && input === '') {
        return [''];
      }
      const trimmed = input.trim();
      if (!trimmed) {
        return allowEmptyString && input === '' ? [''] : [];
      }
      if (/[,\s\r\n]/.test(trimmed)) {
        return trimmed
          .split(/[,\s\r\n]+/)
          .map(s => s.trim())
          .filter(s => s.length > 0 || allowEmptyString);
      }
      if (splitChars) {
        return Array.from(trimmed).filter(s => s.trim().length > 0);
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
        case 'original':
        case 'exact':
        case 'none':
          set.add(word);
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
    const chars = Array.from(word);
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
   * Generation Pipeline:
   * 1. Base cased & leeted words
   * 2. Base words + Numbers / Symbols / Affixes
   * 3. Distinct Compound words (Word A + Word B where root index i !== j)
   * 4. Compound words + Numbers / Symbols / Affixes
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
      ? normalizeInput(opts.delimiters, false, true)
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

    // Step 1: Expand base words by root word index to prevent self-compounding
    const baseWordVariants = []; // Array of Arrays, one entry per root base word
    const allBaseWords = [];
    const allBaseWordsSet = new Set();

    for (let k = 0; k < rawWords.length; k++) {
      const rootWord = rawWords[k];
      const variantsForWord = new Set();

      const cased = applyCasing(rootWord, casing);
      for (const cw of cased) variantsForWord.add(cw);

      if (includeReversed) {
        const rev = reverseString(rootWord);
        const casedRev = applyCasing(rev, casing);
        for (const cr of casedRev) variantsForWord.add(cr);
      }

      if (isLeetEnabled) {
        const toLeet = Array.from(variantsForWord);
        for (const vw of toLeet) {
          const leeted = applyLeet(vw, leetMap);
          for (const lw of leeted) variantsForWord.add(lw);
        }
      }

      const arrVariants = Array.from(variantsForWord);
      baseWordVariants.push(arrVariants);

      for (const v of arrVariants) {
        if (!allBaseWordsSet.has(v)) {
          allBaseWordsSet.add(v);
          allBaseWords.push(v);
        }
      }
    }

    // 1a. Emit base cased & leeted words
    for (const w of allBaseWords) {
      if (tryAdd(w)) return finishResult(resultSet, opts);
    }

    /**
     * Helper to apply affixes (numbers, symbols, custom affixes) to a target list
     * @param {Array<string>} targetList
     * @returns {boolean} true if limit reached
     */
    function applyAffixesTo(targetList) {
      if (customAffixes && customAffixes.length > 0) {
        for (const target of targetList) {
          for (const affix of customAffixes) {
            if (allowSuffix && tryAdd(target + affix)) return true;
            if (allowPrefix && tryAdd(affix + target)) return true;
            for (const d of delimList) {
              if (d && allowSuffix && tryAdd(target + d + affix)) return true;
              if (d && allowPrefix && tryAdd(affix + d + target)) return true;
            }
          }
        }
      } else if (affixesMode !== 'none') {
        // Word + Number
        for (const target of targetList) {
          for (const num of numbers) {
            for (const d of delimList) {
              if (allowSuffix && tryAdd(target + d + num)) return true;
              if (allowPrefix && tryAdd(num + d + target)) return true;
            }
          }
        }

        // Word + Symbol
        for (const target of targetList) {
          for (const sym of symbols) {
            for (const d of delimList) {
              if (allowSuffix && tryAdd(target + d + sym)) return true;
              if (allowPrefix && tryAdd(sym + d + target)) return true;
            }
          }
        }

        // Word + Number + Symbol (and combinations)
        for (const target of targetList) {
          for (const num of numbers) {
            for (const sym of symbols) {
              for (const d of delimList) {
                // word + delim + num + sym
                if (allowSuffix && tryAdd(target + d + num + sym)) return true;
                // word + sym + delim + num
                if (allowSuffix && tryAdd(target + sym + d + num)) return true;
                // sym + word + delim + num (sandwich: requires both prefix and suffix allowed)
                if (allowPrefix && allowSuffix && tryAdd(sym + target + d + num)) return true;
                // num + delim + word + sym (sandwich: requires both prefix and suffix allowed)
                if (allowPrefix && allowSuffix && tryAdd(num + d + target + sym)) return true;
                // sym + delim + num + delim + word
                if (allowPrefix && tryAdd(sym + d + num + d + target)) return true;
                // num + delim + sym + delim + word
                if (allowPrefix && tryAdd(num + d + sym + d + target)) return true;
              }
            }
          }
        }
      }
      return false;
    }

    // Step 2: Base words + Numbers / Symbols / Affixes (prioritized over compounds)
    if (applyAffixesTo(allBaseWords)) {
      return finishResult(resultSet, opts);
    }

    // Step 3: Distinct Compound Words (Word A + Word B where root index i !== j)
    const compoundWords = [];
    if (includeCompounds && baseWordVariants.length >= 2) {
      for (let i = 0; i < baseWordVariants.length; i++) {
        for (let j = 0; j < baseWordVariants.length; j++) {
          if (i === j) continue; // Only pair distinct root words (no self-compounding)
          for (const w1 of baseWordVariants[i]) {
            for (const w2 of baseWordVariants[j]) {
              // Direct concatenation
              const direct = w1 + w2;
              compoundWords.push(direct);
              if (tryAdd(direct)) return finishResult(resultSet, opts);

              // Delimited concatenation
              for (const d of delimList) {
                if (d === '') continue;
                const delimited = w1 + d + w2;
                compoundWords.push(delimited);
                if (tryAdd(delimited)) return finishResult(resultSet, opts);
              }
            }
          }
        }
      }
    }

    // Step 4: Compound Words + Numbers / Symbols / Affixes
    if (compoundWords.length > 0) {
      if (applyAffixesTo(compoundWords)) {
        return finishResult(resultSet, opts);
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
    // Attach total count for convenience (non-circular)
    arr.total = arr.length;

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
