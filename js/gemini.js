/**
 * DayFlow Gemini AI Integration Service
 * Communicates with Google Gemini models (gemini-2.0-flash / gemini-1.5-flash)
 * Anti-Slop: Zero emojis in AI responses, strict prompt discipline, tabular structures.
 */

import { state, getLocalDateString, normalizeDateString, normalizeTimeString } from './state.js';
import { APP_CONFIG } from './config.js';

const SYSTEM_INSTRUCTION_BASE = `
Kamu adalah DayFlow AI, asisten produktivitas dan manajemen jadwal harian cerdas.
Karakteristik & Aturan Wajib:
1. Anti-Slop: JANGAN PERNAH MENGGUNAKAN EMOJI DALAM BENTUK APAPUN pada responmu.
2. Gunakan Bahasa Indonesia yang lugas, profesional, empatik, terstruktur, dan langsung pada intinya.
3. Hindari kalimat klise atau pujian berbunga-bunga (seperti "Wah ide yang luar biasa!", "Tentu saja kawan!"). Langsung jawab inti persoalan.
4. STRICT FIDELITY (KESETIAAN MUTLAK PADA PERMINTAAN PENGGUNA):
- HANYA jadwalkan kegiatan yang secara EKSPLISIT disebutkan atau diminta oleh pengguna.
- DILARANG KERAS MENGADA-ADA ATAU MENAMBAHKAN KEGIATAN TAMBAHAN YANG TIDAK DIMINTA PENGGUNA!
  * JANGAN PERNAH menambahkan kegiatan buatan sendiri seperti "Persiapan", "Istirahat", "Evaluasi Materi", "Buffer Time", atau agenda pengisi lainnya ke dalam [DAYFLOW_SCHEDULES].
  * Jika pengguna memberikan 1 kegiatan (contoh: "jadwal mata kuliah DDP Jumat, 16 Oktober 2026 jam 08.00 - selesai di Fakultas Saintek 3S.1"), maka tag [DAYFLOW_SCHEDULES] HANYA BOLEH BERISI 1 KEGIATAN ITU SAJA!
  * Jangan memecah atau menambah agenda jeda/evaluasi KECUALI jika pengguna secara tertulis meminta: "buatkan jadwal seharian dengan jeda istirahat dan evaluasi".
5. PEMAHAMAN WAKTU "JAM X - SELESAI" / "SAMPAI SELESAI":
- Pahami variasi kalimat waktu fleksibel seperti: "08.00 - selesai", "jam 8 sampai selesai", "08:00 s/d selesai", atau "jam 8 hingga selesai".
- Artinya kegiatan dimulai pada jam tersebut ("time": "08:00").
- Jika tanggal spesifik disebutkan (misal: "Jumat, 16 Oktober 2026"), gunakan tanggal tersebut ("date": "2026-10-16").
- Sertakan detail lokasi atau ruangan ke dalam judul jika ada (contoh: "Kuliah DDP (Fakultas Saintek 3S.1)").
- Untuk durasi ("duration"), jika tidak disebutkan jam berakhir pastinya karena bersifat "sampai selesai", berikan estimasi waktu wajar untuk kegiatan itu (misal 90-120 menit untuk perkuliahan/seminar, 60 menit untuk rapat), tetapi JANGAN membuat jadwal tambahan lain setelahnya.
6. Konteks waktu saat ini: {CURRENT_DATETIME}.
7. Jadwal yang sudah ada hari ini:
{TODAY_SCHEDULES}
8. Jadwal aktif tersimpan di DayFlow:
{SAVED_SCHEDULES}
9. Tugas penting dengan tenggat/deadline mendatang:
{DEADLINE_TASKS}
Jika pengguna meminta bantuan mencicil tugas deadline (misalnya tugas deadline hari Minggu), berikan pemecahan sub-task taktis dan alokasi waktu yang realistis agar tidak menumpuk.
10. AKSI PENJADWALAN CERDAS (ACTIONABLE SCHEDULE EXECUTION):
Ketika pengguna meminta dibuatkan jadwal, menyebutkan rutinitas/rencana kegiatan (contoh: "jadwalkan besok jam 8 koding", "setiap hari jam 6 pagi lari santai", "ingatkan kumpul tugas hari senin jam 5 sore", atau informasi perkuliahan/kegiatan seperti "jadwal kuliah DDP jam 08.00 - selesai"):
- Tuliskan jawaban percakapan yang ramah, ringkas, dan jelas dalam Bahasa Indonesia.
- DI BAGIAN PALING AKHIR responmu, sertakan blok JSON kegiatan terstruktur di dalam tag khusus:
[DAYFLOW_SCHEDULES]
[
  {
    "title": "Judul ringkas kegiatan (3-6 kata)",
    "description": "Deskripsi singkat / lokasi / ruangan / catatan kegiatan (maksimal 1-2 kalimat)",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "duration": 30,
    "category": "Kerja" | "Fokus" | "Pribadi" | "Kesehatan",
    "recurrence": "none" | "daily" | "weekdays" | "weekly" | "monthly",
    "deadline": "YYYY-MM-DD" | null,
    "priority": "high" | "medium" | "low"
  }
]
[/DAYFLOW_SCHEDULES]
Aturan penting tag [DAYFLOW_SCHEDULES]:
- Wajib menggunakan JSON Array valid tanpa pembungkus codeblock markdown (tanpa tanda triple-backticks json).
- "description": Tuliskan keterangan singkat, lokasi, ruangan, atau catatan penting (contoh: "Fakultas Saintek 3S.1 (s/d selesai)", "Membawa modul & laptop", "Zoom meeting"). Jika tidak ada catatan khusus, isi string kosong "".
- Tentukan "recurrence" secara tepat jika berulang: "daily" (setiap hari), "weekdays" (hari kerja), "weekly" (mingguan), "monthly" (bulanan), atau "none".
- Jika item berupa tugas bertenggat (deadline/pengumpulan/submit), isi "deadline" ("YYYY-MM-DD") dan set "priority": "high".
- Jika pengguna HANYA mengobrol santai, konsultasi, atau bertanya tips umum TANPA menyebut atau meminta jadwal kegiatan, JANGAN sertakan tag [DAYFLOW_SCHEDULES].
- JANGAN PERNAH menambahkan kegiatan fiktif/pengisi (seperti istirahat/persiapan) yang tidak diminta!

11. AKSI PEMBUATAN CATATAN OTOMATIS (ACTIONABLE NOTE EXECUTION):
Ketika pengguna meminta dibuatkan catatan/memo/rangkuman, atau memberikan materi/foto papan tulis/notula rapat yang cocok disimpan sebagai catatan:
- Sertakan blok JSON catatan terstruktur di dalam tag:
[DAYFLOW_NOTE]
{
  "title": "Judul Catatan Ringkas (3-6 kata)",
  "content": "Isi rangkuman catatan lengkap dalam format markdown bersih (gunakan bullet points, ringkasan, atau action items)..."
}
[/DAYFLOW_NOTE]

12. ANALISIS MULTIMODAL GAMBAR & DOKUMEN:
Jika pengguna menyertakan gambar (seperti pamflet kegiatan, jadwal kuliah/akademik, silabus, foto papan tulis/catatan, poster event, atau screenshot kalender) atau berkas dokumen (PDF, TXT, CSV, ICS):
- Teliti dan analisis seluruh teks dan informasi visual yang tertera di dalamnya secara cermat.
- JIKA BERISI JADWAL/ACARA/DEADLINE:
  * Jelaskan ringkasan agenda yang ditemukan secara lugas, rapi, dan terstruktur.
  * WAJIB sertakan tag [DAYFLOW_SCHEDULES] berisi SEMUA kegiatan yang valid.
  * Untuk jadwal kuliah mingguan (Senin, Selasa, Rabu, Kamis, Jumat):
    - Berikan "date" sesuai tanggal hari tersebut pada minggu berjalan atau terdekat (YYYY-MM-DD).
    - Set "recurrence": "weekly".
    - "title": Tuliskan nama mata kuliah/kegiatan bersih tanpa simbol aneh (contoh: "Kuliah Kalkulus", "Kuliah Literasi Digital").
    - "description": Masukkan detail ruangan/lokasi (contoh: "Ruangan 4D.6", "Ruangan 4S.1").
    - "duration": Hitung selisih jam mulai hingga selesai dalam menit (contoh 12:30 - 14:10 = 100 menit).
- JIKA BERISI RINGKASAN MATERI/NOTULA/CATATAN TUGAS:
  * Berikan penjelasan penting.
  * WAJIB sertakan tag [DAYFLOW_NOTE] agar pengguna bisa langsung menyimpannya ke Catatan DayFlow dalam 1 klik.

13. PENANGANAN REVISI / PERUBAHAN JADWAL TERDAHULU (UPDATE & RESCHEDULING):
Ketika pengguna meminta perubahan, revisi jam, pergantian ruangan, penambahan kegiatan, atau pembatalan dari jadwal yang sebelumnya sudah diberikan atau jadwal yang tersimpan:
- KONSISTENSI & ANTI-HALUSINASI: Pertahankan seluruh mata kuliah / kegiatan lain yang tidak diminta diubah secara utuh. Dilarang merombak, menghilangkan, atau menambah kegiatan lain tanpa instruksi eksplisit pengguna.
- MODIFIKASI PRESISI: Hanya ubah parameter yang diminta pengguna (contoh: jika pengguna meminta "geser kuliah Kalkulus ke jam 13:00", maka ubah jam Kalkulus menjadi 13:00, sedangkan kegiatan hari lainnya tetap utuh).
- KEMBALIKAN DAFTAR LENGKAP TERBARU: Di akhir jawaban, WAJIB sertakan blok [DAYFLOW_SCHEDULES] berisi SELURUH jadwal versi terbaru (kombinasi kegiatan yang tidak berubah + kegiatan yang sudah diperbaiki), agar antarmuka DayFlow langsung menyajikan jadwal teranyar secara komprehensif.
- Jelaskan secara ringkas dan ramah perubahan apa saja yang berhasil disesuaikan.
`;

