/**
 * DayFlow AI Plan View Component
 * Handles Natural Language Day Planning, AI Schedule Extraction, and Gemini Chat Assistant.
 */

import { state, getLocalDateString, normalizeDateString, normalizeTimeString } from '../state.js';
import { getIcon, renderIcons } from '../icons.js';
import { GeminiService } from '../gemini.js';
import { notifications } from '../notifications.js';
import { escapeHtml, formatMarkdown } from '../utils/helpers.js';

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
      const isTomorrow = /\bbesok\b|\besok\b/.test(lower) && !/\bhari ini\b/.test(lower);
      const isLusa = /\blusa\b/.test(lower);
      let itemDate = targetDate || today;

      if (isLusa) {
        itemDate = lusaStr;
      } else if (isTomorrow) {
        itemDate = tomorrowStr;
      }

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

      // Check time representation: "jam 5 sore", "jam 8 malam", "08:30 - 10:00", "pukul 14.00"
      const hasMalam = /\bmalam\b/.test(lower);
      const hasSore = /\bsore\b/.test(lower);
      const hasSiang = /\bsiang\b/.test(lower);
      const hasPagi = /\bpagi\b|\bsubuh\b/.test(lower);

      let startTime = '09:00';
      let duration = 30;
      let matchedTime = false;

      // 1. Check time range: 08:00 - 09:30 or 14.00 - 15.30
      const rangeMatch = chunk.match(/(?:(?:pukul|jam)\s*)?([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s*(?:-|sampai|sd|s\/d|—)\s*([01]?\d|2[0-3])[:.]([0-5]\d))/i);
      if (rangeMatch) {
        const startH = String(parseInt(rangeMatch[1], 10)).padStart(2, '0');
        const startM = String(parseInt(rangeMatch[2], 10)).padStart(2, '0');
        startTime = `${startH}:${startM}`;
        const endH = parseInt(rangeMatch[3], 10);
        const endM = parseInt(rangeMatch[4], 10);
        const diffMinutes = (endH * 60 + endM) - (parseInt(startH, 10) * 60 + parseInt(startM, 10));
        if (diffMinutes > 0 && diffMinutes <= 720) {
          duration = diffMinutes;
        }
        matchedTime = true;
      } else {
        // 2. Check Indonesian period time: "jam 5 sore", "jam 8 malam", "pukul 10 pagi", "jam 14:00"
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
        } else {
          // 3. Fallback standard HH:MM
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
      }

      // Detect Deadline vs Regular Schedule
      const isDeadline = deadlineKeywords.test(chunk);
      let deadlineDate = null;
      let priority = 'medium';

      if (isDeadline) {
        deadlineDate = itemDate;
        priority = 'high';
      }

      // Infer category
      let category = isDeadline ? 'Kerja' : 'Fokus';
      if (/kesehatan|olahraga|jogging|lari|gym|sehat|tidur|istirahat|meditasi/i.test(chunk)) category = 'Kesehatan';
      else if (/kerja|kantor|meeting|rapat|proyek|klien|tugas|evaluasi|koding|coding|skripsi|laporan|magang|revisi/i.test(chunk)) category = 'Kerja';
      else if (/pribadi|makan|sarapan|santai|keluarga|hobi|belanja|jalan|nonton|film|bioskop/i.test(chunk)) category = 'Pribadi';

      // Auto-paraphrase title
      let title = chunk;
      // Strip bullets, list numbers
      title = title.replace(/^[\s\t*•-]+/, '').replace(/^\d+[\s.)-]+\s*/, '');
      // Strip time expressions
      title = title.replace(/(?:(?:pukul|jam)\s*)?[012]?\d[:.][0-5]\d(?:\s*(?:-|sampai|sd|s\/d|—)\s*[012]?\d[:.][0-5]\d)?/gi, '');
      title = title.replace(/(?:pukul|jam)\s*\d{1,2}(?:\s*(?:pagi|siang|sore|malam))?/gi, '');
      title = title.replace(/\b\d+\s*(?:menit|mins?|jam|hours?)\b/gi, '');
      // Strip conversational noise and trigger prefixes
      title = title.replace(/\b(?:tolong(?:\s+dong)?|ingetin(?:\s+aku)?|ingatkan(?:\s+aku)?|jangan\s+lupa(?:\s+ya)?|pliss?|please|aku\s+mau|mau|rencananya|nanti(?:\s+malam|\s+siang|\s+sore)?|harus\s+banget|harus|wajib|kudu|kayaknya|paling\s+lambat|paling\s+lama|deadline(?:\s+nya)?|tenggat(?:\s+waktu)?)\b/gi, '');
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

      items.push({
        title: title,
        date: itemDate,
        time: startTime,
        duration: Math.max(5, duration),
        category: category,
        deadline: deadlineDate,
        priority: priority,
        reminder: true
      });
    }

    return items;
  },

  // --- Save detected schedules from AI Chat bubble ---
  handleSaveChatSchedules(text) {
    const items = this.extractSchedulesFromText(text);
    if (!items || items.length === 0) {
      notifications.showToast('Tidak ada kegiatan terstruktur yang terdeteksi dari pesan ini.', 'warning');
      return;
    }

    const added = state.addSchedules(items);
    if (added && added.length > 0) {
      const targetDate = added[0].date || getLocalDateString();
      this.selectedScheduleDate = targetDate;
      this.selectedCategory = 'all';

      const formattedDate = new Date(targetDate + 'T00:00:00').toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });

      notifications.showToast(`${added.length} jadwal dari AI berhasil disimpan untuk ${formattedDate}!`, 'success');
      this.renderAiPlanView();
      setTimeout(() => this.switchTab('schedule'), 400);
    }
  },

  // --- 3. AI Plan View ---
  renderAiPlanView() {
    const chatHistoryEl = document.getElementById('chat-history');
    if (chatHistoryEl) {
      const history = state.getChatHistory();
      chatHistoryEl.innerHTML = history.map((msg) => {
        return `
          <div class="chat-bubble chat-bubble-${msg.role}">
            <div class="chat-bubble-content">${formatMarkdown(msg.text)}</div>
            <div class="chat-meta text-muted" style="font-size: 10px; margin-top: 4px; text-align: right;">
              ${new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        `;
      }).join('');
      chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }

    // Render pending AI extraction table if any
    const previewContainer = document.getElementById('ai-extracted-preview');
    if (previewContainer) {
      if (this.pendingAiSchedules.length > 0) {
        previewContainer.classList.remove('hidden');
        const firstDate = this.pendingAiSchedules[0]?.date || getLocalDateString();
        const displayDate = new Date(firstDate + 'T00:00:00').toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        const totalItems = this.pendingAiSchedules.length;
        const deadlineItems = this.pendingAiSchedules.filter(s => s.deadline).length;

        previewContainer.innerHTML = `
          <div class="card card-elevated" style="display:flex; flex-direction:column; gap:12px; border:1px solid var(--accent-primary);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <span class="font-medium" style="font-size:14px; display:block;">Hasil Ekstraksi & Parafrase AI (${totalItems} item)</span>
                <span class="text-muted" style="font-size:11px; display:flex; align-items:center; flex-wrap:wrap; gap:6px; margin-top:2px;">
                  <span>Agenda: ${displayDate}</span>
                  <span>•</span>
                  ${deadlineItems > 0 
                    ? `<span class="deadline-badge is-urgent" style="font-size:10px; padding:1px 6px;">${getIcon('clock', '', 10)} ${deadlineItems} Tugas Bertenggat (Deadline)</span>`
                    : `<span>Jadwal Rutin</span>`}
                </span>
              </div>
              <button class="btn btn-primary btn-sm" id="btn-save-all-extracted">
                ${getIcon('check', '', 14)} Simpan Semua ke Jadwal
              </button>
            </div>
            <div class="timeline-list">
              ${this.pendingAiSchedules.map((item, idx) => {
                let deadlineBadge = '';
                if (item.deadline) {
                  deadlineBadge = `
                    <span class="deadline-badge is-urgent" style="font-size:10px; padding:2px 6px; display:inline-flex; align-items:center; gap:3px;">
                      ${getIcon('clock', '', 10)} Tenggat: ${item.deadline}
                    </span>
                  `;
                }

                let priorityBadge = '';
                if (item.priority === 'high') {
                  priorityBadge = `
                    <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:rgba(239,68,68,0.12); color:var(--status-danger); border:1px solid rgba(239,68,68,0.25); display:inline-flex; align-items:center; gap:3px; font-weight:600;">
                      ${getIcon('alert-triangle', '', 10)} Prioritas Tinggi
                    </span>
                  `;
                }

                return `
                  <div class="schedule-card" style="padding: 10px 12px; display:flex; align-items:center; gap:10px;">
                    <div class="tabular-nums text-orange" style="font-size: 13px; font-weight:600; min-width:44px;">${item.time}</div>
                    <div class="schedule-info" style="flex:1; min-width:0;">
                      <div class="schedule-title" style="font-size: 13px; font-weight:600;">${escapeHtml(item.title)}</div>
                      <div class="schedule-time-meta" style="font-size: 11px; margin-top:3px; display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
                        <span>${item.duration}m</span>
                        <span>•</span>
                        <span class="schedule-category-badge">${escapeHtml(item.category)}</span>
                        ${deadlineBadge}
                        ${priorityBadge}
                      </div>
                    </div>
                    <button class="btn btn-ghost btn-sm" data-remove-extracted="${idx}" aria-label="Batal" title="Hapus kegiatan">
                      ${getIcon('x', '', 14)}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;

        // Bind save all
        document.getElementById('btn-save-all-extracted')?.addEventListener('click', () => {
          const itemsToSave = [...this.pendingAiSchedules];
          this.pendingAiSchedules = [];
          const added = state.addSchedules(itemsToSave);

          if (added && added.length > 0) {
            const targetDate = added[0].date || getLocalDateString();
            this.selectedScheduleDate = targetDate;
            this.selectedCategory = 'all';

            const dlCount = added.filter(s => s.deadline).length;
            const toastMsg = dlCount > 0
              ? `${added.length} jadwal disimpan (${dlCount} tugas deadline otomatis dideteksi)!`
              : `${added.length} jadwal berhasil disimpan ke agenda!`;

            notifications.showToast(toastMsg, 'success');
            this.closeAllModals();
            this.renderAiPlanView();
            setTimeout(() => this.switchTab('schedule'), 400);
          }
        });

        // Bind remove single item
        previewContainer.querySelectorAll('[data-remove-extracted]').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-remove-extracted'), 10);
            this.pendingAiSchedules.splice(idx, 1);
            this.renderAiPlanView();
          });
        });
      } else {
        previewContainer.classList.add('hidden');
        previewContainer.innerHTML = '';
      }
    }
  },

  async handleAiScheduleExtraction() {
    const inputEl = document.getElementById('ai-plan-text');
    const text = inputEl ? inputEl.value.trim() : '';

    if (!text) {
      notifications.showToast('Tuliskan rencana kegiatan atau tugasmu terlebih dahulu.', 'warning');
      return;
    }

    const autoSaveCheckbox = document.getElementById('ai-auto-save-schedule');
    const shouldAutoSave = autoSaveCheckbox ? autoSaveCheckbox.checked : true;

    const btn = document.getElementById('btn-parse-ai-schedule');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Memproses & Memparafrasekan...`;

    try {
      const todayDate = getLocalDateString();
      let items = null;

      // Use Gemini AI if AI is ready (via secure Serverless Proxy or API Key), otherwise use smart offline extractor
      if (GeminiService.isAiReady()) {
        try {
          items = await GeminiService.parseNaturalSchedule(text, todayDate);
        } catch (aiErr) {
          console.warn('Gemini extraction failed, using smart offline fallback:', aiErr);
          items = this.extractSchedulesFromText(text, todayDate);
          if (!items || items.length === 0) throw aiErr;
        }
      } else {
        items = this.extractSchedulesFromText(text, todayDate);
      }

      if (!items || items.length === 0) {
        notifications.showToast('Tidak ada kegiatan atau waktu yang berhasil dikenali. Contoh: "besok jam 5 sore kumpul tugas fisika bab 2 paling lambat"', 'warning', 5000);
        return;
      }

      const deadlineCount = items.filter(s => s.deadline).length;

      if (shouldAutoSave) {
        // Direct atomic save to state
        const added = state.addSchedules(items);
        this.pendingAiSchedules = [];
        inputEl.value = '';

        const targetDate = added[0]?.date || todayDate;
        this.selectedScheduleDate = targetDate;
        this.selectedCategory = 'all';

        const formattedDate = new Date(targetDate + 'T00:00:00').toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });

        const toastMsg = deadlineCount > 0
          ? `${added.length} jadwal tersimpan (${deadlineCount} tugas deadline otomatis diparafrasekan & diberi prioritas tinggi)!`
          : `${added.length} jadwal berhasil dibuat dan langsung disimpan untuk ${formattedDate}!`;

        notifications.showToast(toastMsg, 'success', 4500);
        this.closeAllModals();
        this.renderAiPlanView();
        setTimeout(() => this.switchTab('schedule'), 400);
      } else {
        // Keep in preview
        this.pendingAiSchedules = items;
        inputEl.value = '';
        const toastMsg = deadlineCount > 0
          ? `${items.length} kegiatan berhasil diparafrasekan (${deadlineCount} tugas deadline terdeteksi). Klik 'Simpan Semua' untuk memasukkan ke jadwal.`
          : `${items.length} kegiatan diekstrak & diparafrasekan. Klik 'Simpan Semua' untuk memasukkan ke jadwal.`;

        notifications.showToast(toastMsg, 'info', 4500);
        this.renderAiPlanView();

        const previewContainer = document.getElementById('ai-extracted-preview');
        previewContainer?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (err) {
      notifications.showToast(err.message, 'error', 5000);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
      renderIcons();
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

    try {
      const reply = await GeminiService.sendChatMessage(text);
      state.addChatMessage('assistant', reply);
    } catch (err) {
      state.addChatMessage('assistant', `Terjadi kendala: ${err.message}`);
      notifications.showToast(err.message, 'error', 4500);
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
