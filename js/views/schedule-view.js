/**
 * DayFlow Schedule View Component
 * Handles Full Schedule, 7-day week strip, dynamic category filters, and mathematical timeline grid.
 */

import { state, getLocalDateString } from '../state.js';
import { getIcon, renderIcons } from '../icons.js';
import { notifications } from '../notifications.js';
import { particleBurst, springBounce } from '../animations.js';
import { escapeHtml, detectScheduleConflicts, generateGoogleCalendarUrl } from '../utils/helpers.js';

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
    this.renderTimelineGrid(schedules, listEl, false);

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
        if (!sch?.completed) {
          particleBurst(toggleBtn, 'var(--status-success)');
        }
        springBounce(toggleBtn);
        state.toggleScheduleComplete(id, targetDate);
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
          <p class="empty-state-desc">Gunakan tombol tambah di atas atau gunakan Rencana AI untuk merapikan kegiatanmu.</p>
          ${carryOverBtnHtml}
        </div>
      `;
      renderIcons(containerEl);

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

    containerEl.innerHTML = schedules.map(s => {
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

      return `
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

          <!-- Column 3: Card Content -->
          <div class="timeline-card-col">
            <div class="timeline-card">
              <div class="timeline-card-header">
                <div style="display:flex; flex-direction:column; gap:4px; min-width:0; flex:1;">
                  <div class="timeline-card-title">${escapeHtml(s.title)}</div>
                  ${s.description ? `<div class="timeline-card-desc" style="font-size:12px; color:var(--text-secondary); line-height:1.4;">${escapeHtml(s.description)}</div>` : ''}
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
                  ${getIcon('clock', '', 12)}
                  <span class="tabular-nums">${timeSpanText} (${s.duration} min)</span>
                  ${isActive ? '<span class="status-live-tag">Aktif</span>' : ''}
                </div>

                <div class="timeline-card-actions">
                  <a href="${gcalUrl}" 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     class="btn btn-ghost btn-xs" 
                     title="Buka di Google Calendar" 
                     aria-label="Buka di Google Calendar"
                     style="display:inline-flex; align-items:center; color:var(--text-secondary);">
                    ${getIcon('calendar', '', 13)}
                  </a>
                  <button class="btn btn-ghost btn-xs btn-check ${s.completed ? 'is-done' : ''}" 
                          data-action="toggle-complete" 
                          data-id="${s.id}" 
                          data-date="${s.date}"
                          title="${s.completed ? 'Tandai belum selesai' : 'Tandai selesai'}">
                    ${getIcon(s.completed ? 'check-circle' : 'circle', '', 14)}
                    <span>${s.completed ? 'Selesai' : 'Check'}</span>
                  </button>
                  <button class="btn btn-ghost btn-xs" data-action="edit-schedule" data-id="${s.id}" title="Ubah">
                    ${getIcon('edit', '', 13)}
                  </button>
                  <button class="btn btn-ghost btn-xs text-muted" data-action="delete-schedule" data-id="${s.id}" title="Hapus">
                    ${getIcon('trash', '', 13)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    renderIcons(containerEl);
  }
};
