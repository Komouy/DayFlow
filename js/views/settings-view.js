/**
 * DayFlow Settings View Component
 * Handles User Settings, Gemini Model selection, Audio/Advance configurations, and Data Backup/Restore.
 */

import { state, getLocalDateString } from '../state.js';
import { renderIcons } from '../icons.js';
import { notifications } from '../notifications.js';
import { springBounce, particleBurst } from '../animations.js';
import { escapeHtml } from '../utils/helpers.js';
import { GeminiService } from '../gemini.js';
import { APP_CONFIG } from '../config.js';

export const settingsViewMethods = {
  // --- 5. Settings View ---
  renderSettingsView() {
    const settings = state.getSettings();
    const provider = settings.aiProvider || 'gemini';
    const apiInput = document.getElementById('setting-api-key');
    const modelSelect = document.getElementById('setting-model');
    const advanceInput = document.getElementById('setting-advance');
    const soundToggle = document.getElementById('setting-sound');
    const toneSelect = document.getElementById('setting-sound-tone');
    const proactiveToggle = document.getElementById('setting-proactive');
    const providerInput = document.getElementById('setting-ai-provider');
    const groqInput = document.getElementById('setting-groq-api-key') || document.getElementById('setting-grok-api-key');

    if (providerInput) providerInput.value = provider;
    if (apiInput) apiInput.value = settings.apiKey || '';
    if (groqInput) groqInput.value = settings.groqApiKey || settings.grokApiKey || '';
    if (modelSelect) modelSelect.value = settings.geminiModel || APP_CONFIG.DEFAULT_MODEL || 'gemini-2.5-flash';
    if (advanceInput) advanceInput.value = settings.notifyAdvanceMinutes || 15;

    // Sync AI Provider Switcher UI & Active Panels
    document.querySelectorAll('#ai-provider-switcher button').forEach(btn => {
      const p = btn.getAttribute('data-provider');
      btn.classList.toggle('is-active', p === provider);
    });

    const geminiPanel = document.getElementById('ai-panel-gemini');
    const groqPanel = document.getElementById('ai-panel-groq');
    if (geminiPanel) geminiPanel.classList.toggle('hidden', provider !== 'gemini');
    if (groqPanel) groqPanel.classList.toggle('hidden', provider !== 'groq');

    // Sync AI Architecture Status Badge
    const badgeEl = document.getElementById('central-ai-status-badge');
    if (badgeEl) {
      if (provider === 'groq') {
        const hasGroqKey = Boolean(settings.groqApiKey || settings.grokApiKey);
        if (hasGroqKey) {
          badgeEl.style.background = 'rgba(14, 165, 233, 0.12)';
          badgeEl.style.color = '#0ea5e9';
          badgeEl.style.borderColor = 'rgba(14, 165, 233, 0.25)';
          badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#0ea5e9; display:inline-block;"></span> Groq Pribadi Aktif`;
        } else if (GeminiService.isAiReady()) {
          badgeEl.style.background = 'rgba(34, 197, 94, 0.12)';
          badgeEl.style.color = '#22c55e';
          badgeEl.style.borderColor = 'rgba(34, 197, 94, 0.25)';
          badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#22c55e; display:inline-block;"></span> Groq Gateway Siap`;
        } else {
          badgeEl.style.background = 'rgba(239, 68, 68, 0.12)';
          badgeEl.style.color = '#ef4444';
          badgeEl.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#ef4444; display:inline-block;"></span> Belum Terhubung`;
        }
      } else {
        if (settings.apiKey) {
          badgeEl.style.background = 'rgba(234, 88, 12, 0.12)';
          badgeEl.style.color = '#ea580c';
          badgeEl.style.borderColor = 'rgba(234, 88, 12, 0.25)';
          badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#ea580c; display:inline-block;"></span> Gemini Key Aktif`;
        } else if (GeminiService.isAiReady()) {
          badgeEl.style.background = 'rgba(34, 197, 94, 0.12)';
          badgeEl.style.color = '#22c55e';
          badgeEl.style.borderColor = 'rgba(34, 197, 94, 0.25)';
          badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#22c55e; display:inline-block;"></span> Gemini Gateway Siap`;
        } else {
          badgeEl.style.background = 'rgba(239, 68, 68, 0.12)';
          badgeEl.style.color = '#ef4444';
          badgeEl.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#ef4444; display:inline-block;"></span> Belum Terhubung`;
        }
      }
    }

    if (soundToggle) soundToggle.checked = settings.soundEnabled !== false;
    if (toneSelect) toneSelect.value = settings.soundTone || 'crystal';
    if (proactiveToggle) proactiveToggle.checked = settings.proactiveReminders !== false;
    const systemNotifToggle = document.getElementById('setting-system-notif');
    if (systemNotifToggle) systemNotifToggle.checked = settings.systemNotificationsEnabled !== false;

    // Sync Notification Permission Badge & Controls
    this.updateNotificationPermissionUI();

    // Sync Theme Pills
    const currentTheme = settings.theme || 'dark';
    const themeRadio = document.querySelector(`input[name="setting-theme"][value="${currentTheme}"]`);
    if (themeRadio) themeRadio.checked = true;
    document.querySelectorAll('.settings-theme-pill').forEach(pill => {
      const radio = pill.querySelector('input');
      pill.classList.toggle('is-active', radio && radio.value === currentTheme);
    });

    // Sync custom Segmented Chips for Advance Minutes
    const advanceVal = parseInt(settings.notifyAdvanceMinutes || 15, 10);
    document.querySelectorAll('.segmented-chip').forEach(chip => {
      const val = parseInt(chip.getAttribute('data-advance-val'), 10);
      chip.classList.toggle('is-active', val === advanceVal);
    });

    // Sync custom Tone Picker Cards
    const currentTone = settings.soundTone || 'crystal';
    document.querySelectorAll('.tone-picker-item').forEach(item => {
      const val = item.getAttribute('data-tone-val');
      item.classList.toggle('is-active', val === currentTone);
    });

    // Sync Model descriptions
    this.updateModelPickerUI(settings.geminiModel || 'gemini-2.5-flash');

    // Sync Profile & Hero Banner Settings
    this.renderBannerSettings(settings);

    // Sync Profile Productivity & Daily Rekap
    this.renderProfileProductivity();

    // Sync Flexible Categories Preview
    this.renderSettingsCategoriesPreview();
  },

  updateModelPickerUI(modelId = 'gemini-2.5-flash') {
    const hiddenInput = document.getElementById('setting-model');
    if (hiddenInput && hiddenInput.value !== modelId) hiddenInput.value = modelId;

    const descEl = document.getElementById('current-model-desc');
    if (descEl) descEl.textContent = 'Penalaran jadwal presisi, hemat kuota token & latensi rendah';
  },

  handleSaveSettings(e) {
    e.preventDefault();
    const providerInput = document.getElementById('setting-ai-provider');
    const apiInput = document.getElementById('setting-api-key');
    const groqInput = document.getElementById('setting-groq-api-key') || document.getElementById('setting-grok-api-key');
    const modelSelect = document.getElementById('setting-model');
    const advanceInput = document.getElementById('setting-advance');
    const soundToggle = document.getElementById('setting-sound');
    const toneSelect = document.getElementById('setting-sound-tone');
    const proactiveToggle = document.getElementById('setting-proactive');
    const selectedTone = toneSelect ? toneSelect.value : 'crystal';
    const themeValue = document.querySelector('input[name="setting-theme"]:checked')?.value || 'dark';
    const submitBtn = document.querySelector('#settings-form button[type="submit"]');

    const userNameInput = document.getElementById('setting-user-name');
    const bannerQuoteInput = document.getElementById('setting-banner-quote');
    const bannerUrlInput = document.getElementById('setting-banner-url');
    const bannerEnabledToggle = document.getElementById('setting-banner-enabled');
    const systemNotifToggle = document.getElementById('setting-system-notif');

    const selectedProvider = providerInput ? providerInput.value : 'gemini';
    const groqKey = groqInput ? groqInput.value.trim() : '';

    state.updateSettings({
      userName: userNameInput ? userNameInput.value.trim() : '',
      heroBannerEnabled: bannerEnabledToggle ? bannerEnabledToggle.checked : false,
      hasConfiguredBanner: (bannerEnabledToggle && bannerEnabledToggle.checked) || state.getSettings().hasConfiguredBanner || false,
      heroBannerQuote: bannerQuoteInput ? bannerQuoteInput.value.trim() : 'Fokus pada hal penting hari ini.',
      heroBannerUrl: bannerUrlInput ? bannerUrlInput.value.trim() : '',
      aiProvider: selectedProvider,
      apiKey: apiInput ? apiInput.value.trim() : '',
      groqApiKey: groqKey,
      grokApiKey: groqKey,
      geminiModel: modelSelect ? modelSelect.value : 'gemini-2.5-flash',
      notifyAdvanceMinutes: parseInt(advanceInput ? advanceInput.value : '15', 10) || 15,
      soundEnabled: soundToggle ? soundToggle.checked : true,
      soundTone: selectedTone,
      proactiveReminders: proactiveToggle ? proactiveToggle.checked : true,
      systemNotificationsEnabled: systemNotifToggle ? systemNotifToggle.checked : true,
      theme: themeValue
    });

    this.applyTheme(themeValue);

    // 1. Show prominent inline Alert Banner in Settings
    const alertBanner = document.getElementById('settings-save-alert');
    if (alertBanner) {
      alertBanner.classList.remove('hidden');
      renderIcons(alertBanner);
      if (this._settingsAlertTimer) clearTimeout(this._settingsAlertTimer);
      this._settingsAlertTimer = setTimeout(() => {
        alertBanner.classList.add('hidden');
      }, 6000);
    }

    // 2. Play acoustic chime with chosen melody if sound is enabled
    notifications.playChime(selectedTone);

    // 3. Show floating toast notification
    notifications.showToast('Pengaturan berhasil disimpan.', 'success');

    // 4. Spring bounce & particle burst on submit button
    if (submitBtn) {
      springBounce(submitBtn);
      particleBurst(submitBtn, 'var(--status-success)');
    }

    // 5. Scroll smoothly up so the user immediately sees the alert banner
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainViewport = document.querySelector('.main-viewport');
    if (mainViewport) {
      mainViewport.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  async handleTestApiKey() {
    const currentProvider = state.getSettings().aiProvider || 'gemini';
    if (currentProvider === 'groq') {
      return this.handleTestGroqApiKey();
    }

    const apiKey = document.getElementById('setting-api-key')?.value.trim();
    const testBtn = document.getElementById('btn-test-api');
    const orig = testBtn.innerHTML;
    testBtn.disabled = true;
    testBtn.innerHTML = `<span class="spinner"></span> Menguji...`;

    try {
      if (apiKey) {
        // Test user's personal key
        const res = await GeminiService.testConnection(apiKey);
        state.updateSettings({ apiKey, geminiModel: res.model || 'gemini-2.5-flash' });
        this.renderSettingsView();
        notifications.showToast(`Gemini API Key pribadi valid & aktif! (${res.model})`, 'success', 5000);
      } else if (GeminiService.isAiReady()) {
        // Test centralized AI / proxy
        const res = await GeminiService.testConnection(null);
        const modeTitle = res.mode === 'proxy' ? 'Serverless Gateway' : 'AI Terpusat';
        this.renderSettingsView();
        notifications.showToast(`Koneksi ${modeTitle} berhasil & siap digunakan! (${res.model})`, 'success', 5000);
      } else {
        notifications.showToast('Belum ada Serverless Gateway atau API Key yang dihubungkan.', 'warning', 5000);
      }
    } catch (err) {
      notifications.showToast(`Uji Gemini gagal: ${err.message}`, 'error', 6000);
    } finally {
      testBtn.disabled = false;
      testBtn.innerHTML = orig;
      renderIcons(testBtn);
    }
  },

  handleClearSavedApiKey() {
    state.updateSettings({ apiKey: '' });
    const apiInput = document.getElementById('setting-api-key');
    if (apiInput) apiInput.value = '';
    this.renderSettingsView();
    notifications.showToast('Gemini API Key pribadi telah dihapus.', 'success', 5000);
  },

  async handleTestGroqApiKey() {
    const groqInput = document.getElementById('setting-groq-api-key') || document.getElementById('setting-grok-api-key');
    const groqKey = groqInput ? groqInput.value.trim() : '';
    const testBtn = document.getElementById('btn-test-groq-api') || document.getElementById('btn-test-grok-api') || document.getElementById('btn-test-api');
    const orig = testBtn ? testBtn.innerHTML : '';
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.innerHTML = `<span class="spinner"></span> Menguji...`;
    }

    try {
      const res = await GeminiService.testGroqConnection(groqKey);
      if (groqKey) {
        state.updateSettings({ groqApiKey: groqKey, grokApiKey: groqKey });
      }
      this.renderSettingsView();
      notifications.showToast(`Koneksi ${res.provider || 'Groq'} valid & siap digunakan! (${res.model})`, 'success', 5000);
    } catch (err) {
      notifications.showToast(`Uji Groq gagal: ${err.message}`, 'error', 6000);
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.innerHTML = orig;
        renderIcons(testBtn);
      }
    }
  },

  handleClearGroqApiKey() {
    state.updateSettings({ groqApiKey: '', grokApiKey: '' });
    const groqInput = document.getElementById('setting-groq-api-key') || document.getElementById('setting-grok-api-key');
    if (groqInput) groqInput.value = '';
    this.renderSettingsView();
    notifications.showToast('Groq API Key telah dihapus.', 'success', 5000);
  },

  // Backward compatibility aliases
  handleTestGrokApiKey() {
    return this.handleTestGroqApiKey();
  },

  handleClearGrokApiKey() {
    return this.handleClearGroqApiKey();
  },

  handleExportData() {
    const backup = {
      version: 1,
      timestamp: Date.now(),
      schedules: state.schedules,
      notes: state.notes,
      categories: state.getCategories(),
      dailyLogs: state.dailyLogs,
      settings: { ...state.settings, apiKey: '' } // don't export plain secret
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DayFlow_Backup_${getLocalDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notifications.showToast('Data berhasil diekspor.', 'success');
  },

  handleImportData(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.schedules && Array.isArray(parsed.schedules)) {
          localStorage.setItem('dayflow_schedules_v1', JSON.stringify(parsed.schedules));
        }
        if (parsed.notes && Array.isArray(parsed.notes)) {
          localStorage.setItem('dayflow_notes_v1', JSON.stringify(parsed.notes));
        }
        if (parsed.categories && Array.isArray(parsed.categories)) {
          localStorage.setItem('dayflow_categories_v1', JSON.stringify(parsed.categories));
        }
        if (parsed.dailyLogs && Array.isArray(parsed.dailyLogs)) {
          localStorage.setItem('dayflow_daily_logs_v1', JSON.stringify(parsed.dailyLogs));
        }
        if (parsed.settings && typeof parsed.settings === 'object' && !Array.isArray(parsed.settings)) {
          const currentSettings = state.getSettings();
          const merged = {
            ...currentSettings,
            ...parsed.settings,
            apiKey: parsed.settings.apiKey || currentSettings.apiKey || ''
          };
          localStorage.setItem('dayflow_settings_v1', JSON.stringify(merged));
        }
        notifications.showToast('Data berhasil dipulihkan. Memuat ulang...', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        notifications.showToast('File JSON tidak valid.', 'error');
      }
    };
    reader.readAsText(file);
  },

  renderSettingsCategoriesPreview() {
    const previewEl = document.getElementById('settings-categories-preview');
    if (!previewEl) return;

    const categories = state.getCategories();
    let html = '';

    categories.forEach(cat => {
      html += `
        <span class="category-badge-chip" style="background-color:${cat.color}1a; color:${cat.color}; border:1px solid ${cat.color}35;">
          <span style="width:6px; height:6px; border-radius:50%; background-color:${cat.color}; display:inline-block;"></span>
          ${escapeHtml(cat.name)}
        </span>
      `;
    });

    previewEl.innerHTML = html;
  },

  updateNotificationPermissionUI() {
    const badge = document.getElementById('notif-permission-badge');
    const desc = document.getElementById('notif-permission-desc');
    const actionRow = document.getElementById('notif-permission-action-row');
    const enableBtn = document.getElementById('btn-enable-system-notif');
    const statusText = document.getElementById('notif-action-status-text');

    const perm = notifications.getPermissionStatus();

    if (badge) {
      if (perm === 'granted') {
        badge.style.background = 'rgba(34, 197, 94, 0.12)';
        badge.style.color = '#22c55e';
        badge.style.borderColor = 'rgba(34, 197, 94, 0.25)';
        badge.textContent = '● Aktif & Disetujui';
        if (actionRow) actionRow.style.display = 'none';
        if (desc) desc.textContent = 'DayFlow memiliki izin penuh untuk memunculkan pop-up jadwal di layar dan status bar peramban.';
      } else if (perm === 'denied') {
        badge.style.background = 'rgba(239, 68, 68, 0.12)';
        badge.style.color = '#ef4444';
        badge.style.borderColor = 'rgba(239, 68, 68, 0.25)';
        badge.textContent = '● Diblokir Browser';
        if (actionRow) actionRow.style.display = 'flex';
        if (enableBtn) enableBtn.style.display = 'none';
        if (statusText) statusText.innerHTML = 'Izin notifikasi diblokir browser. Klik ikon gembok pada bilah URL, lalu ubah <b>Notifikasi</b> menjadi <b>Izinkan</b>.';
        if (desc) desc.textContent = 'Browser memblokir pop-up notifikasi. Silakan buka izin pada bilah alamat web.';
      } else if (perm === 'unsupported') {
        badge.style.background = 'rgba(148, 163, 184, 0.12)';
        badge.style.color = '#94a3b8';
        badge.style.borderColor = 'rgba(148, 163, 184, 0.25)';
        badge.textContent = '● Tidak Didukung';
        if (actionRow) actionRow.style.display = 'none';
        if (desc) desc.textContent = 'Peramban ini tidak mendukung Web Notifications API standar.';
      } else {
        // default / belum diizinkan
        badge.style.background = 'rgba(245, 158, 11, 0.12)';
        badge.style.color = '#f59e0b';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.25)';
        badge.textContent = '● Belum Diaktifkan';
        if (actionRow) actionRow.style.display = 'flex';
        if (enableBtn) {
          enableBtn.style.display = 'inline-flex';
        }
        if (statusText) statusText.textContent = 'Klik "Izinkan Notifikasi" agar pengingat agenda harian bisa tampil di luar peramban.';
      }
      renderIcons(actionRow || document);
    }
  },

  renderProfileProductivity() {
    const card = document.getElementById('profile-productivity-card');
    if (!card) return;

    const settings = state.getSettings();
    const stats = state.getProfileProductivityStats();
    const nameEl = document.getElementById('profile-card-name');
    if (nameEl) {
      nameEl.textContent = settings.userName ? `Profil ${escapeHtml(settings.userName)}` : 'Profil Pengguna';
    }

    const statInputted = document.getElementById('stat-today-inputted');
    const statCompleted = document.getElementById('stat-today-completed');
    const statPercent = document.getElementById('stat-today-percent');
    const statStreak = document.getElementById('stat-perfect-streak');

    if (statInputted) statInputted.textContent = stats.todayTotal;
    if (statCompleted) statCompleted.textContent = stats.todayCompleted;
    if (statPercent) statPercent.textContent = `${stats.todayPercent}%`;
    if (statStreak) statStreak.textContent = stats.perfectDays;

    // Render Daily History List
    const historyList = document.getElementById('profile-history-list');
    if (!historyList) return;

    const logs = state.getDailyLogs(10);
    if (!logs || logs.length === 0) {
      historyList.innerHTML = `
        <div class="profile-history-empty text-xs text-muted" style="padding: 12px 0;">
          Belum ada riwayat tercatat. Rekap hari ini akan tersimpan otomatis setiap pukul 24:00.
        </div>
      `;
      return;
    }

    let html = '';
    logs.forEach(log => {
      const isToday = log.date === getLocalDateString();
      const dateObj = new Date(log.date + 'T00:00:00');
      const dateLabel = isToday
        ? 'Hari Ini'
        : dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

      let badgeClass = 'badge-muted';
      let badgeText = 'Istirahat';
      if (log.totalScheduled > 0) {
        if (log.percentage === 100) {
          badgeClass = 'badge-success';
          badgeText = '100% Tuntas';
        } else {
          badgeClass = 'badge-warning';
          badgeText = `${log.completedCount}/${log.totalScheduled} Selesai`;
        }
      }

      html += `
        <div class="profile-history-item ${isToday ? 'is-today' : ''}">
          <div class="profile-history-info">
            <span class="profile-history-date tabular-nums">${escapeHtml(dateLabel)}</span>
            <span class="profile-history-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="profile-history-track">
            <div class="profile-history-fill ${log.percentage === 100 ? 'is-perfect' : ''}" style="width: ${log.percentage}%;"></div>
          </div>
          <span class="profile-history-percent tabular-nums font-mono">${log.percentage}%</span>
        </div>
      `;
    });

    historyList.innerHTML = html;
  }
};
