/**
 * DayFlow Reactive State Manager
 * Zero-slop, robust local-first storage with pub/sub architecture.
 */

// Helper to get local date string YYYY-MM-DD avoiding UTC offset shift
export function getLocalDateString(d = new Date()) {
  const validDate = (d instanceof Date && !isNaN(d.getTime())) ? d : new Date();
  const year = validDate.getFullYear();
  const month = String(validDate.getMonth() + 1).padStart(2, '0');
  const day = String(validDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Robust Date Normalizer: Ensures strict YYYY-MM-DD format
export function normalizeDateString(dateVal, fallbackDate = null) {
  const fallback = fallbackDate || getLocalDateString();
  if (!dateVal) return fallback;
  if (typeof dateVal !== 'string') {
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      return getLocalDateString(dateVal);
    }
    return fallback;
  }

  const trimmed = dateVal.trim();
  if (!trimmed) return fallback;

  // Relative Indonesian / English terms
  const lower = trimmed.toLowerCase();
  if (lower === 'hari ini' || lower === 'today') {
    return getLocalDateString();
  }
  if (lower === 'besok' || lower === 'esok' || lower === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateString(d);
  }
  if (lower === 'lusa') {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return getLocalDateString(d);
  }

  // Standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    return trimmed.replace(/\//g, '-');
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Parse via standard Date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return getLocalDateString(parsed);
  }

  return fallback;
}

