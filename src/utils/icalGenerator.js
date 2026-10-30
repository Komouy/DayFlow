/**
 * DayFlow iCalendar (RFC 5545) Generator
 * Menghasilkan file .ics standar yang kompatibel dengan Google Calendar, Apple Calendar (iOS/macOS), dan Microsoft Outlook.
 * Zero external dependencies.
 */

/**
 * Format tanggal YYYY-MM-DD dan waktu HH:MM menjadi format iCal lokal YYYYMMDDTHHMMSS
 */
function formatIcsDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return '';
  const [year, month, day] = dateStr.split('-');
  const [hour, minute] = timeStr.split(':');
  const safeH = String(hour || '09').padStart(2, '0');
  const safeM = String(minute || '00').padStart(2, '0');
  return `${year}${month}${day}T${safeH}${safeM}00`;
}

/**
 * Hitung waktu selesai DTEND berdasarkan waktu mulai dan durasi (menit)
 */
function calculateEndDateTime(dateStr, timeStr, durationMinutes = 30) {
  if (!dateStr || !timeStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  
  const dateObj = new Date(year, (month || 1) - 1, day || 1, hour || 9, minute || 0);
  const dur = Math.max(5, parseInt(durationMinutes, 10) || 30);
  dateObj.setMinutes(dateObj.getMinutes() + dur);

  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const h = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}T${h}${min}00`;
}

/**
 * Bersihkan string untuk escaping standar iCalendar
 */
function escapeIcsText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generate iCalendar RFC 5545 payload string
 * @param {Array} schedules - Daftar agenda DayFlow
 * @param {Object} options - Pengaturan kalender (calendarName, includeCompleted)
 * @returns {string} string isi file .ics
 */
export function generateIcsCalendar(schedules = [], options = {}) {
  const calendarName = options.calendarName || 'DayFlow Kalender Agenda';
  const includeCompleted = options.includeCompleted !== false;
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DayFlow Team//DayFlow Productivity Suite//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Jakarta'
  ];

  const validSchedules = Array.isArray(schedules)
    ? schedules.filter((item) => {
        if (!item || typeof item !== 'object') return false;
        if (!item.title || !item.date || !item.time) return false;
        if (!includeCompleted && item.completed) return false;
        return true;
      })
    : [];

  validSchedules.forEach((item) => {
    const dtStart = formatIcsDateTime(item.date, item.time);
    const dtEnd = calculateEndDateTime(item.date, item.time, item.duration);
    if (!dtStart || !dtEnd) return;

    const uid = item.id
      ? `dayflow-${item.id}@dayflow-563b2.web.app`
      : `dayflow-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@dayflow-563b2.web.app`;

    const summary = escapeIcsText(item.title);
    const description = escapeIcsText(item.description || '');
    const category = escapeIcsText(item.category || 'Umum');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    if (description) {
      lines.push(`DESCRIPTION:${description}`);
    }
    lines.push(`CATEGORIES:${category}`);
    lines.push(item.completed ? 'STATUS:COMPLETED' : 'STATUS:CONFIRMED');

    // High priority reminder hint
    if (item.priority === 'high') {
      lines.push('PRIORITY:1');
    } else {
      lines.push('PRIORITY:5');
    }

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Trigger pengunduhan file .ics langsung di browser
 */
export function downloadIcsFile(schedules = [], filename = 'dayflow_kalender.ics', options = {}) {
  const icsContent = generateIcsCalendar(schedules, options);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
