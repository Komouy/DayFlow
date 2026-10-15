/**
 * DayFlow Main Application Controller (Orchestrator)
 * Coordinates routing, event bindings, themes, and delegates to modular view/component controllers.
 * Anti-Slop: Strict UX speed, 1-to-3 rule, 0 emojis, responsive linearity.
 */

import { state, getLocalDateString } from './state.js';
import { getIcon, renderIcons } from './icons.js';
import { notifications } from './notifications.js';
import { springBounce } from './animations.js';

// Modular view & component controllers
import { helperMethods } from './utils/helpers.js';
import { confirmDialogMethods } from './components/confirm-dialog.js';
import { modalMethods } from './components/modals.js';
import { todayViewMethods } from './views/today-view.js';
import { scheduleViewMethods } from './views/schedule-view.js';
import { aiPlanViewMethods } from './views/ai-plan-view.js';
import { notesViewMethods } from './views/notes-view.js';
import { settingsViewMethods } from './views/settings-view.js';

class AppController {
  constructor() {
    this.currentTab = 'today';
    this.selectedScheduleDate = getLocalDateString();
    this.selectedCategory = 'all';
    this.activeModal = null;
    this.editingScheduleId = null;
    this.editingNoteId = null;
    this.pendingAiSchedules = [];
    this._activeBannerBlobUrl = null;
    this._settingsAlertTimer = null;

    // Assign global references immediately to guarantee zero-latency button response
    window.dayflowApp = this;
    window._actualDayflowApp = this;
  }

  init() {
    try {
      this.applyTheme(state.getSettings().theme || 'dark');
      this.setupThemeListener();
      notifications.init();
      this.bindEvents();
      this.render();
      window.__dayflow_ready = true;

      // Flush early buffered clicks if any
      if (Array.isArray(window._dfBuffer) && window._dfBuffer.length > 0) {
        const queue = [...window._dfBuffer];
        window._dfBuffer = [];
        queue.forEach(([action, arg]) => {
          try {
            if (typeof this[action] === 'function') this[action](arg);
          } catch (e) {}
        });
      }
    } catch (err) {
      console.error('App init error, running fallback render:', err);
      try {
        this.render();
      } catch (e) {
        console.error('Fallback render error:', e);
      }
      renderIcons();
    }

    // Subscribe to state changes
    state.subscribe((event, data) => {
      this.handleStateUpdate(event, data);
    });

    // PWA Service Worker Registration
    this.registerServiceWorker();
  }

