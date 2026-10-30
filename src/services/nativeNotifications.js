/**
 * Native Android Notifications Service via Capacitor
 * Uses Android AlarmManager (allowWhileIdle: true) to fire exact banner notifications
 * even when DayFlow is closed, killed, or the screen is off.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNativePlatform = () => {
  return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
};

function hashStringToId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

class NativeNotificationService {
  constructor() {
    this._initialized = false;
  }

  async init() {
    if (!isNativePlatform() || this._initialized) return;
    this._initialized = true;

    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      // Create high-importance notification channel for Android 8.0+
      await LocalNotifications.createChannel({
        id: 'dayflow_schedule_channel',
        name: 'Pengingat Jadwal DayFlow',
        description: 'Notifikasi pengingat agenda dan tenggat waktu kegiatan',
        importance: 5, // MAX importance (heads-up banner + sound)
        visibility: 1, // Public on lockscreen
        vibration: true
      });

      // Listen for action clicks (e.g. user tapped notification)
      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        const extra = notificationAction.notification?.extra;
        if (extra?.scheduleId) {
          console.log('[Native] User tapped notification for schedule:', extra.scheduleId);
        }
      });
    } catch (err) {
      console.warn('[NativeNotification] Init failed:', err);
    }
  }

  /**
   * Schedule exact native alarms for all upcoming schedules.
   * Uses allowWhileIdle: true so Android wakes up and fires even in battery saver / screen off.
   */
  async syncSchedules(schedules = [], advanceMinutes = 15) {
    if (!isNativePlatform()) return false;

    try {
      const now = Date.now();
      const notificationsToSchedule = [];

      // Cancel pending notifications first so we avoid duplicates
      const pending = await LocalNotifications.getPending();
      if (pending?.notifications?.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      for (const schedule of schedules) {
        if (schedule.completed || schedule.reminder === false) continue;

        // Parse date and time safely without timezone distortion
        const scheduleDateStr = schedule.date || new Date().toISOString().split('T')[0];
        const [hours, minutes] = String(schedule.time || '00:00').split(':').map(Number);
        const [year, month, day] = scheduleDateStr.split('-').map(Number);
        
        const schedDate = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
        const schedTimeMs = schedDate.getTime();

        // 1. Advance notification (e.g. 15 minutes before)
        const advanceTimeMs = schedTimeMs - advanceMinutes * 60 * 1000;
        if (advanceTimeMs > now) {
          notificationsToSchedule.push({
            id: hashStringToId(`${schedule.id}_adv`),
            title: `DayFlow: ${schedule.title}`,
            body: `${schedule.title} (${schedule.time}) - Dalam ${advanceMinutes} menit lagi`,
            channelId: 'dayflow_schedule_channel',
            schedule: {
              at: new Date(advanceTimeMs),
              allowWhileIdle: true
            },
            extra: {
              scheduleId: schedule.id,
              scheduleDate: scheduleDateStr,
              type: 'advance'
            }
          });
        }

        // 2. Exact event time notification ('Waktunya!')
        if (schedTimeMs > now) {
          notificationsToSchedule.push({
            id: hashStringToId(`${schedule.id}_exact`),
            title: `DayFlow Pengingat: ${schedule.title}`,
            body: `Waktunya: ${schedule.title} (${schedule.time}) sedang berlangsung`,
            channelId: 'dayflow_schedule_channel',
            schedule: {
              at: new Date(schedTimeMs),
              allowWhileIdle: true
            },
            extra: {
              scheduleId: schedule.id,
              scheduleDate: scheduleDateStr,
              type: 'exact'
            }
          });
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: notificationsToSchedule
        });
        console.log(`[Native] Successfully scheduled ${notificationsToSchedule.length} native alarms with Android AlarmManager.`);
      }

      return true;
    } catch (err) {
      console.warn('[NativeNotification] syncSchedules error:', err);
      return false;
    }
  }

  async cancelSchedule(scheduleId) {
    if (!isNativePlatform()) return;
    try {
      await LocalNotifications.cancel({
        notifications: [
          { id: hashStringToId(`${scheduleId}_adv`) },
          { id: hashStringToId(`${scheduleId}_exact`) }
        ]
      });
    } catch (_) {}
  }
}

export const nativeNotifications = new NativeNotificationService();

