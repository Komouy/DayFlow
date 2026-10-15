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
    CATEGORIES: "dayflow_categories_v1"
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
    chatAutoSave: false
  };
  var StateManager = class {
    constructor() {
      this.subscribers = /* @__PURE__ */ new Set();
      this.schedules = this._load(STORAGE_KEYS.SCHEDULES, DEFAULT_SCHEDULES) || [];
      this.notes = this._load(STORAGE_KEYS.NOTES, DEFAULT_NOTES) || [];
      this.categories = this._load(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES) || DEFAULT_CATEGORIES;
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
          if (!s) return false;
          if (s.id && DUMMY_SCHEDULE_IDS.includes(s.id)) return false;
          const lowerTitle = (s.title || "").trim().toLowerCase();
          if (DUMMY_SCHEDULE_TITLES.includes(lowerTitle)) return false;
          return true;
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
    }
    _load(key, fallback) {
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
      const rawTitle = scheduleData.title || scheduleData.kegiatan || scheduleData.activity || scheduleData.task || scheduleData.name || "Kegiatan Baru";
      const safeTitle = String(rawTitle).trim() || "Kegiatan Baru";
      const safeDate = normalizeDateString(scheduleData.date);
      const safeTime = normalizeTimeString(scheduleData.time);
      const newSchedule = {
        id: "sch_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
        date: safeDate,
        time: safeTime,
        duration: Math.max(5, parseInt(scheduleData.duration || scheduleData.durasi, 10) || 30),
        title: safeTitle,
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
      this.notify("schedule:added", newSchedule);
      return newSchedule;
    }
    addSchedules(schedulesArray) {
      if (!Array.isArray(schedulesArray) || schedulesArray.length === 0) return [];
      const newSchedules = [];
      const baseTime = Date.now();
      schedulesArray.forEach((item, index) => {
        if (!item || typeof item !== "object") return;
        const rawTitle = item.title || item.kegiatan || item.activity || item.task || item.name || "Kegiatan Baru";
        const safeTitle = String(rawTitle).trim() || "Kegiatan Baru";
        const safeDate = normalizeDateString(item.date);
        const safeTime = normalizeTimeString(item.time);
        const newSchedule = {
          id: "sch_" + (baseTime + index) + "_" + Math.random().toString(36).substr(2, 6),
          date: safeDate,
          time: safeTime,
          duration: Math.max(5, parseInt(item.duration || item.durasi, 10) || 30),
          title: safeTitle,
          category: item.category && typeof item.category === "string" ? item.category.trim() : item.kategori || "Fokus",
          priority: ["low", "medium", "high"].includes(item.priority) ? item.priority : "medium",
          deadline: item.deadline ? normalizeDateString(item.deadline) : null,
          reminder: item.reminder !== false,
          recurrence: ["none", "daily", "weekdays", "weekly", "monthly"].includes(item.recurrence) ? item.recurrence : "none",
          completedDates: Array.isArray(item.completedDates) ? item.completedDates : [],
          completed: !!item.completed,
          createdAt: baseTime + index
        };
        newSchedules.push(newSchedule);
      });
      if (newSchedules.length > 0) {
        this.schedules.push(...newSchedules);
        this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
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
        this.schedules[idx] = { ...this.schedules[idx], ...cleanUpdates };
        this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
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
        return this.updateSchedule(id, { completedDates: compDates });
      } else {
        return this.updateSchedule(id, { completed: !item.completed });
      }
    }
    deleteSchedule(id) {
      this.schedules = this.schedules.filter((s) => s.id !== id);
      this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
      this.notify("schedule:deleted", id);
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
    repeat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`
  };
  function getIcon(name, extraClass = "", size = 18) {
    const svg = icons[name] || icons.circle;
    return svg.replace("<svg ", `<svg class="df-icon ${extraClass}" width="${size}" height="${size}" aria-hidden="true" `);
  }
  function renderIcons(root = document, force = false) {
    const selector = force ? "[data-icon]" : '[data-icon]:not([data-icon-rendered="true"])';
    root.querySelectorAll(selector).forEach((el) => {
      const name = el.getAttribute("data-icon");
      const size = parseInt(el.getAttribute("data-icon-size") || "18", 10);
      const extraClass = el.getAttribute("data-icon-class") || "";
      el.innerHTML = getIcon(name, extraClass, size);
      el.setAttribute("data-icon-rendered", "true");
    });
  }

  // js/notifications.js
  var NotificationService = class {
    constructor() {
      this.audioCtx = null;
      this.notifiedSet = /* @__PURE__ */ new Set();
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
        if (this.audioCtx && this.audioCtx.state === "suspended") {
          this.audioCtx.resume();
        }
      } catch (e) {
        console.warn("Audio unlock warning:", e);
      }
    }
    // Synthesize crystal-clear, loud, harmonic acoustic bell chime via Web Audio API
    async playChime(overrideTone = null) {
      const settings = state.getSettings();
      if (!settings.soundEnabled) return;
      const tone = overrideTone || settings.soundTone || "crystal";
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!this.audioCtx) {
          this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx.state === "suspended") {
          await this.audioCtx.resume();
        }
        const ctx = this.audioCtx;
        const now = ctx.currentTime;
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
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = waveType;
          osc1.frequency.setValueAtTime(freq, startTime);
          gain1.gain.setValueAtTime(0, startTime);
          gain1.gain.linearRampToValueAtTime(gainLevel, startTime + 0.012);
          gain1.gain.exponentialRampToValueAtTime(1e-4, startTime + duration);
          osc1.connect(gain1);
          gain1.connect(compressor);
          osc1.start(startTime);
          osc1.stop(startTime + duration);
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(freq * 2.008, startTime);
          gain2.gain.setValueAtTime(0, startTime);
          gain2.gain.linearRampToValueAtTime(gainLevel * 0.45, startTime + 0.01);
          gain2.gain.exponentialRampToValueAtTime(1e-4, startTime + duration * 0.7);
          osc2.connect(gain2);
          gain2.connect(compressor);
          osc2.start(startTime);
          osc2.stop(startTime + duration * 0.7);
          const osc3 = ctx.createOscillator();
          const gain3 = ctx.createGain();
          osc3.type = "sine";
          osc3.frequency.setValueAtTime(freq * 3.015, startTime);
          gain3.gain.setValueAtTime(0, startTime);
          gain3.gain.linearRampToValueAtTime(gainLevel * 0.25, startTime + 8e-3);
          gain3.gain.exponentialRampToValueAtTime(1e-4, startTime + 0.3);
          osc3.connect(gain3);
          gain3.connect(compressor);
          osc3.start(startTime);
          osc3.stop(startTime + 0.3);
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
        console.warn("Audio chime playback error:", e);
      }
    }
    async requestPermission() {
      if (!("Notification" in window)) {
        this.showToast("Browser ini tidak mendukung Web Notifications.", "warning");
        return false;
      }
      if (Notification.permission === "granted") {
        this.showToast("Izin notifikasi sudah aktif.", "success");
        return true;
      }
      try {
        const result = await Notification.requestPermission();
        if (result === "granted") {
          this.showToast("Izin notifikasi berhasil diaktifkan.", "success");
          this.playChime();
          return true;
        } else {
          this.showToast("Izin notifikasi ditolak oleh pengguna.", "warning");
          return false;
        }
      } catch (e) {
        console.error("Error requesting notification permission:", e);
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
          const alertMsg = `${schedule.title} (${schedule.time}) - ${timeLabel}`;
          this.playChime();
          this.showToast(alertMsg, "warning", 6e3);
          if ("Notification" in window && Notification.permission === "granted") {
            const notifOptions = {
              body: alertMsg,
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              tag: schedule.id,
              renotify: true
            };
            if ("serviceWorker" in navigator && navigator.serviceWorker.ready) {
              navigator.serviceWorker.ready.then((reg) => {
                return reg.showNotification("DayFlow Pengingat Jadwal", notifOptions);
              }).catch(() => {
                try {
                  new Notification("DayFlow Pengingat Jadwal", notifOptions);
                } catch (err) {
                  console.warn("Notification constructor fallback warning:", err);
                }
              });
            } else {
              try {
                new Notification("DayFlow Pengingat Jadwal", notifOptions);
              } catch (err) {
                console.warn("Native notification spawn warning:", err);
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
      if ("Notification" in window && Notification.permission === "granted") {
        const notifOptions = {
          body: message,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: `proactive_${currentSlot}_${todayStr}`,
          renotify: true
        };
        if ("serviceWorker" in navigator && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then((reg) => {
            return reg.showNotification(`DayFlow AI \u2022 ${slotTitle}`, notifOptions);
          }).catch(() => {
            try {
              new Notification(`DayFlow AI \u2022 ${slotTitle}`, notifOptions);
            } catch (e) {
            }
          });
        } else {
          try {
            new Notification(`DayFlow AI \u2022 ${slotTitle}`, notifOptions);
          } catch (e) {
          }
        }
      }
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
      lines.push(`- ${s.time} (${dur}m): ${s.title}${cat}${status}`);
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
    const details = encodeURIComponent(`Kategori: ${schedule.category || "Kerja"} | Disusun dengan DayFlow AI`);
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
      return [
        "BEGIN:VEVENT",
        `UID:${s.id || Date.now() + Math.random()}@dayflow.web.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${cleanTitle}`,
        `DESCRIPTION:Kategori: ${s.category || "Kerja"} | Disusun dengan DayFlow AI`,
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
    // Version identifier
    VERSION: "6.2.0"
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
8. Tugas penting dengan tenggat/deadline mendatang:
{DEADLINE_TASKS}
Jika pengguna meminta bantuan mencicil tugas deadline (misalnya tugas deadline hari Minggu), berikan pemecahan sub-task taktis dan alokasi waktu yang realistis agar tidak menumpuk.
9. AKSI PENJADWALAN CERDAS (ACTIONABLE SCHEDULE EXECUTION):
Ketika pengguna meminta dibuatkan jadwal, menyebutkan rutinitas/rencana kegiatan (contoh: "jadwalkan besok jam 8 koding", "setiap hari jam 6 pagi lari santai", "ingatkan kumpul tugas hari senin jam 5 sore", atau informasi perkuliahan/kegiatan seperti "jadwal kuliah DDP jam 08.00 - selesai"):
- Tuliskan jawaban percakapan yang ramah, ringkas, dan jelas dalam Bahasa Indonesia.
- DI BAGIAN PALING AKHIR responmu, sertakan blok JSON kegiatan terstruktur di dalam tag khusus:
[DAYFLOW_SCHEDULES]
[
  {
    "title": "Judul ringkas kegiatan (3-6 kata)",
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
- Tentukan "recurrence" secara tepat jika berulang: "daily" (setiap hari), "weekdays" (hari kerja), "weekly" (mingguan), "monthly" (bulanan), atau "none".
- Jika item berupa tugas bertenggat (deadline/pengumpulan/submit), isi "deadline" ("YYYY-MM-DD") dan set "priority": "high".
- Jika pengguna HANYA mengobrol santai, konsultasi, atau bertanya tips umum TANPA menyebut atau meminta jadwal kegiatan, JANGAN sertakan tag [DAYFLOW_SCHEDULES].
- JANGAN PERNAH menambahkan kegiatan fiktif/pengisi (seperti istirahat/persiapan) yang tidak diminta!
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
    /**
     * Returns true if AI is operational (either via secure proxy or API key)
     */
    static isAiReady() {
      return Boolean(this.getProxyUrl() || this.getApiKey());
    }
    static getModel() {
      return state.getSettings().geminiModel || APP_CONFIG.DEFAULT_MODEL || "gemini-2.5-flash";
    }
    static buildSystemPrompt() {
      const todaySchedules = state.getTodaySchedules();
      const deadlineTasks = state.getDeadlineTasks();
      const now = /* @__PURE__ */ new Date();
      const timeStr = now.toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }) + " " + now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const scheduleListText = todaySchedules.length > 0 ? todaySchedules.map((s) => `- [${s.time} | ${s.duration}m | Prioritas: ${s.priority || "medium"}] ${s.title} (${s.completed ? "Selesai" : "Belum"})`).join("\n") : "(Belum ada jadwal hari ini)";
      const deadlineListText = deadlineTasks.length > 0 ? deadlineTasks.map((s) => `- Tugas: "${s.title}" (Tenggat: ${s.deadline}, Prioritas: ${s.priority || "medium"})`).join("\n") : "(Tidak ada tugas dengan tenggat khusus)";
      return SYSTEM_INSTRUCTION_BASE.replace("{CURRENT_DATETIME}", timeStr).replace("{TODAY_SCHEDULES}", scheduleListText).replace("{DEADLINE_TASKS}", deadlineListText);
    }
    /**
     * Resilient request sender routing through Serverless Proxy or direct Google Gemini with auto-failover
     */
    static async requestGenerateContent(payload) {
      const apiKey = this.getApiKey();
      const proxyUrl = this.getProxyUrl();
      const userPersonalKey = (state.getSettings().apiKey || "").trim();
      if (!apiKey && !proxyUrl) {
        throw new Error("Layanan AI belum siap. Konfigurasi AI Gateway atau masukkan API Key di Pengaturan.");
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
              throw lastError;
            }
          } catch (err) {
            if (err.message && (err.message.includes("API_KEY_INVALID") || err.message.includes("403"))) {
              throw err;
            }
            lastError = err;
          }
        }
        throw lastError || new Error("Gagal menghubungi Serverless AI Proxy.");
      }
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
            throw lastError;
          }
        } catch (err) {
          if (err.message && (err.message.includes("API_KEY_INVALID") || err.message.includes("403"))) {
            throw err;
          }
          lastError = err;
        }
      }
      throw lastError || new Error("Gagal memproses permintaan AI.");
    }
    /**
     * General Chat with Gemini
     */
    static async sendChatMessage(userText) {
      const systemPrompt = this.buildSystemPrompt();
      const rawHistory = state.getChatHistory().slice(-10);
      const mapped = [];
      rawHistory.forEach((msg) => {
        if (!msg) return;
        const text = typeof msg.text === "string" ? msg.text.trim() : "";
        if (!text) return;
        const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
        mapped.push({ role, text });
      });
      const lastMapped = mapped[mapped.length - 1];
      if (!lastMapped || lastMapped.role !== "user" || lastMapped.text !== userText.trim()) {
        mapped.push({ role: "user", text: userText.trim() });
      }
      const normalizedTurns = [];
      for (const item of mapped) {
        if (normalizedTurns.length > 0 && normalizedTurns[normalizedTurns.length - 1].role === item.role) {
          normalizedTurns[normalizedTurns.length - 1].parts[0].text += `

${item.text}`;
        } else {
          normalizedTurns.push({
            role: item.role,
            parts: [{ text: item.text }]
          });
        }
      }
      if (normalizedTurns.length > 0 && normalizedTurns[0].role === "model") {
        normalizedTurns.unshift({
          role: "user",
          parts: [{ text: "Halo DayFlow, tolong bantu aku menata jadwal dan rencanaku." }]
        });
      }
      if (normalizedTurns.length === 0) {
        normalizedTurns.push({
          role: "user",
          parts: [{ text: userText.trim() || "Halo" }]
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
          maxOutputTokens: 1e3
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
  };

  // js/components/modals.js
  var modalMethods = {
    openScheduleModal(scheduleId = null) {
      this.closeAllModals();
      this.editingScheduleId = scheduleId;
      const modal = document.getElementById("modal-schedule");
      const titleEl = document.getElementById("modal-schedule-title");
      const inputTitle = document.getElementById("sch-input-title");
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
      modal.classList.add("open");
      setTimeout(() => inputTitle.focus(), 150);
    },
    handleSaveSchedule(e) {
      e.preventDefault();
      const inputTitle = document.getElementById("sch-input-title");
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
    initRealtimeClock() {
      const updateClock = () => {
        const clockEl = document.getElementById("banner-live-clock");
        if (!clockEl) return;
        const now = /* @__PURE__ */ new Date();
        const h = String(now.getHours()).padStart(2, "0");
        const m = String(now.getMinutes()).padStart(2, "0");
        const s = String(now.getSeconds()).padStart(2, "0");
        clockEl.textContent = `${h}:${m}:${s}`;
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
      this.renderTimelineGrid(schedules, listEl, false);
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
          if (!sch?.completed) {
            particleBurst(toggleBtn, "var(--status-success)");
          }
          springBounce(toggleBtn);
          state.toggleScheduleComplete(id, targetDate);
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
          <p class="empty-state-desc">Gunakan tombol tambah di atas atau gunakan Rencana AI untuk merapikan kegiatanmu.</p>
          ${carryOverBtnHtml}
        </div>
      `;
        renderIcons(containerEl);
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
      containerEl.innerHTML = schedules.map((s) => {
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
        return `
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

          <!-- Column 3: Card Content -->
          <div class="timeline-card-col">
            <div class="timeline-card">
              <div class="timeline-card-header">
                <div style="display:flex; flex-direction:column; gap:4px; min-width:0; flex:1;">
                  <div class="timeline-card-title">${escapeHtml(s.title)}</div>
                  <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                    ${priorityBadgeHtml}
                    ${recurrenceBadgeHtml}
                    ${deadlineBadgeHtml}
                    ${conflictBadgeHtml}
                  </div>
                </div>
                ${catBadgeHtml}
              </div>

              <div class="timeline-card-footer">
                <div class="timeline-duration-tag">
                  ${getIcon("clock", "", 12)}
                  <span class="tabular-nums">${timeSpanText} (${s.duration} min)</span>
                  ${isActive ? '<span class="status-live-tag">Aktif</span>' : ""}
                </div>

                <div class="timeline-card-actions">
                  <a href="${gcalUrl}" 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     class="btn btn-ghost btn-xs" 
                     title="Buka di Google Calendar" 
                     aria-label="Buka di Google Calendar"
                     style="display:inline-flex; align-items:center; color:var(--text-secondary);">
                    ${getIcon("calendar", "", 13)}
                  </a>
                  <button class="btn btn-ghost btn-xs btn-check ${s.completed ? "is-done" : ""}" 
                          data-action="toggle-complete" 
                          data-id="${s.id}" 
                          data-date="${s.date}"
                          title="${s.completed ? "Tandai belum selesai" : "Tandai selesai"}">
                    ${getIcon(s.completed ? "check-circle" : "circle", "", 14)}
                    <span>${s.completed ? "Selesai" : "Check"}</span>
                  </button>
                  <button class="btn btn-ghost btn-xs" data-action="edit-schedule" data-id="${s.id}" title="Ubah">
                    ${getIcon("edit", "", 13)}
                  </button>
                  <button class="btn btn-ghost btn-xs text-muted" data-action="delete-schedule" data-id="${s.id}" title="Hapus">
                    ${getIcon("trash", "", 13)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      }).join("");
      renderIcons(containerEl);
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
      for (let chunk of rawChunks) {
        if (!chunk || chunk.length < 3) continue;
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
                if (diff <= 0) diff += 7;
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
        let category = isDeadline ? "Kerja" : "Fokus";
        if (/kesehatan|olahraga|jogging|lari|gym|sehat|tidur|istirahat|meditasi/i.test(chunk)) category = "Kesehatan";
        else if (/kerja|kantor|meeting|rapat|proyek|klien|tugas|evaluasi|koding|coding|skripsi|laporan|magang|revisi|kuliah|matkul|ddp|kampus|dosen/i.test(chunk)) category = "Kerja";
        else if (/pribadi|makan|sarapan|santai|keluarga|hobi|belanja|jalan|nonton|film|bioskop/i.test(chunk)) category = "Pribadi";
        let title = chunk;
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
        title = title.replace(/\b(?:ya|yah|dong|deh|nih|sih|pliss?|please|oke|ok|gas|gasken)\b/gi, "");
        title = title.replace(/\((?:[^)]*)\)/g, "").replace(/\[(?:[^\]]*)\]/g, "");
        title = title.replace(/[:\-–—.,;!?]+/g, " ").replace(/\s+/g, " ").trim();
        if (title.length >= 2) {
          title = title.split(" ").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        } else {
          title = isDeadline ? "Kumpul Tugas Bertenggat" : "Kegiatan Terjadwal";
        }
        items.push({
          title,
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
      const tagMatch = rawText.match(/\[DAYFLOW_SCHEDULES\]([\s\S]*?)\[\/DAYFLOW_SCHEDULES\]/i);
      if (tagMatch) {
        try {
          let jsonStr = tagMatch[1].trim();
          jsonStr = jsonStr.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const categories = state.getCategories();
            const todayDate = getLocalDateString();
            schedules = parsed.map((item) => {
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
                title: String(item.title || item.kegiatan || "Kegiatan Baru").trim(),
                date: normalizeDateString(item.date, todayDate),
                time: normalizeTimeString(item.time),
                duration: Math.max(5, parseInt(item.duration, 10) || 30),
                category: finalCat,
                recurrence: finalRec,
                deadline: cleanDeadline,
                priority: ["high", "medium", "low"].includes(item.priority) ? item.priority : cleanDeadline ? "high" : "medium",
                reminder: item.reminder !== false
              };
            });
          }
        } catch (err) {
          console.warn("Failed parsing [DAYFLOW_SCHEDULES] tag:", err);
        }
        cleanText = rawText.replace(/\[DAYFLOW_SCHEDULES\][\s\S]*?\[\/DAYFLOW_SCHEDULES\]/gi, "").trim();
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
      const chatHistoryEl = document.getElementById("chat-history");
      if (chatHistoryEl) {
        this.setupChatDelegation(chatHistoryEl);
        const history = state.getChatHistory();
        chatHistoryEl.innerHTML = history.map((msg, idx) => {
          if (msg.role === "user") {
            return `
            <div class="chat-bubble chat-bubble-user">
              <div class="chat-bubble-content">${formatMarkdown(msg.text)}</div>
              <div class="chat-meta text-muted" style="font-size: 10px; margin-top: 4px; text-align: right;">
                ${new Date(msg.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          `;
          }
          const { cleanText, schedules } = this.extractSchedulesFromAssistantMessage(msg.text);
          let scheduleCardHtml = "";
          if (schedules.length > 0) {
            const targetDate = schedules[0].date || getLocalDateString();
            const displayDate = (/* @__PURE__ */ new Date(targetDate + "T00:00:00")).toLocaleDateString("id-ID", {
              weekday: "short",
              day: "numeric",
              month: "short"
            });
            const itemsHtml = schedules.map((item) => {
              let badgesHtml = "";
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
              <div class="chat-schedule-item-row">
                <span class="chat-schedule-item-time tabular-nums">${item.time}</span>
                <span class="chat-schedule-item-title">${escapeHtml(item.title)}</span>
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
          return `
          <div class="chat-bubble chat-bubble-assistant">
            <div class="chat-bubble-content">${formatMarkdown(cleanText || msg.text)}</div>
            ${scheduleCardHtml}
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
      if (!text) return;
      input.value = "";
      state.addChatMessage("user", text);
      this.renderAiPlanView();
      const submitBtn = document.getElementById("chat-submit-btn");
      if (submitBtn) submitBtn.disabled = true;
      const autoSaveToggle = document.getElementById("chat-auto-save-toggle");
      const shouldAutoSave = autoSaveToggle ? autoSaveToggle.checked : !!state.getSettings().chatAutoSave;
      try {
        const reply = await GeminiService.sendChatMessage(text);
        const { schedules } = this.extractSchedulesFromAssistantMessage(reply);
        let isSaved = false;
        if (shouldAutoSave && schedules && schedules.length > 0) {
          state.addSchedules(schedules);
          isSaved = true;
          notifications.playChime();
          notifications.showToast(`${schedules.length} agenda otomatis dimasukkan ke jadwal!`, "success");
        }
        state.addChatMessage("assistant", reply, false, { savedSchedules: isSaved });
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
        listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${getIcon("file-text", "", 20)}</div>
          <p class="empty-state-title">Belum ada catatan</p>
          <p class="empty-state-desc">Catat ide cepat, ringkasan rapat, atau memo harian di sini.</p>
        </div>
      `;
        renderIcons(listEl);
        return;
      }
      listEl.innerHTML = filtered.map((note) => {
        const dateObj = note.updatedAt && !isNaN(new Date(note.updatedAt).getTime()) ? new Date(note.updatedAt) : /* @__PURE__ */ new Date();
        const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        return `
      <div class="note-card" data-note-id="${note.id}">
        <div class="note-card-title">${escapeHtml(note.title || "Catatan Tanpa Judul")}</div>
        <div class="note-card-preview">${escapeHtml(note.content || "")}</div>
        <div class="note-card-footer">
          <span>${dateStr}</span>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-ghost btn-sm" data-action="edit-note" data-id="${note.id}" aria-label="Ubah catatan">
              ${getIcon("edit", "", 14)}
            </button>
            <button class="btn btn-ghost btn-sm text-muted" data-action="delete-note" data-id="${note.id}" aria-label="Hapus catatan">
              ${getIcon("trash", "", 14)}
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
            notifications.showToast("Masukkan kata kunci pencarian terlebih dahulu.", "warning");
            return;
          }
          btnAiSearch.disabled = true;
          btnAiSearch.innerHTML = `<span class="spinner"></span> Mencari...`;
          try {
            const result = await GeminiService.searchNotesWithAI(query, state.getNotes());
            notifications.showToast(`Temuan AI: ${result}`, "info", 6e3);
          } catch (err) {
            notifications.showToast(err.message, "error");
          } finally {
            btnAiSearch.disabled = false;
            btnAiSearch.innerHTML = `${getIcon("search", "", 14)} Cari`;
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
      if (apiInput) apiInput.value = settings.apiKey || "";
      if (modelSelect) modelSelect.value = settings.geminiModel || APP_CONFIG.DEFAULT_MODEL || "gemini-2.5-flash";
      if (advanceInput) advanceInput.value = settings.notifyAdvanceMinutes || 15;
      const badgeEl = document.getElementById("central-ai-status-badge");
      if (badgeEl) {
        if (settings.apiKey) {
          badgeEl.style.background = "rgba(234, 88, 12, 0.12)";
          badgeEl.style.color = "#ea580c";
          badgeEl.style.borderColor = "rgba(234, 88, 12, 0.25)";
          badgeEl.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:#ea580c; display:inline-block;"></span> Key Pribadi Aktif`;
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
      this.renderSettingsCategoriesPreview();
    },
    updateModelPickerUI(modelId = "gemini-2.5-flash") {
      const hiddenInput = document.getElementById("setting-model");
      if (hiddenInput) hiddenInput.value = "gemini-2.5-flash";
      const nameEl = document.getElementById("current-model-name");
      const descEl = document.getElementById("current-model-desc");
      if (nameEl) nameEl.textContent = "Gemini 2.5 Flash";
      if (descEl) descEl.textContent = "Respon luas, penalaran terperinci & hemat kuota token";
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
      state.updateSettings({
        userName: userNameInput ? userNameInput.value.trim() : "",
        heroBannerEnabled: bannerEnabledToggle ? bannerEnabledToggle.checked : false,
        hasConfiguredBanner: bannerEnabledToggle && bannerEnabledToggle.checked || state.getSettings().hasConfiguredBanner || false,
        heroBannerQuote: bannerQuoteInput ? bannerQuoteInput.value.trim() : "Fokus pada hal penting hari ini.",
        heroBannerUrl: bannerUrlInput ? bannerUrlInput.value.trim() : "",
        apiKey: apiInput ? apiInput.value.trim() : "",
        geminiModel: modelSelect ? modelSelect.value : "gemini-2.5-flash",
        notifyAdvanceMinutes: parseInt(advanceInput ? advanceInput.value : "15", 10) || 15,
        soundEnabled: soundToggle ? soundToggle.checked : true,
        soundTone: selectedTone,
        proactiveReminders: proactiveToggle ? proactiveToggle.checked : true,
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
    handleExportData() {
      const backup = {
        version: 1,
        timestamp: Date.now(),
        schedules: state.schedules,
        notes: state.notes,
        categories: state.getCategories(),
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
      window.dayflowApp = this;
      window._actualDayflowApp = this;
    }
    init() {
      try {
        this.applyTheme(state.getSettings().theme || "dark");
        this.setupThemeListener();
        notifications.init();
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
        notifBtn.addEventListener("click", () => {
          notifications.requestPermission();
        });
      }
      const testAudioBtn = document.getElementById("btn-test-chime");
      if (testAudioBtn) {
        testAudioBtn.addEventListener("click", () => {
          const toneInput = document.getElementById("setting-sound-tone");
          const selectedTone = toneInput ? toneInput.value : "crystal";
          notifications.playChime(selectedTone);
          const toneNames = {
            crystal: "Crystal Bell",
            marimba: "Marimba",
            digital: "Digital Pulse"
          };
          const name = toneNames[selectedTone] || "Crystal Bell";
          notifications.showToast(`Bel akustik (${name}) diputar.`, "info");
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
      const unlockAudioHandler = () => {
        notifications.unlockAudio();
        window.removeEventListener("click", unlockAudioHandler);
        window.removeEventListener("touchstart", unlockAudioHandler);
      };
      window.addEventListener("click", unlockAudioHandler, { passive: true });
      window.addEventListener("touchstart", unlockAudioHandler, { passive: true });
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
        const badge = document.getElementById("ai-nav-badge");
        if (badge) badge.classList.add("hidden");
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
