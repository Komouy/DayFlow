import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { getLocalDateString, getCustomBannerMedia, BANNER_PRESETS, state } from '../../services/state';
import { GeminiService } from '../../services/gemini';
import { detectScheduleConflicts, generateGoogleCalendarUrl } from '../../utils/scheduleHelpers';
import InfoTooltip from '../Common/InfoTooltip';
import {
  Calendar,
  Clock,
  Plus,
  Share2,
  CheckCircle,
  Circle,
  Trash2,
  Edit2,
  Bot,
  Flame,
  AlertTriangle,
  Volume2,
  VolumeX,
  FileText,
  Loader2,
  ExternalLink
} from 'lucide-react';

export default function TodayView() {
  const {
    schedules,
    notes,
    settings,
    productivity,
    openScheduleModal,
    openNoteModal,
    openShareModal,
    toggleScheduleComplete,
    deleteSchedule,
    setActiveTab,
    setSelectedScheduleDate,
    sendPromptToAi,
    showToast
  } = useApp();

  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [nowDate, setNowDate] = useState(() => new Date());
  const [greeting, setGreeting] = useState('Selamat Datang');
  const [dateDisplay, setDateDisplay] = useState('');
  const [customBannerUrl, setCustomBannerUrl] = useState(null);
  const [customBannerType, setCustomBannerType] = useState('image');
  const [isBannerMuted, setIsBannerMuted] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState('all'); // 'all' | 'pending' | 'completed'

  const todayStr = getLocalDateString();
  const todaySchedules = useMemo(() => {
    return state.getSchedules(todayStr);
  }, [schedules, todayStr]);

  const allCount = todaySchedules.length;
  const pendingCount = useMemo(() => todaySchedules.filter((s) => !s.completed).length, [todaySchedules]);
  const completedCount = useMemo(() => todaySchedules.filter((s) => s.completed).length, [todaySchedules]);

  const filteredTodaySchedules = useMemo(() => {
    if (timelineFilter === 'pending') {
      return todaySchedules.filter((s) => !s.completed);
    }
    if (timelineFilter === 'completed') {
      return todaySchedules.filter((s) => s.completed);
    }
    return todaySchedules;
  }, [todaySchedules, timelineFilter]);

  const sortedSchedules = useMemo(() => {
    return [...filteredTodaySchedules].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [filteredTodaySchedules]);

  const conflictsMap = useMemo(() => {
    return detectScheduleConflicts(todaySchedules);
  }, [todaySchedules]);

  // Current real-time minutes for active task detection & now marker
  const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const nowH = String(nowDate.getHours()).padStart(2, '0');
  const nowM = String(nowDate.getMinutes()).padStart(2, '0');

  // One-click AI Auto-Resolve Conflicts for Today's schedule
  const handleAutoResolveConflicts = async () => {
    if (conflictsMap.size === 0) return;
    setIsResolving(true);
    try {
      const resolutions = await GeminiService.resolveScheduleConflicts(
        conflictsMap,
        todaySchedules,
        todayStr
      );

      if (Array.isArray(resolutions) && resolutions.length > 0) {
        let updatedCount = 0;
        resolutions.forEach((res) => {
          if (res.id && res.newTime) {
            state.updateSchedule(res.id, { time: res.newTime });
            updatedCount++;
          }
        });
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

  // Timeline elements with chronologically positioned "Sekarang" needle indicator
  const timelineElements = useMemo(() => {
    if (sortedSchedules.length === 0) return [];

    const elements = [];
    let nowInserted = false;
    const shouldShowNowMarker = timelineFilter !== 'completed';

    sortedSchedules.forEach((item) => {
      const [h, m] = (item.time || '00:00').split(':').map(Number);
      const startMinutes = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);

      if (shouldShowNowMarker && !nowInserted && currentMinutes < startMinutes) {
        elements.push({ type: 'now', key: 'now-needle-marker' });
        nowInserted = true;
      }

      elements.push({ type: 'item', item, key: item.id });
    });

    if (shouldShowNowMarker && !nowInserted) {
      elements.push({ type: 'now', key: 'now-needle-marker' });
    }

    return elements;
  }, [sortedSchedules, currentMinutes, timelineFilter]);

  // Load custom banner media from IndexedDB if source is 'upload'
  useEffect(() => {
    let activeUrl = null;
    if (settings.heroBannerSource === 'upload') {
      getCustomBannerMedia().then((media) => {
        if (media && media.blob) {
          activeUrl = URL.createObjectURL(media.blob);
          setCustomBannerUrl(activeUrl);
          setCustomBannerType(media.mediaType || 'image');
        }
      });
    }
    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [settings.heroBannerSource, settings.hasConfiguredBanner]);

  useEffect(() => {
    function updateClockAndGreeting() {
      const now = new Date();
      setNowDate(now);
      const hour = now.getHours();
      let g = 'Selamat Pagi';
      if (hour >= 11 && hour < 15) g = 'Selamat Siang';
      else if (hour >= 15 && hour < 18) g = 'Selamat Sore';
      else if (hour >= 18 || hour < 4) g = 'Selamat Malam';

      if (settings.userName && settings.userName.trim()) {
        g += `, ${settings.userName.trim()}`;
      }
      setGreeting(g);

      setDateDisplay(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      );

      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTimeStr(`${h}:${m}:${s}`);
    }

    updateClockAndGreeting();
    const interval = setInterval(updateClockAndGreeting, 1000);
    return () => clearInterval(interval);
  }, [settings.userName]);

  const percent = productivity.percentage || 0;
  const totalCount = productivity.totalScheduled || 0;

  return (
    <section id="view-today" className="view-tab view-today-redesign">
      {/* Welcome Hero Container: Cinematic Trend Banner OR Sleek Minimalist Greeting Header */}
      {settings.heroBannerEnabled ? (
        <div className={`hero-trend-banner height-${settings.heroBannerHeight || 'normal'}`}>
          {/* Media Backdrop (Video / Image / Motion Mesh) */}
          <div className="hero-banner-media-wrap">
            {settings.heroBannerSource === 'preset' && (
              (() => {
                const preset = BANNER_PRESETS.find((p) => p.id === (settings.heroBannerPreset || 'tokyo_lofi')) || BANNER_PRESETS[0];
                if (preset.type === 'mesh') {
                  return <div className="hero-banner-mesh" style={{ width: '100%', height: '100%' }} />;
                }
                return <img src={preset.url} alt="DayFlow Banner" className="hero-banner-media hero-banner-img" fetchPriority="high" />;
              })()
            )}

            {settings.heroBannerSource === 'upload' && (
              customBannerUrl ? (
                customBannerType === 'video' ? (
                  <video
                    src={customBannerUrl}
                    className="hero-banner-media hero-banner-video"
                    autoPlay
                    muted={isBannerMuted}
                    loop
                    playsInline
                  />
                ) : (
                  <img src={customBannerUrl} alt="DayFlow Banner" className="hero-banner-media hero-banner-img" fetchPriority="high" />
                )
              ) : (
                <div className="hero-banner-mesh" style={{ width: '100%', height: '100%' }} />
              )
            )}

            {settings.heroBannerSource === 'url' && (
              settings.heroBannerUrl ? (
                settings.heroBannerMediaType === 'video' ? (
                  <video
                    src={settings.heroBannerUrl}
                    className="hero-banner-media hero-banner-video"
                    autoPlay
                    muted={isBannerMuted}
                    loop
                    playsInline
                  />
                ) : (
                  <img src={settings.heroBannerUrl} alt="DayFlow Banner" className="hero-banner-media hero-banner-img" fetchPriority="high" />
                )
              ) : (
                <div className="hero-banner-mesh" style={{ width: '100%', height: '100%' }} />
              )
            )}

            <div className={`hero-banner-overlay overlay-${settings.heroBannerOverlay || 'medium'}`} />
            <div className="hero-banner-ambient-glow" />
          </div>

          {/* Glassmorphism Floating HUD Content */}
          <div className="hero-banner-content">
            {/* Top Row: Audio Mute (if video) & Real-time Clock */}
            <div className="hero-banner-top-row">
              <div className="hero-banner-top-actions">
                {((settings.heroBannerSource === 'upload' && customBannerType === 'video') ||
                  (settings.heroBannerSource === 'url' && settings.heroBannerMediaType === 'video')) && (
                  <button
                    type="button"
                    className="btn-banner-audio"
                    onClick={() => setIsBannerMuted(!isBannerMuted)}
                    aria-label={isBannerMuted ? 'Aktifkan Audio Video' : 'Bisukan Audio Video'}
                    title={isBannerMuted ? 'Aktifkan Suara' : 'Bisukan Suara'}
                  >
                    {isBannerMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                )}
                <div className="hero-banner-live-clock" title="Waktu Saat Ini">
                  <Clock size={13} />
                  <span className="tabular-nums font-mono">{currentTimeStr}</span>
                </div>
              </div>
            </div>

            {/* Center/Main: Date, Greeting & Quote */}
            <div className="hero-banner-main-group">
              <span className="hero-banner-date tabular-nums">{dateDisplay}</span>
              <h2 className="hero-banner-title">{greeting}</h2>
              <p className="hero-banner-quote">{settings.heroBannerQuote || 'Fokus pada hal penting hari ini.'}</p>
            </div>

            {/* Bottom Row: Real-time Stats */}
            <div className="hero-banner-bottom-row">
              <div className="hero-banner-stat-pill">
                <CheckCircle size={13} />
                <span className="tabular-nums">{completedCount} / {totalCount} Selesai</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Sleek Minimalist Greeting Header */
        <div className="today-header-card">
          <div className="today-header-meta">
            <span className="today-date-badge font-mono tabular-nums">
              <Calendar size={13} />
              <span>{dateDisplay}</span>
            </span>
            <span className="today-clock-badge font-mono tabular-nums">
              <Clock size={13} />
              <span>{currentTimeStr}</span>
            </span>
          </div>

          <div className="today-greeting-row">
            <h2 className="today-heading">{greeting}</h2>
            <span className="today-stat-pill tabular-nums">
              {completedCount} / {totalCount} Selesai
            </span>
          </div>
        </div>
      )}

      {/* Modern Balanced Split Grid Layout */}
      <div className="responsive-split-grid">
        {/* Main Column: Timeline Activities */}
        <div className="split-column-main">
          <div className="page-control-bar">
          <div className="section-title-wrap">
            <span className="section-title">Timeline Hari Ini</span>
            <span className="badge-counter font-mono tabular-nums">
              {todaySchedules.length}
            </span>
          </div>

          <div className="control-bar-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => openShareModal(todayStr)}
              title="Bagikan Agenda Hari Ini"
              aria-label="Bagikan Agenda Hari Ini"
            >
              <Share2 size={14} />
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                sendPromptToAi('Susun jadwal kegiatan hari ini: ');
              }}
              title="Atur jadwal hari ini melalui Chatbot AI"
            >
              <Bot size={15} />
              <span>Atur Jadwal AI</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Timeline Pills: Semua / Belum Selesai / Selesai */}
        <div className="category-filter-pills-row" style={{ marginTop: '4px', marginBottom: '14px', borderTop: 'none', padding: 0 }}>
          <button
            type="button"
            className={`category-filter-pill ${timelineFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setTimelineFilter('all')}
          >
            <span>Semua</span>
            <span className="font-mono tabular-nums" style={{ fontSize: '11px', opacity: 0.85 }}>({allCount})</span>
          </button>
          <button
            type="button"
            className={`category-filter-pill ${timelineFilter === 'pending' ? 'is-active' : ''}`}
            onClick={() => setTimelineFilter('pending')}
          >
            <span>Belum Selesai</span>
            <span className="font-mono tabular-nums" style={{ fontSize: '11px', opacity: 0.85 }}>({pendingCount})</span>
          </button>
          <button
            type="button"
            className={`category-filter-pill ${timelineFilter === 'completed' ? 'is-active' : ''}`}
            onClick={() => setTimelineFilter('completed')}
          >
            <span>Selesai</span>
            <span className="font-mono tabular-nums" style={{ fontSize: '11px', opacity: 0.85 }}>({completedCount})</span>
          </button>
        </div>

        {/* Schedule Conflict Alert Banner (Anti-Slop, No Emoji, No Sparkles) */}
        {conflictsMap.size > 0 && (
          <div className="card schedule-conflict-banner" style={{ marginBottom: 14 }}>
            <div className="conflict-banner-left">
              <div className="conflict-banner-icon-wrap" aria-hidden="true">
                <AlertTriangle size={16} className="text-warning" />
              </div>
              <div className="conflict-banner-text">
                <span className="conflict-banner-title">Bentrok Jadwal Terdeteksi Hari Ini</span>
                <span className="conflict-banner-desc">
                  Terdapat {conflictsMap.size} kegiatan saling tumpang tindih waktu.
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

        {/* Timeline List */}
        <div className="timeline-container">
          {sortedSchedules.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon-wrap">
                {timelineFilter === 'completed' ? (
                  <CheckCircle size={28} className="text-muted" />
                ) : (
                  <Calendar size={28} />
                )}
              </div>
              <h4 className="empty-title">
                {allCount === 0
                  ? 'Belum Ada Agenda Hari Ini'
                  : timelineFilter === 'pending'
                  ? 'Semua Agenda Selesai!'
                  : 'Belum Ada Agenda yang Selesai'}
              </h4>
              <p className="empty-desc">
                {allCount === 0
                  ? 'Mulai hari dengan menambahkan kegiatan pertama atau minta AI menyusun jadwal harianmu.'
                  : timelineFilter === 'pending'
                  ? 'Luar biasa! Seluruh target agenda untuk hari ini telah tuntas diselesaikan.'
                  : 'Centang lingkaran kegiatan pada daftar agenda untuk menandainya sebagai selesai.'}
              </p>
              {allCount === 0 ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab('ai-plan')}
                >
                  <Bot size={14} className="text-orange" />
                  <span>Susun Jadwal dengan AI</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTimelineFilter('all')}
                >
                  <span>Lihat Semua Agenda</span>
                </button>
              )}
            </div>
          ) : (
            <div className="timeline-items-list">
              {timelineElements.map((el) => {
                if (el.type === 'now') {
                  return (
                    <div key={el.key} className="timeline-now-row" aria-label={`Waktu sekarang ${nowH}:${nowM}`}>
                      <div className="timeline-now-badge font-mono tabular-nums">
                        <Clock size={11} />
                        <span>{nowH}:{nowM}</span>
                      </div>
                      <div className="timeline-now-pulse-dot" />
                      <div className="timeline-now-line-wrap">
                        <div className="timeline-now-line" />
                        <span className="timeline-now-label">Sekarang</span>
                      </div>
                    </div>
                  );
                }

                const item = el.item;
                const [h, m] = (item.time || '00:00').split(':').map(Number);
                const startH = isNaN(h) ? 0 : h;
                const startM = isNaN(m) ? 0 : m;
                const startMinutes = startH * 60 + startM;
                const duration = Math.max(5, parseInt(item.duration, 10) || 30);
                const endMinutes = startMinutes + duration;
                const endH = String(Math.floor((endMinutes % 1440) / 60)).padStart(2, '0');
                const endM = String(endMinutes % 60).padStart(2, '0');
                const timeSpanText = `${item.time} — ${endH}:${endM}`;
                const isActive = !item.completed && currentMinutes >= startMinutes && currentMinutes <= endMinutes;
                const conflict = conflictsMap.get(item.id);
                const gCalUrl = generateGoogleCalendarUrl(item);

                return (
                  <div
                    key={item.id}
                    className={`timeline-card ${item.completed ? 'is-completed' : ''} ${conflict ? 'has-conflict-border' : ''} ${isActive ? 'is-active-schedule' : ''}`}
                    onClick={() => openScheduleModal(item, todayStr)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${item.title}, ${item.completed ? 'selesai' : 'belum selesai'}. Klik untuk mengubah`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openScheduleModal(item, todayStr);
                      }
                    }}
                  >
                    <div className="timeline-card-left">
                      <button
                        type="button"
                        className="timeline-check-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleScheduleComplete(item.id, todayStr);
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
                            <span
                              className="badge-tag badge-tag-warning"
                              title={`Bentrok dengan: ${conflict.otherTitle} (${conflict.overlapMinutes} mnt overlap)`}
                            >
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
                            <span>{timeSpanText} ({duration}m)</span>
                          </span>
                          {isActive && (
                            <span className="status-live-tag" title="Kegiatan sedang berlangsung sekarang">
                              <span className="status-live-dot" />
                              <span>Sedang Berlangsung</span>
                            </span>
                          )}
                          {item.category && (
                            <span className="category-pill-badge">
                              {item.category}
                            </span>
                          )}
                          {item.recurrence && item.recurrence !== 'none' && (
                            <span className="recurrence-badge">
                              Rutin
                            </span>
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
                        onClick={() => openScheduleModal(item, todayStr)}
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
      </div>

      {/* Secondary Column: Progress & Planning Assistant */}
      <div className="split-column-secondary">
        {/* Streamlined Clean Progress Bar Widget */}
        <div className="card today-progress-widget">
          <div className="today-progress-header">
            <div className="today-progress-title-row">
              <div className="today-progress-label-wrap">
                <span className="today-progress-title">Progres Hari Ini</span>
                <InfoTooltip
                  title="Progres Agenda Hari Ini"
                  text="Persentase penyelesaian kegiatan terjadwal hari ini. Rekapitulasi otomatis tersimpan pada pergantian hari pukul 24:00."
                />
              </div>
              <span className="today-progress-pill-badge tabular-nums font-mono">{percent}%</span>
            </div>
          </div>

          <div className="today-progress-track-wrap">
            <div
              className="today-progress-track"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div className="today-progress-fill" style={{ width: `${percent}%` }}>
                <span className="today-progress-shimmer" />
              </div>
            </div>
          </div>

          <div className="today-progress-meta-row">
            <span className="today-progress-meta-text">
              {totalCount === 0
                ? 'Belum ada agenda hari ini'
                : `${completedCount} dari ${totalCount} kegiatan selesai`}
            </span>
          </div>
        </div>

      </div>
    </div>
  </section>
  );
}
