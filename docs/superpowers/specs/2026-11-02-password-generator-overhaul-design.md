# Design Specification: Password & Wordlist Generator Suite Overhaul

**Date:** 2026-11-02  
**Status:** Approved  
**Author:** Pair Programming Session with User  

---

## 1. Executive Summary

This project overhauls and modernizes the legacy `Password_Generator-` repository from a dated, monolithic two-file structure (`index.html` and `wordlist.html`) into an all-in-one, high-performance, cybersecurity-focused web suite. 

The updated application runs 100% client-side with zero build steps or runtime dependencies, ensuring immediate compatibility with GitHub Pages, local file opening (`file:///`), and cross-platform desktop/mobile browsers.

---

## 2. Core Architecture & Modules

The application is structured into a modular, vanilla ES6+ architecture:

```
Password_Generator-/
├── index.html                   # Unified main dashboard application hub
├── wordlist.html                # Backward-compatible redirect & standalone fallback
├── css/
│   ├── styles.css               # CSS variables, typography, reset, grid layouts
│   ├── components.css           # Cards, tabs, sliders, inputs, switches, modals, toasts
│   └── cyber-theme.css          # Glassmorphism, cyber neon accents, scrollbars, animations
├── js/
│   ├── app.js                   # Application coordinator, tab controller, toasts, history
│   ├── crypto-gen.js            # Cryptographically secure random password generator
│   ├── targeted-gen.js          # Targeted pattern generator (names, dates, symbols, leetspeak)
│   ├── passphrase-gen.js        # Diceware & memorable passphrase engine
│   ├── strength-meter.js        # Password entropy calculator & crack time estimator
│   └── wordlist-worker.js       # Background Web Worker for lag-free massive wordlist generation
├── assets/
│   └── favicon.svg              # SVG security lock icon
├── README.md                    # Comprehensive documentation with badges, features & guide
└── LICENSE                      # MIT Open Source License
```

---

## 3. Detailed Feature Specifications

### 3.1 Mode 1: Cryptographically Secure Random Password Generator
- **Engine:** Uses `window.crypto.getRandomValues()` for unguessable CSPRNG generation.
- **Configurable Character Sets:**
  - Uppercase letters (`A-Z`)
  - Lowercase letters (`a-z`)
  - Numeric digits (`0-9`)
  - Standard & extended special symbols (`!@#$%^&*()_+-=[]{}|;:,.<>?`)
  - Option to exclude ambiguous / lookalike characters (`1`, `l`, `I`, `0`, `O`, `o`)
  - Custom character inclusion field.
- **Controls:**
  - Length slider from 6 to 128 characters (default: 16).
  - Bulk quantity generator: 1 to 500 passwords at a time.
  - Guaranteed character fulfillment (at least one character from each selected set).
- **Actions:** One-click copy with toast feedback, copy all, download as `.txt` or `.json`.

### 3.2 Mode 2: Targeted Wordlist & Pattern Generator (Enhanced Original)
- **Engine:** Combines user-supplied personal/target intelligence (names, keywords, birth years, special symbols) into permutations used in ethical penetration testing, dictionary auditing, and social engineering simulations.
- **Advanced Transformations:**
  - **Capitalization Rules:** lowercase, UPPERCASE, Capitalize/TitleCase, Alternate (aLtErNaTe), and Inverted.
  - **Leetspeak Engine:** Configurable mapping (`a` -> `@` or `4`, `e` -> `3`, `i` -> `!`/`1`, `o` -> `0`, `s` -> `$` or `5`, `t` -> `7`).
  - **Placement & Affixes:** Prefix numbers, suffix numbers, intermediate delimiters (`_`, `.`, `-`, `#`, `@`), and reversal.
  - **Length Filtering:** Constrain output length between minimum and maximum bounds.
  - **Deduplication:** Efficient in-memory `Set` ensures zero duplicate passwords.

