/**
 * DayFlow Notification & Audio Chime System
 * Provides offline Web Audio acoustic bell chime + Web Notification API integration.
 */

import { state, getLocalDateString } from './state.js';
import { getIcon } from './icons.js';

class NotificationService {
  constructor() {
    this.audioCtx = null;
    this.notifiedSet = new Set();
    this.pollInterval = null;
    this._fallbackAudioCache = {};
    this._visibilityBound = false;
    this._stateSubscribed = false;
  }

  init() {
    this._startScheduler();
    this._bindStateSubscription();
  }

  _bindStateSubscription() {
    if (this._stateSubscribed) return;
    this._stateSubscribed = true;
    try {
      state.subscribe((event) => {
        if (event === 'schedule:added' || event === 'schedules:batch-added' || event === 'schedule:updated' || event === 'schedules:reset') {
          this._checkUpcomingSchedules();
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
        const notif = new Notification(title, finalOptions);
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
      digital: 'Digital Pulse'
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
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert';
    if (type === 'error') iconName = 'alert';

    toast.innerHTML = `
      <div class="toast-icon-wrap">
        ${getIcon(iconName, '', 15)}
      </div>
      <div class="toast-text">${message}</div>
      <button class="toast-close-btn" aria-label="Tutup Notifikasi">
        ${getIcon('x', '', 14)}
      </button>
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
    const advanceMinutes = settings.notifyAdvanceMinutes || 15;
    const now = new Date();
    const todayStr = getLocalDateString(now);

    const todaySchedules = state.getSchedules(todayStr);

    todaySchedules.forEach(schedule => {
      if (schedule.completed || !schedule.reminder) return;

      const [hours, minutes] = (schedule.time || '00:00').split(':').map(Number);
      const scheduleDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

      const diffMs = scheduleDate.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);

      // Check for advance reminder (e.g. ~15 mins before) or 'now'
      const notifyKey = `${schedule.id}_${todayStr}_${diffMins <= 0 ? 'now' : 'advance'}`;

      if (diffMins <= advanceMinutes && diffMins > -5 && !this.notifiedSet.has(notifyKey)) {
        this.notifiedSet.add(notifyKey);

        const timeLabel = diffMins <= 0 ? 'Sedang berlangsung' : `Dalam ${diffMins} menit lagi`;
        const alertMsg = `${schedule.title} (${schedule.time}) — ${timeLabel}`;

        // Play chime sound
        this.playChime();

        // Show in-app toast
        this.showToast(alertMsg, 'warning', 6000);

        // Send Native / PWA Web Notification
        this.sendSystemNotification('DayFlow Pengingat Jadwal', {
          body: alertMsg,
          tag: schedule.id,
          renotify: true
        });
      }
    });
  }

  // --- Proactive AI Reminder Engine (3x daily: Pagi, Siang, Sore) ---
  _checkProactiveReminders() {
    const settings = state.getSettings();
    if (settings.proactiveReminders === false) return;

    const now = new Date();
    const hour = now.getHours();
    const todayStr = getLocalDateString(now);

    let currentSlot = null;
    let slotTitle = '';
    if (hour >= 7 && hour < 11) {
      currentSlot = 'morning';
      slotTitle = 'Sapaan Pagi AI';
    } else if (hour >= 12 && hour < 15) {
      currentSlot = 'afternoon';
      slotTitle = 'Check-in Siang AI';
    } else if (hour >= 17 && hour < 21) {
      currentSlot = 'evening';
      slotTitle = 'Review Sore AI';
    }

    if (!currentSlot) return;

    // Check if slot was already triggered today
    let checkins = { date: todayStr, slots: [] };
    try {
      const raw = localStorage.getItem('dayflow_proactive_checkins');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr) {
          checkins = parsed;
        }
      }
    } catch (e) {}

    if (checkins.slots.includes(currentSlot)) return;

    // Find deadline tasks and high priority tasks
    const deadlineTasks = state.getDeadlineTasks();
    const highTasks = state.getHighPriorityTasks();

    if (deadlineTasks.length === 0 && highTasks.length === 0) return;

    const targetTask = deadlineTasks[0] || highTasks[0];
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

    let message = '';
    if (currentSlot === 'morning') {
      message = `Selamat pagi! Hari ini ada tugas penting "${targetTask.title}"${deadlineInfo ? ' yang ' + deadlineInfo : ''}. Saran fokus: cicil 1-2 langkah awal di pagi ini agar tidak menumpuk mendekati tenggat.`;
    } else if (currentSlot === 'afternoon') {
      message = `Halo di siang hari! Gimana progres untuk "${targetTask.title}"${deadlineInfo ? ' (' + deadlineInfo + ')' : ''}? Sempatkan istirahat sejenak, lalu lanjutkan dengan sesi fokus 25 menit.`;
    } else {
      message = `Selamat sore! Mari evaluasi persiapan untuk "${targetTask.title}"${deadlineInfo ? ' (' + deadlineInfo + ')' : ''}. Jika butuh bantuan memecah langkah besok, tanyakan ke aku sekarang ya.`;
    }

    // Record this slot as triggered
    checkins.slots.push(currentSlot);
    try {
      localStorage.setItem('dayflow_proactive_checkins', JSON.stringify(checkins));
    } catch (e) {}

    // Store active nudge in localStorage for Today view card
    const nudgeData = {
      slot: currentSlot,
      slotTitle,
      text: message,
      targetTaskTitle: targetTask.title,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem('dayflow_active_nudge', JSON.stringify(nudgeData));
    } catch (e) {}

    // Append to AI chat history so AI has messaged first
    state.addChatMessage({
      role: 'assistant',
      text: message,
      isProactive: true,
      timestamp: Date.now()
    });

    // Audio chime + notification
    this.playChime();
    this.showToast(`AI: ${slotTitle} baru tersedia!`, 'info', 5000);

    // Native Web Notification
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
