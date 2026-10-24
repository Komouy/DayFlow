(() => {
  // js/state.js
  function getLocalDateString(d = /* @__PURE__ */ new Date()) {
    const validDate = d instanceof Date && !isNaN(d.getTime()) ? d : /* @__PURE__ */ new Date();
    const year = validDate.getFullYear();
    const month = String(validDate.getMonth() + 1).padStart(2, "0");
    const day = String(validDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function normalizeDateString(dateVal, fallbackDate = null) {
    const fallback = fallbackDate || getLocalDateString();
    if (!dateVal) return fallback;
    if (typeof dateVal !== "string") {
      if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
        return getLocalDateString(dateVal);
      }
      return fallback;
    }
    const trimmed = dateVal.trim();
    if (!trimmed) return fallback;
    const lower = trimmed.toLowerCase();
    if (lower === "hari ini" || lower === "today") {
      return getLocalDateString();
    }
    if (lower === "besok" || lower === "esok" || lower === "tomorrow") {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() + 1);
      return getLocalDateString(d);
    }
    if (lower === "lusa") {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() + 2);
      return getLocalDateString(d);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
      return trimmed.replace(/\//g, "-");
    }
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const d = dmyMatch[1].padStart(2, "0");
      const m = dmyMatch[2].padStart(2, "0");
      const y = dmyMatch[3];
      return `${y}-${m}-${d}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return getLocalDateString(parsed);
    }
    return fallback;
  }
  function normalizeTimeString(timeVal) {
    if (!timeVal) return "09:00";
    const str = String(timeVal).trim();
    if (!str) return "09:00";
    let cleaned = str.replace(/[.]/g, ":");
    const ampmMatch = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    if (ampmMatch) {
      let hour = parseInt(ampmMatch[1], 10);
      const minute = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
      const isPm = ampmMatch[3].toLowerCase() === "pm";
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
    const match = cleaned.match(/(\d{1,2}):(\d{1,2})/);
    if (match) {
      const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
      const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    const hourOnly = cleaned.match(/\b(\d{1,2})\b/);
    if (hourOnly) {
      const h = Math.min(23, Math.max(0, parseInt(hourOnly[1], 10)));
      return `${String(h).padStart(2, "0")}:00`;
    }
    return "09:00";
  }
  var STORAGE_KEYS = {
    SCHEDULES: "dayflow_schedules_v1",
    NOTES: "dayflow_notes_v1",
    SETTINGS: "dayflow_settings_v1",
    CHAT_HISTORY: "dayflow_chat_history_v1",
    CATEGORIES: "dayflow_categories_v1",
    DAILY_LOGS: "dayflow_daily_logs_v1"
  };
  var DEFAULT_CATEGORIES = [
    { id: "cat_kerja", name: "Kerja", color: "#f97316", isDefault: true },
    { id: "cat_fokus", name: "Fokus", color: "#38bdf8", isDefault: true },
    { id: "cat_pribadi", name: "Pribadi", color: "#c084fc", isDefault: true },
    { id: "cat_kesehatan", name: "Kesehatan", color: "#34d399", isDefault: true }
  ];
  var CATEGORY_PALETTE = [
    "#f97316",
    // Orange
    "#38bdf8",
    // Sky Blue
    "#c084fc",
    // Purple
    "#34d399",
    // Emerald
    "#f43f5e",
    // Rose
    "#fbbf24",
    // Amber
    "#818cf8",
    // Indigo
    "#2dd4bf",
    // Teal
    "#ec4899",
    // Pink
    "#06b6d4",
    // Cyan
    "#a855f7",
    // Violet
    "#84cc16"
    // Lime
  ];
  var DEFAULT_SCHEDULES = [];
  var DEFAULT_NOTES = [];
  var BANNER_PRESETS = [
    {
      id: "tokyo_lofi",
      name: "Tokyo Rain Lo-Fi",
      tag: "TOKYO \u2022 LO-FI",
      type: "image",
      url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80",
      thumb: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=300&auto=format&fit=crop&q=70",
      vibe: "Neon City Rain & Reflections"
    },
    {
      id: "sunset_clouds",
      name: "Sunset Pastel Horizon",
      tag: "GOLDEN HOUR",
      type: "image",
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80",
      thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=70",
      vibe: "Warm Golden Hour Clouds"
    },
    {
      id: "cozy_study",
      name: "Cozy Study Cafe",
      tag: "DEEP FOCUS",
      type: "image",
      url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1200&auto=format&fit=crop&q=80",
      thumb: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&auto=format&fit=crop&q=70",
      vibe: "Warm Wood & Rainy Window"
    },
    {
      id: "cyber_grid",
      name: "Cyberpunk Synthwave",
      tag: "SYNTHWAVE",
      type: "image",
      url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
      thumb: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=70",
      vibe: "Laser Neon Grid & Skyline"
    },
    {
      id: "cosmic_aurora",
      name: "Northern Aurora",
      tag: "AURORA GLOW",
      type: "image",
      url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&auto=format&fit=crop&q=80",
      thumb: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=300&auto=format&fit=crop&q=70",
      vibe: "Emerald Northern Lights"
    },
    {
      id: "ambient_mesh",
      name: "Motion Mesh (Offline)",
      tag: "DYNAMIC MESH",
      type: "mesh",
      url: "",
      thumb: "",
      vibe: "Animated Gradient Mesh"
    }
  ];
  var IDB_BANNER_DB = "dayflow_banner_store_v1";
  var IDB_STORE_NAME = "media_files";
  function openBannerIDB() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(IDB_BANNER_DB, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function saveCustomBannerMedia(blob, mediaType, filename = "banner") {
    try {
      const db = await openBannerIDB();
      if (!db) return false;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, "readwrite");
        const store = tx.objectStore(IDB_STORE_NAME);
        store.put({ blob, mediaType, filename, timestamp: Date.now() }, "active_banner");
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn("Failed to save banner to IndexedDB:", err);
      return false;
    }
  }
  async function getCustomBannerMedia() {
    try {
      const db = await openBannerIDB();
      if (!db) return null;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, "readonly");
        const store = tx.objectStore(IDB_STORE_NAME);
        const req = store.get("active_banner");
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn("Failed to load banner from IndexedDB:", err);
      return null;
    }
  }
  async function deleteCustomBannerMedia() {
    try {
      const db = await openBannerIDB();
      if (!db) return false;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_NAME, "readwrite");
        const store = tx.objectStore(IDB_STORE_NAME);
        store.delete("active_banner");
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn("Failed to delete banner from IndexedDB:", err);
      return false;
    }
  }
  var DEFAULT_SETTINGS = {
    userName: "",
    apiKey: "",
    geminiModel: "gemini-2.5-flash",
    notifyAdvanceMinutes: 15,
    soundEnabled: true,
    soundTone: "crystal",
    proactiveReminders: true,
    systemNotificationsEnabled: true,
    theme: "dark",
    heroBannerEnabled: false,
    hasConfiguredBanner: false,
    heroBannerSource: "preset",
    heroBannerPreset: "tokyo_lofi",
    heroBannerMediaType: "image",
    heroBannerUrl: "",
    heroBannerHeight: "normal",
    heroBannerOverlay: "medium",
    heroBannerQuote: "Fokus pada hal penting hari ini.",
    chatAutoSave: false,
    grokApiKey: "",
    grokModel: "grok-2-latest"
  };
  var StateManager = class {
    constructor() {
      this.subscribers = /* @__PURE__ */ new Set();
      this.schedules = this._load(STORAGE_KEYS.SCHEDULES, DEFAULT_SCHEDULES) || [];
      this.notes = this._load(STORAGE_KEYS.NOTES, DEFAULT_NOTES) || [];
      this.categories = this._load(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES) || DEFAULT_CATEGORIES;
      this.dailyLogs = this._load(STORAGE_KEYS.DAILY_LOGS, []) || [];
      const DUMMY_SCHEDULE_IDS = ["sch_1", "sch_2", "sch_3", "sch_4"];
      const DUMMY_SCHEDULE_TITLES = [
        "review rencana & prioritas harian",
        "sinkronisasi tim & update proyek",
        "makan siang & istirahat",
        "deep work: eksekusi tugas utama"
      ];
      if (Array.isArray(this.schedules)) {
        const prevSchedCount = this.schedules.length;
        this.schedules = this.schedules.filter((s) => {
          if (!s || typeof s !== "object") return false;
          if (s.id && DUMMY_SCHEDULE_IDS.includes(s.id)) return false;
          const rawTitle = String(s.title || "").trim();
          const lowerTitle = rawTitle.toLowerCase();
          if (DUMMY_SCHEDULE_TITLES.includes(lowerTitle)) return false;
          if (/^["'\s]*(?:null|time|undefined|date|duration|category|recurrence|deadline|priority|description|notes)["'\s]*$/i.test(rawTitle)) return false;
          if (/^["'\s]*null["'\s]*$/i.test(rawTitle)) return false;
          if (rawTitle === '"" Null' || rawTitle === '" " Null' || rawTitle === "Null" || rawTitle === '"time" " "') return false;
          if (rawTitle.length < 2) return false;
          return true;
        });
        this.schedules.forEach((s) => {
          if (s && s.title && s.title.includes("|")) {
            const parts = s.title.split("|").map((p) => p.trim()).filter(Boolean);
            if (parts.length > 0) {
              s.title = parts[0];
              if (parts.length > 1 && !s.description) {
                s.description = parts.slice(1).join(" - ");
              }
            }
          }
        });
        if (this.schedules.length !== prevSchedCount) {
          this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
        }
      }
      const DUMMY_NOTE_IDS = ["note_1", "note_2"];
      const DUMMY_NOTE_TITLES = [
        "prinsip produktivitas harian",
        "daftar kebutuhan proyek ai"
      ];
      if (Array.isArray(this.notes)) {
        const prevNotesCount = this.notes.length;
        this.notes = this.notes.filter((n) => {
          if (!n) return false;
          if (n.id && DUMMY_NOTE_IDS.includes(n.id)) return false;
          const lowerTitle = (n.title || "").trim().toLowerCase();
          if (DUMMY_NOTE_TITLES.includes(lowerTitle)) return false;
          return true;
        });
        if (this.notes.length !== prevNotesCount) {
          this._save(STORAGE_KEYS.NOTES, this.notes);
        }
      }
      if (!Array.isArray(this.categories) || this.categories.length === 0) {
        this.categories = [...DEFAULT_CATEGORIES];
        this._save(STORAGE_KEYS.CATEGORIES, this.categories);
      }
      const loadedSettings = this._load(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS) || {};
      this.settings = { ...DEFAULT_SETTINGS, ...loadedSettings };
      if (this.settings.geminiModel !== "gemini-2.5-flash") {
        this.settings.geminiModel = "gemini-2.5-flash";
        this._save(STORAGE_KEYS.SETTINGS, this.settings);
      }
      if (!this.settings.hasConfiguredBanner) {
        this.settings.heroBannerEnabled = false;
        this.settings.hasConfiguredBanner = false;
        this._save(STORAGE_KEYS.SETTINGS, this.settings);
      }
      if (this.settings.userName === "Dhaifan" || this.settings.userName === "dhaifan") {
        this.settings.userName = "";
        this._save(STORAGE_KEYS.SETTINGS, this.settings);
      } else if (typeof this.settings.userName !== "string") {
        this.settings.userName = "";
      }
      const defaultChat = [
        {
          role: "assistant",
          text: "Halo, aku DayFlow AI siap membantumu menata hari. Ketik kegiatanmu, dan aku akan merapikannya menjadi jadwal terstruktur.",
          timestamp: Date.now()
        }
      ];
      this.chatHistory = this._load(STORAGE_KEYS.CHAT_HISTORY, defaultChat) || defaultChat;
      try {
        if (Array.isArray(this.chatHistory)) {
          let chatSanitized = false;
          this.chatHistory = this.chatHistory.map((msg) => {
            if (!msg) return msg;
            if (typeof msg.role === "object" && msg.role !== null) {
              chatSanitized = true;
              return {
                role: msg.role.role || "assistant",
                text: msg.role.text || msg.text || "",
                isProactive: !!msg.role.isProactive,
                timestamp: msg.role.timestamp || msg.timestamp || Date.now()
              };
            }
            if (typeof msg.text === "string" && /(dhavi|dhaifan)/i.test(msg.text)) {
              chatSanitized = true;
              const cleanText = msg.text.replace(/halo\s+(dhavi|dhaifan),?\s*/gi, "Halo, ").replace(/(dhavi|dhaifan),?\s*/gi, "").replace(/\s{2,}/g, " ").trim();
              return { ...msg, text: cleanText };
            }
            return msg;
          });
          if (chatSanitized) {
            this._save(STORAGE_KEYS.CHAT_HISTORY, this.chatHistory);
          }
        } else {
          this.chatHistory = defaultChat;
        }
      } catch (e) {
        console.warn("Chat sanitization error:", e);
      }
      try {
        this.checkMidnightRollover();
        this.syncDailyProductivity();
      } catch (e) {
        console.warn("Productivity init error:", e);
      }
    }
    _load(key, fallback) {
      if (typeof localStorage === "undefined") return fallback;
      try {
        const data = localStorage.getItem(key);
        if (!data) return fallback;
        const parsed = JSON.parse(data);
        if (parsed === null || typeof parsed === "undefined") return fallback;
        if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
        if (typeof fallback === "object" && !Array.isArray(fallback) && (typeof parsed !== "object" || Array.isArray(parsed))) return fallback;
        return parsed;
      } catch (e) {
        console.warn("Storage load error:", e);
        return fallback;
      }
    }
    _save(key, val) {
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {
        console.error("Storage save error:", e);
      }
    }
    subscribe(callback) {
      this.subscribers.add(callback);
      return () => this.subscribers.delete(callback);
    }
    notify(event, payload) {
      this.subscribers.forEach((cb) => cb(event, payload));
    }
    // --- Schedules CRUD ---
    getSchedules(filterDate = null) {
      if (!Array.isArray(this.schedules)) this.schedules = [];
      if (!filterDate) {
        return this.schedules.filter((s) => s && typeof s === "object").sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      }
      const targetDate = String(filterDate).trim();
      const [tY, tM, tD] = targetDate.split("-").map(Number);
      const targetDayObj = new Date(tY, (tM || 1) - 1, tD || 1);
      const dayOfWeek = targetDayObj.getDay();
      const dayOfMonth = tD || targetDayObj.getDate();
      const matched = [];
      for (const s of this.schedules) {
        if (!s || typeof s !== "object") continue;
        const sDate = String(s.date || "").trim();
        const rec = s.recurrence || "none";
        let isMatch = false;
        if (sDate === targetDate) {
          isMatch = true;
        } else if (rec !== "none" && targetDate >= sDate) {
          if (rec === "daily") {
            isMatch = true;
          } else if (rec === "weekdays") {
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
              isMatch = true;
            }
          } else if (rec === "weekly") {
            const [sY, sM, sD] = sDate.split("-").map(Number);
            const origDayObj = new Date(sY, (sM || 1) - 1, sD || 1);
            if (dayOfWeek === origDayObj.getDay()) {
              isMatch = true;
            }
          } else if (rec === "monthly") {
            const [, , sD] = sDate.split("-").map(Number);
            if (dayOfMonth === sD) {
              isMatch = true;
            }
          }
        }
        if (isMatch) {
          let isDone = false;
          if (rec !== "none") {
            const compDates = Array.isArray(s.completedDates) ? s.completedDates : [];
            isDone = compDates.includes(targetDate);
          } else {
            isDone = !!s.completed;
          }
          matched.push({
            ...s,
            date: targetDate,
            completed: isDone,
            isRecurring: rec !== "none",
            masterDate: sDate
          });
        }
      }
      return matched.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    }
    getTodaySchedules() {
      const today = getLocalDateString();
      return this.getSchedules(today);
    }
    getUnfinishedSchedules(date) {
      return this.schedules.filter((s) => s.date === date && !s.completed);
    }
    carryOverUnfinishedSchedules(sourceDate, targetDate) {
      const unfinished = this.getUnfinishedSchedules(sourceDate);
      if (unfinished.length === 0) return 0;
      let addedCount = 0;
      unfinished.forEach((item) => {
        const alreadyExists = this.schedules.some(
          (s) => s.date === targetDate && s.title.toLowerCase() === item.title.toLowerCase()
        );
        if (!alreadyExists) {
          this.addSchedule({
            title: item.title,
            date: targetDate,
            time: item.time,
            duration: item.duration,
            category: item.category,
            reminder: item.reminder
          });
          addedCount++;
        }
      });
      return addedCount;
    }
    addSchedule(scheduleData) {
      if (!scheduleData || typeof scheduleData !== "object") return null;
      let rawTitle = scheduleData.title || scheduleData.kegiatan || scheduleData.activity || scheduleData.task || scheduleData.name || "";
      rawTitle = String(rawTitle).trim();
      if (/^["'\s]*(?:null|time|undefined|date|duration|category|recurrence|deadline|priority|description|notes)["'\s]*$/i.test(rawTitle) || /^["'\s]*null["'\s]*$/i.test(rawTitle) || rawTitle === '"" Null' || rawTitle === '" " Null' || rawTitle === "Null" || rawTitle === '"time" " "' || rawTitle.length < 2) {
        return null;
      }
      let safeDescription = (typeof scheduleData.description === "string" ? scheduleData.description : scheduleData.deskripsi || scheduleData.notes || scheduleData.catatan || "").trim();
      if (rawTitle.includes("|")) {
        const parts = rawTitle.split("|").map((p) => p.trim()).filter(Boolean);
        rawTitle = parts[0] || "Kegiatan Baru";
        if (parts.length > 1 && !safeDescription) {
          safeDescription = parts.slice(1).join(" - ");
        }
      }
      const safeTitle = rawTitle || "Kegiatan Baru";
      const safeDate = normalizeDateString(scheduleData.date);
      const safeTime = normalizeTimeString(scheduleData.time);
      const newSchedule = {
        id: "sch_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
        date: safeDate,
        time: safeTime,
        duration: Math.max(5, parseInt(scheduleData.duration || scheduleData.durasi, 10) || 30),
        title: safeTitle,
        description: safeDescription,
        category: scheduleData.category && typeof scheduleData.category === "string" ? scheduleData.category.trim() : scheduleData.kategori || "Fokus",
        priority: ["low", "medium", "high"].includes(scheduleData.priority) ? scheduleData.priority : "medium",
        deadline: scheduleData.deadline ? normalizeDateString(scheduleData.deadline) : null,
        reminder: scheduleData.reminder !== false,
        recurrence: ["none", "daily", "weekdays", "weekly", "monthly"].includes(scheduleData.recurrence) ? scheduleData.recurrence : "none",
        completedDates: Array.isArray(scheduleData.completedDates) ? scheduleData.completedDates : [],
        completed: !!scheduleData.completed,
        createdAt: Date.now()
      };
      this.schedules.push(newSchedule);
      this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
      this.syncDailyProductivity(safeDate);
      this.notify("schedule:added", newSchedule);
      return newSchedule;
    }
    addSchedules(schedulesArray) {
      if (!Array.isArray(schedulesArray) || schedulesArray.length === 0) return [];
      const newSchedules = [];
      const baseTime = Date.now();
      schedulesArray.forEach((item, index) => {
        if (!item || typeof item !== "object") return;
        let rawTitle = item.title || item.kegiatan || item.activity || item.task || item.name || "";
        rawTitle = String(rawTitle).trim();
        if (/^["'\s]*(?:null|time|undefined|date|duration|category|recurrence|deadline|priority|description|notes)["'\s]*$/i.test(rawTitle) || /^["'\s]*null["'\s]*$/i.test(rawTitle) || rawTitle === '"" Null' || rawTitle === '" " Null' || rawTitle === "Null" || rawTitle === '"time" " "' || rawTitle.length < 2) {
          return;
        }
        let safeDescription = (typeof item.description === "string" ? item.description : item.deskripsi || item.notes || item.catatan || "").trim();
        if (rawTitle.includes("|")) {
          const parts = rawTitle.split("|").map((p) => p.trim()).filter(Boolean);
          rawTitle = parts[0] || "Kegiatan Baru";
          if (parts.length > 1 && !safeDescription) {
            safeDescription = parts.slice(1).join(" - ");
          }
        }
        const safeTitle = rawTitle || "Kegiatan Baru";
        const safeDate = normalizeDateString(item.date);
        const safeTime = normalizeTimeString(item.time);
        const cleanNormTitle = (t) => String(t || "").toLowerCase().replace(/^(?:kuliah|mata\s+kuliah|matkul)\s+/i, "").replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
        const incomingNorm = cleanNormTitle(safeTitle);
        const existingIdx = this.schedules.findIndex((existing) => {
          if (!existing || typeof existing !== "object") return false;
          if (item.id && existing.id === item.id) return true;
          const existNorm = cleanNormTitle(existing.title);
          if (existNorm && existNorm === incomingNorm) {
            if (existing.date === safeDate) return true;
            if (existing.recurrence === "weekly" && item.recurrence === "weekly") {
              const eDay = (/* @__PURE__ */ new Date(existing.date + "T00:00:00")).getDay();
              const iDay = (/* @__PURE__ */ new Date(safeDate + "T00:00:00")).getDay();
              if (eDay === iDay) return true;
            }
          }
          return false;
        });
        if (existingIdx !== -1) {
          this.schedules[existingIdx] = {
            ...this.schedules[existingIdx],
            date: safeDate,
            time: safeTime,
            duration: Math.max(5, parseInt(item.duration || item.durasi, 10) || 30),
            title: safeTitle,
            description: safeDescription || this.schedules[existingIdx].description,
            category: item.category && typeof item.category === "string" ? item.category.trim() : this.schedules[existingIdx].category || "Fokus",
            priority: ["low", "medium", "high"].includes(item.priority) ? item.priority : this.schedules[existingIdx].priority,
            deadline: item.deadline ? normalizeDateString(item.deadline) : this.schedules[existingIdx].deadline,
            recurrence: ["none", "daily", "weekdays", "weekly", "monthly"].includes(item.recurrence) ? item.recurrence : this.schedules[existingIdx].recurrence
          };
          newSchedules.push(this.schedules[existingIdx]);
        } else {
          const newSchedule = {
            id: "sch_" + (baseTime + index) + "_" + Math.random().toString(36).substr(2, 6),
            date: safeDate,
            time: safeTime,
            duration: Math.max(5, parseInt(item.duration || item.durasi, 10) || 30),
            title: safeTitle,
            description: safeDescription,
            category: item.category && typeof item.category === "string" ? item.category.trim() : item.kategori || "Fokus",
            priority: ["low", "medium", "high"].includes(item.priority) ? item.priority : "medium",
            deadline: item.deadline ? normalizeDateString(item.deadline) : null,
            reminder: item.reminder !== false,
            recurrence: ["none", "daily", "weekdays", "weekly", "monthly"].includes(item.recurrence) ? item.recurrence : "none",
            completedDates: Array.isArray(item.completedDates) ? item.completedDates : [],
            completed: !!item.completed,
            createdAt: baseTime + index
          };
          this.schedules.push(newSchedule);
          newSchedules.push(newSchedule);
        }
      });
      if (newSchedules.length > 0) {
        this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
        const uniqueDates = [...new Set(newSchedules.map((s) => s.date))];
        uniqueDates.forEach((d) => this.syncDailyProductivity(d));
        this.syncDailyProductivity();
        this.notify("schedules:batch-added", newSchedules);
      }
      return newSchedules;
    }
    getDeadlineTasks() {
      if (!Array.isArray(this.schedules)) return [];
      return this.schedules.filter((s) => s && !s.completed && s.deadline).sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
    }
    getHighPriorityTasks() {
      if (!Array.isArray(this.schedules)) return [];
      return this.schedules.filter((s) => s && !s.completed && s.priority === "high");
    }
    updateSchedule(id, updates) {
      const idx = this.schedules.findIndex((s) => s.id === id);
      if (idx !== -1) {
        const cleanUpdates = { ...updates };
        if (cleanUpdates.date) cleanUpdates.date = normalizeDateString(cleanUpdates.date);
        if (cleanUpdates.time) cleanUpdates.time = normalizeTimeString(cleanUpdates.time);
        if (cleanUpdates.deadline) cleanUpdates.deadline = normalizeDateString(cleanUpdates.deadline);
        if (cleanUpdates.title) cleanUpdates.title = String(cleanUpdates.title).trim();
        if (typeof cleanUpdates.description === "string") cleanUpdates.description = cleanUpdates.description.trim();
        const oldDate = this.schedules[idx].date;
        this.schedules[idx] = { ...this.schedules[idx], ...cleanUpdates };
        this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
        this.syncDailyProductivity(this.schedules[idx].date);
        if (oldDate && oldDate !== this.schedules[idx].date) {
          this.syncDailyProductivity(oldDate);
        }
        this.notify("schedule:updated", this.schedules[idx]);
        return this.schedules[idx];
      }
      return null;
    }
    toggleScheduleComplete(id, targetDate = null) {
      const item = this.schedules.find((s) => s.id === id);
      if (!item) return null;
      const rec = item.recurrence || "none";
      if (rec !== "none") {
        const dateToCheck = targetDate || getLocalDateString();
        const compDates = Array.isArray(item.completedDates) ? [...item.completedDates] : [];
        const dateIdx = compDates.indexOf(dateToCheck);
        if (dateIdx > -1) {
          compDates.splice(dateIdx, 1);
        } else {
          compDates.push(dateToCheck);
        }
        const res = this.updateSchedule(id, { completedDates: compDates });
        this.syncDailyProductivity(dateToCheck);
        return res;
      } else {
        const res = this.updateSchedule(id, { completed: !item.completed });
        if (targetDate) this.syncDailyProductivity(targetDate);
        return res;
      }
    }
    deleteSchedule(id) {
      const item = this.schedules.find((s) => s.id === id);
      const itemDate = item ? item.date : null;
      this.schedules = this.schedules.filter((s) => s.id !== id);
      this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
      if (itemDate) this.syncDailyProductivity(itemDate);
      this.syncDailyProductivity();
      this.notify("schedule:deleted", id);
    }
    // --- Daily Productivity & Midnight Settlement ---
    syncDailyProductivity(targetDate = null) {
      const dateToSync = targetDate ? normalizeDateString(targetDate) : getLocalDateString();
      const daySchedules = this.getSchedules(dateToSync);
      const total = daySchedules.length;
      const completed = daySchedules.filter((s) => s.completed).length;
      const percentage = total > 0 ? Math.round(completed / total * 100) : 0;
      const todayStr = getLocalDateString();
      const isPast = dateToSync < todayStr;
      if (!Array.isArray(this.dailyLogs)) this.dailyLogs = [];
      const existingIdx = this.dailyLogs.findIndex((l) => l && l.date === dateToSync);
      const logEntry = {
        date: dateToSync,
        totalScheduled: total,
        completedCount: completed,
        percentage,
        isFinalized: isPast,
        updatedAt: Date.now()
      };
      if (existingIdx >= 0) {
        this.dailyLogs[existingIdx] = logEntry;
      } else {
        this.dailyLogs.push(logEntry);
      }
      this.dailyLogs.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      this._save(STORAGE_KEYS.DAILY_LOGS, this.dailyLogs);
      this.notify("productivity:updated", logEntry);
      return logEntry;
    }
    checkMidnightRollover() {
      if (!Array.isArray(this.dailyLogs)) this.dailyLogs = [];
      const todayStr = getLocalDateString();
      let hasChanges = false;
      this.dailyLogs.forEach((log) => {
        if (log && log.date < todayStr && !log.isFinalized) {
          log.isFinalized = true;
          log.updatedAt = Date.now();
          hasChanges = true;
        }
      });
      if (hasChanges) {
        this._save(STORAGE_KEYS.DAILY_LOGS, this.dailyLogs);
      }
    }
    getTodayProductivity() {
      const todayStr = getLocalDateString();
      const schedules = this.getSchedules(todayStr);
      const total = schedules.length;
      const completed = schedules.filter((s) => s.completed).length;
      const percentage = total > 0 ? Math.round(completed / total * 100) : 0;
      const isComplete = total > 0 && completed === total;
      const now = /* @__PURE__ */ new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const diffMs = Math.max(0, midnight.getTime() - now.getTime());
      const remainingHours = Math.floor(diffMs / (1e3 * 60 * 60));
      const remainingMinutes = Math.floor(diffMs % (1e3 * 60 * 60) / (1e3 * 60));
      const remainingTimeStr = `${remainingHours} jam ${remainingMinutes} mnt`;
      return {
        date: todayStr,
        totalScheduled: total,
        completedCount: completed,
        percentage,
        isComplete,
        remainingTimeStr,
        remainingHours,
        remainingMinutes
      };
    }
    getDailyLogs(limit = 14) {
      if (!Array.isArray(this.dailyLogs)) return [];
      return this.dailyLogs.slice(0, limit);
    }
    getProfileProductivityStats() {
      if (!Array.isArray(this.dailyLogs)) this.dailyLogs = [];
      const todayProd = this.getTodayProductivity();
      const nonZeroLogs = this.dailyLogs.filter((l) => l && l.totalScheduled > 0);
      const perfectDays = nonZeroLogs.filter((l) => l.percentage === 100).length;
      let currentStreak = 0;
      const sorted = [...nonZeroLogs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      for (const log of sorted) {
        if (log.percentage === 100) {
          currentStreak++;
        } else {
          break;
        }
      }
      return {
        todayTotal: todayProd.totalScheduled,
        todayCompleted: todayProd.completedCount,
        todayPercent: todayProd.percentage,
        isTodayComplete: todayProd.isComplete,
        perfectDays,
        currentStreak,
        totalLoggedDays: nonZeroLogs.length
      };
    }
    // --- Notes CRUD ---
    getNotes() {
      return [...this.notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
    addNote(title, content) {
      const safeTitle = String(title || "").trim() || "Catatan Tanpa Judul";
      const safeContent = String(content || "").trim();
      const note = {
        id: "note_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
        title: safeTitle,
        content: safeContent,
        updatedAt: Date.now()
      };
      this.notes.unshift(note);
      this._save(STORAGE_KEYS.NOTES, this.notes);
      this.notify("note:added", note);
      return note;
    }
    updateNote(id, title, content) {
      const note = this.notes.find((n) => n.id === id);
      if (note) {
        note.title = String(title || "").trim() || "Catatan Tanpa Judul";
        note.content = String(content || "").trim();
        note.updatedAt = Date.now();
        this._save(STORAGE_KEYS.NOTES, this.notes);
        this.notify("note:updated", note);
        return note;
      }
      return null;
    }
    deleteNote(id) {
      this.notes = this.notes.filter((n) => n.id !== id);
      this._save(STORAGE_KEYS.NOTES, this.notes);
      this.notify("note:deleted", id);
    }
    // --- Chat History ---
    getChatHistory() {
      return this.chatHistory;
    }
    addChatMessage(roleOrMsg, maybeText = "", isProactive = false, extraProps = {}) {
      let msg;
      const baseId = "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      if (typeof roleOrMsg === "object" && roleOrMsg !== null) {
        msg = {
          id: roleOrMsg.id || baseId,
          role: roleOrMsg.role || "assistant",
          text: typeof roleOrMsg.text === "string" ? roleOrMsg.text : "",
          isProactive: !!roleOrMsg.isProactive,
          savedSchedules: !!roleOrMsg.savedSchedules,
          timestamp: roleOrMsg.timestamp || Date.now(),
          ...extraProps
        };
      } else {
        msg = {
          id: baseId,
          role: roleOrMsg || "assistant",
          text: typeof maybeText === "string" ? maybeText : "",
          isProactive: !!isProactive,
          savedSchedules: !!extraProps.savedSchedules,
          timestamp: Date.now(),
          ...extraProps
        };
      }
      this.chatHistory.push(msg);
      if (this.chatHistory.length > 50) this.chatHistory.shift();
      this._save(STORAGE_KEYS.CHAT_HISTORY, this.chatHistory);
      this.notify("chat:added", msg);
      return msg;
    }
    updateChatMessage(id, updates) {
      if (!id || !updates || typeof updates !== "object") return null;
      const msg = this.chatHistory.find((m) => m.id === id);
      if (msg) {
        Object.assign(msg, updates);
        this._save(STORAGE_KEYS.CHAT_HISTORY, this.chatHistory);
        this.notify("chat:updated", msg);
        return msg;
      }
      return null;
    }
    clearChatHistory() {
      this.chatHistory = [
        {
          role: "assistant",
          text: "Riwayat percakapan telah dibersihkan. Apa yang ingin kamu rencanakan hari ini?",
          timestamp: Date.now()
        }
      ];
      this._save(STORAGE_KEYS.CHAT_HISTORY, this.chatHistory);
      this.notify("chat:cleared", null);
    }
    // --- Categories CRUD ---
    getCategories() {
      if (!Array.isArray(this.categories) || this.categories.length === 0) {
        this.categories = [...DEFAULT_CATEGORIES];
      }
      return [...this.categories];
    }
    getCategoryByName(name) {
      if (!name) return { name: "Kerja", color: "#f97316" };
      const found = this.categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
      if (found) return found;
      return { name, color: "#f97316" };
    }
    addCategory({ name, color }) {
      const trimmed = (name || "").trim();
      if (!trimmed) throw new Error("Nama kategori tidak boleh kosong.");
      const exists = this.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) throw new Error(`Kategori "${trimmed}" sudah ada.`);
      const newCat = {
        id: "cat_" + Date.now(),
        name: trimmed,
        color: color || "#f97316",
        isDefault: false
      };
      this.categories.push(newCat);
      this._save(STORAGE_KEYS.CATEGORIES, this.categories);
      this.notify("categories:updated", this.categories);
      return newCat;
    }
    deleteCategory(id) {
      const cat = this.categories.find((c) => c.id === id);
      if (!cat) return false;
      if (cat.isDefault) {
        throw new Error("Kategori bawaan sistem tidak dapat dihapus.");
      }
      this.categories = this.categories.filter((c) => c.id !== id);
      this._save(STORAGE_KEYS.CATEGORIES, this.categories);
      this.notify("categories:updated", this.categories);
      return true;
    }
    // --- Settings ---
    getSettings() {
      return this.settings;
    }
    updateSettings(updates) {
      this.settings = { ...this.settings, ...updates };
      this._save(STORAGE_KEYS.SETTINGS, this.settings);
      this.notify("settings:updated", this.settings);
      return this.settings;
    }
  };
  var state = new StateManager();
  if (typeof window !== "undefined") {
    window.state = state;
  }

  // js/icons.js
  var icons = {
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    "check-circle": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    circle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`,
    sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`,
    message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    "file-text": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
    bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    "bell-ring": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    "chevron-right": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
    "chevron-left": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
    "chevron-down": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`,
    key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
    alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
    moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
    compass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
    arrowUpRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>`,
    "eye-off": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
    "refresh-cw": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>`,
    "chevrons-right": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/></svg>`,
    volume: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    bot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    "message-square": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    "alert-triangle": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    sliders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg>`,
    "volume-x": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>`,
    image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
    video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
    layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>`,
    "external-link": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>`,
    repeat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`,
    paperclip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`,
    file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
    flame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`,
    zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    "undo-2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>`
  };
  function getIcon(name, extraClass = "", size = 18) {
    const svg = icons[name] || icons.circle;
    return svg.replace("<svg ", `<svg class="df-icon ${extraClass}" width="${size}" height="${size}" aria-hidden="true" `);
  }
  function renderIcons(root = document, force = false) {
    root.querySelectorAll("[data-icon]").forEach((el) => {
      const name = el.getAttribute("data-icon");
      const rendered = el.getAttribute("data-rendered-icon");
      if (!force && rendered === name && el.children.length > 0) return;
      const size = parseInt(el.getAttribute("data-icon-size") || "18", 10);
      const extraClass = el.getAttribute("data-icon-class") || "";
      el.innerHTML = getIcon(name, extraClass, size);
      el.setAttribute("data-icon-rendered", "true");
      el.setAttribute("data-rendered-icon", name);
    });
  }

  // js/notifications.js
  var NotificationService = class {
    constructor() {
      this.audioCtx = null;
      this.notifiedSet = /* @__PURE__ */ new Set();
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
          if (event === "schedule:added" || event === "schedules:batch-added" || event === "schedule:updated" || event === "schedules:reset") {
            this._checkUpcomingSchedules();
          }
        });
      } catch (e) {
      }
    }
    unlockAudio() {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!this.audioCtx && AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx) {
          if (this.audioCtx.state === "suspended") {
            this.audioCtx.resume().catch(() => {
            });
          }
          const buffer = this.audioCtx.createBuffer(1, 1, 22050);
          const source = this.audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(this.audioCtx.destination);
          source.start(0);
        }
      } catch (e) {
        console.warn("Audio unlock warning:", e);
      }
    }
    _generateWavDataUri(tone) {
      function writeStr(view2, offset, str) {
        for (let i = 0; i < str.length; i++) {
          view2.setUint8(offset + i, str.charCodeAt(i));
        }
      }
      const sampleRate = 22050;
      const duration = tone === "digital" ? 0.35 : tone === "marimba" ? 0.55 : 0.75;
      const numSamples = Math.floor(sampleRate * duration);
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);
      writeStr(view, 0, "RIFF");
      view.setUint32(4, 36 + numSamples * 2, true);
      writeStr(view, 8, "WAVE");
      writeStr(view, 12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(view, 36, "data");
      view.setUint32(40, numSamples * 2, true);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;
        if (tone === "marimba") {
          const env = Math.exp(-6.5 * t);
          sample = (Math.sin(2 * Math.PI * 659.25 * t) + 0.6 * Math.sin(2 * Math.PI * 830.61 * t) + 0.35 * Math.sin(2 * Math.PI * 987.77 * t)) * env;
        } else if (tone === "digital") {
          const env = Math.exp(-8.5 * t);
          sample = (Math.sin(2 * Math.PI * 1046.5 * t) + 0.7 * Math.sin(2 * Math.PI * 1567.98 * t)) * env;
        } else {
          const env = Math.exp(-4.5 * t);
          sample = (Math.sin(2 * Math.PI * 783.99 * t) + 0.65 * Math.sin(2 * Math.PI * 1046.5 * t) + 0.45 * Math.sin(2 * Math.PI * 1318.51 * t)) * env;
        }
        const s = Math.max(-1, Math.min(1, sample * 0.8));
        view.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
      }
      const blob = new Blob([buffer], { type: "audio/wav" });
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
          console.warn("Audio fallback element play prevented:", e);
        });
      } catch (e) {
        console.warn("Audio fallback error:", e);
      }
    }
    // Synthesize crystal-clear, loud, harmonic acoustic bell chime via Web Audio API + HTML Audio fallback
    async playChime(overrideTone = null) {
      const settings = state.getSettings();
      if (settings.soundEnabled === false) return;
      const tone = overrideTone || settings.soundTone || "crystal";
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          this._playAudioFallback(tone);
          return;
        }
        if (!this.audioCtx) {
          this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx.state === "suspended") {
          this.audioCtx.resume().catch(() => {
          });
          await Promise.race([
            this.audioCtx.resume().catch(() => {
            }),
            new Promise((r) => setTimeout(r, 60))
          ]);
        }
        if (this.audioCtx.state === "suspended") {
          this._playAudioFallback(tone);
        }
        const ctx = this.audioCtx;
        const now = Math.max(0, ctx.currentTime);
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, now);
        compressor.knee.setValueAtTime(8, now);
        compressor.ratio.setValueAtTime(5, now);
        compressor.attack.setValueAtTime(2e-3, now);
        compressor.release.setValueAtTime(0.12, now);
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.85, now);
        compressor.connect(masterGain);
        masterGain.connect(ctx.destination);
        const playTone = (freq, startTime, duration = 0.85, gainLevel = 0.7, waveType = "triangle") => {
          const actualStart = Math.max(ctx.currentTime + 5e-3, startTime);
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = waveType;
          osc1.frequency.setValueAtTime(freq, actualStart);
          gain1.gain.setValueAtTime(0, actualStart);
          gain1.gain.linearRampToValueAtTime(gainLevel, actualStart + 0.012);
          gain1.gain.exponentialRampToValueAtTime(1e-4, actualStart + duration);
          osc1.connect(gain1);
          gain1.connect(compressor);
          osc1.start(actualStart);
          osc1.stop(actualStart + duration);
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(freq * 2.008, actualStart);
          gain2.gain.setValueAtTime(0, actualStart);
          gain2.gain.linearRampToValueAtTime(gainLevel * 0.45, actualStart + 0.01);
          gain2.gain.exponentialRampToValueAtTime(1e-4, actualStart + duration * 0.7);
          osc2.connect(gain2);
          gain2.connect(compressor);
          osc2.start(actualStart);
          osc2.stop(actualStart + duration * 0.7);
          const osc3 = ctx.createOscillator();
          const gain3 = ctx.createGain();
          osc3.type = "sine";
          osc3.frequency.setValueAtTime(freq * 3.015, actualStart);
          gain3.gain.setValueAtTime(0, actualStart);
          gain3.gain.linearRampToValueAtTime(gainLevel * 0.25, actualStart + 8e-3);
          gain3.gain.exponentialRampToValueAtTime(1e-4, actualStart + 0.3);
          osc3.connect(gain3);
          gain3.connect(compressor);
          osc3.start(actualStart);
          osc3.stop(actualStart + 0.3);
        };
        if (tone === "marimba") {
          playTone(659.25, now + 0, 0.45, 0.8, "sine");
          playTone(830.61, now + 0.12, 0.5, 0.85, "sine");
          playTone(987.77, now + 0.24, 0.75, 0.9, "triangle");
        } else if (tone === "digital") {
          playTone(1046.5, now + 0, 0.35, 0.75, "sine");
          playTone(1567.98, now + 0.1, 0.65, 0.85, "triangle");
        } else {
          playTone(783.99, now + 0, 0.65, 0.75, "triangle");
          playTone(1046.5, now + 0.13, 0.75, 0.82, "triangle");
          playTone(1318.51, now + 0.26, 1.35, 0.9, "triangle");
        }
      } catch (e) {
        console.warn("Audio chime playback error, fallback to HTML Audio:", e);
        this._playAudioFallback(tone);
      }
    }
    getPermissionStatus() {
      if (!("Notification" in window)) return "unsupported";
      return Notification.permission;
    }
    async requestPermission() {
      if (!("Notification" in window)) {
        this.showToast("Browser ini tidak mendukung Web Notifications.", "warning");
        return "unsupported";
      }
      if (Notification.permission === "granted") {
        return "granted";
      }
      if (Notification.permission === "denied") {
        this.showToast("Izin notifikasi diblokir browser. Klik ikon gembok pada URL untuk mengizinkan.", "warning", 7e3);
        return "denied";
      }
      try {
        const result = await Notification.requestPermission();
        if (result === "granted") {
          this.showToast("Izin notifikasi berhasil diaktifkan!", "success");
          this.playChime();
          this.sendSystemNotification("DayFlow \u2022 Notifikasi Aktif", {
            body: "Notifikasi pengingat agenda DayFlow siap muncul di layarmu.",
            tag: "dayflow_perm_granted"
          });
          state.notify("notifications:permission-changed", "granted");
          return "granted";
        } else {
          this.showToast("Izin notifikasi belum diberikan. Kamu bisa mengaktifkannya kapan saja di Pengaturan.", "warning", 5e3);
          state.notify("notifications:permission-changed", result);
          return result;
        }
      } catch (e) {
        console.error("Error requesting notification permission:", e);
        return "error";
      }
    }
    async sendSystemNotification(title, options = {}) {
      const settings = state.getSettings();
      if (settings.systemNotificationsEnabled === false) {
        return { ok: false, reason: "disabled_in_settings" };
      }
      if (!("Notification" in window)) {
        return { ok: false, reason: "unsupported" };
      }
      if (Notification.permission !== "granted") {
        return { ok: false, reason: "permission_not_granted", permission: Notification.permission };
      }
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate([200, 100, 200, 100, 250]);
        } catch (e) {
        }
      }
      const defaultOptions = {
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        vibrate: [200, 100, 200, 100, 250],
        requireInteraction: false,
        silent: false
      };
      const finalOptions = { ...defaultOptions, ...options };
      let delivered = false;
      if ("serviceWorker" in navigator) {
        try {
          const reg = await Promise.race([
            navigator.serviceWorker.getRegistration(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 400))
          ]);
          if (reg && reg.active && typeof reg.showNotification === "function") {
            await reg.showNotification(title, finalOptions);
            delivered = true;
          }
        } catch (e) {
          console.warn("SW notification fallback to Window Notification:", e);
        }
      }
      if (!delivered) {
        try {
          const notif = new Notification(title, finalOptions);
          notif.onclick = () => {
            try {
              window.focus();
              notif.close();
            } catch (e) {
            }
          };
          delivered = true;
        } catch (err) {
          console.warn("Direct notification spawn warning:", err);
        }
      }
      return { ok: delivered };
    }
    async testNotification(overrideTone = null) {
      const settings = state.getSettings();
      const tone = overrideTone || settings.soundTone || "crystal";
      const toneNames = {
        crystal: "Crystal Bell",
        marimba: "Marimba",
        digital: "Digital Pulse"
      };
      const toneName = toneNames[tone] || "Crystal Bell";
      this.playChime(tone);
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch (e) {
        }
      }
      this.showToast(`Uji Notifikasi: Bel ${toneName} berbunyi.`, "info", 4500);
      if (!("Notification" in window)) {
        this.showToast("Browser ini tidak mendukung Web Notifications di desktop/layar.", "warning");
        return false;
      }
      if (Notification.permission === "default") {
        const result = await this.requestPermission();
        return result === "granted";
      }
      if (Notification.permission === "denied") {
        this.showToast("Notifikasi sistem diblokir browser. Buka info situs (ikon gembok) di bilah URL lalu ubah Notifikasi menjadi Izinkan.", "warning", 7e3);
        return false;
      }
      const res = await this.sendSystemNotification("DayFlow \u2022 Notifikasi Berfungsi Normal!", {
        body: `Pengingat jadwal dan bunyi bel ${toneName} aktif. Siap mengingatkan agenda harianmu!`,
        tag: "dayflow_test_notification",
        renotify: true
      });
      if (res.ok) {
        this.showToast("Notifikasi sistem berhasil dimunculkan ke layar!", "success", 4e3);
        return true;
      } else {
        this.showToast("Notifikasi terkirim. Jika tidak muncul, periksa Focus Assist / DND di Windows/HP Anda.", "warning", 6e3);
        return false;
      }
    }
    showToast(message, type = "info", duration = 3500) {
      const container = document.getElementById("toast-container");
      if (!container) return;
      const toast = document.createElement("div");
      toast.className = `toast-msg ${type}`;
      let iconName = "info";
      if (type === "success") iconName = "check-circle";
      if (type === "warning") iconName = "alert";
      if (type === "error") iconName = "alert";
      toast.innerHTML = `
      <div class="toast-icon-wrap">
        ${getIcon(iconName, "", 15)}
      </div>
      <div class="toast-text">${message}</div>
      <button class="toast-close-btn" aria-label="Tutup Notifikasi">
        ${getIcon("x", "", 14)}
      </button>
      <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;
      container.appendChild(toast);
      let dismissTimer = null;
      const dismiss = () => {
        if (dismissTimer) clearTimeout(dismissTimer);
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-10px) scale(0.95)";
        toast.style.transition = "all 160ms cubic-bezier(0.23, 1, 0.32, 1)";
        setTimeout(() => toast.remove(), 180);
      };
      toast.querySelector(".toast-close-btn")?.addEventListener("click", (e) => {
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
      const isBackground = typeof document !== "undefined" && document.hidden;
      setIntervalCadence(isBackground ? 9e4 : 3e4);
      runChecks();
      if (typeof document !== "undefined" && typeof document.addEventListener === "function" && !this._visibilityBound) {
        this._visibilityBound = true;
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) {
            runChecks();
            setIntervalCadence(3e4);
          } else {
            setIntervalCadence(9e4);
          }
        }, { passive: true });
      }
    }
    _checkUpcomingSchedules() {
      const settings = state.getSettings();
      const advanceMinutes = settings.notifyAdvanceMinutes || 15;
      const now = /* @__PURE__ */ new Date();
      const todayStr = getLocalDateString(now);
      const todaySchedules = state.getSchedules(todayStr);
      todaySchedules.forEach((schedule) => {
        if (schedule.completed || !schedule.reminder) return;
        const [hours, minutes] = (schedule.time || "00:00").split(":").map(Number);
        const scheduleDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
        const diffMs = scheduleDate.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 6e4);
        const notifyKey = `${schedule.id}_${todayStr}_${diffMins <= 0 ? "now" : "advance"}`;
        if (diffMins <= advanceMinutes && diffMins > -5 && !this.notifiedSet.has(notifyKey)) {
          this.notifiedSet.add(notifyKey);
          const timeLabel = diffMins <= 0 ? "Sedang berlangsung" : `Dalam ${diffMins} menit lagi`;
          const alertMsg = `${schedule.title} (${schedule.time}) \u2014 ${timeLabel}`;
          this.playChime();
          this.showToast(alertMsg, "warning", 6e3);
          this.sendSystemNotification("DayFlow Pengingat Jadwal", {
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
      const now = /* @__PURE__ */ new Date();
      const hour = now.getHours();
      const todayStr = getLocalDateString(now);
      let currentSlot = null;
      let slotTitle = "";
      if (hour >= 7 && hour < 11) {
        currentSlot = "morning";
        slotTitle = "Sapaan Pagi AI";
      } else if (hour >= 12 && hour < 15) {
        currentSlot = "afternoon";
        slotTitle = "Check-in Siang AI";
      } else if (hour >= 17 && hour < 21) {
        currentSlot = "evening";
        slotTitle = "Review Sore AI";
      }
      if (!currentSlot) return;
      let checkins = { date: todayStr, slots: [] };
      try {
        const raw = localStorage.getItem("dayflow_proactive_checkins");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.date === todayStr) {
            checkins = parsed;
          }
        }
      } catch (e) {
      }
      if (checkins.slots.includes(currentSlot)) return;
      const deadlineTasks = state.getDeadlineTasks();
      const highTasks = state.getHighPriorityTasks();
      if (deadlineTasks.length === 0 && highTasks.length === 0) return;
      const targetTask = deadlineTasks[0] || highTasks[0];
      let deadlineInfo = "";
      if (targetTask.deadline) {
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dParts = targetTask.deadline.split("-").map(Number);
        const deadDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
        const dayDiff = Math.round((deadDate.getTime() - todayMidnight.getTime()) / (1e3 * 60 * 60 * 24));
        const dayName = deadDate.toLocaleDateString("id-ID", { weekday: "long" });
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
      let message = "";
      if (currentSlot === "morning") {
        message = `Selamat pagi! Hari ini ada tugas penting "${targetTask.title}"${deadlineInfo ? " yang " + deadlineInfo : ""}. Saran fokus: cicil 1-2 langkah awal di pagi ini agar tidak menumpuk mendekati tenggat.`;
      } else if (currentSlot === "afternoon") {
        message = `Halo di siang hari! Gimana progres untuk "${targetTask.title}"${deadlineInfo ? " (" + deadlineInfo + ")" : ""}? Sempatkan istirahat sejenak, lalu lanjutkan dengan sesi fokus 25 menit.`;
      } else {
        message = `Selamat sore! Mari evaluasi persiapan untuk "${targetTask.title}"${deadlineInfo ? " (" + deadlineInfo + ")" : ""}. Jika butuh bantuan memecah langkah besok, tanyakan ke aku sekarang ya.`;
      }
      checkins.slots.push(currentSlot);
      try {
        localStorage.setItem("dayflow_proactive_checkins", JSON.stringify(checkins));
      } catch (e) {
      }
      const nudgeData = {
        slot: currentSlot,
        slotTitle,
        text: message,
        targetTaskTitle: targetTask.title,
        timestamp: Date.now()
      };
      try {
        localStorage.setItem("dayflow_active_nudge", JSON.stringify(nudgeData));
      } catch (e) {
      }
      state.addChatMessage({
        role: "assistant",
        text: message,
        isProactive: true,
        timestamp: Date.now()
      });
      this.playChime();
      this.showToast(`AI: ${slotTitle} baru tersedia!`, "info", 5e3);
      this.sendSystemNotification(`DayFlow AI \u2022 ${slotTitle}`, {
        body: message,
        tag: `proactive_${currentSlot}_${todayStr}`,
        renotify: true
      });
      state.notify("ai:proactive-reminder", nudgeData);
    }
    getActiveProactiveNudge() {
      try {
        const raw = localStorage.getItem("dayflow_active_nudge");
        if (!raw) return null;
        const data = JSON.parse(raw);
        const today = getLocalDateString(/* @__PURE__ */ new Date());
        const nudgeDate = getLocalDateString(new Date(data.timestamp));
        if (today === nudgeDate) return data;
        return null;
      } catch (e) {
        return null;
      }
    }
    dismissActiveProactiveNudge() {
      try {
        localStorage.removeItem("dayflow_active_nudge");
        state.notify("ai:proactive-dismissed", null);
      } catch (e) {
      }
    }
  };
  var notifications = new NotificationService();

  // js/animations.js
  function particleBurst(originEl, color = "var(--accent-primary)") {
    if (!originEl || typeof document === "undefined") return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const rect = originEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const count = 7;
    const container = document.createElement("div");
    container.className = "df-burst-container";
    container.style.position = "fixed";
    container.style.left = "0";
    container.style.top = "0";
    container.style.width = "100vw";
    container.style.height = "100vh";
    container.style.pointerEvents = "none";
    container.style.zIndex = "9999";
    const fragment = document.createDocumentFragment();
    const promises = [];
    for (let i = 0; i < count; i++) {
      const angle = i / count * (Math.PI * 2) + (Math.random() * 0.2 - 0.1);
      const distance = 24 + Math.random() * 16;
      const destX = Math.cos(angle) * distance;
      const destY = Math.sin(angle) * distance;
      const dot = document.createElement("div");
      dot.style.position = "absolute";
      dot.style.left = `${centerX}px`;
      dot.style.top = `${centerY}px`;
      dot.style.width = "4px";
      dot.style.height = "4px";
      dot.style.borderRadius = "50%";
      dot.style.backgroundColor = color;
      dot.style.transform = "translate(-50%, -50%) scale(1)";
      dot.style.willChange = "transform, opacity";
      fragment.appendChild(dot);
      const anim = dot.animate([
        {
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 1
        },
        {
          transform: `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(0.3)`,
          opacity: 0
        }
      ], {
        duration: 360,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards"
      });
      promises.push(new Promise((resolve) => anim.onfinish = resolve));
    }
    container.appendChild(fragment);
    document.body.appendChild(container);
    let cleaned = false;
    const cleanup = () => {
      if (!cleaned) {
        cleaned = true;
        container.remove();
      }
    };
    Promise.all(promises).then(cleanup).catch(cleanup);
    setTimeout(cleanup, 450);
  }
  function springBounce(element) {
    if (!element) return;
    element.animate([
      { transform: "scale(1)" },
      { transform: "scale(0.88)" },
      { transform: "scale(1.08)" },
      { transform: "scale(0.98)" },
      { transform: "scale(1)" }
    ], {
      duration: 320,
      easing: "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
    });
  }
  function shakeElement(element) {
    if (!element) return;
    element.animate([
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(5px)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(3px)" },
      { transform: "translateX(0)" }
    ], {
      duration: 320,
      easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)"
    });
  }

  // js/utils/helpers.js
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function inlineMarkdown(str) {
    let s = escapeHtml(str);
    s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08); padding:2px 5px; border-radius:3px; font-family:var(--font-mono); font-size:12px;">$1</code>');
    s = s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*(.*?)\*/g, "<em>$1</em>");
    return s;
  }
  function formatMarkdown(text) {
    if (!text) return "";
    const lines = text.split("\n");
    let html = "";
    let inList = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isListItem = /^[•\-\*]\s+(.*)$/.test(line);
      if (isListItem) {
        if (!inList) {
          html += '<ul style="margin:6px 0; padding-left:20px; list-style-type:disc;">';
          inList = true;
        }
        const itemContent = line.replace(/^[•\-\*]\s+/, "");
        html += `<li>${inlineMarkdown(itemContent)}</li>`;
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        if (line.trim() === "") {
          html += '<div style="height:6px;"></div>';
        } else {
          html += `<div style="margin:3px 0; line-height:1.5;">${inlineMarkdown(line)}</div>`;
        }
      }
    }
    if (inList) {
      html += "</ul>";
    }
    return html;
  }
  function detectScheduleConflicts(schedules) {
    if (!Array.isArray(schedules) || schedules.length < 2) return /* @__PURE__ */ new Map();
    const sorted = [...schedules].filter((s) => s && s.time).map((s) => {
      const parts = String(s.time).split(":").map(Number);
      const h = isNaN(parts[0]) ? 0 : parts[0];
      const m = isNaN(parts[1]) ? 0 : parts[1];
      const start = h * 60 + m;
      const dur = Math.max(5, parseInt(s.duration, 10) || 30);
      return {
        id: s.id,
        title: s.title || "Kegiatan",
        time: s.time,
        start,
        end: start + dur,
        duration: dur
      };
    }).sort((a, b) => a.start - b.start);
    const conflicts = /* @__PURE__ */ new Map();
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
  function generateScheduleText(schedules, dateStr) {
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return "Belum ada agenda untuk hari ini.";
    }
    const d = dateStr && !isNaN((/* @__PURE__ */ new Date(dateStr + "T00:00:00")).getTime()) ? /* @__PURE__ */ new Date(dateStr + "T00:00:00") : /* @__PURE__ */ new Date();
    const formattedDate = d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    const sorted = [...schedules].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    let totalMinutes = 0;
    const lines = [
      `*Agenda Harian \u2014 ${formattedDate}*`,
      `Disusun dengan DayFlow AI (dayflow-563b2.web.app)`,
      `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`
    ];
    sorted.forEach((s) => {
      const dur = parseInt(s.duration, 10) || 30;
      totalMinutes += dur;
      const cat = s.category ? ` [${s.category}]` : "";
      const status = s.completed ? " (Selesai)" : "";
      const desc = s.description ? ` - ${s.description}` : "";
      lines.push(`- ${s.time} (${dur}m): ${s.title}${desc}${cat}${status}`);
    });
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const totalTimeStr = hours > 0 ? `${hours} jam ${mins > 0 ? mins + "m" : ""}` : `${mins} menit`;
    lines.push(`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
    lines.push(`Total: ${sorted.length} kegiatan \u2022 Estimasi fokus: ${totalTimeStr}`);
    return lines.join("\n");
  }
  function generateGoogleCalendarUrl(schedule) {
    if (!schedule || !schedule.time) return "";
    const dateStr = schedule.date ? schedule.date.replace(/-/g, "") : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
    const [h, m] = (schedule.time || "09:00").split(":").map(Number);
    const dur = parseInt(schedule.duration, 10) || 30;
    const startH = String(isNaN(h) ? 9 : h).padStart(2, "0");
    const startM = String(isNaN(m) ? 0 : m).padStart(2, "0");
    const startMinutes = (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m);
    const endMinutes = startMinutes + dur;
    const endH = String(Math.floor(endMinutes % 1440 / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const dtStart = `${dateStr}T${startH}${startM}00`;
    const dtEnd = `${dateStr}T${endH}${endM}00`;
    const title = encodeURIComponent(schedule.title || "Agenda DayFlow");
    const descText = schedule.description ? `${schedule.description}

` : "";
    const details = encodeURIComponent(`${descText}Kategori: ${schedule.category || "Kerja"} | Disusun dengan DayFlow AI`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}`;
  }
  function generateIcsFileContent(schedules, dateStr) {
    const now = /* @__PURE__ */ new Date();
    const stamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const events = (schedules || []).map((s) => {
      const rawDate = (s.date || dateStr || "").replace(/-/g, "");
      const [h, m] = (s.time || "09:00").split(":").map(Number);
      const dur = parseInt(s.duration, 10) || 30;
      const startH = String(isNaN(h) ? 9 : h).padStart(2, "0");
      const startM = String(isNaN(m) ? 0 : m).padStart(2, "0");
      const startMinutes = (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m);
      const endMinutes = startMinutes + dur;
      const endH = String(Math.floor(endMinutes % 1440 / 60)).padStart(2, "0");
      const endM = String(endMinutes % 60).padStart(2, "0");
      const dtStart = `${rawDate}T${startH}${startM}00`;
      const dtEnd = `${rawDate}T${endH}${endM}00`;
      const cleanTitle = (s.title || "Agenda DayFlow").replace(/[,;\n]/g, " ");
      const descText = s.description ? `${s.description.replace(/[,;\n]/g, " ")} - ` : "";
      return [
        "BEGIN:VEVENT",
        `UID:${s.id || Date.now() + Math.random()}@dayflow.web.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${cleanTitle}`,
        `DESCRIPTION:${descText}Kategori: ${s.category || "Kerja"} | Disusun dengan DayFlow AI`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      ].join("\r\n");
    }).join("\r\n");
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DayFlow AI//Agenda Harian//ID",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      events,
      "END:VCALENDAR"
    ].join("\r\n");
  }
  var helperMethods = {
    escapeHtml,
    formatMarkdown,
    _inlineMarkdown: inlineMarkdown,
    detectScheduleConflicts,
    generateScheduleText,
    generateGoogleCalendarUrl,
    generateIcsFileContent
  };

  // js/components/confirm-dialog.js
  function showConfirmDialog({ title, message, confirmText = "Lanjutkan", isDanger = false, icon = "alert" }) {
    return new Promise((resolve) => {
      const modal = document.getElementById("modal-confirm");
      const titleEl = document.getElementById("confirm-modal-title");
      const descEl = document.getElementById("confirm-modal-desc");
      const btnAccept = document.getElementById("confirm-modal-btn-accept");
      const btnCancel = document.getElementById("confirm-modal-btn-cancel");
      const iconWrap = document.getElementById("confirm-modal-icon-wrap");
      const iconEl = document.getElementById("confirm-modal-icon");
      if (!modal) {
        resolve(window.confirm(`${title}
${message}`));
        return;
      }
      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = message;
      if (btnAccept) btnAccept.textContent = confirmText;
      if (btnAccept) {
        if (isDanger) {
          btnAccept.className = "btn btn-danger";
          if (iconWrap) iconWrap.className = "confirm-icon-wrap danger";
        } else {
          btnAccept.className = "btn btn-primary";
          if (iconWrap) iconWrap.className = "confirm-icon-wrap";
        }
      }
      if (iconEl) {
        iconEl.setAttribute("data-icon", icon);
      }
      const onOverlayClick = (e) => {
        if (e.target === modal) cleanup(false);
      };
      const onEscKey = (e) => {
        if (e.key === "Escape") cleanup(false);
      };
      const cleanup = (result) => {
        modal.classList.remove("open");
        modal.removeEventListener("click", onOverlayClick);
        document.removeEventListener("keydown", onEscKey);
        if (btnAccept) btnAccept.onclick = null;
        if (btnCancel) btnCancel.onclick = null;
        resolve(result);
      };
      modal.addEventListener("click", onOverlayClick);
      document.addEventListener("keydown", onEscKey);
      if (btnAccept) btnAccept.onclick = () => cleanup(true);
      if (btnCancel) btnCancel.onclick = () => cleanup(false);
      modal.classList.add("open");
      renderIcons();
    });
  }
  var confirmDialogMethods = {
    showConfirmDialog
  };

  // js/config.js
  var APP_CONFIG = {
    // Free & Secure Serverless AI Proxy endpoint (Cloudflare Worker)
    AI_PROXY_URL: "https://dayflow.dhavinal20.workers.dev",
    // Optional: Centralized Shared API Key (Used as fallback if proxy URL is not set yet)
    CENTRAL_API_KEY: "",
    // Default Gemini Intelligence Model (Token-efficient & broad answers)
    DEFAULT_MODEL: "gemini-2.5-flash",
    // xAI Grok Fallback Configuration
    GROK_API_URL: "https://api.x.ai/v1/chat/completions",
    DEFAULT_GROK_MODEL: "grok-2-latest",
    // Version identifier
    VERSION: "6.4.0"
  };
  if (typeof window !== "undefined") {
    const localProxy = localStorage.getItem("dayflow_proxy_url");
    if (localProxy) {
      APP_CONFIG.AI_PROXY_URL = localProxy;
    }
  }

  // js/gemini.js
  var SYSTEM_INSTRUCTION_BASE = `
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
  var GeminiService = class {
    static getApiKey() {
      const userKey = (state.getSettings().apiKey || "").trim();
      if (userKey) return userKey;
      return (APP_CONFIG.CENTRAL_API_KEY || "").trim();
    }
    static getProxyUrl() {
      return (APP_CONFIG.AI_PROXY_URL || "").trim().replace(/\/+$/, "");
    }
    static getGrokApiKey() {
      return (state.getSettings().grokApiKey || "").trim();
    }
    static getGrokModel() {
      return state.getSettings().grokModel || APP_CONFIG.DEFAULT_GROK_MODEL || "grok-2-latest";
    }
    /**
     * Returns true if AI is operational (either via secure proxy, Gemini key, or Grok key)
     */
    static isAiReady() {
      return Boolean(this.getProxyUrl() || this.getApiKey() || this.getGrokApiKey());
    }
    static getModel() {
      return state.getSettings().geminiModel || APP_CONFIG.DEFAULT_MODEL || "gemini-2.5-flash";
    }
    static buildSystemPrompt() {
      const todaySchedules = state.getTodaySchedules();
      const deadlineTasks = state.getDeadlineTasks();
      const allSchedules = state.getSchedules();
      const now = /* @__PURE__ */ new Date();
      const timeStr = now.toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }) + " " + now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const scheduleListText = todaySchedules.length > 0 ? todaySchedules.map((s) => `- [${s.time} | ${s.duration}m | Prioritas: ${s.priority || "medium"}] ${s.title} (${s.completed ? "Selesai" : "Belum"})`).join("\n") : "(Belum ada jadwal hari ini)";
      const deadlineListText = deadlineTasks.length > 0 ? deadlineTasks.map((s) => `- Tugas: "${s.title}" (Tenggat: ${s.deadline}, Prioritas: ${s.priority || "medium"})`).join("\n") : "(Tidak ada tugas dengan tenggat khusus)";
      const activeListText = allSchedules.length > 0 ? allSchedules.slice(0, 30).map((s) => `- [${s.date} | ${s.time} | Durasi: ${s.duration}m | Perulangan: ${s.recurrence || "none"}] ${s.title}${s.description ? " (" + s.description + ")" : ""}`).join("\n") : "(Belum ada jadwal tersimpan di sistem)";
      return SYSTEM_INSTRUCTION_BASE.replace("{CURRENT_DATETIME}", timeStr).replace("{TODAY_SCHEDULES}", scheduleListText).replace("{SAVED_SCHEDULES}", activeListText).replace("{DEADLINE_TASKS}", deadlineListText);
    }
    /**
     * Adapts Gemini payload format into OpenAI / xAI Grok compatible format
     */
    static convertGeminiPayloadToOpenAI(payload, model = null) {
      const messages = [];
      const systemParts = payload.systemInstruction?.parts || [];
      const systemText = systemParts.map((p) => p.text).filter(Boolean).join("\n\n");
      if (systemText) {
        messages.push({ role: "system", content: systemText });
      }
      if (Array.isArray(payload.contents)) {
        payload.contents.forEach((turn) => {
          const role = turn.role === "model" || turn.role === "assistant" ? "assistant" : "user";
          const parts = Array.isArray(turn.parts) ? turn.parts : [];
          const hasImage = parts.some((p) => p.inlineData && p.inlineData.data);
          if (hasImage) {
            const contentList = [];
            parts.forEach((p) => {
              if (p.inlineData && p.inlineData.data) {
                const mime = p.inlineData.mimeType || "image/jpeg";
                contentList.push({
                  type: "image_url",
                  image_url: {
                    url: `data:${mime};base64,${p.inlineData.data}`
                  }
                });
              } else if (p.text) {
                contentList.push({
                  type: "text",
                  text: p.text
                });
              }
            });
            messages.push({ role, content: contentList });
          } else {
            const combinedText = parts.map((p) => p.text).filter(Boolean).join("\n\n");
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
      const text = grokData?.choices?.[0]?.message?.content || "";
      return {
        candidates: [
          {
            content: {
              parts: [{ text }],
              role: "model"
            },
            finishReason: "STOP"
          }
        ],
        provider: "grok",
        model: grokData?.model || "grok-2-latest"
      };
    }
    /**
     * Direct request to xAI Grok API (Chat Completions)
     */
    static async requestGrokGenerateContent(payload, grokKey = null) {
      const key = (grokKey || this.getGrokApiKey()).trim();
      if (!key) {
        throw new Error("xAI Grok API Key belum diatur.");
      }
      const apiUrl = APP_CONFIG.GROK_API_URL || "https://api.x.ai/v1/chat/completions";
      const grokPayload = this.convertGeminiPayloadToOpenAI(payload);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(grokPayload)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || `Grok HTTP ${response.status}`;
        throw new Error(msg);
      }
      const data = await response.json();
      return this.convertOpenAIToGeminiResponse(data);
    }
    /**
     * Resilient request sender routing through Serverless Proxy or direct Google Gemini with auto-failover to Grok
     */
    static async requestGenerateContent(payload) {
      const apiKey = this.getApiKey();
      const proxyUrl = this.getProxyUrl();
      const userPersonalKey = (state.getSettings().apiKey || "").trim();
      const grokKey = this.getGrokApiKey();
      if (!apiKey && !proxyUrl && !grokKey) {
        throw new Error("Layanan AI belum siap. Konfigurasi AI Gateway atau masukkan API Key di Pengaturan.");
      }
      if (!apiKey && !proxyUrl && grokKey) {
        return await this.requestGrokGenerateContent(payload, grokKey);
      }
      const primaryModel = this.getModel();
      const candidateModels = [primaryModel, "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash"].filter((v, i, a) => a.indexOf(v) === i);
      let lastError = null;
      if (proxyUrl && !userPersonalKey) {
        for (const model of candidateModels) {
          try {
            const response = await fetch(`${proxyUrl}/api/generate`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model,
                payload
              })
            });
            if (response.ok) {
              const data = await response.json();
              if (model !== primaryModel) {
                state.updateSettings({ geminiModel: model });
              }
              return data;
            }
            const errData = await response.json().catch(() => ({}));
            const status = response.status;
            const msg = errData?.error?.message || `Proxy HTTP ${status}`;
            lastError = new Error(msg);
            if (status === 400 || status === 403) {
              break;
            }
          } catch (err) {
            lastError = err;
          }
        }
      } else if (apiKey) {
        for (const model of candidateModels) {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
              },
              body: JSON.stringify(payload)
            });
            if (response.ok) {
              const data = await response.json();
              if (model !== primaryModel) {
                state.updateSettings({ geminiModel: model });
              }
              return data;
            }
            const errData = await response.json().catch(() => ({}));
            const status = response.status;
            const msg = errData?.error?.message || `HTTP ${status}`;
            lastError = new Error(msg);
            if (status === 400 || status === 403) {
              break;
            }
          } catch (err) {
            lastError = err;
          }
        }
      }
      if (grokKey) {
        try {
          console.info("DayFlow AI: Mengalihkan permintaan ke xAI Grok (fallback engine)...");
          return await this.requestGrokGenerateContent(payload, grokKey);
        } catch (grokErr) {
          console.warn("DayFlow AI: Grok fallback juga gagal:", grokErr);
          throw new Error(`Gemini & Grok gagal: ${lastError?.message || "Gemini kendala"} | ${grokErr.message}`);
        }
      }
      throw lastError || new Error("Gagal memproses permintaan AI.");
    }
    /**
     * General Chat with Gemini (Supports Multimodal Image & Document Attachments)
     */
    static async sendChatMessage(userText, attachment = null) {
      const systemPrompt = this.buildSystemPrompt();
      const allHistory = state.getChatHistory();
      let historyToUse = allHistory;
      let currentTurnText = typeof userText === "string" ? userText.trim() : "";
      if (allHistory.length > 0 && allHistory[allHistory.length - 1].role === "user") {
        const lastMsg = allHistory[allHistory.length - 1];
        historyToUse = allHistory.slice(0, -1);
        if (!currentTurnText) {
          currentTurnText = lastMsg.text;
        }
      }
      if (attachment && attachment.textContent) {
        const docHeader = `[DOKUMEN TERLAMPIR: ${attachment.name || "Dokumen"}]
${attachment.textContent}
[/DOKUMEN TERLAMPIR]

`;
        currentTurnText = `${docHeader}${currentTurnText || "Tolong analisis isi dokumen ini dan bantu susunkan jadwal kegiatan atau catatan pentingnya."}`;
      }
      if ((!currentTurnText || currentTurnText.startsWith("Lampiran:")) && attachment && attachment.base64) {
        currentTurnText = "Tolong analisis gambar/dokumen terlampir ini secara menyeluruh, jelaskan informasi jadwal/catatan penting yang tertera, dan buatkan jadwal kegiatan dalam tag [DAYFLOW_SCHEDULES] bila relevan.";
      }
      if (!currentTurnText) {
        currentTurnText = "Halo";
      }
      const rawHistory = historyToUse.slice(-10);
      const normalizedTurns = [];
      rawHistory.forEach((msg) => {
        if (!msg) return;
        const text = typeof msg.text === "string" ? msg.text.trim() : "";
        if (!text) return;
        const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
        if (normalizedTurns.length > 0 && normalizedTurns[normalizedTurns.length - 1].role === role) {
          normalizedTurns[normalizedTurns.length - 1].parts[0].text += `

${text}`;
        } else {
          normalizedTurns.push({
            role,
            parts: [{ text }]
          });
        }
      });
      if (normalizedTurns.length > 0 && normalizedTurns[0].role === "model") {
        normalizedTurns.unshift({
          role: "user",
          parts: [{ text: "Halo DayFlow, tolong bantu aku menata jadwal dan rencanaku." }]
        });
      }
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
      if (normalizedTurns.length > 0 && normalizedTurns[normalizedTurns.length - 1].role === "user") {
        if (attachment && attachment.base64 && attachment.mimeType) {
          normalizedTurns[normalizedTurns.length - 1].parts.unshift({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.base64
            }
          });
        }
        normalizedTurns[normalizedTurns.length - 1].parts[normalizedTurns[normalizedTurns.length - 1].parts.length - 1].text += `

${currentTurnText}`;
      } else {
        normalizedTurns.push({
          role: "user",
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
        throw new Error("Respons dari model Gemini kosong.");
      }
      return rawText.trim();
    }
    /**
     * AI Day Planner: Parse natural unstructured text into structured schedule objects
     * Features: Auto-paraphrasing conversational input, smart deadline/due date detection, priority tagging.
     */
    static async parseNaturalSchedule(rawPlanText, targetDate = null) {
      const dateToUse = targetDate || getLocalDateString();
      const tomorrowObj = /* @__PURE__ */ new Date();
      tomorrowObj.setDate(tomorrowObj.getDate() + 1);
      const tomorrowStr = getLocalDateString(tomorrowObj);
      const lusaObj = /* @__PURE__ */ new Date();
      lusaObj.setDate(lusaObj.getDate() + 2);
      const lusaStr = getLocalDateString(lusaObj);
      const now = /* @__PURE__ */ new Date();
      const currentDayName = now.toLocaleDateString("id-ID", { weekday: "long" });
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
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          // low temperature for deterministic structure
          maxOutputTokens: 1500,
          responseMimeType: "application/json"
        }
      });
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        text = arrayMatch[0];
      }
      const categories = state.getCategories();
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("Format output AI bukan array.");
        return parsed.map((item) => {
          const cat = (item.category || item.kategori || "").trim();
          const foundCat = categories.find((c) => c.name.toLowerCase() === cat.toLowerCase());
          const finalCategory = foundCat ? foundCat.name : ["Kerja", "Fokus", "Pribadi", "Kesehatan"].includes(cat) ? cat : "Kerja";
          const rawTitle = item.title || item.kegiatan || item.activity || item.task || item.name || "Kegiatan Baru";
          const rawDate = item.date || item.tanggal || dateToUse;
          const rawTime = item.time || item.waktu || item.jam || "09:00";
          const rawDuration = item.duration || item.durasi || 30;
          let cleanDeadline = null;
          const rawDeadline = item.deadline || item.tenggat || item.dueDate;
          if (rawDeadline && typeof rawDeadline === "string" && rawDeadline.trim() !== "" && rawDeadline !== "null" && rawDeadline !== "undefined") {
            cleanDeadline = normalizeDateString(rawDeadline, dateToUse);
          }
          const rawPriority = String(item.priority || item.prioritas || "").toLowerCase().trim();
          const validPriorities = ["high", "medium", "low"];
          const finalPriority = validPriorities.includes(rawPriority) ? rawPriority : cleanDeadline ? "high" : "medium";
          const rawRecurrence = String(item.recurrence || item.perulangan || "").toLowerCase().trim();
          const validRecurrence = ["none", "daily", "weekdays", "weekly", "monthly"];
          const finalRecurrence = validRecurrence.includes(rawRecurrence) ? rawRecurrence : "none";
          return {
            title: String(rawTitle).trim() || "Kegiatan Baru",
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
        console.error("Failed to parse AI output as JSON:", text, e);
        throw new Error("AI gagal menghasilkan format jadwal terstruktur. Silakan coba deskripsi yang lebih spesifik.");
      }
    }
    /**
     * Smart Notes Search & Synthesis
     */
    static async searchNotesWithAI(query, notesList) {
      const notesSummary = notesList.map((n, i) => `[${i + 1}] Judul: ${n.title}
Isi:
${n.content}`).join("\n\n---\n\n");
      const prompt = `
Daftar Catatan Pribadi Pengguna:
${notesSummary}

Pertanyaan/Pencarian Pengguna:
"${query}"

Instruksi:
Jawab atau temukan informasi yang dicari pengguna berdasarkan daftar catatan di atas. Berikan kutipan judul catatan yang relevan jika ada. Jika tidak ditemukan, katakan tidak ditemukan secara ringkas. Jangan gunakan emoji.
`;
      const data = await this.requestGenerateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 600 }
      });
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Tidak ada catatan yang cocok.";
    }
    /**
     * Health/Test Ping for AI Connection (Tests either custom key, proxy, or central fallback)
     */
    static async testConnection(customKey = null) {
      const keyToTest = (customKey !== null ? customKey : this.getApiKey()).trim();
      const proxyUrl = this.getProxyUrl();
      if (!keyToTest && !proxyUrl) {
        throw new Error("Belum ada API Key atau Serverless Proxy yang dikonfigurasi.");
      }
      const testPayload = {
        contents: [{ role: "user", parts: [{ text: "Halo, konfirmasi siap dalam 1 kata." }] }],
        generationConfig: { maxOutputTokens: 20 }
      };
      if (keyToTest && (customKey !== null || !proxyUrl)) {
        const candidateModels = [this.getModel(), "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash"].filter((v, i, a) => a.indexOf(v) === i);
        for (const model of candidateModels) {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(keyToTest)}`;
          try {
            const res2 = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": keyToTest
              },
              body: JSON.stringify(testPayload)
            });
            if (res2.ok) {
              return { success: true, mode: "direct", model };
            }
            const err2 = await res2.json().catch(() => ({}));
            if (res2.status === 400 || res2.status === 403) {
              throw new Error(err2?.error?.message || `HTTP ${res2.status}`);
            }
          } catch (err2) {
            if (err2.message && (err2.message.includes("API_KEY_INVALID") || err2.message.includes("403"))) {
              throw err2;
            }
          }
        }
        throw new Error("Koneksi Google Gemini dengan API Key gagal.");
      }
      const res = await fetch(`${proxyUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.getModel(),
          payload: testPayload
        })
      });
      if (res.ok) {
        return { success: true, mode: "proxy", model: this.getModel() };
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Serverless Proxy HTTP ${res.status}`);
    }
    /**
     * Health/Test Ping for xAI Grok Connection
     */
    static async testGrokConnection(customKey = null) {
      const keyToTest = (customKey !== null ? customKey : this.getGrokApiKey()).trim();
      if (!keyToTest) {
        throw new Error("Belum ada Grok API Key yang dimasukkan.");
      }
      const testPayload = {
        contents: [{ role: "user", parts: [{ text: "Halo, konfirmasi siap dalam 1 kata." }] }],
        generationConfig: { maxOutputTokens: 20 }
      };
      const res = await this.requestGrokGenerateContent(testPayload, keyToTest);
      return { success: true, mode: "grok", model: this.getGrokModel(), data: res };
    }
    /**
     * AI Schedule Conflict Resolver
     * Resolves schedule collisions by adjusting start times intelligently.
     * Anti-Slop: Zero emojis, structured JSON response.
     */
    static async resolveScheduleConflicts(conflictsMap, daySchedules, targetDate) {
      const conflictItems = [];
      const fixedItems = [];
      daySchedules.forEach((s) => {
        if (conflictsMap.has(s.id)) {
          const info = conflictsMap.get(s.id);
          conflictItems.push({
            id: s.id,
            title: s.title,
            time: s.time,
            duration: s.duration || 30,
            priority: s.priority || "medium",
            category: s.category || "Fokus",
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
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
      });
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "[]";
      const cleanJson = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      try {
        const solutions = JSON.parse(cleanJson);
        return Array.isArray(solutions) ? solutions : [];
      } catch (e) {
        console.error("Failed to parse AI conflict solutions:", raw, e);
        throw new Error("AI gagal menghasilkan format solusi resolusi bentrok.");
      }
    }
  };

  // js/components/modal-templates.js
  var MODALS_HTML = `
    <!-- Modal: Tambah/Edit Jadwal (Bottom-sheet) -->
    <div id="modal-schedule" class="modal-overlay" role="dialog" aria-modal="true">
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <h3 class="sheet-title" id="modal-schedule-title">Tambah Jadwal Baru</h3>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup">
            <span data-icon="x" data-icon-size="18"></span>
          </button>
        </div>

        <form id="schedule-form" class="modal-form-clean">
          <!-- 1. Nama Kegiatan -->
          <div class="form-group">
            <label class="form-label" for="sch-input-title">Nama Kegiatan</label>
            <input type="text" id="sch-input-title" class="input-control" placeholder="Tuliskan nama kegiatan..." required>
          </div>

          <!-- Deskripsi Singkat (Opsional) -->
          <div class="form-group">
            <label class="form-label" for="sch-input-description">Deskripsi Singkat (Opsional)</label>
            <input type="text" id="sch-input-description" class="input-control" placeholder="Contoh: Gedung Saintek 3S.1, bab 2, link zoom..." maxlength="120">
          </div>

          <!-- 2. Tanggal & Waktu Mulai (Grid 2 Kolom) -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div class="form-group">
              <label class="form-label" for="sch-input-date">Tanggal</label>
              <input type="date" id="sch-input-date" class="input-control" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="sch-input-time">Waktu Mulai</label>
              <input type="time" id="sch-input-time" class="input-control" required>
            </div>
          </div>

          <!-- 3. Durasi Kegiatan (Segmented Pill Strip) -->
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label class="form-label" style="margin-bottom:0;">Durasi Kegiatan</label>
              <span class="text-orange tabular-nums" style="font-size:12px; font-weight:600;" id="sch-duration-label">30 menit</span>
            </div>
            <div class="quick-duration-pills" id="duration-quick-selector">
              <button type="button" class="duration-pill" data-min="15">15m</button>
              <button type="button" class="duration-pill active" data-min="30">30m</button>
              <button type="button" class="duration-pill" data-min="45">45m</button>
              <button type="button" class="duration-pill" data-min="60">60m</button>
              <button type="button" class="duration-pill" data-min="90">90m</button>
            </div>
            <input type="hidden" id="sch-input-duration" value="30">
          </div>

          <!-- 4. Pengaturan Lanjutan (Progressive Disclosure) -->
          <details id="sch-advanced-options" class="advanced-options-details">
            <summary class="advanced-options-summary">
              <span style="display:inline-flex; align-items:center; gap:8px;">
                <span data-icon="sliders" data-icon-size="14"></span>
                <span>Opsi Tambahan (Kategori, Prioritas & Pengingat)</span>
              </span>
              <span class="advanced-summary-chevron" data-icon="chevron-down" data-icon-size="14"></span>
            </summary>
            <div class="advanced-options-body">
              <!-- Kategori Agenda -->
              <div class="form-group">
                <label class="form-label" style="margin-bottom:6px;">Kategori</label>
                <div class="category-radio-grid" id="sch-category-radio-group">
                  <label class="category-radio-item">
                    <input type="radio" name="sch-category-radio" value="Kerja" checked>
                    <span class="category-radio-badge">
                      <span class="category-indicator dot-kerja"></span>
                      Kerja
                    </span>
                  </label>
                  <label class="category-radio-item">
                    <input type="radio" name="sch-category-radio" value="Fokus">
                    <span class="category-radio-badge">
                      <span class="category-indicator dot-fokus"></span>
                      Fokus
                    </span>
                  </label>
                  <label class="category-radio-item">
                    <input type="radio" name="sch-category-radio" value="Pribadi">
                    <span class="category-radio-badge">
                      <span class="category-indicator dot-pribadi"></span>
                      Pribadi
                    </span>
                  </label>
                  <label class="category-radio-item">
                    <input type="radio" name="sch-category-radio" value="Kesehatan">
                    <span class="category-radio-badge">
                      <span class="category-indicator dot-kesehatan"></span>
                      Kesehatan
                    </span>
                  </label>
                </div>
              </div>

              <!-- Tingkat Prioritas -->
              <div class="form-group">
                <label class="form-label" style="margin-bottom:6px;">Prioritas</label>
                <div class="priority-radio-grid" id="sch-priority-radio-group">
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-priority-radio" value="high">
                    <span class="priority-radio-badge">
                      <span class="priority-indicator" style="width:6px; height:6px; border-radius:50%; background:#ef4444;"></span>
                      Tinggi (P1)
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-priority-radio" value="medium" checked>
                    <span class="priority-radio-badge">
                      <span class="priority-indicator" style="width:6px; height:6px; border-radius:50%; background:#f59e0b;"></span>
                      Sedang (P2)
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-priority-radio" value="low">
                    <span class="priority-radio-badge">
                      <span class="priority-indicator" style="width:6px; height:6px; border-radius:50%; background:#9ca3af;"></span>
                      Rendah (P3)
                    </span>
                  </label>
                </div>
              </div>

              <!-- Perulangan Jadwal (Recurrence) -->
              <div class="form-group">
                <label class="form-label" style="margin-bottom:6px;">Ulangi Jadwal</label>
                <div class="priority-radio-grid" id="sch-recurrence-radio-group" style="grid-template-columns: repeat(3, 1fr); gap:6px;">
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-recurrence-radio" value="none" checked>
                    <span class="priority-radio-badge" style="font-size:12px; padding:7px 8px;">
                      Hanya Sekali
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-recurrence-radio" value="daily">
                    <span class="priority-radio-badge" style="font-size:12px; padding:7px 8px;">
                      Setiap Hari
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-recurrence-radio" value="weekdays">
                    <span class="priority-radio-badge" style="font-size:12px; padding:7px 8px;">
                      Hari Kerja (Sen-Jum)
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-recurrence-radio" value="weekly">
                    <span class="priority-radio-badge" style="font-size:12px; padding:7px 8px;">
                      Mingguan
                    </span>
                  </label>
                  <label class="priority-radio-item">
                    <input type="radio" name="sch-recurrence-radio" value="monthly">
                    <span class="priority-radio-badge" style="font-size:12px; padding:7px 8px;">
                      Bulanan
                    </span>
                  </label>
                </div>
              </div>

              <!-- Tenggat & Pengingat -->
              <div class="modal-subcard">
                <div class="form-group" style="margin-bottom:0;">
                  <label class="form-label" for="sch-input-deadline" style="font-size:12px; margin-bottom:4px;">Tenggat Waktu / Deadline (Opsional)</label>
                  <input type="date" id="sch-input-deadline" class="input-control" style="min-height:36px; height:36px; font-size:12px;">
                </div>
                <div class="settings-row" style="margin-top:10px; padding-top:8px; border-top:1px solid var(--border-subtle);">
                  <div class="settings-row-text">
                    <span class="settings-row-title" style="font-size:12.5px;">Pengingat Otomatis</span>
                    <span class="settings-row-desc" style="font-size:11px;">Notifikasi & bel sebelum waktu mulai</span>
                  </div>
                  <label class="toggle-switch" for="sch-toggle-reminder" aria-label="Aktifkan Pengingat">
                    <input type="checkbox" id="sch-toggle-reminder" checked class="toggle-input">
                    <span class="toggle-track">
                      <span class="toggle-thumb"></span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </details>

          <!-- Action Buttons -->
          <div style="display:flex; gap:10px; margin-top:4px;">
            <button type="button" class="btn btn-secondary" onclick="window.dayflowApp.closeAllModals()" style="flex:1;">
              Batal
            </button>
            <button type="submit" class="btn btn-primary" style="flex:2;">
              Simpan Jadwal
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Tambah/Edit Catatan (Bottom-sheet) -->
    <div id="modal-note" class="modal-overlay" role="dialog" aria-modal="true">
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <h3 class="sheet-title" id="modal-note-title">Catatan Baru</h3>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup">
            <span data-icon="x" data-icon-size="18"></span>
          </button>
        </div>

        <form id="note-form" style="display:flex; flex-direction:column; gap:14px;">
          <div class="form-group">
            <label class="form-label" for="note-input-title">Judul Catatan (Opsional)</label>
            <input type="text" id="note-input-title" class="input-control" placeholder="Judul ide atau memo...">
          </div>

          <div class="form-group">
            <label class="form-label" for="note-input-content">Isi Catatan</label>
            <textarea id="note-input-content" class="input-control textarea-control" style="min-height:140px;" placeholder="Tuliskan catatanmu di sini..." required></textarea>
          </div>

          <div style="display:flex; gap:10px;">
            <button type="button" class="btn btn-secondary" onclick="window.dayflowApp.closeAllModals()" style="flex:1;">
              Batal
            </button>
            <button type="submit" class="btn btn-primary" style="flex:2;">
              Simpan Catatan
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Konfirmasi Aksi (Custom Alert/Confirm Dialog) -->
    <div id="modal-confirm" class="modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="confirm-modal-title" aria-describedby="confirm-modal-desc">
      <div class="bottom-sheet confirm-sheet">
        <div class="confirm-icon-wrap" id="confirm-modal-icon-wrap">
          <span data-icon="alert" data-icon-size="22" id="confirm-modal-icon"></span>
        </div>
        <h3 class="sheet-title" id="confirm-modal-title" style="text-align:center; font-size:16px;">Konfirmasi Tindakan</h3>
        <p class="text-muted" id="confirm-modal-desc" style="text-align:center; font-size:13px; line-height:1.5;">Apakah Anda yakin?</p>
        <div style="display:flex; gap:10px; width:100%; margin-top:8px;">
          <button type="button" class="btn btn-secondary" id="confirm-modal-btn-cancel" style="flex:1;">
            Batal
          </button>
          <button type="button" class="btn btn-primary" id="confirm-modal-btn-accept" style="flex:1;">
            Lanjutkan
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Panduan & Tata Cara Gemini API Key -->
    <div id="modal-api-guide" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="api-guide-title">
      <div class="bottom-sheet" style="max-width:540px; max-height:85vh; overflow-y:auto;">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div>
            <h3 class="sheet-title" id="api-guide-title">Tata Cara Menggunakan Gemini API Key</h3>
            <p class="text-xs text-muted" style="margin-top:2px;">Panduan 4 langkah mudah dari Google AI Studio ke DayFlow</p>
          </div>
          <button type="button" class="btn btn-ghost btn-xs btn-icon btn-close-modal" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup Panduan">
            <span data-icon="x" data-icon-size="16"></span>
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">
          <!-- Step 1 -->
          <div class="step-card" style="padding:14px; gap:8px; border-radius:var(--radius-md);">
            <div class="step-card-header">
              <div class="step-number-badge" style="width:26px; height:26px; font-size:13px;">1</div>
              <span class="step-card-title" style="font-size:14px;">Buka Google AI Studio</span>
            </div>
            <p class="text-secondary" style="font-size:12.5px; line-height:1.5; padding-left:38px;">
              Buka portal resmi Google AI Studio dan masuk menggunakan akun Google / Gmail Anda.
            </p>
            <div style="padding-left:38px;">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" class="btn btn-secondary btn-xs" style="text-decoration:none; display:inline-flex; align-items:center; gap:5px;">
                Buka Google AI Studio
                <span data-icon="arrowUpRight" data-icon-size="12"></span>
              </a>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="step-card" style="padding:14px; gap:8px; border-radius:var(--radius-md);">
            <div class="step-card-header">
              <div class="step-number-badge" style="width:26px; height:26px; font-size:13px;">2</div>
              <span class="step-card-title" style="font-size:14px;">Klik "Create API Key"</span>
            </div>
            <p class="text-secondary" style="font-size:12.5px; line-height:1.5; padding-left:38px;">
              Klik tombol biru bertuliskan <b>"Create API key"</b>. Pilih opsi default <i>Create API key in default project</i> (100% gratis tanpa kartu kredit).
            </p>
          </div>

          <!-- Step 3 -->
          <div class="step-card" style="padding:14px; gap:8px; border-radius:var(--radius-md);">
            <div class="step-card-header">
              <div class="step-number-badge" style="width:26px; height:26px; font-size:13px;">3</div>
              <span class="step-card-title" style="font-size:14px;">Salin (Copy) Kunci API</span>
            </div>
            <p class="text-secondary" style="font-size:12.5px; line-height:1.5; padding-left:38px;">
              Klik tombol <b>Copy</b> pada kunci yang muncul. Kunci API diawali dengan teks <code>AQ.</code>.
            </p>
          </div>

          <!-- Step 4 -->
          <div class="step-card" style="padding:14px; gap:8px; border-radius:var(--radius-md);">
            <div class="step-card-header">
              <div class="step-number-badge" style="width:26px; height:26px; font-size:13px;">4</div>
              <span class="step-card-title" style="font-size:14px;">Tempel ke Input DayFlow & Simpan</span>
            </div>
            <p class="text-secondary" style="font-size:12.5px; line-height:1.5; padding-left:38px;">
              Tempelkan (<i>paste</i>) kode ke kolom <b>Gemini API Key</b> di bawah, tekan <b>Uji Koneksi Key</b>, lalu klik <b>Simpan Pengaturan</b>.
            </p>
          </div>

          <!-- Footer Actions in Modal -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding-top:10px; border-top:1px solid var(--border-subtle); flex-wrap:wrap; gap:8px;">
            <a href="/panduan-api.html" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="font-size:12px; text-decoration:none;">
              <span data-icon="file-text" data-icon-size="14"></span>
              Buka Halaman Dokumen Penuh
              <span data-icon="arrowUpRight" data-icon-size="12"></span>
            </a>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.dayflowApp.closeAllModals()">
              Saya Mengerti
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Kelola & Tambah Kategori (Bottom-sheet) -->
    <div id="modal-category" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-category-title">
      <div class="bottom-sheet" style="max-width:500px; max-height:85vh; overflow-y:auto;">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div>
            <h3 class="sheet-title" id="modal-category-title">Kelola Kategori Jadwal</h3>
            <p class="text-xs text-muted" style="margin-top:2px;">Buat kategori baru atau hapus kategori kustom</p>
          </div>
          <button type="button" class="btn btn-ghost btn-xs btn-icon btn-close-modal" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup Kelola Kategori">
            <span data-icon="x" data-icon-size="16"></span>
          </button>
        </div>

        <!-- Form Tambah Kategori Baru -->
        <form id="category-create-form" style="display:flex; flex-direction:column; gap:12px; margin-top:4px;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" for="cat-input-name" style="font-size:12px; margin-bottom:4px;">Nama Kategori Baru</label>
            <input type="text" id="cat-input-name" class="input-control" placeholder="Contoh: Kuliah, Olahraga, Belajar..." required style="min-height:38px; height:38px; font-size:13px;">
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:12px; margin-bottom:4px;">Pilih Warna Indikator</label>
            <div class="color-picker-grid" id="cat-color-picker">
              <!-- Populated dynamically -->
            </div>
            <input type="hidden" id="cat-input-color" value="#f97316">
          </div>

          <button type="submit" class="btn btn-primary btn-sm" style="width:100%; margin-top:4px;">
            <span data-icon="plus" data-icon-size="14"></span>
            Simpan Kategori Baru
          </button>
        </form>

        <!-- Daftar Kategori Aktif -->
        <div style="margin-top:14px; padding-top:12px; border-top:1px solid var(--border-subtle);">
          <div class="form-label" style="font-size:12px; margin-bottom:8px;">Daftar Kategori Aktif</div>
          <div class="category-manage-list" id="category-manage-list">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Share Schedule / Daily Agenda -->
    <div id="modal-share-schedule" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-share-title">
      <div class="bottom-sheet" style="max-width:540px; max-height:85vh; overflow-y:auto;">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div>
            <h3 class="sheet-title" id="modal-share-title">Bagikan Agenda Harian</h3>
            <p class="text-xs text-muted" id="modal-share-subtitle" style="margin-top:2px;">Agenda untuk Hari Ini</p>
          </div>
          <button type="button" class="btn btn-ghost btn-xs btn-icon btn-close-modal" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup Dialog Berbagi">
            <span data-icon="x" data-icon-size="16"></span>
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; margin-top:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span class="text-xs text-muted">Format teks siap kirim ke WhatsApp atau Slack</span>
            <span class="badge-tag" id="share-item-count">0 kegiatan</span>
          </div>

          <textarea id="share-text-preview" class="input-control" rows="8" style="font-family:var(--font-mono); font-size:12px; line-height:1.5; resize:vertical;" readonly></textarea>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <button class="btn btn-primary btn-sm" id="btn-send-whatsapp">
              <span data-icon="share" data-icon-size="14"></span>
              Kirim ke WhatsApp
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-copy-share-text">
              <span data-icon="copy" data-icon-size="14"></span>
              Salin Teks Agenda
            </button>
          </div>

          <div style="padding-top:10px; border-top:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:8px;">
            <span class="text-xs text-muted">Sinkronisasi Kalender Eksternal:</span>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <button class="btn btn-secondary btn-sm" id="btn-download-ics">
                <span data-icon="calendar" data-icon-size="14"></span>
                Unduh File .ICS
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-open-first-gcal">
                <span data-icon="external-link" data-icon-size="14"></span>
                Google Calendar
              </button>
            </div>
          </div>
        </div>
      </div>
    <!-- Modal: AI Schedule Conflict Resolver (Bottom-sheet) -->
    <div id="modal-conflict-resolver" class="modal-overlay" role="dialog" aria-modal="true">
      <div class="bottom-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="text-orange" data-icon="sliders" data-icon-size="18"></span>
            <h3 class="sheet-title">Rekomendasi Penataan Jadwal</h3>
          </div>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="window.dayflowApp.closeAllModals()" aria-label="Tutup">
            <span data-icon="x" data-icon-size="18"></span>
          </button>
        </div>

        <div class="modal-form-clean" style="gap:14px;">
          <p class="text-xs text-secondary" style="margin:0; line-height:1.5;">
            AI telah menganalisis prioritas dan slot waktu luang tanpa menabrak agenda lain. Tinjau penyesuaian waktu berikut:
          </p>

          <div id="conflict-solutions-list" class="conflict-solutions-list">
            <!-- Injected via schedule-view.js -->
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.dayflowApp.closeAllModals()">
              Batal
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-apply-conflict-solutions">
              <span data-icon="check" data-icon-size="14"></span>
              Terapkan Jadwal Baru
            </button>
          </div>
        </div>
      </div>
    </div>
`;
  function mountModals() {
    let root = document.getElementById("modals-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "modals-root";
      document.body.appendChild(root);
    }
    if (!root.innerHTML || root.innerHTML.trim() === "") {
      root.innerHTML = MODALS_HTML;
      renderIcons(root);
    }
  }

  // js/components/modals.js
  var modalMethods = {
    mountModals() {
      mountModals();
    },
    openScheduleModal(scheduleId = null) {
      this.mountModals();
      this.closeAllModals();
      this.editingScheduleId = scheduleId;
      const modal = document.getElementById("modal-schedule");
      const titleEl = document.getElementById("modal-schedule-title");
      const inputTitle = document.getElementById("sch-input-title");
      const inputDescription = document.getElementById("sch-input-description");
      const inputDate = document.getElementById("sch-input-date");
      const inputTime = document.getElementById("sch-input-time");
      const inputDuration = document.getElementById("sch-input-duration");
      const inputDeadline = document.getElementById("sch-input-deadline");
      const durLabel = document.getElementById("sch-duration-label");
      const toggleReminder = document.getElementById("sch-toggle-reminder");
      let currentCategory = "Kerja";
      let currentPriority = "medium";
      let currentRecurrence = "none";
      let currentDeadline = "";
      let currentDuration = 30;
      if (scheduleId) {
        const item = state.schedules.find((s) => s.id === scheduleId);
        if (item) {
          titleEl.textContent = "Ubah Jadwal";
          inputTitle.value = item.title;
          if (inputDescription) inputDescription.value = item.description || "";
          inputDate.value = item.date;
          inputTime.value = item.time;
          currentDuration = item.duration || 30;
          currentCategory = item.category || "Kerja";
          currentPriority = item.priority || "medium";
          currentRecurrence = item.recurrence || "none";
          currentDeadline = item.deadline || "";
          if (toggleReminder) toggleReminder.checked = item.reminder !== false;
        }
      } else {
        titleEl.textContent = "Tambah Jadwal Baru";
        inputTitle.value = "";
        if (inputDescription) inputDescription.value = "";
        inputDate.value = this.selectedScheduleDate || getLocalDateString();
        inputTime.value = "09:00";
        currentDuration = 30;
        currentCategory = "Kerja";
        currentPriority = "medium";
        currentRecurrence = "none";
        currentDeadline = "";
        if (toggleReminder) toggleReminder.checked = true;
      }
      if (inputDuration) inputDuration.value = currentDuration;
      if (durLabel) durLabel.textContent = `${currentDuration} menit`;
      if (inputDeadline) inputDeadline.value = currentDeadline;
      modal.querySelectorAll(".duration-pill").forEach((pill) => {
        if (parseInt(pill.getAttribute("data-min"), 10) === currentDuration) {
          pill.classList.add("active");
        } else {
          pill.classList.remove("active");
        }
      });
      this.renderModalCategoryRadios(currentCategory);
      const prioRadio = modal.querySelector(`input[name="sch-priority-radio"][value="${currentPriority}"]`);
      if (prioRadio) prioRadio.checked = true;
      const recRadio = modal.querySelector(`input[name="sch-recurrence-radio"][value="${currentRecurrence}"]`);
      if (recRadio) recRadio.checked = true;
      const advancedDetails = document.getElementById("sch-advanced-options");
      if (advancedDetails) {
        const isCustomized = currentCategory && currentCategory.toLowerCase() !== "kerja" || currentPriority && currentPriority !== "medium" || currentRecurrence && currentRecurrence !== "none" || currentDeadline && currentDeadline.trim() !== "";
        advancedDetails.open = Boolean(isCustomized);
      }
      modal.classList.add("open");
      setTimeout(() => inputTitle.focus(), 150);
    },
    handleSaveSchedule(e) {
      e.preventDefault();
      const inputTitle = document.getElementById("sch-input-title");
      const inputDescription = document.getElementById("sch-input-description");
      const inputDate = document.getElementById("sch-input-date");
      const inputTime = document.getElementById("sch-input-time");
      const inputDuration = document.getElementById("sch-input-duration");
      const inputDeadline = document.getElementById("sch-input-deadline");
      const toggleReminder = document.getElementById("sch-toggle-reminder");
      const selectedCategoryRadio = document.querySelector('input[name="sch-category-radio"]:checked');
      const selectedPriorityRadio = document.querySelector('input[name="sch-priority-radio"]:checked');
      const selectedRecurrenceRadio = document.querySelector('input[name="sch-recurrence-radio"]:checked');
      const title = inputTitle.value.trim();
      if (!title) {
        shakeElement(inputTitle);
        notifications.showToast("Judul kegiatan wajib diisi.", "warning");
        return;
      }
      const payload = {
        title,
        description: inputDescription ? inputDescription.value.trim() : "",
        date: inputDate.value || getLocalDateString(),
        time: inputTime.value || "09:00",
        duration: parseInt(inputDuration.value, 10) || 30,
        category: selectedCategoryRadio ? selectedCategoryRadio.value : "Kerja",
        priority: selectedPriorityRadio ? selectedPriorityRadio.value : "medium",
        deadline: inputDeadline && inputDeadline.value ? inputDeadline.value : null,
        reminder: toggleReminder ? toggleReminder.checked : true,
        recurrence: selectedRecurrenceRadio ? selectedRecurrenceRadio.value : "none"
      };
      if (this.editingScheduleId) {
        state.updateSchedule(this.editingScheduleId, payload);
        notifications.showToast("Jadwal berhasil diperbarui.", "success");
      } else {
        state.addSchedule(payload);
        notifications.showToast("Jadwal baru ditambahkan.", "success");
      }
      this.closeAllModals();
    },
    openNoteModal(noteId = null) {
      this.mountModals();
      this.closeAllModals();
      this.editingNoteId = noteId;
      const modal = document.getElementById("modal-note");
      const titleModal = document.getElementById("modal-note-title");
      const inputTitle = document.getElementById("note-input-title");
      const inputContent = document.getElementById("note-input-content");
      if (noteId) {
        const note = state.notes.find((n) => n.id === noteId);
        if (note) {
          titleModal.textContent = "Ubah Catatan";
          inputTitle.value = note.title;
          inputContent.value = note.content;
        }
      } else {
        titleModal.textContent = "Catatan Baru";
        inputTitle.value = "";
        inputContent.value = "";
      }
      modal.classList.add("open");
      setTimeout(() => inputContent.focus(), 150);
    },
    handleSaveNote(e) {
      e.preventDefault();
      const inputTitle = document.getElementById("note-input-title");
      const inputContent = document.getElementById("note-input-content");
      const content = inputContent.value.trim();
      if (!content) {
        shakeElement(inputContent);
        notifications.showToast("Isi catatan tidak boleh kosong.", "warning");
        return;
      }
      if (this.editingNoteId) {
        state.updateNote(this.editingNoteId, inputTitle.value, content);
        notifications.showToast("Catatan diperbarui.", "success");
      } else {
        state.addNote(inputTitle.value, content);
        notifications.showToast("Catatan disimpan.", "success");
      }
      this.closeAllModals();
    },
    renderModalCategoryRadios(selectedCategoryName = "Kerja") {
      const groupEl = document.getElementById("sch-category-radio-group");
      if (!groupEl) return;
      const categories = state.getCategories();
      let html = "";
      categories.forEach((cat) => {
        const isChecked = cat.name.toLowerCase() === (selectedCategoryName || "kerja").toLowerCase();
        html += `
        <label class="category-radio-item">
          <input type="radio" name="sch-category-radio" value="${escapeHtml(cat.name)}" ${isChecked ? "checked" : ""}>
          <span class="category-radio-badge">
            <span class="category-indicator" style="background-color:${cat.color};"></span>
            ${escapeHtml(cat.name)}
          </span>
        </label>
      `;
      });
      html += `
      <button type="button" class="btn btn-ghost btn-xs btn-add-category-inline" id="btn-add-cat-inline" style="border:1px dashed var(--border-medium); border-radius:var(--radius-sm); padding:6px 10px; display:inline-flex; align-items:center; justify-content:center; gap:4px; font-size:12px; color:var(--text-secondary); cursor:pointer; min-height:36px; flex:1 1 calc(50% - 6px); min-width:100px;">
        + Kustom
      </button>
    `;
      groupEl.innerHTML = html;
      renderIcons(groupEl);
      const btnAddInline = document.getElementById("btn-add-cat-inline");
      if (btnAddInline) {
        btnAddInline.addEventListener("click", (e) => {
          e.preventDefault();
          springBounce(btnAddInline);
          this.openCategoryModal((newCat) => {
            this.renderModalCategoryRadios(newCat.name);
          });
        });
      }
    },
    openCategoryModal(onCreatedCallback = null) {
      this.mountModals();
      const modal = document.getElementById("modal-category");
      if (!modal) return;
      const colorPickerContainer = document.getElementById("cat-color-picker");
      const colorInput = document.getElementById("cat-input-color");
      const nameInput = document.getElementById("cat-input-name");
      const form = document.getElementById("category-create-form");
      if (nameInput) nameInput.value = "";
      if (colorInput) colorInput.value = CATEGORY_PALETTE[0];
      if (colorPickerContainer) {
        let swatchesHtml = "";
        CATEGORY_PALETTE.forEach((hex, idx) => {
          swatchesHtml += `
          <label class="color-picker-option" title="Warna ${hex}">
            <input type="radio" name="cat-swatch" value="${hex}" ${idx === 0 ? "checked" : ""}>
            <span class="color-picker-swatch" style="background-color:${hex};"></span>
          </label>
        `;
        });
        colorPickerContainer.innerHTML = swatchesHtml;
        colorPickerContainer.querySelectorAll('input[name="cat-swatch"]').forEach((radio) => {
          radio.addEventListener("change", () => {
            if (colorInput) colorInput.value = radio.value;
          });
        });
      }
      this.renderCategoryManageList();
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const catName = nameInput ? nameInput.value.trim() : "";
          const catColor = colorInput ? colorInput.value : CATEGORY_PALETTE[0];
          try {
            const newCat = state.addCategory({ name: catName, color: catColor });
            notifications.showToast(`Kategori "${newCat.name}" berhasil dibuat.`, "success");
            if (nameInput) nameInput.value = "";
            this.renderCategoryManageList();
            this.renderCategoryFilterPills();
            this.renderSettingsCategoriesPreview();
            this.renderModalCategoryRadios(newCat.name);
            if (typeof onCreatedCallback === "function") {
              onCreatedCallback(newCat);
            }
          } catch (err) {
            notifications.showToast(err.message || "Gagal menambahkan kategori.", "warning");
          }
        };
      }
      modal.classList.add("open");
      renderIcons(modal);
      if (nameInput) setTimeout(() => nameInput.focus(), 150);
    },
    renderCategoryManageList() {
      const listEl = document.getElementById("category-manage-list");
      if (!listEl) return;
      const categories = state.getCategories();
      let html = "";
      categories.forEach((cat) => {
        html += `
        <div class="category-manage-item">
          <div class="category-manage-item-info">
            <span class="category-manage-dot" style="background-color:${cat.color};"></span>
            <span style="font-weight:600; color:var(--text-primary); font-size:13px;">${escapeHtml(cat.name)}</span>
            ${cat.isDefault ? '<span class="model-option-badge" style="font-size:10px; padding:1px 6px;">Bawaan</span>' : ""}
          </div>
          <div>
            ${!cat.isDefault ? `
              <button type="button" class="btn btn-ghost btn-xs btn-icon btn-delete-cat" data-cat-id="${cat.id}" data-cat-name="${escapeHtml(cat.name)}" title="Hapus Kategori" aria-label="Hapus Kategori">
                <span data-icon="trash" data-icon-size="14" style="color:var(--text-danger);"></span>
              </button>
            ` : ""}
          </div>
        </div>
      `;
      });
      listEl.innerHTML = html;
      renderIcons(listEl);
      listEl.querySelectorAll(".btn-delete-cat").forEach((btn) => {
        btn.onclick = async () => {
          const catId = btn.getAttribute("data-cat-id");
          const catName = btn.getAttribute("data-cat-name");
          const confirmed = await this.showConfirmDialog({
            title: `Hapus Kategori "${catName}"?`,
            message: "Kategori ini akan dihapus dari daftar opsi kegiatan.",
            confirmText: "Hapus",
            isDanger: true,
            icon: "trash"
          });
          if (confirmed) {
            try {
              state.deleteCategory(catId);
              notifications.showToast(`Kategori "${catName}" telah dihapus.`, "info");
              this.renderCategoryManageList();
              this.renderCategoryFilterPills();
              this.renderSettingsCategoriesPreview();
              this.renderModalCategoryRadios();
            } catch (err) {
              notifications.showToast(err.message, "warning");
            }
          }
        };
      });
    },
    openShareModal(targetDate = null) {
      this.mountModals();
      this.closeAllModals();
      const modal = document.getElementById("modal-share-schedule");
      if (!modal) return;
      const date = targetDate || this.selectedScheduleDate || getLocalDateString();
      const schedules = state.getSchedules(date);
      const textPreview = document.getElementById("share-text-preview");
      const itemCountEl = document.getElementById("share-item-count");
      const shareSubTitle = document.getElementById("modal-share-subtitle");
      const formattedDate = (/* @__PURE__ */ new Date(date + "T00:00:00")).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      if (shareSubTitle) {
        shareSubTitle.textContent = `Agenda untuk ${formattedDate}`;
      }
      if (itemCountEl) {
        itemCountEl.textContent = `${schedules.length} kegiatan`;
      }
      const fullShareText = generateScheduleText(schedules, date);
      if (textPreview) {
        textPreview.value = fullShareText;
      }
      const btnWa = document.getElementById("btn-send-whatsapp");
      if (btnWa) {
        btnWa.onclick = () => {
          springBounce(btnWa);
          const encoded = encodeURIComponent(fullShareText);
          window.open(`https://wa.me/?text=${encoded}`, "_blank");
        };
      }
      const btnCopy = document.getElementById("btn-copy-share-text");
      if (btnCopy) {
        btnCopy.onclick = () => {
          springBounce(btnCopy);
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullShareText);
          } else if (textPreview) {
            textPreview.select();
            document.execCommand("copy");
          }
          notifications.showToast("Teks agenda berhasil disalin ke clipboard!", "success");
        };
      }
      const btnIcs = document.getElementById("btn-download-ics");
      if (btnIcs) {
        btnIcs.onclick = () => {
          springBounce(btnIcs);
          if (schedules.length === 0) {
            notifications.showToast("Tidak ada kegiatan untuk diekspor.", "warning");
            return;
          }
          const icsContent = generateIcsFileContent(schedules, date);
          const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `DayFlow_Agenda_${date}.ics`;
          a.click();
          URL.revokeObjectURL(url);
          notifications.showToast("File kalender (.ics) berhasil diunduh.", "success");
        };
      }
      const btnGCal = document.getElementById("btn-open-first-gcal");
      if (btnGCal) {
        btnGCal.onclick = () => {
          springBounce(btnGCal);
          if (schedules.length === 0) {
            notifications.showToast("Tidak ada kegiatan untuk disinkronkan.", "warning");
            return;
          }
          const url = generateGoogleCalendarUrl(schedules[0]);
          if (url) {
            window.open(url, "_blank");
            notifications.showToast(`Membuka "${schedules[0].title}" di Google Calendar...`, "info");
          }
        };
      }
      modal.classList.add("open");
      renderIcons(modal);
    },
    closeAllModals() {
      document.querySelectorAll(".modal-overlay").forEach((m) => m.classList.remove("open"));
      this.editingScheduleId = null;
      this.editingNoteId = null;
    },
    openApiGuideModal() {
      this.mountModals();
      const modal = document.getElementById("modal-api-guide");
      if (modal) {
        modal.classList.add("open");
        renderIcons(modal);
      }
    }
  };

  // js/views/today-view.js
  var todayViewMethods = {
    // --- 1. Today View ---
    renderTodayView() {
      const today = getLocalDateString();
      const schedules = state.getSchedules(today);
      const settings = state.getSettings();
      this.renderTodayBanner(settings, schedules);
      this.renderTodayProgressBar();
      const completedCount = schedules.filter((s) => s.completed).length;
      const statsCounterEl = document.getElementById("today-stats-counter");
      if (statsCounterEl) {
        statsCounterEl.textContent = `${completedCount} / ${schedules.length} Selesai`;
      }
      const apiKeyBanner = document.getElementById("today-api-banner");
      if (apiKeyBanner) {
        if (!GeminiService.isAiReady()) {
          apiKeyBanner.classList.remove("hidden");
        } else {
          apiKeyBanner.classList.add("hidden");
        }
      }
      const nudgeEl = document.getElementById("today-ai-nudge");
      if (nudgeEl) {
        const activeNudge = notifications.getActiveProactiveNudge();
        if (activeNudge) {
          nudgeEl.classList.remove("hidden");
          const labelEl = document.getElementById("ai-nudge-slot-label");
          const textEl = document.getElementById("ai-nudge-text");
          if (labelEl) labelEl.textContent = activeNudge.slotTitle || "Pengingat Proaktif AI";
          if (textEl) textEl.textContent = activeNudge.text || "";
          const btnDismiss = document.getElementById("btn-dismiss-ai-nudge");
          if (btnDismiss) {
            btnDismiss.onclick = (e) => {
              e.stopPropagation();
              notifications.dismissActiveProactiveNudge();
              nudgeEl.classList.add("hidden");
            };
          }
          const btnReply = document.getElementById("btn-reply-ai-nudge");
          if (btnReply) {
            btnReply.onclick = () => {
              this.switchTab("ai-plan");
            };
          }
          const btnDeadline = document.getElementById("btn-view-deadline-tasks");
          if (btnDeadline) {
            btnDeadline.onclick = () => {
              this.switchTab("schedule");
            };
          }
        } else {
          nudgeEl.classList.add("hidden");
        }
      }
      const listEl = document.getElementById("today-schedule-list");
      this.renderTimelineGrid(schedules, listEl, true);
    },
    // --- TikTok Trend Hero Banner Renderer ---
    renderTodayBanner(settings, schedules) {
      const hour = (/* @__PURE__ */ new Date()).getHours();
      let greetingPrefix = "Selamat Pagi";
      if (hour >= 11 && hour < 15) greetingPrefix = "Selamat Siang";
      else if (hour >= 15 && hour < 18) greetingPrefix = "Selamat Sore";
      else if (hour >= 18 || hour < 4) greetingPrefix = "Selamat Malam";
      const userName = settings.userName && typeof settings.userName === "string" ? settings.userName.trim() : "";
      const fullGreeting = userName ? `${greetingPrefix}, ${userName}` : greetingPrefix;
      const dateText = (/* @__PURE__ */ new Date()).toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const bannerGreetingEl = document.getElementById("today-greeting");
      if (bannerGreetingEl) bannerGreetingEl.textContent = fullGreeting;
      const plainGreetingEl = document.getElementById("today-plain-heading");
      if (plainGreetingEl) plainGreetingEl.textContent = fullGreeting;
      const bannerDateEl = document.getElementById("today-date-meta");
      if (bannerDateEl) bannerDateEl.textContent = dateText;
      const plainDateEl = document.getElementById("today-plain-date-meta");
      if (plainDateEl) plainDateEl.textContent = dateText;
      const bannerContainer = document.getElementById("today-hero-banner");
      const plainContainer = document.getElementById("today-plain-greeting");
      const isBannerEnabled = !!settings.heroBannerEnabled;
      if (bannerContainer && plainContainer) {
        bannerContainer.classList.toggle("hidden", !isBannerEnabled);
        plainContainer.classList.toggle("hidden", isBannerEnabled);
      }
      if (!isBannerEnabled || !bannerContainer) return;
      this.initRealtimeClock();
      const height = settings.heroBannerHeight || "normal";
      bannerContainer.classList.remove("height-compact", "height-normal", "height-cinematic");
      bannerContainer.classList.add(`height-${height}`);
      const overlayEl = document.getElementById("hero-banner-overlay");
      if (overlayEl) {
        const overlayLevel = settings.heroBannerOverlay || "medium";
        overlayEl.className = `hero-banner-overlay overlay-${overlayLevel}`;
      }
      const quoteEl = document.getElementById("today-banner-quote");
      if (quoteEl) {
        quoteEl.textContent = settings.heroBannerQuote || "Fokus pada hal penting hari ini.";
      }
      const bannerStatsEl = document.getElementById("today-banner-stats");
      if (bannerStatsEl) {
        const completedCount = schedules.filter((s) => s.completed).length;
        bannerStatsEl.textContent = `${completedCount} / ${schedules.length} Selesai`;
      }
      const videoEl = document.getElementById("hero-banner-video");
      const imgEl = document.getElementById("hero-banner-image");
      const meshEl = document.getElementById("hero-banner-mesh");
      const muteBtn = document.getElementById("btn-banner-mute");
      const source = settings.heroBannerSource || "preset";
      if (source === "preset") {
        if (muteBtn) muteBtn.classList.add("hidden");
        const presetId = settings.heroBannerPreset || "tokyo_lofi";
        const preset = BANNER_PRESETS.find((p) => p.id === presetId) || BANNER_PRESETS[0];
        if (preset.type === "mesh") {
          if (meshEl) meshEl.classList.remove("hidden");
          if (imgEl) imgEl.classList.add("hidden");
          if (videoEl) {
            videoEl.classList.add("hidden");
            videoEl.pause();
          }
        } else {
          if (meshEl) meshEl.classList.add("hidden");
          if (videoEl) {
            videoEl.classList.add("hidden");
            videoEl.pause();
          }
          if (imgEl) {
            const targetUrl = preset.url || preset.thumb;
            imgEl.classList.remove("hidden");
            if (imgEl.getAttribute("data-src") !== targetUrl || !imgEl.src) {
              imgEl.setAttribute("data-src", targetUrl);
              imgEl.src = targetUrl;
            }
            imgEl.onerror = () => {
              imgEl.classList.add("hidden");
              if (meshEl) meshEl.classList.remove("hidden");
            };
          }
        }
      } else if (source === "upload") {
        getCustomBannerMedia().then((customData) => {
          if (!customData || !customData.blob) {
            const fallback = BANNER_PRESETS[0];
            if (imgEl) {
              imgEl.classList.remove("hidden");
              imgEl.src = fallback.url;
            }
            if (videoEl) {
              videoEl.classList.add("hidden");
              videoEl.pause();
            }
            if (meshEl) meshEl.classList.add("hidden");
            return;
          }
          if (this._activeBannerBlobUrl) {
            URL.revokeObjectURL(this._activeBannerBlobUrl);
          }
          this._activeBannerBlobUrl = URL.createObjectURL(customData.blob);
          const objectUrl = this._activeBannerBlobUrl;
          if (customData.mediaType === "video") {
            if (meshEl) meshEl.classList.add("hidden");
            if (imgEl) imgEl.classList.add("hidden");
            if (videoEl) {
              videoEl.classList.remove("hidden");
              if (videoEl.getAttribute("data-obj-url") !== objectUrl) {
                videoEl.setAttribute("data-obj-url", objectUrl);
                videoEl.src = objectUrl;
                videoEl.play().catch(() => {
                });
              }
            }
            if (muteBtn) muteBtn.classList.remove("hidden");
          } else {
            if (meshEl) meshEl.classList.add("hidden");
            if (videoEl) {
              videoEl.classList.add("hidden");
              videoEl.pause();
            }
            if (imgEl) {
              imgEl.classList.remove("hidden");
              imgEl.src = objectUrl;
            }
            if (muteBtn) muteBtn.classList.add("hidden");
          }
        }).catch(() => {
        });
      } else if (source === "url") {
        const url = settings.heroBannerUrl;
        if (settings.heroBannerMediaType === "video") {
          if (meshEl) meshEl.classList.add("hidden");
          if (imgEl) imgEl.classList.add("hidden");
          if (videoEl) {
            videoEl.classList.remove("hidden");
            if (videoEl.src !== url) {
              videoEl.src = url;
              videoEl.play().catch(() => {
              });
            }
          }
          if (muteBtn) muteBtn.classList.remove("hidden");
        } else {
          if (meshEl) meshEl.classList.add("hidden");
          if (videoEl) {
            videoEl.classList.add("hidden");
            videoEl.pause();
          }
          if (imgEl) {
            imgEl.classList.remove("hidden");
            imgEl.src = url || BANNER_PRESETS[0].url;
          }
          if (muteBtn) muteBtn.classList.add("hidden");
        }
      }
    },
    // --- Banner Settings & Mini Preview Logic ---
    renderBannerSettings(settings) {
      const nameInput = document.getElementById("setting-user-name");
      if (nameInput) nameInput.value = settings.userName || "";
      const bannerToggle = document.getElementById("setting-banner-enabled");
      if (bannerToggle) bannerToggle.checked = !!settings.heroBannerEnabled;
      const bannerBody = document.getElementById("banner-settings-body");
      if (bannerBody) {
        bannerBody.style.display = settings.heroBannerEnabled ? "flex" : "none";
      }
      const quoteInput = document.getElementById("setting-banner-quote");
      if (quoteInput) quoteInput.value = settings.heroBannerQuote || "Fokus pada hal penting hari ini.";
      const urlInput = document.getElementById("setting-banner-url");
      if (urlInput) urlInput.value = settings.heroBannerUrl || "";
      const urlMediaRadio = document.querySelector(`input[name="url-media-type"][value="${settings.heroBannerMediaType || "image"}"]`);
      if (urlMediaRadio) urlMediaRadio.checked = true;
      const presetGrid = document.getElementById("preset-cards-grid");
      if (presetGrid) {
        presetGrid.innerHTML = BANNER_PRESETS.map((p) => `
        <div class="preset-card-item ${p.id === (settings.heroBannerPreset || "tokyo_lofi") ? "is-selected" : ""}" data-preset-id="${p.id}">
          <div class="preset-thumb-wrap">
            ${p.type === "mesh" ? '<div class="hero-banner-mesh" style="position:absolute;inset:0;"></div>' : `<img src="${p.thumb || p.url}" alt="${p.name}" class="preset-thumb-img" loading="lazy">`}
            <div class="preset-thumb-overlay"></div>
          </div>
          <div class="preset-meta-info">
            <div class="preset-name-row">
              <span class="preset-name">${p.name}</span>
              <div class="preset-active-check">
                ${getIcon("check", "", 14)}
              </div>
            </div>
            <span class="preset-vibe-desc">${p.vibe}</span>
          </div>
        </div>
      `).join("");
        presetGrid.querySelectorAll(".preset-card-item").forEach((card) => {
          card.addEventListener("click", () => {
            springBounce(card);
            const presetId = card.getAttribute("data-preset-id");
            presetGrid.querySelectorAll(".preset-card-item").forEach((c) => c.classList.toggle("is-selected", c === card));
            const updated = state.updateSettings({
              heroBannerSource: "preset",
              heroBannerPreset: presetId
            });
            this.updateBannerMiniPreview(updated);
            this.renderTodayView();
            notifications.showToast("Tema banner diperbarui.", "info");
          });
        });
      }
      const currentSource = settings.heroBannerSource || "preset";
      document.querySelectorAll(".source-pill").forEach((btn) => {
        const s = btn.getAttribute("data-source");
        btn.classList.toggle("is-active", s === currentSource);
      });
      const presetPanel = document.getElementById("banner-source-preset-panel");
      const uploadPanel = document.getElementById("banner-source-upload-panel");
      const urlPanel = document.getElementById("banner-source-url-panel");
      if (presetPanel) presetPanel.classList.toggle("hidden", currentSource !== "preset");
      if (uploadPanel) uploadPanel.classList.toggle("hidden", currentSource !== "upload");
      if (urlPanel) urlPanel.classList.toggle("hidden", currentSource !== "url");
      getCustomBannerMedia().then((customData) => {
        const statusInfo = document.getElementById("upload-status-info");
        const filenameEl = document.getElementById("uploaded-filename");
        if (statusInfo && filenameEl) {
          if (customData && customData.filename) {
            filenameEl.textContent = `${customData.filename} (${customData.mediaType.toUpperCase()})`;
            statusInfo.classList.remove("hidden");
          } else {
            statusInfo.classList.add("hidden");
          }
        }
      }).catch(() => {
      });
      const currentHeight = settings.heroBannerHeight || "normal";
      document.querySelectorAll("#banner-height-chips .size-pill").forEach((chip) => {
        const h = chip.getAttribute("data-height");
        chip.classList.toggle("is-active", h === currentHeight);
      });
      const currentOverlay = settings.heroBannerOverlay || "medium";
      document.querySelectorAll("#banner-overlay-chips .size-pill").forEach((chip) => {
        const o = chip.getAttribute("data-overlay");
        chip.classList.toggle("is-active", o === currentOverlay);
      });
      this.updateBannerMiniPreview(settings);
    },
    updateBannerMiniPreview(settings) {
      const titleEl = document.getElementById("mini-preview-title");
      const imgEl = document.getElementById("mini-preview-image");
      const videoEl = document.getElementById("mini-preview-video");
      const meshEl = document.getElementById("mini-preview-mesh");
      const userName = settings.userName && typeof settings.userName === "string" ? settings.userName.trim() : "";
      if (titleEl) titleEl.textContent = userName ? `Selamat Datang, ${userName}` : "Selamat Datang";
      const source = settings.heroBannerSource || "preset";
      if (source === "preset") {
        const preset = BANNER_PRESETS.find((p) => p.id === (settings.heroBannerPreset || "tokyo_lofi")) || BANNER_PRESETS[0];
        if (preset.type === "mesh") {
          if (meshEl) meshEl.classList.remove("hidden");
          if (imgEl) imgEl.classList.add("hidden");
          if (videoEl) videoEl.classList.add("hidden");
        } else {
          if (meshEl) meshEl.classList.add("hidden");
          if (videoEl) videoEl.classList.add("hidden");
          if (imgEl) {
            imgEl.classList.remove("hidden");
            imgEl.src = preset.thumb || preset.url;
          }
        }
      } else if (source === "upload") {
        getCustomBannerMedia().then((customData) => {
          if (!customData || !customData.blob) return;
          const objectUrl = URL.createObjectURL(customData.blob);
          if (customData.mediaType === "video") {
            if (meshEl) meshEl.classList.add("hidden");
            if (imgEl) imgEl.classList.add("hidden");
            if (videoEl) {
              videoEl.classList.remove("hidden");
              videoEl.src = objectUrl;
            }
          } else {
            if (meshEl) meshEl.classList.add("hidden");
            if (videoEl) videoEl.classList.add("hidden");
            if (imgEl) {
              imgEl.classList.remove("hidden");
              imgEl.src = objectUrl;
            }
          }
        }).catch(() => {
        });
      } else if (source === "url") {
        const url = settings.heroBannerUrl;
        if (settings.heroBannerMediaType === "video") {
          if (meshEl) meshEl.classList.add("hidden");
          if (imgEl) imgEl.classList.add("hidden");
          if (videoEl) {
            videoEl.classList.remove("hidden");
            videoEl.src = url;
          }
        } else {
          if (meshEl) meshEl.classList.add("hidden");
          if (videoEl) videoEl.classList.add("hidden");
          if (imgEl) {
            imgEl.classList.remove("hidden");
            imgEl.src = url || BANNER_PRESETS[0].url;
          }
        }
      }
    },
    bindBannerSettingsEvents() {
      const bannerToggle = document.getElementById("setting-banner-enabled");
      const bannerBody = document.getElementById("banner-settings-body");
      if (bannerToggle) {
        bannerToggle.addEventListener("change", () => {
          const isEnabled = bannerToggle.checked;
          if (bannerBody) bannerBody.style.display = isEnabled ? "flex" : "none";
          state.updateSettings({ heroBannerEnabled: isEnabled, hasConfiguredBanner: true });
          this.renderTodayView();
          notifications.showToast(`Banner sambutan ${isEnabled ? "diaktifkan" : "dinonaktifkan"}.`, "info");
        });
      }
      const nameInput = document.getElementById("setting-user-name");
      if (nameInput) {
        nameInput.addEventListener("input", (e) => {
          const val = e.target.value.trim();
          state.updateSettings({ userName: val });
          this.updateBannerMiniPreview(state.getSettings());
          this.renderTodayView();
        });
      }
      document.querySelectorAll(".source-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          springBounce(btn);
          const source = btn.getAttribute("data-source");
          document.querySelectorAll(".source-pill").forEach((b) => b.classList.toggle("is-active", b === btn));
          const presetPanel = document.getElementById("banner-source-preset-panel");
          const uploadPanel = document.getElementById("banner-source-upload-panel");
          const urlPanel = document.getElementById("banner-source-url-panel");
          if (presetPanel) presetPanel.classList.toggle("hidden", source !== "preset");
          if (uploadPanel) uploadPanel.classList.toggle("hidden", source !== "upload");
          if (urlPanel) urlPanel.classList.toggle("hidden", source !== "url");
          const updated = state.updateSettings({ heroBannerSource: source });
          this.updateBannerMiniPreview(updated);
          this.renderTodayView();
        });
      });
      const btnTriggerUpload = document.getElementById("btn-trigger-upload");
      const fileInput = document.getElementById("input-banner-file");
      const dropzone = document.getElementById("banner-upload-dropzone");
      if (btnTriggerUpload && fileInput) {
        btnTriggerUpload.addEventListener("click", (e) => {
          e.stopPropagation();
          fileInput.click();
        });
      }
      if (dropzone && fileInput) {
        dropzone.addEventListener("click", () => fileInput.click());
        dropzone.addEventListener("dragover", (e) => {
          e.preventDefault();
          dropzone.style.borderColor = "var(--accent-primary)";
        });
        dropzone.addEventListener("dragleave", () => {
          dropzone.style.borderColor = "";
        });
        dropzone.addEventListener("drop", (e) => {
          e.preventDefault();
          dropzone.style.borderColor = "";
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            this.handleBannerFileUpload(e.dataTransfer.files[0]);
          }
        });
      }
      if (fileInput) {
        fileInput.addEventListener("change", (e) => {
          if (e.target.files && e.target.files[0]) {
            this.handleBannerFileUpload(e.target.files[0]);
          }
        });
      }
      const btnRemoveUploaded = document.getElementById("btn-remove-uploaded");
      if (btnRemoveUploaded) {
        btnRemoveUploaded.addEventListener("click", async () => {
          await deleteCustomBannerMedia();
          const statusInfo = document.getElementById("upload-status-info");
          if (statusInfo) statusInfo.classList.add("hidden");
          const updated = state.updateSettings({
            heroBannerSource: "preset",
            heroBannerPreset: "tokyo_lofi"
          });
          this.updateBannerMiniPreview(updated);
          this.renderTodayView();
          notifications.showToast("File kustom dihapus, beralih ke preset.", "info");
        });
      }
      const urlInput = document.getElementById("setting-banner-url");
      if (urlInput) {
        urlInput.addEventListener("change", (e) => {
          const val = e.target.value.trim();
          const mediaType = document.querySelector('input[name="url-media-type"]:checked')?.value || "image";
          const updated = state.updateSettings({
            heroBannerSource: "url",
            heroBannerUrl: val,
            heroBannerMediaType: mediaType
          });
          this.updateBannerMiniPreview(updated);
          this.renderTodayView();
        });
      }
      document.querySelectorAll('input[name="url-media-type"]').forEach((radio) => {
        radio.addEventListener("change", (e) => {
          const val = e.target.value;
          const url = document.getElementById("setting-banner-url")?.value.trim() || "";
          const updated = state.updateSettings({
            heroBannerSource: "url",
            heroBannerUrl: url,
            heroBannerMediaType: val
          });
          this.updateBannerMiniPreview(updated);
          this.renderTodayView();
        });
      });
      document.querySelectorAll("#banner-height-chips .size-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          springBounce(btn);
          const h = btn.getAttribute("data-height");
          document.querySelectorAll("#banner-height-chips .size-pill").forEach((b) => b.classList.toggle("is-active", b === btn));
          state.updateSettings({ heroBannerHeight: h });
          this.renderTodayView();
        });
      });
      document.querySelectorAll("#banner-overlay-chips .size-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          springBounce(btn);
          const o = btn.getAttribute("data-overlay");
          document.querySelectorAll("#banner-overlay-chips .size-pill").forEach((b) => b.classList.toggle("is-active", b === btn));
          state.updateSettings({ heroBannerOverlay: o });
          this.renderTodayView();
        });
      });
      const quoteInput = document.getElementById("setting-banner-quote");
      if (quoteInput) {
        quoteInput.addEventListener("input", (e) => {
          const val = e.target.value.trim() || "Fokus pada hal penting hari ini.";
          state.updateSettings({ heroBannerQuote: val });
          const quoteDisplay = document.getElementById("today-banner-quote");
          if (quoteDisplay) quoteDisplay.textContent = val;
        });
      }
      this.initRealtimeClock();
      const muteBtn = document.getElementById("btn-banner-mute");
      const bannerVideo = document.getElementById("hero-banner-video");
      if (muteBtn && bannerVideo) {
        muteBtn.addEventListener("click", () => {
          springBounce(muteBtn);
          bannerVideo.muted = !bannerVideo.muted;
          muteBtn.innerHTML = getIcon(bannerVideo.muted ? "volume-x" : "volume", "", 14);
          notifications.showToast(bannerVideo.muted ? "Audio video dibisukan." : "Audio video aktif.", "info");
        });
      }
    },
    async handleBannerFileUpload(file) {
      if (!file) return;
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) {
        notifications.showToast("Format file tidak didukung. Harap pilih video atau gambar.", "warning");
        return;
      }
      const maxSize = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
      if (file.size > maxSize) {
        notifications.showToast(`Ukuran file terlalu besar (maksimal ${isVideo ? "50MB" : "15MB"}).`, "warning");
        return;
      }
      const mediaType = isVideo ? "video" : "image";
      const success = await saveCustomBannerMedia(file, mediaType, file.name);
      if (success) {
        const statusInfo = document.getElementById("upload-status-info");
        const filenameEl = document.getElementById("uploaded-filename");
        if (statusInfo && filenameEl) {
          filenameEl.textContent = `${file.name} (${mediaType.toUpperCase()})`;
          statusInfo.classList.remove("hidden");
        }
        const updated = state.updateSettings({
          heroBannerSource: "upload",
          heroBannerMediaType: mediaType
        });
        this.updateBannerMiniPreview(updated);
        this.renderTodayView();
        notifications.showToast(`${isVideo ? "Video" : "Gambar"} banner berhasil dipasang & disimpan lokal!`, "success");
      } else {
        notifications.showToast("Gagal menyimpan file banner ke browser.", "danger");
      }
    },
    renderTodayProgressBar() {
      const widget = document.getElementById("today-schedule-progress-widget");
      if (!widget) return;
      const prod = state.getTodayProductivity();
      const stats = state.getProfileProductivityStats();
      const percentEl = document.getElementById("today-progress-percent");
      const metaEl = document.getElementById("today-progress-meta");
      const trackEl = document.getElementById("today-progress-track");
      const fillEl = document.getElementById("today-progress-fill");
      const countdownText = document.getElementById("today-countdown-text");
      const statusText = document.getElementById("today-progress-status-text");
      const streakText = document.getElementById("today-streak-text");
      if (percentEl) percentEl.textContent = `${prod.percentage}%`;
      if (metaEl) {
        if (prod.totalScheduled === 0) {
          metaEl.textContent = "Belum ada agenda hari ini";
        } else {
          metaEl.textContent = `${prod.completedCount} dari ${prod.totalScheduled} kegiatan selesai`;
        }
      }
      if (trackEl) {
        trackEl.setAttribute("aria-valuenow", prod.percentage);
        trackEl.setAttribute("aria-valuemax", 100);
      }
      if (fillEl) {
        fillEl.style.width = `${prod.percentage}%`;
        fillEl.classList.toggle("is-complete", prod.isComplete);
      }
      if (countdownText) {
        if (prod.isComplete) {
          countdownText.textContent = "Tuntas 100% Hari Ini";
        } else {
          countdownText.textContent = `Sisa ${prod.remainingTimeStr} hingga 24:00`;
        }
      }
      if (statusText) {
        if (prod.totalScheduled === 0) {
          statusText.textContent = "Belum ada agenda hari ini.";
        } else if (prod.isComplete) {
          statusText.textContent = "Semua agenda hari ini telah tuntas!";
        } else {
          const remaining = prod.totalScheduled - prod.completedCount;
          statusText.textContent = `${remaining} kegiatan lagi hari ini.`;
        }
      }
      if (streakText) {
        if (stats.perfectDays > 0) {
          streakText.textContent = `${stats.perfectDays} Hari Konsisten`;
        } else {
          streakText.textContent = "Mulai Konsistensi Hari Ini";
        }
      }
      if (prod.isComplete && !this._lastCelebratedComplete) {
        this._lastCelebratedComplete = true;
        try {
          if (typeof particleBurst === "function") {
            particleBurst(widget);
          }
        } catch (e) {
        }
      } else if (!prod.isComplete) {
        this._lastCelebratedComplete = false;
      }
      this.initRealtimeClock();
    },
    initRealtimeClock() {
      const updateClock = () => {
        const now = /* @__PURE__ */ new Date();
        const clockEl = document.getElementById("banner-live-clock");
        if (clockEl) {
          const h = String(now.getHours()).padStart(2, "0");
          const m = String(now.getMinutes()).padStart(2, "0");
          const s = String(now.getSeconds()).padStart(2, "0");
          clockEl.textContent = `${h}:${m}:${s}`;
        }
        const countdownText = document.getElementById("today-countdown-text");
        if (countdownText && !countdownText.textContent.includes("Tuntas 100%")) {
          const prod = state.getTodayProductivity();
          countdownText.textContent = `Sisa ${prod.remainingTimeStr} hingga 24:00`;
        }
      };
      updateClock();
      if (!this._realtimeClockInterval) {
        this._realtimeClockInterval = setInterval(updateClock, 1e3);
      }
    }
  };

  // js/views/schedule-view.js
  var scheduleViewMethods = {
    // --- 2. Schedule View ---
    renderScheduleView() {
      this.renderWeekStrip();
      this.renderCategoryFilterPills();
      let schedules = state.getSchedules(this.selectedScheduleDate);
      if (this.selectedCategory !== "all") {
        schedules = schedules.filter((s) => s.category && s.category.toLowerCase() === this.selectedCategory.toLowerCase());
      }
      const listEl = document.getElementById("full-schedule-list");
      const isToday = !this.selectedScheduleDate || this.selectedScheduleDate === getLocalDateString();
      this.renderTimelineGrid(schedules, listEl, isToday);
      this.setupSwipeNavigation(listEl);
      const dateInput = document.getElementById("schedule-date-filter");
      if (dateInput) {
        dateInput.onchange = () => {
          this.selectedScheduleDate = dateInput.value || getLocalDateString();
          this.renderScheduleView();
        };
      }
      const viewSection = document.getElementById("view-schedule");
      if (viewSection) {
        renderIcons(viewSection);
      }
    },
    renderCategoryFilterPills() {
      const pillContainer = document.getElementById("category-filter-pills");
      if (!pillContainer) return;
      const categories = state.getCategories();
      let html = `
      <button type="button" class="btn ${this.selectedCategory === "all" ? "btn-primary" : "btn-secondary"} btn-sm" data-category="all">
        Semua
      </button>
    `;
      categories.forEach((cat) => {
        const isSelected = this.selectedCategory.toLowerCase() === cat.name.toLowerCase();
        html += `
        <button type="button" class="btn ${isSelected ? "btn-primary" : "btn-secondary"} btn-sm" data-category="${escapeHtml(cat.name)}" style="display:inline-flex; align-items:center; gap:6px;">
          <span style="width:7px; height:7px; border-radius:50%; background-color:${cat.color}; flex-shrink:0;"></span>
          <span>${escapeHtml(cat.name)}</span>
        </button>
      `;
      });
      html += `
      <button type="button" class="btn-add-category-pill" id="btn-open-category-modal" title="Tambah / Kelola Kategori">
        ${getIcon("plus", "", 13)}
        <span>Kategori</span>
      </button>
    `;
      pillContainer.innerHTML = html;
      renderIcons(pillContainer);
      pillContainer.querySelectorAll("button[data-category]").forEach((btn) => {
        btn.addEventListener("click", () => {
          springBounce(btn);
          this.selectedCategory = btn.getAttribute("data-category");
          this.renderScheduleView();
        });
      });
      const addCatBtn = document.getElementById("btn-open-category-modal");
      if (addCatBtn) {
        addCatBtn.addEventListener("click", () => {
          springBounce(addCatBtn);
          this.openCategoryModal();
        });
      }
    },
    renderWeekStrip() {
      const gridEl = document.getElementById("week-strip-grid");
      const monthLabel = document.getElementById("week-strip-month-label");
      const dateInput = document.getElementById("schedule-date-filter");
      if (!gridEl) return;
      const selected = !this.selectedScheduleDate || isNaN((/* @__PURE__ */ new Date(this.selectedScheduleDate + "T00:00:00")).getTime()) ? /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date(this.selectedScheduleDate + "T00:00:00");
      if (monthLabel) {
        monthLabel.textContent = selected.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      }
      if (dateInput) {
        dateInput.value = this.selectedScheduleDate;
      }
      const dayOfWeek = (selected.getDay() + 6) % 7;
      const monday = new Date(selected);
      monday.setDate(selected.getDate() - dayOfWeek);
      const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
      let html = "";
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dStr = getLocalDateString(d);
        const isSelected = dStr === this.selectedScheduleDate;
        const count = state.getSchedules(dStr).length;
        html += `
        <button class="day-strip-btn ${isSelected ? "active" : ""}" data-date="${dStr}">
          <span class="day-strip-name">${dayNames[i]}</span>
          <span class="day-strip-number">${d.getDate()}</span>
          ${count > 0 ? `<span class="day-strip-indicator" style="${isSelected ? "background:#fff;" : "background:var(--accent-primary);"}"></span>` : '<span style="height:4px; margin-top:3px;"></span>'}
        </button>
      `;
      }
      gridEl.innerHTML = html;
      gridEl.querySelectorAll(".day-strip-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.selectedScheduleDate = btn.getAttribute("data-date");
          this.renderScheduleView();
        });
      });
    },
    setupTimelineDelegation(containerEl) {
      if (!containerEl || containerEl._hasTimelineDelegation) return;
      containerEl._hasTimelineDelegation = true;
      containerEl.addEventListener("click", async (e) => {
        const target = e.target;
        if (!target) return;
        const carryBtn = target.closest("#btn-carry-over-action");
        if (carryBtn) {
          e.stopPropagation();
          const yesterdayDate = /* @__PURE__ */ new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterdayStr = getLocalDateString(yesterdayDate);
          const count = state.carryOverUnfinishedSchedules(yesterdayStr, getLocalDateString());
          notifications.showToast(`${count} agenda kemarin berhasil disalin ke hari ini.`, "success");
          return;
        }
        const toggleBtn = target.closest('[data-action="toggle-complete"]');
        if (toggleBtn) {
          e.stopPropagation();
          const id = toggleBtn.getAttribute("data-id");
          const targetDate = toggleBtn.getAttribute("data-date");
          const sch = state.getSchedules(targetDate).find((s) => s.id === id);
          const willComplete = !sch?.completed;
          if (willComplete) {
            particleBurst(toggleBtn, "var(--status-success)");
            if (navigator.vibrate) {
              try {
                navigator.vibrate([15, 30, 20]);
              } catch (e2) {
              }
            }
            notifications.playChime("crystal");
          }
          springBounce(toggleBtn);
          state.toggleScheduleComplete(id, targetDate);
          if (willComplete && sch) {
            this.showUndoCompletionToast(id, targetDate, sch.title);
          }
          return;
        }
        if (target.closest('[data-action="gcal"]')) {
          return;
        }
        const editBtn = target.closest('[data-action="edit-schedule"]');
        if (editBtn) {
          e.stopPropagation();
          this.openScheduleModal(editBtn.getAttribute("data-id"));
          return;
        }
        const deleteBtn = target.closest('[data-action="delete-schedule"]');
        if (deleteBtn) {
          e.stopPropagation();
          const confirmed = await this.showConfirmDialog({
            title: "Hapus Agenda Ini?",
            message: "Agenda kegiatan ini akan dihapus dari agenda harianmu.",
            confirmText: "Hapus",
            isDanger: true,
            icon: "trash"
          });
          if (confirmed) {
            state.deleteSchedule(deleteBtn.getAttribute("data-id"));
            notifications.showToast("Jadwal berhasil dihapus.", "info");
          }
          return;
        }
        const card = target.closest(".timeline-card");
        if (card && !target.closest("button") && !target.closest("a")) {
          const id = card.getAttribute("data-id");
          if (id) {
            this.openScheduleModal(id);
          }
        }
      });
      containerEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          const card = e.target.closest(".timeline-card");
          if (card && e.target === card) {
            e.preventDefault();
            const id = card.getAttribute("data-id");
            if (id) this.openScheduleModal(id);
          }
        }
      });
    },
    renderTimelineGrid(schedules, containerEl, isToday = false) {
      if (!containerEl) return;
      this.setupTimelineDelegation(containerEl);
      if (schedules.length === 0) {
        let carryOverBtnHtml = "";
        if (isToday) {
          const yesterdayDate = /* @__PURE__ */ new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterdayStr = getLocalDateString(yesterdayDate);
          const unfinished = state.getUnfinishedSchedules(yesterdayStr);
          if (unfinished.length > 0) {
            carryOverBtnHtml = `
            <div style="margin-top:14px;">
              <button class="btn btn-secondary btn-sm" id="btn-carry-over-action">
                ${getIcon("refresh-cw", "", 14)} Salin ${unfinished.length} Agenda Belum Selesai dari Kemarin
              </button>
            </div>
          `;
          }
        }
        containerEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${getIcon("calendar", "", 20)}</div>
          <p class="empty-state-title">Tidak ada agenda ${isToday ? "hari ini" : "pada tanggal ini"}</p>
          <p class="empty-state-desc">Mulai hari dengan mencatat kegiatan atau susun jadwal otomatis bersama AI.</p>
          <div class="empty-state-actions">
            <button type="button" class="btn btn-primary btn-sm" id="btn-empty-add-schedule">
              ${getIcon("plus", "", 14)} Tambah Jadwal
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-empty-ai-plan">
              ${getIcon("bot", "", 14)} Rencana AI
            </button>
          </div>
          ${carryOverBtnHtml}
        </div>
      `;
        renderIcons(containerEl);
        const addBtn = containerEl.querySelector("#btn-empty-add-schedule");
        if (addBtn) {
          addBtn.addEventListener("click", () => {
            springBounce(addBtn);
            this.openScheduleModal(null, isToday ? getLocalDateString() : this.selectedScheduleDate);
          });
        }
        const aiPlanBtn = containerEl.querySelector("#btn-empty-ai-plan");
        if (aiPlanBtn) {
          aiPlanBtn.addEventListener("click", () => {
            springBounce(aiPlanBtn);
            this.switchTab("ai-plan");
          });
        }
        const carryBtn = containerEl.querySelector("#btn-carry-over-action");
        if (carryBtn) {
          carryBtn.addEventListener("click", () => {
            const yesterdayDate = /* @__PURE__ */ new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayStr = getLocalDateString(yesterdayDate);
            const count = state.carryOverUnfinishedSchedules(yesterdayStr, getLocalDateString());
            notifications.showToast(`${count} agenda kemarin berhasil disalin ke hari ini.`, "success");
          });
        }
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const todayStr = getLocalDateString(now);
      const conflicts = detectScheduleConflicts(schedules);
      const targetDate = schedules[0]?.date || this.selectedScheduleDate || getLocalDateString();
      let conflictBannerHtml = "";
      if (conflicts.size > 0) {
        conflictBannerHtml = `
        <div class="conflict-resolver-banner" id="conflict-resolver-banner">
          <div class="conflict-resolver-info">
            <span class="conflict-resolver-icon">${getIcon("alert-triangle", "", 18)}</span>
            <div class="conflict-resolver-text">
              <span class="conflict-resolver-title">Ada ${conflicts.size} Jadwal Bertabrakan</span>
              <span class="conflict-resolver-desc">Jadwal pada jam yang sama dapat membuyarkan fokus. AI dapat menata ulang jam luang secara otomatis.</span>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm conflict-resolver-btn" id="btn-resolve-conflicts">
            ${getIcon("cpu", "", 14)} Selesaikan Bentrok
          </button>
        </div>
      `;
      }
      const sortedSchedules = [...schedules].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      const nowH = String(now.getHours()).padStart(2, "0");
      const nowM = String(now.getMinutes()).padStart(2, "0");
      const nowIndicatorHtml = `
      <div class="timeline-row timeline-now-row">
        <div class="timeline-time-col">
          <span class="timeline-now-badge tabular-nums font-mono">${nowH}:${nowM}</span>
        </div>
        <div class="timeline-rail-col">
          <div class="timeline-now-pulse-dot"></div>
        </div>
        <div class="timeline-card-col">
          <div class="timeline-now-line-wrap">
            <div class="timeline-now-line"></div>
            <span class="timeline-now-label">Sekarang</span>
          </div>
        </div>
      </div>
    `;
      let nowInserted = false;
      let itemsHtml = "";
      sortedSchedules.forEach((s) => {
        const timeVal = s.time || "00:00";
        const parts = timeVal.split(":").map(Number);
        const h = isNaN(parts[0]) ? 0 : parts[0];
        const m = isNaN(parts[1]) ? 0 : parts[1];
        const startMinutes = h * 60 + m;
        const endMinutes = startMinutes + (s.duration || 30);
        const endH = String(Math.floor(endMinutes % 1440 / 60)).padStart(2, "0");
        const endM = String(endMinutes % 60).padStart(2, "0");
        const timeSpanText = `${timeVal} \u2014 ${endH}:${endM}`;
        const isActive = isToday && !s.completed && s.date === todayStr && currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        if (isToday && !nowInserted && currentMinutes < startMinutes) {
          itemsHtml += nowIndicatorHtml;
          nowInserted = true;
        }
        let priorityBadgeHtml = "";
        if (s.priority === "high") {
          priorityBadgeHtml = '<span class="priority-badge priority-high">P1 \u2022 Tinggi</span>';
        } else if (s.priority === "low") {
          priorityBadgeHtml = '<span class="priority-badge priority-low">P3 \u2022 Rendah</span>';
        } else if (s.priority === "medium") {
          priorityBadgeHtml = '<span class="priority-badge priority-medium">P2 \u2022 Sedang</span>';
        }
        let deadlineBadgeHtml = "";
        if (s.deadline) {
          const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const dParts = s.deadline.split("-").map(Number);
          const deadDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
          if (!isNaN(deadDate.getTime())) {
            const dayDiff = Math.round((deadDate.getTime() - todayMidnight.getTime()) / (1e3 * 60 * 60 * 24));
            const dayName = deadDate.toLocaleDateString("id-ID", { weekday: "long" });
            if (dayDiff < 0) {
              deadlineBadgeHtml = `<span class="deadline-badge is-urgent">${getIcon("alert-triangle", "", 11)} Terlewat (${Math.abs(dayDiff)}h)</span>`;
            } else if (dayDiff === 0) {
              deadlineBadgeHtml = `<span class="deadline-badge is-urgent">${getIcon("alert-triangle", "", 11)} Tenggat: HARI INI</span>`;
            } else if (dayDiff === 1) {
              deadlineBadgeHtml = `<span class="deadline-badge is-urgent">${getIcon("clock", "", 11)} Tenggat: Besok</span>`;
            } else {
              deadlineBadgeHtml = `<span class="deadline-badge">${getIcon("clock", "", 11)} Tenggat: ${dayName} (${dayDiff} hari)</span>`;
            }
          }
        }
        let conflictBadgeHtml = "";
        if (conflicts.has(s.id)) {
          const cInfo = conflicts.get(s.id);
          conflictBadgeHtml = `<span class="deadline-badge is-urgent" style="border-color:rgba(239,68,68,0.4); background:rgba(239,68,68,0.12); color:var(--status-danger);" title="Jadwal bertabrakan ${cInfo.overlapMinutes} menit dengan '${escapeHtml(cInfo.otherTitle)}'">${getIcon("alert-triangle", "", 11)} Bentrok ${cInfo.overlapMinutes}m</span>`;
        }
        let recurrenceBadgeHtml = "";
        if (s.recurrence && s.recurrence !== "none") {
          const recLabels = {
            daily: "Tiap Hari",
            weekdays: "Hari Kerja",
            weekly: "Mingguan",
            monthly: "Bulanan"
          };
          const label = recLabels[s.recurrence] || "Berulang";
          recurrenceBadgeHtml = `<span class="recurrence-badge" title="Agenda berulang: ${label}">${getIcon("repeat", "", 11)} ${label}</span>`;
        }
        const catInfo = state.getCategoryByName(s.category);
        const catColor = catInfo.color || "#f97316";
        const catBadgeHtml = `<span class="schedule-category-badge" style="background-color:${catColor}18; color:${catColor}; border:1px solid ${catColor}38;">
        <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background-color:${catColor}; margin-right:4px; vertical-align:middle;"></span>${escapeHtml(s.category || "Kerja")}
      </span>`;
        const gcalUrl = generateGoogleCalendarUrl(s);
        itemsHtml += `
        <div class="timeline-row ${s.completed ? "completed" : ""} ${isActive ? "is-active" : ""} ${s.priority === "high" ? "priority-high-row" : ""} ${conflicts.has(s.id) ? "timeline-row-conflict" : ""}">
          <!-- Column 1: Time -->
          <div class="timeline-time-col">
            <span class="timeline-time-val tabular-nums">${s.time}</span>
          </div>

          <!-- Column 2: Rail & Dot -->
          <div class="timeline-rail-col">
            <div class="timeline-dot ${isActive ? "dot-active" : ""} ${s.completed ? "dot-completed" : ""}"></div>
            <div class="timeline-line"></div>
          </div>

          <!-- Column 3: Card Content (Click to edit) -->
          <div class="timeline-card-col">
            <div class="timeline-card" data-id="${s.id}" tabindex="0" role="button" aria-label="${escapeHtml(s.title)}, ${s.completed ? "selesai" : "belum selesai"}. Klik untuk mengubah">
              <div class="timeline-card-header">
                <button type="button" 
                        class="schedule-check-circle ${s.completed ? "is-checked" : ""}" 
                        data-action="toggle-complete" 
                        data-id="${s.id}" 
                        data-date="${s.date}"
                        title="${s.completed ? "Tandai belum selesai" : "Tandai selesai"}"
                        aria-label="${s.completed ? "Tandai belum selesai" : "Tandai selesai"}">
                  ${s.completed ? getIcon("check", "", 12) : ""}
                </button>

                <div class="timeline-card-main-info">
                  <div class="timeline-card-title">${escapeHtml(s.title)}</div>
                  ${s.description ? `<div class="timeline-card-desc" style="font-size:12px; color:var(--text-secondary); line-height:1.4;">${escapeHtml(s.description)}</div>` : ""}
                  <div class="timeline-badges-row">
                    ${catBadgeHtml}
                    ${priorityBadgeHtml}
                    ${recurrenceBadgeHtml}
                    ${deadlineBadgeHtml}
                    ${conflictBadgeHtml}
                  </div>
                </div>

                <div class="timeline-card-quick-actions">
                  <a href="${gcalUrl}" 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     class="card-icon-action" 
                     title="Ekspor ke Google Calendar" 
                     aria-label="Ekspor ke Google Calendar"
                     data-action="gcal">
                    ${getIcon("calendar", "", 13)}
                  </a>
                  <button type="button" 
                          class="card-icon-action text-danger" 
                          data-action="delete-schedule" 
                          data-id="${s.id}" 
                          title="Hapus Agenda" 
                          aria-label="Hapus Agenda">
                    ${getIcon("trash", "", 13)}
                  </button>
                </div>
              </div>

              <div class="timeline-card-footer">
                <div class="timeline-duration-tag">
                  ${getIcon("clock", "", 12)}
                  <span class="tabular-nums">${timeSpanText} (${s.duration} min)</span>
                  ${isActive ? '<span class="status-live-tag">Aktif</span>' : ""}
                </div>
                <span class="card-edit-hint">Ketuk untuk edit</span>
              </div>
            </div>
          </div>
        </div>
      `;
      });
      if (isToday && !nowInserted) {
        itemsHtml += nowIndicatorHtml;
        nowInserted = true;
      }
      containerEl.innerHTML = conflictBannerHtml + itemsHtml;
      renderIcons(containerEl);
      const resolveBtn = containerEl.querySelector("#btn-resolve-conflicts");
      if (resolveBtn) {
        resolveBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          springBounce(resolveBtn);
          this.handleResolveConflicts(conflicts, schedules, targetDate);
        });
      }
    },
    async handleResolveConflicts(conflicts, schedules, targetDate) {
      if (!GeminiService.isAiReady()) {
        notifications.showToast("Layanan AI belum siap. Hubungkan AI Gateway atau masukkan API Key di Pengaturan.", "warning", 5e3);
        return;
      }
      const btn = document.getElementById("btn-resolve-conflicts");
      const origHtml = btn ? btn.innerHTML : "";
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> Menata ulang...`;
      }
      try {
        const solutions = await GeminiService.resolveScheduleConflicts(conflicts, schedules, targetDate);
        if (!solutions || solutions.length === 0) {
          notifications.showToast("Tidak ada rekomendasi pergeseran jadwal yang diperlukan.", "info", 4e3);
          return;
        }
        this.openConflictResolverModal(solutions);
      } catch (err) {
        notifications.showToast(`Gagal merapikan bentrok: ${err.message}`, "error", 6e3);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = origHtml;
          renderIcons(btn);
        }
      }
    },
    openConflictResolverModal(solutions) {
      const modal = document.getElementById("modal-conflict-resolver");
      const listEl = document.getElementById("conflict-solutions-list");
      if (!modal || !listEl) return;
      let html = "";
      solutions.forEach((sol) => {
        html += `
        <div class="conflict-solution-card">
          <div class="conflict-solution-header">
            <span class="conflict-solution-title">${escapeHtml(sol.title || "Kegiatan")}</span>
            <div class="conflict-solution-times">
              <span class="conflict-old-time tabular-nums">${escapeHtml(sol.oldTime || "--:--")}</span>
              <span class="conflict-arrow-icon">${getIcon("chevron-right", "", 12)}</span>
              <span class="conflict-new-time tabular-nums font-mono font-bold">${escapeHtml(sol.newTime || "--:--")}</span>
            </div>
          </div>
          ${sol.reason ? `<div class="conflict-solution-reason">${escapeHtml(sol.reason)}</div>` : ""}
        </div>
      `;
      });
      listEl.innerHTML = html;
      renderIcons(modal);
      const applyBtn = document.getElementById("btn-apply-conflict-solutions");
      if (applyBtn) {
        applyBtn.onclick = () => {
          let appliedCount = 0;
          solutions.forEach((sol) => {
            if (sol.id && sol.newTime) {
              state.updateSchedule(sol.id, { time: sol.newTime });
              appliedCount++;
            }
          });
          window.dayflowApp.closeAllModals();
          notifications.playChime("crystal");
          notifications.showToast(`${appliedCount} jadwal berhasil disesuaikan tanpa tabrakan.`, "success", 5e3);
        };
      }
      modal.classList.add("open");
    },
    showUndoCompletionToast(scheduleId, targetDate, title) {
      const existing = document.getElementById("df-undo-toast");
      if (existing) existing.remove();
      const toast = document.createElement("div");
      toast.id = "df-undo-toast";
      toast.className = "undo-toast";
      toast.innerHTML = `
      <div class="undo-toast-content">
        <span class="undo-toast-icon">${getIcon("check", "", 14)}</span>
        <span class="undo-toast-text">Selesai: <strong>${escapeHtml(title || "Kegiatan")}</strong></span>
      </div>
      <button type="button" class="btn btn-ghost btn-xs undo-toast-btn" id="btn-undo-schedule-complete">
        ${getIcon("undo-2", "", 13)}
        Urungkan
      </button>
    `;
      document.body.appendChild(toast);
      renderIcons(toast);
      requestAnimationFrame(() => {
        toast.classList.add("is-visible");
      });
      let cleared = false;
      const dismissTimer = setTimeout(() => {
        if (!cleared) {
          cleared = true;
          toast.classList.remove("is-visible");
          setTimeout(() => toast.remove(), 250);
        }
      }, 5e3);
      const undoBtn = toast.querySelector("#btn-undo-schedule-complete");
      if (undoBtn) {
        undoBtn.addEventListener("click", () => {
          if (!cleared) {
            cleared = true;
            clearTimeout(dismissTimer);
            toast.classList.remove("is-visible");
            setTimeout(() => toast.remove(), 250);
            state.toggleScheduleComplete(scheduleId, targetDate);
            notifications.showToast("Penyelesaian agenda berhasil diurungkan.", "info", 3e3);
          }
        });
      }
    },
    setupSwipeNavigation(element) {
      if (!element || element._hasSwipe) return;
      element._hasSwipe = true;
      let startX = 0;
      let startY = 0;
      let startTime = 0;
      element.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      }, { passive: true });
      element.addEventListener("touchend", (e) => {
        if (e.changedTouches.length !== 1) return;
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const elapsed = Date.now() - startTime;
        if (elapsed < 500 && Math.abs(deltaX) > 60 && Math.abs(deltaY) < 50) {
          if (deltaX < 0) {
            this.advanceScheduleDate(1);
          } else {
            this.advanceScheduleDate(-1);
          }
        }
      }, { passive: true });
    },
    advanceScheduleDate(delta) {
      const cur = /* @__PURE__ */ new Date((this.selectedScheduleDate || getLocalDateString()) + "T00:00:00");
      cur.setDate(cur.getDate() + delta);
      this.selectedScheduleDate = getLocalDateString(cur);
      const dateInput = document.getElementById("schedule-date-filter");
      if (dateInput) dateInput.value = this.selectedScheduleDate;
      this.renderScheduleView();
    }
  };

  // js/views/ai-plan-view.js
  var aiPlanViewMethods = {
    // --- Extract schedule items from raw text (e.g. AI chat replies or offline parsing) ---
    extractSchedulesFromText(text, targetDate = null) {
      if (!text || typeof text !== "string") return [];
      const today = getLocalDateString();
      const tomorrowObj = /* @__PURE__ */ new Date();
      tomorrowObj.setDate(tomorrowObj.getDate() + 1);
      const tomorrowStr = getLocalDateString(tomorrowObj);
      const lusaObj = /* @__PURE__ */ new Date();
      lusaObj.setDate(lusaObj.getDate() + 2);
      const lusaStr = getLocalDateString(lusaObj);
      const rawChunks = text.split(/\n|(?:\r\n)|\b(?:terus|kemudian|lalu)\s+(?:jam|pukul)\b|;/i).map((c) => c.trim()).filter(Boolean);
      const items = [];
      const deadlineKeywords = /\b(?:deadline|tenggat|paling\s+lambat|harus\s+kumpul|kumpul(?:kan)?(?:\s+tugas)?|submit|due\s+date|maksimal|harus\s+kelar|harus\s+selesai|pengumpulan)\b/i;
      let currentContextDate = targetDate || today;
      for (let chunk of rawChunks) {
        if (!chunk || chunk.length < 3) continue;
        if (/^\s*(?:\[|\{|\}|\]|"[^"]+"\s*:|,\s*$)/.test(chunk)) continue;
        const dayHeaderMatch = chunk.match(/^\s*(?:\d+[\s.)-]+\s*)?(?:jadwal\s+)?(?:hari\s+)?(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)\s*[:\-]?\s*$/i);
        if (dayHeaderMatch) {
          const dayMap = { "minggu": 0, "senin": 1, "selasa": 2, "rabu": 3, "kamis": 4, "jumat": 5, "jum'at": 5, "sabtu": 6 };
          const dayIdx = dayMap[dayHeaderMatch[1].toLowerCase()];
          if (dayIdx !== void 0) {
            const nowObj = /* @__PURE__ */ new Date();
            let diff = dayIdx - nowObj.getDay();
            const isNextWeek = /\b(?:minggu\s+depan|depan)\b/i.test(chunk);
            if (diff < 0) diff += 7;
            if (isNextWeek && diff === 0) diff += 7;
            const targetDay = new Date(nowObj);
            targetDay.setDate(targetDay.getDate() + diff);
            currentContextDate = getLocalDateString(targetDay);
            continue;
          }
        }
        let itemDate = currentContextDate;
        const lower = chunk.toLowerCase();
        const indMonths = {
          januari: "01",
          jan: "01",
          februari: "02",
          feb: "02",
          maret: "03",
          mar: "03",
          april: "04",
          apr: "04",
          mei: "05",
          juni: "06",
          jun: "06",
          juli: "07",
          jul: "07",
          agustus: "08",
          agu: "08",
          ags: "08",
          september: "09",
          sep: "09",
          oktober: "10",
          okt: "10",
          november: "11",
          nov: "11",
          desember: "12",
          des: "12"
        };
        const explicitDateMatch = chunk.match(/\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|ags|sep|okt|nov|des)(?:\s+(\d{4}))?\b/i);
        if (explicitDateMatch) {
          const d = explicitDateMatch[1].padStart(2, "0");
          const m = indMonths[explicitDateMatch[2].toLowerCase()] || "01";
          const y = explicitDateMatch[3] || (/* @__PURE__ */ new Date()).getFullYear();
          itemDate = `${y}-${m}-${d}`;
        } else {
          const isTomorrow = /\bbesok\b|\besok\b/.test(lower) && !/\bhari ini\b/.test(lower);
          const isLusa = /\blusa\b/.test(lower);
          if (isLusa) {
            itemDate = lusaStr;
          } else if (isTomorrow) {
            itemDate = tomorrowStr;
          } else {
            const dayMap = { "minggu": 0, "senin": 1, "selasa": 2, "rabu": 3, "kamis": 4, "jumat": 5, "jum'at": 5, "sabtu": 6 };
            for (const [dayName, dayIdx] of Object.entries(dayMap)) {
              if (new RegExp(`\\b(?:hari\\s+)?${dayName}\\b`, "i").test(lower)) {
                const nowObj = /* @__PURE__ */ new Date();
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
        const hasMalam = /\bmalam\b/.test(lower);
        const hasSore = /\bsore\b/.test(lower);
        const hasSiang = /\bsiang\b/.test(lower);
        const hasPagi = /\bpagi\b|\bsubuh\b/.test(lower);
        let startTime = "09:00";
        let duration = 30;
        let matchedTime = false;
        const rangeMatch = chunk.match(/(?:(?:pukul|jam)\s*)?([01]?\d|2[0-3])[:.]([0-5]\d)(?:\s*(?:-|sampai|sd|s\/d|—|hingga)\s*(?:([01]?\d|2[0-3])[:.]([0-5]\d)|selesai|finish|done|tuntas))/i);
        if (rangeMatch) {
          const startH = String(parseInt(rangeMatch[1], 10)).padStart(2, "0");
          const startM = String(parseInt(rangeMatch[2], 10)).padStart(2, "0");
          startTime = `${startH}:${startM}`;
          if (rangeMatch[3] && rangeMatch[4]) {
            const endH = parseInt(rangeMatch[3], 10);
            const endM = parseInt(rangeMatch[4], 10);
            const diffMinutes = endH * 60 + endM - (parseInt(startH, 10) * 60 + parseInt(startM, 10));
            if (diffMinutes > 0 && diffMinutes <= 720) {
              duration = diffMinutes;
            }
          } else {
            duration = 120;
          }
          matchedTime = true;
        }
        if (!matchedTime) {
          const hourSelesaiMatch = chunk.match(/(?:(?:pukul|jam)\s*)(\d{1,2})(?:\s*(?:-|sampai|sd|s\/d|—|hingga)\s*(?:selesai|finish|done|tuntas))/i);
          if (hourSelesaiMatch) {
            let h = parseInt(hourSelesaiMatch[1], 10);
            if (hasSore && h < 12) h += 12;
            if (hasMalam && h < 12 && h > 4) h += 12;
            if (hasSiang && h >= 1 && h <= 5) h += 12;
            startTime = `${String(Math.min(23, Math.max(0, h))).padStart(2, "0")}:00`;
            duration = 120;
            matchedTime = true;
          }
        }
        if (!matchedTime) {
          const indPeriodMatch = chunk.match(/(?:pukul|jam)\s*(\d{1,2})(?:[:.](\d{2}))?(?:\s*(pagi|siang|sore|malam))?/i);
          if (indPeriodMatch) {
            let h = parseInt(indPeriodMatch[1], 10);
            const m = indPeriodMatch[2] ? parseInt(indPeriodMatch[2], 10) : 0;
            const period = (indPeriodMatch[3] || "").toLowerCase();
            if ((period === "sore" || !period && hasSore) && h < 12) h += 12;
            if ((period === "malam" || !period && hasMalam) && h < 12) {
              if (h > 4) h += 12;
            }
            if ((period === "siang" || !period && hasSiang) && h >= 1 && h <= 5) h += 12;
            if ((period === "pagi" || !period && hasPagi) && h === 12) h = 0;
            startTime = `${String(Math.min(23, Math.max(0, h))).padStart(2, "0")}:${String(Math.min(59, Math.max(0, m))).padStart(2, "0")}`;
            matchedTime = true;
          }
        }
        if (!matchedTime) {
          const stdMatch = chunk.match(/([01]?\d|2[0-3])[:.]([0-5]\d)/);
          if (stdMatch) {
            startTime = `${String(parseInt(stdMatch[1], 10)).padStart(2, "0")}:${stdMatch[2]}`;
            matchedTime = true;
          }
        }
        const durMatch = chunk.match(/\b(\d+)\s*(?:menit|mins?|m)\b/i);
        if (durMatch) {
          duration = parseInt(durMatch[1], 10);
        } else {
          const jamMatch = chunk.match(/\b(\d+)\s*(?:jam|hours?|h)\b/i);
          if (jamMatch) {
            duration = parseInt(jamMatch[1], 10) * 60;
          }
        }
        const isDeadline = deadlineKeywords.test(chunk);
        let deadlineDate = null;
        let priority = "medium";
        if (isDeadline) {
          deadlineDate = itemDate;
          priority = "high";
        }
        if (!matchedTime && !isDeadline) {
          continue;
        }
        let recurrence = "none";
        if (/\b(?:setiap\s+hari|tiap\s+hari|rutin\s+harian|sehari-hari|tiap\s+pagi|setiap\s+pagi|tiap\s+sore|setiap\s+sore|tiap\s+malam|setiap\s+malam)\b/i.test(chunk)) {
          recurrence = "daily";
        } else if (/\b(?:hari\s+kerja|senin\s*(?:sampai|sd|s\/d|-)\s*jumat|senin\s*-\s*jum'at)\b/i.test(chunk)) {
          recurrence = "weekdays";
        } else if (/\b(?:setiap\s+minggu|tiap\s+minggu|seminggu\s+sekali|setiap\s+(?:senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)|tiap\s+(?:senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu))\b/i.test(chunk)) {
          recurrence = "weekly";
        } else if (/\b(?:setiap\s+bulan|tiap\s+bulan|sebulan\s+sekali|tiap\s+tanggal|setiap\s+tanggal)\b/i.test(chunk)) {
          recurrence = "monthly";
        }
        let description = "";
        const locMatch = chunk.match(/(?:📍|\blengkap\s+di\b|\blokasi\s*[:\-]?\s*|\btempat\s*[:\-]?\s*|\bruang(?:an)?\s*[:\-]?\s*|\bgedung\s*[:\-]?\s*|\blantai\s*[:\-]?\s*)([^,;|\n]+)/i);
        if (locMatch) {
          description = locMatch[0].trim();
        } else if (/selesai|tuntas|done/i.test(chunk)) {
          description = "Berlangsung s/d selesai";
        }
        let title = chunk;
        if (title.includes("|")) {
          const pipeParts = title.split("|").map((p) => p.trim()).filter(Boolean);
          if (pipeParts.length > 0) {
            title = pipeParts[0];
            if (pipeParts.length >= 3 && !description) {
              description = pipeParts[2];
            }
          }
        }
        title = title.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu, " ");
        title = title.replace(/^[\s\t*•-]+/, "").replace(/^\d+[\s.)-]+\s*/, "");
        title = title.replace(/(?:(?:pukul|jam)\s*)?[012]?\d[:.][0-5]\d(?:\s*(?:-|sampai|sd|s\/d|—|hingga)\s*(?:[012]?\d[:.][0-5]\d|selesai|finish|done|tuntas))?/gi, " ");
        title = title.replace(/(?:pukul|jam)\s*\d{1,2}(?:\s*(?:-|sampai|sd|s\/d|—|hingga)\s*(?:selesai|finish|done|tuntas))?/gi, " ");
        title = title.replace(/(?:pukul|jam)\s*\d{1,2}(?:\s*(?:pagi|siang|sore|malam))?/gi, " ");
        title = title.replace(/(?:-|sampai|sd|s\/d|—|hingga)\s*(?:selesai|finish|done|tuntas)/gi, " ");
        title = title.replace(/\b(?:selesai|finish|done|tuntas)\b/gi, " ");
        title = title.replace(/\b\d+\s*(?:menit|mins?|jam|hours?)\b/gi, " ");
        title = title.replace(/\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|ags|sep|okt|nov|des)(?:\s+(\d{4}))?\b/gi, " ");
        title = title.replace(/\b(?:izin\s+mengingatkan(?:\s+jadwal)?|mengingatkan|jadwal(?:\s+mata\s+kuliah)?|mata\s+kuliah|matkul)\b/gi, " ");
        title = title.replace(/\b(?:tolong(?:\s+dong)?|ingetin(?:\s+aku)?|ingatkan(?:\s+aku)?|jangan\s+lupa(?:\s+ya)?|pliss?|please|aku\s+mau|mau|rencananya|nanti(?:\s+malam|\s+siang|\s+sore)?|harus\s+banget|harus|wajib|kudu|kayaknya|paling\s+lambat|paling\s+lama|deadline(?:\s+nya)?|tenggat(?:\s+waktu)?)\b/gi, " ");
        title = title.replace(/\b(?:setiap|tiap)\s+(?:hari|pagi|siang|sore|malam|minggu|bulan|senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)\b/gi, " ");
        title = title.replace(/\b(?:rutin\s+harian|sehari-hari|seminggu\s+sekali|sebulan\s+sekali|hari\s+kerja)\b/gi, " ");
        title = title.replace(/\b(?:besok(?:\s+pagi|\s+siang|\s+sore|\s+malam)?|lusa|hari\s+ini|semalam)\b/gi, "");
        title = title.replace(/\b(?:hari\s+)?(?:senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)\b/gi, "");
        if (description) {
          title = title.replace(new RegExp(description.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi"), " ");
        }
        title = title.replace(/\b(?:ya|yah|dong|deh|nih|sih|pliss?|please|oke|ok|gas|gasken)\b/gi, "");
        title = title.replace(/\((?:[^)]*)\)/g, "").replace(/\[(?:[^\]]*)\]/g, "");
        title = title.replace(/[|:\-–—.,;!?"]+/g, " ").replace(/\s+/g, " ").trim();
        if (!title || /^["'\s]*(?:null|time|undefined|date|duration|category|recurrence|deadline|priority|description|notes)["'\s]*$/i.test(title) || title === "Null" || title.length < 2) {
          continue;
        }
        title = title.split(" ").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        let category = isDeadline ? "Kerja" : "Fokus";
        if (/kesehatan|olahraga|jogging|lari|gym|sehat|tidur|istirahat|meditasi/i.test(chunk)) category = "Kesehatan";
        else if (/kerja|kantor|meeting|rapat|proyek|klien|tugas|evaluasi|koding|coding|skripsi|laporan|magang|revisi|kuliah|matkul|ddp|kampus|dosen|kalkulus|literasi|pancasila|filsafat|pemrograman|akidah|informatika/i.test(chunk)) category = "Fokus";
        else if (/pribadi|makan|sarapan|santai|keluarga|hobi|belanja|jalan|nonton|film|bioskop/i.test(chunk)) category = "Pribadi";
        items.push({
          title,
          description,
          date: itemDate,
          time: startTime,
          duration: Math.max(5, duration),
          category,
          deadline: deadlineDate,
          priority,
          reminder: true,
          recurrence
        });
      }
      return items;
    },
    // --- Extract schedule items from Gemini Assistant Message ---
    extractSchedulesFromAssistantMessage(rawText) {
      if (!rawText || typeof rawText !== "string") {
        return { cleanText: "", schedules: [] };
      }
      let cleanText = rawText;
      let schedules = [];
      const hasTagStart = /\[DAYFLOW_SCHEDULES\]/i.test(rawText);
      if (hasTagStart) {
        let jsonPart = "";
        const closedMatch = rawText.match(/\[DAYFLOW_SCHEDULES\]([\s\S]*?)\[\/DAYFLOW_SCHEDULES\]/i);
        if (closedMatch) {
          jsonPart = closedMatch[1];
          cleanText = rawText.replace(/\[DAYFLOW_SCHEDULES\][\s\S]*?\[\/DAYFLOW_SCHEDULES\]/gi, "").trim();
        } else {
          const parts = rawText.split(/\[DAYFLOW_SCHEDULES\]/i);
          cleanText = (parts[0] || "").trim();
          jsonPart = parts[1] || "";
        }
        jsonPart = jsonPart.replace(/```json/gi, "").replace(/```/g, "").trim();
        let parsed = null;
        try {
          parsed = JSON.parse(jsonPart);
        } catch (e1) {
          try {
            let trimmed = jsonPart.replace(/,\s*$/, "").trim();
            if (trimmed.startsWith("[") && !trimmed.endsWith("]")) {
              parsed = JSON.parse(trimmed + "]");
            }
          } catch (e2) {
          }
        }
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
                    time: timeM ? timeM[1] : "09:00",
                    duration: durM ? parseInt(durM[1], 10) : 30,
                    description: descM ? descM[1] : "",
                    recurrence: recM ? recM[1] : "none",
                    category: catM ? catM[1] : "Fokus"
                  });
                }
              } catch (e4) {
              }
            }
          }
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const categories = state.getCategories();
          const todayDate = getLocalDateString();
          schedules = parsed.map((item) => {
            if (!item || typeof item !== "object") return null;
            let rawTitle = String(item.title || item.kegiatan || "").trim();
            if (/^["'\s]*(?:null|time|undefined|date|duration|category|recurrence|deadline|priority|description|notes)["'\s]*$/i.test(rawTitle) || rawTitle === '"" Null' || rawTitle === '" " Null' || rawTitle === "Null" || rawTitle === '"time" " "' || rawTitle.length < 2) {
              return null;
            }
            let safeDesc = String(item.description || item.deskripsi || item.notes || item.catatan || "").trim();
            if (rawTitle.includes("|")) {
              const parts = rawTitle.split("|").map((p) => p.trim()).filter(Boolean);
              rawTitle = parts[0] || "Kegiatan Baru";
              if (parts.length > 1 && !safeDesc) {
                safeDesc = parts.slice(1).join(" - ");
              }
            }
            const rawCat = (item.category || item.kategori || "Kerja").trim();
            const foundCat = categories.find((c) => c.name.toLowerCase() === rawCat.toLowerCase());
            const finalCat = foundCat ? foundCat.name : ["Kerja", "Fokus", "Pribadi", "Kesehatan"].includes(rawCat) ? rawCat : "Kerja";
            const rawRec = String(item.recurrence || item.perulangan || "").toLowerCase().trim();
            const validRec = ["none", "daily", "weekdays", "weekly", "monthly"];
            const finalRec = validRec.includes(rawRec) ? rawRec : "none";
            let cleanDeadline = null;
            if (item.deadline && typeof item.deadline === "string" && item.deadline.trim() && item.deadline !== "null") {
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
              priority: ["high", "medium", "low"].includes(item.priority) ? item.priority : cleanDeadline ? "high" : "medium",
              reminder: item.reminder !== false
            };
          }).filter(Boolean);
        }
      } else {
        const fallbackItems = this.extractSchedulesFromText(rawText);
        if (fallbackItems && fallbackItems.length > 0) {
          const hasExplicitTime = fallbackItems.some((item) => item.time !== "09:00" || item.duration !== 30);
          if (hasExplicitTime) {
            schedules = fallbackItems;
          }
        }
      }
      return { cleanText, schedules };
    },
    // --- Extract note items from Gemini Assistant Message ---
    extractNotesFromAssistantMessage(rawText) {
      if (!rawText || typeof rawText !== "string") {
        return { cleanText: "", note: null };
      }
      let cleanText = rawText;
      let note = null;
      const tagMatch = rawText.match(/\[DAYFLOW_NOTE\]([\s\S]*?)\[\/DAYFLOW_NOTE\]/i);
      if (tagMatch) {
        let block = tagMatch[1].trim();
        block = block.replace(/```json/gi, "").replace(/```/g, "").trim();
        try {
          const parsed = JSON.parse(block);
          if (parsed && typeof parsed === "object") {
            note = {
              title: String(parsed.title || parsed.judul || "Catatan Baru").trim(),
              content: String(parsed.content || parsed.isi || parsed.notes || "").trim()
            };
          }
        } catch (err1) {
          try {
            const titleMatch = block.match(/"(?:title|judul)"\s*:\s*"([^"]+)"/i);
            const contentMatch = block.match(/"(?:content|isi|notes)"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"|\n\s*})/i) || block.match(/"(?:content|isi|notes)"\s*:\s*"([\s\S]*?)"/i);
            if (titleMatch || contentMatch) {
              note = {
                title: titleMatch ? titleMatch[1].trim() : "Catatan Baru",
                content: contentMatch ? contentMatch[1].trim() : ""
              };
            }
          } catch (err2) {
            console.warn("Failed parsing [DAYFLOW_NOTE] tag:", err2);
          }
        }
        cleanText = rawText.replace(/\[DAYFLOW_NOTE\][\s\S]*?\[\/DAYFLOW_NOTE\]/gi, "").trim();
      }
      return { cleanText, note };
    },
    // --- Multimodal Attachment Handlers (Image, PDF, Text, CSV) ---
    currentAttachment: null,
    handleFileSelect(file) {
      if (!file) return Promise.resolve(null);
      const previewContainer = document.getElementById("chat-attachment-preview");
      const previewImg = document.getElementById("attachment-preview-img");
      const previewDoc = document.getElementById("attachment-preview-doc");
      const fileNameEl = document.getElementById("attachment-file-name");
      const fileSizeEl = document.getElementById("attachment-file-size");
      const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
      };
      return new Promise((resolve, reject) => {
        try {
          const isImage = file.type.startsWith("image/");
          const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
          const isText = file.type.startsWith("text/") || /\.(txt|csv|md|json|ics)$/i.test(file.name);
          if (!isImage && !isPdf && !isText) {
            notifications.showToast("Format berkas tidak didukung. Harap pilih gambar (JPG/PNG), PDF, atau berkas teks/CSV.", "warning");
            return resolve(null);
          }
          if (isImage) {
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
                    height = Math.round(height * maxDim / width);
                    width = maxDim;
                  } else {
                    width = Math.round(width * maxDim / height);
                    height = maxDim;
                  }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                const compressedUrl = canvas.toDataURL("image/jpeg", 0.84);
                const thumbCanvas = document.createElement("canvas");
                const thumbMax = 180;
                let tW = img.width;
                let tH = img.height;
                if (tW > tH && tW > thumbMax) {
                  tH = Math.round(tH * thumbMax / tW);
                  tW = thumbMax;
                } else if (tH > thumbMax) {
                  tW = Math.round(tW * thumbMax / tH);
                  tH = thumbMax;
                }
                thumbCanvas.width = tW;
                thumbCanvas.height = tH;
                thumbCanvas.getContext("2d").drawImage(img, 0, 0, tW, tH);
                const thumbUrl = thumbCanvas.toDataURL("image/jpeg", 0.6);
                const b64 = compressedUrl.split(",")[1];
                this.currentAttachment = {
                  name: file.name || "foto.jpg",
                  type: "image",
                  mimeType: "image/jpeg",
                  size: file.size,
                  base64: b64,
                  thumbUrl,
                  isImage: true,
                  isDoc: false
                };
                if (previewImg) {
                  previewImg.src = thumbUrl;
                  previewImg.classList.remove("hidden");
                }
                if (previewDoc) previewDoc.classList.add("hidden");
                if (fileSizeEl) fileSizeEl.textContent = formatSize(file.size);
                if (previewContainer) previewContainer.classList.remove("hidden");
                notifications.showToast(`Gambar "${file.name}" terlampir. Siap dianalisis!`, "info", 2500);
                resolve(this.currentAttachment);
              };
              img.onerror = (err) => reject(err);
              img.src = rawDataUrl;
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          } else if (isPdf) {
            if (file.size > 10 * 1024 * 1024) {
              notifications.showToast("Ukuran berkas PDF maksimal 10MB.", "warning");
              return resolve(null);
            }
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target.result;
              const b64 = dataUrl.split(",")[1];
              this.currentAttachment = {
                name: file.name || "dokumen.pdf",
                type: "pdf",
                mimeType: "application/pdf",
                size: file.size,
                base64: b64,
                thumbUrl: "",
                isImage: false,
                isDoc: true
              };
              if (previewImg) previewImg.classList.add("hidden");
              if (previewDoc) {
                previewDoc.classList.remove("hidden");
                if (fileNameEl) fileNameEl.textContent = file.name;
              }
              if (fileSizeEl) fileSizeEl.textContent = formatSize(file.size);
              if (previewContainer) previewContainer.classList.remove("hidden");
              notifications.showToast(`Dokumen PDF "${file.name}" terlampir.`, "info", 2500);
              resolve(this.currentAttachment);
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          } else {
            if (file.size > 1024 * 1024) {
              notifications.showToast("Ukuran berkas teks maksimal 1MB.", "warning");
              return resolve(null);
            }
            const reader = new FileReader();
            reader.onload = (e) => {
              const text = e.target.result;
              this.currentAttachment = {
                name: file.name || "dokumen.txt",
                type: "text",
                mimeType: file.type || "text/plain",
                size: file.size,
                textContent: text,
                base64: null,
                thumbUrl: "",
                isImage: false,
                isDoc: true
              };
              if (previewImg) previewImg.classList.add("hidden");
              if (previewDoc) {
                previewDoc.classList.remove("hidden");
                if (fileNameEl) fileNameEl.textContent = file.name;
              }
              if (fileSizeEl) fileSizeEl.textContent = formatSize(file.size);
              if (previewContainer) previewContainer.classList.remove("hidden");
              notifications.showToast(`Berkas "${file.name}" terlampir.`, "info", 2500);
              resolve(this.currentAttachment);
            };
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
          }
        } catch (err) {
          console.error("Error attaching file:", err);
          notifications.showToast("Gagal memproses lampiran: " + err.message, "error");
          resolve(null);
        }
      });
    },
    clearCurrentAttachment() {
      this.currentAttachment = null;
      const previewContainer = document.getElementById("chat-attachment-preview");
      if (previewContainer) previewContainer.classList.add("hidden");
      const fileInput = document.getElementById("chat-file-input");
      if (fileInput) fileInput.value = "";
    },
    initChatAttachments() {
      const attachBtn = document.getElementById("btn-chat-attach-file");
      const fileInput = document.getElementById("chat-file-input");
      const cancelBtn = document.getElementById("btn-cancel-attachment");
      const chatInput = document.getElementById("chat-input");
      const chatHistory = document.getElementById("chat-history");
      if (attachBtn && fileInput && !attachBtn._hasAttachHandler) {
        attachBtn._hasAttachHandler = true;
        attachBtn.addEventListener("click", () => {
          fileInput.click();
        });
        fileInput.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            this.handleFileSelect(file);
          }
        });
      }
      if (cancelBtn && !cancelBtn._hasCancelHandler) {
        cancelBtn._hasCancelHandler = true;
        cancelBtn.addEventListener("click", () => {
          this.clearCurrentAttachment();
        });
      }
      if (chatInput && !chatInput._hasPasteHandler) {
        chatInput._hasPasteHandler = true;
        chatInput.addEventListener("paste", (e) => {
          const clipboardItems = e.clipboardData && e.clipboardData.items;
          if (!clipboardItems) return;
          for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.type.indexOf("image") !== -1) {
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
      const dropZones = [chatHistory, document.getElementById("chat-form")].filter(Boolean);
      dropZones.forEach((zone) => {
        if (zone && !zone._hasDragHandler) {
          zone._hasDragHandler = true;
          zone.addEventListener("dragover", (e) => {
            e.preventDefault();
            zone.style.outline = "2px dashed var(--accent-primary)";
            zone.style.outlineOffset = "-4px";
          });
          zone.addEventListener("dragleave", (e) => {
            e.preventDefault();
            zone.style.outline = "none";
          });
          zone.addEventListener("drop", (e) => {
            e.preventDefault();
            zone.style.outline = "none";
            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) {
              this.handleFileSelect(file);
            }
          });
        }
      });
      if (chatInput && !chatInput._hasFocusScrollHandler) {
        chatInput._hasFocusScrollHandler = true;
        chatInput.addEventListener("focus", () => {
          setTimeout(() => {
            const ch = document.getElementById("chat-history");
            if (ch) ch.scrollTop = ch.scrollHeight;
          }, 150);
        });
      }
      if (window.visualViewport && !window._hasVisualViewportChatHandler) {
        window._hasVisualViewportChatHandler = true;
        window.visualViewport.addEventListener("resize", () => {
          if (document.body.classList.contains("tab-ai-plan")) {
            const ch = document.getElementById("chat-history");
            if (ch) ch.scrollTop = ch.scrollHeight;
          }
        });
      }
    },
    setupChatDelegation(containerEl) {
      if (!containerEl || containerEl._hasChatDelegation) return;
      containerEl._hasChatDelegation = true;
      containerEl.addEventListener("click", (e) => {
        const target = e.target;
        if (!target) return;
        const saveBtn = target.closest('[data-action="save-chat-card"]');
        if (saveBtn) {
          e.stopPropagation();
          const msgId = saveBtn.getAttribute("data-msg-id");
          const rawJson = saveBtn.getAttribute("data-schedules");
          if (!rawJson) return;
          try {
            const items = JSON.parse(decodeURIComponent(rawJson));
            if (Array.isArray(items) && items.length > 0) {
              const added = state.addSchedules(items);
              state.updateChatMessage(msgId, { savedSchedules: true });
              particleBurst(saveBtn, "var(--status-success)");
              springBounce(saveBtn);
              notifications.playChime();
              notifications.showToast(`${added.length} agenda berhasil dimasukkan ke jadwal!`, "success");
              this.renderAiPlanView();
            }
          } catch (err) {
            console.error("Error saving chat schedules:", err);
            notifications.showToast("Gagal menyimpan jadwal.", "warning");
          }
          return;
        }
        const saveNoteBtn = target.closest('[data-action="save-chat-note"]');
        if (saveNoteBtn) {
          e.stopPropagation();
          const msgId = saveNoteBtn.getAttribute("data-msg-id");
          const rawTitle = saveNoteBtn.getAttribute("data-note-title");
          const rawContent = saveNoteBtn.getAttribute("data-note-content");
          if (!rawTitle && !rawContent) return;
          try {
            const title = decodeURIComponent(rawTitle || "Catatan AI");
            const content = decodeURIComponent(rawContent || "");
            state.addNote(title, content);
            state.updateChatMessage(msgId, { savedNote: true });
            particleBurst(saveNoteBtn, "var(--status-success)");
            springBounce(saveNoteBtn);
            notifications.playChime();
            notifications.showToast("Catatan berhasil disimpan ke Catatan & Memo!", "success");
            this.renderAiPlanView();
          } catch (err) {
            console.error("Error saving chat note:", err);
            notifications.showToast("Gagal menyimpan catatan.", "warning");
          }
          return;
        }
        const viewBtn = target.closest('[data-action="view-chat-date"]');
        if (viewBtn) {
          e.stopPropagation();
          const date = viewBtn.getAttribute("data-date") || getLocalDateString();
          this.selectedScheduleDate = date;
          this.selectedCategory = "all";
          this.switchTab("schedule");
          return;
        }
      });
    },
    // --- 3. AI Plan View ---
    renderAiPlanView() {
      this.initChatAttachments();
      const chatHistoryEl = document.getElementById("chat-history");
      if (chatHistoryEl) {
        this.setupChatDelegation(chatHistoryEl);
        const history = state.getChatHistory();
        chatHistoryEl.innerHTML = history.map((msg, idx) => {
          if (msg.role === "user") {
            let attachmentHtml = "";
            if (msg.attachment) {
              if (msg.attachment.isImage && msg.attachment.thumbUrl) {
                attachmentHtml = `
                <div class="chat-bubble-attachment">
                  <img src="${msg.attachment.thumbUrl}" class="chat-attachment-img" alt="${escapeHtml(msg.attachment.name || "Foto")}">
                </div>
              `;
              } else if (msg.attachment.isDoc) {
                attachmentHtml = `
                <div class="chat-bubble-attachment">
                  <div class="chat-attachment-pill">
                    <span data-icon="file" data-icon-size="14"></span>
                    <span>${escapeHtml(msg.attachment.name || "Dokumen")}</span>
                  </div>
                </div>
              `;
              }
            }
            return `
            <div class="chat-bubble chat-bubble-user">
              ${attachmentHtml}
              <div class="chat-bubble-content">${formatMarkdown(msg.text || "")}</div>
              <div class="chat-meta text-muted" style="font-size: 10px; margin-top: 4px; text-align: right;">
                ${new Date(msg.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          `;
          }
          const { cleanText: textAfterSchedule, schedules } = this.extractSchedulesFromAssistantMessage(msg.text);
          const { cleanText: finalCleanText, note } = this.extractNotesFromAssistantMessage(textAfterSchedule);
          let scheduleCardHtml = "";
          if (schedules.length > 0) {
            const uniqueDates = [...new Set(schedules.map((s) => s.date).filter(Boolean))].sort();
            const targetDate = schedules[0].date || getLocalDateString();
            let displayDate = "";
            if (uniqueDates.length === 1) {
              displayDate = (/* @__PURE__ */ new Date(uniqueDates[0] + "T00:00:00")).toLocaleDateString("id-ID", {
                weekday: "short",
                day: "numeric",
                month: "short"
              });
            } else if (uniqueDates.length > 1) {
              const firstDate = (/* @__PURE__ */ new Date(uniqueDates[0] + "T00:00:00")).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
              const lastDate = (/* @__PURE__ */ new Date(uniqueDates[uniqueDates.length - 1] + "T00:00:00")).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
              displayDate = `${firstDate} \u2013 ${lastDate} (${uniqueDates.length} Hari)`;
            } else {
              displayDate = "Hari Ini";
            }
            const itemsHtml = schedules.map((item) => {
              let badgesHtml = "";
              const itemDayBadge = uniqueDates.length > 1 && item.date ? `<span style="font-size:10px; font-weight:600; color:var(--text-secondary); padding:1px 6px; border-radius:4px; background:rgba(255,255,255,0.06); font-family:var(--font-mono);">${(/* @__PURE__ */ new Date(item.date + "T00:00:00")).toLocaleDateString("id-ID", { weekday: "short" })}</span>` : "";
              if (item.recurrence && item.recurrence !== "none") {
                const recLabels = { daily: "Tiap Hari", weekdays: "Hari Kerja", weekly: "Mingguan", monthly: "Bulanan" };
                const label = recLabels[item.recurrence] || "Berulang";
                badgesHtml += `<span class="recurrence-badge" style="font-size:9px; padding:1px 5px;">${getIcon("repeat", "", 10)} ${label}</span>`;
              }
              if (item.deadline) {
                badgesHtml += `<span class="deadline-badge is-urgent" style="font-size:9px; padding:1px 5px;">${getIcon("clock", "", 9)} Tenggat</span>`;
              }
              if (item.priority === "high") {
                badgesHtml += `<span style="font-size:9px; padding:1px 5px; border-radius:3px; background:rgba(239,68,68,0.12); color:var(--status-danger); font-weight:600;">Tinggi</span>`;
              }
              const catInfo = state.getCategoryByName(item.category);
              const catColor = catInfo.color || "#f97316";
              return `
              <div class="chat-schedule-item-row" style="flex-wrap:wrap; align-items:flex-start;">
                ${itemDayBadge}
                <span class="chat-schedule-item-time tabular-nums">${item.time}</span>
                <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;">
                  <span class="chat-schedule-item-title">${escapeHtml(item.title)}</span>
                  ${item.description ? `<span style="font-size:11px; color:var(--text-muted); line-height:1.3;">${escapeHtml(item.description)}</span>` : ""}
                </div>
                <span style="font-size:10px; color:var(--text-muted);">${item.duration}m</span>
                <span class="schedule-category-badge" style="background-color:${catColor}18; color:${catColor}; font-size:9px; padding:1px 5px;">
                  ${escapeHtml(item.category)}
                </span>
                ${badgesHtml}
              </div>
            `;
            }).join("");
            const encodedSchedules = encodeURIComponent(JSON.stringify(schedules));
            let actionFooter = "";
            if (msg.savedSchedules) {
              actionFooter = `
              <div class="chat-schedule-actions-row">
                <span class="chat-saved-badge">
                  ${getIcon("check", "", 12)} Tersimpan di Agenda
                </span>
                <button type="button" class="btn btn-ghost btn-xs" data-action="view-chat-date" data-date="${targetDate}" style="font-size:11px; padding:2px 8px; cursor:pointer;">
                  Lihat di Agenda \u2192
                </button>
              </div>
            `;
            } else {
              actionFooter = `
              <div class="chat-schedule-actions-row">
                <span style="font-size:11px; color:var(--text-muted);">
                  ${schedules.length} kegiatan siap dimasukkan
                </span>
                <button type="button" class="btn btn-primary btn-xs" data-action="save-chat-card" data-msg-id="${msg.id || "msg_idx_" + idx}" data-schedules="${encodedSchedules}" style="font-size:11px; padding:4px 10px; cursor:pointer;">
                  ${getIcon("check", "", 12)} Simpan ke Agenda
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
          let noteCardHtml = "";
          if (note) {
            const encodedTitle = encodeURIComponent(note.title);
            const encodedContent = encodeURIComponent(note.content);
            let noteFooter = "";
            if (msg.savedNote) {
              noteFooter = `
              <div class="chat-note-actions-row">
                <span class="chat-note-saved-badge">
                  ${getIcon("check", "", 12)} Tersimpan di Catatan
                </span>
              </div>
            `;
            } else {
              noteFooter = `
              <div class="chat-note-actions-row">
                <button type="button" class="btn btn-primary btn-xs" data-action="save-chat-note" data-msg-id="${msg.id || "msg_idx_" + idx}" data-note-title="${encodedTitle}" data-note-content="${encodedContent}" style="font-size:11px; padding:4px 10px; cursor:pointer;">
                  ${getIcon("file-text", "", 12)} Simpan sebagai Catatan
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
              ${new Date(msg.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        `;
        }).join("");
        renderIcons(chatHistoryEl);
        chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
      }
    },
    async handleSendChatMessage(e) {
      e.preventDefault();
      const input = document.getElementById("chat-input");
      const text = input ? input.value.trim() : "";
      const activeAttachment = this.currentAttachment;
      if (!text && !activeAttachment) return;
      if (input) input.value = "";
      let attachmentMeta = null;
      if (activeAttachment) {
        attachmentMeta = {
          name: activeAttachment.name,
          type: activeAttachment.type,
          isImage: activeAttachment.isImage,
          isDoc: activeAttachment.isDoc,
          thumbUrl: activeAttachment.thumbUrl || ""
        };
      }
      this.clearCurrentAttachment();
      state.addChatMessage("user", text || (activeAttachment ? `Lampiran: ${activeAttachment.name}` : ""), false, {
        attachment: attachmentMeta
      });
      this.renderAiPlanView();
      const submitBtn = document.getElementById("chat-submit-btn");
      if (submitBtn) submitBtn.disabled = true;
      const autoSaveToggle = document.getElementById("chat-auto-save-toggle");
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
          notifications.showToast(`${schedules.length} agenda otomatis dimasukkan ke jadwal!`, "success");
        }
        state.addChatMessage("assistant", reply, false, {
          savedSchedules: isScheduleSaved,
          savedNote: false
        });
      } catch (err) {
        console.warn("AI chat error, attempting offline extraction fallback:", err);
        const fallbackItems = this.extractSchedulesFromText(text);
        if (fallbackItems && fallbackItems.length > 0) {
          let isSaved = false;
          if (shouldAutoSave) {
            state.addSchedules(fallbackItems);
            isSaved = true;
            notifications.playChime();
            notifications.showToast(`${fallbackItems.length} agenda otomatis dimasukkan (offline).`, "success");
          }
          const jsonBlock = `

[DAYFLOW_SCHEDULES]
${JSON.stringify(fallbackItems)}
[/DAYFLOW_SCHEDULES]`;
          const offlineReply = `(Mode Offline / Cepat) Aku telah menyusun ${fallbackItems.length} kegiatan dari rencana yang kamu sampaikan:${jsonBlock}`;
          state.addChatMessage("assistant", offlineReply, false, { savedSchedules: isSaved });
        } else {
          state.addChatMessage("assistant", `Terjadi kendala saat menghubungi AI: ${err.message}`);
          notifications.showToast(err.message, "error", 4500);
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        this.renderAiPlanView();
      }
    },
    async clearChat() {
      const confirmed = await this.showConfirmDialog({
        title: "Bersihkan Riwayat Obrolan?",
        message: "Semua dialog dan konteks percakapan dengan AI Gemini akan dihapus dari sesi ini.",
        confirmText: "Bersihkan",
        isDanger: true,
        icon: "trash"
      });
      if (confirmed) {
        this.clearCurrentAttachment();
        state.clearChatHistory();
        notifications.showToast("Riwayat percakapan telah dibersihkan.", "info");
      }
    }
  };

  // js/views/notes-view.js
  var notesViewMethods = {
    setupNotesDelegation(containerEl) {
      if (!containerEl || containerEl._hasNotesDelegation) return;
      containerEl._hasNotesDelegation = true;
      containerEl.addEventListener("click", async (e) => {
        const target = e.target;
        if (!target) return;
        const deleteBtn = target.closest('[data-action="delete-note"]');
        if (deleteBtn) {
          e.stopPropagation();
          const confirmed = await this.showConfirmDialog({
            title: "Hapus Catatan Ini?",
            message: "Catatan ini akan dihapus secara permanen dan tidak dapat dipulihkan.",
            confirmText: "Hapus",
            isDanger: true,
            icon: "trash"
          });
          if (confirmed) {
            state.deleteNote(deleteBtn.getAttribute("data-id"));
            notifications.showToast("Catatan telah dihapus.", "info");
          }
          return;
        }
        const editBtn = target.closest('[data-action="edit-note"]');
        if (editBtn) {
          e.stopPropagation();
          this.openNoteModal(editBtn.getAttribute("data-id"));
          return;
        }
        const card = target.closest(".note-card");
        if (card && !target.closest("button")) {
          this.openNoteModal(card.getAttribute("data-note-id"));
          return;
        }
      });
    },
    // --- 4. Notes View ---
    renderNotesView() {
      const listEl = document.getElementById("notes-grid");
      if (!listEl) return;
      this.setupNotesDelegation(listEl);
      const notes = state.getNotes();
      const searchInput = document.getElementById("notes-search-input");
      const filterQuery = searchInput ? searchInput.value.trim().toLowerCase() : "";
      let filtered = notes;
      if (filterQuery) {
        filtered = notes.filter(
          (n) => String(n.title || "").toLowerCase().includes(filterQuery) || String(n.content || "").toLowerCase().includes(filterQuery)
        );
      }
      if (filtered.length === 0) {
        const isSearching = Boolean(filterQuery);
        listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${getIcon(isSearching ? "search" : "file-text", "", 20)}</div>
          <p class="empty-state-title">${isSearching ? "Catatan tidak ditemukan" : "Belum ada catatan"}</p>
          <p class="empty-state-desc">${isSearching ? "Coba gunakan kata kunci lain untuk mencari ide atau memo." : "Catat ide cepat, ringkasan rapat, atau memo harian di sini."}</p>
          ${!isSearching ? `
            <div class="empty-state-actions">
              <button type="button" class="btn btn-primary btn-sm" id="btn-empty-add-note">
                ${getIcon("plus", "", 14)} Buat Catatan Baru
              </button>
            </div>
          ` : ""}
        </div>
      `;
        renderIcons(listEl);
        const addNoteBtn = listEl.querySelector("#btn-empty-add-note");
        if (addNoteBtn) {
          addNoteBtn.addEventListener("click", () => {
            springBounce(addNoteBtn);
            this.openNoteModal();
          });
        }
        return;
      }
      listEl.innerHTML = filtered.map((note) => {
        const dateObj = note.updatedAt && !isNaN(new Date(note.updatedAt).getTime()) ? new Date(note.updatedAt) : /* @__PURE__ */ new Date();
        const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        return `
      <div class="note-card" data-note-id="${note.id}" role="button" tabindex="0" title="Klik untuk membuka catatan">
        <div class="note-card-title">${escapeHtml(note.title || "Catatan Tanpa Judul")}</div>
        <div class="note-card-preview">${escapeHtml(note.content || "")}</div>
        <div class="note-card-footer">
          <span class="text-xs text-muted">${dateStr}</span>
          <button class="btn btn-ghost btn-xs text-muted" data-action="delete-note" data-id="${note.id}" aria-label="Hapus catatan" title="Hapus catatan">
            ${getIcon("trash", "", 13)}
          </button>
        </div>
      </div>
      `;
      }).join("");
      renderIcons(listEl);
      if (searchInput && !searchInput._hasSearchInputBound) {
        searchInput._hasSearchInputBound = true;
        let debounceTimer = null;
        searchInput.addEventListener("input", () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            this.renderNotesView();
          }, 100);
        });
      }
      const btnAiSearch = document.getElementById("btn-ai-search-notes");
      if (btnAiSearch) {
        btnAiSearch.onclick = async () => {
          const query = searchInput ? searchInput.value.trim() : "";
          if (!query) {
            notifications.showToast("Ketik topik atau kata kunci terlebih dahulu.", "warning");
            return;
          }
          btnAiSearch.disabled = true;
          btnAiSearch.innerHTML = `<span class="spinner"></span> Merangkum...`;
          try {
            const result = await GeminiService.searchNotesWithAI(query, state.getNotes());
            notifications.showToast(`Rangkuman AI: ${result}`, "info", 6e3);
          } catch (err) {
            notifications.showToast(err.message, "error");
          } finally {
            btnAiSearch.disabled = false;
            btnAiSearch.innerHTML = `${getIcon("bot", "", 14)} Rangkum AI`;
            renderIcons();
          }
        };
      }
    }
  };

  // js/views/settings-view.js
  var settingsViewMethods = {
    // --- 5. Settings View ---
    renderSettingsView() {
      const settings = state.getSettings();
      const apiInput = document.getElementById("setting-api-key");
      const modelSelect = document.getElementById("setting-model");
      const advanceInput = document.getElementById("setting-advance");
      const soundToggle = document.getElementById("setting-sound");
      const toneSelect = document.getElementById("setting-sound-tone");
      const proactiveToggle = document.getElementById("setting-proactive");
      const grokInput = document.getElementById("setting-grok-api-key");
      if (apiInput) apiInput.value = settings.apiKey || "";
      if (grokInput) grokInput.value = settings.grokApiKey || "";
      if (modelSelect) modelSelect.value = settings.geminiModel || APP_CONFIG.DEFAULT_MODEL || "gemini-2.5-flash";
      if (advanceInput) advanceInput.value = settings.notifyAdvanceMinutes || 15;
      const badgeEl = document.getElementById("central-ai-status-badge");
      if (badgeEl) {
        if (settings.apiKey) {
          badgeEl.style.background = "rgba(234, 88, 12, 0.12)";
          badgeEl.style.color = "#ea580c";
          badgeEl.style.borderColor = "rgba(234, 88, 12, 0.25)";
          badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#ea580c; display:inline-block;"></span> Key Pribadi Aktif`;
        } else if (settings.grokApiKey) {
          badgeEl.style.background = "rgba(14, 165, 233, 0.12)";
          badgeEl.style.color = "#0ea5e9";
          badgeEl.style.borderColor = "rgba(14, 165, 233, 0.25)";
          badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#0ea5e9; display:inline-block;"></span> AI + Grok Siap`;
        } else if (GeminiService.isAiReady()) {
          badgeEl.style.background = "rgba(34, 197, 94, 0.12)";
          badgeEl.style.color = "#22c55e";
          badgeEl.style.borderColor = "rgba(34, 197, 94, 0.25)";
          badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#22c55e; display:inline-block;"></span> AI Terpusat Siap`;
        } else {
          badgeEl.style.background = "rgba(239, 68, 68, 0.12)";
          badgeEl.style.color = "#ef4444";
          badgeEl.style.borderColor = "rgba(239, 68, 68, 0.25)";
          badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#ef4444; display:inline-block;"></span> Belum Terhubung`;
        }
      }
      if (soundToggle) soundToggle.checked = settings.soundEnabled !== false;
      if (toneSelect) toneSelect.value = settings.soundTone || "crystal";
      if (proactiveToggle) proactiveToggle.checked = settings.proactiveReminders !== false;
      const systemNotifToggle = document.getElementById("setting-system-notif");
      if (systemNotifToggle) systemNotifToggle.checked = settings.systemNotificationsEnabled !== false;
      this.updateNotificationPermissionUI();
      const themeRadio = document.querySelector(`input[name="setting-theme"][value="${settings.theme || "dark"}"]`);
      if (themeRadio) themeRadio.checked = true;
      const advanceVal = parseInt(settings.notifyAdvanceMinutes || 15, 10);
      document.querySelectorAll(".segmented-chip").forEach((chip) => {
        const val = parseInt(chip.getAttribute("data-advance-val"), 10);
        chip.classList.toggle("is-active", val === advanceVal);
      });
      const currentTone = settings.soundTone || "crystal";
      document.querySelectorAll(".tone-picker-item").forEach((item) => {
        const val = item.getAttribute("data-tone-val");
        item.classList.toggle("is-active", val === currentTone);
      });
      this.updateModelPickerUI(settings.geminiModel || "gemini-2.5-flash");
      this.renderBannerSettings(settings);
      this.renderProfileProductivity();
      this.renderSettingsCategoriesPreview();
    },
    updateModelPickerUI(modelId = "gemini-2.5-flash") {
      const hiddenInput = document.getElementById("setting-model");
      if (hiddenInput) hiddenInput.value = modelId;
      const nameEl = document.getElementById("current-model-name");
      const descEl = document.getElementById("current-model-desc");
      const modelMeta = {
        "gemini-2.5-flash": {
          name: "Gemini 2.5 Flash",
          desc: "Respon luas, penalaran terperinci & hemat kuota token"
        },
        "gemini-3.5-flash-lite": {
          name: "Gemini 3.5 Flash-Lite",
          desc: "Eksekusi instan, latensi rendah & respons super cepat"
        },
        "gemini-3.6-flash": {
          name: "Gemini 3.6 Flash",
          desc: "Keseimbangan performa tinggi & penalaran mendalam"
        },
        "gemini-3.8-flash": {
          name: "Gemini 3.8 Flash",
          desc: "Model cerdas generasi terbaru"
        }
      };
      const current = modelMeta[modelId] || { name: modelId, desc: "Model AI terkonfigurasi" };
      if (nameEl) nameEl.textContent = current.name;
      if (descEl) descEl.textContent = current.desc;
    },
    handleSaveSettings(e) {
      e.preventDefault();
      const apiInput = document.getElementById("setting-api-key");
      const modelSelect = document.getElementById("setting-model");
      const advanceInput = document.getElementById("setting-advance");
      const soundToggle = document.getElementById("setting-sound");
      const toneSelect = document.getElementById("setting-sound-tone");
      const proactiveToggle = document.getElementById("setting-proactive");
      const selectedTone = toneSelect ? toneSelect.value : "crystal";
      const themeValue = document.querySelector('input[name="setting-theme"]:checked')?.value || "dark";
      const submitBtn = document.querySelector('#settings-form button[type="submit"]');
      const userNameInput = document.getElementById("setting-user-name");
      const bannerQuoteInput = document.getElementById("setting-banner-quote");
      const bannerUrlInput = document.getElementById("setting-banner-url");
      const bannerEnabledToggle = document.getElementById("setting-banner-enabled");
      const systemNotifToggle = document.getElementById("setting-system-notif");
      const grokInput = document.getElementById("setting-grok-api-key");
      state.updateSettings({
        userName: userNameInput ? userNameInput.value.trim() : "",
        heroBannerEnabled: bannerEnabledToggle ? bannerEnabledToggle.checked : false,
        hasConfiguredBanner: bannerEnabledToggle && bannerEnabledToggle.checked || state.getSettings().hasConfiguredBanner || false,
        heroBannerQuote: bannerQuoteInput ? bannerQuoteInput.value.trim() : "Fokus pada hal penting hari ini.",
        heroBannerUrl: bannerUrlInput ? bannerUrlInput.value.trim() : "",
        apiKey: apiInput ? apiInput.value.trim() : "",
        grokApiKey: grokInput ? grokInput.value.trim() : "",
        geminiModel: modelSelect ? modelSelect.value : "gemini-2.5-flash",
        notifyAdvanceMinutes: parseInt(advanceInput ? advanceInput.value : "15", 10) || 15,
        soundEnabled: soundToggle ? soundToggle.checked : true,
        soundTone: selectedTone,
        proactiveReminders: proactiveToggle ? proactiveToggle.checked : true,
        systemNotificationsEnabled: systemNotifToggle ? systemNotifToggle.checked : true,
        theme: themeValue
      });
      this.applyTheme(themeValue);
      const alertBanner = document.getElementById("settings-save-alert");
      if (alertBanner) {
        alertBanner.classList.remove("hidden");
        renderIcons(alertBanner);
        if (this._settingsAlertTimer) clearTimeout(this._settingsAlertTimer);
        this._settingsAlertTimer = setTimeout(() => {
          alertBanner.classList.add("hidden");
        }, 6e3);
      }
      notifications.playChime(selectedTone);
      notifications.showToast("Pengaturan berhasil disimpan.", "success");
      if (submitBtn) {
        springBounce(submitBtn);
        particleBurst(submitBtn, "var(--status-success)");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      const mainViewport = document.querySelector(".main-viewport");
      if (mainViewport) {
        mainViewport.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    async handleTestApiKey() {
      const apiKey = document.getElementById("setting-api-key")?.value.trim();
      const testBtn = document.getElementById("btn-test-api");
      const orig = testBtn.innerHTML;
      testBtn.disabled = true;
      testBtn.innerHTML = `<span class="spinner"></span> Menguji...`;
      try {
        if (apiKey) {
          const res = await GeminiService.testConnection(apiKey);
          state.updateSettings({ apiKey, geminiModel: res.model || "gemini-2.5-flash" });
          this.renderSettingsView();
          notifications.showToast(`API Key pribadi valid dan tersimpan! (${res.model})`, "success", 5e3);
        } else if (GeminiService.isAiReady()) {
          const res = await GeminiService.testConnection(null);
          const modeTitle = res.mode === "proxy" ? "Serverless AI Proxy" : "AI Terpusat";
          this.renderSettingsView();
          notifications.showToast(`Koneksi ${modeTitle} berhasil & siap digunakan! (${res.model})`, "success", 5e3);
        } else {
          notifications.showToast("Belum ada Serverless Proxy atau API Key yang dihubungkan.", "warning", 5e3);
        }
      } catch (err) {
        notifications.showToast(`Uji gagal: ${err.message}`, "error", 6e3);
      } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = orig;
        renderIcons();
      }
    },
    handleClearSavedApiKey() {
      state.updateSettings({ apiKey: "" });
      const apiInput = document.getElementById("setting-api-key");
      if (apiInput) apiInput.value = "";
      this.renderSettingsView();
      notifications.showToast("API Key pribadi telah dihapus dari peramban ini. DayFlow kini aktif menggunakan AI Terpusat.", "success", 5e3);
    },
    async handleTestGrokApiKey() {
      const grokKey = document.getElementById("setting-grok-api-key")?.value.trim();
      const testBtn = document.getElementById("btn-test-grok-api");
      if (!grokKey) {
        notifications.showToast("Masukkan xAI Grok API Key terlebih dahulu untuk menguji.", "warning", 4e3);
        return;
      }
      const orig = testBtn ? testBtn.innerHTML : "";
      if (testBtn) {
        testBtn.disabled = true;
        testBtn.innerHTML = `<span class="spinner"></span> Menguji...`;
      }
      try {
        const res = await GeminiService.testGrokConnection(grokKey);
        state.updateSettings({ grokApiKey: grokKey });
        this.renderSettingsView();
        notifications.showToast(`Koneksi xAI Grok valid dan siap sebagai fallback cadangan! (${res.model})`, "success", 5e3);
      } catch (err) {
        notifications.showToast(`Uji Grok gagal: ${err.message}`, "error", 6e3);
      } finally {
        if (testBtn) {
          testBtn.disabled = false;
          testBtn.innerHTML = orig;
          renderIcons(testBtn);
        }
      }
    },
    handleClearGrokApiKey() {
      state.updateSettings({ grokApiKey: "" });
      const grokInput = document.getElementById("setting-grok-api-key");
      if (grokInput) grokInput.value = "";
      this.renderSettingsView();
      notifications.showToast("Grok API Key cadangan telah dihapus dari peramban ini.", "success", 5e3);
    },
    handleExportData() {
      const backup = {
        version: 1,
        timestamp: Date.now(),
        schedules: state.schedules,
        notes: state.notes,
        categories: state.getCategories(),
        dailyLogs: state.dailyLogs,
        settings: { ...state.settings, apiKey: "" }
        // don't export plain secret
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DayFlow_Backup_${getLocalDateString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notifications.showToast("Data berhasil diekspor.", "success");
    },
    handleImportData(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.schedules && Array.isArray(parsed.schedules)) {
            localStorage.setItem("dayflow_schedules_v1", JSON.stringify(parsed.schedules));
          }
          if (parsed.notes && Array.isArray(parsed.notes)) {
            localStorage.setItem("dayflow_notes_v1", JSON.stringify(parsed.notes));
          }
          if (parsed.categories && Array.isArray(parsed.categories)) {
            localStorage.setItem("dayflow_categories_v1", JSON.stringify(parsed.categories));
          }
          if (parsed.dailyLogs && Array.isArray(parsed.dailyLogs)) {
            localStorage.setItem("dayflow_daily_logs_v1", JSON.stringify(parsed.dailyLogs));
          }
          if (parsed.settings && typeof parsed.settings === "object" && !Array.isArray(parsed.settings)) {
            const currentSettings = state.getSettings();
            const merged = {
              ...currentSettings,
              ...parsed.settings,
              apiKey: parsed.settings.apiKey || currentSettings.apiKey || ""
            };
            localStorage.setItem("dayflow_settings_v1", JSON.stringify(merged));
          }
          notifications.showToast("Data berhasil dipulihkan. Memuat ulang...", "success");
          setTimeout(() => window.location.reload(), 1e3);
        } catch (err) {
          notifications.showToast("File JSON tidak valid.", "error");
        }
      };
      reader.readAsText(file);
    },
    renderSettingsCategoriesPreview() {
      const previewEl = document.getElementById("settings-categories-preview");
      if (!previewEl) return;
      const categories = state.getCategories();
      let html = "";
      categories.forEach((cat) => {
        html += `
        <span class="category-badge-chip" style="background-color:${cat.color}1a; color:${cat.color}; border:1px solid ${cat.color}35;">
          <span style="width:6px; height:6px; border-radius:50%; background-color:${cat.color}; display:inline-block;"></span>
          ${escapeHtml(cat.name)}
        </span>
      `;
      });
      previewEl.innerHTML = html;
    },
    updateNotificationPermissionUI() {
      const badge = document.getElementById("notif-permission-badge");
      const desc = document.getElementById("notif-permission-desc");
      const actionRow = document.getElementById("notif-permission-action-row");
      const enableBtn = document.getElementById("btn-enable-system-notif");
      const statusText = document.getElementById("notif-action-status-text");
      const perm = notifications.getPermissionStatus();
      if (badge) {
        if (perm === "granted") {
          badge.style.background = "rgba(34, 197, 94, 0.12)";
          badge.style.color = "#22c55e";
          badge.style.borderColor = "rgba(34, 197, 94, 0.25)";
          badge.textContent = "\u25CF Aktif & Disetujui";
          if (actionRow) actionRow.style.display = "none";
          if (desc) desc.textContent = "DayFlow memiliki izin penuh untuk memunculkan pop-up jadwal di layar dan status bar peramban.";
        } else if (perm === "denied") {
          badge.style.background = "rgba(239, 68, 68, 0.12)";
          badge.style.color = "#ef4444";
          badge.style.borderColor = "rgba(239, 68, 68, 0.25)";
          badge.textContent = "\u25CF Diblokir Browser";
          if (actionRow) actionRow.style.display = "flex";
          if (enableBtn) enableBtn.style.display = "none";
          if (statusText) statusText.innerHTML = "Izin notifikasi diblokir browser. Klik ikon gembok pada bilah URL, lalu ubah <b>Notifikasi</b> menjadi <b>Izinkan</b>.";
          if (desc) desc.textContent = "Browser memblokir pop-up notifikasi. Silakan buka izin pada bilah alamat web.";
        } else if (perm === "unsupported") {
          badge.style.background = "rgba(148, 163, 184, 0.12)";
          badge.style.color = "#94a3b8";
          badge.style.borderColor = "rgba(148, 163, 184, 0.25)";
          badge.textContent = "\u25CF Tidak Didukung";
          if (actionRow) actionRow.style.display = "none";
          if (desc) desc.textContent = "Peramban ini tidak mendukung Web Notifications API standar.";
        } else {
          badge.style.background = "rgba(245, 158, 11, 0.12)";
          badge.style.color = "#f59e0b";
          badge.style.borderColor = "rgba(245, 158, 11, 0.25)";
          badge.textContent = "\u25CF Belum Diaktifkan";
          if (actionRow) actionRow.style.display = "flex";
          if (enableBtn) {
            enableBtn.style.display = "inline-flex";
          }
          if (statusText) statusText.textContent = 'Klik "Izinkan Notifikasi" agar pengingat agenda harian bisa tampil di luar peramban.';
        }
        renderIcons(actionRow || document);
      }
    },
    renderProfileProductivity() {
      const card = document.getElementById("profile-productivity-card");
      if (!card) return;
      const settings = state.getSettings();
      const stats = state.getProfileProductivityStats();
      const nameEl = document.getElementById("profile-card-name");
      if (nameEl) {
        nameEl.textContent = settings.userName ? `Profil ${escapeHtml(settings.userName)}` : "Profil Pengguna";
      }
      const statInputted = document.getElementById("stat-today-inputted");
      const statCompleted = document.getElementById("stat-today-completed");
      const statPercent = document.getElementById("stat-today-percent");
      const statStreak = document.getElementById("stat-perfect-streak");
      if (statInputted) statInputted.textContent = stats.todayTotal;
      if (statCompleted) statCompleted.textContent = stats.todayCompleted;
      if (statPercent) statPercent.textContent = `${stats.todayPercent}%`;
      if (statStreak) statStreak.textContent = stats.perfectDays;
      const historyList = document.getElementById("profile-history-list");
      if (!historyList) return;
      const logs = state.getDailyLogs(10);
      if (!logs || logs.length === 0) {
        historyList.innerHTML = `
        <div class="profile-history-empty text-xs text-muted" style="padding: 12px 0;">
          Belum ada riwayat tercatat. Rekap hari ini akan tersimpan otomatis setiap pukul 24:00.
        </div>
      `;
        return;
      }
      let html = "";
      logs.forEach((log) => {
        const isToday = log.date === getLocalDateString();
        const dateObj = /* @__PURE__ */ new Date(log.date + "T00:00:00");
        const dateLabel = isToday ? "Hari Ini" : dateObj.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
        let badgeClass = "badge-muted";
        let badgeText = "Istirahat";
        if (log.totalScheduled > 0) {
          if (log.percentage === 100) {
            badgeClass = "badge-success";
            badgeText = "100% Tuntas";
          } else {
            badgeClass = "badge-warning";
            badgeText = `${log.completedCount}/${log.totalScheduled} Selesai`;
          }
        }
        html += `
        <div class="profile-history-item ${isToday ? "is-today" : ""}">
          <div class="profile-history-info">
            <span class="profile-history-date tabular-nums">${escapeHtml(dateLabel)}</span>
            <span class="profile-history-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="profile-history-track">
            <div class="profile-history-fill ${log.percentage === 100 ? "is-perfect" : ""}" style="width: ${log.percentage}%;"></div>
          </div>
          <span class="profile-history-percent tabular-nums font-mono">${log.percentage}%</span>
        </div>
      `;
      });
      historyList.innerHTML = html;
    }
  };

  // js/app.js
  var AppController = class {
    constructor() {
      this.currentTab = "today";
      this.selectedScheduleDate = getLocalDateString();
      this.selectedCategory = "all";
      this.activeModal = null;
      this.editingScheduleId = null;
      this.editingNoteId = null;
      this.pendingAiSchedules = [];
      this._activeBannerBlobUrl = null;
      this._settingsAlertTimer = null;
      this.state = state;
      window.dayflowState = state;
      window.dayflowApp = this;
      window._actualDayflowApp = this;
    }
    init() {
      try {
        this.mountModals();
        this.applyTheme(state.getSettings().theme || "dark");
        this.setupThemeListener();
        notifications.init();
        this.initRealtimeClock();
        this.bindEvents();
        this.render();
        window.__dayflow_ready = true;
        if (Array.isArray(window._dfBuffer) && window._dfBuffer.length > 0) {
          const queue = [...window._dfBuffer];
          window._dfBuffer = [];
          queue.forEach(([action, arg]) => {
            try {
              if (typeof this[action] === "function") this[action](arg);
            } catch (e) {
            }
          });
        }
      } catch (err) {
        console.error("App init error, running fallback render:", err);
        try {
          this.render();
        } catch (e) {
          console.error("Fallback render error:", e);
        }
        renderIcons();
      }
      state.subscribe((event, data) => {
        this.handleStateUpdate(event, data);
      });
      this.registerServiceWorker();
    }
    applyTheme(theme) {
      let activeTheme = theme;
      if (theme === "system") {
        const isSystemLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
        activeTheme = isSystemLight ? "light" : "dark";
      }
      if (activeTheme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute("content", activeTheme === "light" ? "#f8f9fa" : "#0e0f12");
      }
      const toggleBtn = document.getElementById("btn-toggle-theme");
      if (toggleBtn) {
        const isLight = activeTheme === "light";
        toggleBtn.setAttribute("title", isLight ? "Beralih ke Mode Gelap" : "Beralih ke Mode Terang");
        toggleBtn.setAttribute("aria-label", isLight ? "Beralih ke Mode Gelap" : "Beralih ke Mode Terang");
        toggleBtn.innerHTML = getIcon(isLight ? "moon" : "sun", "", 18);
      }
      const radio = document.querySelector(`input[name="setting-theme"][value="${theme}"]`);
      if (radio) {
        radio.checked = true;
      }
    }
    setupThemeListener() {
      if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
          const currentSetting = state.getSettings().theme || "dark";
          if (currentSetting === "system") {
            this.applyTheme("system");
          }
        });
      }
    }
    registerServiceWorker() {
    }
    bindEvents() {
      this.bindBannerSettingsEvents();
      document.querySelectorAll(".nav-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          const targetTab = tab.getAttribute("data-target");
          this.switchTab(targetTab);
        });
      });
      const brandLink = document.getElementById("brand-header-link");
      if (brandLink) {
        brandLink.addEventListener("click", () => {
          springBounce(brandLink);
          this.switchTab("today");
        });
        brandLink.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            springBounce(brandLink);
            this.switchTab("today");
          }
        });
      }
      const fabBtn = document.getElementById("fab-quick-add");
      if (fabBtn) {
        fabBtn.addEventListener("click", () => {
          springBounce(fabBtn);
          if (this.currentTab === "notes") {
            this.openNoteModal();
          } else {
            this.openScheduleModal();
          }
        });
      }
      document.querySelectorAll(".modal-overlay").forEach((overlay) => {
        const handleClose = (e) => {
          if (e.target === overlay) {
            e.preventDefault();
            this.closeAllModals();
          }
        };
        overlay.addEventListener("click", handleClose);
        overlay.addEventListener("touchend", handleClose, { passive: false });
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.closeAllModals();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          if (this.currentTab === "notes") {
            this.openNoteModal();
          } else {
            this.openScheduleModal();
          }
        }
      });
      const scheduleForm = document.getElementById("schedule-form");
      if (scheduleForm) {
        scheduleForm.addEventListener("submit", (e) => this.handleSaveSchedule(e));
      }
      const noteForm = document.getElementById("note-form");
      if (noteForm) {
        noteForm.addEventListener("submit", (e) => this.handleSaveNote(e));
      }
      const settingsForm = document.getElementById("settings-form");
      if (settingsForm) {
        settingsForm.addEventListener("submit", (e) => this.handleSaveSettings(e));
      }
      const chatForm = document.getElementById("chat-form");
      if (chatForm) {
        chatForm.addEventListener("submit", (e) => this.handleSendChatMessage(e));
      }
      const chatAutoSaveToggle = document.getElementById("chat-auto-save-toggle");
      if (chatAutoSaveToggle) {
        chatAutoSaveToggle.checked = !!state.getSettings().chatAutoSave;
        chatAutoSaveToggle.addEventListener("change", () => {
          state.updateSettings({ chatAutoSave: chatAutoSaveToggle.checked });
          notifications.showToast(
            chatAutoSaveToggle.checked ? "Jadwal dari asisten akan otomatis disimpan." : "Jadwal dari asisten akan menunggu konfirmasi tombol simpan.",
            "info",
            3e3
          );
        });
      }
      document.querySelectorAll(".prompt-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const prompt = chip.getAttribute("data-prompt");
          const chatInput = document.getElementById("chat-input");
          if (chatInput && prompt) {
            chatInput.value = prompt;
            chatInput.focus();
          }
        });
      });
      const notifBtn = document.getElementById("btn-request-notif");
      if (notifBtn) {
        notifBtn.addEventListener("click", async () => {
          springBounce(notifBtn);
          const tone = state.getSettings().soundTone || "crystal";
          await notifications.testNotification(tone);
          if (typeof this.updateNotificationPermissionUI === "function") {
            this.updateNotificationPermissionUI();
          }
        });
      }
      const testAudioBtn = document.getElementById("btn-test-chime");
      if (testAudioBtn) {
        testAudioBtn.addEventListener("click", () => {
          springBounce(testAudioBtn);
          const toneInput = document.getElementById("setting-sound-tone");
          const selectedTone = toneInput ? toneInput.value : state.getSettings().soundTone || "crystal";
          notifications.playChime(selectedTone);
          const toneNames = {
            crystal: "Crystal Bell",
            marimba: "Marimba",
            digital: "Digital Pulse"
          };
          const name = toneNames[selectedTone] || "Crystal Bell";
          notifications.showToast(`Bel akustik (${name}) berbunyi.`, "info");
        });
      }
      const testSystemNotifBtn = document.getElementById("btn-test-system-notif");
      if (testSystemNotifBtn) {
        testSystemNotifBtn.addEventListener("click", async () => {
          springBounce(testSystemNotifBtn);
          const toneInput = document.getElementById("setting-sound-tone");
          const selectedTone = toneInput ? toneInput.value : state.getSettings().soundTone || "crystal";
          await notifications.testNotification(selectedTone);
          if (typeof this.updateNotificationPermissionUI === "function") {
            this.updateNotificationPermissionUI();
          }
        });
      }
      const enableNotifBtn = document.getElementById("btn-enable-system-notif");
      if (enableNotifBtn) {
        enableNotifBtn.addEventListener("click", async () => {
          springBounce(enableNotifBtn);
          await notifications.requestPermission();
          if (typeof this.updateNotificationPermissionUI === "function") {
            this.updateNotificationPermissionUI();
          }
        });
      }
      document.querySelectorAll(".segmented-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const val = chip.getAttribute("data-advance-val");
          const hiddenInput = document.getElementById("setting-advance");
          if (hiddenInput) hiddenInput.value = val;
          document.querySelectorAll(".segmented-chip").forEach((c) => c.classList.remove("is-active"));
          chip.classList.add("is-active");
          springBounce(chip);
        });
      });
      document.querySelectorAll(".tone-picker-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          if (e.target.closest(".btn-tone-listen")) return;
          const toneVal = item.getAttribute("data-tone-val");
          const hiddenInput = document.getElementById("setting-sound-tone");
          if (hiddenInput) hiddenInput.value = toneVal;
          document.querySelectorAll(".tone-picker-item").forEach((i) => i.classList.remove("is-active"));
          item.classList.add("is-active");
          springBounce(item);
          notifications.playChime(toneVal);
        });
      });
      document.querySelectorAll(".btn-tone-listen").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const toneVal = btn.getAttribute("data-preview-tone");
          notifications.playChime(toneVal);
          springBounce(btn);
        });
      });
      const openApiGuideBtn = document.getElementById("btn-open-api-guide");
      const modalApiGuide = document.getElementById("modal-api-guide");
      if (openApiGuideBtn && modalApiGuide) {
        openApiGuideBtn.addEventListener("click", () => {
          springBounce(openApiGuideBtn);
          modalApiGuide.classList.add("open");
          renderIcons(modalApiGuide);
        });
      }
      const keepAudioUnlocked = () => {
        notifications.unlockAudio();
      };
      window.addEventListener("click", keepAudioUnlocked, { passive: true });
      window.addEventListener("touchstart", keepAudioUnlocked, { passive: true });
      const testApiBtn = document.getElementById("btn-test-api");
      if (testApiBtn) {
        testApiBtn.addEventListener("click", () => this.handleTestApiKey());
      }
      const clearKeyBtn = document.getElementById("btn-clear-api-key");
      if (clearKeyBtn) {
        clearKeyBtn.addEventListener("click", () => this.handleClearSavedApiKey());
      }
      const toggleKeyBtn = document.getElementById("btn-toggle-key-visibility");
      const apiKeyInput = document.getElementById("setting-api-key");
      if (toggleKeyBtn && apiKeyInput) {
        toggleKeyBtn.addEventListener("click", () => {
          const isPassword = apiKeyInput.type === "password";
          apiKeyInput.type = isPassword ? "text" : "password";
          toggleKeyBtn.innerHTML = getIcon(isPassword ? "eye-off" : "eye", "", 16);
        });
      }
      const testGrokBtn = document.getElementById("btn-test-grok-api");
      if (testGrokBtn) {
        testGrokBtn.addEventListener("click", () => this.handleTestGrokApiKey());
      }
      const clearGrokBtn = document.getElementById("btn-clear-grok-api-key");
      if (clearGrokBtn) {
        clearGrokBtn.addEventListener("click", () => this.handleClearGrokApiKey());
      }
      const toggleGrokBtn = document.getElementById("btn-toggle-grok-key-visibility");
      const grokKeyInput = document.getElementById("setting-grok-api-key");
      if (toggleGrokBtn && grokKeyInput) {
        toggleGrokBtn.addEventListener("click", () => {
          const isPassword = grokKeyInput.type === "password";
          grokKeyInput.type = isPassword ? "text" : "password";
          toggleGrokBtn.innerHTML = getIcon(isPassword ? "eye-off" : "eye", "", 16);
        });
      }
      const btnExport = document.getElementById("btn-export-data");
      if (btnExport) {
        btnExport.addEventListener("click", () => this.handleExportData());
      }
      const btnImport = document.getElementById("btn-import-data");
      const inputImport = document.getElementById("input-import-file");
      if (btnImport && inputImport) {
        btnImport.addEventListener("click", () => inputImport.click());
        inputImport.addEventListener("change", (e) => this.handleImportData(e));
      }
      const btnSaveQuickNote = document.getElementById("btn-save-today-quick-note");
      const inputQuickNote = document.getElementById("today-quick-note-input");
      if (btnSaveQuickNote && inputQuickNote) {
        btnSaveQuickNote.addEventListener("click", () => {
          springBounce(btnSaveQuickNote);
          const val = inputQuickNote.value.trim();
          if (!val) {
            notifications.showToast("Tulis isi catatan terlebih dahulu.", "warning");
            return;
          }
          state.addNote("Memo Cepat", val);
          inputQuickNote.value = "";
          notifications.showToast("Memo cepat berhasil disimpan.", "success");
        });
      }
      const btnTodayAddSch = document.getElementById("btn-today-add-schedule");
      if (btnTodayAddSch) {
        btnTodayAddSch.addEventListener("click", () => {
          springBounce(btnTodayAddSch);
          this.openScheduleModal();
        });
      }
      const btnTodayPlanner = document.getElementById("btn-today-open-planner");
      if (btnTodayPlanner) {
        btnTodayPlanner.addEventListener("click", () => {
          springBounce(btnTodayPlanner);
          this.switchTab("ai-plan");
        });
      }
      const btnTodaySusun = document.getElementById("btn-today-susun-jadwal");
      if (btnTodaySusun) {
        btnTodaySusun.addEventListener("click", () => {
          springBounce(btnTodaySusun);
          this.switchTab("ai-plan");
          setTimeout(() => {
            const chatInput = document.getElementById("chat-input");
            if (chatInput) chatInput.focus();
          }, 150);
        });
      }
      const btnTodayNotes = document.getElementById("btn-today-view-notes");
      if (btnTodayNotes) {
        btnTodayNotes.addEventListener("click", () => {
          springBounce(btnTodayNotes);
          this.switchTab("notes");
        });
      }
      const btnShareToday = document.getElementById("btn-share-today");
      if (btnShareToday) {
        btnShareToday.addEventListener("click", () => {
          springBounce(btnShareToday);
          this.openShareModal(getLocalDateString());
        });
      }
      const btnShareSch = document.getElementById("btn-share-schedule");
      if (btnShareSch) {
        btnShareSch.addEventListener("click", () => {
          springBounce(btnShareSch);
          this.openShareModal(this.selectedScheduleDate);
        });
      }
      const btnManageCatSettings = document.getElementById("btn-settings-manage-categories");
      if (btnManageCatSettings) {
        btnManageCatSettings.addEventListener("click", () => {
          springBounce(btnManageCatSettings);
          this.openCategoryModal();
        });
      }
      const btnWeekPrev = document.getElementById("btn-week-prev");
      const btnWeekNext = document.getElementById("btn-week-next");
      const btnWeekToday = document.getElementById("btn-week-today");
      if (btnWeekPrev) {
        btnWeekPrev.addEventListener("click", () => {
          const d = /* @__PURE__ */ new Date(this.selectedScheduleDate + "T00:00:00");
          d.setDate(d.getDate() - 7);
          this.selectedScheduleDate = getLocalDateString(d);
          this.renderScheduleView();
        });
      }
      if (btnWeekNext) {
        btnWeekNext.addEventListener("click", () => {
          const d = /* @__PURE__ */ new Date(this.selectedScheduleDate + "T00:00:00");
          d.setDate(d.getDate() + 7);
          this.selectedScheduleDate = getLocalDateString(d);
          this.renderScheduleView();
        });
      }
      if (btnWeekToday) {
        btnWeekToday.addEventListener("click", () => {
          this.selectedScheduleDate = getLocalDateString();
          this.renderScheduleView();
        });
      }
      document.querySelectorAll(".duration-pill").forEach((pill) => {
        pill.addEventListener("click", () => {
          const min = parseInt(pill.getAttribute("data-min"), 10);
          const inputDuration2 = document.getElementById("sch-input-duration");
          const durLabel = document.getElementById("sch-duration-label");
          if (inputDuration2) {
            inputDuration2.value = min;
            if (durLabel) durLabel.textContent = `${min} menit`;
          }
          document.querySelectorAll(".duration-pill").forEach((p) => p.classList.remove("active"));
          pill.classList.add("active");
        });
      });
      const inputDuration = document.getElementById("sch-input-duration");
      if (inputDuration) {
        inputDuration.addEventListener("input", () => {
          const val = parseInt(inputDuration.value, 10) || 0;
          const durLabel = document.getElementById("sch-duration-label");
          if (durLabel) durLabel.textContent = `${val} menit`;
          document.querySelectorAll(".duration-pill").forEach((p) => {
            if (parseInt(p.getAttribute("data-min"), 10) === val) {
              p.classList.add("active");
            } else {
              p.classList.remove("active");
            }
          });
        });
      }
      const btnRefresh = document.getElementById("btn-refresh-page");
      if (btnRefresh) {
        btnRefresh.addEventListener("click", async () => {
          springBounce(btnRefresh);
          notifications.showToast("Memuat ulang aplikasi...", "info", 1200);
          if ("serviceWorker" in navigator) {
            try {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.update()));
            } catch (e) {
            }
          }
          setTimeout(() => {
            window.location.reload();
          }, 200);
        });
      }
      const btnToggleTheme = document.getElementById("btn-toggle-theme");
      if (btnToggleTheme) {
        btnToggleTheme.addEventListener("click", () => {
          springBounce(btnToggleTheme);
          const isCurrentlyLight = document.documentElement.getAttribute("data-theme") === "light";
          const nextTheme = isCurrentlyLight ? "dark" : "light";
          state.updateSettings({ theme: nextTheme });
          this.applyTheme(nextTheme);
          notifications.showToast(`Mode ${nextTheme === "light" ? "Terang" : "Gelap"} aktif.`, "info");
        });
      }
      document.querySelectorAll('input[name="setting-theme"]').forEach((radio) => {
        radio.addEventListener("change", (e) => {
          if (e.target.checked) {
            const selectedTheme = e.target.value;
            state.updateSettings({ theme: selectedTheme });
            this.applyTheme(selectedTheme);
            const label = selectedTheme === "system" ? "Sistem OS" : selectedTheme === "light" ? "Mode Terang" : "Mode Gelap";
            notifications.showToast(`Tema diatur ke ${label}.`, "info");
          }
        });
      });
      const btnCloseAlert = document.getElementById("btn-close-settings-alert");
      if (btnCloseAlert) {
        btnCloseAlert.addEventListener("click", () => {
          const alertBanner = document.getElementById("settings-save-alert");
          if (alertBanner) alertBanner.classList.add("hidden");
        });
      }
    }
    switchTab(tabId) {
      this.closeAllModals();
      this.currentTab = tabId;
      if (tabId === "ai-plan") {
        document.body.classList.add("tab-ai-plan");
        const badge = document.getElementById("ai-nav-badge");
        if (badge) badge.classList.add("hidden");
        const chatHistoryEl = document.getElementById("chat-history");
        if (chatHistoryEl) {
          requestAnimationFrame(() => {
            chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
          });
        }
      } else {
        document.body.classList.remove("tab-ai-plan");
      }
      document.querySelectorAll(".nav-tab").forEach((t) => {
        if (t.getAttribute("data-target") === tabId) {
          t.classList.add("active");
          t.setAttribute("aria-selected", "true");
        } else {
          t.classList.remove("active");
          t.setAttribute("aria-selected", "false");
        }
      });
      document.querySelectorAll(".view-tab").forEach((view) => {
        if (view.id === `view-${tabId}`) {
          view.classList.remove("hidden");
        } else {
          view.classList.add("hidden");
        }
      });
      const fabBtn = document.getElementById("fab-quick-add");
      if (fabBtn) {
        if (["schedule", "notes"].includes(tabId)) {
          fabBtn.classList.remove("hidden");
        } else {
          fabBtn.classList.add("hidden");
        }
      }
      this.render();
    }
    handleStateUpdate(event, data) {
      if (event === "settings:updated" && data && data.theme) {
        this.applyTheme(data.theme);
      }
      if (event === "ai:proactive-reminder") {
        const badge = document.getElementById("ai-nav-badge");
        if (badge && this.currentTab !== "ai-plan") {
          badge.classList.remove("hidden");
        }
      }
      this.render();
    }
    render() {
      switch (this.currentTab) {
        case "today":
          this.renderTodayView();
          break;
        case "schedule":
          this.renderScheduleView();
          break;
        case "ai-plan":
          this.renderAiPlanView();
          break;
        case "notes":
          this.renderNotesView();
          break;
        case "settings":
          this.renderSettingsView();
          break;
      }
      renderIcons();
    }
  };
  Object.assign(
    AppController.prototype,
    helperMethods,
    confirmDialogMethods,
    modalMethods,
    todayViewMethods,
    scheduleViewMethods,
    aiPlanViewMethods,
    notesViewMethods,
    settingsViewMethods
  );
  function bootstrapApp() {
    try {
      if (!window._actualDayflowApp) {
        const app = new AppController();
        window.dayflowApp = app;
        window._actualDayflowApp = app;
        app.init();
      }
    } catch (err) {
      console.error("Bootstrap critical error:", err);
      try {
        renderIcons();
      } catch (e) {
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapApp);
  } else {
    bootstrapApp();
  }
})();
