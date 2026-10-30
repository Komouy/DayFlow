/**
 * DayFlow Schedule Intelligence Helpers
 * Anti-Slop: Zero emojis, deterministic mathematical conflict detection, and calendar sync.
 */

import { getLocalDateString } from '../services/state.js';

export function stripEmojis(str) {
  if (!str) return '';
  return String(str)
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2600-\u26FF]|\uD83E[\uDD00-\uDDFF])/g, '')
    .trim();
}

export function detectScheduleConflicts(schedules) {
  if (!Array.isArray(schedules) || schedules.length < 2) return new Map();

  const valid = schedules
    .filter(s => s && s.time)
    .map(s => {
      const parts = String(s.time).split(':').map(Number);
      const h = isNaN(parts[0]) ? 0 : parts[0];
      const m = isNaN(parts[1]) ? 0 : parts[1];
      const start = h * 60 + m;
      const dur = Math.max(5, parseInt(s.duration, 10) || 30);
      return {
        id: s.id || `${s.title}_${s.time}`,
        title: s.title || 'Kegiatan',
        time: s.time,
        start,
        end: start + dur,
        duration: dur
      };
    })
    .sort((a, b) => a.start - b.start);

  const conflicts = new Map();

  for (let i = 0; i < valid.length; i++) {
    const current = valid[i];
    for (let j = i + 1; j < valid.length; j++) {
      const next = valid[j];
      if (next.start < current.end) {
        // True overlap duration between overlapping intervals
        const overlap = Math.max(1, Math.min(current.end, next.end) - Math.max(current.start, next.start));
        if (!conflicts.has(current.id)) {
          conflicts.set(current.id, {
            otherId: next.id,
            otherTitle: next.title,
            overlapMinutes: overlap
          });
        }
        if (!conflicts.has(next.id)) {
          conflicts.set(next.id, {
            otherId: current.id,
            otherTitle: current.title,
            overlapMinutes: overlap
          });
        }
      } else {
        break;
      }
    }
  }

  return conflicts;
}

export function generateGoogleCalendarUrl(schedule) {
  if (!schedule || !schedule.time) return '';
  const dateBase = schedule.date ? schedule.date : getLocalDateString();
  const dateParts = dateBase.split('-').map(Number);
  const baseYear = isNaN(dateParts[0]) ? new Date().getFullYear() : dateParts[0];
  const baseMonth = isNaN(dateParts[1]) ? new Date().getMonth() + 1 : dateParts[1];
  const baseDay = isNaN(dateParts[2]) ? new Date().getDate() : dateParts[2];

  const [h, m] = String(schedule.time || '09:00').split(':').map(Number);
  const dur = Math.max(5, parseInt(schedule.duration, 10) || 30);

  const validH = isNaN(h) ? 9 : Math.min(23, Math.max(0, h));
  const validM = isNaN(m) ? 0 : Math.min(59, Math.max(0, m));

  const startDateObj = new Date(baseYear, baseMonth - 1, baseDay, validH, validM, 0);
  const endDateObj = new Date(startDateObj.getTime() + dur * 60 * 1000);

  const formatGCalDate = (d) => {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hr = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${y}${mo}${day}T${hr}${min}${sec}`;
  };

  const dtStart = formatGCalDate(startDateObj);
  const dtEnd = formatGCalDate(endDateObj);

  const title = encodeURIComponent(schedule.title || 'Agenda DayFlow');
  const descText = schedule.description ? `${schedule.description}\n\n` : '';
  const details = encodeURIComponent(`${descText}Kategori: ${schedule.category || 'Kerja'} | Disusun dengan DayFlow AI`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}`;
}
