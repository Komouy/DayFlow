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
    const apiInput = document.getElementById('setting-api-key');
    const modelSelect = document.getElementById('setting-model');
    const advanceInput = document.getElementById('setting-advance');
    const soundToggle = document.getElementById('setting-sound');
    const toneSelect = document.getElementById('setting-sound-tone');
    const proactiveToggle = document.getElementById('setting-proactive');

    if (apiInput) apiInput.value = settings.apiKey || '';
    if (modelSelect) modelSelect.value = settings.geminiModel || APP_CONFIG.DEFAULT_MODEL || 'gemini-2.0-flash';
    if (advanceInput) advanceInput.value = settings.notifyAdvanceMinutes || 15;

    // Sync Centralized AI Architecture Status Badge
    const badgeEl = document.getElementById('central-ai-status-badge');
    if (badgeEl) {
      if (settings.apiKey) {
        badgeEl.style.background = 'rgba(234, 88, 12, 0.12)';
        badgeEl.style.color = '#ea580c';
        badgeEl.style.borderColor = 'rgba(234, 88, 12, 0.25)';
        badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#ea580c; display:inline-block;"></span> Key Pribadi Aktif`;
      } else if (GeminiService.isAiReady()) {
        badgeEl.style.background = 'rgba(34, 197, 94, 0.12)';
        badgeEl.style.color = '#22c55e';
        badgeEl.style.borderColor = 'rgba(34, 197, 94, 0.25)';
        badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#22c55e; display:inline-block;"></span> AI Terpusat Siap`;
      } else {
        badgeEl.style.background = 'rgba(239, 68, 68, 0.12)';
        badgeEl.style.color = '#ef4444';
        badgeEl.style.borderColor = 'rgba(239, 68, 68, 0.25)';
        badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#ef4444; display:inline-block;"></span> Belum Terhubung`;
      }
    }
    if (soundToggle) soundToggle.checked = settings.soundEnabled !== false;
    if (toneSelect) toneSelect.value = settings.soundTone || 'crystal';
    if (proactiveToggle) proactiveToggle.checked = settings.proactiveReminders !== false;

    const themeRadio = document.querySelector(`input[name="setting-theme"][value="${settings.theme || 'dark'}"]`);
    if (themeRadio) themeRadio.checked = true;

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

    // Sync custom Gemini Model Picker Trigger & Bottom Sheet Options
    this.updateModelPickerUI(settings.geminiModel || 'gemini-3.8-flash');

    // Sync Profile & Hero Banner Settings
    this.renderBannerSettings(settings);

    // Sync Flexible Categories Preview
    this.renderSettingsCategoriesPreview();
  },

  updateModelPickerUI(modelId) {
    const hiddenInput = document.getElementById('setting-model');
    if (hiddenInput) hiddenInput.value = modelId;

    const modelMeta = {
      'gemini-3.8-flash': {
        name: 'Gemini 3.8 Flash',
        desc: 'Paling Cerdas & Cepat — Direkomendasikan'
      },
      'gemini-3.5-flash-lite': {
        name: 'Gemini 3.5 Flash-Lite',
        desc: 'Super Cepat & Hemat Kuota'
      },
      'gemini-3.6-flash': {
        name: 'Gemini 3.6 Flash',
        desc: 'Stabil & Seimbang'
      },
      'gemini-2.5-flash': {
        name: 'Gemini 2.5 Flash',
        desc: 'High Volume Reasoning'
      },
      'gemini-4-argon': {
        name: 'Gemini 4 Argon',
        desc: 'Flagship Reasoning 1M Context'
      }
    };

    const meta = modelMeta[modelId] || { name: modelId, desc: 'Model Gemini' };
    const nameEl = document.getElementById('current-model-name');
    const descEl = document.getElementById('current-model-desc');
    if (nameEl) nameEl.textContent = meta.name;
    if (descEl) descEl.textContent = meta.desc;

    document.querySelectorAll('.model-picker-option').forEach(opt => {
      const id = opt.getAttribute('data-model-id');
      opt.classList.toggle('is-active', id === modelId);
    });
  },

  handleSaveSettings(e) {
    e.preventDefault();
    const apiInput = document.getElementById('setting-api-key');
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

    state.updateSettings({
      userName: userNameInput ? userNameInput.value.trim() : '',
      heroBannerEnabled: bannerEnabledToggle ? bannerEnabledToggle.checked : false,
      hasConfiguredBanner: (bannerEnabledToggle && bannerEnabledToggle.checked) || state.getSettings().hasConfiguredBanner || false,
      heroBannerQuote: bannerQuoteInput ? bannerQuoteInput.value.trim() : 'Fokus pada hal penting hari ini.',
      heroBannerUrl: bannerUrlInput ? bannerUrlInput.value.trim() : '',
      apiKey: apiInput ? apiInput.value.trim() : '',
      geminiModel: modelSelect ? modelSelect.value : 'gemini-3.8-flash',
      notifyAdvanceMinutes: parseInt(advanceInput ? advanceInput.value : '15', 10) || 15,
      soundEnabled: soundToggle ? soundToggle.checked : true,
      soundTone: selectedTone,
      proactiveReminders: proactiveToggle ? proactiveToggle.checked : true,
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
    const apiKey = document.getElementById('setting-api-key')?.value.trim();
    const testBtn = document.getElementById('btn-test-api');
    const orig = testBtn.innerHTML;
    testBtn.disabled = true;
    testBtn.innerHTML = `<span class="spinner"></span> Menguji...`;

    try {
      if (apiKey) {
        // Test user's personal key
        const res = await GeminiService.testConnection(apiKey);
        state.updateSettings({ apiKey, geminiModel: res.model });
        this.renderSettingsView();
        notifications.showToast(`API Key pribadi valid dan tersimpan! (${res.model})`, 'success', 5000);
      } else if (GeminiService.isAiReady()) {
        // Test centralized AI / proxy
        const res = await GeminiService.testConnection(null);
        const modeTitle = res.mode === 'proxy' ? 'Serverless AI Proxy' : 'AI Terpusat';
        this.renderSettingsView();
        notifications.showToast(`Koneksi ${modeTitle} berhasil & siap digunakan! (${res.model})`, 'success', 5000);
      } else {
        notifications.showToast('Belum ada Serverless Proxy atau API Key yang dihubungkan.', 'warning', 5000);
      }
    } catch (err) {
      notifications.showToast(`Uji gagal: ${err.message}`, 'error', 6000);
    } finally {
      testBtn.disabled = false;
      testBtn.innerHTML = orig;
      renderIcons();
    }
  },

  handleExportData() {
    const backup = {
      version: 1,
      timestamp: Date.now(),
      schedules: state.schedules,
      notes: state.notes,
      categories: state.getCategories(),
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
  }
};