  applyTheme(theme) {
    let activeTheme = theme;
    if (theme === 'system') {
      const isSystemLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      activeTheme = isSystemLight ? 'light' : 'dark';
    }

    if (activeTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Update <meta name="theme-color"> for browser chrome & mobile status bar
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', activeTheme === 'light' ? '#f8f9fa' : '#0e0f12');
    }

    // Update quick toggle button icon & tooltip in header
    const toggleBtn = document.getElementById('btn-toggle-theme');
    if (toggleBtn) {
      const isLight = activeTheme === 'light';
      toggleBtn.setAttribute('title', isLight ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang');
      toggleBtn.setAttribute('aria-label', isLight ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang');
      toggleBtn.innerHTML = getIcon(isLight ? 'moon' : 'sun', '', 18);
    }

    // Synchronize radio buttons if present
    const radio = document.querySelector(`input[name="setting-theme"][value="${theme}"]`);
    if (radio) {
      radio.checked = true;
    }
  }

  setupThemeListener() {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
        const currentSetting = state.getSettings().theme || 'dark';
        if (currentSetting === 'system') {
          this.applyTheme('system');
        }
      });
    }
  }

  registerServiceWorker() {
    // Service Worker is registered cleanly in index.html with zero reload loops
  }

  bindEvents() {
    // Hero Banner & Profile Settings Event Delegation
    this.bindBannerSettingsEvents();

    // Bottom navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-target');
        this.switchTab(targetTab);
      });
    });

    // Brand header click & keyboard listener (navigates to Today view)
    const brandLink = document.getElementById('brand-header-link');
    if (brandLink) {
      brandLink.addEventListener('click', () => {
        springBounce(brandLink);
        this.switchTab('today');
      });
      brandLink.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          springBounce(brandLink);
          this.switchTab('today');
        }
      });
    }

    // Floating Action Button
    const fabBtn = document.getElementById('fab-quick-add');
    if (fabBtn) {
      fabBtn.addEventListener('click', () => {
        springBounce(fabBtn);
        if (this.currentTab === 'notes') {
          this.openNoteModal();
        } else {
          this.openScheduleModal();
        }
      });
    }

    // Modal close overlay clicks & touch
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      const handleClose = (e) => {
        if (e.target === overlay) {
          e.preventDefault();
          this.closeAllModals();
        }
      };
      overlay.addEventListener('click', handleClose);
      overlay.addEventListener('touchend', handleClose, { passive: false });
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
        return;
      }
      // Quick add shortcut: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (this.currentTab === 'notes') {
          this.openNoteModal();
        } else {
          this.openScheduleModal();
        }
      }
    });

    // Schedule form submission
    const scheduleForm = document.getElementById('schedule-form');
    if (scheduleForm) {
      scheduleForm.addEventListener('submit', (e) => this.handleSaveSchedule(e));
    }

    // Note form submission
    const noteForm = document.getElementById('note-form');
    if (noteForm) {
      noteForm.addEventListener('submit', (e) => this.handleSaveNote(e));
    }

    // Settings form
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
    }

    // AI Chat submission
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => this.handleSendChatMessage(e));
    }

    // AI Schedule Extraction button & auto-save toggle
    const aiParseBtn = document.getElementById('btn-parse-ai-schedule');
    const autoSaveCheckbox = document.getElementById('ai-auto-save-schedule');
    if (aiParseBtn) {
      aiParseBtn.addEventListener('click', () => this.handleAiScheduleExtraction());
    }
    if (autoSaveCheckbox && aiParseBtn) {
      autoSaveCheckbox.addEventListener('change', () => {
        const isAuto = autoSaveCheckbox.checked;
        aiParseBtn.innerHTML = `
          <span data-icon="calendar" data-icon-size="14"></span>
          ${isAuto ? 'Ekstrak & Simpan ke Jadwal' : 'Ekstrak Jadwal (Pratinjau)'}
        `;
        renderIcons(aiParseBtn);
      });
    }

    // Quick prompt chips
    document.querySelectorAll('.prompt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        const chatInput = document.getElementById('chat-input');
        if (chatInput && prompt) {
          chatInput.value = prompt;
          chatInput.focus();
        }
      });
    });

    // Request notification permission button
    const notifBtn = document.getElementById('btn-request-notif');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        notifications.requestPermission();
      });
    }

    // Audio preview and test chime button
    const testAudioBtn = document.getElementById('btn-test-chime');
    if (testAudioBtn) {
      testAudioBtn.addEventListener('click', () => {
        const toneInput = document.getElementById('setting-sound-tone');
        const selectedTone = toneInput ? toneInput.value : 'crystal';
        notifications.playChime(selectedTone);
        const toneNames = {
          crystal: 'Crystal Bell',
          marimba: 'Marimba',
          digital: 'Digital Pulse'
        };
        const name = toneNames[selectedTone] || 'Crystal Bell';
        notifications.showToast(`Bel akustik (${name}) diputar.`, 'info');
      });
    }

    // Segmented chips for advance reminder time (Zero OS dialogs)
    document.querySelectorAll('.segmented-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.getAttribute('data-advance-val');
        const hiddenInput = document.getElementById('setting-advance');
        if (hiddenInput) hiddenInput.value = val;
        document.querySelectorAll('.segmented-chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        springBounce(chip);
      });
    });

    // Custom tone picker items (Zero OS dialogs, instant tap switch)
    document.querySelectorAll('.tone-picker-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-tone-listen')) return;
        const toneVal = item.getAttribute('data-tone-val');
        const hiddenInput = document.getElementById('setting-sound-tone');
        if (hiddenInput) hiddenInput.value = toneVal;
        document.querySelectorAll('.tone-picker-item').forEach(i => i.classList.remove('is-active'));
        item.classList.add('is-active');
        springBounce(item);
        notifications.playChime(toneVal);
      });
    });

    // Tone listen/preview buttons
    document.querySelectorAll('.btn-tone-listen').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const toneVal = btn.getAttribute('data-preview-tone');
        notifications.playChime(toneVal);
        springBounce(btn);
      });
    });

    // Custom Gemini Model Picker trigger & bottom sheet modal
    const openModelPickerBtn = document.getElementById('btn-open-model-picker');
    const modalPickerModel = document.getElementById('modal-picker-model');
    if (openModelPickerBtn && modalPickerModel) {
      openModelPickerBtn.addEventListener('click', () => {
        modalPickerModel.classList.add('open');
      });
    }

    const closeModelPickerBtn = document.getElementById('btn-close-model-picker');
    if (closeModelPickerBtn && modalPickerModel) {
      closeModelPickerBtn.addEventListener('click', () => {
        modalPickerModel.classList.remove('open');
      });
    }

    document.querySelectorAll('.model-picker-option').forEach(option => {
      option.addEventListener('click', () => {
        const modelId = option.getAttribute('data-model-id');
        this.updateModelPickerUI(modelId);
        springBounce(option);
        if (modalPickerModel) {
          setTimeout(() => modalPickerModel.classList.remove('open'), 160);
        }
      });
    });

    // API Key Guide Modal trigger
    const openApiGuideBtn = document.getElementById('btn-open-api-guide');
    const modalApiGuide = document.getElementById('modal-api-guide');
    if (openApiGuideBtn && modalApiGuide) {
      openApiGuideBtn.addEventListener('click', () => {
        springBounce(openApiGuideBtn);
        modalApiGuide.classList.add('open');
        renderIcons(modalApiGuide);
      });
    }

    // AudioContext unlock on first user gesture (for mobile browsers)
    const unlockAudioHandler = () => {
      notifications.unlockAudio();
      window.removeEventListener('click', unlockAudioHandler);
      window.removeEventListener('touchstart', unlockAudioHandler);
    };
    window.addEventListener('click', unlockAudioHandler, { passive: true });
    window.addEventListener('touchstart', unlockAudioHandler, { passive: true });

    // Test API key connection button
    const testApiBtn = document.getElementById('btn-test-api');
    if (testApiBtn) {
      testApiBtn.addEventListener('click', () => this.handleTestApiKey());
    }

    // Toggle API key visibility
    const toggleKeyBtn = document.getElementById('btn-toggle-key-visibility');
    const apiKeyInput = document.getElementById('setting-api-key');
    if (toggleKeyBtn && apiKeyInput) {
      toggleKeyBtn.addEventListener('click', () => {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
        toggleKeyBtn.innerHTML = getIcon(isPassword ? 'eye-off' : 'eye', '', 16);
      });
    }

    // Export & Import
    const btnExport = document.getElementById('btn-export-data');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.handleExportData());
    }

    const btnImport = document.getElementById('btn-import-data');
    const inputImport = document.getElementById('input-import-file');
    if (btnImport && inputImport) {
      btnImport.addEventListener('click', () => inputImport.click());
      inputImport.addEventListener('change', (e) => this.handleImportData(e));
    }

    // Today Quick Note
    const btnSaveQuickNote = document.getElementById('btn-save-today-quick-note');
    const inputQuickNote = document.getElementById('today-quick-note-input');
    if (btnSaveQuickNote && inputQuickNote) {
      btnSaveQuickNote.addEventListener('click', () => {
        springBounce(btnSaveQuickNote);
        const val = inputQuickNote.value.trim();
        if (!val) {
          notifications.showToast('Tulis isi catatan terlebih dahulu.', 'warning');
          return;
        }
        state.addNote('Memo Cepat', val);
        inputQuickNote.value = '';
        notifications.showToast('Memo cepat berhasil disimpan.', 'success');
      });
    }

    // Direct binding for Today view buttons (guarantees fail-safe touch responsiveness on all mobile devices)
    const btnTodayAddSch = document.getElementById('btn-today-add-schedule');
    if (btnTodayAddSch) {
      btnTodayAddSch.addEventListener('click', () => {
        springBounce(btnTodayAddSch);
        this.openScheduleModal();
      });
    }

    const btnTodayPlanner = document.getElementById('btn-today-open-planner');
    if (btnTodayPlanner) {
      btnTodayPlanner.addEventListener('click', () => {
        springBounce(btnTodayPlanner);
        this.switchTab('ai-plan');
      });
    }

    const btnTodaySusun = document.getElementById('btn-today-susun-jadwal');
    if (btnTodaySusun) {
      btnTodaySusun.addEventListener('click', () => {
        springBounce(btnTodaySusun);
        this.openAiPlanModal();
      });
    }

    const btnTodayNotes = document.getElementById('btn-today-view-notes');
    if (btnTodayNotes) {
      btnTodayNotes.addEventListener('click', () => {
        springBounce(btnTodayNotes);
        this.switchTab('notes');
      });
    }

    // Share Agenda Buttons
    const btnShareToday = document.getElementById('btn-share-today');
    if (btnShareToday) {
      btnShareToday.addEventListener('click', () => {
        springBounce(btnShareToday);
        this.openShareModal(getLocalDateString());
      });
    }

    const btnShareSch = document.getElementById('btn-share-schedule');
    if (btnShareSch) {
      btnShareSch.addEventListener('click', () => {
        springBounce(btnShareSch);
        this.openShareModal(this.selectedScheduleDate);
      });
    }

    // AI Plan Modal Trigger Buttons (Susun Jadwal dari Kalimat Bebas)
    const btnOpenAiPlan = document.getElementById('btn-open-ai-plan-modal');
    if (btnOpenAiPlan) {
      btnOpenAiPlan.addEventListener('click', () => {
        springBounce(btnOpenAiPlan);
        this.openAiPlanModal();
      });
    }


    // Category Settings Button
    const btnManageCatSettings = document.getElementById('btn-settings-manage-categories');
    if (btnManageCatSettings) {
      btnManageCatSettings.addEventListener('click', () => {
        springBounce(btnManageCatSettings);
        this.openCategoryModal();
      });
    }

    // Week Strip navigation buttons
    const btnWeekPrev = document.getElementById('btn-week-prev');
    const btnWeekNext = document.getElementById('btn-week-next');
    const btnWeekToday = document.getElementById('btn-week-today');

    if (btnWeekPrev) {
      btnWeekPrev.addEventListener('click', () => {
        const d = new Date(this.selectedScheduleDate + 'T00:00:00');
        d.setDate(d.getDate() - 7);
        this.selectedScheduleDate = getLocalDateString(d);
        this.renderScheduleView();
      });
    }

    if (btnWeekNext) {
      btnWeekNext.addEventListener('click', () => {
        const d = new Date(this.selectedScheduleDate + 'T00:00:00');
        d.setDate(d.getDate() + 7);
        this.selectedScheduleDate = getLocalDateString(d);
        this.renderScheduleView();
      });
    }

    if (btnWeekToday) {
      btnWeekToday.addEventListener('click', () => {
        this.selectedScheduleDate = getLocalDateString();
        this.renderScheduleView();
      });
    }

    // Quick duration selector pills
    document.querySelectorAll('.duration-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const min = parseInt(pill.getAttribute('data-min'), 10);
        const inputDuration = document.getElementById('sch-input-duration');
        const durLabel = document.getElementById('sch-duration-label');
        if (inputDuration) {
          inputDuration.value = min;
          if (durLabel) durLabel.textContent = `${min} menit`;
        }
        document.querySelectorAll('.duration-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });

    // Duration input sync with label and pills
    const inputDuration = document.getElementById('sch-input-duration');
    if (inputDuration) {
      inputDuration.addEventListener('input', () => {
        const val = parseInt(inputDuration.value, 10) || 0;
        const durLabel = document.getElementById('sch-duration-label');
        if (durLabel) durLabel.textContent = `${val} menit`;
        document.querySelectorAll('.duration-pill').forEach(p => {
          if (parseInt(p.getAttribute('data-min'), 10) === val) {
            p.classList.add('active');
          } else {
            p.classList.remove('active');
          }
        });
      });
    }

    // Theme quick toggle in header
    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    if (btnToggleTheme) {
      btnToggleTheme.addEventListener('click', () => {
        springBounce(btnToggleTheme);
        const isCurrentlyLight = document.documentElement.getAttribute('data-theme') === 'light';
        const nextTheme = isCurrentlyLight ? 'dark' : 'light';
        state.updateSettings({ theme: nextTheme });
        this.applyTheme(nextTheme);
        notifications.showToast(`Mode ${nextTheme === 'light' ? 'Terang' : 'Gelap'} aktif.`, 'info');
      });
    }

    // Theme selector radio changes in Settings
    document.querySelectorAll('input[name="setting-theme"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          const selectedTheme = e.target.value;
          state.updateSettings({ theme: selectedTheme });
          this.applyTheme(selectedTheme);
          const label = selectedTheme === 'system' ? 'Sistem OS' : selectedTheme === 'light' ? 'Mode Terang' : 'Mode Gelap';
          notifications.showToast(`Tema diatur ke ${label}.`, 'info');
        }
      });
    });

    // Close Settings Alert Banner
    const btnCloseAlert = document.getElementById('btn-close-settings-alert');
    if (btnCloseAlert) {
      btnCloseAlert.addEventListener('click', () => {
        const alertBanner = document.getElementById('settings-save-alert');
        if (alertBanner) alertBanner.classList.add('hidden');
      });
    }
  }

  switchTab(tabId) {
    this.closeAllModals();
    this.currentTab = tabId;

    // Clear unread badge when entering AI tab
    if (tabId === 'ai-plan') {
      const badge = document.getElementById('ai-nav-badge');
      if (badge) badge.classList.add('hidden');
    }

    // Update nav classes
    document.querySelectorAll('.nav-tab').forEach(t => {
      if (t.getAttribute('data-target') === tabId) {
        t.classList.add('active');
        t.setAttribute('aria-selected', 'true');
      } else {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      }
    });

    // Update view sections
    document.querySelectorAll('.view-tab').forEach(view => {
      if (view.id === `view-${tabId}`) {
        view.classList.remove('hidden');
      } else {
        view.classList.add('hidden');
      }
    });

    // Update FAB visibility (Only shown on Schedule and Notes tabs; hidden on Today to avoid button collision)
    const fabBtn = document.getElementById('fab-quick-add');
    if (fabBtn) {
      if (['schedule', 'notes'].includes(tabId)) {
        fabBtn.classList.remove('hidden');
      } else {
        fabBtn.classList.add('hidden');
      }
    }

    this.render();
  }

  handleStateUpdate(event, data) {
    if (event === 'settings:updated' && data && data.theme) {
      this.applyTheme(data.theme);
    }
    if (event === 'ai:proactive-reminder') {
      const badge = document.getElementById('ai-nav-badge');
      if (badge && this.currentTab !== 'ai-plan') {
        badge.classList.remove('hidden');
      }
    }
    this.render();
  }

  render() {
    switch (this.currentTab) {
      case 'today':
        this.renderTodayView();
        break;
      case 'schedule':
        this.renderScheduleView();
        break;
      case 'ai-plan':
        this.renderAiPlanView();
        break;
      case 'notes':
        this.renderNotesView();
        break;
      case 'settings':
        this.renderSettingsView();
        break;
    }
    renderIcons();
  }
}

// Inject modular methods into AppController prototype
Object.assign(
  AppController.prototype,
  helperMethods,
  confirmDialogMethods,
  modalMethods,
  todayViewMethods,
  scheduleViewMethods,
  aiPlanViewMethods,
  notesViewMethods,
  settingsViewMethods
);

// Global bootstrap
function bootstrapApp() {
  try {
    if (!window._actualDayflowApp) {
      const app = new AppController();
      window.dayflowApp = app;
      window._actualDayflowApp = app;
      app.init();
    }
  } catch (err) {
    console.error('Bootstrap critical error:', err);
    try {
      renderIcons();
    } catch (e) {}
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