### 3.3 Mode 3: Memorable Passphrase / Diceware Generator
- **Engine:** Generates high-entropy, human-memorable multi-word passphrases (e.g., `correct-horse-battery-staple`).
- **Dictionary:** Curated, safe, modern wordlist embedded directly in `passphrase-gen.js` (over 1,500 distinct words).
- **Controls:**
  - Word count slider: 3 to 10 words.
  - Custom separator selector: Hyphen (`-`), Underscore (`_`), Dot (`.`), Slash (`/`), Space (` `), Random Number, or Random Symbol.
  - Case options: Title Case (`Word-Word`), Lowercase (`word-word`), UPPERCASE (`WORD-WORD`).
  - Number insertion: Insert random digits between or at ends of words.

### 3.4 Mode 4: High-Throughput Wordlist Generator (Web Worker Powered)
- **Engine:** Solves the UI freezing problem of the old `wordlist.html` by offloading computation entirely to `js/wordlist-worker.js`.
- **Performance:** Able to generate 500,000 to 2,000,000+ combinations at speeds up to 100,000+ passwords/second without a single frame drop on the main thread.
- **Telemetry & Controls:**
  - Real-time animated progress bar and percentage.
  - Telemetry meters: Total Count, Elapsed Time, Current Speed (passwords/sec), and Estimated File Size in MB.
  - Live control buttons: Start, Pause, Resume, Stop.
  - Streaming file export: Generates downloadable text files directly without exceeding browser DOM element limits.

### 3.5 Real-Time Password Strength & Entropy Meter
- **Entropy Calculation:**
  $$E = L \times \log_2(R)$$
  Where $L$ is the string length and $R$ is the size of the character pool represented, adjusted for pattern repetitions, sequential runs (e.g., `12345`, `abcdef`), and dictionary matches.
- **Strength Grades:**
  - Very Weak (< 28 bits) - Red
  - Weak (28–45 bits) - Orange
  - Fair (46–59 bits) - Yellow
  - Strong (60–85 bits) - Blue/Cyan
  - Very Strong (86+ bits) - Neon Green
- **Crack Time Estimator:**
  Displays estimated time to crack under three standard threat profiles:
  - Online attack with rate limiting (~1,000 attempts/sec)
  - Fast offline hashing (e.g., NTLM/MD5 on high-end consumer GPU: $10^{10}$ attempts/sec)
  - Massive GPU / ASIC cluster ($10^{12}$ attempts/sec)
- **Interactive Security Checklist:** Visual indicators for length, lowercase, uppercase, digits, and special characters.

### 3.6 UI/UX & Design System
- **Theme:** Modern Cyberpunk / High-Tech Security dashboard aesthetic.
  - Deep dark background palette: `#0b0f19`, `#111827`, `#1f2937`.
  - Neon accents: Electric Cyan (`#00f0ff`), Emerald Green (`#10b981`), Purple Violet (`#8b5cf6`), Amber Warning (`#f59e0b`).
  - Glassmorphism: `backdrop-filter: blur(12px)` cards with subtle borders (`rgba(255, 255, 255, 0.08)`).
- **Navigation:** Sleek top tab bar switching between modes smoothly.
- **Toasts & Feedback:** Non-intrusive floating toasts on copy, save, and error actions.
- **Session History:** Keeps a local session history of generated passwords (stored only in memory/sessionStorage, clearable anytime).

---

## 4. Verification and Testing Strategy
1. **Cryptographic Validation:** Confirm `window.crypto.getRandomValues()` is used exclusively for CSPRNG mode and test distribution.
2. **Worker Concurrency:** Verify Web Worker starts, pauses, resumes, terminates cleanly, and posts batch chunks back without memory leaks.
3. **Entropy Accuracy:** Test known strings (`password`, `correcthorsebatterystaple`, `Tr0ub4dor&3`, `C9#mK8$zP1!vQ4@x`) against standard bit entropy formulas.
4. **Export Integrity:** Verify `.txt`, `.json`, and `.csv` downloads contain exact expected counts and headers.
5. **Cross-Browser & Local File Compatibility:** Ensure application works seamlessly when opened via `file:///` and over standard HTTP/HTTPS servers.
6. **Responsive Layouts:** Test across mobile (375px), tablet (768px), and desktop (1200px+).

---

## 5. Security & Ethical Disclaimer
- The tool operates strictly client-side; no passwords, wordlists, or inputs are ever transmitted over the network.
- Prominent educational and ethical hacking disclaimer included in the UI and README.
