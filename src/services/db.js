/**
 * DayFlow IndexedDB Storage Service
 * Provides offline-first, dual-context (Window + ServiceWorker) structured storage.
 * Synchronizes local-first state so Service Worker can inspect schedules in the background.
 */

const DB_NAME = 'dayflow_pwa_db';
const DB_VERSION = 2;
const STORE_SCHEDULES = 'schedules';
const STORE_SETTINGS = 'settings';
const STORE_NOTES = 'notes';
const STORE_NOTE_ATTACHMENTS = 'note_attachments';

export function openDayflowDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_SCHEDULES)) {
        db.createObjectStore(STORE_SCHEDULES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NOTE_ATTACHMENTS)) {
        const attachmentStore = db.createObjectStore(STORE_NOTE_ATTACHMENTS, { keyPath: 'id' });
        attachmentStore.createIndex('noteId', 'noteId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveNoteAttachment(attachment) {
  return saveNoteAttachments([attachment]);
}

export async function saveNoteAttachments(attachments = []) {
  if (!Array.isArray(attachments) || attachments.length === 0) return;
  const db = await openDayflowDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTE_ATTACHMENTS, 'readwrite');
    const store = tx.objectStore(STORE_NOTE_ATTACHMENTS);
    attachments.forEach((attachment) => store.put(attachment));
    tx.oncomplete = () => {
      db.close();
      resolve(attachments);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Gagal menyimpan lampiran catatan.'));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error('Penyimpanan lampiran catatan dibatalkan.'));
    };
  });
}

export async function saveNoteAttachmentChanges(attachmentsToSave = [], attachmentIdsToDelete = []) {
  const db = await openDayflowDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTE_ATTACHMENTS, 'readwrite');
    const store = tx.objectStore(STORE_NOTE_ATTACHMENTS);
    attachmentsToSave.forEach((attachment) => store.put(attachment));
    attachmentIdsToDelete.forEach((id) => store.delete(id));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Gagal memperbarui lampiran catatan.'));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error('Pembaruan lampiran catatan dibatalkan.'));
    };
  });
}

export async function replaceAllNoteAttachments(attachments = []) {
  if (!Array.isArray(attachments)) throw new Error('Daftar lampiran cadangan tidak valid.');
  const db = await openDayflowDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTE_ATTACHMENTS, 'readwrite');
    const store = tx.objectStore(STORE_NOTE_ATTACHMENTS);
    store.clear();
    attachments.forEach((attachment) => store.put(attachment));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Gagal mengganti lampiran cadangan.'));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error('Penggantian lampiran cadangan dibatalkan.'));
    };
  });
}

export async function getNoteAttachments(noteId) {
  const db = await openDayflowDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTE_ATTACHMENTS, 'readonly');
    const request = tx.objectStore(STORE_NOTE_ATTACHMENTS).index('noteId').getAll(noteId);
    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error('Gagal membaca lampiran catatan.'));
    };
  });
}

export async function getAllNoteAttachments() {
  const db = await openDayflowDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTE_ATTACHMENTS, 'readonly');
    const request = tx.objectStore(STORE_NOTE_ATTACHMENTS).getAll();
    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error('Gagal membaca lampiran cadangan.'));
    };
  });
}

export async function deleteNoteAttachments(attachmentIds) {
  if (!Array.isArray(attachmentIds) || attachmentIds.length === 0) return;
  const db = await openDayflowDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTE_ATTACHMENTS, 'readwrite');
    const store = tx.objectStore(STORE_NOTE_ATTACHMENTS);
    attachmentIds.forEach((id) => store.delete(id));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Gagal menghapus lampiran catatan.'));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error('Penghapusan lampiran catatan dibatalkan.'));
    };
  });
}

export async function saveSchedulesToDb(schedules = []) {
  try {
    const db = await openDayflowDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SCHEDULES, 'readwrite');
      const store = tx.objectStore(STORE_SCHEDULES);
      store.clear();
      if (Array.isArray(schedules)) {
        schedules.forEach((item) => {
          if (item && item.id) {
            store.put(item);
          }
        });
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('saveSchedulesToDb error:', e);
    return false;
  }
}

export async function getSchedulesFromDb() {
  try {
    const db = await openDayflowDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SCHEDULES, 'readonly');
      const store = tx.objectStore(STORE_SCHEDULES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('getSchedulesFromDb error:', e);
    return [];
  }
}

export async function saveSettingsToDb(settings = {}) {
  try {
    const db = await openDayflowDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      store.put({ key: 'user_settings', data: settings });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('saveSettingsToDb error:', e);
    return false;
  }
}

export async function getSettingsFromDb() {
  try {
    const db = await openDayflowDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get('user_settings');
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('getSettingsFromDb error:', e);
    return null;
  }
}
