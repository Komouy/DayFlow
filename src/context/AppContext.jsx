import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { state, getLocalDateString, normalizeDateString } from '../services/state.js';
import { notifications } from '../services/notifications.js';
import { downloadIcsFile } from '../utils/icalGenerator.js';
import {
  deleteNoteAttachments,
  getAllNoteAttachments,
  replaceAllNoteAttachments,
  saveNoteAttachmentChanges,
  saveNoteAttachments
} from '../services/db.js';
import {
  MAX_NOTE_ATTACHMENT_COUNT,
  MAX_NOTE_ATTACHMENT_SIZE,
  MAX_NOTE_ATTACHMENTS_SIZE
} from '../services/noteAttachments.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState('today');
  const [schedules, setSchedules] = useState(() => state.getSchedules());
  const [notes, setNotes] = useState(() => state.getNotes());
  const [categories, setCategories] = useState(() => state.getCategories());
  const [settings, setSettings] = useState(() => state.getSettings());
  const [chatHistory, setChatHistory] = useState(() => state.getChatHistory());
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(() => getLocalDateString());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [productivity, setProductivity] = useState(() => state.getTodayProductivity());
  const [profileStats, setProfileStats] = useState(() => state.getProfileProductivityStats());
  const [dailyLogs, setDailyLogs] = useState(() => state.getDailyLogs());
  const [dailyUsage, setDailyUsage] = useState(() => state.getDailyUsage());
  const [toasts, setToasts] = useState([]);
  const [pendingChatPrompt, setPendingChatPrompt] = useState('');
  const [proactiveNudge, setProactiveNudge] = useState(() => notifications.getActiveProactiveNudge());

  // Modals state
  const [scheduleModal, setScheduleModal] = useState({ isOpen: false, item: null, initialDate: null });
  const [noteModal, setNoteModal] = useState({ isOpen: false, item: null, mode: 'edit' });
  const [categoryModal, setCategoryModal] = useState({ isOpen: false });
  const [shareModal, setShareModal] = useState({ isOpen: false, date: null });
  const [shortcutsModal, setShortcutsModal] = useState({ isOpen: false });
  const [searchModal, setSearchModal] = useState({ isOpen: false, initialQuery: '' });
  const [backupModal, setBackupModal] = useState({ isOpen: false, initialTab: 'backup' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Lanjutkan', icon: 'alert' });
  const [introModal, setIntroModal] = useState(() => {
    try {
      return { isOpen: !localStorage.getItem('dayflow_intro_seen_v2') };
    } catch {
      return { isOpen: false };
    }
  });

  // Toast helpers
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    if (!message) return;
    const id = Date.now() + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => {
      const filtered = prev.filter((t) => t.message !== message);
      return [...filtered, { id, message, type }].slice(-2);
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  useEffect(() => {
    window.__dayflowShowToast = (msg, type, duration) => {
      showToast(msg, type, duration);
    };
    return () => {
      delete window.__dayflowShowToast;
    };
  }, [showToast]);

  // Sync state changes from state manager
  const refreshAllState = useCallback(() => {
    setSchedules([...state.getSchedules()]);
    setNotes([...state.getNotes()]);
    setCategories([...state.getCategories()]);
    setSettings({ ...state.getSettings() });
    setChatHistory([...state.getChatHistory()]);
    setProductivity(state.getTodayProductivity());
    setProfileStats(state.getProfileProductivityStats());
    setDailyLogs([...state.getDailyLogs()]);
    setDailyUsage({ ...state.getDailyUsage() });
  }, []);

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = state.subscribe((event, payload) => {
      refreshAllState();
      if (event === 'ai:proactive-reminder') {
        setProactiveNudge(payload);
      } else if (event === 'ai:proactive-dismissed') {
        setProactiveNudge(null);
      }
    });

    // Initialize notification scheduler
    try {
      notifications.init();
      setProactiveNudge(notifications.getActiveProactiveNudge());
    } catch (e) {
      console.warn('Notifications init error:', e);
    }

    // Check midnight rollover periodically
    const timer = setInterval(() => {
      state.checkMidnightRollover();
      setProductivity(state.getTodayProductivity());
    }, 60000);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      clearInterval(timer);
    };
  }, [refreshAllState]);

  // Apply theme to document
  useEffect(() => {
    const theme = settings.theme || 'dark';
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [settings.theme]);

  // Keyboard shortcuts listener
  useEffect(() => {
    function handleKeyDown(e) {
      // Global Universal Search Shortcut: Ctrl+K / Cmd+K (allowed everywhere, even in inputs)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModal((prev) => ({ isOpen: !prev.isOpen, initialQuery: '' }));
        return;
      }

      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
      const isModalOpen = Boolean(document.querySelector('.modal-overlay.open'));

      if (e.key === 'Escape') {
        closeAllModals();
        return;
      }

      // Don't trigger single-key navigation shortcuts if typing in an input or if a modal dialog is currently open
      if (isInput || isModalOpen) {
        return;
      }

      if (e.key === '1' || e.key.toLowerCase() === 't') {
        setActiveTab('today');
      } else if (e.key === '2' || e.key.toLowerCase() === 'j') {
        setActiveTab('schedule');
      } else if (e.key === '3' || e.key.toLowerCase() === 'a') {
        setActiveTab('ai-plan');
      } else if (e.key === '4' || e.key.toLowerCase() === 'c') {
        setActiveTab('notes');
      } else if (e.key === '5' || e.key.toLowerCase() === 's') {
        setActiveTab('settings');
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveTab('ai-plan');
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        openNoteModal();
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcutsModal({ isOpen: true });
      } else if (e.key === '/') {
        e.preventDefault();
        setSearchModal({ isOpen: true, initialQuery: '' });
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openIntroModal = useCallback(() => {
    setIntroModal({ isOpen: true });
  }, []);

  const closeIntroModal = useCallback(() => {
    try {
      localStorage.setItem('dayflow_intro_seen_v2', 'true');
    } catch (_) {}
    setIntroModal({ isOpen: false });
  }, []);

  const closeAllModals = useCallback(() => {
    setScheduleModal({ isOpen: false, item: null, initialDate: null });
    setNoteModal({ isOpen: false, item: null });
    setCategoryModal({ isOpen: false });
    setShareModal({ isOpen: false, date: null });
    setShortcutsModal({ isOpen: false });
    setSearchModal({ isOpen: false, initialQuery: '' });
    setBackupModal({ isOpen: false, initialTab: 'backup' });
    setIntroModal({ isOpen: false });
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const openSearchModal = useCallback((initialQuery = '') => {
    setSearchModal({ isOpen: true, initialQuery: initialQuery || '' });
  }, []);

  const closeSearchModal = useCallback(() => {
    setSearchModal({ isOpen: false, initialQuery: '' });
  }, []);

  const openBackupModal = useCallback((initialTab = 'backup') => {
    setBackupModal({ isOpen: true, initialTab: initialTab || 'backup' });
  }, []);

  const closeBackupModal = useCallback(() => {
    setBackupModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const openScheduleModal = useCallback((item = null, defaultDate = null) => {
    setScheduleModal({
      isOpen: true,
      item: item || null,
      initialDate: defaultDate || selectedScheduleDate || getLocalDateString()
    });
  }, [selectedScheduleDate]);

  const openNoteModal = useCallback((item = null, mode = 'edit') => {
    setNoteModal({ isOpen: true, item: item || null, mode });
  }, []);

  const openCategoryModal = useCallback(() => {
    setCategoryModal({ isOpen: true });
  }, []);

  const openShareModal = useCallback((date = null) => {
    setShareModal({ isOpen: true, date: date || selectedScheduleDate || getLocalDateString() });
  }, [selectedScheduleDate]);

  const openShortcutsModal = useCallback(() => {
    setShortcutsModal({ isOpen: true });
  }, []);

  const openConfirmDialog = useCallback(({ title, message, onConfirm, confirmText = 'Lanjutkan', icon = 'alert' }) => {
    setConfirmModal({
      isOpen: true,
      title: title || 'Konfirmasi',
      message: message || 'Apakah Anda yakin?',
      onConfirm,
      confirmText,
      icon
    });
  }, []);

  // Schedule operations
  const saveSchedule = useCallback((data) => {
    if (scheduleModal.item?.id) {
      state.updateSchedule(scheduleModal.item.id, data);
      showToast('Jadwal berhasil diperbarui', 'success');
    } else {
      state.addSchedule(data);
      showToast('Jadwal baru tersimpan', 'success');
    }
    refreshAllState();
    closeAllModals();
  }, [scheduleModal.item, refreshAllState, closeAllModals, showToast]);

  const toggleScheduleComplete = useCallback((id, targetDate) => {
    state.toggleScheduleComplete(id, targetDate);
    refreshAllState();
  }, [refreshAllState]);

  const deleteSchedule = useCallback((id) => {
    openConfirmDialog({
      title: 'Hapus Agenda',
      message: 'Jadwal ini akan dihapus dari agenda Anda.',
      confirmText: 'Hapus',
      onConfirm: () => {
        state.deleteSchedule(id);
        refreshAllState();
        showToast('Jadwal dihapus', 'info');
      }
    });
  }, [openConfirmDialog, refreshAllState, showToast]);

  // Note operations
  const saveNote = useCallback(async (title, content, pendingAttachments = [], removedAttachmentIds = []) => {
    const noteId = noteModal.item?.id || `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const currentAttachments = noteModal.item?.attachments || [];
    const addedRecords = [];
    for (const attachment of pendingAttachments) {
      addedRecords.push({
        id: `note_file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        noteId,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        extractedText: attachment.extractedText || '',
        blob: attachment.file,
        createdAt: Date.now()
      });
    }

    const retainedAttachments = currentAttachments.filter((attachment) => !removedAttachmentIds.includes(attachment.id));
    const attachmentMetadata = [
      ...retainedAttachments,
      ...addedRecords.map(({ id, name, mimeType, size }) => ({ id, name, mimeType, size }))
    ];

    try {
      await saveNoteAttachmentChanges(addedRecords, removedAttachmentIds);
    } catch (err) {
      showToast(`Gagal menyimpan catatan atau lampiran: ${err.message}`, 'error');
      return false;
    }

    if (noteModal.item?.id) {
      state.updateNote(noteId, { title, content, attachments: attachmentMetadata });
      showToast('Catatan diperbarui', 'success');
    } else {
      state.addNote({ id: noteId, title, content, attachments: attachmentMetadata });
      showToast('Catatan baru disimpan', 'success');
    }
    refreshAllState();
    closeAllModals();
    return true;
  }, [noteModal.item, refreshAllState, closeAllModals, showToast]);

  const deleteNote = useCallback((id) => {
    openConfirmDialog({
      title: 'Hapus Catatan',
      message: 'Catatan ini akan dihapus permanen.',
      confirmText: 'Hapus',
      onConfirm: () => {
        const note = state.getNote(id);
        deleteNoteAttachments((note?.attachments || []).map((attachment) => attachment.id))
          .then(() => {
            state.deleteNote(id);
            refreshAllState();
            showToast('Catatan dihapus', 'info');
          })
          .catch((err) => {
            showToast(`Gagal menghapus lampiran catatan: ${err.message}`, 'error');
          });
      }
    });
  }, [openConfirmDialog, refreshAllState, showToast]);

  const togglePinNote = useCallback((id) => {
    const note = state.togglePinNote(id);
    if (!note) {
      showToast('Catatan tidak ditemukan. Muat ulang halaman lalu coba lagi.', 'error');
      return false;
    }
    refreshAllState();
    showToast(note.pinned ? 'Catatan disematkan' : 'Sematan catatan dilepas', 'success');
    return note.pinned;
  }, [refreshAllState, showToast]);

  // Settings operations
  const updateSettings = useCallback((updates, notify = false) => {
    state.updateSettings(updates);
    refreshAllState();
    if (notify) {
      showToast('Pengaturan disimpan', 'success');
    }
  }, [refreshAllState, showToast]);

  // Categories operations
  const addCategory = useCallback((cat) => {
    try {
      state.addCategory(cat);
      refreshAllState();
      showToast(`Kategori "${cat.name}" ditambahkan`, 'success');
      return true;
    } catch (err) {
      showToast(err.message, 'error');
      return false;
    }
  }, [refreshAllState, showToast]);

  const deleteCategory = useCallback((id) => {
    try {
      state.deleteCategory(id);
      refreshAllState();
      showToast('Kategori dihapus', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [refreshAllState, showToast]);

  // Chat operations
  const addChatMessage = useCallback((roleOrMsg, maybeText, isProactive, extraProps) => {
    const msg = state.addChatMessage(roleOrMsg, maybeText, isProactive, extraProps);
    refreshAllState();
    return msg;
  }, [refreshAllState]);

  const updateChatMessage = useCallback((id, updates) => {
    const msg = state.updateChatMessage(id, updates);
    refreshAllState();
    return msg;
  }, [refreshAllState]);

  const clearChat = useCallback(() => {
    state.clearChatHistory();
    refreshAllState();
    showToast('Sesi baru dimulai, riwayat lama dibersihkan', 'info');
  }, [refreshAllState, showToast]);

  // Export / Import
  const exportData = useCallback(async () => {
    try {
      const records = await getAllNoteAttachments();
      const noteAttachments = await Promise.all(records.map(async ({ blob, ...record }) => {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        }
        return { ...record, data: btoa(binary) };
      }));
      const payload = state.createBackupPayload();
      payload.data.noteAttachments = noteAttachments;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dayflow_backup_${getLocalDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Cadangan data lengkap berhasil diekspor (JSON)', 'success');
    } catch (err) {
      showToast(`Gagal mengekspor cadangan: ${err.message}`, 'error');
    }
  }, [showToast]);

  const exportIcsCalendar = useCallback((schedulesToExport = null, filename = null, options = {}) => {
    const targetSchedules = schedulesToExport || state.getSchedules();
    const safeFilename = filename || `dayflow_kalender_${getLocalDateString()}.ics`;
    downloadIcsFile(targetSchedules, safeFilename, {
      calendarName: options.calendarName || 'DayFlow Kalender Agenda',
      includeCompleted: options.includeCompleted !== false
    });
    showToast(`${targetSchedules.length} kegiatan berhasil diekspor ke kalender (.ics)`, 'success');
  }, [showToast]);

  const importData = useCallback(async (jsonStringOrObj, options = { mode: 'merge' }) => {
    try {
      const payload = typeof jsonStringOrObj === 'string' ? JSON.parse(jsonStringOrObj) : jsonStringOrObj;
      const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
      const validation = state.validateBackupPayload(payload);
      if (!validation.valid) throw new Error(validation.error);
      if (data.noteAttachments !== undefined && !Array.isArray(data.noteAttachments)) {
        throw new Error('Daftar lampiran pada cadangan tidak valid.');
      }
      const attachments = Array.isArray(data.noteAttachments) ? data.noteAttachments : [];
      const noteIds = new Set((Array.isArray(data.notes) ? data.notes : []).map((note) => note?.id).filter(Boolean));
      const attachmentCounts = new Map();
      const attachmentSizes = new Map();
      const existingNoteIds = new Set(state.getNotes().map((note) => note.id));
      const importedRecords = [];
      const seenAttachmentIds = new Set();
      for (const attachment of attachments) {
        if (
          !attachment?.id ||
          !attachment.noteId ||
          !noteIds.has(attachment.noteId) ||
          typeof attachment.name !== 'string' ||
          !['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain',
            'text/markdown', 'text/csv', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
            .includes(attachment.mimeType) ||
          !Number.isInteger(attachment.size) ||
          attachment.size <= 0 ||
          attachment.size > MAX_NOTE_ATTACHMENT_SIZE ||
          String(attachment.extractedText || '').length > 200_000 ||
          typeof attachment.data !== 'string' ||
          !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(attachment.data) ||
          seenAttachmentIds.has(attachment.id)
        ) {
          throw new Error('Berkas lampiran pada cadangan tidak valid.');
        }
        const binary = atob(attachment.data);
        if (binary.length !== attachment.size) {
          throw new Error(`Ukuran lampiran "${attachment.name}" tidak cocok dengan data cadangan.`);
        }
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        seenAttachmentIds.add(attachment.id);
        attachmentCounts.set(attachment.noteId, (attachmentCounts.get(attachment.noteId) || 0) + 1);
        attachmentSizes.set(attachment.noteId, (attachmentSizes.get(attachment.noteId) || 0) + attachment.size);
        if (
          attachmentCounts.get(attachment.noteId) > MAX_NOTE_ATTACHMENT_COUNT ||
          attachmentSizes.get(attachment.noteId) > MAX_NOTE_ATTACHMENTS_SIZE
        ) {
          throw new Error(`Jumlah atau ukuran lampiran catatan "${attachment.name}" melampaui batas.`);
        }
        if (options.mode === 'merge' && existingNoteIds.has(attachment.noteId)) continue;
        importedRecords.push({
          id: attachment.id,
          noteId: attachment.noteId,
          name: attachment.name,
          mimeType: attachment.mimeType,
          size: attachment.size,
          extractedText: attachment.extractedText || '',
          blob: new Blob([bytes], { type: attachment.mimeType || 'application/octet-stream' }),
          createdAt: attachment.createdAt || Date.now()
        });
      }

      if (options.mode === 'overwrite') {
        await replaceAllNoteAttachments(importedRecords);
      } else {
        await saveNoteAttachments(importedRecords);
      }

      const result = state.restoreBackup(payload, options);
      refreshAllState();
      const modeText = result.mode === 'overwrite' ? 'ganti penuh' : 'gabungkan data';
      showToast(`Cadangan berhasil dipulihkan (${modeText}): ${result.counts.schedules} jadwal & ${result.counts.notes} catatan`, 'success');
      return { success: true, result };
    } catch (err) {
      showToast(`Gagal memulihkan cadangan: ${err.message}`, 'error');
      return { success: false, error: err.message };
    }
  }, [refreshAllState, showToast]);

  const sendPromptToAi = useCallback((promptText) => {
    if (!promptText || !promptText.trim()) return;
    setPendingChatPrompt(promptText.trim());
    setActiveTab('ai-plan');
  }, []);

  const dismissProactiveNudge = useCallback(() => {
    notifications.dismissActiveProactiveNudge();
  }, []);

  const value = {
    activeTab,
    setActiveTab,
    schedules,
    notes,
    categories,
    settings,
    chatHistory,
    productivity,
    profileStats,
    dailyLogs,
    dailyUsage,
    selectedScheduleDate,
    setSelectedScheduleDate,
    selectedCategory,
    setSelectedCategory,
    toasts,
    showToast,
    dismissToast,
    proactiveNudge,
    dismissProactiveNudge,
    pendingChatPrompt,
    setPendingChatPrompt,
    sendPromptToAi,
    // Modals
    scheduleModal,
    noteModal,
    categoryModal,
    shareModal,
    shortcutsModal,
    searchModal,
    confirmModal,
    backupModal,
    introModal,
    openScheduleModal,
    openNoteModal,
    openCategoryModal,
    openShareModal,
    openShortcutsModal,
    openSearchModal,
    closeSearchModal,
    openBackupModal,
    closeBackupModal,
    openIntroModal,
    closeIntroModal,
    openConfirmDialog,
    closeAllModals,
    // Operations
    saveSchedule,
    toggleScheduleComplete,
    deleteSchedule,
    saveNote,
    deleteNote,
    togglePinNote,
    updateSettings,
    addCategory,
    deleteCategory,
    addChatMessage,
    updateChatMessage,
    clearChat,
    exportData,
    exportIcsCalendar,
    importData,
    refreshAllState
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
