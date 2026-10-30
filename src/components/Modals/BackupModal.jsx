import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { state, getLocalDateString } from '../../services/state';
import {
  X,
  Download,
  Upload,
  Calendar,
  FileText,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Layers,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';

export default function BackupModal() {
  const {
    backupModal,
    closeBackupModal,
    schedules,
    notes,
    categories,
    dailyLogs,
    exportData,
    exportIcsCalendar,
    importData,
    showToast
  } = useApp();

  const { isOpen, initialTab } = backupModal;
  const [activeTab, setActiveTab] = useState(initialTab || 'backup'); // 'backup' | 'ical'
  
  // File restore state
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileValidation, setFileValidation] = useState(null);
  const [restoreMode, setRestoreMode] = useState('merge'); // 'merge' | 'overwrite'
  const [isProcessing, setIsProcessing] = useState(false);

  // iCal filter state
  const [icalScope, setIcalScope] = useState('all'); // 'all' | 'month' | 'today'
  const [includeCompleted, setIncludeCompleted] = useState(true);

  // Reset tab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'backup');
      setSelectedFile(null);
      setFileValidation(null);
      setRestoreMode('merge');
    }
  }, [isOpen, initialTab]);

  const todayStr = getLocalDateString();
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  const monthSchedules = useMemo(() => {
    return schedules.filter((s) => s.date && s.date.startsWith(currentMonthStr));
  }, [schedules, currentMonthStr]);

  const todaySchedules = useMemo(() => {
    return schedules.filter((s) => s.date === todayStr);
  }, [schedules, todayStr]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showToast('Format berkas tidak didukung. Harap pilih berkas .json', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const validation = state.validateBackupPayload(parsed);
        setSelectedFile({
          name: file.name,
          sizeKb: Math.round(file.size / 1024),
          rawParsed: parsed
        });
        setFileValidation(validation);
        if (!validation.valid) {
          showToast(validation.error || 'Format cadangan DayFlow tidak valid', 'error');
        } else {
          showToast('Berkas cadangan berhasil diverifikasi', 'success');
        }
      } catch (err) {
        showToast('Gagal membaca file JSON: format teks rusak', 'error');
        setSelectedFile(null);
        setFileValidation(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestore = async () => {
    if (!selectedFile || !fileValidation || !fileValidation.valid) {
      showToast('Harap pilih berkas cadangan yang valid terlebih dahulu', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await importData(selectedFile.rawParsed, { mode: restoreMode });
      if (res && res.success) {
        setSelectedFile(null);
        setFileValidation(null);
        closeBackupModal();
      }
    } catch (error) {
      showToast(`Gagal memulihkan cadangan: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadIcs = () => {
    let targetList = schedules;
    let filenameSuffix = 'semua';

    if (icalScope === 'month') {
      targetList = monthSchedules;
      filenameSuffix = currentMonthStr;
    } else if (icalScope === 'today') {
      targetList = todaySchedules;
      filenameSuffix = todayStr;
    }

    if (targetList.length === 0) {
      showToast('Tidak ada jadwal kegiatan untuk diekspor pada filter ini', 'info');
      return;
    }

    const filename = `dayflow_agenda_${filenameSuffix}.ics`;
    exportIcsCalendar(targetList, filename, {
      calendarName: `DayFlow (${filenameSuffix})`,
      includeCompleted
    });
  };

  return (
    <div className="modal-overlay open" onClick={closeBackupModal} role="dialog" aria-modal="true" aria-labelledby="backup-modal-title">
      <div className="bottom-sheet backup-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />

        {/* Modal Header */}
        <div className="sheet-header">
          <div className="backup-modal-title-group">
            <div className="backup-modal-icon-badge" aria-hidden="true">
              <ShieldCheck size={18} className="text-orange" />
            </div>
            <div>
              <h3 id="backup-modal-title" className="sheet-title">Pusat Cadangan & Ekspor Data</h3>
              <p className="sheet-subtitle">Simpan salinan cadangan pribadi Anda atau ekspor ke format kalender universal.</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={closeBackupModal}
            aria-label="Tutup Jendela"
          >
            <X size={16} />
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="backup-tabs-row" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'backup'}
            className={`backup-tab-btn ${activeTab === 'backup' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            <HardDrive size={14} />
            <span>Cadangan Lengkap (JSON)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ical'}
            className={`backup-tab-btn ${activeTab === 'ical' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('ical')}
          >
            <Calendar size={14} />
            <span>Kalender Universal (.ics)</span>
          </button>
        </div>

        {/* Tab 1: Cadangan Lengkap (JSON) */}
        {activeTab === 'backup' && (
          <div className="backup-tab-content">
            {/* Live Data Summary Card */}
            <div className="backup-current-stats-card">
              <span className="backup-stats-title">Data Aktif di Perangkat Ini</span>
              <div className="backup-stats-grid">
                <div className="backup-stat-chip">
                  <span className="backup-stat-num">{schedules.length}</span>
                  <span className="backup-stat-label">Jadwal</span>
                </div>
                <div className="backup-stat-chip">
                  <span className="backup-stat-num">{notes.length}</span>
                  <span className="backup-stat-label">Catatan</span>
                </div>
                <div className="backup-stat-chip">
                  <span className="backup-stat-num">{categories.length}</span>
                  <span className="backup-stat-label">Kategori</span>
                </div>
                <div className="backup-stat-chip">
                  <span className="backup-stat-num">{dailyLogs.length}</span>
                  <span className="backup-stat-label">Hari Riwayat</span>
                </div>
              </div>
            </div>

            {/* Export Section */}
            <div className="backup-action-box">
              <div className="backup-action-header">
                <div>
                  <h4 className="backup-action-heading">Unduh Cadangan (.json)</h4>
                  <p className="backup-action-desc">
                    Simpan seluruh agenda, catatan, kategori, dan preferensi Anda ke satu file cadangan aman di komputer atau ponsel Anda.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={exportData}
                >
                  <Download size={14} />
                  <span>Unduh File Cadangan</span>
                </button>
              </div>
            </div>

            <div className="backup-divider-line" />

            {/* Restore Section */}
            <div className="backup-action-box">
              <h4 className="backup-action-heading">Pulihkan dari Berkas Cadangan</h4>
              <p className="backup-action-desc">
                Unggah file <code>.json</code> cadangan DayFlow untuk memulihkan jadwal dan catatan Anda.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,application/json"
                className="hidden"
              />

              {!selectedFile ? (
                <button
                  type="button"
                  className="backup-dropzone-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={22} className="text-orange" />
                  <span className="backup-dropzone-text">Pilih atau Seret Berkas Cadangan (.json)</span>
                  <span className="backup-dropzone-hint">Mendukung file cadangan DayFlow versi apa saja</span>
                </button>
              ) : (
                <div className="backup-preview-card">
                  <div className="backup-preview-header">
                    <div className="backup-preview-title-row">
                      <FileCode size={16} className="text-orange" />
                      <span className="backup-preview-filename">{selectedFile.name}</span>
                      <span className="backup-preview-size font-mono">{selectedFile.sizeKb} KB</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-icon text-danger"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileValidation(null);
                      }}
                      title="Batalkan Pilihan Berkas"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {fileValidation && fileValidation.valid ? (
                    <div className="backup-preview-body">
                      <div className="backup-preview-counts-row">
                        <span className="badge-tag">
                          {fileValidation.counts.schedules} Jadwal
                        </span>
                        <span className="badge-tag">
                          {fileValidation.counts.notes} Catatan
                        </span>
                        <span className="badge-tag">
                          {fileValidation.counts.categories} Kategori
                        </span>
                      </div>

                      <div className="backup-mode-selector">
                        <span className="backup-mode-label">Pilih Metode Pemulihan:</span>
                        <label className={`backup-mode-option ${restoreMode === 'merge' ? 'is-selected' : ''}`}>
                          <input
                            type="radio"
                            name="restoreMode"
                            value="merge"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                          />
                          <div className="backup-mode-info">
                            <span className="backup-mode-name">Gabungkan Data (Disarankan)</span>
                            <span className="backup-mode-sub">
                              Menambahkan agenda dan catatan baru tanpa menghapus data yang sedang ada di perangkat.
                            </span>
                          </div>
                        </label>

                        <label className={`backup-mode-option ${restoreMode === 'overwrite' ? 'is-selected' : ''}`}>
                          <input
                            type="radio"
                            name="restoreMode"
                            value="overwrite"
                            checked={restoreMode === 'overwrite'}
                            onChange={() => setRestoreMode('overwrite')}
                          />
                          <div className="backup-mode-info">
                            <span className="backup-mode-name text-danger">Ganti Seluruh Data</span>
                            <span className="backup-mode-sub">
                              Mengosongkan data saat ini dan menggantikannya secara total dengan isi file cadangan.
                            </span>
                          </div>
                        </label>
                      </div>

                      <div className="backup-preview-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedFile(null);
                            setFileValidation(null);
                          }}
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleExecuteRestore}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          <span>Terapkan Pemulihan Sekarang</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="backup-preview-error">
                      <AlertTriangle size={15} className="text-danger flex-shrink-0" />
                      <span>{fileValidation?.error || 'Berkas cadangan tidak valid atau rusak.'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Kalender Universal (.ics) */}
        {activeTab === 'ical' && (
          <div className="backup-tab-content">
            <div className="backup-ical-hero">
              <div className="backup-ical-hero-icon" aria-hidden="true">
                <Calendar size={22} className="text-orange" />
              </div>
              <div className="backup-ical-hero-text">
                <h4 className="backup-action-heading">Sinkronkan ke Aplikasi Kalender</h4>
                <p className="backup-action-desc">
                  Format berkas iCalendar (<code>.ics</code>) merupakan standar internasional (RFC 5545). File ini dapat diimpor langsung ke <strong>Google Calendar, Apple Calendar (Mac/iPhone), dan Outlook</strong>.
                </p>
              </div>
            </div>

            {/* Scope Selection Form */}
            <div className="backup-ical-form">
              <span className="backup-form-label">Cakupan Agenda yang Ingin Diekspor:</span>
              <div className="backup-scope-options-grid">
                <label className={`backup-scope-card ${icalScope === 'all' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="icalScope"
                    value="all"
                    checked={icalScope === 'all'}
                    onChange={() => setIcalScope('all')}
                  />
                  <div className="backup-scope-meta">
                    <span className="backup-scope-title">Semua Jadwal</span>
                    <span className="backup-scope-count font-mono">{schedules.length} kegiatan</span>
                  </div>
                </label>

                <label className={`backup-scope-card ${icalScope === 'month' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="icalScope"
                    value="month"
                    checked={icalScope === 'month'}
                    onChange={() => setIcalScope('month')}
                  />
                  <div className="backup-scope-meta">
                    <span className="backup-scope-title">Bulan Ini ({currentMonthStr})</span>
                    <span className="backup-scope-count font-mono">{monthSchedules.length} kegiatan</span>
                  </div>
                </label>

                <label className={`backup-scope-card ${icalScope === 'today' ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="icalScope"
                    value="today"
                    checked={icalScope === 'today'}
                    onChange={() => setIcalScope('today')}
                  />
                  <div className="backup-scope-meta">
                    <span className="backup-scope-title">Hari Ini Sahaja</span>
                    <span className="backup-scope-count font-mono">{todaySchedules.length} kegiatan</span>
                  </div>
                </label>
              </div>

              {/* Include Completed checkbox */}
              <label className="backup-checkbox-row">
                <input
                  type="checkbox"
                  checked={includeCompleted}
                  onChange={(e) => setIncludeCompleted(e.target.checked)}
                />
                <span>Sertakan juga kegiatan yang sudah ditandai selesai</span>
              </label>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleDownloadIcs}
                style={{ width: '100%', marginTop: '6px' }}
              >
                <Download size={14} />
                <span>Unduh File Kalender (.ics)</span>
              </button>
            </div>

            {/* Quick 3-step Instructions */}
            <div className="backup-guide-card">
              <div className="backup-guide-header">
                <Info size={14} className="text-orange" />
                <span className="backup-guide-title">Cara Mengimpor ke Kalender Anda</span>
              </div>
              <ul className="backup-guide-list">
                <li>
                  <strong>Google Calendar</strong>: Buka <code>calendar.google.com</code> &rarr; Ikon Roda Gigi (Setelan) &rarr; <em>Impor & Ekspor</em> &rarr; Pilih file <code>.ics</code> yang diunduh.
                </li>
                <li>
                  <strong>Apple Calendar (Mac/iPhone)</strong>: Cukup klik ganda file <code>.ics</code> di Mac atau ketuk berkas di aplikasi File iPhone untuk langsung menambahkannya ke kalender lokal.
                </li>
                <li>
                  <strong>Outlook</strong>: Buka Outlook &rarr; Menu <em>Berkas</em> &rarr; <em>Buka & Ekspor</em> &rarr; <em>Impor file iCalendar (.ics)</em>.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
