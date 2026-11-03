import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getLocalDateString } from '../../services/state';
import {
  Bot,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  Clock,
  FileText,
  Coffee,
  Laptop,
  Flame,
  CheckCircle2
} from 'lucide-react';

const TOTAL_SLIDES = 3;

const DEMO_PRESETS = [
  {
    id: 'work',
    label: 'Kerja & Koding',
    prompt: 'Jadwalkan koding jam 10:00 (90 menit) dan catat to-do sprint review.',
    schedule: { time: '10:00 - 11:30', title: 'Deep Work Koding', category: 'Fokus', color: '#38bdf8' },
    note: { title: 'Todo Sprint', snippet: 'Review PR & verifikasi proxy worker' }
  },
  {
    id: 'study',
    label: 'Kuliah & Tugas',
    prompt: 'Besok ada kuliah jam 08:00 dan buat catatan rangkuman materi.',
    schedule: { time: '08:00 - 10:00', title: 'Kuliah Algoritma & Data', category: 'Kuliah', color: '#10b981' },
    note: { title: 'Memo Kuliah', snippet: 'Bab 4: Algoritma traversal graf' }
  },
  {
    id: 'wellness',
    label: 'Kebugaran',
    prompt: 'Sore jam 16:30 jogging santai dan catat rutinitas hidrasi harian.',
    schedule: { time: '16:30 - 17:15', title: 'Jogging Santai Sore', category: 'Kesehatan', color: '#f97316' },
    note: { title: 'Target Hidrasi', snippet: 'Minum 2 liter air & peregangan' }
  }
];

