import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  X,
  FileText,
  Calendar,
  Clock,
  Zap,
  Pin,
  Moon,
  Sun,
  Bot,
  Settings,
  PlusCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

export default function SearchModal() {
  const {
    searchModal,
    closeSearchModal,
    notes,
    schedules,
    openNoteModal,
    openScheduleModal,
    setSelectedScheduleDate,
    setActiveTab,
    setPendingChatPrompt,
    settings,
    updateSettings,
    showToast,
    openShortcutsModal
  } = useApp();

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'notes' | 'schedules' | 'actions'
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const resultsListRef = useRef(null);

  // Sync initial query when opened
  useEffect(() => {
    if (searchModal.isOpen) {
      setQuery(searchModal.initialQuery || '');
      setActiveFilter('all');
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [searchModal.isOpen, searchModal.initialQuery]);

  // Quick Actions Definition
  const quickActions = useMemo(() => {
    return [
      {
        id: 'act-ai-plan',
        type: 'action',
        title: 'Asisten AI (Jadwal & Catatan)',
        subtitle: 'Atur agenda harian dan catatan melalui chatbot AI',
        icon: Bot,
        shortcut: '3 / N',
        action: () => {
          closeSearchModal();
          setActiveTab('ai-plan');
        }
      },
      {
        id: 'act-new-note',
        type: 'action',
        title: 'Buat Catatan Baru',
        subtitle: 'Buka editor catatan cepat',
        icon: FileText,
        shortcut: 'M',
        action: () => {
          closeSearchModal();
          openNoteModal();
        }
      },
      {
        id: 'act-ai-chat',
        type: 'action',
        title: 'Buka Asisten AI (Rencana AI)',
        subtitle: 'Konsultasikan jadwal atau rencanakan hari',
        icon: Bot,
        shortcut: '3',
        action: () => {
          closeSearchModal();
          setActiveTab('ai-plan');
        }
      },
      {
        id: 'act-toggle-theme',
        type: 'action',
        title: settings.theme === 'light' ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang',
        subtitle: 'Beralih tema tampilan DayFlow',
        icon: settings.theme === 'light' ? Moon : Sun,
        shortcut: null,
        action: () => {
          closeSearchModal();
          const next = settings.theme === 'light' ? 'dark' : 'light';
          updateSettings({ theme: next });
          showToast(`Tema beralih ke ${next === 'light' ? 'Mode Terang' : 'Mode Gelap'}`, 'info');
        }
      },
      {
        id: 'act-open-shortcuts',
        type: 'action',
        title: 'Buka Daftar Pintasan Keyboard',
        subtitle: 'Lihat daftar lengkap tombol pintas aplikasi',
        icon: HelpCircle,
        shortcut: '?',
        action: () => {
          closeSearchModal();
          openShortcutsModal();
        }
      },
      {
        id: 'act-open-settings',
        type: 'action',
        title: 'Buka Setelan Aplikasi',
        subtitle: 'Konfigurasi AI, notifikasi, dan preferensi data',
        icon: Settings,
        shortcut: '5',
        action: () => {
          closeSearchModal();
          setActiveTab('settings');
        }
      }
    ];
  }, [closeSearchModal, openScheduleModal, openNoteModal, openShortcutsModal, setActiveTab, settings.theme, updateSettings, showToast]);

  // Filter and search computation
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Catatan (Notes)
    const matchedNotes = notes
      .filter((n) => {
        if (!q) return true;
        return (
          (n.title || '').toLowerCase().includes(q) ||
          (n.content || '').toLowerCase().includes(q) ||
          (n.category || '').toLowerCase().includes(q)
        );
      })
      .map((n) => {
        const noteTimestamp = n.updatedAt || n.createdAt;
        const noteDateStr = noteTimestamp
          ? new Date(noteTimestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
          : '';

        return {
          id: `note-${n.id}`,
          type: 'note',
          rawItem: n,
          title: n.title || 'Catatan Tanpa Judul',
          subtitle: n.content ? (n.content.length > 90 ? n.content.substring(0, 90) + '...' : n.content) : '(Konten kosong)',
          category: n.category,
          isPinned: !!(n.pinned || n.isPinned),
          date: noteDateStr,
          action: () => {
            closeSearchModal();
            setActiveTab('notes');
            openNoteModal(n);
          }
        };
      });

    // 2. Jadwal (Schedules)
    const matchedSchedules = schedules
      .filter((s) => {
        if (!q) return true;
        return (
          (s.title || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          (s.category || '').toLowerCase().includes(q) ||
          (s.date || '').includes(q) ||
          (s.time || '').includes(q)
        );
      })
      .map((s) => ({
        id: `sched-${s.id}`,
        type: 'schedule',
        rawItem: s,
        title: s.title || 'Agenda Tanpa Judul',
        subtitle: s.description || `${s.date || ''} • ${s.time || ''} (${s.duration || 30} menit)`,
        category: s.category || 'Umum',
        date: s.date || '',
        time: s.time || '',
        isCompleted: !!s.completed,
        priority: s.priority,
        action: () => {
          closeSearchModal();
          if (s.date) setSelectedScheduleDate(s.date);
          setActiveTab('schedule');
          openScheduleModal(s, s.date);
        }
      }));

    // 3. Aksi Cepat (Quick Actions)
    const matchedActions = quickActions.filter((act) => {
      if (!q) return true;
      return (
        act.title.toLowerCase().includes(q) ||
        act.subtitle.toLowerCase().includes(q)
      );
    });

    // AI Quick Launch (Pilar 4): allow typing any instruction or query directly to AI
    const aiLaunchActions = q && q.length >= 2 ? [
      {
        id: 'act-ai-quick-launch',
        type: 'action',
        title: `Tanyakan AI: "${query.trim()}"`,
        subtitle: 'Kirim instruksi langsung ke Asisten AI DayFlow',
        icon: Bot,
        shortcut: 'Enter',
        action: () => {
          closeSearchModal();
          setPendingChatPrompt(query.trim());
          setActiveTab('ai-plan');
        }
      }
    ] : [];

    // If query is empty: show curated initial view (Actions + Recent/Pinned Notes + Schedules)
    if (!q) {
      if (activeFilter === 'notes') return matchedNotes;
      if (activeFilter === 'schedules') return matchedSchedules;
      if (activeFilter === 'actions') return matchedActions;
      return [
        ...matchedActions.slice(0, 3),
        ...matchedNotes.slice(0, 4),
        ...matchedSchedules.slice(0, 4)
      ];
    }

    // With query, respect active filter tabs
    if (activeFilter === 'notes') return matchedNotes;
    if (activeFilter === 'schedules') return matchedSchedules;
    if (activeFilter === 'actions') return [...aiLaunchActions, ...matchedActions];

    return [...aiLaunchActions, ...matchedActions, ...matchedNotes, ...matchedSchedules];
  }, [query, activeFilter, notes, schedules, quickActions, closeSearchModal, setActiveTab, openNoteModal, setSelectedScheduleDate, openScheduleModal, setPendingChatPrompt]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeFilter]);

  // Keyboard navigation inside search palette
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredResults.length === 0 ? 0 : (prev + 1) % filteredResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredResults.length === 0 ? 0 : (prev - 1 + filteredResults.length) % filteredResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults.length > 0 && filteredResults[selectedIndex]) {
        filteredResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearchModal();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (resultsListRef.current) {
      const activeEl = resultsListRef.current.querySelector('.palette-item.is-selected');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!searchModal.isOpen) return null;

  const notesCount = notes.length;
  const schedulesCount = schedules.length;
  const actionsCount = quickActions.length;

  return (
    <div
      className="modal-overlay open search-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target.classList.contains('search-modal-overlay')) {
          closeSearchModal();
        }
      }}
    >
      <div className="search-palette-wrap" onKeyDown={handleKeyDown}>
        {/* Search Input Bar */}
        <div className="palette-input-bar">
          <Search size={18} className="palette-search-icon" />
          <input
            ref={inputRef}
            type="search"
            className="palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari catatan, jadwal, kegiatan, atau aksi cepat..."
            aria-label="Pencarian Global"
          />
          {query ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-icon palette-clear-btn"
              onClick={() => {
                setQuery('');
                if (inputRef.current) inputRef.current.focus();
              }}
              title="Bersihkan kueri"
              aria-label="Bersihkan"
            >
              <X size={15} />
            </button>
          ) : (
            <kbd className="palette-esc-badge" title="Tutup">Esc</kbd>
          )}
        </div>

        {/* Filter Pills */}
        <div className="palette-filters-bar">
          <button
            type="button"
            className={`palette-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            Semua
          </button>
          <button
            type="button"
            className={`palette-filter-pill ${activeFilter === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveFilter('notes')}
          >
            Catatan <span className="pill-count">{notesCount}</span>
          </button>
          <button
            type="button"
            className={`palette-filter-pill ${activeFilter === 'schedules' ? 'active' : ''}`}
            onClick={() => setActiveFilter('schedules')}
          >
            Jadwal <span className="pill-count">{schedulesCount}</span>
          </button>
          <button
            type="button"
            className={`palette-filter-pill ${activeFilter === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveFilter('actions')}
          >
            Aksi Cepat <span className="pill-count">{actionsCount}</span>
          </button>
        </div>

        {/* Results List */}
        <div className="palette-results-list" ref={resultsListRef}>
          {filteredResults.length === 0 ? (
            <div className="palette-empty-state">
              <Search size={24} className="text-muted" />
              <p className="empty-title">Tidak ada hasil ditemukan</p>
              <p className="empty-subtitle">
                Coba gunakan kata kunci lain untuk mencari catatan atau jadwal.
              </p>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`palette-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="button"
                  tabIndex={0}
                >
                  {/* Leading Icon */}
                  <div className={`palette-item-icon-box type-${item.type}`}>
                    {item.type === 'note' && <FileText size={16} />}
                    {item.type === 'schedule' && <Calendar size={16} />}
                    {item.type === 'action' && React.createElement(item.icon || Zap, { size: 16 })}
                  </div>

                  {/* Body Text */}
                  <div className="palette-item-content">
                    <div className="palette-item-header">
                      <span className="palette-item-title">{item.title}</span>
                      {item.isPinned && (
                        <span className="palette-tag-pinned" title="Disematkan">
                          <Pin size={10} />
                          <span>Pin</span>
                        </span>
                      )}
                    </div>
                    <p className="palette-item-subtitle">{item.subtitle}</p>
                  </div>

                  {/* Trailing Meta / Badges */}
                  <div className="palette-item-meta">
                    {item.type === 'note' && item.date && (
                      <span className="palette-badge-date">{item.date}</span>
                    )}

                    {item.type === 'schedule' && (
                      <div className="palette-sched-badges">
                        {item.time && (
                          <span className="palette-badge-time">
                            <Clock size={10} />
                            <span>{item.time}</span>
                          </span>
                        )}
                        {item.category && (
                          <span className="palette-badge-category">{item.category}</span>
                        )}
                      </div>
                    )}

                    {item.type === 'action' && item.shortcut && (
                      <kbd className="palette-action-kbd">{item.shortcut}</kbd>
                    )}

                    <ArrowRight size={13} className="palette-item-arrow" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="palette-footer">
          <div className="palette-footer-hints">
            <span className="footer-hint-item">
              <kbd className="hint-kbd">↑</kbd>
              <kbd className="hint-kbd">↓</kbd>
              <span>Navigasi</span>
            </span>
            <span className="footer-hint-divider">•</span>
            <span className="footer-hint-item">
              <kbd className="hint-kbd">↵</kbd>
              <span>Buka</span>
            </span>
            <span className="footer-hint-divider">•</span>
            <span className="footer-hint-item">
              <kbd className="hint-kbd">Esc</kbd>
              <span>Tutup</span>
            </span>
          </div>

          <div className="palette-footer-count">
            {filteredResults.length} hasil
          </div>
        </div>
      </div>
    </div>
  );
}
