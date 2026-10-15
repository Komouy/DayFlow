/**
 * DayFlow Modals Component
 * Handlers for Schedule Modal, Note Modal, Category Modal, and API Guide Modal.
 */

import { state, getLocalDateString, CATEGORY_PALETTE } from '../state.js';
import { renderIcons } from '../icons.js';
import { notifications } from '../notifications.js';
import { springBounce, shakeElement } from '../animations.js';
import { escapeHtml, formatMarkdown, generateScheduleText, generateGoogleCalendarUrl, generateIcsFileContent } from '../utils/helpers.js';
import { GeminiService } from '../gemini.js';

export const modalMethods = {
  openScheduleModal(scheduleId = null) {
    this.closeAllModals();
    this.editingScheduleId = scheduleId;
    const modal = document.getElementById('modal-schedule');
    const titleEl = document.getElementById('modal-schedule-title');
    const inputTitle = document.getElementById('sch-input-title');
    const inputDescription = document.getElementById('sch-input-description');
    const inputDate = document.getElementById('sch-input-date');
    const inputTime = document.getElementById('sch-input-time');
    const inputDuration = document.getElementById('sch-input-duration');
    const inputDeadline = document.getElementById('sch-input-deadline');
    const durLabel = document.getElementById('sch-duration-label');
    const toggleReminder = document.getElementById('sch-toggle-reminder');

    let currentCategory = 'Kerja';
    let currentPriority = 'medium';
    let currentRecurrence = 'none';
    let currentDeadline = '';
    let currentDuration = 30;

    if (scheduleId) {
      const item = state.schedules.find(s => s.id === scheduleId);
      if (item) {
        titleEl.textContent = 'Ubah Jadwal';
        inputTitle.value = item.title;
        if (inputDescription) inputDescription.value = item.description || '';
        inputDate.value = item.date;
        inputTime.value = item.time;
        currentDuration = item.duration || 30;
        currentCategory = item.category || 'Kerja';
        currentPriority = item.priority || 'medium';
        currentRecurrence = item.recurrence || 'none';
        currentDeadline = item.deadline || '';
        if (toggleReminder) toggleReminder.checked = item.reminder !== false;
      }
    } else {
      titleEl.textContent = 'Tambah Jadwal Baru';
      inputTitle.value = '';
      if (inputDescription) inputDescription.value = '';
      inputDate.value = this.selectedScheduleDate || getLocalDateString();
      inputTime.value = '09:00';
      currentDuration = 30;
      currentCategory = 'Kerja';
      currentPriority = 'medium';
      currentRecurrence = 'none';
      currentDeadline = '';
      if (toggleReminder) toggleReminder.checked = true;
    }

    if (inputDuration) inputDuration.value = currentDuration;
    if (durLabel) durLabel.textContent = `${currentDuration} menit`;
    if (inputDeadline) inputDeadline.value = currentDeadline;

    // Sync duration quick pills
    modal.querySelectorAll('.duration-pill').forEach(pill => {
      if (parseInt(pill.getAttribute('data-min'), 10) === currentDuration) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    // Render dynamic category radios
    this.renderModalCategoryRadios(currentCategory);

    // Sync priority radio buttons
    const prioRadio = modal.querySelector(`input[name="sch-priority-radio"][value="${currentPriority}"]`);
    if (prioRadio) prioRadio.checked = true;

    // Sync recurrence radio buttons
    const recRadio = modal.querySelector(`input[name="sch-recurrence-radio"][value="${currentRecurrence}"]`);
    if (recRadio) recRadio.checked = true;

    modal.classList.add('open');
    setTimeout(() => inputTitle.focus(), 150);
  },

  handleSaveSchedule(e) {
    e.preventDefault();
    const inputTitle = document.getElementById('sch-input-title');
    const inputDescription = document.getElementById('sch-input-description');
    const inputDate = document.getElementById('sch-input-date');
    const inputTime = document.getElementById('sch-input-time');
    const inputDuration = document.getElementById('sch-input-duration');
    const inputDeadline = document.getElementById('sch-input-deadline');
    const toggleReminder = document.getElementById('sch-toggle-reminder');
    const selectedCategoryRadio = document.querySelector('input[name="sch-category-radio"]:checked');
    const selectedPriorityRadio = document.querySelector('input[name="sch-priority-radio"]:checked');
    const selectedRecurrenceRadio = document.querySelector('input[name="sch-recurrence-radio"]:checked');

    const title = inputTitle.value.trim();
    if (!title) {
      shakeElement(inputTitle);
      notifications.showToast('Judul kegiatan wajib diisi.', 'warning');
      return;
    }

    const payload = {
      title,
      description: inputDescription ? inputDescription.value.trim() : '',
      date: inputDate.value || getLocalDateString(),
      time: inputTime.value || '09:00',
      duration: parseInt(inputDuration.value, 10) || 30,
      category: selectedCategoryRadio ? selectedCategoryRadio.value : 'Kerja',
      priority: selectedPriorityRadio ? selectedPriorityRadio.value : 'medium',
      deadline: inputDeadline && inputDeadline.value ? inputDeadline.value : null,
      reminder: toggleReminder ? toggleReminder.checked : true,
      recurrence: selectedRecurrenceRadio ? selectedRecurrenceRadio.value : 'none'
    };

    if (this.editingScheduleId) {
      state.updateSchedule(this.editingScheduleId, payload);
      notifications.showToast('Jadwal berhasil diperbarui.', 'success');
    } else {
      state.addSchedule(payload);
      notifications.showToast('Jadwal baru ditambahkan.', 'success');
    }

    this.closeAllModals();
  },

  openNoteModal(noteId = null) {
    this.closeAllModals();
    this.editingNoteId = noteId;
    const modal = document.getElementById('modal-note');
    const titleModal = document.getElementById('modal-note-title');
    const inputTitle = document.getElementById('note-input-title');
    const inputContent = document.getElementById('note-input-content');

    if (noteId) {
      const note = state.notes.find(n => n.id === noteId);
      if (note) {
        titleModal.textContent = 'Ubah Catatan';
        inputTitle.value = note.title;
        inputContent.value = note.content;
      }
    } else {
      titleModal.textContent = 'Catatan Baru';
      inputTitle.value = '';
      inputContent.value = '';
    }

    modal.classList.add('open');
    setTimeout(() => inputContent.focus(), 150);
  },

  handleSaveNote(e) {
    e.preventDefault();
    const inputTitle = document.getElementById('note-input-title');
    const inputContent = document.getElementById('note-input-content');

    const content = inputContent.value.trim();
    if (!content) {
      shakeElement(inputContent);
      notifications.showToast('Isi catatan tidak boleh kosong.', 'warning');
      return;
    }

    if (this.editingNoteId) {
      state.updateNote(this.editingNoteId, inputTitle.value, content);
      notifications.showToast('Catatan diperbarui.', 'success');
    } else {
      state.addNote(inputTitle.value, content);
      notifications.showToast('Catatan disimpan.', 'success');
    }

    this.closeAllModals();
  },

  renderModalCategoryRadios(selectedCategoryName = 'Kerja') {
    const groupEl = document.getElementById('sch-category-radio-group');
    if (!groupEl) return;

    const categories = state.getCategories();
    let html = '';

    categories.forEach(cat => {
      const isChecked = cat.name.toLowerCase() === (selectedCategoryName || 'kerja').toLowerCase();
      html += `
        <label class="category-radio-item">
          <input type="radio" name="sch-category-radio" value="${escapeHtml(cat.name)}" ${isChecked ? 'checked' : ''}>
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

    const btnAddInline = document.getElementById('btn-add-cat-inline');
    if (btnAddInline) {
      btnAddInline.addEventListener('click', (e) => {
        e.preventDefault();
        springBounce(btnAddInline);
        this.openCategoryModal((newCat) => {
          this.renderModalCategoryRadios(newCat.name);
        });
      });
    }
  },

  openCategoryModal(onCreatedCallback = null) {
    const modal = document.getElementById('modal-category');
    if (!modal) return;

    const colorPickerContainer = document.getElementById('cat-color-picker');
    const colorInput = document.getElementById('cat-input-color');
    const nameInput = document.getElementById('cat-input-name');
    const form = document.getElementById('category-create-form');

    if (nameInput) nameInput.value = '';
    if (colorInput) colorInput.value = CATEGORY_PALETTE[0];

    // Populate color swatches
    if (colorPickerContainer) {
      let swatchesHtml = '';
      CATEGORY_PALETTE.forEach((hex, idx) => {
        swatchesHtml += `
          <label class="color-picker-option" title="Warna ${hex}">
            <input type="radio" name="cat-swatch" value="${hex}" ${idx === 0 ? 'checked' : ''}>
            <span class="color-picker-swatch" style="background-color:${hex};"></span>
          </label>
        `;
      });
      colorPickerContainer.innerHTML = swatchesHtml;

      colorPickerContainer.querySelectorAll('input[name="cat-swatch"]').forEach(radio => {
        radio.addEventListener('change', () => {
          if (colorInput) colorInput.value = radio.value;
        });
      });
    }

    // Populate existing categories list
    this.renderCategoryManageList();

    // Bind form submission
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const catName = nameInput ? nameInput.value.trim() : '';
        const catColor = colorInput ? colorInput.value : CATEGORY_PALETTE[0];

        try {
          const newCat = state.addCategory({ name: catName, color: catColor });
          notifications.showToast(`Kategori "${newCat.name}" berhasil dibuat.`, 'success');
          if (nameInput) nameInput.value = '';
          this.renderCategoryManageList();
          this.renderCategoryFilterPills();
          this.renderSettingsCategoriesPreview();
          this.renderModalCategoryRadios(newCat.name);

          if (typeof onCreatedCallback === 'function') {
            onCreatedCallback(newCat);
          }
        } catch (err) {
          notifications.showToast(err.message || 'Gagal menambahkan kategori.', 'warning');
        }
      };
    }

    modal.classList.add('open');
    renderIcons(modal);
    if (nameInput) setTimeout(() => nameInput.focus(), 150);
  },

  renderCategoryManageList() {
    const listEl = document.getElementById('category-manage-list');
    if (!listEl) return;

    const categories = state.getCategories();
    let html = '';

    categories.forEach(cat => {
      html += `
        <div class="category-manage-item">
          <div class="category-manage-item-info">
            <span class="category-manage-dot" style="background-color:${cat.color};"></span>
            <span style="font-weight:600; color:var(--text-primary); font-size:13px;">${escapeHtml(cat.name)}</span>
            ${cat.isDefault ? '<span class="model-option-badge" style="font-size:10px; padding:1px 6px;">Bawaan</span>' : ''}
          </div>
          <div>
            ${!cat.isDefault ? `
              <button type="button" class="btn btn-ghost btn-xs btn-icon btn-delete-cat" data-cat-id="${cat.id}" data-cat-name="${escapeHtml(cat.name)}" title="Hapus Kategori" aria-label="Hapus Kategori">
                <span data-icon="trash" data-icon-size="14" style="color:var(--text-danger);"></span>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;
    renderIcons(listEl);

    // Bind delete buttons
    listEl.querySelectorAll('.btn-delete-cat').forEach(btn => {
      btn.onclick = async () => {
        const catId = btn.getAttribute('data-cat-id');
        const catName = btn.getAttribute('data-cat-name');
        const confirmed = await this.showConfirmDialog({
          title: `Hapus Kategori "${catName}"?`,
          message: 'Kategori ini akan dihapus dari daftar opsi kegiatan.',
          confirmText: 'Hapus',
          isDanger: true,
          icon: 'trash'
        });

        if (confirmed) {
          try {
            state.deleteCategory(catId);
            notifications.showToast(`Kategori "${catName}" telah dihapus.`, 'info');
            this.renderCategoryManageList();
            this.renderCategoryFilterPills();
            this.renderSettingsCategoriesPreview();
            this.renderModalCategoryRadios();
          } catch (err) {
            notifications.showToast(err.message, 'warning');
          }
        }
      };
    });
  },

  openShareModal(targetDate = null) {
    this.closeAllModals();
    const modal = document.getElementById('modal-share-schedule');
    if (!modal) return;

    const date = targetDate || this.selectedScheduleDate || getLocalDateString();
    const schedules = state.getSchedules(date);
    const textPreview = document.getElementById('share-text-preview');
    const itemCountEl = document.getElementById('share-item-count');
    const shareSubTitle = document.getElementById('modal-share-subtitle');

    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
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

    // Bind WhatsApp Send
    const btnWa = document.getElementById('btn-send-whatsapp');
    if (btnWa) {
      btnWa.onclick = () => {
        springBounce(btnWa);
        const encoded = encodeURIComponent(fullShareText);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
      };
    }

    // Bind Copy Text
    const btnCopy = document.getElementById('btn-copy-share-text');
    if (btnCopy) {
      btnCopy.onclick = () => {
        springBounce(btnCopy);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(fullShareText);
        } else if (textPreview) {
          textPreview.select();
          document.execCommand('copy');
        }
        notifications.showToast('Teks agenda berhasil disalin ke clipboard!', 'success');
      };
    }

    // Bind Download .ICS
    const btnIcs = document.getElementById('btn-download-ics');
    if (btnIcs) {
      btnIcs.onclick = () => {
        springBounce(btnIcs);
        if (schedules.length === 0) {
          notifications.showToast('Tidak ada kegiatan untuk diekspor.', 'warning');
          return;
        }
        const icsContent = generateIcsFileContent(schedules, date);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DayFlow_Agenda_${date}.ics`;
        a.click();
        URL.revokeObjectURL(url);
        notifications.showToast('File kalender (.ics) berhasil diunduh.', 'success');
      };
    }

    // Bind Open First Event in Google Calendar
    const btnGCal = document.getElementById('btn-open-first-gcal');
    if (btnGCal) {
      btnGCal.onclick = () => {
        springBounce(btnGCal);
        if (schedules.length === 0) {
          notifications.showToast('Tidak ada kegiatan untuk disinkronkan.', 'warning');
          return;
        }
        const url = generateGoogleCalendarUrl(schedules[0]);
        if (url) {
          window.open(url, '_blank');
          notifications.showToast(`Membuka "${schedules[0].title}" di Google Calendar...`, 'info');
        }
      };
    }

    modal.classList.add('open');
    renderIcons(modal);
  },



  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    this.editingScheduleId = null;
    this.editingNoteId = null;
  },

  openApiGuideModal() {
    const modal = document.getElementById('modal-api-guide');
    if (modal) {
      modal.classList.add('open');
      renderIcons(modal);
    }
  }
};