// Robust Time Normalizer: Ensures strict HH:MM 24-hour format
export function normalizeTimeString(timeVal) {
  if (!timeVal) return '09:00';
  const str = String(timeVal).trim();
  if (!str) return '09:00';

  // Handle dot notation like 08.30 or 8.30
  let cleaned = str.replace(/[.]/g, ':');

  // Handle AM/PM
  const ampmMatch = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPm = ampmMatch[3].toLowerCase() === 'pm';
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  // Standard H:MM or HH:MM
  const match = cleaned.match(/(\d{1,2}):(\d{1,2})/);
  if (match) {
    const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
    const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Just hour like "8" or "14"
  const hourOnly = cleaned.match(/\b(\d{1,2})\b/);
  if (hourOnly) {
    const h = Math.min(23, Math.max(0, parseInt(hourOnly[1], 10)));
    return `${String(h).padStart(2, '0')}:00`;
  }

  return '09:00';
}


const STORAGE_KEYS = {
  SCHEDULES: 'dayflow_schedules_v1',
  NOTES: 'dayflow_notes_v1',
  SETTINGS: 'dayflow_settings_v1',
  CHAT_HISTORY: 'dayflow_chat_history_v1',
  CATEGORIES: 'dayflow_categories_v1'
};

// Default system categories
export const DEFAULT_CATEGORIES = [
  { id: 'cat_kerja', name: 'Kerja', color: '#f97316', isDefault: true },
  { id: 'cat_fokus', name: 'Fokus', color: '#38bdf8', isDefault: true },
  { id: 'cat_pribadi', name: 'Pribadi', color: '#c084fc', isDefault: true },
  { id: 'cat_kesehatan', name: 'Kesehatan', color: '#34d399', isDefault: true }
];

// Curated harmonious color palette for custom categories (Anti-Slop)
export const CATEGORY_PALETTE = [
  '#f97316', // Orange
  '#38bdf8', // Sky Blue
  '#c084fc', // Purple
  '#34d399', // Emerald
  '#f43f5e', // Rose
  '#fbbf24', // Amber
  '#818cf8', // Indigo
  '#2dd4bf', // Teal
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#a855f7', // Violet
  '#84cc16'  // Lime
];

// Default initial data for new users (Clean slate: zero dummy items)
const DEFAULT_SCHEDULES = [];
const DEFAULT_NOTES = [];

export const BANNER_PRESETS = [
  {
    id: 'tokyo_lofi',
    name: 'Tokyo Rain Lo-Fi',
    tag: 'TOKYO • LO-FI',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=300&auto=format&fit=crop&q=70',
    vibe: 'Neon City Rain & Reflections'
  },
  {
    id: 'sunset_clouds',
    name: 'Sunset Pastel Horizon',
    tag: 'GOLDEN HOUR',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=70',
    vibe: 'Warm Golden Hour Clouds'
  },
  {
    id: 'cozy_study',
    name: 'Cozy Study Cafe',
    tag: 'DEEP FOCUS',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&auto=format&fit=crop&q=70',
    vibe: 'Warm Wood & Rainy Window'
  },
  {
    id: 'cyber_grid',
    name: 'Cyberpunk Synthwave',
    tag: 'SYNTHWAVE',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=70',
    vibe: 'Laser Neon Grid & Skyline'
  },
  {
    id: 'cosmic_aurora',
    name: 'Northern Aurora',
    tag: 'AURORA GLOW',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&auto=format&fit=crop&q=80',
    thumb: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=300&auto=format&fit=crop&q=70',
    vibe: 'Emerald Northern Lights'
  },
  {
    id: 'ambient_mesh',
    name: 'Motion Mesh (Offline)',
    tag: 'DYNAMIC MESH',
    type: 'mesh',
    url: '',
    thumb: '',
    vibe: 'Animated Gradient Mesh'
  }
];

// IndexedDB Banner Store (Guarantees zero-quota-crash for large videos & images)
const IDB_BANNER_DB = 'dayflow_banner_store_v1';
const IDB_STORE_NAME = 'media_files';

export function openBannerIDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
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

export async function saveCustomBannerMedia(blob, mediaType, filename = 'banner') {
  try {
    const db = await openBannerIDB();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put({ blob, mediaType, filename, timestamp: Date.now() }, 'active_banner');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save banner to IndexedDB:', err);
    return false;
  }
}

export async function getCustomBannerMedia() {
  try {
    const db = await openBannerIDB();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get('active_banner');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load banner from IndexedDB:', err);
    return null;
  }
}

export async function deleteCustomBannerMedia() {
  try {
    const db = await openBannerIDB();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.delete('active_banner');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to delete banner from IndexedDB:', err);
    return false;
  }
}

const DEFAULT_SETTINGS = {
  userName: '',
  apiKey: '',
  geminiModel: 'gemini-2.5-flash',
  notifyAdvanceMinutes: 15,
  soundEnabled: true,
  soundTone: 'crystal',
  proactiveReminders: true,
  theme: 'dark',
  heroBannerEnabled: false,
  hasConfiguredBanner: false,
  heroBannerSource: 'preset',
  heroBannerPreset: 'tokyo_lofi',
  heroBannerMediaType: 'image',
  heroBannerUrl: '',
  heroBannerHeight: 'normal',
  heroBannerOverlay: 'medium',
  heroBannerQuote: 'Fokus pada hal penting hari ini.'
};

class StateManager {
  constructor() {
    this.subscribers = new Set();
    this.schedules = this._load(STORAGE_KEYS.SCHEDULES, DEFAULT_SCHEDULES) || [];
    this.notes = this._load(STORAGE_KEYS.NOTES, DEFAULT_NOTES) || [];
    this.categories = this._load(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES) || DEFAULT_CATEGORIES;

    // Auto-clean legacy dummy seed schedules (sch_1..sch_4)
    const DUMMY_SCHEDULE_IDS = ['sch_1', 'sch_2', 'sch_3', 'sch_4'];
    const DUMMY_SCHEDULE_TITLES = [
      'review rencana & prioritas harian',
      'sinkronisasi tim & update proyek',
      'makan siang & istirahat',
      'deep work: eksekusi tugas utama'
    ];
    if (Array.isArray(this.schedules)) {
      const prevSchedCount = this.schedules.length;
      this.schedules = this.schedules.filter(s => {
        if (!s) return false;
        if (s.id && DUMMY_SCHEDULE_IDS.includes(s.id)) return false;
        const lowerTitle = (s.title || '').trim().toLowerCase();
        if (DUMMY_SCHEDULE_TITLES.includes(lowerTitle)) return false;
        return true;
      });
      if (this.schedules.length !== prevSchedCount) {
        this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
      }
    }

    // Auto-clean legacy dummy seed notes (note_1..note_2)
    const DUMMY_NOTE_IDS = ['note_1', 'note_2'];
    const DUMMY_NOTE_TITLES = [
      'prinsip produktivitas harian',
      'daftar kebutuhan proyek ai'
    ];
    if (Array.isArray(this.notes)) {
      const prevNotesCount = this.notes.length;
      this.notes = this.notes.filter(n => {
        if (!n) return false;
        if (n.id && DUMMY_NOTE_IDS.includes(n.id)) return false;
        const lowerTitle = (n.title || '').trim().toLowerCase();
        if (DUMMY_NOTE_TITLES.includes(lowerTitle)) return false;
        return true;
      });
      if (this.notes.length !== prevNotesCount) {
        this._save(STORAGE_KEYS.NOTES, this.notes);
      }
    }

    // Guarantee default categories are always present
    if (!Array.isArray(this.categories) || this.categories.length === 0) {
      this.categories = [...DEFAULT_CATEGORIES];
      this._save(STORAGE_KEYS.CATEGORIES, this.categories);
    }
    
    // Always merge settings with defaults so no property is ever missing or undefined
    const loadedSettings = this._load(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS) || {};
    this.settings = { ...DEFAULT_SETTINGS, ...loadedSettings };
    
    // Auto-migrate to standardized single default model (gemini-2.5-flash)
    if (this.settings.geminiModel !== 'gemini-2.5-flash') {
      this.settings.geminiModel = 'gemini-2.5-flash';
      this._save(STORAGE_KEYS.SETTINGS, this.settings);
    }

    // Auto-migrate: Remove hardcoded 'Dhaifan' so the app is generic and for everyone
        // Auto-migrate: heroBannerEnabled must default to false unless explicitly configured by the user
    if (!this.settings.hasConfiguredBanner) {
      this.settings.heroBannerEnabled = false;
      this.settings.hasConfiguredBanner = false;
      this._save(STORAGE_KEYS.SETTINGS, this.settings);
    }

    if (this.settings.userName === 'Dhaifan' || this.settings.userName === 'dhaifan') {
      this.settings.userName = '';
      this._save(STORAGE_KEYS.SETTINGS, this.settings);
    } else if (typeof this.settings.userName !== 'string') {
      this.settings.userName = '';
    }

    const defaultChat = [
      {
        role: 'assistant',
        text: 'Halo, aku DayFlow AI siap membantumu menata hari. Ketik kegiatanmu, dan aku akan merapikannya menjadi jadwal terstruktur.',
        timestamp: Date.now()
      }
    ];

    this.chatHistory = this._load(STORAGE_KEYS.CHAT_HISTORY, defaultChat) || defaultChat;

    // Active sanitization of chat history: heal corrupted messages & clean legacy greetings
    try {
      if (Array.isArray(this.chatHistory)) {
        let chatSanitized = false;
        this.chatHistory = this.chatHistory.map(msg => {
          if (!msg) return msg;
          // Heal corrupted role object if previously passed as single object
          if (typeof msg.role === 'object' && msg.role !== null) {
            chatSanitized = true;
            return {
              role: msg.role.role || 'assistant',
              text: msg.role.text || msg.text || '',
              isProactive: !!msg.role.isProactive,
              timestamp: msg.role.timestamp || msg.timestamp || Date.now()
            };
          }
          if (typeof msg.text === 'string' && /(dhavi|dhaifan)/i.test(msg.text)) {
            chatSanitized = true;
            const cleanText = msg.text
              .replace(/halo\s+(dhavi|dhaifan),?\s*/gi, 'Halo, ')
              .replace(/(dhavi|dhaifan),?\s*/gi, '')
              .replace(/\s{2,}/g, ' ')
              .trim();
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
      console.warn('Chat sanitization error:', e);
    }
  }

  _load(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      if (!data) return fallback;
      const parsed = JSON.parse(data);
      if (parsed === null || typeof parsed === 'undefined') return fallback;
      if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
      if (typeof fallback === 'object' && !Array.isArray(fallback) && (typeof parsed !== 'object' || Array.isArray(parsed))) return fallback;
      return parsed;
    } catch (e) {
      console.warn('Storage load error:', e);
      return fallback;
    }
  }

  _save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(event, payload) {
    this.subscribers.forEach(cb => cb(event, payload));
  }

  // --- Schedules CRUD ---
  getSchedules(filterDate = null) {
    if (!Array.isArray(this.schedules)) this.schedules = [];
    if (!filterDate) {
      return this.schedules
        .filter(s => s && typeof s === 'object')
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }
    const targetDate = String(filterDate).trim();
    return this.schedules
      .filter(s => s && typeof s === 'object' && String(s.date || '').trim() === targetDate)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }

  getTodaySchedules() {
    const today = getLocalDateString();
    return this.getSchedules(today);
  }

  getUnfinishedSchedules(date) {
    return this.schedules.filter(s => s.date === date && !s.completed);
  }

  carryOverUnfinishedSchedules(sourceDate, targetDate) {
    const unfinished = this.getUnfinishedSchedules(sourceDate);
    if (unfinished.length === 0) return 0;

    let addedCount = 0;
    unfinished.forEach(item => {
      const alreadyExists = this.schedules.some(
        s => s.date === targetDate && s.title.toLowerCase() === item.title.toLowerCase()
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
    if (!scheduleData || typeof scheduleData !== 'object') return null;

    const rawTitle = scheduleData.title || scheduleData.kegiatan || scheduleData.activity || scheduleData.task || scheduleData.name || 'Kegiatan Baru';
    const safeTitle = String(rawTitle).trim() || 'Kegiatan Baru';
    const safeDate = normalizeDateString(scheduleData.date);
    const safeTime = normalizeTimeString(scheduleData.time);

    const newSchedule = {
      id: 'sch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      date: safeDate,
      time: safeTime,
      duration: Math.max(5, parseInt(scheduleData.duration || scheduleData.durasi, 10) || 30),
      title: safeTitle,
      category: (scheduleData.category && typeof scheduleData.category === 'string') ? scheduleData.category.trim() : (scheduleData.kategori || 'Fokus'),
      priority: ['low', 'medium', 'high'].includes(scheduleData.priority) ? scheduleData.priority : 'medium',
      deadline: scheduleData.deadline ? normalizeDateString(scheduleData.deadline) : null,
      reminder: scheduleData.reminder !== false,
      completed: !!scheduleData.completed,
      createdAt: Date.now()
    };
    this.schedules.push(newSchedule);
    this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
    this.notify('schedule:added', newSchedule);
    return newSchedule;
  }

  addSchedules(schedulesArray) {
    if (!Array.isArray(schedulesArray) || schedulesArray.length === 0) return [];

    const newSchedules = [];
    const baseTime = Date.now();

    schedulesArray.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const rawTitle = item.title || item.kegiatan || item.activity || item.task || item.name || 'Kegiatan Baru';
      const safeTitle = String(rawTitle).trim() || 'Kegiatan Baru';
      const safeDate = normalizeDateString(item.date);
      const safeTime = normalizeTimeString(item.time);

      const newSchedule = {
        id: 'sch_' + (baseTime + index) + '_' + Math.random().toString(36).substr(2, 6),
        date: safeDate,
        time: safeTime,
        duration: Math.max(5, parseInt(item.duration || item.durasi, 10) || 30),
        title: safeTitle,
        category: (item.category && typeof item.category === 'string') ? item.category.trim() : (item.kategori || 'Fokus'),
        priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
        deadline: item.deadline ? normalizeDateString(item.deadline) : null,
        reminder: item.reminder !== false,
        completed: !!item.completed,
        createdAt: baseTime + index
      };
      newSchedules.push(newSchedule);
    });

    if (newSchedules.length > 0) {
      this.schedules.push(...newSchedules);
      this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
      this.notify('schedules:batch-added', newSchedules);
    }

    return newSchedules;
  }

  getDeadlineTasks() {
    if (!Array.isArray(this.schedules)) return [];
    return this.schedules
      .filter(s => s && !s.completed && s.deadline)
      .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
  }

  getHighPriorityTasks() {
    if (!Array.isArray(this.schedules)) return [];
    return this.schedules
      .filter(s => s && !s.completed && s.priority === 'high');
  }

  updateSchedule(id, updates) {
    const idx = this.schedules.findIndex(s => s.id === id);
    if (idx !== -1) {
      const cleanUpdates = { ...updates };
      if (cleanUpdates.date) cleanUpdates.date = normalizeDateString(cleanUpdates.date);
      if (cleanUpdates.time) cleanUpdates.time = normalizeTimeString(cleanUpdates.time);
      if (cleanUpdates.deadline) cleanUpdates.deadline = normalizeDateString(cleanUpdates.deadline);
      if (cleanUpdates.title) cleanUpdates.title = String(cleanUpdates.title).trim();
      this.schedules[idx] = { ...this.schedules[idx], ...cleanUpdates };
      this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
      this.notify('schedule:updated', this.schedules[idx]);
      return this.schedules[idx];
    }
    return null;
  }

  toggleScheduleComplete(id) {
    const item = this.schedules.find(s => s.id === id);
    if (item) {
      return this.updateSchedule(id, { completed: !item.completed });
    }
    return null;
  }

  deleteSchedule(id) {
    this.schedules = this.schedules.filter(s => s.id !== id);
    this._save(STORAGE_KEYS.SCHEDULES, this.schedules);
    this.notify('schedule:deleted', id);
  }

  // --- Notes CRUD ---
  getNotes() {
    return [...this.notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  addNote(title, content) {
    const safeTitle = String(title || '').trim() || 'Catatan Tanpa Judul';
    const safeContent = String(content || '').trim();
    const note = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: safeTitle,
      content: safeContent,
      updatedAt: Date.now()
    };
    this.notes.unshift(note);
    this._save(STORAGE_KEYS.NOTES, this.notes);
    this.notify('note:added', note);
    return note;
  }

  updateNote(id, title, content) {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.title = String(title || '').trim() || 'Catatan Tanpa Judul';
      note.content = String(content || '').trim();
      note.updatedAt = Date.now();
      this._save(STORAGE_KEYS.NOTES, this.notes);
      this.notify('note:updated', note);
      return note;
    }
    return null;
  }

  deleteNote(id) {
    this.notes = this.notes.filter(n => n.id !== id);
    this._save(STORAGE_KEYS.NOTES, this.notes);
    this.notify('note:deleted', id);
  }

  // --- Chat History ---
  getChatHistory() {
    return this.chatHistory;
  }

  addChatMessage(roleOrMsg, maybeText = '', isProactive = false) {
    let msg;
    if (typeof roleOrMsg === 'object' && roleOrMsg !== null) {
      msg = {
        role: roleOrMsg.role || 'assistant',
        text: typeof roleOrMsg.text === 'string' ? roleOrMsg.text : '',
        isProactive: !!roleOrMsg.isProactive,
        timestamp: roleOrMsg.timestamp || Date.now()
      };
    } else {
      msg = {
        role: roleOrMsg || 'assistant',
        text: typeof maybeText === 'string' ? maybeText : '',
        isProactive: !!isProactive,
        timestamp: Date.now()
      };
    }
    this.chatHistory.push(msg);
    if (this.chatHistory.length > 50) this.chatHistory.shift();
    this._save(STORAGE_KEYS.CHAT_HISTORY, this.chatHistory);
    this.notify('chat:added', msg);
    return msg;
  }

  clearChatHistory() {
    this.chatHistory = [
      {
        role: 'assistant',
        text: 'Riwayat percakapan telah dibersihkan. Apa yang ingin kamu rencanakan hari ini?',
        timestamp: Date.now()
      }
    ];
    this._save(STORAGE_KEYS.CHAT_HISTORY, this.chatHistory);
    this.notify('chat:cleared', null);
  }

  // --- Categories CRUD ---
  getCategories() {
    if (!Array.isArray(this.categories) || this.categories.length === 0) {
      this.categories = [...DEFAULT_CATEGORIES];
    }
    return [...this.categories];
  }

  getCategoryByName(name) {
    if (!name) return { name: 'Kerja', color: '#f97316' };
    const found = this.categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
    if (found) return found;
    return { name, color: '#f97316' };
  }

  addCategory({ name, color }) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Nama kategori tidak boleh kosong.');
    const exists = this.categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) throw new Error(`Kategori "${trimmed}" sudah ada.`);

    const newCat = {
      id: 'cat_' + Date.now(),
      name: trimmed,
      color: color || '#f97316',
      isDefault: false
    };
    this.categories.push(newCat);
    this._save(STORAGE_KEYS.CATEGORIES, this.categories);
    this.notify('categories:updated', this.categories);
    return newCat;
  }

  deleteCategory(id) {
    const cat = this.categories.find(c => c.id === id);
    if (!cat) return false;
    if (cat.isDefault) {
      throw new Error('Kategori bawaan sistem tidak dapat dihapus.');
    }
    this.categories = this.categories.filter(c => c.id !== id);
    this._save(STORAGE_KEYS.CATEGORIES, this.categories);
    this.notify('categories:updated', this.categories);
    return true;
  }

  // --- Settings ---
  getSettings() {
    return this.settings;
  }

  updateSettings(updates) {
    this.settings = { ...this.settings, ...updates };
    this._save(STORAGE_KEYS.SETTINGS, this.settings);
    this.notify('settings:updated', this.settings);
    return this.settings;
  }
}

export const state = new StateManager();
if (typeof window !== 'undefined') {
  window.state = state;
}

