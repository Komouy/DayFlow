import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getLocalDateString, state } from '../../services/state';
import DatePicker from '../Common/DatePicker';
import { GeminiService } from '../../services/gemini';
import { detectScheduleConflicts, generateGoogleCalendarUrl } from '../../utils/scheduleHelpers';
import InfoTooltip from '../Common/InfoTooltip';
import {
  Calendar,
  Clock,
  Plus,
  Share2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  Trash2,
  Edit2,
  Bot,
  AlertTriangle,
  Loader2,
  ExternalLink,
  X,
  FileText,
  Download
} from 'lucide-react';

export default function ScheduleView() {
  const {
    schedules,
    notes,
    categories,
    selectedScheduleDate,
    setSelectedScheduleDate,
    selectedCategory,
    setSelectedCategory,
    openScheduleModal,
    openNoteModal,
    openShareModal,
    openBackupModal,
    toggleScheduleComplete,
    deleteSchedule,
    setActiveTab,
    sendPromptToAi,
    setPendingChatPrompt,
    refreshAllState,
    showToast
  } = useApp();

  const [isResolving, setIsResolving] = useState(false);
  const [selectedTimelineId, setSelectedTimelineId] = useState(null);
  const todayStr = getLocalDateString();

  // Reset selected timeline dot when date changes
  useEffect(() => {
    setSelectedTimelineId(null);
  }, [selectedScheduleDate]);

  // Generate 7-day strip centered on or starting around selected date
  const weekDays = useMemo(() => {
    const base = new Date(selectedScheduleDate + 'T00:00:00');
    const validBase = isNaN(base.getTime()) ? new Date() : base;

    // Start 3 days before selected date to show contextual week
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(validBase);
      d.setDate(validBase.getDate() + i);
      const dateStr = getLocalDateString(d);
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
      const dayNum = d.getDate();
      days.push({
        dateStr,
        dayName,
        dayNum,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedScheduleDate
      });
    }
    return days;
  }, [selectedScheduleDate, todayStr]);

  const monthYearLabel = useMemo(() => {
    const d = new Date(selectedScheduleDate + 'T00:00:00');
    const valid = isNaN(d.getTime()) ? new Date() : d;
    return valid.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [selectedScheduleDate]);

  // All schedules for active date
  const daySchedules = useMemo(() => {
    return state.getSchedules(selectedScheduleDate);
  }, [schedules, selectedScheduleDate]);

  // Real-time conflict detection map
  const conflictsMap = useMemo(() => {
    return detectScheduleConflicts(daySchedules);
  }, [daySchedules]);

  // Filtered schedules for active category
  const filteredSchedules = useMemo(() => {
    if (selectedCategory !== 'all') {
      return daySchedules.filter((s) => (s.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }
    return daySchedules;
  }, [daySchedules, selectedCategory]);

  // Active item selected from the visual timeline dot
  const activeDetailItem = useMemo(() => {
    if (!selectedTimelineId) return null;
    return daySchedules.find((s) => s.id === selectedTimelineId) || null;
  }, [selectedTimelineId, daySchedules]);

  const shiftDate = (deltaDays) => {
    const d = new Date(selectedScheduleDate + 'T00:00:00');
    d.setDate(d.getDate() + deltaDays);
    setSelectedScheduleDate(getLocalDateString(d));
  };

  // One-click AI Auto-Resolve Conflicts
  const handleAutoResolveConflicts = async () => {
    if (conflictsMap.size === 0) return;
    setIsResolving(true);
    try {
      const resolutions = await GeminiService.resolveScheduleConflicts(
        conflictsMap,
        daySchedules,
        selectedScheduleDate
      );

      if (Array.isArray(resolutions) && resolutions.length > 0) {
        let updatedCount = 0;
        resolutions.forEach((res) => {
          if (res.id && res.newTime) {
            state.updateSchedule(res.id, { time: res.newTime });
            updatedCount++;
          }
        });
        refreshAllState();
        showToast(`${updatedCount} agenda berhasil disesuaikan waktu oleh AI tanpa bentrok`, 'success');
      } else {
        showToast('AI tidak menemukan penyesuaian waktu yang diperlukan', 'info');
      }
    } catch (err) {
      showToast(`Gagal menyelesaikan bentrok: ${err.message}`, 'error');
    } finally {
      setIsResolving(false);
    }
  };

  // Hybrid visual timeline bounds: 07:00 (420 min) to 22:00 (1320 min) = 900 minutes total
  const TIMELINE_START = 420;
  const TIMELINE_TOTAL = 900;
  const hourMarkers = [7, 9, 11, 13, 15, 17, 19, 21, 22];

  return (
    <section id="view-schedule" className="view-tab view-schedule-redesign">
      <div className="page-control-bar">
        <div className="section-title-wrap">
          <span className="section-title">Manajemen Jadwal</span>
          <InfoTooltip
            title="Manajemen Jadwal"
            text="Kelola seluruh agenda harian dan perulangan. Anda dapat memfilter berdasarkan tanggal atau kategori kegiatan."
          />
        </div>

        <div className="control-bar-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openBackupModal('ical')}
            title="Ekspor Jadwal ke Format Kalender (.ics) / Cadangan Data"
          >
            <Download size={14} />
            <span>Ekspor .ics</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openShareModal(selectedScheduleDate)}
            title="Bagikan Jadwal"
          >
            <Share2 size={14} />
            <span>Bagikan</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => openScheduleModal(null, selectedScheduleDate)}
            title="Tambah jadwal untuk tanggal yang dipilih"
          >
            <Plus size={14} />
            <span>Jadwal Baru</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              sendPromptToAi(`Tolong buatkan jadwal untuk tanggal ${selectedScheduleDate}: `);
            }}
            title="Atur jadwal tanggal ini melalui Chatbot AI"
          >
            <Bot size={15} />
            <span>Atur Jadwal AI</span>
          </button>
        </div>
      </div>

      {/* Week Selector Strip Card */}
      <div className="card week-strip-card-redesign">
        <div className="week-strip-header">
          <span className="week-strip-month-label">{monthYearLabel}</span>

          <div className="week-strip-nav-controls">
            <button
              type="button"
              className="btn btn-secondary btn-xs btn-icon"
              onClick={() => shiftDate(-7)}
              title="Minggu Sebelumnya"
              aria-label="Minggu Sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => setSelectedScheduleDate(todayStr)}
            >
              Hari Ini
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-xs btn-icon"
              onClick={() => shiftDate(7)}
              title="Minggu Berikutnya"
              aria-label="Minggu Berikutnya"
            >
              <ChevronRight size={14} />
            </button>
            <DatePicker
              id="schedule-calendar-date"
              value={selectedScheduleDate}
              onChange={setSelectedScheduleDate}
              compact
            />
          </div>
        </div>

        {/* 7-Day Matrix */}
        <div className="week-days-strip">
          {weekDays.map((day) => (
            <button
              key={day.dateStr}
              type="button"
              className={`week-day-pill ${day.isSelected ? 'is-selected' : ''} ${day.isToday ? 'is-today' : ''}`}
              onClick={() => setSelectedScheduleDate(day.dateStr)}
            >
              <span className="week-day-name">{day.dayName}</span>
              <span className="week-day-num font-mono tabular-nums">{day.dayNum}</span>
              {day.isToday && <span className="today-dot-indicator" />}
            </button>
          ))}
        </div>

        {/* Category Filter Pills */}
        <div className="category-filter-pills-row">
          <button
            type="button"
            className={`category-filter-pill ${selectedCategory === 'all' ? 'is-active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-filter-pill ${selectedCategory.toLowerCase() === cat.name.toLowerCase() ? 'is-active' : ''}`}
              onClick={() => setSelectedCategory(cat.name)}
            >
              <span className="cat-color-dot" style={{ backgroundColor: cat.color }} />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Collision Alert Banner (Anti-Slop, No Emoji, No Sparkles) */}
      {conflictsMap.size > 0 && (
        <div className="card schedule-conflict-banner">
          <div className="conflict-banner-left">
            <div className="conflict-banner-icon-wrap" aria-hidden="true">
              <AlertTriangle size={16} className="text-warning" />
            </div>
            <div className="conflict-banner-text">
              <span className="conflict-banner-title">Bentrok Jadwal Terdeteksi</span>
              <span className="conflict-banner-desc">
                Terdapat {conflictsMap.size} kegiatan saling tumpang tindih waktu pada tanggal ini.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm conflict-resolve-btn"
            onClick={handleAutoResolveConflicts}
            disabled={isResolving}
            title="AI Menyesuaikan Waktu Kegiatan yang Bentrok ke Slot Luang"
          >
            {isResolving ? (
              <Loader2 size={13} className="animate-spin text-orange" />
            ) : (
              <Bot size={13} />
            )}
            <span>Selesaikan Otomatis dengan AI</span>
          </button>
        </div>
      )}

      {/* Hybrid Mini-Timeline Grid (07:00 – 22:00) */}
      <div className="card hybrid-timeline-card">
        <div className="hybrid-timeline-header">
          <div className="hybrid-header-left">
            <Clock size={13} className="text-muted" />
            <span className="hybrid-header-title">Visualisasi Titik Waktu (07:00 - 22:00)</span>
          </div>
          <div className="hybrid-header-right-meta">
            <span className="hybrid-header-meta font-mono tabular-nums">
              {daySchedules.length} Agenda
            </span>
          </div>
        </div>

        <div className="hybrid-track-container">
          {/* Hour Markers */}
          <div className="hybrid-hour-markers-row">
            {hourMarkers.map((h) => (
              <span key={h} className="hybrid-hour-marker font-mono tabular-nums">
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {/* Event Track Bar with Dots (Titik) */}
          <div className="hybrid-track-bar">
            {/* Center baseline */}
            <div className="hybrid-track-baseline" />

            {/* Hour vertical grid ticks */}
            {hourMarkers.map((h) => {
              const tickPercent = Math.max(0, Math.min(100, ((h * 60 - TIMELINE_START) / TIMELINE_TOTAL) * 100));
              return (
                <div
                  key={`tick-${h}`}
                  className="hybrid-track-tick"
                  style={{ left: `${tickPercent}%` }}
                />
              );
            })}

            {/* Current Time Indicator (if selected date is today) */}
            {(() => {
              if (selectedScheduleDate !== todayStr) return null;
              const now = new Date();
              const nowMins = now.getHours() * 60 + now.getMinutes();
              if (nowMins < TIMELINE_START || nowMins > TIMELINE_START + TIMELINE_TOTAL) return null;
              const nowPercent = ((nowMins - TIMELINE_START) / TIMELINE_TOTAL) * 100;
              return (
                <div
                  className="hybrid-now-line"
                  style={{ left: `${nowPercent}%` }}
                  title={`Waktu Saat Ini: ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`}
                >
                  <div className="hybrid-now-dot" />
                </div>
              );
            })()}

            {/* Subtle duration span lines behind dots */}
            {daySchedules.map((item) => {
              const [h, m] = (item.time || '09:00').split(':').map(Number);
              const startMinutes = (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m);
              const duration = Math.max(10, parseInt(item.duration, 10) || 30);
              const isConflict = conflictsMap.has(item.id);
              const isSelected = selectedTimelineId === item.id;
              const leftPercent = Math.max(0, Math.min(100, ((startMinutes - TIMELINE_START) / TIMELINE_TOTAL) * 100));
              const widthPercent = Math.max(1.5, Math.min(100 - leftPercent, (duration / TIMELINE_TOTAL) * 100));

              return (
                <div
                  key={`span-${item.id}`}
                  className={`hybrid-event-span ${isConflict ? 'is-conflict' : ''} ${item.completed ? 'is-completed' : ''} ${isSelected ? 'is-selected' : ''}`}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`
                  }}
                />
              );
            })}

            {/* Interactive Timeline Dots (Titik) */}
            {daySchedules.map((item) => {
              const [h, m] = (item.time || '09:00').split(':').map(Number);
              const startMinutes = (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m);
              const duration = Math.max(10, parseInt(item.duration, 10) || 30);
              const isConflict = conflictsMap.has(item.id);
              const isSelected = selectedTimelineId === item.id;
              const leftPercent = Math.max(0, Math.min(100, ((startMinutes - TIMELINE_START) / TIMELINE_TOTAL) * 100));

              return (
                <button
                  key={`dot-${item.id}`}
                  type="button"
                  className={`hybrid-event-dot-wrap ${isConflict ? 'is-conflict' : ''} ${item.completed ? 'is-completed' : ''} ${isSelected ? 'is-selected' : ''}`}
                  style={{ left: `${leftPercent}%` }}
                  onClick={() => setSelectedTimelineId(isSelected ? null : item.id)}
                  title={`${item.time} (${duration}m): ${item.title}${isConflict ? ' [Bentrok Waktu]' : ''}. Klik untuk melihat informasi.`}
                  aria-label={`${item.time}: ${item.title}`}
                  aria-expanded={isSelected}
                >
                  <span className="hybrid-event-dot-node" />
                </button>
              );
            })}
          </div>

          {/* Interactive Information Box shown when a dot is clicked */}
          {activeDetailItem && (() => {
            const isConflict = conflictsMap.has(activeDetailItem.id);
            const conflictInfo = conflictsMap.get(activeDetailItem.id);
            const duration = Math.max(10, parseInt(activeDetailItem.duration, 10) || 30);

            const [startH, startM] = (activeDetailItem.time || '09:00').split(':').map(Number);
            const totalMins = (isNaN(startH) ? 9 : startH) * 60 + (isNaN(startM) ? 0 : startM) + duration;
            const endH = Math.floor(totalMins / 60) % 24;
            const endM = totalMins % 60;
            const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

            return (
              <div className="hybrid-dot-detail-card" role="region" aria-label="Informasi Agenda Terpilih">
                <div className="hybrid-detail-header">
                  <div className="hybrid-detail-badges">
                    <span className={`hybrid-detail-time-badge ${isConflict ? 'is-conflict' : ''} ${activeDetailItem.completed ? 'is-completed' : ''}`}>
                      <Clock size={12} />
                      <span>{activeDetailItem.time} – {endTimeStr} ({duration}m)</span>
                    </span>

                    {activeDetailItem.category && (
                      <span className="category-pill-badge">{activeDetailItem.category}</span>
                    )}

                    <span className={`hybrid-detail-status-badge ${activeDetailItem.completed ? 'is-completed' : ''}`}>
                      {activeDetailItem.completed ? (
                        <>
                          <CheckCircle size={11} className="text-success" />
                          <span>Selesai</span>
                        </>
                      ) : (
                        <>
                          <Circle size={11} className="text-muted" />
                          <span>Belum Selesai</span>
                        </>
                      )}
                    </span>

                    {isConflict && (
                      <span className="badge-tag badge-tag-warning">
                        <AlertTriangle size={11} /> Bentrok: {conflictInfo?.otherTitle}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="hybrid-detail-close-btn"
                    onClick={() => setSelectedTimelineId(null)}
                    title="Tutup Rincian"
                    aria-label="Tutup Rincian"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className={`hybrid-detail-title ${activeDetailItem.completed ? 'is-completed' : ''}`}>
                  {activeDetailItem.title}
                </div>

                {activeDetailItem.description && (
                  <div className="hybrid-detail-desc">
                    <FileText size={13} className="text-muted flex-shrink-0" />
                    <span>{activeDetailItem.description}</span>
                  </div>
                )}

                <div className="hybrid-detail-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm hybrid-action-btn"
                    onClick={() => toggleScheduleComplete(activeDetailItem.id)}
                  >
                    {activeDetailItem.completed ? (
                      <>
                        <Circle size={13} />
                        <span>Batal Selesai</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={13} className="text-success" />
                        <span>Tandai Selesai</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm hybrid-action-btn"
                    onClick={() => openScheduleModal(activeDetailItem, selectedScheduleDate)}
                  >
                    <Edit2 size={13} />
                    <span>Buka & Edit</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Schedule Items List */}
      <div className="timeline-container">
        {filteredSchedules.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon-wrap">
              <Calendar size={28} />
            </div>
            <h4 className="empty-title">Tidak Ada Agenda</h4>
            <p className="empty-desc">
              Tidak ada kegiatan pada tanggal dan kategori yang dipilih.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab('ai-plan')}
            >
              <Bot size={14} className="text-orange" />
              <span>Susun Jadwal dengan AI</span>
            </button>
          </div>
        ) : (
          <div className="timeline-items-list">
            {filteredSchedules.map((item) => {
              const conflict = conflictsMap.get(item.id);
              const gCalUrl = generateGoogleCalendarUrl(item);

              return (
                <div
                  key={item.id}
                  id={`schedule-card-${item.id}`}
                  className={`timeline-card ${item.completed ? 'is-completed' : ''} ${conflict ? 'has-conflict-border' : ''} ${selectedTimelineId === item.id ? 'active-timeline-focus' : ''}`}
                  onClick={() => openScheduleModal(item, selectedScheduleDate)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${item.title}, ${item.completed ? 'selesai' : 'belum selesai'}. Klik untuk mengubah`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openScheduleModal(item, selectedScheduleDate);
                    }
                  }}
                >
                  <div className="timeline-card-left">
                    <button
                      type="button"
                      className="timeline-check-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleScheduleComplete(item.id, selectedScheduleDate);
                      }}
                      aria-label={item.completed ? "Tandai belum selesai" : "Tandai selesai"}
                    >
                      {item.completed ? (
                        <CheckCircle size={18} className="text-success" />
                      ) : (
                        <Circle size={18} className="text-muted" />
                      )}
                    </button>

                    <div className="timeline-card-content">
                      <div className="timeline-card-title-row">
                        <span className={`timeline-card-title ${item.completed ? 'completed-text' : ''}`}>
                          {item.title}
                        </span>
                        {item.priority === 'high' && (
                          <span className="priority-pill priority-high">P1</span>
                        )}
                        {conflict && (
                          <span className="badge-tag badge-tag-warning" title={`Bentrok dengan: ${conflict.otherTitle}`}>
                            <AlertTriangle size={11} /> Bentrok: {conflict.otherTitle}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="timeline-card-desc">{item.description}</p>
                      )}

                      <div className="timeline-card-meta">
                        <span className="timeline-meta-time font-mono tabular-nums">
                          <Clock size={12} />
                          <span>{item.time} ({item.duration}m)</span>
                        </span>
                        {item.category && (
                          <span className="category-pill-badge">{item.category}</span>
                        )}
                        {item.recurrence && item.recurrence !== 'none' && (
                          <span className="recurrence-badge">Rutin</span>
                        )}
                        {item.deadline && (
                          <span className="deadline-badge font-mono" title={`Tenggat: ${item.deadline}`}>
                            Tenggat: {item.deadline}
                          </span>
                        )}
                        {(() => {
                          const linkedNote = item.relatedNoteId
                            ? notes?.find((n) => n.relatedScheduleId === item.relatedNoteId || n.id === item.relatedNoteId)
                            : notes?.find((n) => n.title && item.title && n.title.length > 3 && (n.title.toLowerCase().includes(item.title.toLowerCase()) || item.title.toLowerCase().includes(n.title.toLowerCase())));
                          if (!linkedNote) return null;
                          return (
                            <button
                              type="button"
                              className="timeline-linked-note-badge"
                              onClick={(e) => {
                                e.stopPropagation();
                                openNoteModal(linkedNote);
                              }}
                              title={`Buka Catatan: ${linkedNote.title}`}
                            >
                              <FileText size={11} className="text-orange" />
                              <span>{linkedNote.title}</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="timeline-card-actions" onClick={(e) => e.stopPropagation()}>
                    {gCalUrl && (
                      <a
                        href={gCalUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="btn btn-ghost btn-xs btn-icon"
                        title="Buka di Google Calendar"
                        aria-label="Buka di Google Calendar"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-icon"
                      onClick={() => openScheduleModal(item, selectedScheduleDate)}
                      title="Edit Jadwal"
                      aria-label="Edit Jadwal"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-icon text-danger"
                      onClick={() => deleteSchedule(item.id)}
                      title="Hapus Jadwal"
                      aria-label="Hapus Jadwal"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
