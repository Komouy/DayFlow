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

    for (let chunk of rawChunks) {
      if (!chunk || chunk.length < 3) continue;

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
              if (diff <= 0) diff += 7;
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

      // Infer category
      let category = isDeadline ? 'Kerja' : 'Fokus';
      if (/kesehatan|olahraga|jogging|lari|gym|sehat|tidur|istirahat|meditasi/i.test(chunk)) category = 'Kesehatan';
      else if (/kerja|kantor|meeting|rapat|proyek|klien|tugas|evaluasi|koding|coding|skripsi|laporan|magang|revisi|kuliah|matkul|ddp|kampus|dosen/i.test(chunk)) category = 'Kerja';
      else if (/pribadi|makan|sarapan|santai|keluarga|hobi|belanja|jalan|nonton|film|bioskop/i.test(chunk)) category = 'Pribadi';

      // Auto-paraphrase title
      let title = chunk;
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
      // Strip conversational suffixes
      title = title.replace(/\b(?:ya|yah|dong|deh|nih|sih|pliss?|please|oke|ok|gas|gasken)\b/gi, '');
      // Strip remaining symbols and excessive spaces
      title = title.replace(/\((?:[^)]*)\)/g, '').replace(/\[(?:[^\]]*)\]/g, '');
      title = title.replace(/[:\-–—.,;!?]+/g, ' ').replace(/\s+/g, ' ').trim();

      // Title capitalization
      if (title.length >= 2) {
        title = title.split(' ')
          .filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      } else {
        title = isDeadline ? 'Kumpul Tugas Bertenggat' : 'Kegiatan Terjadwal';
      }

      // Extract location or note for description
      let description = '';
      const locMatch = chunk.match(/(?:📍|\blengkap\s+di\b|\blokasi\s*[:\-]?\s*|\btempat\s*[:\-]?\s*|\bruang(?:an)?\s*[:\-]?\s*)([^,;\n]+)/i);
      if (locMatch) {
        description = locMatch[1].trim();
      } else if (/selesai|tuntas|done/i.test(chunk)) {
        description = 'Berlangsung s/d selesai';
      }

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

    // 1. Check for explicit [DAYFLOW_SCHEDULES] tag
    const tagMatch = rawText.match(/\[DAYFLOW_SCHEDULES\]([\s\S]*?)\[\/DAYFLOW_SCHEDULES\]/i);
    if (tagMatch) {
      try {
        let jsonStr = tagMatch[1].trim();
        jsonStr = jsonStr.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const categories = state.getCategories();
          const todayDate = getLocalDateString();
          schedules = parsed.map(item => {
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
              title: String(item.title || item.kegiatan || 'Kegiatan Baru').trim(),
              description: String(item.description || item.deskripsi || item.notes || item.catatan || '').trim(),
              date: normalizeDateString(item.date, todayDate),
              time: normalizeTimeString(item.time),
              duration: Math.max(5, parseInt(item.duration, 10) || 30),
              category: finalCat,
              recurrence: finalRec,
              deadline: cleanDeadline,
              priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : (cleanDeadline ? 'high' : 'medium'),
              reminder: item.reminder !== false
            };
          });
        }
      } catch (err) {
        console.warn('Failed parsing [DAYFLOW_SCHEDULES] tag:', err);
      }
      cleanText = rawText.replace(/\[DAYFLOW_SCHEDULES\][\s\S]*?\[\/DAYFLOW_SCHEDULES\]/gi, '').trim();
    } else {
      // 2. Fallback check: Did assistant output bullet points with explicit time?
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
    const chatHistoryEl = document.getElementById('chat-history');
    if (chatHistoryEl) {
      this.setupChatDelegation(chatHistoryEl);
      const history = state.getChatHistory();

      chatHistoryEl.innerHTML = history.map((msg, idx) => {
        if (msg.role === 'user') {
          return `
            <div class="chat-bubble chat-bubble-user">
              <div class="chat-bubble-content">${formatMarkdown(msg.text)}</div>
              <div class="chat-meta text-muted" style="font-size: 10px; margin-top: 4px; text-align: right;">
                ${new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          `;
        }

        // Assistant Bubble: Extract clean conversational text + actionable schedule card
        const { cleanText, schedules } = this.extractSchedulesFromAssistantMessage(msg.text);
        let scheduleCardHtml = '';

        if (schedules.length > 0) {
          const targetDate = schedules[0].date || getLocalDateString();
          const displayDate = new Date(targetDate + 'T00:00:00').toLocaleDateString('id-ID', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
          });

          const itemsHtml = schedules.map(item => {
            let badgesHtml = '';

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

        return `
          <div class="chat-bubble chat-bubble-assistant">
            <div class="chat-bubble-content">${formatMarkdown(cleanText || msg.text)}</div>
            ${scheduleCardHtml}
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
    if (!text) return;

    input.value = '';
    state.addChatMessage('user', text);
    this.renderAiPlanView();

    const submitBtn = document.getElementById('chat-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    const autoSaveToggle = document.getElementById('chat-auto-save-toggle');
    const shouldAutoSave = autoSaveToggle ? autoSaveToggle.checked : !!state.getSettings().chatAutoSave;

    try {
      const reply = await GeminiService.sendChatMessage(text);
      const { schedules } = this.extractSchedulesFromAssistantMessage(reply);

      let isSaved = false;
      if (shouldAutoSave && schedules && schedules.length > 0) {
        state.addSchedules(schedules);
        isSaved = true;
        notifications.playChime();
        notifications.showToast(`${schedules.length} agenda otomatis dimasukkan ke jadwal!`, 'success');
      }

      state.addChatMessage('assistant', reply, false, { savedSchedules: isSaved });
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
      state.clearChatHistory();
      notifications.showToast('Riwayat percakapan telah dibersihkan.', 'info');
    }
  }
};
