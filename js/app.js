/**
 * CyberPass Suite - Unified Dashboard Application Controller
 *
 * Coordinates UI tabs, CSPRNG generation, Targeted wordlists,
 * Diceware passphrases, Web Worker Matrix generation,
 * real-time entropy calculation, terminal output, and export engines.
 *
 * Zero external npm dependencies. Pure modern JavaScript.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    activeTab: 'csprng',
    currentPassword: '',
    passwordsList: [],
    history: [],
    worker: null,
    fallbackEngine: null,
    workerState: 'IDLE', // 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED'
    workerChunks: [],
    workerTotalCount: 0,
    workerStartTime: 0
  };

  // DOM Elements Cache
  let dom = {};

  /**
   * Safe document element resolver
   * @param {string} id
   * @returns {HTMLElement|null}
   */
  function el(id) {
    return document.getElementById(id);
  }

  /**
   * Initialize DOM element bindings
   */
  function initDomElements() {
    dom = {
      // Navigation Tabs
      tabCsprng: el('tab-csprng'),
      tabTargeted: el('tab-targeted'),
      tabPassphrase: el('tab-passphrase'),
      tabWordlist: el('tab-wordlist'),

      // Tab Panels
      panelCsprng: el('panel-csprng'),
      panelTargeted: el('panel-targeted'),
      panelPassphrase: el('panel-passphrase'),
      panelWordlist: el('panel-wordlist'),

      // Hero Password Display
      heroPassword: el('hero-password'),
      btnHeroCopy: el('btn-hero-copy'),
      btnHeroRegenerate: el('btn-hero-regenerate'),

      // Output Terminal
      terminalContainer: el('terminal-container'),
      terminalCountBadge: el('terminal-count-badge'),
      terminalContent: el('terminal-content'),
      btnCopyAll: el('btn-copy-all'),
      btnClearOutput: el('btn-clear-output'),
      btnDownloadTxt: el('btn-download-txt'),
      btnDownloadJson: el('btn-download-json'),
      btnDownloadCsv: el('btn-download-csv'),

      // Password Strength Analyzer
      strengthInput: el('strength-input'),
      strengthEntropy: el('strength-entropy'),
      strengthScoreLabel: el('strength-score-label'),
      strengthMeterBar: el('strength-meter-bar'),
      critLength: el('crit-length'),
      critUpper: el('crit-upper'),
      critLower: el('crit-lower'),
      critNumbers: el('crit-numbers'),
      critSymbols: el('crit-symbols'),
      critNoRepeats: el('crit-no-repeats'),
      critNoSequences: el('crit-no-sequences'),
      critNoDict: el('crit-no-dict'),
      crackOnlineThrottled: el('crack-online-throttled'),
      crackOnlineUnthrottled: el('crack-online-unthrottled'),
      crackOfflineGpu: el('crack-offline-gpu'),
      crackCluster: el('crack-cluster'),
      strengthFeedbackList: el('strength-feedback-list'),

      // CSPRNG Controls
      csprngLength: el('csprng-length'),
      csprngLengthVal: el('csprng-length-val'),
      csprngQuantity: el('csprng-quantity'),
      csprngUpper: el('csprng-upper'),
      csprngLower: el('csprng-lower'),
      csprngNumbers: el('csprng-numbers'),
      csprngSymbols: el('csprng-symbols'),
      csprngNoAmbiguous: el('csprng-no-ambiguous'),
      csprngCustom: el('csprng-custom'),
      btnGenerateCsprng: el('btn-generate-csprng'),

      // Targeted Controls
      targetedWords: el('targeted-words'),
      targetedNumbers: el('targeted-numbers'),
      targetedSymbols: el('targeted-symbols'),
      targetedDelimiters: el('targeted-delimiters'),
      targetedCasing: el('targeted-casing'),
      targetedLeet: el('targeted-leet'),
      targetedReverse: el('targeted-reverse'),
      targetedCompounds: el('targeted-compounds'),
      targetedAffixes: el('targeted-affixes'),
      targetedMinLen: el('targeted-min-len'),
      targetedMaxLen: el('targeted-max-len'),
      targetedLimit: el('targeted-limit'),
      btnGenerateTargeted: el('btn-generate-targeted'),

      // Passphrase Controls
      passphraseWords: el('passphrase-words'),
      passphraseWordsVal: el('passphrase-words-val'),
      passphraseSeparator: el('passphrase-separator'),
      passphraseCustomSeparator: el('passphrase-custom-separator'),
      passphraseCasing: el('passphrase-casing'),
      passphraseIncludeNumber: el('passphrase-include-number'),
      passphraseNumberPos: el('passphrase-number-pos'),
      passphraseQuantity: el('passphrase-quantity'),
      btnGeneratePassphrase: el('btn-generate-passphrase'),

      // Worker Matrix Controls & Telemetry
      workerMode: el('worker-mode'),
      workerCustomChars: el('worker-custom-chars'),
      workerCustomCharsGroup: el('worker-custom-chars-group'),
      workerCount: el('worker-count'),
      workerMinLen: el('worker-min-len'),
      workerMaxLen: el('worker-max-len'),
      btnWorkerStart: el('btn-worker-start'),
      btnWorkerPause: el('btn-worker-pause'),
      btnWorkerResume: el('btn-worker-resume'),
      btnWorkerStop: el('btn-worker-stop'),
      workerProgressBar: el('worker-progress-bar'),
      workerProgressVal: el('worker-progress-val'),
      workerMetricGenerated: el('worker-metric-generated'),
      workerMetricSpeed: el('worker-metric-speed'),
      workerMetricElapsed: el('worker-metric-elapsed'),
      workerMetricSize: el('worker-metric-size'),

      // History Modal
      btnOpenHistory: el('btn-open-history'),
      btnCloseHistory: el('btn-close-history'),
      historyModal: el('history-modal'),
      historyList: el('history-list'),
      btnClearHistory: el('btn-clear-history'),
      historyCountBadge: el('history-count-badge'),

      // Toast Notifications
      toastContainer: el('toast-container')
    };
  }

  // =========================================================================
  // TOAST NOTIFICATION ENGINE
  // =========================================================================

  /**
   * Display modern cyber toast notification
   * @param {string} message
   * @param {'info'|'success'|'warning'|'error'} [type='info']
   * @param {number} [duration=3000]
   */
  function showToast(message, type = 'info', duration = 3000) {
    if (!dom.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    else if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    else if (type === 'error') iconClass = 'fa-circle-xmark';

    toast.innerHTML = `
      <i class="fa-solid ${iconClass} toast-icon"></i>
      <div class="toast-msg">${escapeHtml(message)}</div>
      <button class="toast-close" aria-label="Close Notification">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    let timerId = null;

    function dismiss() {
      if (timerId) clearTimeout(timerId);
      toast.classList.add('toast-hide');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 250);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', dismiss);
    }

    dom.toastContainer.appendChild(toast);

    if (duration > 0) {
      timerId = setTimeout(dismiss, duration);
    }
  }

  /**
   * Escape HTML to prevent injection in toasts and logs
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // CLIPBOARD COPY WITH FALLBACK
  // =========================================================================

  /**
   * Copy text to clipboard with legacy fallback
   * @param {string} text
   * @param {string} [successMsg='Copied to clipboard!']
   */
  function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (!text) {
      showToast('No content to copy!', 'warning');
      return;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text)
        .then(() => showToast(successMsg, 'success'))
        .catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  /**
   * Fallback copy using temporary textarea
   * @param {string} text
   * @param {string} successMsg
   */
  function fallbackCopy(text, successMsg) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        showToast(successMsg, 'success');
      } else {
        showToast('Unable to copy text automatically', 'error');
      }
    } catch (err) {
      showToast('Copy failed: ' + (err.message || 'unknown error'), 'error');
    }
  }

  // =========================================================================
  // TAB NAVIGATION SYSTEM
  // =========================================================================

  const TABS = ['csprng', 'targeted', 'passphrase', 'wordlist'];

  /**
   * Switch active navigation tab
   * @param {'csprng'|'targeted'|'passphrase'|'wordlist'} tabName
   */
  function switchTab(tabName) {
    if (!TABS.includes(tabName)) return;
    state.activeTab = tabName;

    const tabMap = {
      csprng: { btn: dom.tabCsprng, panel: dom.panelCsprng },
      targeted: { btn: dom.tabTargeted, panel: dom.panelTargeted },
      passphrase: { btn: dom.tabPassphrase, panel: dom.panelPassphrase },
      wordlist: { btn: dom.tabWordlist, panel: dom.panelWordlist }
    };

    for (const key of TABS) {
      const item = tabMap[key];
      if (!item.btn || !item.panel) continue;

      if (key === tabName) {
        item.btn.classList.add('active');
        item.btn.setAttribute('aria-selected', 'true');
        item.panel.classList.remove('hidden');
        item.panel.removeAttribute('hidden');
      } else {
        item.btn.classList.remove('active');
        item.btn.setAttribute('aria-selected', 'false');
        item.panel.classList.add('hidden');
        item.panel.setAttribute('hidden', '');
      }
    }
  }

  function setupTabs() {
    if (dom.tabCsprng) dom.tabCsprng.addEventListener('click', () => switchTab('csprng'));
    if (dom.tabTargeted) dom.tabTargeted.addEventListener('click', () => switchTab('targeted'));
    if (dom.tabPassphrase) dom.tabPassphrase.addEventListener('click', () => switchTab('passphrase'));
    if (dom.tabWordlist) dom.tabWordlist.addEventListener('click', () => switchTab('wordlist'));
  }

  // =========================================================================
  // REAL-TIME PASSWORD STRENGTH METER
  // =========================================================================

  /**
   * Update real-time password strength analyzer
   * @param {string} password
   */
  function updateStrengthMeter(password) {
    const pw = typeof password === 'string' ? password : '';

    if (typeof StrengthMeter === 'undefined' || typeof StrengthMeter.analyze !== 'function') {
      return;
    }

    const result = StrengthMeter.analyze(pw);

    // 1. Entropy display
    if (dom.strengthEntropy) {
      dom.strengthEntropy.textContent = `${result.bits.toFixed(1)} bits`;
    }

    // 2. Score label & color
    if (dom.strengthScoreLabel) {
      dom.strengthScoreLabel.textContent = result.label.toUpperCase();
      dom.strengthScoreLabel.style.color = result.color;
    }

    // 3. Progress bar fill
    if (dom.strengthMeterBar) {
      const percent = pw.length === 0 ? 0 : Math.min(100, Math.max(5, (result.bits / 100) * 100));
      dom.strengthMeterBar.style.width = `${percent}%`;
      dom.strengthMeterBar.style.backgroundColor = result.color;
      dom.strengthMeterBar.style.boxShadow = pw.length === 0 ? 'none' : `0 0 10px ${result.color}`;
    }

    // 4. Criteria checklist
    const critMap = [
      { el: dom.critLength, ok: result.checks.length },
      { el: dom.critUpper, ok: result.checks.uppercase },
      { el: dom.critLower, ok: result.checks.lowercase },
      { el: dom.critNumbers, ok: result.checks.numbers },
      { el: dom.critSymbols, ok: result.checks.symbols },
      { el: dom.critNoRepeats, ok: result.checks.noRepeats },
      { el: dom.critNoSequences, ok: result.checks.noSequences },
      { el: dom.critNoDict, ok: result.checks.noDictionary }
    ];

    for (const item of critMap) {
      if (!item.el) continue;
      if (item.ok) {
        item.el.classList.add('met');
        item.el.classList.remove('unmet');
      } else {
        item.el.classList.remove('met');
        item.el.classList.add('unmet');
      }
    }

    // 5. Threat Model Crack Times
    if (dom.crackOnlineThrottled) dom.crackOnlineThrottled.textContent = result.crackTime.onlineThrottled;
    if (dom.crackOnlineUnthrottled) dom.crackOnlineUnthrottled.textContent = result.crackTime.onlineUnthrottled;
    if (dom.crackOfflineGpu) dom.crackOfflineGpu.textContent = result.crackTime.offlineFastHash;
    if (dom.crackCluster) dom.crackCluster.textContent = result.crackTime.clusterHashcat;

    // 6. Security Feedback Hints
    if (dom.strengthFeedbackList) {
      if (result.feedback.length === 0) {
        dom.strengthFeedbackList.innerHTML = `<li class="text-green text-xs"><i class="fa-solid fa-shield-halved"></i> Exceptional entropy: resistant to advanced brute-force and dictionary attacks.</li>`;
      } else {
        dom.strengthFeedbackList.innerHTML = result.feedback
          .map(f => `<li class="text-xs text-muted"><i class="fa-solid fa-circle-exclamation text-amber"></i> ${escapeHtml(f)}</li>`)
          .join('');
      }
    }
  }

  function setupStrengthMeter() {
    if (dom.strengthInput) {
      dom.strengthInput.addEventListener('input', (e) => {
        updateStrengthMeter(e.target.value);
      });
    }
  }

  // =========================================================================
  // HERO DISPLAY, TERMINAL & OUTPUT MANAGEMENT
  // =========================================================================

  /**
   * Set primary hero password and sync to analyzer & history
   * @param {string} password
   * @param {string} type
   */
  function setHeroPassword(password, type = 'Single') {
    state.currentPassword = password;
    if (dom.heroPassword) {
      dom.heroPassword.textContent = password || 'Click Generate to start...';
    }

    if (dom.strengthInput) {
      dom.strengthInput.value = password;
    }
    updateStrengthMeter(password);

    if (password) {
      addToHistory(password, type);
    }
  }

  /**
   * Render passwords in output terminal
   * @param {Array<string>} passwords
   */
  function renderTerminal(passwords) {
    state.passwordsList = passwords || [];

    if (dom.terminalCountBadge) {
      dom.terminalCountBadge.textContent = `${state.passwordsList.length} items`;
    }

    if (!dom.terminalContent) return;

    if (state.passwordsList.length === 0) {
      dom.terminalContent.innerHTML = `<div class="text-dim text-center py-4" style="padding: 2rem 0;">No passwords generated yet. Select a mode above and click Generate.</div>`;
      return;
    }

    // Limit DOM element rendering for snappy UI performance
    const previewLimit = 500;
    const toRender = state.passwordsList.slice(0, previewLimit);

    let html = '<div class="password-list">';
    for (let i = 0; i < toRender.length; i++) {
      const pw = toRender[i];
      html += `
        <div class="password-item">
          <span class="password-item-text">${escapeHtml(pw)}</span>
          <button class="btn btn-ghost btn-sm btn-copy-item" data-pw="${escapeHtml(pw)}" title="Copy password">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      `;
    }
    html += '</div>';

    if (state.passwordsList.length > previewLimit) {
      html += `
        <div class="text-muted text-center text-xs" style="margin-top: 0.75rem; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius: 4px;">
          <i class="fa-solid fa-circle-info text-cyan"></i> Showing first ${previewLimit} of ${state.passwordsList.length.toLocaleString()} passwords. Use "Export" or "Copy All" for complete dataset.
        </div>
      `;
    }

    dom.terminalContent.innerHTML = html;

    // Attach copy button handlers
    const copyBtns = dom.terminalContent.querySelectorAll('.btn-copy-item');
    copyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pw = e.currentTarget.getAttribute('data-pw');
        copyToClipboard(pw, 'Password copied to clipboard!');
      });
    });
  }

  function setupTerminalActions() {
    // Hero Copy
    if (dom.btnHeroCopy) {
      dom.btnHeroCopy.addEventListener('click', () => {
        if (!state.currentPassword) {
          showToast('Generate a password first!', 'warning');
          return;
        }
        copyToClipboard(state.currentPassword, 'Hero password copied to clipboard!');
      });
    }

    // Hero Regenerate
    if (dom.btnHeroRegenerate) {
      dom.btnHeroRegenerate.addEventListener('click', () => {
        regenerateActiveMode();
      });
    }

    // Copy All
    if (dom.btnCopyAll) {
      dom.btnCopyAll.addEventListener('click', () => {
        if (state.passwordsList.length === 0) {
          if (state.currentPassword) {
            copyToClipboard(state.currentPassword, 'Copied hero password!');
          } else {
            showToast('No passwords to copy!', 'warning');
          }
          return;
        }
        const fullText = state.passwordsList.join('\n');
        copyToClipboard(fullText, `Copied all ${state.passwordsList.length.toLocaleString()} passwords to clipboard!`);
      });
    }

    // Clear Output
    if (dom.btnClearOutput) {
      dom.btnClearOutput.addEventListener('click', () => {
        state.passwordsList = [];
        state.currentPassword = '';
        if (dom.heroPassword) dom.heroPassword.textContent = 'Ready for generation...';
        if (dom.strengthInput) dom.strengthInput.value = '';
        updateStrengthMeter('');
        renderTerminal([]);
        showToast('Terminal and display cleared', 'info');
      });
    }

    // Export TXT
    if (dom.btnDownloadTxt) {
      dom.btnDownloadTxt.addEventListener('click', () => exportData('txt'));
    }

    // Export JSON
    if (dom.btnDownloadJson) {
      dom.btnDownloadJson.addEventListener('click', () => exportData('json'));
    }

    // Export CSV
    if (dom.btnDownloadCsv) {
      dom.btnDownloadCsv.addEventListener('click', () => exportData('csv'));
    }
  }

  /**
   * Export generated passwords to file
   * @param {'txt'|'json'|'csv'} format
   */
  function exportData(format) {
    const list = state.passwordsList.length > 0 ? state.passwordsList : (state.currentPassword ? [state.currentPassword] : []);
    if (list.length === 0) {
      showToast('No passwords available to export!', 'warning');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'txt') {
      const content = list.join('\n');
      downloadFile(content, `cyberpass-export-${timestamp}.txt`, 'text/plain;charset=utf-8');
    } else if (format === 'json') {
      const data = {
        suite: 'CyberPass Generator Suite',
        exportedAt: new Date().toISOString(),
        total: list.length,
        passwords: list
      };
      downloadFile(JSON.stringify(data, null, 2), `cyberpass-export-${timestamp}.json`, 'application/json;charset=utf-8');
    } else if (format === 'csv') {
      const lines = ['"Index","Password","Length"'];
      list.forEach((pw, idx) => {
        const escaped = pw.replace(/"/g, '""');
        lines.push(`${idx + 1},"${escaped}",${pw.length}`);
      });
      downloadFile(lines.join('\r\n'), `cyberpass-export-${timestamp}.csv`, 'text/csv;charset=utf-8');
    }
  }

  /**
   * Trigger download of blob
   */
  function downloadFile(content, filename, mimeType) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 150);
      showToast(`Exported ${filename} (${listCountLabel(state.passwordsList.length)})`, 'success');
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    }
  }

  function listCountLabel(len) {
    return len > 0 ? `${len.toLocaleString()} entries` : '1 entry';
  }

  // =========================================================================
  // SESSION HISTORY MODAL
  // =========================================================================

  /**
   * Add password to session history
   * @param {string} password
   * @param {string} type
   */
  function addToHistory(password, type = 'CSPRNG') {
    if (!password) return;
    // Prevent consecutive duplicate history entries
    if (state.history.length > 0 && state.history[0].password === password) return;

    let entropyBits = 0;
    let label = 'Unknown';
    if (typeof StrengthMeter !== 'undefined') {
      const res = StrengthMeter.analyze(password);
      entropyBits = Math.round(res.bits);
      label = res.label;
    }

    state.history.unshift({
      id: Date.now() + Math.random().toString(36).slice(2, 6),
      password,
      type,
      time: new Date().toLocaleTimeString(),
      entropy: entropyBits,
      label
    });

    if (state.history.length > 50) {
      state.history.pop();
    }

    renderHistory();
  }

  function renderHistory() {
    if (dom.historyCountBadge) {
      dom.historyCountBadge.textContent = state.history.length;
    }

    if (!dom.historyList) return;

    if (state.history.length === 0) {
      dom.historyList.innerHTML = `<div class="text-dim text-center py-4" style="padding: 2rem 0;">No password history recorded in this session.</div>`;
      return;
    }

    let html = '<div class="password-list">';
    for (const item of state.history) {
      html += `
        <div class="password-item">
          <div style="display: flex; flex-direction: column; gap: 0.2rem; overflow: hidden; min-width: 0;">
            <span class="password-item-text" style="user-select: all;">${escapeHtml(item.password)}</span>
            <div style="display: flex; gap: 0.5rem; font-size: 0.7rem; color: var(--text-dim); align-items: center;">
              <span class="badge badge-cyan" style="font-size: 0.65rem;">${escapeHtml(item.type)}</span>
              <span>${escapeHtml(item.label)} (${item.entropy}b)</span>
              <span>•</span>
              <span>${escapeHtml(item.time)}</span>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm btn-copy-history" data-pw="${escapeHtml(item.password)}" title="Copy password">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      `;
    }
    html += '</div>';

    dom.historyList.innerHTML = html;

    const copyBtns = dom.historyList.querySelectorAll('.btn-copy-history');
    copyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pw = e.currentTarget.getAttribute('data-pw');
        copyToClipboard(pw, 'History password copied to clipboard!');
      });
    });
  }

  function setupHistoryModal() {
    if (dom.btnOpenHistory && dom.historyModal) {
      dom.btnOpenHistory.addEventListener('click', () => {
        dom.historyModal.classList.add('open');
      });
    }

    if (dom.btnCloseHistory && dom.historyModal) {
      dom.btnCloseHistory.addEventListener('click', () => {
        dom.historyModal.classList.remove('open');
      });
    }

    if (dom.historyModal) {
      dom.historyModal.addEventListener('click', (e) => {
        if (e.target === dom.historyModal) {
          dom.historyModal.classList.remove('open');
        }
      });
    }

    if (dom.btnClearHistory) {
      dom.btnClearHistory.addEventListener('click', () => {
        state.history = [];
        renderHistory();
        showToast('History cleared', 'info');
      });
    }
  }

  // =========================================================================
  // MODE 1: CSPRNG RANDOM GENERATOR
  // =========================================================================

  function setupCsprngGenerator() {
    if (dom.csprngLength && dom.csprngLengthVal) {
      dom.csprngLength.addEventListener('input', (e) => {
        dom.csprngLengthVal.textContent = e.target.value;
      });
    }

    if (dom.btnGenerateCsprng) {
      dom.btnGenerateCsprng.addEventListener('click', () => {
        generateCsprng();
      });
    }
  }

  function generateCsprng() {
    if (typeof CryptoPasswordGenerator === 'undefined') {
      showToast('CryptoPasswordGenerator module not loaded!', 'error');
      return;
    }

    const length = parseInt(dom.csprngLength ? dom.csprngLength.value : 16, 10) || 16;
    const quantity = parseInt(dom.csprngQuantity ? dom.csprngQuantity.value : 1, 10) || 1;
    const uppercase = dom.csprngUpper ? dom.csprngUpper.checked : true;
    const lowercase = dom.csprngLower ? dom.csprngLower.checked : true;
    const numbers = dom.csprngNumbers ? dom.csprngNumbers.checked : true;
    const symbols = dom.csprngSymbols ? dom.csprngSymbols.checked : true;
    const excludeAmbiguous = dom.csprngNoAmbiguous ? dom.csprngNoAmbiguous.checked : false;
    const customChars = dom.csprngCustom ? dom.csprngCustom.value : '';

    if (!uppercase && !lowercase && !numbers && !symbols && !customChars) {
      showToast('Select at least one character set or enter custom characters!', 'warning');
      return;
    }

    try {
      const passwords = CryptoPasswordGenerator.generate({
        length,
        quantity,
        uppercase,
        lowercase,
        numbers,
        symbols,
        excludeAmbiguous,
        customChars
      });

      if (passwords && passwords.length > 0) {
        setHeroPassword(passwords[0], 'CSPRNG');
        renderTerminal(passwords);
        showToast(`Generated ${passwords.length.toLocaleString()} cryptographically secure password(s)!`, 'success');
      }
    } catch (err) {
      showToast('CSPRNG Generation error: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // MODE 2: TARGETED WORDLIST GENERATOR
  // =========================================================================

  function setupTargetedGenerator() {
    if (dom.btnGenerateTargeted) {
      dom.btnGenerateTargeted.addEventListener('click', () => {
        generateTargeted();
      });
    }
  }

  function generateTargeted() {
    if (typeof TargetedGenerator === 'undefined') {
      showToast('TargetedGenerator module not loaded!', 'error');
      return;
    }

    const rawWords = dom.targetedWords ? dom.targetedWords.value.trim() : '';
    if (!rawWords) {
      showToast('Please enter at least one target keyword or name!', 'warning');
      if (dom.targetedWords) dom.targetedWords.focus();
      return;
    }

    const words = rawWords.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const rawNumbers = dom.targetedNumbers ? dom.targetedNumbers.value.trim() : '';
    const numbers = rawNumbers ? rawNumbers.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
    const rawSymbols = dom.targetedSymbols ? dom.targetedSymbols.value.trim() : '';
    const symbols = rawSymbols ? rawSymbols.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
    const rawDelims = dom.targetedDelimiters ? dom.targetedDelimiters.value.trim() : '';
    const delimiters = rawDelims ? rawDelims.split(/[\s,]+/).filter(d => d !== '') : undefined;

    const casing = dom.targetedCasing ? dom.targetedCasing.value : 'all';
    const leet = dom.targetedLeet ? dom.targetedLeet.checked : true;
    const includeReversed = dom.targetedReverse ? dom.targetedReverse.checked : false;
    const includeCompounds = dom.targetedCompounds ? dom.targetedCompounds.checked : true;
    const affixes = dom.targetedAffixes ? dom.targetedAffixes.value : 'both';
    const minLength = parseInt(dom.targetedMinLen ? dom.targetedMinLen.value : 0, 10) || 0;
    const maxLength = parseInt(dom.targetedMaxLen ? dom.targetedMaxLen.value : 64, 10) || 64;
    const limit = parseInt(dom.targetedLimit ? dom.targetedLimit.value : 5000, 10) || 5000;

    try {
      const result = TargetedGenerator.generate({
        words,
        numbers,
        symbols,
        delimiters,
        casing,
        leet,
        includeReversed,
        includeCompounds,
        affixes,
        minLength,
        maxLength,
        limit
      });

      const passwords = Array.isArray(result) ? result : (result.passwords || []);
      if (passwords.length > 0) {
        setHeroPassword(passwords[0], 'Targeted');
        renderTerminal(passwords);
        showToast(`Targeted permutation generated ${passwords.length.toLocaleString()} candidate passwords!`, 'success');
      } else {
        renderTerminal([]);
        showToast('No candidates generated with current length and affix filters', 'warning');
      }
    } catch (err) {
      showToast('Targeted Generation error: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // MODE 3: MEMORABLE PASSPHRASE GENERATOR (DICEWARE)
  // =========================================================================

  function setupPassphraseGenerator() {
    if (dom.passphraseWords && dom.passphraseWordsVal) {
      dom.passphraseWords.addEventListener('input', (e) => {
        dom.passphraseWordsVal.textContent = e.target.value;
      });
    }

    if (dom.passphraseSeparator && dom.passphraseCustomSeparator) {
      dom.passphraseSeparator.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          dom.passphraseCustomSeparator.style.display = 'block';
        } else {
          dom.passphraseCustomSeparator.style.display = 'none';
        }
      });
    }

    if (dom.btnGeneratePassphrase) {
      dom.btnGeneratePassphrase.addEventListener('click', () => {
        generatePassphrase();
      });
    }
  }

  function generatePassphrase() {
    if (typeof PassphraseGenerator === 'undefined') {
      showToast('PassphraseGenerator module not loaded!', 'error');
      return;
    }

    const wordCount = parseInt(dom.passphraseWords ? dom.passphraseWords.value : 5, 10) || 5;
    let separator = dom.passphraseSeparator ? dom.passphraseSeparator.value : '-';
    if (separator === 'custom' && dom.passphraseCustomSeparator) {
      separator = dom.passphraseCustomSeparator.value || '-';
    }

    const casing = dom.passphraseCasing ? dom.passphraseCasing.value : 'title';
    const includeNumber = dom.passphraseIncludeNumber ? dom.passphraseIncludeNumber.checked : true;
    const numberPosition = dom.passphraseNumberPos ? dom.passphraseNumberPos.value : 'random';
    const quantity = parseInt(dom.passphraseQuantity ? dom.passphraseQuantity.value : 1, 10) || 1;

    try {
      const res = PassphraseGenerator.generate({
        wordCount,
        separator,
        casing,
        includeNumber,
        numberPosition,
        quantity
      });

      const passwords = Array.isArray(res) ? res : [res];
      if (passwords.length > 0) {
        setHeroPassword(passwords[0], 'Passphrase');
        renderTerminal(passwords);
        showToast(`Generated ${passwords.length.toLocaleString()} memorable passphrase(s)!`, 'success');
      }
    } catch (err) {
      showToast('Passphrase generation error: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // MODE 4: HIGH-SPEED WORDLIST MATRIX (WEB WORKER)
  // =========================================================================

  function initWorker() {
    if (typeof window !== 'undefined' && window.Worker) {
      try {
        state.worker = new Worker('js/wordlist-worker.js');
        state.worker.onmessage = handleWorkerMessage;
        state.worker.onerror = (err) => {
          console.warn('Worker thread error, switching to in-thread fallback:', err);
          fallbackToInThread();
        };
        return;
      } catch (e) {
        console.warn('Web Worker construction failed (likely file:/// restriction). Using in-thread engine:', e);
        fallbackToInThread();
      }
    } else {
      fallbackToInThread();
    }
  }

  function fallbackToInThread() {
    if (state.worker) {
      try { state.worker.terminate(); } catch (_) {}
      state.worker = null;
    }
    if (typeof WordlistWorkerEngine !== 'undefined') {
      state.fallbackEngine = new WordlistWorkerEngine({
        postMessage: (msg) => handleWorkerMessage({ data: msg })
      });
    }
  }

  function sendWorkerMessage(msg) {
    if (state.worker) {
      state.worker.postMessage(msg);
    } else if (state.fallbackEngine) {
      state.fallbackEngine.handleMessage(msg);
    } else if (typeof WordlistWorkerEngine !== 'undefined') {
      fallbackToInThread();
      if (state.fallbackEngine) {
        state.fallbackEngine.handleMessage(msg);
      }
    }
  }

  function handleWorkerMessage(e) {
    if (!e || !e.data) return;
    const { type, payload } = e.data;

    switch (type) {
      case 'STARTED':
        state.workerState = 'RUNNING';
        updateWorkerButtons();
        showToast(`Matrix Engine launched: ${payload.total.toLocaleString()} target items`, 'info');
        break;

      case 'PROGRESS':
        updateWorkerTelemetry(payload);
        break;

      case 'BATCH':
        if (payload && payload.chunk) {
          // Accumulate for terminal display/export
          if (Array.isArray(payload.chunk)) {
            state.workerChunks.push(...payload.chunk);
          } else if (typeof payload.chunk === 'string') {
            state.workerChunks.push(...payload.chunk.split('\n'));
          }
        }
        break;

      case 'PAUSED':
        state.workerState = 'PAUSED';
        updateWorkerButtons();
        showToast('Matrix generation paused', 'warning');
        break;

      case 'RESUMED':
        state.workerState = 'RUNNING';
        updateWorkerButtons();
        showToast('Matrix generation resumed', 'info');
        break;

      case 'STOPPED':
        state.workerState = 'STOPPED';
        updateWorkerButtons();
        showToast(`Matrix generation stopped at ${payload.generated.toLocaleString()} items`, 'warning');
        finishWorkerRun();
        break;

      case 'COMPLETE':
        state.workerState = 'COMPLETED';
        updateWorkerButtons();
        if (dom.workerProgressBar) dom.workerProgressBar.style.width = '100%';
        if (dom.workerProgressVal) dom.workerProgressVal.textContent = '100%';
        showToast(`Matrix generation complete! Generated ${payload.total.toLocaleString()} passwords in ${payload.elapsed}s`, 'success');
        finishWorkerRun(payload.preview);
        break;

      case 'ERROR':
        state.workerState = 'IDLE';
        updateWorkerButtons();
        showToast('Matrix engine error: ' + (payload ? payload.error : 'Unknown error'), 'error');
        break;
    }
  }

  function updateWorkerTelemetry(payload) {
    if (!payload) return;

    if (dom.workerProgressBar) {
      dom.workerProgressBar.style.width = `${payload.percent}%`;
    }
    if (dom.workerProgressVal) {
      dom.workerProgressVal.textContent = `${payload.percent}%`;
    }
    if (dom.workerMetricGenerated) {
      dom.workerMetricGenerated.textContent = payload.generated.toLocaleString();
    }
    if (dom.workerMetricSpeed) {
      dom.workerMetricSpeed.textContent = `${payload.speed.toLocaleString()} /s`;
    }
    if (dom.workerMetricElapsed) {
      dom.workerMetricElapsed.textContent = `${payload.elapsed}s`;
    }
    if (dom.workerMetricSize) {
      const mb = (payload.sizeBytes / (1024 * 1024)).toFixed(2);
      dom.workerMetricSize.textContent = `${mb} MB`;
    }
  }

  function updateWorkerButtons() {
    const isRunning = state.workerState === 'RUNNING';
    const isPaused = state.workerState === 'PAUSED';

    if (dom.btnWorkerStart) dom.btnWorkerStart.disabled = isRunning || isPaused;
    if (dom.btnWorkerPause) dom.btnWorkerPause.disabled = !isRunning;
    if (dom.btnWorkerResume) dom.btnWorkerResume.disabled = !isPaused;
    if (dom.btnWorkerStop) dom.btnWorkerStop.disabled = !isRunning && !isPaused;
  }

  function finishWorkerRun(preview) {
    const passwords = state.workerChunks.length > 0 ? state.workerChunks : (preview || []);
    if (passwords.length > 0) {
      setHeroPassword(passwords[0], 'Matrix');
      renderTerminal(passwords);
    }
  }

  function setupWorkerControls() {
    initWorker();

    if (dom.workerMode && dom.workerCustomCharsGroup) {
      dom.workerMode.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          dom.workerCustomCharsGroup.style.display = 'flex';
        } else {
          dom.workerCustomCharsGroup.style.display = 'none';
        }
      });
    }

    if (dom.btnWorkerStart) {
      dom.btnWorkerStart.addEventListener('click', () => {
        startWorkerMatrix();
      });
    }

    if (dom.btnWorkerPause) {
      dom.btnWorkerPause.addEventListener('click', () => {
        sendWorkerMessage({ type: 'PAUSE' });
      });
    }

    if (dom.btnWorkerResume) {
      dom.btnWorkerResume.addEventListener('click', () => {
        sendWorkerMessage({ type: 'RESUME' });
      });
    }

    if (dom.btnWorkerStop) {
      dom.btnWorkerStop.addEventListener('click', () => {
        sendWorkerMessage({ type: 'STOP' });
      });
    }
  }

  function startWorkerMatrix() {
    const count = parseInt(dom.workerCount ? dom.workerCount.value : 50000, 10) || 50000;
    const minLength = parseInt(dom.workerMinLen ? dom.workerMinLen.value : 8, 10) || 8;
    const maxLength = parseInt(dom.workerMaxLen ? dom.workerMaxLen.value : 10, 10) || 10;
    const mode = dom.workerMode ? dom.workerMode.value : 'num_sym';
    const customChars = dom.workerCustomChars ? dom.workerCustomChars.value : '';

    if (mode === 'custom' && !customChars) {
      showToast('Enter custom characters for the Matrix Engine!', 'warning');
      if (dom.workerCustomChars) dom.workerCustomChars.focus();
      return;
    }

    state.workerChunks = [];
    state.workerTotalCount = count;

    if (dom.workerProgressBar) dom.workerProgressBar.style.width = '0%';
    if (dom.workerProgressVal) dom.workerProgressVal.textContent = '0%';
    if (dom.workerMetricGenerated) dom.workerMetricGenerated.textContent = '0';
    if (dom.workerMetricSpeed) dom.workerMetricSpeed.textContent = '0 /s';
    if (dom.workerMetricElapsed) dom.workerMetricElapsed.textContent = '0.00s';
    if (dom.workerMetricSize) dom.workerMetricSize.textContent = '0.00 MB';

    sendWorkerMessage({
      type: 'START',
      payload: {
        count,
        minLength,
        maxLength,
        mode,
        customChars,
        batchSize: 5000,
        emitBatch: true
      }
    });
  }

  /**
   * Regenerate single password using currently active tab configuration
   */
  function regenerateActiveMode() {
    if (state.activeTab === 'csprng') {
      generateCsprng();
    } else if (state.activeTab === 'targeted') {
      generateTargeted();
    } else if (state.activeTab === 'passphrase') {
      generatePassphrase();
    } else if (state.activeTab === 'wordlist') {
      startWorkerMatrix();
    }
  }

  // =========================================================================
  // BOOTSTRAP INITIALIZATION
  // =========================================================================

  function initApp() {
    initDomElements();
    setupTabs();
    setupStrengthMeter();
    setupTerminalActions();
    setupHistoryModal();
    setupCsprngGenerator();
    setupTargetedGenerator();
    setupPassphraseGenerator();
    setupWorkerControls();

    // Generate initial showcase password on startup
    try {
      if (typeof CryptoPasswordGenerator !== 'undefined') {
        const initialPw = CryptoPasswordGenerator.generateOne({ length: 16 });
        setHeroPassword(initialPw, 'CSPRNG');
        renderTerminal([initialPw]);
      }
    } catch (e) {
      console.warn('Initial password auto-generation skipped:', e);
    }
  }

  // Expose global coordinator for external scripting and integration tests
  const AppController = {
    state,
    dom,
    init: initApp,
    initDomElements,
    showToast,
    copyToClipboard,
    switchTab,
    updateStrengthMeter,
    setHeroPassword,
    renderTerminal,
    exportData,
    generateCsprng,
    generateTargeted,
    generatePassphrase,
    startWorkerMatrix
  };

  if (typeof window !== 'undefined') {
    window.AppController = AppController;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.AppController = AppController;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppController;
  }
})();
