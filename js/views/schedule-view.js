/**
 * DayFlow Schedule View Component
 * Handles Full Schedule, 7-day week strip, dynamic category filters, and mathematical timeline grid.
 */

import { state, getLocalDateString } from '../state.js';
import { getIcon, renderIcons } from '../icons.js';
import { notifications } from '../notifications.js';
import { particleBurst, springBounce } from '../animations.js';
import { escapeHtml, detectScheduleConflicts, generateGoogleCalendarUrl } from '../utils/helpers.js';
import { GeminiService } from '../gemini.js';

export const scheduleViewMethods = {
  // --- 2. Schedule View ---
  renderScheduleView() {
    this.renderWeekStrip();
    this.renderCategoryFilterPills();

    let schedules = state.getSchedules(this.selectedScheduleDate);
    if (this.selectedCategory !== 'all') {
      schedules = schedules.filter(s => s.category && s.category.toLowerCase() === this.selectedCategory.toLowerCase());
    }

    const listEl = document.getElementById('full-schedule-list');
    const isToday = !this.selectedScheduleDate || this.selectedScheduleDate === getLocalDateString();
    this.renderTimelineGrid(schedules, listEl, isToday);
    this.setupSwipeNavigation(listEl);

    // Date picker handler
    const dateInput = document.getElementById('schedule-date-filter');
    if (dateInput) {
      dateInput.onchange = () => {
        this.selectedScheduleDate = dateInput.value || getLocalDateString();
        this.renderScheduleView();
      };
    }

    // Guarantee all static/dynamic icons in schedule view are always rendered
    const viewSection = document.getElementById('view-schedule');
    if (viewSection) {
      renderIcons(viewSection);
    }
  },

  renderCategoryFilterPills() {
    const pillContainer = document.getElementById('category-filter-pills');
    if (!pillContainer) return;

    const categories = state.getCategories();
    let html = `
      <button type="button" class="btn ${this.selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-category="all">
        Semua
      </button>
    `;

    categories.forEach(cat => {
      const isSelected = this.selectedCategory.toLowerCase() === cat.name.toLowerCase();
      html += `
        <button type="button" class="btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm" data-category="${escapeHtml(cat.name)}" style="display:inline-flex; align-items:center; gap:6px;">
          <span style="width:7px; height:7px; border-radius:50%; background-color:${cat.color}; flex-shrink:0;"></span>
          <span>${escapeHtml(cat.name)}</span>
        </button>
      `;
    });

    html += `
      <button type="button" class="btn-add-category-pill" id="btn-open-category-modal" title="Tambah / Kelola Kategori">
        ${getIcon('plus', '', 13)}
        <span>Kategori</span>
      </button>
    `;

    pillContainer.innerHTML = html;
    renderIcons(pillContainer);

    // Bind category filter clicks
    pillContainer.querySelectorAll('button[data-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        springBounce(btn);
        this.selectedCategory = btn.getAttribute('data-category');
        this.renderScheduleView();
      });
    });

    const addCatBtn = document.getElementById('btn-open-category-modal');
    if (addCatBtn) {
      addCatBtn.addEventListener('click', () => {
        springBounce(addCatBtn);
        this.openCategoryModal();
      });
    }
  },

  renderWeekStrip() {
    const gridEl = document.getElementById('week-strip-grid');
    const monthLabel = document.getElementById('week-strip-month-label');
    const dateInput = document.getElementById('schedule-date-filter');
    if (!gridEl) return;

    const selected = (!this.selectedScheduleDate || isNaN(new Date(this.selectedScheduleDate + 'T00:00:00').getTime()))
      ? new Date()
      : new Date(this.selectedScheduleDate + 'T00:00:00');
    if (monthLabel) {
      monthLabel.textContent = selected.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    if (dateInput) {
      dateInput.value = this.selectedScheduleDate;
    }

    // Calculate Monday of current week
    const dayOfWeek = (selected.getDay() + 6) % 7; // 0 is Monday
    const monday = new Date(selected);
    monday.setDate(selected.getDate() - dayOfWeek);

    const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    let html = '';

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = getLocalDateString(d);
      const isSelected = dStr === this.selectedScheduleDate;
      const count = state.getSchedules(dStr).length;

      html += `
        <button class="day-strip-btn ${isSelected ? 'active' : ''}" data-date="${dStr}">
          <span class="day-strip-name">${dayNames[i]}</span>
          <span class="day-strip-number">${d.getDate()}</span>
          ${count > 0 ? `<span class="day-strip-indicator" style="${isSelected ? 'background:#fff;' : 'background:var(--accent-primary);'}"></span>` : '<span style="height:4px; margin-top:3px;"></span>'}
        </button>
      `;
    }

    gridEl.innerHTML = html;

    gridEl.querySelectorAll('.day-strip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedScheduleDate = btn.getAttribute('data-date');
        this.renderScheduleView();
      });
    });
  },

  setupTimelineDelegation(containerEl) {
    if (!containerEl || containerEl._hasTimelineDelegation) return;
    containerEl._hasTimelineDelegation = true;

    containerEl.addEventListener('click', async (e) => {
      const target = e.target;
      if (!target) return;

      // Handle carry over unfinished agenda action
      const carryBtn = target.closest('#btn-carry-over-action');
      if (carryBtn) {
        e.stopPropagation();
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterdayDate);
        const count = state.carryOverUnfinishedSchedules(yesterdayStr, getLocalDateString());
        notifications.showToast(`${count} agenda kemarin berhasil disalin ke hari ini.`, 'success');
        return;
      }

      // Handle toggle schedule complete
      const toggleBtn = target.closest('[data-action="toggle-complete"]');
      if (toggleBtn) {
        e.stopPropagation();
        const id = toggleBtn.getAttribute('data-id');
        const targetDate = toggleBtn.getAttribute('data-date');
        const sch = state.getSchedules(targetDate).find(s => s.id === id);
        const willComplete = !sch?.completed;

        if (willComplete) {
          particleBurst(toggleBtn, 'var(--status-success)');
          if (navigator.vibrate) {
            try { navigator.vibrate([15, 30, 20]); } catch (e) {}
          }
          notifications.playChime('crystal');
        }
        springBounce(toggleBtn);
        state.toggleScheduleComplete(id, targetDate);

        if (willComplete && sch) {
          this.showUndoCompletionToast(id, targetDate, sch.title);
        }
        return;
      }

      // Allow Google Calendar link without triggering card click
      if (target.closest('[data-action="gcal"]')) {
        return;
      }

      // Handle edit schedule
      const editBtn = target.closest('[data-action="edit-schedule"]');
      if (editBtn) {
        e.stopPropagation();
        this.openScheduleModal(editBtn.getAttribute('data-id'));
        return;
      }

      // Handle delete schedule
      const deleteBtn = target.closest('[data-action="delete-schedule"]');
      if (deleteBtn) {
        e.stopPropagation();
        const confirmed = await this.showConfirmDialog({
          title: 'Hapus Agenda Ini?',
          message: 'Agenda kegiatan ini akan dihapus dari agenda harianmu.',
          confirmText: 'Hapus',
          isDanger: true,
          icon: 'trash'
        });
        if (confirmed) {
          state.deleteSchedule(deleteBtn.getAttribute('data-id'));
          notifications.showToast('Jadwal berhasil dihapus.', 'info');
        }
        return;
      }

      // Click anywhere on card to open edit modal
      const card = target.closest('.timeline-card');
      if (card && !target.closest('button') && !target.closest('a')) {
        const id = card.getAttribute('data-id');
        if (id) {
          this.openScheduleModal(id);
        }
      }
    });

    containerEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.timeline-card');
        if (card && e.target === card) {
          e.preventDefault();
          const id = card.getAttribute('data-id');
          if (id) this.openScheduleModal(id);
        }
      }
    });
  },

  renderTimelineGrid(schedules, containerEl, isToday = false) {
    if (!containerEl) return;
    this.setupTimelineDelegation(containerEl);

    if (schedules.length === 0) {
      let carryOverBtnHtml = '';
      if (isToday) {
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = getLocalDateString(yesterdayDate);
        const unfinished = state.getUnfinishedSchedules(yesterdayStr);

        if (unfinished.length > 0) {
          carryOverBtnHtml = `
            <div style="margin-top:14px;">
              <button class="btn btn-secondary btn-sm" id="btn-carry-over-action">
                ${getIcon('refresh-cw', '', 14)} Salin ${unfinished.length} Agenda Belum Selesai dari Kemarin
              </button>
            </div>
          `;
        }
      }

      containerEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${getIcon('calendar', '', 20)}</div>
          <p class="empty-state-title">Tidak ada agenda ${isToday ? 'hari ini' : 'pada tanggal ini'}</p>
          <p class="empty-state-desc">Mulai hari dengan mencatat kegiatan atau susun jadwal otomatis bersama AI.</p>
          <div class="empty-state-actions">
            <button type="button" class="btn btn-primary btn-sm" id="btn-empty-add-schedule">
              ${getIcon('plus', '', 14)} Tambah Jadwal
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-empty-ai-plan">
              ${getIcon('bot', '', 14)} Rencana AI
            </button>
          </div>
          ${carryOverBtnHtml}
        </div>
      `;
      renderIcons(containerEl);

      const addBtn = containerEl.querySelector('#btn-empty-add-schedule');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          springBounce(addBtn);
          this.openScheduleModal(null, isToday ? getLocalDateString() : this.selectedScheduleDate);
        });
      }

      const aiPlanBtn = containerEl.querySelector('#btn-empty-ai-plan');
      if (aiPlanBtn) {
        aiPlanBtn.addEventListener('click', () => {
          springBounce(aiPlanBtn);
          this.switchTab('ai-plan');
        });
      }

      const carryBtn = containerEl.querySelector('#btn-carry-over-action');
      if (carryBtn) {
        carryBtn.addEventListener('click', () => {
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterdayStr = getLocalDateString(yesterdayDate);
          const count = state.carryOverUnfinishedSchedules(yesterdayStr, getLocalDateString());
          notifications.showToast(`${count} agenda kemarin berhasil disalin ke hari ini.`, 'success');
        });
      }
      return;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayStr = getLocalDateString(now);
    const conflicts = detectScheduleConflicts(schedules);
    const targetDate = schedules[0]?.date || this.selectedScheduleDate || getLocalDateString();

    let conflictBannerHtml = '';
    if (conflicts.size > 0) {
      conflictBannerHtml = `
        <div class="conflict-resolver-banner" id="conflict-resolver-banner">
          <div class="conflict-resolver-info">
            <span class="conflict-resolver-icon">${getIcon('alert-triangle', '', 18)}</span>
            <div class="conflict-resolver-text">
              <span class="conflict-resolver-title">Ada ${conflicts.size} Jadwal Bertabrakan</span>
              <span class="conflict-resolver-desc">Jadwal pada jam yang sama dapat membuyarkan fokus. AI dapat menata ulang jam luang secara otomatis.</span>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm conflict-resolver-btn" id="btn-resolve-conflicts">
            ${getIcon('cpu', '', 14)} Selesaikan Bentrok
          </button>
        </div>
      `;
    }

    const sortedSchedules = [...schedules].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const nowH = String(now.getHours()).padStart(2, '0');
    const nowM = String(now.getMinutes()).padStart(2, '0');
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
    let itemsHtml = '';

    sortedSchedules.forEach(s => {
      const timeVal = s.time || '00:00';
      const parts = timeVal.split(':').map(Number);
      const h = isNaN(parts[0]) ? 0 : parts[0];
      const m = isNaN(parts[1]) ? 0 : parts[1];
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + (s.duration || 30);
      const endH = String(Math.floor((endMinutes % 1440) / 60)).padStart(2, '0');
      const endM = String(endMinutes % 60).padStart(2, '0');
      const timeSpanText = `${timeVal} — ${endH}:${endM}`;
      const isActive = isToday && !s.completed && (s.date === todayStr) && currentMinutes >= startMinutes && currentMinutes <= endMinutes;

      // Insert Now indicator in chronological position
      if (isToday && !nowInserted && currentMinutes < startMinutes) {
        itemsHtml += nowIndicatorHtml;
        nowInserted = true;
      }

      // Priority badge
      let priorityBadgeHtml = '';
      if (s.priority === 'high') {
        priorityBadgeHtml = '<span class="priority-badge priority-high">P1 • Tinggi</span>';
      } else if (s.priority === 'low') {
        priorityBadgeHtml = '<span class="priority-badge priority-low">P3 • Rendah</span>';
      } else if (s.priority === 'medium') {
        priorityBadgeHtml = '<span class="priority-badge priority-medium">P2 • Sedang</span>';
      }

      // Deadline countdown badge
      let deadlineBadgeHtml = '';
      if (s.deadline) {
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dParts = s.deadline.split('-').map(Number);
        const deadDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
        if (!isNaN(deadDate.getTime())) {
          const dayDiff = Math.round((deadDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
          const dayName = deadDate.toLocaleDateString('id-ID', { weekday: 'long' });
          if (dayDiff < 0) {
            deadlineBadgeHtml = `<span class="deadline-badge is-urgent">${getIcon('alert-triangle', '', 11)} Terlewat (${Math.abs(dayDiff)}h)</span>`;
          } else if (dayDiff === 0) {
            deadlineBadgeHtml = `<span class="deadline-badge is-urgent">${getIcon('alert-triangle', '', 11)} Tenggat: HARI INI</span>`;
          } else if (dayDiff === 1) {
            deadlineBadgeHtml = `<span class="deadline-badge is-urgent">${getIcon('clock', '', 11)} Tenggat: Besok</span>`;
          } else {
            deadlineBadgeHtml = `<span class="deadline-badge">${getIcon('clock', '', 11)} Tenggat: ${dayName} (${dayDiff} hari)</span>`;
          }
        }
      }

      // Conflict / Overlap badge
      let conflictBadgeHtml = '';
      if (conflicts.has(s.id)) {
        const cInfo = conflicts.get(s.id);
        conflictBadgeHtml = `<span class="deadline-badge is-urgent" style="border-color:rgba(239,68,68,0.4); background:rgba(239,68,68,0.12); color:var(--status-danger);" title="Jadwal bertabrakan ${cInfo.overlapMinutes} menit dengan '${escapeHtml(cInfo.otherTitle)}'">${getIcon('alert-triangle', '', 11)} Bentrok ${cInfo.overlapMinutes}m</span>`;
      }

      // Recurrence badge
      let recurrenceBadgeHtml = '';
      if (s.recurrence && s.recurrence !== 'none') {
        const recLabels = {
          daily: 'Tiap Hari',
          weekdays: 'Hari Kerja',
          weekly: 'Mingguan',
          monthly: 'Bulanan'
        };
        const label = recLabels[s.recurrence] || 'Berulang';
        recurrenceBadgeHtml = `<span class="recurrence-badge" title="Agenda berulang: ${label}">${getIcon('repeat', '', 11)} ${label}</span>`;
      }

      const catInfo = state.getCategoryByName(s.category);
      const catColor = catInfo.color || '#f97316';
      const catBadgeHtml = `<span class="schedule-category-badge" style="background-color:${catColor}18; color:${catColor}; border:1px solid ${catColor}38;">
        <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background-color:${catColor}; margin-right:4px; vertical-align:middle;"></span>${escapeHtml(s.category || 'Kerja')}
      </span>`;

      const gcalUrl = generateGoogleCalendarUrl(s);

      itemsHtml += `
        <div class="timeline-row ${s.completed ? 'completed' : ''} ${isActive ? 'is-active' : ''} ${s.priority === 'high' ? 'priority-high-row' : ''} ${conflicts.has(s.id) ? 'timeline-row-conflict' : ''}">
          <!-- Column 1: Time -->
          <div class="timeline-time-col">
            <span class="timeline-time-val tabular-nums">${s.time}</span>
          </div>

          <!-- Column 2: Rail & Dot -->
          <div class="timeline-rail-col">
            <div class="timeline-dot ${isActive ? 'dot-active' : ''} ${s.completed ? 'dot-completed' : ''}"></div>
            <div class="timeline-line"></div>
          </div>

          <!-- Column 3: Card Content (Click to edit) -->
          <div class="timeline-card-col">
            <div class="timeline-card" data-id="${s.id}" tabindex="0" role="button" aria-label="${escapeHtml(s.title)}, ${s.completed ? 'selesai' : 'belum selesai'}. Klik untuk mengubah">
              <div class="timeline-card-header">
                <button type="button" 
                        class="schedule-check-circle ${s.completed ? 'is-checked' : ''}" 
                        data-action="toggle-complete" 
                        data-id="${s.id}" 
                        data-date="${s.date}"
                        title="${s.completed ? 'Tandai belum selesai' : 'Tandai selesai'}"
                        aria-label="${s.completed ? 'Tandai belum selesai' : 'Tandai selesai'}">
                  ${s.completed ? getIcon('check', '', 12) : ''}
                </button>

                <div class="timeline-card-main-info">
                  <div class="timeline-card-title">${escapeHtml(s.title)}</div>
                  ${s.description ? `<div class="timeline-card-desc" style="font-size:12px; color:var(--text-secondary); line-height:1.4;">${escapeHtml(s.description)}</div>` : ''}
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
                    ${getIcon('calendar', '', 13)}
                  </a>
                  <button type="button" 
                          class="card-icon-action text-danger" 
                          data-action="delete-schedule" 
                          data-id="${s.id}" 
                          title="Hapus Agenda" 
                          aria-label="Hapus Agenda">
                    ${getIcon('trash', '', 13)}
                  </button>
                </div>
              </div>

              <div class="timeline-card-footer">
                <div class="timeline-duration-tag">
                  ${getIcon('clock', '', 12)}
                  <span class="tabular-nums">${timeSpanText} (${s.duration} min)</span>
                  ${isActive ? '<span class="status-live-tag">Aktif</span>' : ''}
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

    // Bind resolve conflicts button if present
    const resolveBtn = containerEl.querySelector('#btn-resolve-conflicts');
    if (resolveBtn) {
      resolveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        springBounce(resolveBtn);
        this.handleResolveConflicts(conflicts, schedules, targetDate);
      });
    }
  },

  async handleResolveConflicts(conflicts, schedules, targetDate) {
    if (!GeminiService.isAiReady()) {
      notifications.showToast('Layanan AI belum siap. Hubungkan AI Gateway atau masukkan API Key di Pengaturan.', 'warning', 5000);
      return;
    }

    const btn = document.getElementById('btn-resolve-conflicts');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Menata ulang...`;
    }

    try {
      const solutions = await GeminiService.resolveScheduleConflicts(conflicts, schedules, targetDate);
      if (!solutions || solutions.length === 0) {
        notifications.showToast('Tidak ada rekomendasi pergeseran jadwal yang diperlukan.', 'info', 4000);
        return;
      }

      this.openConflictResolverModal(solutions);
    } catch (err) {
      notifications.showToast(`Gagal merapikan bentrok: ${err.message}`, 'error', 6000);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
        renderIcons(btn);
      }
    }
  },

  openConflictResolverModal(solutions) {
    const modal = document.getElementById('modal-conflict-resolver');
    const listEl = document.getElementById('conflict-solutions-list');
    if (!modal || !listEl) return;

    let html = '';
    solutions.forEach(sol => {
      html += `
        <div class="conflict-solution-card">
          <div class="conflict-solution-header">
            <span class="conflict-solution-title">${escapeHtml(sol.title || 'Kegiatan')}</span>
            <div class="conflict-solution-times">
              <span class="conflict-old-time tabular-nums">${escapeHtml(sol.oldTime || '--:--')}</span>
              <span class="conflict-arrow-icon">${getIcon('chevron-right', '', 12)}</span>
              <span class="conflict-new-time tabular-nums font-mono font-bold">${escapeHtml(sol.newTime || '--:--')}</span>
            </div>
          </div>
          ${sol.reason ? `<div class="conflict-solution-reason">${escapeHtml(sol.reason)}</div>` : ''}
        </div>
      `;
    });

    listEl.innerHTML = html;
    renderIcons(modal);

    const applyBtn = document.getElementById('btn-apply-conflict-solutions');
    if (applyBtn) {
      applyBtn.onclick = () => {
        let appliedCount = 0;
        solutions.forEach(sol => {
          if (sol.id && sol.newTime) {
            state.updateSchedule(sol.id, { time: sol.newTime });
            appliedCount++;
          }
        });
        window.dayflowApp.closeAllModals();
        notifications.playChime('crystal');
        notifications.showToast(`${appliedCount} jadwal berhasil disesuaikan tanpa tabrakan.`, 'success', 5000);
      };
    }

    modal.classList.add('open');
  },

  showUndoCompletionToast(scheduleId, targetDate, title) {
    const existing = document.getElementById('df-undo-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'df-undo-toast';
    toast.className = 'undo-toast';
    toast.innerHTML = `
      <div class="undo-toast-content">
        <span class="undo-toast-icon">${getIcon('check', '', 14)}</span>
        <span class="undo-toast-text">Selesai: <strong>${escapeHtml(title || 'Kegiatan')}</strong></span>
      </div>
      <button type="button" class="btn btn-ghost btn-xs undo-toast-btn" id="btn-undo-schedule-complete">
        ${getIcon('undo-2', '', 13)}
        Urungkan
      </button>
    `;

    document.body.appendChild(toast);
    renderIcons(toast);

    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });

    let cleared = false;
    const dismissTimer = setTimeout(() => {
      if (!cleared) {
        cleared = true;
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 250);
      }
    }, 5000);

    const undoBtn = toast.querySelector('#btn-undo-schedule-complete');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        if (!cleared) {
          cleared = true;
          clearTimeout(dismissTimer);
          toast.classList.remove('is-visible');
          setTimeout(() => toast.remove(), 250);
          state.toggleScheduleComplete(scheduleId, targetDate);
          notifications.showToast('Penyelesaian agenda berhasil diurungkan.', 'info', 3000);
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

    element.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
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
    const cur = new Date((this.selectedScheduleDate || getLocalDateString()) + 'T00:00:00');
    cur.setDate(cur.getDate() + delta);
    this.selectedScheduleDate = getLocalDateString(cur);
    const dateInput = document.getElementById('schedule-date-filter');
    if (dateInput) dateInput.value = this.selectedScheduleDate;
    this.renderScheduleView();
  }
};