export default function IntroModal() {
  const {
    introModal,
    closeIntroModal,
    sendPromptToAi,
    setActiveTab,
    setSelectedScheduleDate
  } = useApp();
  const { isOpen } = introModal;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState('next');
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [activeTimelineNode, setActiveTimelineNode] = useState(1);
  const [plannerPrompt, setPlannerPrompt] = useState('');

  const currentPreset = DEMO_PRESETS[activePresetIndex];

  // Subtle dynamic node indicator on Slide 1
  useEffect(() => {
    if (!isOpen || currentSlide !== 0) return;
    const interval = setInterval(() => {
      setActiveTimelineNode((prev) => (prev + 1) % 3);
    }, 2400);
    return () => clearInterval(interval);
  }, [isOpen, currentSlide]);

  // Reset states on open
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setSlideDirection('next');
      setActivePresetIndex(0);
      setActiveTimelineNode(1);
      setPlannerPrompt('');
    }
  }, [isOpen]);

  // Keyboard navigation (Esc to skip, Arrows to navigate)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeIntroModal();
      } else if (e.key === 'ArrowRight') {
        if (currentSlide < TOTAL_SLIDES - 1) {
          setSlideDirection('next');
          setCurrentSlide((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentSlide > 0) {
          setSlideDirection('prev');
          setCurrentSlide((prev) => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlide, closeIntroModal]);

  if (!isOpen) return null;

  const goToSlide = (slideIndex) => {
    if (slideIndex === currentSlide) return;
    setSlideDirection(slideIndex > currentSlide ? 'next' : 'prev');
    setCurrentSlide(slideIndex);
  };

  const handleNext = () => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setSlideDirection('next');
      setCurrentSlide((prev) => prev + 1);
    } else {
      closeIntroModal();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setSlideDirection('prev');
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    closeIntroModal();
  };

  const handlePlannerSubmit = (event) => {
    event.preventDefault();
    const prompt = plannerPrompt.trim();
    if (!prompt) return;

    sendPromptToAi(prompt);
    setPlannerPrompt('');
    closeIntroModal();
  };

  const handleQuickPrompt = (prompt) => {
    sendPromptToAi(prompt);
    closeIntroModal();
  };

  const handleOpenSchedule = () => {
    setSelectedScheduleDate(getLocalDateString());
    setActiveTab('schedule');
    closeIntroModal();
  };

  const progressPercent = ((currentSlide + 1) / TOTAL_SLIDES) * 100;

  return (
    <div
      className="intro-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Panduan Pengenalan DayFlow"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSkip();
      }}
    >
      <div className="intro-card-sheet">
        {/* Animated Top Progress Bar */}
        <div className="intro-top-progress-track">
          <div
            className="intro-top-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Top Header Bar */}
        <div className="intro-header-bar">
          <div className="intro-header-left">
            <div className="intro-stepper-dots" aria-label={`Langkah ${currentSlide + 1} dari ${TOTAL_SLIDES}`}>
              {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`intro-step-dot ${idx === currentSlide ? 'active' : ''} ${idx < currentSlide ? 'completed' : ''}`}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Lompat ke slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            className="intro-skip-btn"
            onClick={handleSkip}
            title="Lewati Pengenalan (Esc)"
            aria-label="Lewati Pengenalan"
          >
            <span>Lewati</span>
          </button>
        </div>

        {/* Dynamic Slide Viewport */}
        <div className="intro-slide-viewport">
          {/* SLIDE 1: Welcome & Core Purpose */}
          {currentSlide === 0 && (
            <div className={`intro-slide-content intro-slide-${slideDirection}`}>
              <div className="intro-slide-header-group">
                <h2 className="intro-slide-title">
                  Selamat Datang di Day<span className="text-accent">Flow</span>
                </h2>
                <p className="intro-slide-desc">
                  Asisten jadwal dan catatan harian cerdas dengan privasi lokal di peramban Anda.
                </p>
              </div>

              {/* Minimal Interactive Flowline Visualizer */}
              <div className="intro-flowline-minimal">
                <div className="intro-flowline-track">
                  <div
                    className={`intro-node-mini ${activeTimelineNode === 0 ? 'active' : ''}`}
                    onClick={() => setActiveTimelineNode(0)}
                  >
                    <div className="intro-node-badge node-orange">
                      <Coffee size={14} />
                    </div>
                    <div className="intro-node-meta">
                      <span className="intro-node-time font-mono">08:00</span>
                      <strong className="intro-node-label">Rutinitas Pagi</strong>
                    </div>
                  </div>

                  <div className="intro-node-connector" />

                  <div
                    className={`intro-node-mini ${activeTimelineNode === 1 ? 'active' : ''}`}
                    onClick={() => setActiveTimelineNode(1)}
                  >
                    <div className="intro-node-badge node-blue">
                      <Laptop size={14} />
                    </div>
                    <div className="intro-node-meta">
                      <span className="intro-node-time font-mono">10:30</span>
                      <strong className="intro-node-label">Deep Work</strong>
                    </div>
                  </div>

                  <div className="intro-node-connector" />

                  <div
                    className={`intro-node-mini ${activeTimelineNode === 2 ? 'active' : ''}`}
                    onClick={() => setActiveTimelineNode(2)}
                  >
                    <div className="intro-node-badge node-emerald">
                      <Flame size={14} />
                    </div>
                    <div className="intro-node-meta">
                      <span className="intro-node-time font-mono">16:00</span>
                      <strong className="intro-node-label">Olahraga & Rehat</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 Clean Value Highlights */}
              <div className="intro-highlights-grid">
                <div className="intro-highlight-card">
                  <div className="intro-highlight-icon icon-blue">
                    <ShieldCheck size={17} />
                  </div>
                  <div className="intro-highlight-text">
                    <strong>100% Privat Lokal</strong>
                    <span>Tersimpan aman di browser Anda tanpa akun pihak ketiga.</span>
                  </div>
                </div>

                <div className="intro-highlight-card">
                  <div className="intro-highlight-icon icon-orange">
                    <Clock size={17} />
                  </div>
                  <div className="intro-highlight-text">
                    <strong>Anti-Bentrok & Bel Akustik</strong>
                    <span>Deteksi waktu bertabrakan dan pengingat bel tepat waktu.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Chatbot AI Management (Jadwal & Catatan) */}
          {currentSlide === 1 && (
            <div className={`intro-slide-content intro-slide-${slideDirection}`}>
              <div className="intro-slide-header-group">
                <h2 className="intro-slide-title">Atur Jadwal & Catatan Lewat AI</h2>
                <p className="intro-slide-desc">
                  Cukup ketik rencana kegiatan atau ide Anda. DayFlow AI otomatis menyusun jadwal dan memo.
                </p>
              </div>

              {/* Scenario Preset Chips */}
              <div className="intro-preset-chips-list">
                {DEMO_PRESETS.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`intro-preset-chip ${idx === activePresetIndex ? 'active' : ''}`}
                    onClick={() => setActivePresetIndex(idx)}
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>

              {/* Sleek Chatbot Simulation Card */}
              <div className="intro-ai-chat-card">
                {/* User Prompt Message */}
                <div className="intro-chat-row is-user">
                  <div className="intro-chat-bubble user-bubble">
                    <span className="intro-chat-label">Pesan Perencana:</span>
                    <p className="intro-chat-text">{currentPreset.prompt}</p>
                  </div>
                </div>

                {/* AI Assistant Output Card */}
                <div className="intro-chat-row is-ai">
                  <div className="intro-chat-bubble ai-bubble">
                    <div className="intro-ai-badge-row">
                      <div className="intro-ai-sender">
                        <Bot size={13} className="text-orange" />
                        <span>DayFlow AI</span>
                      </div>
                      <span className="intro-ai-status-badge">
                        <Check size={11} /> Tersusun
                      </span>
                    </div>

                    <div className="intro-ai-results-box">
                      {/* Scheduled Event */}
                      <div className="intro-result-schedule-pill">
                        <span className="result-time font-mono">{currentPreset.schedule.time}</span>
                        <span className="result-title">{currentPreset.schedule.title}</span>
                        <span
                          className="result-tag"
                          style={{
                            color: currentPreset.schedule.color,
                            backgroundColor: `${currentPreset.schedule.color}15`,
                            borderColor: `${currentPreset.schedule.color}35`
                          }}
                        >
                          {currentPreset.schedule.category}
                        </span>
                      </div>

                      {/* Note / Memo */}
                      <div className="intro-result-note-pill">
                        <FileText size={12} className="text-muted flex-shrink-0" />
                        <span className="result-note-title">{currentPreset.note.title}:</span>
                        <span className="result-note-snippet">{currentPreset.note.snippet}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: Ready to Launch */}
          {currentSlide === 2 && (
            <div className={`intro-slide-content intro-slide-${slideDirection}`}>
              <div className="intro-slide-header-group">
                <h2 className="intro-slide-title">Rencanakan Langsung dengan AI</h2>
                <p className="intro-slide-desc">
                  Ketik rencana atau ide, lalu kirim ke Rencana AI untuk ditinjau sebelum disimpan.
                </p>
              </div>

              <div className="card today-chatbot-dock intro-ai-planner-dock">
                <div className="chatbot-dock-header">
                  <div className="chatbot-dock-identity">
                    <div className="chatbot-dock-avatar" aria-hidden="true">
                      <Bot size={16} />
                    </div>
                    <div className="chatbot-dock-meta">
                      <div className="chatbot-dock-title-row">
                        <span className="chatbot-dock-name">Asisten Perencanaan</span>
                        <span className="chatbot-status-indicator" aria-label="Siap membantu">
                          <span className="status-dot-pulse" />
                        </span>
                      </div>
                      <p className="chatbot-dock-subtitle">
                        Rencanakan kegiatan baru atau buat catatan cepat untuk hari ini.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handlePlannerSubmit} className="chatbot-input-bar">
                  <input
                    type="text"
                    className="chatbot-input-field"
                    value={plannerPrompt}
                    onChange={(event) => setPlannerPrompt(event.target.value)}
                    placeholder="Tulis rencana atau ide baru..."
                    aria-label="Input rencana asisten AI"
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm chatbot-send-btn"
                    disabled={!plannerPrompt.trim()}
                    title="Kirim ke Rencana AI"
                    aria-label="Kirim ke Rencana AI"
                  >
                    <ArrowRight size={15} />
                  </button>
                </form>

                <div className="chatbot-chips-row">
                  <button
                    type="button"
                    className="chatbot-chip"
                    onClick={() => handleQuickPrompt('Susun jadwal fokus kerja dan istirahat hari ini')}
                    title="Minta Asisten AI Menyusun Jadwal Hari Ini"
                  >
                    <Bot size={12} />
                    <span>Susun Jadwal AI</span>
                  </button>

                  <button
                    type="button"
                    className="chatbot-chip"
                    onClick={() => handleQuickPrompt('Tolong buatkan catatan memo tentang: ')}
                    title="Minta Asisten AI Mencatat Memo Baru"
                  >
                    <FileText size={12} />
                    <span>Catat Ide AI</span>
                  </button>

                  <button
                    type="button"
                    className="chatbot-chip"
                    onClick={() => handleQuickPrompt('Rangkum agenda penting dan catatan hari ini')}
                    title="Minta AI Merangkum Agenda & Catatan Hari Ini"
                  >
                    <CheckCircle2 size={12} />
                    <span>Rangkum Hari Ini</span>
                  </button>

                  <button
                    type="button"
                    className="chatbot-chip"
                    onClick={handleOpenSchedule}
                    title="Periksa Kalender & Jadwal Hari Ini"
                  >
                    <Clock size={12} />
                    <span>Cek Jadwal</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Controls */}
        <div className="intro-footer-controls">
          <button
            type="button"
            className="intro-nav-btn btn-prev"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            aria-label="Langkah sebelumnya"
          >
            <ArrowLeft size={16} />
            <span>Sebelumnya</span>
          </button>

          <span className="intro-counter-text font-mono">
            {currentSlide + 1} / {TOTAL_SLIDES}
          </span>

          <button
            type="button"
            className="intro-nav-btn btn-next"
            onClick={handleNext}
            aria-label={currentSlide === TOTAL_SLIDES - 1 ? 'Mulai Menggunakan' : 'Langkah selanjutnya'}
          >
            <span>{currentSlide === TOTAL_SLIDES - 1 ? 'Mulai Sekarang' : 'Selanjutnya'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
