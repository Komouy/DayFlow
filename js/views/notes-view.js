/**
 * DayFlow Notes View Component
 * Handles personal notes grid, debounced live search, and AI notes semantic retrieval.
 */

import { state } from '../state.js';
import { getIcon, renderIcons } from '../icons.js';
import { GeminiService } from '../gemini.js';
import { notifications } from '../notifications.js';
import { escapeHtml } from '../utils/helpers.js';

export const notesViewMethods = {
  setupNotesDelegation(containerEl) {
    if (!containerEl || containerEl._hasNotesDelegation) return;
    containerEl._hasNotesDelegation = true;

    containerEl.addEventListener('click', async (e) => {
      const target = e.target;
      if (!target) return;

      // 1. Delete note
      const deleteBtn = target.closest('[data-action="delete-note"]');
      if (deleteBtn) {
        e.stopPropagation();
        const confirmed = await this.showConfirmDialog({
          title: 'Hapus Catatan Ini?',
          message: 'Catatan ini akan dihapus secara permanen dan tidak dapat dipulihkan.',
          confirmText: 'Hapus',
          isDanger: true,
          icon: 'trash'
        });
        if (confirmed) {
          state.deleteNote(deleteBtn.getAttribute('data-id'));
          notifications.showToast('Catatan telah dihapus.', 'info');
        }
        return;
      }

      // 2. Edit note button
      const editBtn = target.closest('[data-action="edit-note"]');
      if (editBtn) {
        e.stopPropagation();
        this.openNoteModal(editBtn.getAttribute('data-id'));
        return;
      }

      // 3. Click anywhere on note card
      const card = target.closest('.note-card');
      if (card && !target.closest('button')) {
        this.openNoteModal(card.getAttribute('data-note-id'));
        return;
      }
    });
  },

  // --- 4. Notes View ---
  renderNotesView() {
    const listEl = document.getElementById('notes-grid');
    if (!listEl) return;
    this.setupNotesDelegation(listEl);

    const notes = state.getNotes();
    const searchInput = document.getElementById('notes-search-input');
    const filterQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    let filtered = notes;
    if (filterQuery) {
      filtered = notes.filter(n => 
        String(n.title || '').toLowerCase().includes(filterQuery) || 
        String(n.content || '').toLowerCase().includes(filterQuery)
      );
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${getIcon('file-text', '', 20)}</div>
          <p class="empty-state-title">Belum ada catatan</p>
          <p class="empty-state-desc">Catat ide cepat, ringkasan rapat, atau memo harian di sini.</p>
        </div>
      `;
      renderIcons(listEl);
      return;
    }

    listEl.innerHTML = filtered.map(note => {
      const dateObj = (note.updatedAt && !isNaN(new Date(note.updatedAt).getTime())) ? new Date(note.updatedAt) : new Date();
      const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

      return `
      <div class="note-card" data-note-id="${note.id}">
        <div class="note-card-title">${escapeHtml(note.title || 'Catatan Tanpa Judul')}</div>
        <div class="note-card-preview">${escapeHtml(note.content || '')}</div>
        <div class="note-card-footer">
          <span>${dateStr}</span>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-ghost btn-sm" data-action="edit-note" data-id="${note.id}" aria-label="Ubah catatan">
              ${getIcon('edit', '', 14)}
            </button>
            <button class="btn btn-ghost btn-sm text-muted" data-action="delete-note" data-id="${note.id}" aria-label="Hapus catatan">
              ${getIcon('trash', '', 14)}
            </button>
          </div>
      </div>
      `;
    }).join('');
    renderIcons(listEl);

    // High performance debounced search input (avoids keyboard lag on mobile devices)
    if (searchInput && !searchInput._hasSearchInputBound) {
      searchInput._hasSearchInputBound = true;
      let debounceTimer = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.renderNotesView();
        }, 100);
      });
    }

    // AI Notes Search button
    const btnAiSearch = document.getElementById('btn-ai-search-notes');
    if (btnAiSearch) {
      btnAiSearch.onclick = async () => {
        const query = searchInput ? searchInput.value.trim() : '';
        if (!query) {
          notifications.showToast('Masukkan kata kunci pencarian terlebih dahulu.', 'warning');
          return;
        }

        btnAiSearch.disabled = true;
        btnAiSearch.innerHTML = `<span class="spinner"></span> Mencari...`;
        try {
          const result = await GeminiService.searchNotesWithAI(query, state.getNotes());
          notifications.showToast(`Temuan AI: ${result}`, 'info', 6000);
        } catch (err) {
          notifications.showToast(err.message, 'error');
        } finally {
          btnAiSearch.disabled = false;
          btnAiSearch.innerHTML = `${getIcon('search', '', 14)} Cari`;
          renderIcons();
        }
      };
    }
  }
};