export class GeminiService {
  static getApiKey() {
    const userKey = (state.getSettings().apiKey || '').trim();
    if (userKey) return userKey;
    return (APP_CONFIG.CENTRAL_API_KEY || '').trim();
  }

  static getProxyUrl() {
    return (APP_CONFIG.AI_PROXY_URL || '').trim().replace(/\/+$/, '');
  }


  /**
   * Returns active AI provider: 'gemini' | 'groq'
   */
  static getAiProvider() {
    return state.getSettings().aiProvider || 'gemini';
  }

  static getGroqApiKey() {
    const s = state.getSettings();
    return (s.groqApiKey || s.grokApiKey || '').trim();
  }

  static getGroqModel() {
    const s = state.getSettings();
    if (s.groqModel) return s.groqModel;
    const key = this.getGroqApiKey();
    if (key.startsWith('xai-')) return 'grok-2-latest';
    return APP_CONFIG.DEFAULT_GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  static getGroqApiUrl(key = '') {
    if (key.startsWith('xai-')) {
      return APP_CONFIG.GROK_API_URL || 'https://api.x.ai/v1/chat/completions';
    }
    return APP_CONFIG.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
  }

  // Backward compatibility alias
  static getGrokApiKey() {
    return this.getGroqApiKey();
  }

  static getGrokModel() {
    return this.getGroqModel();
  }

  /**
   * Returns true if AI is operational (either via secure proxy, Gemini key, or Groq key)
   */
  static isAiReady() {
    return Boolean(this.getProxyUrl() || this.getApiKey() || this.getGroqApiKey());
  }

  static getModel() {
    return state.getSettings().geminiModel || APP_CONFIG.DEFAULT_MODEL || 'gemini-3.5-flash-lite';
  }

  static buildSystemPrompt() {
    const todaySchedules = state.getTodaySchedules();
    const deadlineTasks = state.getDeadlineTasks();
    const allSchedules = state.getSchedules();
    const now = new Date();
    const timeStr = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const scheduleListText = todaySchedules.length > 0
      ? todaySchedules.map(s => `- [${s.time} | ${s.duration}m | Prioritas: ${s.priority || 'medium'}] ${s.title} (${s.completed ? 'Selesai' : 'Belum'})`).join('\n')
      : '(Belum ada jadwal hari ini)';

    const deadlineListText = deadlineTasks.length > 0
      ? deadlineTasks.map(s => `- Tugas: "${s.title}" (Tenggat: ${s.deadline}, Prioritas: ${s.priority || 'medium'})`).join('\n')
      : '(Tidak ada tugas dengan tenggat khusus)';

    const activeListText = allSchedules.length > 0
      ? allSchedules.slice(0, 30).map(s => `- [${s.date} | ${s.time} | Durasi: ${s.duration}m | Perulangan: ${s.recurrence || 'none'}] ${s.title}${s.description ? ' (' + s.description + ')' : ''}`).join('\n')
      : '(Belum ada jadwal tersimpan di sistem)';

    return SYSTEM_INSTRUCTION_BASE
      .replace('{CURRENT_DATETIME}', timeStr)
      .replace('{TODAY_SCHEDULES}', scheduleListText)
      .replace('{SAVED_SCHEDULES}', activeListText)
      .replace('{DEADLINE_TASKS}', deadlineListText);
  }

  /**
   * Adapts Gemini payload format into OpenAI / xAI Grok compatible format
   */
  static convertGeminiPayloadToOpenAI(payload, model = null) {
    const messages = [];

    // Extract system instruction if present
    const systemParts = payload.systemInstruction?.parts || [];
    const systemText = systemParts.map(p => p.text).filter(Boolean).join('\n\n');
    if (systemText) {
      messages.push({ role: 'system', content: systemText });
    }

    // Process contents array
    if (Array.isArray(payload.contents)) {
      payload.contents.forEach(turn => {
        const role = (turn.role === 'model' || turn.role === 'assistant') ? 'assistant' : 'user';
        const parts = Array.isArray(turn.parts) ? turn.parts : [];

        const hasImage = parts.some(p => p.inlineData && p.inlineData.data);
        if (hasImage) {
          const contentList = [];
          parts.forEach(p => {
            if (p.inlineData && p.inlineData.data) {
              const mime = p.inlineData.mimeType || 'image/jpeg';
              contentList.push({
                type: 'image_url',
                image_url: {
                  url: `data:${mime};base64,${p.inlineData.data}`
                }
              });
            } else if (p.text) {
              contentList.push({
                type: 'text',
                text: p.text
              });
            }
          });
          messages.push({ role, content: contentList });
        } else {
          const combinedText = parts.map(p => p.text).filter(Boolean).join('\n\n');
          if (combinedText) {
            messages.push({ role, content: combinedText });
          }
        }
      });
    }

    const grokModel = model || this.getGrokModel();
    return {
      model: grokModel,
      messages,
      temperature: payload.generationConfig?.temperature ?? 0.4,
      max_tokens: payload.generationConfig?.maxOutputTokens ?? 4096
    };
  }

  /**
   * Adapts OpenAI / xAI Grok response into Gemini response format
   */
  static convertOpenAIToGeminiResponse(grokData) {
    const text = grokData?.choices?.[0]?.message?.content || '';
    return {
      candidates: [
        {
          content: {
            parts: [{ text }],
            role: 'model'
          },
          finishReason: 'STOP'
        }
      ],
      provider: 'grok',
      model: grokData?.model || 'grok-2-latest'
    };
  }

  /**
   * Direct request to Groq API (GroqCloud / xAI Chat Completions)
   */
  static async requestGroqGenerateContent(payload, customKey = null) {
    const key = (customKey || this.getGroqApiKey()).trim();
    if (!key) {
      throw new Error('Groq / Grok API Key belum diatur.');
    }
    const apiUrl = this.getGroqApiUrl(key);
    const model = this.getGroqModel();
    const groqPayload = this.convertGeminiPayloadToOpenAI(payload, model);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(groqPayload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || `Groq HTTP ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    return this.convertOpenAIToGeminiResponse(data);
  }

  // Alias for backward compatibility
  static async requestGrokGenerateContent(payload, key = null) {
    return this.requestGroqGenerateContent(payload, key);
  }

  /**
   * Resilient request sender routing through Serverless Proxy or direct engine (Gemini or Groq)
   */
  static async requestGenerateContent(payload) {
    const activeProvider = this.getAiProvider(); // 'gemini' | 'groq'
    const apiKey = this.getApiKey();
    const proxyUrl = this.getProxyUrl();
    const userPersonalKey = (state.getSettings().apiKey || '').trim();
    const groqKey = this.getGroqApiKey();

    if (!apiKey && !proxyUrl && !groqKey) {
      throw new Error('Layanan AI belum siap. Konfigurasi AI Gateway atau masukkan API Key di Pengaturan.');
    }

    // Helper: Execute direct or proxy call to Groq
    const executeGroq = async () => {
      if (groqKey) {
        return await this.requestGroqGenerateContent(payload, groqKey);
      }
      if (proxyUrl) {
        const response = await fetch(`${proxyUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'groq',
            payload: payload
          })
        });
        if (response.ok) return await response.json();
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Proxy Groq HTTP ${response.status}`);
      }
      throw new Error('Groq API Key belum diatur.');
    };

    // Helper: Execute direct or proxy call to Gemini
    const executeGemini = async () => {
      const primaryModel = this.getModel();
      const candidateModels = [primaryModel, 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'].filter((v, i, a) => a.indexOf(v) === i);
      let lastGeminiErr = null;

      if (proxyUrl && !userPersonalKey) {
        for (const model of candidateModels) {
          try {
            const response = await fetch(`${proxyUrl}/api/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: 'gemini',
                model: model,
                payload: payload
              })
            });
            if (response.ok) {
              return await response.json();
            }
            const errData = await response.json().catch(() => ({}));
            const status = response.status;
            lastGeminiErr = new Error(errData?.error?.message || `Proxy HTTP ${status}`);
            if (status === 400 || status === 403) break;
          } catch (err) {
            lastGeminiErr = err;
          }
        }
      } else if (apiKey) {
        for (const model of candidateModels) {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              body: JSON.stringify(payload)
            });
            if (response.ok) {
              return await response.json();
            }
            const errData = await response.json().catch(() => ({}));
            const status = response.status;
            lastGeminiErr = new Error(errData?.error?.message || `HTTP ${status}`);
            if (status === 400 || status === 403) break;
          } catch (err) {
            lastGeminiErr = err;
          }
        }
      }
      throw lastGeminiErr || new Error('Gemini tidak tersedia.');
    };

    // ROUTING BASED ON USER PROVIDER PREFERENCE:
    if (activeProvider === 'groq') {
      try {
        return await executeGroq();
      } catch (groqErr) {
        console.warn('DayFlow AI: Groq gagal, mengalihkan ke Gemini...', groqErr);
        try {
          return await executeGemini();
        } catch (geminiErr) {
          throw new Error(`Groq gagal (${groqErr.message}) & Gemini fallback gagal (${geminiErr.message})`);
        }
      }
    } else {
      // Default: Gemini primary, Groq fallback
      try {
        return await executeGemini();
      } catch (geminiErr) {
        console.warn('DayFlow AI: Gemini kendala, mengalihkan ke Groq fallback...', geminiErr);
        if (groqKey || proxyUrl) {
          try {
            return await executeGroq();
          } catch (groqErr) {
            throw new Error(`Gemini gagal (${geminiErr.message}) & Groq fallback gagal (${groqErr.message})`);
          }
        }
        throw geminiErr;
      }
    }
  }

  /**
   * General Chat with Gemini (Supports Multimodal Image & Document Attachments)
   */
  static async sendChatMessage(userText, attachment = null) {
    const systemPrompt = this.buildSystemPrompt();
    
    // The user's input message was already recorded into state.getChatHistory() right before calling sendChatMessage
    const allHistory = state.getChatHistory();
    let historyToUse = allHistory;
    let currentTurnText = typeof userText === 'string' ? userText.trim() : '';

    if (allHistory.length > 0 && allHistory[allHistory.length - 1].role === 'user') {
      const lastMsg = allHistory[allHistory.length - 1];
      historyToUse = allHistory.slice(0, -1);
      if (!currentTurnText) {
        currentTurnText = lastMsg.text;
      }
    }

    // If text document attachment is present, prepend its structured content
    if (attachment && attachment.textContent) {
      const docHeader = `[DOKUMEN TERLAMPIR: ${attachment.name || 'Dokumen'}]\n${attachment.textContent}\n[/DOKUMEN TERLAMPIR]\n\n`;
      currentTurnText = `${docHeader}${currentTurnText || 'Tolong analisis isi dokumen ini dan bantu susunkan jadwal kegiatan atau catatan pentingnya.'}`;
    }

    // Default prompt if user submitted image without typing text or default label
    if ((!currentTurnText || currentTurnText.startsWith('Lampiran:')) && attachment && attachment.base64) {
      currentTurnText = 'Tolong analisis gambar/dokumen terlampir ini secara menyeluruh, jelaskan informasi jadwal/catatan penting yang tertera, dan buatkan jadwal kegiatan dalam tag [DAYFLOW_SCHEDULES] bila relevan.';
    }

    if (!currentTurnText) {
      currentTurnText = 'Halo';
    }

    // Process past history messages (up to 10 previous turns)
    const rawHistory = historyToUse.slice(-10);
    const normalizedTurns = [];

    rawHistory.forEach(msg => {
      if (!msg) return;
      const text = typeof msg.text === 'string' ? msg.text.trim() : '';
      if (!text) return;
      const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';

      if (normalizedTurns.length > 0 && normalizedTurns[normalizedTurns.length - 1].role === role) {
        normalizedTurns[normalizedTurns.length - 1].parts[0].text += `\n\n${text}`;
      } else {
        normalizedTurns.push({
          role: role,
          parts: [{ text: text }]
        });
      }
    });

    // Gemini requires the first turn in contents to be 'user'
    if (normalizedTurns.length > 0 && normalizedTurns[0].role === 'model') {
      normalizedTurns.unshift({
        role: 'user',
        parts: [{ text: 'Halo DayFlow, tolong bantu aku menata jadwal dan rencanaku.' }]
      });
    }

    // Prepare active turn with attachment parts (GUARANTEED ATTACHMENT INCLUSION)
    const activeParts = [];
    if (attachment && attachment.base64 && attachment.mimeType) {
      activeParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.base64
        }
      });
    }
    activeParts.push({ text: currentTurnText });

    // Append to contents: merge if last turn was already user, otherwise push new turn
    if (normalizedTurns.length > 0 && normalizedTurns[normalizedTurns.length - 1].role === 'user') {
      if (attachment && attachment.base64 && attachment.mimeType) {
        normalizedTurns[normalizedTurns.length - 1].parts.unshift({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.base64
          }
        });
      }
      normalizedTurns[normalizedTurns.length - 1].parts[normalizedTurns[normalizedTurns.length - 1].parts.length - 1].text += `\n\n${currentTurnText}`;
    } else {
      normalizedTurns.push({
        role: 'user',
        parts: activeParts
      });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: normalizedTurns,
      generationConfig: {
        temperature: 0.4,
        topP: 0.85,
        maxOutputTokens: 4096
      }
    };

    const data = await this.requestGenerateContent(payload);

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Respons dari model Gemini kosong.');
    }

    return rawText.trim();
  }

  /**
   * AI Day Planner: Parse natural unstructured text into structured schedule objects
   * Features: Auto-paraphrasing conversational input, smart deadline/due date detection, priority tagging.
   */
  static async parseNaturalSchedule(rawPlanText, targetDate = null) {
    const dateToUse = targetDate || getLocalDateString();
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrowObj);
    const lusaObj = new Date();
    lusaObj.setDate(lusaObj.getDate() + 2);
    const lusaStr = getLocalDateString(lusaObj);

    const now = new Date();
    const currentDayName = now.toLocaleDateString('id-ID', { weekday: 'long' });

    const prompt = `
Kamu adalah DayFlow AI Schedule & Task Intelligence Parser profesional. Tugasmu adalah membaca kalimat bebas atau catatan rencana pengguna, MEMPARAFRASEKAN kalimat santai/panjang menjadi judul kegiatan ringkas dan profesional, serta MENDETEKSI SECARA CERDAS apakah suatu kegiatan merupakan TUGAS BERTENGGAT (DEADLINE/DUE DATE) atau JADWAL RUTIN BIASA.

Konteks Waktu & Tanggal:
- Hari ini: ${currentDayName}, "${dateToUse}"
- Besok: "${tomorrowStr}"
- Lusa: "${lusaStr}"
- Format tanggal output WAJIB: "YYYY-MM-DD".

Aturan Pemrosesan:
1. AUTO-PARAFRASE JUDUL ("title"):
   - Parafrasekan kalimat bebas / percakapan santai menjadi judul kegiatan yang ringkas, aktif, dan jelas (3 sampai 6 kata) dalam Bahasa Indonesia.
   - Hapus kata-kata basa-basi, filler, dan conversational noise seperti: "tolong ingetin", "jangan lupa ya", "pliss", "aku harus", "kayaknya mau", "paling lambat", "nanti malem".
   - Awali dengan kata kerja aktif atau nama kegiatan utama.
   - Contoh parafrase:
     * "tolong ingetin besok kumpul tugas fisika bab 2 paling lambat jam 5 sore ya" -> "Kumpul Tugas Fisika Bab 2"
     * "nanti malam jam 8 nonton bioskop bareng teman" -> "Nonton Bioskop bersama Teman"
     * "deadline revisi skripsi bab 4 hari jumat jam 23.59" -> "Revisi Skripsi Bab 4"
     * "besok pagi jam 6 lari santai keliling komplek" -> "Olahraga Lari Pagi"

2. DETEKSI TENGGAT / DEADLINE vs KEGIATAN RUTIN:
   - Analisis apakah kegiatan memiliki batas akhir penyelesaian atau pengumpulan:
     * Indikator DEADLINE: Terdapat kata atau maksud seperti "deadline", "tenggat", "kumpul", "kumpulkan", "pengumpulan", "submit", "paling lambat", "maksimal jam/tanggal", "due", "harus selesai sebelum".
     * Jika item adalah DEADLINE:
       - "deadline": Isi dengan tanggal batas akhir ("YYYY-MM-DD"). Hitung tanggal secara tepat (jika "hari ini" gunakan "${dateToUse}", jika "besok" gunakan "${tomorrowStr}", jika "lusa" gunakan "${lusaStr}", atau hitung tanggal terdekat jika menyebut nama hari).
       - "priority": WAJIB "high".
       - "time": Jika disebutkan jam batas akhir (misal "paling lambat jam 17:00"), gunakan jam tersebut sebagai waktu kegiatan.
     * Jika item BUKAN DEADLINE (hanya rutinitas/aktivitas seperti rapat, makan, belajar santai, olahraga, rekreasi):
       - "deadline": null
       - "priority": "medium" (atau "low" untuk istirahat/hiburan).

3. DETEKSI PERULANGAN / RECURRENCE ("recurrence"):
   - Analisis apakah kegiatan merupakan agenda rutin berulang:
     * "daily" jika menyebut "setiap hari", "tiap hari", "rutin harian", "setiap pagi/sore".
     * "weekdays" jika menyebut "hari kerja", "senin sampai jumat".
     * "weekly" jika menyebut hari berulang seperti "setiap senin", "tiap minggu", "tiap jumat".
     * "monthly" jika menyebut "setiap bulan", "tiap tanggal [X]".
     * "none" jika kegiatan satu kali saja (default).
4. "date": Tanggal pelaksanaan atau agenda (format "YYYY-MM-DD"). Jika pengguna menyebut kegiatan untuk "besok", gunakan "${tomorrowStr}", jika "lusa" gunakan "${lusaStr}", jika tidak disebut khusus gunakan "${dateToUse}".
5. "time": Waktu kegiatan dalam format 24 jam "HH:MM" (contoh: "08:30", "17:00"). Jika tidak disebutkan secara eksplisit, perkirakan secara realistis mulai dari pagi hari.
6. "duration": Estimasi durasi dalam menit (integer bulat, default 30).
7. "category": Pilih salah satu: "Kerja", "Fokus", "Pribadi", "Kesehatan".
8. DILARANG menggunakan markdown codeblocks seperti \`\`\`json atau teks pengantar apapun. Kembalikan HANYA array JSON murni [ ... ].
9. DILARANG menggunakan emoji apapun dalam output JSON.

Format Output WAJIB berupa JSON Array valid:
[
  {
    "title": "Nama ringkas hasil parafrase",
    "date": "${dateToUse}",
    "time": "HH:MM",
    "duration": 30,
    "category": "Kerja",
    "recurrence": "none",
    "deadline": "${tomorrowStr}",
    "priority": "high"
  }
]

Teks Kegiatan dari Pengguna:
"${rawPlanText}"
`;

    const data = await this.requestGenerateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // low temperature for deterministic structure
        maxOutputTokens: 1500,
        responseMimeType: 'application/json'
      }
    });

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean potential code block wrapping
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Extract JSON array cleanly if model added surrounding commentary
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      text = arrayMatch[0];
    }

    const categories = state.getCategories();

    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Format output AI bukan array.');
      return parsed.map(item => {
        const cat = (item.category || item.kategori || '').trim();
        const foundCat = categories.find(c => c.name.toLowerCase() === cat.toLowerCase());
        const finalCategory = foundCat ? foundCat.name : (['Kerja', 'Fokus', 'Pribadi', 'Kesehatan'].includes(cat) ? cat : 'Kerja');

        const rawTitle = item.title || item.kegiatan || item.activity || item.task || item.name || 'Kegiatan Baru';
        const rawDate = item.date || item.tanggal || dateToUse;
        const rawTime = item.time || item.waktu || item.jam || '09:00';
        const rawDuration = item.duration || item.durasi || 30;

        // Clean & validate deadline
        let cleanDeadline = null;
        const rawDeadline = item.deadline || item.tenggat || item.dueDate;
        if (rawDeadline && typeof rawDeadline === 'string' && rawDeadline.trim() !== '' && rawDeadline !== 'null' && rawDeadline !== 'undefined') {
          cleanDeadline = normalizeDateString(rawDeadline, dateToUse);
        }

        // Clean & validate priority
        const rawPriority = String(item.priority || item.prioritas || '').toLowerCase().trim();
        const validPriorities = ['high', 'medium', 'low'];
        const finalPriority = validPriorities.includes(rawPriority)
          ? rawPriority
          : (cleanDeadline ? 'high' : 'medium');

        // Clean & validate recurrence
        const rawRecurrence = String(item.recurrence || item.perulangan || '').toLowerCase().trim();
        const validRecurrence = ['none', 'daily', 'weekdays', 'weekly', 'monthly'];
        const finalRecurrence = validRecurrence.includes(rawRecurrence) ? rawRecurrence : 'none';

        return {
          title: String(rawTitle).trim() || 'Kegiatan Baru',
          date: normalizeDateString(rawDate, dateToUse),
          time: normalizeTimeString(rawTime),
          duration: Math.max(5, parseInt(rawDuration, 10) || 30),
          category: finalCategory,
          deadline: cleanDeadline,
          priority: finalPriority,
          reminder: true,
          recurrence: finalRecurrence
        };
      });
    } catch (e) {
      console.error('Failed to parse AI output as JSON:', text, e);
      throw new Error('AI gagal menghasilkan format jadwal terstruktur. Silakan coba deskripsi yang lebih spesifik.');
    }
  }

  /**
   * Smart Notes Search & Synthesis
   */
  static async searchNotesWithAI(query, notesList) {
    const notesSummary = notesList.map((n, i) => `[${i+1}] Judul: ${n.title}\nIsi:\n${n.content}`).join('\n\n---\n\n');

    const prompt = `
Daftar Catatan Pribadi Pengguna:
${notesSummary}

Pertanyaan/Pencarian Pengguna:
"${query}"

Instruksi:
Jawab atau temukan informasi yang dicari pengguna berdasarkan daftar catatan di atas. Berikan kutipan judul catatan yang relevan jika ada. Jika tidak ditemukan, katakan tidak ditemukan secara ringkas. Jangan gunakan emoji.
`;

    const data = await this.requestGenerateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 600 }
    });

    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Tidak ada catatan yang cocok.';
  }

  /**
   * Health/Test Ping for AI Connection (Tests either custom key, proxy, or central fallback)
   */
  static async testConnection(customKey = null) {
    const keyToTest = (customKey !== null ? customKey : this.getApiKey()).trim();
    const proxyUrl = this.getProxyUrl();

    if (!keyToTest && !proxyUrl) {
      throw new Error('Belum ada API Key atau Serverless Proxy yang dikonfigurasi.');
    }

    const testPayload = {
      contents: [{ role: 'user', parts: [{ text: 'Halo, konfirmasi siap dalam 1 kata.' }] }],
      generationConfig: { maxOutputTokens: 20 }
    };

    // If explicit key provided or proxy not available
    if (keyToTest && (customKey !== null || !proxyUrl)) {
      const candidateModels = [this.getModel(), 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'].filter((v, i, a) => a.indexOf(v) === i);
      for (const model of candidateModels) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(keyToTest)}`;
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': keyToTest
            },
            body: JSON.stringify(testPayload)
          });
          if (res.ok) {
            return { success: true, mode: 'direct', model };
          }
          const err = await res.json().catch(() => ({}));
          if (res.status === 400 || res.status === 403) {
            throw new Error(err?.error?.message || `HTTP ${res.status}`);
          }
        } catch (err) {
          if (err.message && (err.message.includes('API_KEY_INVALID') || err.message.includes('403'))) {
            throw err;
          }
        }
      }
      throw new Error('Koneksi Google Gemini dengan API Key gagal.');
    }

    // Otherwise test via Proxy
    const res = await fetch(`${proxyUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.getModel(),
        payload: testPayload
      })
    });

    if (res.ok) {
      return { success: true, mode: 'proxy', model: this.getModel() };
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Serverless Proxy HTTP ${res.status}`);
  }

  /**
   * Health/Test Ping for Groq / Grok Connection
   */
  static async testGroqConnection(customKey = null) {
    const keyToTest = (customKey !== null ? customKey : this.getGroqApiKey()).trim();
    const testPayload = {
      contents: [{ role: 'user', parts: [{ text: 'Konfirmasi siap dalam 1 kata.' }] }],
      generationConfig: { maxOutputTokens: 20 }
    };

    if (keyToTest) {
      const res = await this.requestGroqGenerateContent(testPayload, keyToTest);
      const isXai = keyToTest.startsWith('xai-');
      return {
        success: true,
        mode: 'groq-direct',
        model: this.getGroqModel(),
        provider: isXai ? 'xAI Grok' : 'GroqCloud',
        data: res
      };
    }

    if (this.getProxyUrl()) {
      const response = await fetch(`${this.getProxyUrl()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'groq',
          payload: testPayload
        })
      });
      if (response.ok) {
        return { success: true, mode: 'proxy-groq', model: this.getGroqModel(), provider: 'Groq via Gateway' };
      }
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gateway Groq HTTP ${response.status}`);
    }

    throw new Error('Belum ada Groq API Key atau Gateway yang terhubung.');
  }

  // Alias for backward compatibility
  static async testGrokConnection(key = null) {
    return this.testGroqConnection(key);
  }

  /**
   * AI Schedule Conflict Resolver
   * Resolves schedule collisions by adjusting start times intelligently.
   * Anti-Slop: Zero emojis, structured JSON response.
   */
  static async resolveScheduleConflicts(conflictsMap, daySchedules, targetDate) {
    const conflictItems = [];
    const fixedItems = [];

    daySchedules.forEach(s => {
      if (conflictsMap.has(s.id)) {
        const info = conflictsMap.get(s.id);
        conflictItems.push({
          id: s.id,
          title: s.title,
          time: s.time,
          duration: s.duration || 30,
          priority: s.priority || 'medium',
          category: s.category || 'Fokus',
          conflictWith: info.otherTitle,
          overlapMinutes: info.overlapMinutes
        });
      } else {
        fixedItems.push({
          id: s.id,
          title: s.title,
          time: s.time,
          duration: s.duration || 30
        });
      }
    });

    if (conflictItems.length === 0) return [];

    const prompt = `
