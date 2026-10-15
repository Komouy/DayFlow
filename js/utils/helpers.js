/**
 * DayFlow Text & Formatting Helpers
 * Safe HTML escaping and zero-dependency lightweight markdown parsing.
 */

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function inlineMarkdown(str) {
  let s = escapeHtml(str);
  // Inline code `...`
  s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08); padding:2px 5px; border-radius:3px; font-family:var(--font-mono); font-size:12px;">$1</code>');
  // Bold **...**
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic *...*
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return s;
}

export function formatMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isListItem = /^[•\-\*]\s+(.*)$/.test(line);

    if (isListItem) {
      if (!inList) {
        html += '<ul style="margin:6px 0; padding-left:20px; list-style-type:disc;">';
        inList = true;
      }
      const itemContent = line.replace(/^[•\-\*]\s+/, '');
      html += `<li>${inlineMarkdown(itemContent)}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (line.trim() === '') {
        html += '<div style="height:6px;"></div>';
      } else {
        html += `<div style="margin:3px 0; line-height:1.5;">${inlineMarkdown(line)}</div>`;
      }
    }
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}

export function detectScheduleConflicts(schedules) {
  if (!Array.isArray(schedules) || schedules.length < 2) return new Map();

  const sorted = [...schedules]
    .filter(s => s && s.time)
    .map(s => {
      const parts = String(s.time).split(':').map(Number);
      const h = isNaN(parts[0]) ? 0 : parts[0];
      const m = isNaN(parts[1]) ? 0 : parts[1];
      const start = h * 60 + m;
      const dur = Math.max(5, parseInt(s.duration, 10) || 30);
      return {
        id: s.id,
        title: s.title || 'Kegiatan',
        time: s.time,
        start,
        end: start + dur,
        duration: dur
      };
    })
    .sort((a, b) => a.start - b.start);

  const conflicts = new Map();

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    for (let j = i + 1; j < sorted.length; j++) {
      const next = sorted[j];
      if (next.start < current.end) {
        const overlap = current.end - next.start;
        if (!conflicts.has(current.id)) {
          conflicts.set(current.id, {
            otherTitle: next.title,
            overlapMinutes: overlap
          });
        }
        if (!conflicts.has(next.id)) {
          conflicts.set(next.id, {
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

export function generateScheduleText(schedules, dateStr) {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return 'Belum ada agenda untuk hari ini.';
  }

  const d = (dateStr && !isNaN(new Date(dateStr + 'T00:00:00').getTime()))
    ? new Date(dateStr + 'T00:00:00')
    : new Date();

  const formattedDate = d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const sorted = [...schedules].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  let totalMinutes = 0;

  const lines = [
    `*Agenda Harian — ${formattedDate}*`,
    `Disusun dengan DayFlow AI (dayflow-563b2.web.app)`,
    `──────────────────`
  ];

  sorted.forEach(s => {
    const dur = parseInt(s.duration, 10) || 30;
    totalMinutes += dur;
    const cat = s.category ? ` [${s.category}]` : '';
    const status = s.completed ? ' (Selesai)' : '';
    lines.push(`- ${s.time} (${dur}m): ${s.title}${cat}${status}`);
  });

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalTimeStr = hours > 0 ? `${hours} jam ${mins > 0 ? mins + 'm' : ''}` : `${mins} menit`;

  lines.push(`──────────────────`);
  lines.push(`Total: ${sorted.length} kegiatan • Estimasi fokus: ${totalTimeStr}`);

  return lines.join('\n');
}

export function generateGoogleCalendarUrl(schedule) {
  if (!schedule || !schedule.time) return '';
  const dateStr = schedule.date ? schedule.date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [h, m] = (schedule.time || '09:00').split(':').map(Number);
  const dur = parseInt(schedule.duration, 10) || 30;

  const startH = String(isNaN(h) ? 9 : h).padStart(2, '0');
  const startM = String(isNaN(m) ? 0 : m).padStart(2, '0');
  const startMinutes = (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m);
  const endMinutes = startMinutes + dur;
  const endH = String(Math.floor((endMinutes % 1440) / 60)).padStart(2, '0');
  const endM = String(endMinutes % 60).padStart(2, '0');

  const dtStart = `${dateStr}T${startH}${startM}00`;
  const dtEnd = `${dateStr}T${endH}${endM}00`;

  const title = encodeURIComponent(schedule.title || 'Agenda DayFlow');
  const details = encodeURIComponent(`Kategori: ${schedule.category || 'Kerja'} | Disusun dengan DayFlow AI`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}`;
}

export function generateIcsFileContent(schedules, dateStr) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const events = (schedules || []).map(s => {
    const rawDate = (s.date || dateStr || '').replace(/-/g, '');
    const [h, m] = (s.time || '09:00').split(':').map(Number);
    const dur = parseInt(s.duration, 10) || 30;

    const startH = String(isNaN(h) ? 9 : h).padStart(2, '0');
    const startM = String(isNaN(m) ? 0 : m).padStart(2, '0');
    const startMinutes = (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m);
    const endMinutes = startMinutes + dur;
    const endH = String(Math.floor((endMinutes % 1440) / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');

    const dtStart = `${rawDate}T${startH}${startM}00`;
    const dtEnd = `${rawDate}T${endH}${endM}00`;
    const cleanTitle = (s.title || 'Agenda DayFlow').replace(/[,;\n]/g, ' ');

    return [
      'BEGIN:VEVENT',
      `UID:${s.id || Date.now() + Math.random()}@dayflow.web.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${cleanTitle}`,
      `DESCRIPTION:Kategori: ${s.category || 'Kerja'} | Disusun dengan DayFlow AI`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DayFlow AI//Agenda Harian//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events,
    'END:VCALENDAR'
  ].join('\r\n');
}

export const helperMethods = {
  escapeHtml,
  formatMarkdown,
  _inlineMarkdown: inlineMarkdown,
  detectScheduleConflicts,
  generateScheduleText,
  generateGoogleCalendarUrl,
  generateIcsFileContent
};
