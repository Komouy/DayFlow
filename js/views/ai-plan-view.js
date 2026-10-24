/**
 * DayFlow AI Plan View Component
 * Handles Natural Language Day Planning, AI Schedule Extraction, and Gemini Chat Assistant.
 */

import { state, getLocalDateString, normalizeDateString, normalizeTimeString } from '../state.js';
import { getIcon, renderIcons } from '../icons.js';
import { GeminiService } from '../gemini.js';
import { notifications } from '../notifications.js';
import { escapeHtml, formatMarkdown } from '../utils/helpers.js';
import { springBounce, particleBurst } from '../animations.js';

export const aiPlanViewMethods = {
  // --- Extract schedule items from raw text (e.g. AI chat replies or offline parsing) ---
  extractSchedulesFromText(text, targetDate = null) {
    if (!text || typeof text !== 'string') return [];
    const today = getLocalDateString();

    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrowObj);

    const lusaObj = new Date();
    lusaObj.setDate(lusaObj.getDate() + 2);
    const lusaStr = getLocalDateString(lusaObj);

    // Split text by lines, bullet points, or compound connectors like 'terus jam', 'lalu jam', ';'
    const rawChunks = text
      .split(/\n|(?:\r\n)|\b(?:terus|kemudian|lalu)\s+(?:jam|pukul)\b|;/i)
      .map(c => c.trim())
      .filter(Boolean);

    const items = [];
    const deadlineKeywords = /\b(?:deadline|tenggat|paling\s+lambat|harus\s+kumpul|kumpul(?:kan)?(?:\s+tugas)?|submit|due\s+date|maksimal|harus\s+kelar|harus\s+selesai|pengumpulan)\b/i;

    let currentContextDate = targetDate || today;

    for (let chunk of rawChunks) {
      if (!chunk || chunk.length < 3) continue;

      // Filter out raw JSON lines or token fragments from being parsed as schedules
      if (/^\s*(?:\[|\{|\}|\]|"[^"]+"\s*:|,\s*$)/.test(chunk)) continue;

      // Check if chunk is a day header (e.g. "1. Senin:", "Senin:", "Hari Selasa:", "Jadwal Rabu:")
      const dayHeaderMatch = chunk.match(/^\s*(?:\d+[\s.)-]+\s*)?(?:jadwal\s+)?(?:hari\s+)?(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)\s*[:\-]?\s*$/i);
      if (dayHeaderMatch) {
        const dayMap = { 'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3, 'kamis': 4, 'jumat': 5, "jum'at": 5, 'sabtu': 6 };
        const dayIdx = dayMap[dayHeaderMatch[1].toLowerCase()];
        if (dayIdx !== undefined) {
          const nowObj = new Date();
          let diff = dayIdx - nowObj.getDay();
          const isNextWeek = /\b(?:minggu\s+depan|depan)\b/i.test(chunk);
          if (diff < 0) diff += 7;
          if (isNextWeek && diff === 0) diff += 7;
          const targetDay = new Date(nowObj);
          targetDay.setDate(targetDay.getDate() + diff);
          currentContextDate = getLocalDateString(targetDay);
          continue; // Header captured; apply date to subsequent items
        }
      }

      let itemDate = currentContextDate;
      const lower = chunk.toLowerCase();
      const indMonths = {
        januari: '01', jan: '01', februari: '02', feb: '02', maret: '03', mar: '03', april: '04', apr: '04',
        mei: '05', juni: '06', jun: '06', juli: '07', jul: '07', agustus: '08', agu: '08', ags: '08',
        september: '09', sep: '09', oktober: '10', okt: '10', november: '11', nov: '11', desember: '12', des: '12'
      };

      // 1. Check explicit Indonesian date: "16 Oktober 2026", "25 Des", "17 Agustus"
      const explicitDateMatch = chunk.match(/\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|ags|sep|okt|nov|des)(?:\s+(\d{4}))?\b/i);
      if (explicitDateMatch) {
        const d = explicitDateMatch[1].padStart(2, '0');
        const m = indMonths[explicitDateMatch[2].toLowerCase()] || '01';
        const y = explicitDateMatch[3] || new Date().getFullYear();
        itemDate = `${y}-${m}-${d}`;
      } else {
        const isTomorrow = /\bbesok\b|\besok\b/.test(lower) && !/\bhari ini\b/.test(lower);
        const isLusa = /\blusa\b/.test(lower);
        if (isLusa) {
          itemDate = lusaStr;
        } else if (isTomorrow) {
          itemDate = tomorrowStr;
        } else {
          // Check specific day mentions: senin, selasa, rabu, kamis, jumat, sabtu, minggu
          const dayMap = { 'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3, 'kamis': 4, 'jumat': 5, "jum'at": 5, 'sabtu': 6 };
          for (const [dayName, dayIdx] of Object.entries(dayMap)) {
            if (new RegExp(`\\b(?:hari\\s+)?${dayName}\\b`, 'i').test(lower)) {
              const nowObj = new Date();
              let diff = dayIdx - nowObj.getDay();
              const isNextWeek = /\b(?:minggu\s+depan|depan)\b/i.test(lower);
              if (diff < 0) diff += 7;
              if (isNextWeek && diff === 0) diff += 7;
              const targetDay = new Date(nowObj);
              targetDay.setDate(targetDay.getDate() + diff);
              itemDate = getLocalDateString(targetDay);
              break;
            }
          }
        }
      }

      // Check time representation: "jam 5 sore", "jam 8 malam", "08:30 - 10:00", "08.00 - selesai"
      const hasMalam = /\bmalam\b/.test(lower);
      const hasSore = /\bsore\b/.test(lower);
      const hasSiang = /\bsiang\b/.test(lower);
      const hasPagi = /\bpagi\b|\bsubuh\b/.test(lower);

      let startTime = '09:00';
      let duration = 30;
      let matchedTime = false;

      // 1. Check time range: 08:00 - 09:30 or 14.00 - 15.30 or 08.00 - selesai / sampai selesai
      const rangeMatch = chunk.match(/(?:(?:pukul|jam)\s*)?([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s*(?:-|sampai|sd|s\/d|—|hingga)\s*(?:([01]?\d|2[0-3])[:.]([0-5]\d)|selesai|finish|done|tuntas))/i);
      if (rangeMatch) {
        const startH = String(parseInt(rangeMatch[1], 10)).padStart(2, '0');
        const startM = String(parseInt(rangeMatch[2], 10)).padStart(2, '0');
        startTime = `${startH}:${startM}`;
        if (rangeMatch[3] && rangeMatch[4]) {
          const endH = parseInt(rangeMatch[3], 10);
          const endM = parseInt(rangeMatch[4], 10);
          const diffMinutes = (endH * 60 + endM) - (parseInt(startH, 10) * 60 + parseInt(startM, 10));
          if (diffMinutes > 0 && diffMinutes <= 720) {
            duration = diffMinutes;
          }
        } else {
          // Open-ended "sampai selesai" -> default 120 minutes (common for lectures/seminars)
          duration = 120;
        }
        matchedTime = true;
      }

      // 2. Check "jam 8 - selesai" or "pukul 8 sampai selesai"
      if (!matchedTime) {
        const hourSelesaiMatch = chunk.match(/(?:(?:pukul|jam)\s*)(\d{1,2})(?:\s*(?:-|sampai|sd|s\/d|—|hingga)\s*(?:selesai|finish|done|tuntas))/i);
        if (hourSelesaiMatch) {
          let h = parseInt(hourSelesaiMatch[1], 10);
          if (hasSore && h < 12) h += 12;
          if (hasMalam && h < 12 && h > 4) h += 12;
          if (hasSiang && h >= 1 && h <= 5) h += 12;
          startTime = `${String(Math.min(23, Math.max(0, h))).padStart(2, '0')}:00`;
          duration = 120;
          matchedTime = true;
        }
      }

      // 3. Check Indonesian period time: "jam 5 sore", "jam 8 malam", "pukul 10 pagi", "jam 14:00"
      if (!matchedTime) {
        const indPeriodMatch = chunk.match(/(?:pukul|jam)\s*(\d{1,2})(?:[:.](\d{2}))?(?:\s*(pagi|siang|sore|malam))?/i);
        if (indPeriodMatch) {
          let h = parseInt(indPeriodMatch[1], 10);
          const m = indPeriodMatch[2] ? parseInt(indPeriodMatch[2], 10) : 0;
          const period = (indPeriodMatch[3] || '').toLowerCase();

          if ((period === 'sore' || (!period && hasSore)) && h < 12) h += 12;
          if ((period === 'malam' || (!period && hasMalam)) && h < 12) {
            if (h > 4) h += 12; // jam 1-4 malam stays 01:00-04:00
          }
          if ((period === 'siang' || (!period && hasSiang)) && h >= 1 && h <= 5) h += 12;
          if ((period === 'pagi' || (!period && hasPagi)) && h === 12) h = 0;

          startTime = `${String(Math.min(23, Math.max(0, h))).padStart(2, '0')}:${String(Math.min(59, Math.max(0, m))).padStart(2, '0')}`;
          matchedTime = true;
        }
      }

      // 4. Fallback standard HH:MM
      if (!matchedTime) {
        const stdMatch = chunk.match(/([01]?\d|2[0-3])[:.]([0-5]\d)/);
        if (stdMatch) {
          startTime = `${String(parseInt(stdMatch[1], 10)).padStart(2, '0')}:${stdMatch[2]}`;
          matchedTime = true;
        }
      }

      // Check explicit duration
      const durMatch = chunk.match(/\b(\d+)\s*(?:menit|mins?|m)\b/i);
      if (durMatch) {
        duration = parseInt(durMatch[1], 10);
      } else {
        const jamMatch = chunk.match(/\b(\d+)\s*(?:jam|hours?|h)\b/i);
        if (jamMatch) {
          duration = parseInt(jamMatch[1], 10) * 60;
        }
      }

      // Detect Deadline vs Regular Schedule
      const isDeadline = deadlineKeywords.test(chunk);
      let deadlineDate = null;
      let priority = 'medium';

      if (isDeadline) {
        deadlineDate = itemDate;
        priority = 'high';
      }

      // If chunk does not contain any valid time pattern and is not a deadline task, skip
      if (!matchedTime && !isDeadline) {
        continue;
      }

      // Detect Recurrence
      let recurrence = 'none';
      if (/\b(?:setiap\s+hari|tiap\s+hari|rutin\s+harian|sehari-hari|tiap\s+pagi|setiap\s+pagi|tiap\s+sore|setiap\s+sore|tiap\s+malam|setiap\s+malam)\b/i.test(chunk)) {
        recurrence = 'daily';
      } else if (/\b(?:hari\s+kerja|senin\s*(?:sampai|sd|s\/d|-)\s*jumat|senin\s*-\s*jum'at)\b/i.test(chunk)) {
        recurrence = 'weekdays';
      } else if (/\b(?:setiap\s+minggu|tiap\s+minggu|seminggu\s+sekali|setiap\s+(?:senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)|tiap\s+(?:senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu))\b/i.test(chunk)) {
        recurrence = 'weekly';
      } else if (/\b(?:setiap\s+bulan|tiap\s+bulan|sebulan\s+sekali|tiap\s+tanggal|setiap\s+tanggal)\b/i.test(chunk)) {
        recurrence = 'monthly';
      }

      // Extract location or note for description (handles "Ruangan 4D.6", "Lab 2", etc.)
      let description = '';
      const locMatch = chunk.match(/(?:📍|\blengkap\s+di\b|\blokasi\s*[:\-]?\s*|\btempat\s*[:\-]?\s*|\bruang(?:an)?\s*[:\-]?\s*|\bgedung\s*[:\-]?\s*|\blantai\s*[:\-]?\s*)([^,;|\n]+)/i);
      if (locMatch) {
        description = locMatch[0].trim();
      } else if (/selesai|tuntas|done/i.test(chunk)) {
        description = 'Berlangsung s/d selesai';
      }

      // Auto-paraphrase title
      let title = chunk;

      // Handle piped lines like "Kalkulus | 12:30 - 14:10 | Ruangan 4D.6"
      if (title.includes('|')) {
        const pipeParts = title.split('|').map(p => p.trim()).filter(Boolean);
        if (pipeParts.length > 0) {
          title = pipeParts[0];
          if (pipeParts.length >= 3 && !description) {
            description = pipeParts[2];
          }
        }
      }

      // Strip emojis
      title = title.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu, ' ');
      // Strip bullets, list numbers
      title = title.replace(/^[\s\t*•-]+/, '').replace(/^\d+[\s.)-]+\s*/, '');
      // Strip time expressions and "sampai selesai"
      title = title.replace(/(?:(?:pukul|jam)\s*)?[012]?\d[:.][0-5]\d(?:\s*(?:-|sampai|sd|s\/d|—|hingga)\s*(?:[012]?\d[:.][0-5]\d|selesai|finish|done|tuntas))?/gi, ' ');
      title = title.replace(/(?:pukul|jam)\s*\d{1,2}(?:\s*(?:-|sampai|sd|s\/d|—|hingga)\s*(?:selesai|finish|done|tuntas))?/gi, ' ');
      title = title.replace(/(?:pukul|jam)\s*\d{1,2}(?:\s*(?:pagi|siang|sore|malam))?/gi, ' ');
      title = title.replace(/(?:-|sampai|sd|s\/d|—|hingga)\s*(?:selesai|finish|done|tuntas)/gi, ' ');
      title = title.replace(/\b(?:selesai|finish|done|tuntas)\b/gi, ' ');
      title = title.replace(/\b\d+\s*(?:menit|mins?|jam|hours?)\b/gi, ' ');
      // Strip explicit dates & day names
      title = title.replace(/\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|ags|sep|okt|nov|des)(?:\s+(\d{4}))?\b/gi, ' ');
      // Strip conversational noise and trigger prefixes
      title = title.replace(/\b(?:izin\s+mengingatkan(?:\s+jadwal)?|mengingatkan|jadwal(?:\s+mata\s+kuliah)?|mata\s+kuliah|matkul)\b/gi, ' ');
      title = title.replace(/\b(?:tolong(?:\s+dong)?|ingetin(?:\s+aku)?|ingatkan(?:\s+aku)?|jangan\s+lupa(?:\s+ya)?|pliss?|please|aku\s+mau|mau|rencananya|nanti(?:\s+malam|\s+siang|\s+sore)?|harus\s+banget|harus|wajib|kudu|kayaknya|paling\s+lambat|paling\s+lama|deadline(?:\s+nya)?|tenggat(?:\s+waktu)?)\b/gi, ' ');
      // Strip recurrence keywords from title
      title = title.replace(/\b(?:setiap|tiap)\s+(?:hari|pagi|siang|sore|malam|minggu|bulan|senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)\b/gi, ' ');
      title = title.replace(/\b(?:rutin\s+harian|sehari-hari|seminggu\s+sekali|sebulan\s+sekali|hari\s+kerja)\b/gi, ' ');
      // Strip relative dates and day names from title
      title = title.replace(/\b(?:besok(?:\s+pagi|\s+siang|\s+sore|\s+malam)?|lusa|hari\s+ini|semalam)\b/gi, '');
      title = title.replace(/\b(?:hari\s+)?(?:senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)\b/gi, '');
      // Strip location already captured in description
      if (description) {
        title = title.replace(new RegExp(description.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), ' ');
      }
      // Strip conversational suffixes
      title = title.replace(/\b(?:ya|yah|dong|deh|nih|sih|pliss?|please|oke|ok|gas|gasken)\b/gi, '');
      // Strip remaining symbols including pipes and quotes
      title = title.replace(/\((?:[^)]*)\)/g, '').replace(/\[(?:[^\]]*)\]/g, '');
      title = title.replace(/[|:\-–—.,;!?"]+/g, ' ').replace(/\s+/g, ' ').trim();

      // Guard against parser tokens or garbage title
      if (!title || /^["'\s]*(?:null|time|undefined|date|duration|category|recurrence|deadline|priority|description|notes)["'\s]*$/i.test(title) || title === 'Null' || title.length < 2) {
        continue;
      }

      // Title capitalization
      title = title.split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      // Infer category
      let category = isDeadline ? 'Kerja' : 'Fokus';
      if (/kesehatan|olahraga|jogging|lari|gym|sehat|tidur|istirahat|meditasi/i.test(chunk)) category = 'Kesehatan';
      else if (/kerja|kantor|meeting|rapat|proyek|klien|tugas|evaluasi|koding|coding|skripsi|laporan|magang|revisi|kuliah|matkul|ddp|kampus|dosen|kalkulus|literasi|pancasila|filsafat|pemrograman|akidah|informatika/i.test(chunk)) category = 'Fokus';
      else if (/pribadi|makan|sarapan|santai|keluarga|hobi|belanja|jalan|nonton|film|bioskop/i.test(chunk)) category = 'Pribadi';

      items.push({
        title: title,
        description: description,
        date: itemDate,
        time: startTime,
        duration: Math.max(5, duration),
        category: category,
        deadline: deadlineDate,
        priority: priority,
        reminder: true,
        recurrence: recurrence
      });
    }

    return items;
  },

  // --- Extract schedule items from Gemini Assistant Message ---
  extractSchedulesFromAssistantMessage(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { cleanText: '', schedules: [] };
    }

    let cleanText = rawText;
    let schedules = [];

    // 1. Check for explicit [DAYFLOW_SCHEDULES] tag (even if unclosed or truncated)
    const hasTagStart = /\[DAYFLOW_SCHEDULES\]/i.test(rawText);
    if (hasTagStart) {
      let jsonPart = '';
      const closedMatch = rawText.match(/\[DAYFLOW_SCHEDULES\]([\s\S]*?)\[\/DAYFLOW_SCHEDULES\]/i);
      if (closedMatch) {
        jsonPart = closedMatch[1];
        cleanText = rawText.replace(/\[DAYFLOW_SCHEDULES\][\s\S]*?\[\/DAYFLOW_SCHEDULES\]/gi, '').trim();
      } else {
        // Tag was opened but unclosed (e.g. token truncation)
        const parts = rawText.split(/\[DAYFLOW_SCHEDULES\]/i);
        cleanText = (parts[0] || '').trim();
        jsonPart = parts[1] || '';
      }

      // Strip code block backticks
      jsonPart = jsonPart.replace(/```json/gi, '').replace(/```/g, '').trim();

      let parsed = null;
      // Try 1: standard JSON.parse
      try {
        parsed = JSON.parse(jsonPart);
      } catch (e1) {
        // Try 2: If truncated array, trim trailing comma and close bracket
        try {
          let trimmed = jsonPart.replace(/,\s*$/, '').trim();
          if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
            parsed = JSON.parse(trimmed + ']');
          }
        } catch (e2) {}
      }

      // Try 3: Object-by-object regex matcher to salvage every complete object
      if (!Array.isArray(parsed) || parsed.length === 0) {
        parsed = [];
        const objectRegex = /\{[\s\S]*?"(?:title|kegiatan)"\s*:\s*"[^"]+"[\s\S]*?\}/g;
        let m;
        while ((m = objectRegex.exec(jsonPart)) !== null) {
          try {
            const single = JSON.parse(m[0]);
            if (single && (single.title || single.kegiatan)) {
              parsed.push(single);
            }
          } catch (e3) {
            // Lenient regex fallback per object
            try {
              const tM = m[0].match(/"(?:title|kegiatan)"\s*:\s*"([^"]+)"/i);
              const dM = m[0].match(/"date"\s*:\s*"([^"]+)"/i);
              const timeM = m[0].match(/"time"\s*:\s*"([^"]+)"/i);
              const durM = m[0].match(/"duration"\s*:\s*(\d+)/i);
              const descM = m[0].match(/"(?:description|deskripsi|notes)"\s*:\s*"([^"]*)"/i);
              const recM = m[0].match(/"(?:recurrence|perulangan)"\s*:\s*"([^"]+)"/i);
              const catM = m[0].match(/"(?:category|kategori)"\s*:\s*"([^"]+)"/i);
              if (tM && tM[1]) {
                parsed.push({
                  title: tM[1],
                  date: dM ? dM[1] : null,
                  time: timeM ? timeM[1] : '09:00',
                  duration: durM ? parseInt(durM[1], 10) : 30,
                  description: descM ? descM[1] : '',
                  recurrence: recM ? recM[1] : 'none',
                  category: catM ? catM[1] : 'Fokus'
                });
              }
            } catch (e4) {}
          }
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        const categories = state.getCategories();
        const todayDate = getLocalDateString();
        schedules = parsed.map(item => {
          if (!item || typeof item !== 'object') return null;
          let rawTitle = String(item.title || item.kegiatan || '').trim();

          // Discard parser tokens and garbage
          if (/^["'\s]*(?:null|time|undefined|date|duration|category|recurrence|deadline|priority|description|notes)["'\s]*$/i.test(rawTitle) ||
              rawTitle === '"" Null' || rawTitle === '" " Null' || rawTitle === 'Null' || rawTitle === '"time" " "' || rawTitle.length < 2) {
            return null;
          }

          let safeDesc = String(item.description || item.deskripsi || item.notes || item.catatan || '').trim();
          if (rawTitle.includes('|')) {
            const parts = rawTitle.split('|').map(p => p.trim()).filter(Boolean);
            rawTitle = parts[0] || 'Kegiatan Baru';
            if (parts.length > 1 && !safeDesc) {
              safeDesc = parts.slice(1).join(' - ');
            }
          }

          const rawCat = (item.category || item.kategori || 'Kerja').trim();
          const foundCat = categories.find(c => c.name.toLowerCase() === rawCat.toLowerCase());
          const finalCat = foundCat ? foundCat.name : (['Kerja', 'Fokus', 'Pribadi', 'Kesehatan'].includes(rawCat) ? rawCat : 'Kerja');

          const rawRec = String(item.recurrence || item.perulangan || '').toLowerCase().trim();
          const validRec = ['none', 'daily', 'weekdays', 'weekly', 'monthly'];
          const finalRec = validRec.includes(rawRec) ? rawRec : 'none';

          let cleanDeadline = null;
          if (item.deadline && typeof item.deadline === 'string' && item.deadline.trim() && item.deadline !== 'null') {
            cleanDeadline = normalizeDateString(item.deadline, todayDate);
          }

          return {
            title: rawTitle,
            description: safeDesc,
            date: normalizeDateString(item.date, todayDate),
            time: normalizeTimeString(item.time),
            duration: Math.max(5, parseInt(item.duration, 10) || 30),
            category: finalCat,
            recurrence: finalRec,
            deadline: cleanDeadline,
            priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : (cleanDeadline ? 'high' : 'medium'),
            reminder: item.reminder !== false
          };
        }).filter(Boolean);
      }
    } else {
      // 2. Fallback check: ONLY when [DAYFLOW_SCHEDULES] was never generated by the model
      const fallbackItems = this.extractSchedulesFromText(rawText);
      if (fallbackItems && fallbackItems.length > 0) {
        const hasExplicitTime = fallbackItems.some(item => item.time !== '09:00' || item.duration !== 30);
        if (hasExplicitTime) {
          schedules = fallbackItems;
        }
      }
    }

    return { cleanText, schedules };
  },

  // --- Extract note items from Gemini Assistant Message ---
  extractNotesFromAssistantMessage(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { cleanText: '', note: null };
    }

    let cleanText = rawText;
    let note = null;

    const tagMatch = rawText.match(/\[DAYFLOW_NOTE\]([\s\S]*?)\[\/DAYFLOW_NOTE\]/i);
    if (tagMatch) {
      let block = tagMatch[1].trim();
      block = block.replace(/```json/gi, '').replace(/```/g, '').trim();

      // 1. Try standard JSON.parse
      try {
        const parsed = JSON.parse(block);
        if (parsed && typeof parsed === 'object') {
          note = {
            title: String(parsed.title || parsed.judul || 'Catatan Baru').trim(),
            content: String(parsed.content || parsed.isi || parsed.notes || '').trim()
          };
        }
      } catch (err1) {
        // 2. Resilient fallback: handles raw multiline newlines inside string values
        try {
          const titleMatch = block.match(/"(?:title|judul)"\s*:\s*"([^"]+)"/i);
          const contentMatch = block.match(/"(?:content|isi|notes)"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"|\n\s*})/i) ||
                               block.match(/"(?:content|isi|notes)"\s*:\s*"([\s\S]*?)"/i);
          if (titleMatch || contentMatch) {
            note = {
              title: titleMatch ? titleMatch[1].trim() : 'Catatan Baru',
              content: contentMatch ? contentMatch[1].trim() : ''
            };
          }
        } catch (err2) {
          console.warn('Failed parsing [DAYFLOW_NOTE] tag:', err2);
        }
      }

      cleanText = rawText.replace(/\[DAYFLOW_NOTE\][\s\S]*?\[\/DAYFLOW_NOTE\]/gi, '').trim();
    }

    return { cleanText, note };
  },

  // --- Multimodal Attachment Handlers (Image, PDF, Text, CSV) ---
  currentAttachment: null,

  handleFileSelect(file) {
    if (!file) return Promise.resolve(null);

    const previewContainer = document.getElementById('chat-attachment-preview');
    const previewImg = document.getElementById('attachment-preview-img');
    const previewDoc = document.getElementById('attachment-preview-doc');
    const fileNameEl = document.getElementById('attachment-file-name');
    const fileSizeEl = document.getElementById('attachment-file-size');

    const formatSize = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return new Promise((resolve, reject) => {
      try {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isText = file.type.startsWith('text/') || /\.(txt|csv|md|json|ics)$/i.test(file.name);

        if (!isImage && !isPdf && !isText) {
          notifications.showToast('Format berkas tidak didukung. Harap pilih gambar (JPG/PNG), PDF, atau berkas teks/CSV.', 'warning');
          return resolve(null);
        }

        if (isImage) {
          // Prepare image with canvas auto-downscale if huge
          const reader = new FileReader();
          reader.onload = (e) => {
            const rawDataUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
              let width = img.width;
              let height = img.height;
              const maxDim = 1600;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              canvas.getContext('2d').drawImage(img, 0, 0, width, height);
              const compressedUrl = canvas.toDataURL('image/jpeg', 0.84);

              // Micro thumbnail for lightweight localStorage history
              const thumbCanvas = document.createElement('canvas');
              const thumbMax = 180;
              let tW = img.width;
              let tH = img.height;
              if (tW > tH && tW > thumbMax) {
                tH = Math.round((tH * thumbMax) / tW);
                tW = thumbMax;
              } else if (tH > thumbMax) {
                tW = Math.round((tW * thumbMax) / tH);
                tH = thumbMax;
              }
              thumbCanvas.width = tW;
              thumbCanvas.height = tH;
              thumbCanvas.getContext('2d').drawImage(img, 0, 0, tW, tH);
              const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.6);

              const b64 = compressedUrl.split(',')[1];
              this.currentAttachment = {
                name: file.name || 'foto.jpg',
                type: 'image',
                mimeType: 'image/jpeg',
                size: file.size,
                base64: b64,
                thumbUrl: thumbUrl,
                isImage: true,
                isDoc: false
              };

              if (previewImg) {
                previewImg.src = thumbUrl;
                previewImg.classList.remove('hidden');
              }
              if (previewDoc) previewDoc.classList.add('hidden');
              if (fileSizeEl) fileSizeEl.textContent = formatSize(file.size);
              if (previewContainer) previewContainer.classList.remove('hidden');
              notifications.showToast(`Gambar "${file.name}" terlampir. Siap dianalisis!`, 'info', 2500);
              resolve(this.currentAttachment);
            };
            img.onerror = (err) => reject(err);
            img.src = rawDataUrl;
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);

        } else if (isPdf) {
          if (file.size > 10 * 1024 * 1024) {
            notifications.showToast('Ukuran berkas PDF maksimal 10MB.', 'warning');
            return resolve(null);
          }
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target.result;
            const b64 = dataUrl.split(',')[1];
            this.currentAttachment = {
              name: file.name || 'dokumen.pdf',
              type: 'pdf',
              mimeType: 'application/pdf',
              size: file.size,
              base64: b64,
              thumbUrl: '',
              isImage: false,
              isDoc: true
            };

            if (previewImg) previewImg.classList.add('hidden');
            if (previewDoc) {
              previewDoc.classList.remove('hidden');
              if (fileNameEl) fileNameEl.textContent = file.name;
            }
            if (fileSizeEl) fileSizeEl.textContent = formatSize(file.size);
            if (previewContainer) previewContainer.classList.remove('hidden');
            notifications.showToast(`Dokumen PDF "${file.name}" terlampir.`, 'info', 2500);
            resolve(this.currentAttachment);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);

        } else {
          // Text / CSV / MD / JSON / ICS
          if (file.size > 1024 * 1024) {
            notifications.showToast('Ukuran berkas teks maksimal 1MB.', 'warning');
            return resolve(null);
          }
          const reader = new FileReader();
          reader.onload = (e) => {
            const text = e.target.result;
            this.currentAttachment = {
              name: file.name || 'dokumen.txt',
              type: 'text',
              mimeType: file.type || 'text/plain',
              size: file.size,
              textContent: text,
              base64: null,
              thumbUrl: '',
              isImage: false,
              isDoc: true
            };

            if (previewImg) previewImg.classList.add('hidden');
            if (previewDoc) {
              previewDoc.classList.remove('hidden');
              if (fileNameEl) fileNameEl.textContent = file.name;
            }
            if (fileSizeEl) fileSizeEl.textContent = formatSize(file.size);
            if (previewContainer) previewContainer.classList.remove('hidden');
            notifications.showToast(`Berkas "${file.name}" terlampir.`, 'info', 2500);
            resolve(this.currentAttachment);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsText(file);
        }
      } catch (err) {
        console.error('Error attaching file:', err);
        notifications.showToast('Gagal memproses lampiran: ' + err.message, 'error');
        resolve(null);
      }
    });
  },

  clearCurrentAttachment() {
    this.currentAttachment = null;
    const previewContainer = document.getElementById('chat-attachment-preview');
    if (previewContainer) previewContainer.classList.add('hidden');
    const fileInput = document.getElementById('chat-file-input');
    if (fileInput) fileInput.value = '';
  },

  initChatAttachments() {
    const attachBtn = document.getElementById('btn-chat-attach-file');
    const fileInput = document.getElementById('chat-file-input');
    const cancelBtn = document.getElementById('btn-cancel-attachment');
    const chatInput = document.getElementById('chat-input');
    const chatHistory = document.getElementById('chat-history');

    if (attachBtn && fileInput && !attachBtn._hasAttachHandler) {
      attachBtn._hasAttachHandler = true;
      attachBtn.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          this.handleFileSelect(file);
        }
      });
    }

    if (cancelBtn && !cancelBtn._hasCancelHandler) {
      cancelBtn._hasCancelHandler = true;
      cancelBtn.addEventListener('click', () => {
        this.clearCurrentAttachment();
      });
    }

    // Clipboard Paste listener (Ctrl+V screenshot / image paste directly in chat)
    if (chatInput && !chatInput._hasPasteHandler) {
      chatInput._hasPasteHandler = true;
      chatInput.addEventListener('paste', (e) => {
        const clipboardItems = e.clipboardData && e.clipboardData.items;
        if (!clipboardItems) return;

        for (let i = 0; i < clipboardItems.length; i++) {
          const item = clipboardItems[i];
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
              e.preventDefault();
              this.handleFileSelect(blob);
              break;
            }
          }
        }
      });
    }

    // Drag and Drop listeners
    const dropZones = [chatHistory, document.getElementById('chat-form')].filter(Boolean);
    dropZones.forEach(zone => {
      if (zone && !zone._hasDragHandler) {
        zone._hasDragHandler = true;
        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.style.outline = '2px dashed var(--accent-primary)';
          zone.style.outlineOffset = '-4px';
        });
        zone.addEventListener('dragleave', (e) => {
          e.preventDefault();
          zone.style.outline = 'none';
        });
        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.style.outline = 'none';
          const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          if (file) {
            this.handleFileSelect(file);
          }
        });
      }
    });

    // Mobile keyboard awareness: keep chat scrolled to bottom when input is focused or viewport resizes
    if (chatInput && !chatInput._hasFocusScrollHandler) {
      chatInput._hasFocusScrollHandler = true;
      chatInput.addEventListener('focus', () => {
        setTimeout(() => {
          const ch = document.getElementById('chat-history');
          if (ch) ch.scrollTop = ch.scrollHeight;
        }, 150);
      });
    }

    if (window.visualViewport && !window._hasVisualViewportChatHandler) {
      window._hasVisualViewportChatHandler = true;
      window.visualViewport.addEventListener('resize', () => {
        if (document.body.classList.contains('tab-ai-plan')) {
          const ch = document.getElementById('chat-history');
          if (ch) ch.scrollTop = ch.scrollHeight;
        }
      });
    }
  },

  setupChatDelegation(containerEl) {
    if (!containerEl || containerEl._hasChatDelegation) return;
    containerEl._hasChatDelegation = true;

    containerEl.addEventListener('click', (e) => {
      const target = e.target;
      if (!target) return;

      // Handle save schedule card from chat
      const saveBtn = target.closest('[data-action="save-chat-card"]');
      if (saveBtn) {
        e.stopPropagation();
        const msgId = saveBtn.getAttribute('data-msg-id');
        const rawJson = saveBtn.getAttribute('data-schedules');
        if (!rawJson) return;

        try {
          const items = JSON.parse(decodeURIComponent(rawJson));
          if (Array.isArray(items) && items.length > 0) {
            const added = state.addSchedules(items);
            state.updateChatMessage(msgId, { savedSchedules: true });
            particleBurst(saveBtn, 'var(--status-success)');
            springBounce(saveBtn);
            notifications.playChime();
            notifications.showToast(`${added.length} agenda berhasil dimasukkan ke jadwal!`, 'success');
            this.renderAiPlanView();
          }
        } catch (err) {
          console.error('Error saving chat schedules:', err);
          notifications.showToast('Gagal menyimpan jadwal.', 'warning');
        }
        return;
      }

      // Handle save note card from chat
      const saveNoteBtn = target.closest('[data-action="save-chat-note"]');
      if (saveNoteBtn) {
        e.stopPropagation();
        const msgId = saveNoteBtn.getAttribute('data-msg-id');
        const rawTitle = saveNoteBtn.getAttribute('data-note-title');
        const rawContent = saveNoteBtn.getAttribute('data-note-content');
        if (!rawTitle && !rawContent) return;

        try {
          const title = decodeURIComponent(rawTitle || 'Catatan AI');
          const content = decodeURIComponent(rawContent || '');
          state.addNote(title, content);
          state.updateChatMessage(msgId, { savedNote: true });
          particleBurst(saveNoteBtn, 'var(--status-success)');
          springBounce(saveNoteBtn);
          notifications.playChime();
          notifications.showToast('Catatan berhasil disimpan ke Catatan & Memo!', 'success');
          this.renderAiPlanView();
        } catch (err) {
          console.error('Error saving chat note:', err);
          notifications.showToast('Gagal menyimpan catatan.', 'warning');
        }
        return;
      }

      // Handle view in agenda
      const viewBtn = target.closest('[data-action="view-chat-date"]');
      if (viewBtn) {
        e.stopPropagation();
        const date = viewBtn.getAttribute('data-date') || getLocalDateString();
        this.selectedScheduleDate = date;
        this.selectedCategory = 'all';
        this.switchTab('schedule');
        return;
      }
    });
  },

  // --- 3. AI Plan View ---
  renderAiPlanView() {
    this.initChatAttachments();
    const chatHistoryEl = document.getElementById('chat-history');
    if (chatHistoryEl) {
      this.setupChatDelegation(chatHistoryEl);
      const history = state.getChatHistory();

      chatHistoryEl.innerHTML = history.map((msg, idx) => {
        if (msg.role === 'user') {
          let attachmentHtml = '';
          if (msg.attachment) {
            if (msg.attachment.isImage && msg.attachment.thumbUrl) {
              attachmentHtml = `
                <div class="chat-bubble-attachment">
                  <img src="${msg.attachment.thumbUrl}" class="chat-attachment-img" alt="${escapeHtml(msg.attachment.name || 'Foto')}">
                </div>
              `;
            } else if (msg.attachment.isDoc) {
              attachmentHtml = `
                <div class="chat-bubble-attachment">
                  <div class="chat-attachment-pill">
                    <span data-icon="file" data-icon-size="14"></span>
                    <span>${escapeHtml(msg.attachment.name || 'Dokumen')}</span>
                  </div>
                </div>
              `;
            }
          }

          return `
            <div class="chat-bubble chat-bubble-user">
              ${attachmentHtml}
              <div class="chat-bubble-content">${formatMarkdown(msg.text || '')}</div>
              <div class="chat-meta text-muted" style="font-size: 10px; margin-top: 4px; text-align: right;">
                ${new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          `;
        }

        // Assistant Bubble: Extract clean conversational text + actionable schedule card + actionable note card
        const { cleanText: textAfterSchedule, schedules } = this.extractSchedulesFromAssistantMessage(msg.text);
        const { cleanText: finalCleanText, note } = this.extractNotesFromAssistantMessage(textAfterSchedule);

        let scheduleCardHtml = '';
        if (schedules.length > 0) {
          const uniqueDates = [...new Set(schedules.map(s => s.date).filter(Boolean))].sort();
          const targetDate = schedules[0].date || getLocalDateString();
          let displayDate = '';
          if (uniqueDates.length === 1) {
            displayDate = new Date(uniqueDates[0] + 'T00:00:00').toLocaleDateString('id-ID', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            });
          } else if (uniqueDates.length > 1) {
            const firstDate = new Date(uniqueDates[0] + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
            const lastDate = new Date(uniqueDates[uniqueDates.length - 1] + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
            displayDate = `${firstDate} – ${lastDate} (${uniqueDates.length} Hari)`;
          } else {
            displayDate = 'Hari Ini';
          }

          const itemsHtml = schedules.map(item => {
            let badgesHtml = '';

            // Day pill if schedules span across multiple dates (e.g. weekly university timetable)
            const itemDayBadge = uniqueDates.length > 1 && item.date
              ? `<span style="font-size:10px; font-weight:600; color:var(--text-secondary); padding:1px 6px; border-radius:4px; background:rgba(255,255,255,0.06); font-family:var(--font-mono);">${new Date(item.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short' })}</span>`
              : '';

            // Recurrence badge
            if (item.recurrence && item.recurrence !== 'none') {
              const recLabels = { daily: 'Tiap Hari', weekdays: 'Hari Kerja', weekly: 'Mingguan', monthly: 'Bulanan' };
              const label = recLabels[item.recurrence] || 'Berulang';
              badgesHtml += `<span class="recurrence-badge" style="font-size:9px; padding:1px 5px;">${getIcon('repeat', '', 10)} ${label}</span>`;
            }

            // Deadline badge
            if (item.deadline) {
              badgesHtml += `<span class="deadline-badge is-urgent" style="font-size:9px; padding:1px 5px;">${getIcon('clock', '', 9)} Tenggat</span>`;
            }

            // Priority badge
            if (item.priority === 'high') {
              badgesHtml += `<span style="font-size:9px; padding:1px 5px; border-radius:3px; background:rgba(239,68,68,0.12); color:var(--status-danger); font-weight:600;">Tinggi</span>`;
            }

            const catInfo = state.getCategoryByName(item.category);
            const catColor = catInfo.color || '#f97316';

            return `
              <div class="chat-schedule-item-row" style="flex-wrap:wrap; align-items:flex-start;">
                ${itemDayBadge}
                <span class="chat-schedule-item-time tabular-nums">${item.time}</span>
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;">
                  <span class="chat-schedule-item-title">${escapeHtml(item.title)}</span>
                  ${item.description ? `<span style="font-size:11px; color:var(--text-muted); line-height:1.3;">${escapeHtml(item.description)}</span>` : ''}
                </div>
                <span style="font-size:10px; color:var(--text-muted);">${item.duration}m</span>
                <span class="schedule-category-badge" style="background-color:${catColor}18; color:${catColor}; font-size:9px; padding:1px 5px;">
                  ${escapeHtml(item.category)}
                </span>
                ${badgesHtml}
              </div>
            `;
          }).join('');

          const encodedSchedules = encodeURIComponent(JSON.stringify(schedules));

          let actionFooter = '';
          if (msg.savedSchedules) {
            actionFooter = `
              <div class="chat-schedule-actions-row">
                <span class="chat-saved-badge">
                  ${getIcon('check', '', 12)} Tersimpan di Agenda
                </span>
                <button type="button" class="btn btn-ghost btn-xs" data-action="view-chat-date" data-date="${targetDate}" style="font-size:11px; padding:2px 8px; cursor:pointer;">
                  Lihat di Agenda →
                </button>
              </div>
            `;
          } else {
            actionFooter = `
              <div class="chat-schedule-actions-row">
                <span style="font-size:11px; color:var(--text-muted);">
                  ${schedules.length} kegiatan siap dimasukkan
                </span>
                <button type="button" class="btn btn-primary btn-xs" data-action="save-chat-card" data-msg-id="${msg.id || ('msg_idx_' + idx)}" data-schedules="${encodedSchedules}" style="font-size:11px; padding:4px 10px; cursor:pointer;">
                  ${getIcon('check', '', 12)} Simpan ke Agenda
                </button>
              </div>
            `;
          }

          scheduleCardHtml = `
            <div class="chat-schedule-card">
              <div class="chat-schedule-header">
                <div class="chat-schedule-title-tag">
                  <span data-icon="calendar" data-icon-size="13" class="text-orange"></span>
                  Rencana Terjadwal (${schedules.length} Agenda)
                </div>
                <span class="chat-schedule-date-tag">${displayDate}</span>
              </div>
              <div class="chat-schedule-items">
                ${itemsHtml}
              </div>
              ${actionFooter}
            </div>
          `;
        }

        let noteCardHtml = '';
        if (note) {
          const encodedTitle = encodeURIComponent(note.title);
          const encodedContent = encodeURIComponent(note.content);

          let noteFooter = '';
          if (msg.savedNote) {
            noteFooter = `
              <div class="chat-note-actions-row">
                <span class="chat-note-saved-badge">
                  ${getIcon('check', '', 12)} Tersimpan di Catatan
                </span>
              </div>
            `;
          } else {
            noteFooter = `
              <div class="chat-note-actions-row">
                <button type="button" class="btn btn-primary btn-xs" data-action="save-chat-note" data-msg-id="${msg.id || ('msg_idx_' + idx)}" data-note-title="${encodedTitle}" data-note-content="${encodedContent}" style="font-size:11px; padding:4px 10px; cursor:pointer;">
                  ${getIcon('file-text', '', 12)} Simpan sebagai Catatan
                </button>
              </div>
            `;
          }

          noteCardHtml = `
            <div class="chat-note-card">
              <div class="chat-note-header">
                <div class="chat-note-title-tag">
                  <span data-icon="file-text" data-icon-size="13"></span>
                  ${escapeHtml(note.title)}
                </div>
              </div>
              <div class="chat-note-body">
                ${formatMarkdown(note.content)}
              </div>
              ${noteFooter}
            </div>
          `;
        }

        return `
          <div class="chat-bubble chat-bubble-assistant">
            <div class="chat-bubble-content">${formatMarkdown(finalCleanText || msg.text)}</div>
            ${scheduleCardHtml}
            ${noteCardHtml}
            <div class="chat-meta text-muted" style="font-size: 10px; margin-top: 4px; text-align: right;">
              ${new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        `;
      }).join('');

      renderIcons(chatHistoryEl);
      chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }
  },

  async handleSendChatMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input ? input.value.trim() : '';
    const activeAttachment = this.currentAttachment;

    if (!text && !activeAttachment) return;

    if (input) input.value = '';

    // Snapshot attachment for UI message history
    let attachmentMeta = null;
    if (activeAttachment) {
      attachmentMeta = {
        name: activeAttachment.name,
        type: activeAttachment.type,
        isImage: activeAttachment.isImage,
        isDoc: activeAttachment.isDoc,
        thumbUrl: activeAttachment.thumbUrl || ''
      };
    }

    // Clear current attachment from form
    this.clearCurrentAttachment();

    state.addChatMessage('user', text || (activeAttachment ? `Lampiran: ${activeAttachment.name}` : ''), false, {
      attachment: attachmentMeta
    });
    this.renderAiPlanView();

    const submitBtn = document.getElementById('chat-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    const autoSaveToggle = document.getElementById('chat-auto-save-toggle');
    const shouldAutoSave = autoSaveToggle ? autoSaveToggle.checked : !!state.getSettings().chatAutoSave;

    try {
      const reply = await GeminiService.sendChatMessage(text, activeAttachment);
      const { schedules } = this.extractSchedulesFromAssistantMessage(reply);
      const { note } = this.extractNotesFromAssistantMessage(reply);

      let isScheduleSaved = false;
      if (shouldAutoSave && schedules && schedules.length > 0) {
        state.addSchedules(schedules);
        isScheduleSaved = true;
        notifications.playChime();
        notifications.showToast(`${schedules.length} agenda otomatis dimasukkan ke jadwal!`, 'success');
      }

      state.addChatMessage('assistant', reply, false, {
        savedSchedules: isScheduleSaved,
        savedNote: false
      });
    } catch (err) {
      console.warn('AI chat error, attempting offline extraction fallback:', err);
      // Offline fallback: extract schedules directly from user text
      const fallbackItems = this.extractSchedulesFromText(text);
      if (fallbackItems && fallbackItems.length > 0) {
        let isSaved = false;
        if (shouldAutoSave) {
          state.addSchedules(fallbackItems);
          isSaved = true;
          notifications.playChime();
          notifications.showToast(`${fallbackItems.length} agenda otomatis dimasukkan (offline).`, 'success');
        }
        const jsonBlock = `\n\n[DAYFLOW_SCHEDULES]\n${JSON.stringify(fallbackItems)}\n[/DAYFLOW_SCHEDULES]`;
        const offlineReply = `(Mode Offline / Cepat) Aku telah menyusun ${fallbackItems.length} kegiatan dari rencana yang kamu sampaikan:${jsonBlock}`;
        state.addChatMessage('assistant', offlineReply, false, { savedSchedules: isSaved });
      } else {
        state.addChatMessage('assistant', `Terjadi kendala saat menghubungi AI: ${err.message}`);
        notifications.showToast(err.message, 'error', 4500);
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      this.renderAiPlanView();
    }
  },

  async clearChat() {
    const confirmed = await this.showConfirmDialog({
      title: 'Bersihkan Riwayat Obrolan?',
      message: 'Semua dialog dan konteks percakapan dengan AI Gemini akan dihapus dari sesi ini.',
      confirmText: 'Bersihkan',
      isDanger: true,
      icon: 'trash'
    });

    if (confirmed) {
      this.clearCurrentAttachment();
      state.clearChatHistory();
      notifications.showToast('Riwayat percakapan telah dibersihkan.', 'info');
    }
  }
};
