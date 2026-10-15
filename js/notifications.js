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
  }

  init() {
    this._startScheduler();
  }

  unlockAudio() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  // Synthesize crystal-clear, loud, harmonic acoustic bell chime via Web Audio API
  async playChime(overrideTone = null) {
    const settings = state.getSettings();
    if (!settings.soundEnabled) return;

    const tone = overrideTone || settings.soundTone || 'crystal';

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Dynamics Compressor: keeps output loud, full, and punchy on mobile speakers without clipping
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, now);
      compressor.knee.setValueAtTime(8, now);
      compressor.ratio.setValueAtTime(5, now);
      compressor.attack.setValueAtTime(0.002, now);
      compressor.release.setValueAtTime(0.12, now);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.85, now); // 85% loudness floor (4x louder than previous 0.2)

      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);

      const playTone = (freq, startTime, duration = 0.85, gainLevel = 0.7, waveType = 'triangle') => {
        // Fundamental tone (triangle contains clean overtones easily audible on small transducers)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = waveType;
        osc1.frequency.setValueAtTime(freq, startTime);

        gain1.gain.setValueAtTime(0, startTime);
        gain1.gain.linearRampToValueAtTime(gainLevel, startTime + 0.012);
        gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc1.connect(gain1);
        gain1.connect(compressor);
        osc1.start(startTime);
        osc1.stop(startTime + duration);

        // Acoustic overtone 1 (octave shimmer)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2.008, startTime);

        gain2.gain.setValueAtTime(0, startTime);
        gain2.gain.linearRampToValueAtTime(gainLevel * 0.45, startTime + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

        osc2.connect(gain2);
        gain2.connect(compressor);
        osc2.start(startTime);
        osc2.stop(startTime + duration * 0.7);

        // High sparkle overtone (ting transient)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(freq * 3.015, startTime);

        gain3.gain.setValueAtTime(0, startTime);
        gain3.gain.linearRampToValueAtTime(gainLevel * 0.25, startTime + 0.008);
        gain3.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

        osc3.connect(gain3);
        gain3.connect(compressor);
        osc3.start(startTime);
        osc3.stop(startTime + 0.3);
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
      console.warn('Audio chime playback error:', e);
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      this.showToast('Browser ini tidak mendukung Web Notifications.', 'warning');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.showToast('Izin notifikasi sudah aktif.', 'success');
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        this.showToast('Izin notifikasi berhasil diaktifkan.', 'success');
        this.playChime();
        return true;
      } else {
        this.showToast('Izin notifikasi ditolak oleh pengguna.', 'warning');
        return false;
      }
    } catch (e) {
      console.error('Error requesting notification permission:', e);
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

      // Check for advance reminder (e.g. ~15 mins before)
      const notifyKey = `${schedule.id}_${todayStr}_${diffMins <= 0 ? 'now' : 'advance'}`;

      if (diffMins <= advanceMinutes && diffMins > -5 && !this.notifiedSet.has(notifyKey)) {
        this.notifiedSet.add(notifyKey);

        const timeLabel = diffMins <= 0 ? 'Sedang berlangsung' : `Dalam ${diffMins} menit lagi`;
        const alertMsg = `${schedule.title} (${schedule.time}) - ${timeLabel}`;

        // Play chime sound
        this.playChime();

        // Show in-app toast
        this.showToast(alertMsg, 'warning', 6000);

        // Send Native / PWA Web Notification if granted (Compatible with Android Chrome & Desktop)
        if ('Notification' in window && Notification.permission === 'granted') {
          const notifOptions = {
            body: alertMsg,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: schedule.id,
            renotify: true
          };

          if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(reg => {
              return reg.showNotification('DayFlow Pengingat Jadwal', notifOptions);
            }).catch(() => {
              try {
                new Notification('DayFlow Pengingat Jadwal', notifOptions);
              } catch (err) {
                console.warn('Notification constructor fallback warning:', err);
              }
            });
          } else {
            try {
              new Notification('DayFlow Pengingat Jadwal', notifOptions);
            } catch (err) {
              console.warn('Native notification spawn warning:', err);
            }
          }
        }
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
    if ('Notification' in window && Notification.permission === 'granted') {
      const notifOptions = {
        body: message,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `proactive_${currentSlot}_${todayStr}`,
        renotify: true
      };

      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          return reg.showNotification(`DayFlow AI • ${slotTitle}`, notifOptions);
        }).catch(() => {
          try { new Notification(`DayFlow AI • ${slotTitle}`, notifOptions); } catch (e) {}
        });
      } else {
        try { new Notification(`DayFlow AI • ${slotTitle}`, notifOptions); } catch (e) {}
      }
    }

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