Kamu adalah DayFlow AI Schedule Conflict Optimizer.
Terdapat beberapa kegiatan yang saling bertabrakan (overlapping) pada tanggal ${targetDate}.

Daftar Kegiatan yang Mengalami Bentrok:
${JSON.stringify(conflictItems, null, 2)}

Daftar Kegiatan Lain Hari Ini (Waktu Tetap / Jangan Ditabrak):
${JSON.stringify(fixedItems, null, 2)}

Instruksi Optimasi:
1. Analisis prioritas kegiatan (high/tinggi lebih didahulukan daripada low/rendah) dan durasinya.
2. Geser waktu mulai ("newTime") kegiatan yang bertabrakan ke slot waktu luang terdekat di hari yang sama agar tidak saling bertabrakan dan tidak menabrak jadwal tetap lainnya.
3. Berikan jeda 5-10 menit antar kegiatan bila memungkinkan. Dilarang mengubah durasi kegiatan.
4. JANGAN MENGGUNAKAN EMOJI DALAM BENTUK APAPUN.
5. Format keluaran HANYA berupa JSON Array valid persis seperti format berikut tanpa teks atau markdown lain:
[
  {
    "id": "ID_KEGIATAN",
    "title": "Judul Kegiatan",
    "oldTime": "HH:MM",
    "newTime": "HH:MM",
    "reason": "Alasan singkat penyesuaian waktu tanpa emoji (maksimal 1 kalimat)"
  }
]
`;

    const data = await this.requestGenerateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
    });

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';
    const cleanJson = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      const solutions = JSON.parse(cleanJson);
      return Array.isArray(solutions) ? solutions : [];
    } catch (e) {
      console.error('Failed to parse AI conflict solutions:', raw, e);
      throw new Error('AI gagal menghasilkan format solusi resolusi bentrok.');
    }
  }
}

