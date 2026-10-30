/**
 * DayFlow Notification & Audio Chime System
 * Provides offline Web Audio acoustic bell chime + Web Notification API integration.
 */

import { state, getLocalDateString, getCustomAudioTone } from './state.js';
import { saveSchedulesToDb, saveSettingsToDb } from './db.js';
import { nativeNotifications } from './nativeNotifications.js';

export function getProactiveReminderSlot(date = new Date()) {
  const hour = date.getHours();
  if (hour < 8 || hour >= 22) return null;

  const startHour = 8 + Math.floor((hour - 8) / 2) * 2;
  return {
    id: `slot-${String(startHour).padStart(2, '0')}`,
    startHour
  };
}

class NotificationService {
  constructor() {
    this.audioCtx = null;
    this.notifiedSet = new Set();
    this.pollInterval = null;
    this.worker = null;
    this._fallbackAudioCache = {};
    this._customAudioBlobUrl = null;
    this._snoozeTimers = new Map();
    this._swListenerBound = false;
    this._visibilityBound = false;
    this._stateSubscribed = false;
  }

  init() {
    this._loadNotifiedSet();
    this._startScheduler();
    this._startWebWorkerTimer();
    this._bindStateSubscription();
    this._bindServiceWorkerMessages();
    this.loadCustomAudioTone();
    this.syncSchedulesToServiceWorker();
    this.preScheduleNotificationTriggers();
    this._checkDeadlineReminders();
    nativeNotifications.init().then(() => {
      const allSchedules = state.getSchedules();
      const settings = state.getSettings();
      nativeNotifications.syncSchedules(allSchedules, settings.notifyAdvanceMinutes || 15);
    }).catch(() => {});
  }

  _loadNotifiedSet() {
    try {
      const raw = localStorage.getItem('dayflow_notified_keys_v1');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const today = getLocalDateString();
          // Filter to only recent keys (today) to keep storage lean
          const valid = arr.filter((k) => typeof k === 'string' && k.startsWith(today));
          this.notifiedSet = new Set(valid);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load notified keys:', e);
    }
    this.notifiedSet = new Set();
  }

  _saveNotifiedSet() {
    try {
      localStorage.setItem('dayflow_notified_keys_v1', JSON.stringify([...this.notifiedSet]));
    } catch (e) {}
  }

