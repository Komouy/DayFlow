/**
 * DayFlow Notes View Component
 * Handles personal notes grid, debounced live search, and AI notes semantic retrieval.
 */

import { state } from '../state.js';
import { getIcon, renderIcons } from '../icons.js';
import { GeminiService } from '../gemini.js';
import { notifications } from '../notifications.js';
import { escapeHtml } from '../utils/helpers.js';
import { springBounce } from '../animations.js';

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
      const isSearching = Boolean(filterQuery);
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${getIcon(isSearching ? 'search' : 'file-text', '', 20)}</div>
          <p class="empty-state-title">${isSearching ? 'Catatan tidak ditemukan' : 'Belum ada catatan'}</p>
          <p class="empty-state-desc">${isSearching ? 'Coba gunakan kata kunci lain untuk mencari ide atau memo.' : 'Catat ide cepat, ringkasan rapat, atau memo harian di sini.'}</p>
          ${!isSearching ? `
            <div class="empty-state-actions">
              <button type="button" class="btn btn-primary btn-sm" id="btn-empty-add-note">
                ${getIcon('plus', '', 14)} Buat Catatan Baru
              </button>
            </div>
          ` : ''}
        </div>
      `;
      renderIcons(listEl);

      const addNoteBtn = listEl.querySelector('#btn-empty-add-note');
      if (addNoteBtn) {
        addNoteBtn.addEventListener('click', () => {
          springBounce(addNoteBtn);
          this.openNoteModal();
        });
      }
      return;
    }

    listEl.innerHTML = filtered.map(note => {
      const dateObj = (note.updatedAt && !isNaN(new Date(note.updatedAt).getTime())) ? new Date(note.updatedAt) : new Date();
      const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      return `
      <div class="note-card" data-note-id="${note.id}" role="button" tabindex="0" title="Klik untuk membuka catatan">
        <div class="note-card-title">${escapeHtml(note.title || 'Catatan Tanpa Judul')}</div>
        <div class="note-card-preview">${escapeHtml(note.content || '')}</div>
        <div class="note-card-footer">
          <span class="text-xs text-muted">${dateStr}</span>
          <button class="btn btn-ghost btn-xs text-muted" data-action="delete-note" data-id="${note.id}" aria-label="Hapus catatan" title="Hapus catatan">
            ${getIcon('trash', '', 13)}
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

    // AI Notes Search / Summary button
    const btnAiSearch = document.getElementById('btn-ai-search-notes');
    if (btnAiSearch) {
      btnAiSearch.onclick = async () => {
        const query = searchInput ? searchInput.value.trim() : '';
        if (!query) {
          notifications.showToast('Ketik topik atau kata kunci terlebih dahulu.', 'warning');
          return;
        }

        btnAiSearch.disabled = true;
        btnAiSearch.innerHTML = `<span class="spinner"></span> Merangkum...`;
        try {
          const result = await GeminiService.searchNotesWithAI(query, state.getNotes());
          notifications.showToast(`Rangkuman AI: ${result}`, 'info', 6000);
        } catch (err) {
          notifications.showToast(err.message, 'error');
        } finally {
          btnAiSearch.disabled = false;
          btnAiSearch.innerHTML = `${getIcon('bot', '', 14)} Rangkum AI`;
          renderIcons();
        }
      };
    }
  }
};
