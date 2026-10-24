/**
 * DayFlow Today View Component
 * Handles Today dashboard, hero banner (video/image/mesh presets & uploads), and stats.
 */

import { state, getLocalDateString, BANNER_PRESETS, getCustomBannerMedia, saveCustomBannerMedia, deleteCustomBannerMedia } from '../state.js';
import { getIcon } from '../icons.js';
import { notifications } from '../notifications.js';
import { springBounce, particleBurst } from '../animations.js';
import { GeminiService } from '../gemini.js';

export const todayViewMethods = {
  // --- 1. Today View ---
  renderTodayView() {
    const today = getLocalDateString();
    const schedules = state.getSchedules(today);
    const settings = state.getSettings();

    // Render Hero Banner (TikTok Trendy Aesthetic / Plain Fallback)
    this.renderTodayBanner(settings, schedules);

    // Render Dynamic Schedule Progress Bar
    this.renderTodayProgressBar();

    // Stats counter
    const completedCount = schedules.filter(s => s.completed).length;
    const statsCounterEl = document.getElementById('today-stats-counter');
    if (statsCounterEl) {
      statsCounterEl.textContent = `${completedCount} / ${schedules.length} Selesai`;
    }

    // Check AI Service status banner (only show if neither proxy nor key is ready)
    const apiKeyBanner = document.getElementById('today-api-banner');
    if (apiKeyBanner) {
      if (!GeminiService.isAiReady()) {
        apiKeyBanner.classList.remove('hidden');
      } else {
        apiKeyBanner.classList.add('hidden');
      }
    }

    // Proactive AI Nudge Card
    const nudgeEl = document.getElementById('today-ai-nudge');
    if (nudgeEl) {
      const activeNudge = notifications.getActiveProactiveNudge();
      if (activeNudge) {
        nudgeEl.classList.remove('hidden');
        const labelEl = document.getElementById('ai-nudge-slot-label');
        const textEl = document.getElementById('ai-nudge-text');
        if (labelEl) labelEl.textContent = activeNudge.slotTitle || 'Pengingat Proaktif AI';
        if (textEl) textEl.textContent = activeNudge.text || '';

        const btnDismiss = document.getElementById('btn-dismiss-ai-nudge');
        if (btnDismiss) {
          btnDismiss.onclick = (e) => {
            e.stopPropagation();
            notifications.dismissActiveProactiveNudge();
            nudgeEl.classList.add('hidden');
          };
        }

        const btnReply = document.getElementById('btn-reply-ai-nudge');
        if (btnReply) {
          btnReply.onclick = () => {
            this.switchTab('ai-plan');
          };
        }

        const btnDeadline = document.getElementById('btn-view-deadline-tasks');
        if (btnDeadline) {
          btnDeadline.onclick = () => {
            this.switchTab('schedule');
          };
        }
      } else {
        nudgeEl.classList.add('hidden');
      }
    }

    // Schedule list render via Mathematical Timeline Grid
    const listEl = document.getElementById('today-schedule-list');
    this.renderTimelineGrid(schedules, listEl, true);
  },

  // --- TikTok Trend Hero Banner Renderer ---
  renderTodayBanner(settings, schedules) {
    const hour = new Date().getHours();
    let greetingPrefix = 'Selamat Pagi';
    if (hour >= 11 && hour < 15) greetingPrefix = 'Selamat Siang';
    else if (hour >= 15 && hour < 18) greetingPrefix = 'Selamat Sore';
    else if (hour >= 18 || hour < 4) greetingPrefix = 'Selamat Malam';

    const userName = (settings.userName && typeof settings.userName === 'string') ? settings.userName.trim() : '';
    const fullGreeting = userName ? `${greetingPrefix}, ${userName}` : greetingPrefix;

    const dateText = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Update greeting and date across both banner and plain elements
    const bannerGreetingEl = document.getElementById('today-greeting');
    if (bannerGreetingEl) bannerGreetingEl.textContent = fullGreeting;

    const plainGreetingEl = document.getElementById('today-plain-heading');
    if (plainGreetingEl) plainGreetingEl.textContent = fullGreeting;

    const bannerDateEl = document.getElementById('today-date-meta');
    if (bannerDateEl) bannerDateEl.textContent = dateText;

    const plainDateEl = document.getElementById('today-plain-date-meta');
    if (plainDateEl) plainDateEl.textContent = dateText;

    const bannerContainer = document.getElementById('today-hero-banner');
    const plainContainer = document.getElementById('today-plain-greeting');
    const isBannerEnabled = !!settings.heroBannerEnabled;

    if (bannerContainer && plainContainer) {
      bannerContainer.classList.toggle('hidden', !isBannerEnabled);
      plainContainer.classList.toggle('hidden', isBannerEnabled);
    }

    if (!isBannerEnabled || !bannerContainer) return;

    this.initRealtimeClock();

    // Apply height variant
    const height = settings.heroBannerHeight || 'normal';
    bannerContainer.classList.remove('height-compact', 'height-normal', 'height-cinematic');
    bannerContainer.classList.add(`height-${height}`);

    // Apply overlay contrast variant
    const overlayEl = document.getElementById('hero-banner-overlay');
    if (overlayEl) {
      const overlayLevel = settings.heroBannerOverlay || 'medium';
      overlayEl.className = `hero-banner-overlay overlay-${overlayLevel}`;
    }

    // Apply motivational quote
    const quoteEl = document.getElementById('today-banner-quote');
    if (quoteEl) {
      quoteEl.textContent = settings.heroBannerQuote || 'Fokus pada hal penting hari ini.';
    }

    // Apply stats pill
    const bannerStatsEl = document.getElementById('today-banner-stats');
    if (bannerStatsEl) {
      const completedCount = schedules.filter(s => s.completed).length;
      bannerStatsEl.textContent = `${completedCount} / ${schedules.length} Selesai`;
    }

    // Render media backdrop
    const videoEl = document.getElementById('hero-banner-video');
    const imgEl = document.getElementById('hero-banner-image');
    const meshEl = document.getElementById('hero-banner-mesh');
    const muteBtn = document.getElementById('btn-banner-mute');

    const source = settings.heroBannerSource || 'preset';

    if (source === 'preset') {
      if (muteBtn) muteBtn.classList.add('hidden');
      const presetId = settings.heroBannerPreset || 'tokyo_lofi';
      const preset = BANNER_PRESETS.find(p => p.id === presetId) || BANNER_PRESETS[0];

      if (preset.type === 'mesh') {
        if (meshEl) meshEl.classList.remove('hidden');
        if (imgEl) imgEl.classList.add('hidden');
        if (videoEl) { videoEl.classList.add('hidden'); videoEl.pause(); }
      } else {
        if (meshEl) meshEl.classList.add('hidden');
        if (videoEl) { videoEl.classList.add('hidden'); videoEl.pause(); }
        if (imgEl) {
          const targetUrl = preset.url || preset.thumb;
          imgEl.classList.remove('hidden');
          if (imgEl.getAttribute('data-src') !== targetUrl || !imgEl.src) {
            imgEl.setAttribute('data-src', targetUrl);
            imgEl.src = targetUrl;
          }
          imgEl.onerror = () => {
            imgEl.classList.add('hidden');
            if (meshEl) meshEl.classList.remove('hidden');
          };
        }
      }
    } else if (source === 'upload') {
      getCustomBannerMedia().then(customData => {
        if (!customData || !customData.blob) {
          const fallback = BANNER_PRESETS[0];
          if (imgEl) { imgEl.classList.remove('hidden'); imgEl.src = fallback.url; }
          if (videoEl) { videoEl.classList.add('hidden'); videoEl.pause(); }
          if (meshEl) meshEl.classList.add('hidden');
          return;
        }
        if (this._activeBannerBlobUrl) {
          URL.revokeObjectURL(this._activeBannerBlobUrl);
        }
        this._activeBannerBlobUrl = URL.createObjectURL(customData.blob);
        const objectUrl = this._activeBannerBlobUrl;
        if (customData.mediaType === 'video') {
          if (meshEl) meshEl.classList.add('hidden');
          if (imgEl) imgEl.classList.add('hidden');
          if (videoEl) {
            videoEl.classList.remove('hidden');
            if (videoEl.getAttribute('data-obj-url') !== objectUrl) {
              videoEl.setAttribute('data-obj-url', objectUrl);
              videoEl.src = objectUrl;
              videoEl.play().catch(() => {});
            }
          }
          if (muteBtn) muteBtn.classList.remove('hidden');
        } else {
          if (meshEl) meshEl.classList.add('hidden');
          if (videoEl) { videoEl.classList.add('hidden'); videoEl.pause(); }
          if (imgEl) {
            imgEl.classList.remove('hidden');
            imgEl.src = objectUrl;
          }
          if (muteBtn) muteBtn.classList.add('hidden');
        }
      }).catch(() => {});
    } else if (source === 'url') {
      const url = settings.heroBannerUrl;
      if (settings.heroBannerMediaType === 'video') {
        if (meshEl) meshEl.classList.add('hidden');
        if (imgEl) imgEl.classList.add('hidden');
        if (videoEl) {
          videoEl.classList.remove('hidden');
          if (videoEl.src !== url) {
            videoEl.src = url;
            videoEl.play().catch(() => {});
          }
        }
        if (muteBtn) muteBtn.classList.remove('hidden');
      } else {
        if (meshEl) meshEl.classList.add('hidden');
        if (videoEl) { videoEl.classList.add('hidden'); videoEl.pause(); }
        if (imgEl) {
          imgEl.classList.remove('hidden');
          imgEl.src = url || BANNER_PRESETS[0].url;
        }
        if (muteBtn) muteBtn.classList.add('hidden');
      }
    }
  },

  // --- Banner Settings & Mini Preview Logic ---
  renderBannerSettings(settings) {
    const nameInput = document.getElementById('setting-user-name');
    if (nameInput) nameInput.value = settings.userName || '';

    const bannerToggle = document.getElementById('setting-banner-enabled');
    if (bannerToggle) bannerToggle.checked = !!settings.heroBannerEnabled;

    const bannerBody = document.getElementById('banner-settings-body');
    if (bannerBody) {
      bannerBody.style.display = settings.heroBannerEnabled ? 'flex' : 'none';
    }

    const quoteInput = document.getElementById('setting-banner-quote');
    if (quoteInput) quoteInput.value = settings.heroBannerQuote || 'Fokus pada hal penting hari ini.';

    const urlInput = document.getElementById('setting-banner-url');
    if (urlInput) urlInput.value = settings.heroBannerUrl || '';

    // URL media type radio
    const urlMediaRadio = document.querySelector(`input[name="url-media-type"][value="${settings.heroBannerMediaType || 'image'}"]`);
    if (urlMediaRadio) urlMediaRadio.checked = true;

    // Render Preset Cards Grid
    const presetGrid = document.getElementById('preset-cards-grid');
    if (presetGrid) {
      presetGrid.innerHTML = BANNER_PRESETS.map(p => `
        <div class="preset-card-item ${p.id === (settings.heroBannerPreset || 'tokyo_lofi') ? 'is-selected' : ''}" data-preset-id="${p.id}">
          <div class="preset-thumb-wrap">
            ${p.type === 'mesh' ? '<div class="hero-banner-mesh" style="position:absolute;inset:0;"></div>' : `<img src="${p.thumb || p.url}" alt="${p.name}" class="preset-thumb-img" loading="lazy">`}
            <div class="preset-thumb-overlay"></div>
          </div>
          <div class="preset-meta-info">
            <div class="preset-name-row">
              <span class="preset-name">${p.name}</span>
              <div class="preset-active-check">
                ${getIcon('check', '', 14)}
              </div>
            </div>
            <span class="preset-vibe-desc">${p.vibe}</span>
          </div>
        </div>
      `).join('');

      presetGrid.querySelectorAll('.preset-card-item').forEach(card => {
        card.addEventListener('click', () => {
          springBounce(card);
          const presetId = card.getAttribute('data-preset-id');
          presetGrid.querySelectorAll('.preset-card-item').forEach(c => c.classList.toggle('is-selected', c === card));
          const updated = state.updateSettings({
            heroBannerSource: 'preset',
            heroBannerPreset: presetId
          });
          this.updateBannerMiniPreview(updated);
          this.renderTodayView();
          notifications.showToast('Tema banner diperbarui.', 'info');
        });
      });
    }

    // Sync Source Tabs
    const currentSource = settings.heroBannerSource || 'preset';
    document.querySelectorAll('.source-pill').forEach(btn => {
      const s = btn.getAttribute('data-source');
      btn.classList.toggle('is-active', s === currentSource);
    });

    const presetPanel = document.getElementById('banner-source-preset-panel');
    const uploadPanel = document.getElementById('banner-source-upload-panel');
    const urlPanel = document.getElementById('banner-source-url-panel');
    if (presetPanel) presetPanel.classList.toggle('hidden', currentSource !== 'preset');
    if (uploadPanel) uploadPanel.classList.toggle('hidden', currentSource !== 'upload');
    if (urlPanel) urlPanel.classList.toggle('hidden', currentSource !== 'url');

    // Check if custom file is stored in IndexedDB for upload status
    getCustomBannerMedia().then(customData => {
      const statusInfo = document.getElementById('upload-status-info');
      const filenameEl = document.getElementById('uploaded-filename');
      if (statusInfo && filenameEl) {
        if (customData && customData.filename) {
          filenameEl.textContent = `${customData.filename} (${customData.mediaType.toUpperCase()})`;
          statusInfo.classList.remove('hidden');
        } else {
          statusInfo.classList.add('hidden');
        }
      }
    }).catch(() => {});

    // Sync Height Chips
    const currentHeight = settings.heroBannerHeight || 'normal';
    document.querySelectorAll('#banner-height-chips .size-pill').forEach(chip => {
      const h = chip.getAttribute('data-height');
      chip.classList.toggle('is-active', h === currentHeight);
    });

    // Sync Overlay Chips
    const currentOverlay = settings.heroBannerOverlay || 'medium';
    document.querySelectorAll('#banner-overlay-chips .size-pill').forEach(chip => {
      const o = chip.getAttribute('data-overlay');
      chip.classList.toggle('is-active', o === currentOverlay);
    });

    // Update Mini Preview
    this.updateBannerMiniPreview(settings);
  },

  updateBannerMiniPreview(settings) {
    const titleEl = document.getElementById('mini-preview-title');
    const imgEl = document.getElementById('mini-preview-image');
    const videoEl = document.getElementById('mini-preview-video');
    const meshEl = document.getElementById('mini-preview-mesh');

    const userName = (settings.userName && typeof settings.userName === 'string') ? settings.userName.trim() : '';
    if (titleEl) titleEl.textContent = userName ? `Selamat Datang, ${userName}` : 'Selamat Datang';

    const source = settings.heroBannerSource || 'preset';

    if (source === 'preset') {
      const preset = BANNER_PRESETS.find(p => p.id === (settings.heroBannerPreset || 'tokyo_lofi')) || BANNER_PRESETS[0];
      if (preset.type === 'mesh') {
        if (meshEl) meshEl.classList.remove('hidden');
        if (imgEl) imgEl.classList.add('hidden');
        if (videoEl) videoEl.classList.add('hidden');
      } else {
        if (meshEl) meshEl.classList.add('hidden');
        if (videoEl) videoEl.classList.add('hidden');
        if (imgEl) {
          imgEl.classList.remove('hidden');
          imgEl.src = preset.thumb || preset.url;
        }
      }
    } else if (source === 'upload') {
      getCustomBannerMedia().then(customData => {
        if (!customData || !customData.blob) return;
        const objectUrl = URL.createObjectURL(customData.blob);
        if (customData.mediaType === 'video') {
          if (meshEl) meshEl.classList.add('hidden');
          if (imgEl) imgEl.classList.add('hidden');
          if (videoEl) {
            videoEl.classList.remove('hidden');
            videoEl.src = objectUrl;
          }
        } else {
          if (meshEl) meshEl.classList.add('hidden');
          if (videoEl) videoEl.classList.add('hidden');
          if (imgEl) {
            imgEl.classList.remove('hidden');
            imgEl.src = objectUrl;
          }
        }
      }).catch(() => {});
    } else if (source === 'url') {
      const url = settings.heroBannerUrl;
      if (settings.heroBannerMediaType === 'video') {
        if (meshEl) meshEl.classList.add('hidden');
        if (imgEl) imgEl.classList.add('hidden');
        if (videoEl) {
          videoEl.classList.remove('hidden');
          videoEl.src = url;
        }
      } else {
        if (meshEl) meshEl.classList.add('hidden');
        if (videoEl) videoEl.classList.add('hidden');
        if (imgEl) {
          imgEl.classList.remove('hidden');
          imgEl.src = url || BANNER_PRESETS[0].url;
        }
      }
    }
  },

  bindBannerSettingsEvents() {
    // 1. Banner Enable/Disable Toggle
    const bannerToggle = document.getElementById('setting-banner-enabled');
    const bannerBody = document.getElementById('banner-settings-body');
    if (bannerToggle) {
      bannerToggle.addEventListener('change', () => {
        const isEnabled = bannerToggle.checked;
        if (bannerBody) bannerBody.style.display = isEnabled ? 'flex' : 'none';
        state.updateSettings({ heroBannerEnabled: isEnabled, hasConfiguredBanner: true });
        this.renderTodayView();
        notifications.showToast(`Banner sambutan ${isEnabled ? 'diaktifkan' : 'dinonaktifkan'}.`, 'info');
      });
    }

    // 2. User Name Input Realtime Sync
    const nameInput = document.getElementById('setting-user-name');
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        state.updateSettings({ userName: val });
        this.updateBannerMiniPreview(state.getSettings());
        this.renderTodayView();
      });
    }

    // 3. Source Tabs (Preset / Upload / URL)
    document.querySelectorAll('.source-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        springBounce(btn);
        const source = btn.getAttribute('data-source');
        document.querySelectorAll('.source-pill').forEach(b => b.classList.toggle('is-active', b === btn));
        
        const presetPanel = document.getElementById('banner-source-preset-panel');
        const uploadPanel = document.getElementById('banner-source-upload-panel');
        const urlPanel = document.getElementById('banner-source-url-panel');
        if (presetPanel) presetPanel.classList.toggle('hidden', source !== 'preset');
        if (uploadPanel) uploadPanel.classList.toggle('hidden', source !== 'upload');
        if (urlPanel) urlPanel.classList.toggle('hidden', source !== 'url');

        const updated = state.updateSettings({ heroBannerSource: source });
        this.updateBannerMiniPreview(updated);
        this.renderTodayView();
      });
    });

    // 4. File Upload (Button & Dropzone)
    const btnTriggerUpload = document.getElementById('btn-trigger-upload');
    const fileInput = document.getElementById('input-banner-file');
    const dropzone = document.getElementById('banner-upload-dropzone');

    if (btnTriggerUpload && fileInput) {
      btnTriggerUpload.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--accent-primary)';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleBannerFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleBannerFileUpload(e.target.files[0]);
        }
      });
    }

    // Remove uploaded banner
    const btnRemoveUploaded = document.getElementById('btn-remove-uploaded');
    if (btnRemoveUploaded) {
      btnRemoveUploaded.addEventListener('click', async () => {
        await deleteCustomBannerMedia();
        const statusInfo = document.getElementById('upload-status-info');
        if (statusInfo) statusInfo.classList.add('hidden');
        const updated = state.updateSettings({
          heroBannerSource: 'preset',
          heroBannerPreset: 'tokyo_lofi'
        });
        this.updateBannerMiniPreview(updated);
        this.renderTodayView();
        notifications.showToast('File kustom dihapus, beralih ke preset.', 'info');
      });
    }

    // 5. URL Input & Media Type
    const urlInput = document.getElementById('setting-banner-url');
    if (urlInput) {
      urlInput.addEventListener('change', (e) => {
        const val = e.target.value.trim();
        const mediaType = document.querySelector('input[name="url-media-type"]:checked')?.value || 'image';
        const updated = state.updateSettings({
          heroBannerSource: 'url',
          heroBannerUrl: val,
          heroBannerMediaType: mediaType
        });
        this.updateBannerMiniPreview(updated);
        this.renderTodayView();
      });
    }

    document.querySelectorAll('input[name="url-media-type"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const val = e.target.value;
        const url = document.getElementById('setting-banner-url')?.value.trim() || '';
        const updated = state.updateSettings({
          heroBannerSource: 'url',
          heroBannerUrl: url,
          heroBannerMediaType: val
        });
        this.updateBannerMiniPreview(updated);
        this.renderTodayView();
      });
    });

    // 6. Height Chips
    document.querySelectorAll('#banner-height-chips .size-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        springBounce(btn);
        const h = btn.getAttribute('data-height');
        document.querySelectorAll('#banner-height-chips .size-pill').forEach(b => b.classList.toggle('is-active', b === btn));
        state.updateSettings({ heroBannerHeight: h });
        this.renderTodayView();
      });
    });

    // 7. Overlay Chips
    document.querySelectorAll('#banner-overlay-chips .size-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        springBounce(btn);
        const o = btn.getAttribute('data-overlay');
        document.querySelectorAll('#banner-overlay-chips .size-pill').forEach(b => b.classList.toggle('is-active', b === btn));
        state.updateSettings({ heroBannerOverlay: o });
        this.renderTodayView();
      });
    });

    // 8. Quote Input
    const quoteInput = document.getElementById('setting-banner-quote');
    if (quoteInput) {
      quoteInput.addEventListener('input', (e) => {
        const val = e.target.value.trim() || 'Fokus pada hal penting hari ini.';
        state.updateSettings({ heroBannerQuote: val });
        const quoteDisplay = document.getElementById('today-banner-quote');
        if (quoteDisplay) quoteDisplay.textContent = val;
      });
    }

    // 9. Hero Banner Real-time Live Clock
    this.initRealtimeClock();

    // 10. Mute/Unmute Video Toggle Button
    const muteBtn = document.getElementById('btn-banner-mute');
    const bannerVideo = document.getElementById('hero-banner-video');
    if (muteBtn && bannerVideo) {
      muteBtn.addEventListener('click', () => {
        springBounce(muteBtn);
        bannerVideo.muted = !bannerVideo.muted;
        muteBtn.innerHTML = getIcon(bannerVideo.muted ? 'volume-x' : 'volume', '', 14);
        notifications.showToast(bannerVideo.muted ? 'Audio video dibisukan.' : 'Audio video aktif.', 'info');
      });
    }
  },

  async handleBannerFileUpload(file) {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      notifications.showToast('Format file tidak didukung. Harap pilih video atau gambar.', 'warning');
      return;
    }

    // Max 50MB for video, 15MB for image
    const maxSize = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      notifications.showToast(`Ukuran file terlalu besar (maksimal ${isVideo ? '50MB' : '15MB'}).`, 'warning');
      return;
    }

    const mediaType = isVideo ? 'video' : 'image';
    const success = await saveCustomBannerMedia(file, mediaType, file.name);

    if (success) {
      const statusInfo = document.getElementById('upload-status-info');
      const filenameEl = document.getElementById('uploaded-filename');
      if (statusInfo && filenameEl) {
        filenameEl.textContent = `${file.name} (${mediaType.toUpperCase()})`;
        statusInfo.classList.remove('hidden');
      }

      const updated = state.updateSettings({
        heroBannerSource: 'upload',
        heroBannerMediaType: mediaType
      });

      this.updateBannerMiniPreview(updated);
      this.renderTodayView();
      notifications.showToast(`${isVideo ? 'Video' : 'Gambar'} banner berhasil dipasang & disimpan lokal!`, 'success');
    } else {
      notifications.showToast('Gagal menyimpan file banner ke browser.', 'danger');
    }
  },

  renderTodayProgressBar() {
    const widget = document.getElementById('today-schedule-progress-widget');
    if (!widget) return;

    const prod = state.getTodayProductivity();
    const stats = state.getProfileProductivityStats();

    const percentEl = document.getElementById('today-progress-percent');
    const metaEl = document.getElementById('today-progress-meta');
    const trackEl = document.getElementById('today-progress-track');
    const fillEl = document.getElementById('today-progress-fill');
    const countdownText = document.getElementById('today-countdown-text');
    const statusText = document.getElementById('today-progress-status-text');
    const streakText = document.getElementById('today-streak-text');

    if (percentEl) percentEl.textContent = `${prod.percentage}%`;
    if (metaEl) {
      if (prod.totalScheduled === 0) {
        metaEl.textContent = 'Belum ada agenda hari ini';
      } else {
        metaEl.textContent = `${prod.completedCount} dari ${prod.totalScheduled} kegiatan selesai`;
      }
    }

    if (trackEl) {
      trackEl.setAttribute('aria-valuenow', prod.percentage);
      trackEl.setAttribute('aria-valuemax', 100);
    }

    if (fillEl) {
      fillEl.style.width = `${prod.percentage}%`;
      fillEl.classList.toggle('is-complete', prod.isComplete);
    }

    if (countdownText) {
      if (prod.isComplete) {
        countdownText.textContent = 'Tuntas 100% Hari Ini';
      } else {
        countdownText.textContent = `Sisa ${prod.remainingTimeStr} hingga 24:00`;
      }
    }

    if (statusText) {
      if (prod.totalScheduled === 0) {
        statusText.textContent = 'Belum ada agenda hari ini.';
      } else if (prod.isComplete) {
        statusText.textContent = 'Semua agenda hari ini telah tuntas!';
      } else {
        const remaining = prod.totalScheduled - prod.completedCount;
        statusText.textContent = `${remaining} kegiatan lagi hari ini.`;
      }
    }

    if (streakText) {
      if (stats.perfectDays > 0) {
        streakText.textContent = `${stats.perfectDays} Hari Konsisten`;
      } else {
        streakText.textContent = 'Mulai Konsistensi Hari Ini';
      }
    }

    // Trigger celebratory particle burst when transitioning to 100%
    if (prod.isComplete && !this._lastCelebratedComplete) {
      this._lastCelebratedComplete = true;
      try {
        if (typeof particleBurst === 'function') {
          particleBurst(widget);
        }
      } catch (e) {}
    } else if (!prod.isComplete) {
      this._lastCelebratedComplete = false;
    }

    // Initialize clock & countdown ticking
    this.initRealtimeClock();
  },

  initRealtimeClock() {
    const updateClock = () => {
      const now = new Date();
      const clockEl = document.getElementById('banner-live-clock');
      if (clockEl) {
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        clockEl.textContent = `${h}:${m}:${s}`;
      }

      // Live countdown on Today's progress widget
      const countdownText = document.getElementById('today-countdown-text');
      if (countdownText && !countdownText.textContent.includes('Tuntas 100%')) {
        const prod = state.getTodayProductivity();
        countdownText.textContent = `Sisa ${prod.remainingTimeStr} hingga 24:00`;
      }
    };

    updateClock();
    if (!this._realtimeClockInterval) {
      this._realtimeClockInterval = setInterval(updateClock, 1000);
    }
  }
};