  // Dedicated background worker timer: immune to window DOM background throttling
  _startWebWorkerTimer() {
    if (typeof Worker === 'undefined') return;
    try {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('tick');
            }, 15000);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);
      this.worker.onmessage = (e) => {
        if (e.data === 'tick') {
          this._checkUpcomingSchedules();
          this._checkDeadlineReminders();
          this._checkProactiveReminders();
        }
      };
      this.worker.postMessage('start');
    } catch (e) {
      console.warn('Web Worker heartbeat unavailable, relying on window scheduler:', e);
    }
  }

  // Pre-schedule upcoming reminders in OS/browser via Notification Triggers API
  async preScheduleNotificationTriggers() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!('showTrigger' in Notification.prototype)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg || !reg.showNotification) return;

      const settings = state.getSettings();
      if (settings.systemNotificationsEnabled === false) return;

      const advanceMinutes = settings.notifyAdvanceMinutes || 15;
      const now = Date.now();
      const todayStr = getLocalDateString();
      const todaySchedules = state.getSchedules(todayStr);

      for (const schedule of todaySchedules) {
        if (schedule.completed || schedule.reminder === false) continue;
        const [hours, minutes] = String(schedule.time || '00:00').split(':').map(Number);
        const schedDate = new Date();
        schedDate.setHours(hours || 0, minutes || 0, 0, 0);
        const schedTimeMs = schedDate.getTime();

        // 1. Advance notification trigger
        const advanceTimeMs = schedTimeMs - advanceMinutes * 60 * 1000;
        const advanceKey = `${todayStr}_${schedule.id}_advance`;
        if (advanceTimeMs > now && !this.notifiedSet.has(advanceKey)) {
          try {
            await reg.showNotification(`DayFlow: ${schedule.title}`, {
              body: `${schedule.title} (${schedule.time}) — Dalam ${advanceMinutes} menit lagi`,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: `trigger_${schedule.id}_advance`,
              showTrigger: new TimestampTrigger(advanceTimeMs),
              data: { scheduleId: schedule.id, scheduleDate: todayStr }
            });
          } catch (_) {}
        }

        // 2. Exact event trigger ('now')
        const nowKey = `${todayStr}_${schedule.id}_now`;
        if (schedTimeMs > now && !this.notifiedSet.has(nowKey)) {
          try {
            await reg.showNotification(`DayFlow Pengingat: ${schedule.title}`, {
              body: `Waktunya: ${schedule.title} (${schedule.time}) sedang berlangsung`,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: `trigger_${schedule.id}_now`,
              showTrigger: new TimestampTrigger(schedTimeMs),
              data: { scheduleId: schedule.id, scheduleDate: todayStr },
              actions: [
                { action: 'snooze_10', title: 'Tunda 10 Menit' },
                { action: 'complete', title: 'Tandai Selesai' }
              ]
            });
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('preScheduleNotificationTriggers error:', e);
    }
  }

  // Synchronize schedules and settings to Service Worker & IndexedDB for background inspection
  async syncSchedulesToServiceWorker() {
    try {
      const allSchedules = state.getSchedules();
      const settings = state.getSettings();
      await saveSchedulesToDb(allSchedules);
      await saveSettingsToDb(settings);

      // Also sync to Native Android AlarmManager if running inside APK
      nativeNotifications.syncSchedules(allSchedules, settings.notifyAdvanceMinutes || 15).catch(() => {});

      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_SCHEDULES',
          schedules: allSchedules,
          advanceMinutes: settings.notifyAdvanceMinutes || 15
        });
      }
    } catch (e) {
      console.warn('syncSchedulesToServiceWorker error:', e);
    }
  }

  _bindServiceWorkerMessages() {
    if (this._swListenerBound) return;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      this._swListenerBound = true;
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, scheduleId, scheduleDate, minutes } = event.data || {};
        if (type === 'NOTIFICATION_ACTION_SNOOZE') {
          this.snoozeSchedule(scheduleId, minutes || 10);
        } else if (type === 'NOTIFICATION_ACTION_COMPLETE') {
          this.completeSchedule(scheduleId, scheduleDate);
        }
      });
    }
  }

  async loadCustomAudioTone() {
    try {
      const res = await getCustomAudioTone();
      if (res && res.blob) {
        if (this._customAudioBlobUrl) {
          URL.revokeObjectURL(this._customAudioBlobUrl);
        }
        this._customAudioBlobUrl = URL.createObjectURL(res.blob);
        return this._customAudioBlobUrl;
      }
    } catch (e) {
      console.warn('Failed to load custom audio tone:', e);
    }
    return null;
  }

  async reloadCustomAudioTone() {
    if (this._customAudioBlobUrl) {
      URL.revokeObjectURL(this._customAudioBlobUrl);
      this._customAudioBlobUrl = null;
    }
    return this.loadCustomAudioTone();
  }

  _bindStateSubscription() {
    if (this._stateSubscribed) return;
    this._stateSubscribed = true;
    try {
      state.subscribe((event) => {
        if (
          event === 'schedule:added' ||
          event === 'schedules:batch-added' ||
          event === 'schedule:updated' ||
          event === 'schedule:deleted' ||
          event === 'schedules:reset'
        ) {
          this._checkUpcomingSchedules();
          this._checkDeadlineReminders();
          this.syncSchedulesToServiceWorker();
          this.preScheduleNotificationTriggers();
        }
      });
    } catch (e) {}
  }

  unlockAudio() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx) {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        // Prime audio graph with an inaudible 1-sample buffer (essential for mobile/desktop browser gesture unlock)
        const buffer = this.audioCtx.createBuffer(1, 1, 22050);
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioCtx.destination);
        source.start(0);
      }
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  _generateWavDataUri(tone) {
    function writeStr(view, offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    const sampleRate = 22050;
    const duration = tone === 'digital' ? 0.35 : (tone === 'marimba' ? 0.55 : 0.75);
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    writeStr(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(view, 8, 'WAVE');
    writeStr(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;
      if (tone === 'marimba') {
        const env = Math.exp(-6.5 * t);
        sample = (Math.sin(2 * Math.PI * 659.25 * t) + 0.6 * Math.sin(2 * Math.PI * 830.61 * t) + 0.35 * Math.sin(2 * Math.PI * 987.77 * t)) * env;
      } else if (tone === 'digital') {
        const env = Math.exp(-8.5 * t);
        sample = (Math.sin(2 * Math.PI * 1046.5 * t) + 0.7 * Math.sin(2 * Math.PI * 1567.98 * t)) * env;
      } else {
        const env = Math.exp(-4.5 * t);
        sample = (Math.sin(2 * Math.PI * 783.99 * t) + 0.65 * Math.sin(2 * Math.PI * 1046.5 * t) + 0.45 * Math.sin(2 * Math.PI * 1318.51 * t)) * env;
      }
      const s = Math.max(-1, Math.min(1, sample * 0.8));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  _playAudioFallback(tone) {
    try {
      if (!this._fallbackAudioCache[tone]) {
        this._fallbackAudioCache[tone] = this._generateWavDataUri(tone);
      }
      const audio = new Audio(this._fallbackAudioCache[tone]);
      audio.volume = 0.95;
      audio.play().catch((e) => {
        console.warn('Audio fallback element play prevented:', e);
      });
    } catch (e) {
      console.warn('Audio fallback error:', e);
    }
  }

  // Synthesize crystal-clear, loud, harmonic acoustic bell chime via Web Audio API + HTML Audio fallback
  async playChime(overrideTone = null) {
    const settings = state.getSettings();
    if (settings.soundEnabled === false) return;

    const tone = overrideTone || settings.soundTone || 'crystal';

    // Handle custom uploaded audio tone
    if (tone === 'custom') {
      try {
        if (!this._customAudioBlobUrl) {
          await this.loadCustomAudioTone();
        }
        if (this._customAudioBlobUrl) {
          const customAudio = new Audio(this._customAudioBlobUrl);
          customAudio.volume = 0.95;
          await customAudio.play();
          return;
        }
      } catch (err) {
        console.warn('Custom audio playback failed, falling back to crystal bell:', err);
      }
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        this._playAudioFallback(tone);
        return;
      }

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      // Safe non-blocking resume: never stall or hang if autoplay policy delays resolution
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
        await Promise.race([
          this.audioCtx.resume().catch(() => {}),
          new Promise(r => setTimeout(r, 60))
        ]);
      }

      // If still suspended after timeout, trigger audio element fallback as dual acoustic guarantee
      if (this.audioCtx.state === 'suspended') {
        this._playAudioFallback(tone);
      }

      const ctx = this.audioCtx;
      const now = Math.max(0, ctx.currentTime);

      // Dynamics Compressor: keeps output loud, full, and punchy on mobile speakers without clipping
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, now);
      compressor.knee.setValueAtTime(8, now);
      compressor.ratio.setValueAtTime(5, now);
      compressor.attack.setValueAtTime(0.002, now);
      compressor.release.setValueAtTime(0.12, now);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.85, now); // 85% loudness floor

      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);

      const playTone = (freq, startTime, duration = 0.85, gainLevel = 0.7, waveType = 'triangle') => {
        const actualStart = Math.max(ctx.currentTime + 0.005, startTime);

        // Fundamental tone (triangle contains clean overtones easily audible on small transducers)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = waveType;
        osc1.frequency.setValueAtTime(freq, actualStart);

        gain1.gain.setValueAtTime(0, actualStart);
        gain1.gain.linearRampToValueAtTime(gainLevel, actualStart + 0.012);
        gain1.gain.exponentialRampToValueAtTime(0.0001, actualStart + duration);

        osc1.connect(gain1);
        gain1.connect(compressor);
        osc1.start(actualStart);
        osc1.stop(actualStart + duration);

        // Acoustic overtone 1 (octave shimmer)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2.008, actualStart);

        gain2.gain.setValueAtTime(0, actualStart);
        gain2.gain.linearRampToValueAtTime(gainLevel * 0.45, actualStart + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.0001, actualStart + duration * 0.7);

        osc2.connect(gain2);
        gain2.connect(compressor);
        osc2.start(actualStart);
        osc2.stop(actualStart + duration * 0.7);

        // High sparkle overtone (ting transient)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(freq * 3.015, actualStart);

        gain3.gain.setValueAtTime(0, actualStart);
        gain3.gain.linearRampToValueAtTime(gainLevel * 0.25, actualStart + 0.008);
        gain3.gain.exponentialRampToValueAtTime(0.0001, actualStart + 0.3);

        osc3.connect(gain3);
        gain3.connect(compressor);
        osc3.start(actualStart);
        osc3.stop(actualStart + 0.3);
      };

      if (tone === 'marimba') {
        // Warm resonant wooden marimba (E5 -> G#5 -> B5)
        playTone(659.25, now + 0.00, 0.45, 0.8, 'sine');
        playTone(830.61, now + 0.12, 0.50, 0.85, 'sine');
        playTone(987.77, now + 0.24, 0.75, 0.9, 'triangle');
      } else if (tone === 'digital') {
        // Brisk modern two-pulse ping (C6 -> G6)
        playTone(1046.50, now + 0.00, 0.35, 0.75, 'sine');
        playTone(1567.98, now + 0.10, 0.65, 0.85, 'triangle');
      } else {
        // 'crystal' (Default): Bright, ringing 3-tone bell (G5 -> C6 -> E6)
        playTone(783.99, now + 0.00, 0.65, 0.75, 'triangle');
        playTone(1046.50, now + 0.13, 0.75, 0.82, 'triangle');
        playTone(1318.51, now + 0.26, 1.35, 0.90, 'triangle');
      }

    } catch (e) {
      console.warn('Audio chime playback error, fallback to HTML Audio:', e);
      this._playAudioFallback(tone);
    }
  }

  // Alias for testing audio chime from settings and header buttons
  testChime(overrideTone = null) {
    return this.playChime(overrideTone);
  }

  getPermissionStatus() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'granted' | 'denied' | 'default'
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      this.showToast('Browser ini tidak mendukung Web Notifications.', 'warning');
      return 'unsupported';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      this.showToast('Izin notifikasi diblokir browser. Klik ikon gembok pada URL untuk mengizinkan.', 'warning', 7000);
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        this.showToast('Izin notifikasi berhasil diaktifkan!', 'success');
        this.playChime();
        this.sendSystemNotification('DayFlow • Notifikasi Aktif', {
          body: 'Notifikasi pengingat agenda DayFlow siap muncul di layarmu.',
          tag: 'dayflow_perm_granted'
        });
        state.notify('notifications:permission-changed', 'granted');
        return 'granted';
      } else {
        this.showToast('Izin notifikasi belum diberikan. Kamu bisa mengaktifkannya kapan saja di Pengaturan.', 'warning', 5000);
        state.notify('notifications:permission-changed', result);
        return result;
      }
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return 'error';
    }
  }

  async sendSystemNotification(title, options = {}) {
    const settings = state.getSettings();
    if (settings.systemNotificationsEnabled === false) {
      return { ok: false, reason: 'disabled_in_settings' };
    }

    if (!('Notification' in window)) {
      return { ok: false, reason: 'unsupported' };
    }

    if (Notification.permission !== 'granted') {
      return { ok: false, reason: 'permission_not_granted', permission: Notification.permission };
    }

    // Hardware vibration on Android / PWA mobile
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 250]);
      } catch (e) {}
    }

    const defaultOptions = {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200, 100, 250],
      requireInteraction: false,
      silent: false
    };

    const finalOptions = { ...defaultOptions, ...options };
    let delivered = false;

    // 1. Try active ServiceWorker (ideal for Android / PWA mobile)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await Promise.race([
          navigator.serviceWorker.getRegistration(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 400))
        ]);
        if (reg && reg.active && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, finalOptions);
          delivered = true;
        }
      } catch (e) {
        console.warn('SW notification fallback to Window Notification:', e);
      }
    }

    // 2. Direct Window Notification fallback (works instantly on Desktop Chrome, Edge, Safari, Firefox)
    if (!delivered) {
      try {
        const { actions, ...directOptions } = finalOptions;
        const notif = new Notification(title, directOptions);
        notif.onclick = () => {
          try {
            window.focus();
            notif.close();
          } catch (e) {}
        };
        delivered = true;
      } catch (err) {
        console.warn('Direct notification spawn warning:', err);
      }
    }

    return { ok: delivered };
  }

  async testNotification(overrideTone = null) {
    const settings = state.getSettings();
    const tone = overrideTone || settings.soundTone || 'crystal';
    const toneNames = {
      crystal: 'Crystal Bell',
      marimba: 'Marimba',
      digital: 'Digital Pulse',
      custom: 'Nada Kustom'
    };
    const toneName = toneNames[tone] || 'Crystal Bell';

    // 1. Play sound immediately
    this.playChime(tone);

    // 2. Hardware vibration
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (e) {}
    }

    // 3. Show in-app Toast
    this.showToast(`Uji Notifikasi: Bel ${toneName} berbunyi.`, 'info', 4500);

    // 4. Check system notification permission
    if (!('Notification' in window)) {
      this.showToast('Browser ini tidak mendukung Web Notifications di desktop/layar.', 'warning');
      return false;
    }

    if (Notification.permission === 'default') {
      const result = await this.requestPermission();
      return result === 'granted';
    }

    if (Notification.permission === 'denied') {
      this.showToast('Notifikasi sistem diblokir browser. Buka info situs (ikon gembok) di bilah URL lalu ubah Notifikasi menjadi Izinkan.', 'warning', 7000);
      return false;
    }

    // 5. Send actual OS / system Web Notification
    const res = await this.sendSystemNotification('DayFlow • Notifikasi Berfungsi Normal!', {
      body: `Pengingat jadwal dan bunyi bel ${toneName} aktif. Siap mengingatkan agenda harianmu!`,
      tag: 'dayflow_test_notification',
      renotify: true
    });

    if (res.ok) {
      this.showToast('Notifikasi sistem berhasil dimunculkan ke layar!', 'success', 4000);
      return true;
    } else {
      this.showToast('Notifikasi terkirim. Jika tidak muncul, periksa Focus Assist / DND di Windows/HP Anda.', 'warning', 6000);
      return false;
    }
  }

  showToast(message, type = 'info', duration = 3500) {
    if (typeof window !== 'undefined' && typeof window.__dayflowShowToast === 'function') {
      window.__dayflowShowToast(message, type, duration);
      return;
    }
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert';
    if (type === 'error') iconName = 'alert';

    toast.innerHTML = `
      <div class="toast-text">${message}</div>
      <button class="toast-close-btn" aria-label="Tutup Notifikasi">&times;</button>
      <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    container.appendChild(toast);

    let dismissTimer = null;

    const dismiss = () => {
      if (dismissTimer) clearTimeout(dismissTimer);
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px) scale(0.95)';
      toast.style.transition = 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)';
      setTimeout(() => toast.remove(), 180);
    };

    toast.querySelector('.toast-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    });

    dismissTimer = setTimeout(dismiss, duration);
  }

  _startScheduler() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    const runChecks = () => {
      this._checkUpcomingSchedules();
      this._checkDeadlineReminders();
      this._checkProactiveReminders();
    };

    const setIntervalCadence = (ms) => {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(runChecks, ms);
    };

    // Check cadence: 30s while user is viewing the app, 90s when in background
    const isBackground = typeof document !== 'undefined' && document.hidden;
    setIntervalCadence(isBackground ? 90000 : 30000);

    // Initial check right away
    runChecks();

    // Page Visibility API: when user returns, run immediate checks and restore 30s cadence
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function' && !this._visibilityBound) {
      this._visibilityBound = true;
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          runChecks();
          setIntervalCadence(30000);
        } else {
          setIntervalCadence(90000);
        }
      }, { passive: true });
    }
  }

  _checkUpcomingSchedules() {
    const settings = state.getSettings();
    if (settings.systemNotificationsEnabled === false && settings.soundEnabled === false) return;

    const advanceMinutes = settings.notifyAdvanceMinutes || 15;
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Prune stale notification keys from older days
    if (this.notifiedSet.size > 80) {
      for (const key of this.notifiedSet) {
        if (!key.startsWith(todayStr)) {
          this.notifiedSet.delete(key);
        }
      }
      this._saveNotifiedSet();
    }

    const todaySchedules = state.getSchedules(todayStr);

    todaySchedules.forEach((schedule) => {
      if (schedule.completed || schedule.reminder === false) return;

      const [hours, minutes] = String(schedule.time || '00:00').split(':').map(Number);
      const scheduleDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours || 0, minutes || 0, 0);

      const diffMs = scheduleDate.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);

      // If more than 1 minute has elapsed past the scheduled time, DO NOT trigger retroactive chime blast upon opening the app!
      if (diffMins < -1) return;

      // 1. Advance notification check (e.g. 15 minutes before)
      const advanceKey = `${todayStr}_${schedule.id}_advance`;
      if (diffMins > 0 && diffMins <= advanceMinutes && !this.notifiedSet.has(advanceKey)) {
        this.notifiedSet.add(advanceKey);
        this._saveNotifiedSet();

        const timeLabel = `Dalam ${diffMins} menit lagi`;
        const alertMsg = `${schedule.title} (${schedule.time}) — ${timeLabel}`;

        this.playChime();
        this.showToast(alertMsg, 'warning', 6000);

        this.sendSystemNotification('DayFlow Pengingat Jadwal', {
          body: alertMsg,
          tag: `${schedule.id}_advance`,
          renotify: true,
          data: {
            scheduleId: schedule.id,
            scheduleDate: todayStr
          },
          actions: [
            { action: 'snooze_10', title: 'Tunda 10 Menit' },
            { action: 'complete', title: 'Tandai Selesai' }
          ]
        });
      }

      // 2. Exact start time check (diffMins === 0 or just started: diffMins === -1)
      const nowKey = `${todayStr}_${schedule.id}_now`;
      if ((diffMins === 0 || diffMins === -1) && !this.notifiedSet.has(nowKey)) {
        this.notifiedSet.add(nowKey);
        this._saveNotifiedSet();

        const alertMsg = `${schedule.title} (${schedule.time}) — Waktunya kegiatan dimulai!`;

        this.playChime();
        this.showToast(alertMsg, 'warning', 7000);

        this.sendSystemNotification('DayFlow Pengingat Jadwal', {
          body: alertMsg,
          tag: `${schedule.id}_now`,
          renotify: true,
          data: {
            scheduleId: schedule.id,
            scheduleDate: todayStr
          },
          actions: [
            { action: 'snooze_10', title: 'Tunda 10 Menit' },
            { action: 'complete', title: 'Tandai Selesai' }
          ]
        });
      }
    });
  }

  // Snooze schedule reminder by X minutes with automated follow-up chime and alert
  snoozeSchedule(scheduleId, minutes = 10) {
    if (!scheduleId) return;

    if (this._snoozeTimers.has(scheduleId)) {
      clearTimeout(this._snoozeTimers.get(scheduleId));
      this._snoozeTimers.delete(scheduleId);
    }

    const timer = setTimeout(() => {
      this._snoozeTimers.delete(scheduleId);
      const todayStr = getLocalDateString(new Date());
      const schedules = state.getSchedules(todayStr);
      const target = schedules.find(s => s.id === scheduleId);
      if (target && !target.completed) {
        const alertMsg = `${target.title} (${target.time}) — Pengingat Lanjutan (Setelah Ditunda)`;
        this.playChime();
        this.showToast(alertMsg, 'warning', 7000);
        this.sendSystemNotification('DayFlow Pengingat (Ditunda)', {
          body: alertMsg,
          tag: `${scheduleId}_snoozed`,
          renotify: true,
          data: { scheduleId: target.id, scheduleDate: todayStr },
          actions: [
            { action: 'snooze_10', title: 'Tunda 10 Menit' },
            { action: 'complete', title: 'Tandai Selesai' }
          ]
        });
      }
    }, minutes * 60 * 1000);

    this._snoozeTimers.set(scheduleId, timer);
    this.showToast(`Pengingat agenda ditunda ${minutes} menit.`, 'info', 4000);
  }

  // Mark schedule as completed from notification action or background event
  completeSchedule(scheduleId, scheduleDate = null) {
    if (!scheduleId) return;
    const dateStr = scheduleDate || getLocalDateString(new Date());
    state.toggleScheduleComplete(scheduleId, dateStr);
    this.showToast('Agenda berhasil ditandai selesai dari notifikasi.', 'success', 3500);
  }

  // --- Dedicated Deadline Reminder Engine ---
  _checkDeadlineReminders() {
    const settings = state.getSettings();
    if (settings.systemNotificationsEnabled === false && settings.soundEnabled === false) return;

    const now = new Date();
    const todayStr = getLocalDateString(now);
    const deadlineTasks = state.getDeadlineTasks();

    if (!Array.isArray(deadlineTasks) || deadlineTasks.length === 0) return;

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    deadlineTasks.forEach((task) => {
      if (!task || !task.deadline || task.completed) return;

      const dParts = String(task.deadline).split('-').map(Number);
      if (dParts.length < 3 || isNaN(dParts[0])) return;
      const deadDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
      const dayDiff = Math.round((deadDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      const dayName = deadDate.toLocaleDateString('id-ID', { weekday: 'long' });

      // 1. Deadline TODAY (dayDiff === 0)
      if (dayDiff === 0) {
        const key = `${todayStr}_${task.id}_deadline_today`;
        if (!this.notifiedSet.has(key)) {
          this.notifiedSet.add(key);
          this._saveNotifiedSet();

          const alertMsg = `Tenggat Hari Ini: "${task.title}" batas akhirnya adalah hari ini (${dayName})!`;
          this.playChime();
          this.showToast(alertMsg, 'warning', 7000);
          this.sendSystemNotification('DayFlow • Tenggat Hari Ini!', {
            body: alertMsg,
            tag: `deadline_today_${task.id}`,
            renotify: true,
            data: { scheduleId: task.id, scheduleDate: todayStr },
            actions: [
              { action: 'complete', title: 'Tandai Selesai' }
            ]
          });
        }
      }
      // 2. Deadline TOMORROW (dayDiff === 1)
      else if (dayDiff === 1) {
        const key = `${todayStr}_${task.id}_deadline_tomorrow`;
        if (!this.notifiedSet.has(key)) {
          this.notifiedSet.add(key);
          this._saveNotifiedSet();

          const alertMsg = `Tenggat Besok: "${task.title}" batas akhirnya adalah besok (${dayName}).`;
          this.playChime();
          this.showToast(alertMsg, 'info', 6000);
          this.sendSystemNotification('DayFlow • Tenggat Besok', {
            body: alertMsg,
            tag: `deadline_tomorrow_${task.id}`,
            renotify: true,
            data: { scheduleId: task.id, scheduleDate: todayStr }
          });
        }
      }
      // 3. Deadline OVERDUE (dayDiff < 0)
      else if (dayDiff < 0) {
        const key = `${todayStr}_${task.id}_deadline_overdue`;
        if (!this.notifiedSet.has(key)) {
          this.notifiedSet.add(key);
          this._saveNotifiedSet();

          const alertMsg = `Tenggat Terlewat: "${task.title}" sudah melewati tenggat (${Math.abs(dayDiff)} hari lalu)!`;
          this.playChime();
          this.showToast(alertMsg, 'error', 7000);
          this.sendSystemNotification('DayFlow • Tenggat Terlewat!', {
            body: alertMsg,
            tag: `deadline_overdue_${task.id}`,
            renotify: true,
            data: { scheduleId: task.id, scheduleDate: todayStr },
            actions: [
              { action: 'complete', title: 'Tandai Selesai' }
            ]
          });
        }
      }
    });
  }

  // --- Proactive AI Reminder Engine (every two hours from 08:00 to 22:00) ---
  _checkProactiveReminders() {
    const settings = state.getSettings();
    if (settings.proactiveReminders === false) return;

    const now = new Date();
    const todayStr = getLocalDateString(now);
    const slot = getProactiveReminderSlot(now);
    if (!slot) return;
    const currentSlot = slot.id;
    const slotTitle = `Check-in AI • ${String(slot.startHour).padStart(2, '0')}.00`;

    // Check if slot was already triggered today
    let checkins = { date: todayStr, slots: [] };
    try {
      const raw = localStorage.getItem('dayflow_proactive_checkins');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr && Array.isArray(parsed.slots)) {
          checkins = parsed;
        }
      }
    } catch (e) {}

    if (checkins.slots.includes(currentSlot)) return;

    // Find deadline tasks, high priority tasks, and today's schedules
    const deadlineTasks = state.getDeadlineTasks();
    const highTasks = state.getHighPriorityTasks();
    const allTodaySchedules = state.getSchedules(todayStr);
    const todaySchedules = allTodaySchedules.filter((schedule) => !schedule.completed);
    const isDayEmpty = allTodaySchedules.length === 0;
    const offerSchedule = isDayEmpty && !checkins.slots.includes('empty-offer');

    // Build a contextual reminder locally so periodic check-ins never consume AI API quota.
    let message = '';
    let slotTaskTitle = '';

    if (isDayEmpty) {
      message = offerSchedule
        ? 'Agenda hari ini masih kosong. Mau saya bantu menyusun jadwal yang sesuai dengan kegiatanmu?'
        : 'Agenda hari ini masih kosong. Saya siap membantu jika kamu ingin menyusun rencana.';
    } else if (deadlineTasks.length > 0 || highTasks.length > 0) {
      const targetTask = deadlineTasks[0] || highTasks[0];
      slotTaskTitle = targetTask.title;
      let deadlineInfo = '';
      if (targetTask.deadline) {
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dParts = targetTask.deadline.split('-').map(Number);
        const deadDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
        const dayDiff = Math.round((deadDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
        const dayName = deadDate.toLocaleDateString('id-ID', { weekday: 'long' });
        if (dayDiff < 0) {
          deadlineInfo = `tenggatnya sudah terlewat (${Math.abs(dayDiff)} hari lalu)`;
        } else if (dayDiff === 0) {
          deadlineInfo = `tenggatnya HARI INI (${dayName})`;
        } else if (dayDiff === 1) {
          deadlineInfo = `tenggatnya BESOK (${dayName})`;
        } else {
          deadlineInfo = `tenggatnya hari ${dayName} (${dayDiff} hari lagi)`;
        }
      }

      if (slot.startHour < 12) {
        message = `Selamat pagi! Hari ini ada tugas penting "${targetTask.title}"${deadlineInfo ? ' yang ' + deadlineInfo : ''}. Saran fokus: cicil 1-2 langkah awal di pagi ini agar tidak menumpuk mendekati tenggat.`;
      } else if (slot.startHour < 17) {
        message = `Halo! Gimana progres untuk "${targetTask.title}"${deadlineInfo ? ' (' + deadlineInfo + ')' : ''}? Sempatkan istirahat sejenak, lalu lanjutkan dengan sesi fokus 25 menit.`;
      } else {
        message = `Selamat sore! Mari evaluasi persiapan untuk "${targetTask.title}"${deadlineInfo ? ' (' + deadlineInfo + ')' : ''}. Jika butuh bantuan memecah langkah besok, tanyakan ke aku sekarang ya.`;
      }
    } else if (todaySchedules.length > 0) {
      // Fallback: daily schedule summary (no deadline/high-priority tasks)
      const count = todaySchedules.length;
      const firstTask = todaySchedules[0];
      slotTaskTitle = firstTask.title;

      if (slot.startHour < 12) {
        message = `Selamat pagi! Kamu punya ${count} agenda hari ini${count > 1 ? `, mulai dari "${firstTask.title}"` : `: "${firstTask.title}"`}. Semangat jalani hari ini!`;
      } else if (slot.startHour < 17) {
        const done = state.getSchedules(todayStr).filter(s => s.completed).length;
        const total = done + count;
        message = `Halo! Sudah ${done} dari ${total} agenda selesai hari ini. Masih ada ${count} lagi — tetap semangat!`;
      } else {
        const done = state.getSchedules(todayStr).filter(s => s.completed).length;
        const total = done + count;
        message = `Selamat sore! Recap hari ini: ${done}/${total} agenda selesai. ${count > 0 ? `Masih ada ${count} agenda yang belum selesai.` : 'Kerja bagus hari ini!'} Perlu bantu rencanakan besok?`;
      }
    } else {
      // Today's activities are complete; avoid offering another schedule for the empty remainder.
      slotTaskTitle = '';
      if (slot.startHour < 17) {
        message = `Semua agenda hari ini sudah selesai. Jika ada kegiatan tambahan, saya siap membantu menatanya.`;
      } else {
        message = `Semua agenda hari ini sudah selesai. Bagaimana progresmu? Saya siap membantu merencanakan esok hari.`;
      }
    }

    // Record this slot as triggered
    checkins.slots.push(currentSlot);
    if (offerSchedule) checkins.slots.push('empty-offer');
    try {
      localStorage.setItem('dayflow_proactive_checkins', JSON.stringify(checkins));
    } catch (e) {}

    // Store active nudge in localStorage for Today view card
    const nudgeData = {
      slot: currentSlot,
      slotTitle,
      text: message,
      targetTaskTitle: slotTaskTitle,
      offerSchedule,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem('dayflow_active_nudge', JSON.stringify(nudgeData));
    } catch (e) {}

    // Browser notifications are delivered only when permission has already been granted.
    this.sendSystemNotification(`DayFlow AI • ${slotTitle}`, {
      body: message,
      tag: `proactive_${currentSlot}_${todayStr}`,
      renotify: true
    });

    // Notify state subscribers to update UI (nudge card & unread badge)
    state.notify('ai:proactive-reminder', nudgeData);
  }

  getActiveProactiveNudge() {
    try {
      const raw = localStorage.getItem('dayflow_active_nudge');
      if (!raw) return null;
      const data = JSON.parse(raw);
      const today = getLocalDateString(new Date());
      const nudgeDate = getLocalDateString(new Date(data.timestamp));
      if (today === nudgeDate) return data;
      return null;
    } catch (e) {
      return null;
    }
  }

  dismissActiveProactiveNudge() {
    try {
      localStorage.removeItem('dayflow_active_nudge');
      state.notify('ai:proactive-dismissed', null);
    } catch (e) {}
  }
}

export const notifications = new NotificationService();
