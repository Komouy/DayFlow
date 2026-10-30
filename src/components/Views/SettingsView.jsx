import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { GeminiService } from '../../services/gemini';
import { notifications } from '../../services/notifications';
import {
  BANNER_PRESETS,
  saveCustomBannerMedia,
  getCustomBannerMedia,
  deleteCustomBannerMedia,
  saveCustomAudioTone,
  getCustomAudioTone,
  deleteCustomAudioTone
} from '../../services/state';
import InfoTooltip from '../Common/InfoTooltip';
import {
  User,
  Bot,
  Zap,
  Moon,
  Sun,
  Monitor,
  Bell,
  Volume2,
  Music,
  Key,
  Eye,
  EyeOff,
  Download,
  Upload,
  Plus,
  Check,
  CheckCircle,
  Layers,
  ChevronDown,
  Trash2,
  ArrowUpRight,
  X,
  ShieldCheck,
  Calendar,
  HardDrive
} from 'lucide-react';

export default function SettingsView() {
  const {
    settings,
    updateSettings,
    profileStats,
    dailyLogs,
    categories,
    openCategoryModal,
    openBackupModal,
    exportData,
    exportIcsCalendar,
    importData,
    showToast
  } = useApp();

  // Local form state
  const [userName, setUserName] = useState(settings.userName || '');
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [groqApiKey, setGroqApiKey] = useState(settings.groqApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [aiProvider, setAiProvider] = useState(settings.aiProvider || 'gemini');
  const [bannerEnabled, setBannerEnabled] = useState(!!settings.heroBannerEnabled);
  const [bannerSource, setBannerSource] = useState(settings.heroBannerSource || 'preset');
  const [bannerPreset, setBannerPreset] = useState(settings.heroBannerPreset || 'tokyo_lofi');
  const [bannerHeight, setBannerHeight] = useState(settings.heroBannerHeight || 'normal');
  const [bannerOverlay, setBannerOverlay] = useState(settings.heroBannerOverlay || 'medium');
  const [bannerUrl, setBannerUrl] = useState(settings.heroBannerUrl || '');
  const [bannerMediaType, setBannerMediaType] = useState(settings.heroBannerMediaType || 'image');
  const [bannerQuote, setBannerQuote] = useState(settings.heroBannerQuote || 'Fokus pada hal penting hari ini.');
  const [customMediaData, setCustomMediaData] = useState(null);
  const [customMediaBlobUrl, setCustomMediaBlobUrl] = useState(null);

  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled !== false);
  const [soundTone, setSoundTone] = useState(settings.soundTone || 'crystal');
  const [notifyAdvance, setNotifyAdvance] = useState(settings.notifyAdvanceMinutes || 15);
  const [systemNotif, setSystemNotif] = useState(settings.systemNotificationsEnabled !== false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const saveAlertTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (saveAlertTimerRef.current) clearTimeout(saveAlertTimerRef.current);
    };
  }, []);

  const fileInputRef = useRef(null);
  const bannerFileInputRef = useRef(null);
  const customAudioFileInputRef = useRef(null);
  const [customAudioData, setCustomAudioData] = useState(null);

  // Load custom audio tone from IndexedDB on mount
  useEffect(() => {
    getCustomAudioTone().then((res) => {
      if (res && res.blob) {
        setCustomAudioData({ filename: res.filename });
      }
    });
  }, []);

  // Load custom banner media from IndexedDB on mount
  useEffect(() => {
    let activeUrl = null;
    getCustomBannerMedia().then((res) => {
      if (res && res.blob) {
        activeUrl = URL.createObjectURL(res.blob);
        setCustomMediaBlobUrl(activeUrl);
        setCustomMediaData({ filename: res.filename, mediaType: res.mediaType });
      }
    });
    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, []);

  const handleBannerFileUpload = async (file) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      showToast('Format file tidak didukung. Harap pilih video atau gambar.', 'error');
      return;
    }
    const maxSize = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(`Ukuran file terlalu besar (maksimal ${isVideo ? '50MB' : '15MB'}).`, 'error');
      return;
    }

    const saved = await saveCustomBannerMedia(file, isVideo ? 'video' : 'image', file.name);
    if (saved) {
      if (customMediaBlobUrl) URL.revokeObjectURL(customMediaBlobUrl);
      const url = URL.createObjectURL(file);
      setCustomMediaBlobUrl(url);
      setCustomMediaData({ filename: file.name, mediaType: isVideo ? 'video' : 'image' });
      setBannerSource('upload');
      updateSettings({
        heroBannerSource: 'upload',
        heroBannerMediaType: isVideo ? 'video' : 'image',
        hasConfiguredBanner: true
      });
      showToast(`${isVideo ? 'Video' : 'Gambar'} banner berhasil dipasang & disimpan lokal!`, 'success');
    } else {
      showToast('Gagal menyimpan file banner ke browser.', 'error');
    }
  };

  const handleRemoveUploadedBanner = async () => {
    await deleteCustomBannerMedia();
    if (customMediaBlobUrl) URL.revokeObjectURL(customMediaBlobUrl);
    setCustomMediaBlobUrl(null);
    setCustomMediaData(null);
    setBannerSource('preset');
    setBannerPreset('tokyo_lofi');
    updateSettings({
      heroBannerSource: 'preset',
      heroBannerPreset: 'tokyo_lofi'
    });
    showToast('File kustom dihapus, beralih ke preset.', 'info');
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateSettings({
      userName: userName.trim(),
      apiKey: apiKey.trim(),
      groqApiKey: groqApiKey.trim(),
      aiProvider,
      heroBannerEnabled: bannerEnabled,
      hasConfiguredBanner: true,
      heroBannerSource: bannerSource,
      heroBannerPreset: bannerPreset,
      heroBannerUrl: bannerUrl.trim(),
      heroBannerMediaType: bannerMediaType,
      heroBannerHeight: bannerHeight,
      heroBannerOverlay: bannerOverlay,
      heroBannerQuote: bannerQuote.trim(),
      soundEnabled,
      soundTone,
      notifyAdvanceMinutes: Number(notifyAdvance),
      systemNotificationsEnabled: systemNotif
    }, false);

    // Play chime sound if enabled
    try {
      if (soundEnabled) {
        notifications.playChime(soundTone);
      }
    } catch (_) {}

    // Show prominent inline Alert Banner in Settings
    setShowSaveAlert(true);
    if (saveAlertTimerRef.current) clearTimeout(saveAlertTimerRef.current);
    saveAlertTimerRef.current = setTimeout(() => {
      setShowSaveAlert(false);
    }, 6000);

    // Show floating toast notification
    showToast('Pengaturan berhasil disimpan.', 'success');

    // Scroll smoothly up so the user immediately sees the alert banner
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainViewport = document.querySelector('.main-viewport');
    if (mainViewport) {
      mainViewport.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTestAi = async () => {
    setIsTestingAi(true);
    try {
      if (aiProvider === 'groq') {
        const res = await GeminiService.testGroqConnection(groqApiKey);
        showToast(res.message || `Koneksi ${res.provider || 'Groq'} berhasil (${res.model})`, 'success');
      } else {
        const res = await GeminiService.testConnection(apiKey);
        showToast(res.message || `Koneksi Gemini berhasil (${res.model})`, 'success');
      }
    } catch (err) {
      showToast(`Uji koneksi gagal: ${err.message}`, 'error');
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleTestTone = (toneName) => {
    setSoundTone(toneName);
    notifications.unlockAudio();
    notifications.testChime(toneName);
  };

  const handleCustomAudioUpload = async (file) => {
    if (!file) return;
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name);
    if (!isAudio) {
      showToast('Format file tidak didukung. Harap pilih file audio (MP3, WAV, OGG, atau M4A).', 'error');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showToast('Ukuran file audio terlalu besar (maksimal 12MB).', 'error');
      return;
    }

    const saved = await saveCustomAudioTone(file, file.name);
    if (saved) {
      setCustomAudioData({ filename: file.name });
      setSoundTone('custom');
      updateSettings({ soundTone: 'custom', customAudioFilename: file.name });
      await notifications.reloadCustomAudioTone();
      showToast('File audio berhasil disimpan sebagai nada pengingat!', 'success');
      notifications.unlockAudio();
      notifications.testChime('custom');
    } else {
      showToast('Gagal menyimpan file audio ke peramban.', 'error');
    }
  };

  const handleRemoveCustomAudio = async () => {
    await deleteCustomAudioTone();
    await notifications.reloadCustomAudioTone();
    setCustomAudioData(null);
    setSoundTone('crystal');
    updateSettings({ soundTone: 'crystal', customAudioFilename: '' });
    showToast('Nada audio kustom dihapus, kembali ke Crystal Bell.', 'info');
  };

  const handleTestNotification = async () => {
    notifications.unlockAudio();
    await notifications.testNotification(soundTone);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importData(reader.result);
    };
    reader.readAsText(file);
  };

  return (
    <section id="view-settings" className="view-tab view-settings-redesign">
      <div className="page-control-bar">
        <div className="section-title-wrap">
          <span className="section-title">Pengaturan</span>
          <InfoTooltip
            title="Pengaturan Akun & Sistem"
            text="Kelola profil, preferensi mesin AI, tema peramban, serta bel pengingat dan cadangan data."
          />
        </div>
      </div>

      {/* Settings Save Success Alert Banner */}
      {showSaveAlert && (
        <div id="settings-save-alert" className="alert-banner alert-banner-success animate-fade-in" style={{ marginBottom: '16px' }}>
          <div className="alert-banner-icon-wrap">
            <CheckCircle size={18} />
          </div>
          <div className="alert-banner-content">
            <span className="alert-banner-title">Pengaturan Berhasil Disimpan</span>
            <span className="alert-banner-desc">Preferensi profil, API key, tema, dan pengingat telah diperbarui ke penyimpanan lokal.</span>
          </div>
          <button
            type="button"
            className="btn-close-alert"
            onClick={() => setShowSaveAlert(false)}
            aria-label="Tutup Alert"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Profil & Rekap Produktivitas Card */}
      <div className="card settings-rekap-card">
        <div className="settings-rekap-header">
          <div className="rekap-avatar-wrap">
            <User size={18} />
          </div>
          <div className="rekap-title-wrap">
            <div className="rekap-title-row">
              <span className="settings-card-title">
                {userName ? `Profil ${userName}` : 'Profil Pengguna'}
              </span>
              <InfoTooltip
                title="Rekapitulasi Produktivitas"
                text="Rekapitulasi pencapaian agenda harian yang dihitung otomatis berdasarkan persentase agenda tuntas pada pukul 24:00."
              />
            </div>
          </div>
        </div>

        {/* 4 Clean Metric Boxes */}
        <div className="settings-stats-grid">
          <div className="settings-stat-box">
            <span className="stat-number font-mono tabular-nums">{profileStats.todayTotal}</span>
            <span className="stat-label">Jadwal Hari Ini</span>
          </div>
          <div className="settings-stat-box">
            <span className="stat-number font-mono tabular-nums">{profileStats.todayCompleted}</span>
            <span className="stat-label">Jadwal Selesai</span>
          </div>
          <div className="settings-stat-box">
            <span className="stat-number text-orange font-mono tabular-nums">{profileStats.todayPercent}%</span>
            <span className="stat-label">Progres</span>
          </div>
          <div className="settings-stat-box">
            <span className="stat-number font-mono tabular-nums">{profileStats.perfectDays}</span>
            <span className="stat-label">Hari Tuntas 100%</span>
          </div>
        </div>

        {/* Collapsible History */}
        {dailyLogs && dailyLogs.length > 0 && (
          <details className="settings-history-details">
            <summary className="settings-history-summary">
              <span>Riwayat Hari Sebelumnya</span>
              <ChevronDown size={14} />
            </summary>
            <div className="settings-history-list">
              {dailyLogs.slice(0, 5).map((log, i) => (
                <div key={i} className="history-row font-mono tabular-nums">
                  <span className="history-date">{log.date}</span>
                  <span className="history-stat">{log.completedCount} / {log.totalScheduled} Selesai</span>
                  <span className="history-percent text-orange">{log.percentage}%</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="settings-form-sections">
        {/* ROW 1 (Left): Profil & Tema Tampilan */}
        <div className="card settings-card-clean">
          <div className="settings-row-between">
            <div className="settings-label-with-tooltip">
              <span className="settings-field-title">Nama Panggilan</span>
              <InfoTooltip
                title="Nama Panggilan"
                text="Nama Anda untuk sapaan di beranda. Jika dikosongkan, sapaan tampil universal tanpa nama."
              />
            </div>
          </div>
          <input
            type="text"
            className="input-control"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Nama Anda"
            maxLength={30}
          />

          <div className="settings-column" style={{ marginTop: '6px' }}>
            <div className="settings-label-with-tooltip" style={{ marginBottom: '8px' }}>
              <span className="settings-field-title">Tema Tampilan</span>
              <InfoTooltip
                title="Tema Tampilan"
                text="Pilih kontras gelap, terang, atau ikuti setelan sistem perangkat Anda."
              />
            </div>

            <div className="theme-pills-row">
              <button
                type="button"
                className={`theme-pill ${settings.theme === 'dark' ? 'is-active' : ''}`}
                onClick={() => updateSettings({ theme: 'dark' })}
              >
                <Moon size={14} />
                <span>Gelap</span>
              </button>
              <button
                type="button"
                className={`theme-pill ${settings.theme === 'light' ? 'is-active' : ''}`}
                onClick={() => updateSettings({ theme: 'light' })}
              >
                <Sun size={14} />
                <span>Terang</span>
              </button>
              <button
                type="button"
                className={`theme-pill ${settings.theme === 'system' ? 'is-active' : ''}`}
                onClick={() => updateSettings({ theme: 'system' })}
              >
                <Monitor size={14} />
                <span>Sistem</span>
              </button>
            </div>
          </div>
        </div>

        {/* ROW 1 (Right): Kecerdasan AI */}
        <div className="card settings-card-clean">
          <div className="settings-row-between">
            <div className="settings-label-with-tooltip">
              <span className="settings-field-title">Mesin Kecerdasan AI</span>
              <InfoTooltip
                title="Mesin Kecerdasan AI"
                text="Pilih model AI utama untuk penjadwalan cerdas dan asisten harian."
              />
            </div>
            <span className="badge-tag badge-tag-success">AI Terhubung</span>
          </div>

          <div className="ai-engine-switcher">
            <button
              type="button"
              className={`engine-tab ${aiProvider === 'gemini' ? 'is-active' : ''}`}
              onClick={() => setAiProvider('gemini')}
            >
              <Bot size={15} />
              <span>Google Gemini</span>
            </button>
            <button
              type="button"
              className={`engine-tab ${aiProvider === 'groq' ? 'is-active' : ''}`}
              onClick={() => setAiProvider('groq')}
            >
              <Zap size={15} />
              <span>Groq (LPU)</span>
            </button>
          </div>

          {/* Model info banner */}
          <div className="model-info-pill">
            <span className="font-mono" style={{ fontWeight: 600 }}>
              {aiProvider === 'gemini' ? 'Gemini 2.0 Flash-Lite' : 'Llama 3.3 70B Versatile'}
            </span>
            <span className="text-muted text-xs">
              {aiProvider === 'gemini' ? 'Tercepat & hemat token' : 'Eksekusi ultra-cepat di Groq LPU'}
            </span>
          </div>

          {/* API Key Input (Collapsible) */}
          <details className="settings-key-details">
            <summary className="settings-key-summary">
              <Key size={13} />
              <span>Gunakan API Key Pribadi (Opsional)</span>
              <InfoTooltip
                title="API Key Pribadi"
                text="Opsional. Kosongkan jika ingin memakai gateway bawaan. Masukkan jika ingin kuota khusus pribadi dari Google AI Studio atau Groq."
              />
            </summary>
            <div className="key-input-container">
              <div className="key-input-row">
                <input
                  type={aiProvider === 'gemini' ? (showApiKey ? 'text' : 'password') : (showGroqKey ? 'text' : 'password')}
                  className="input-control font-mono"
                  value={aiProvider === 'gemini' ? apiKey : groqApiKey}
                  onChange={(e) => {
                    if (aiProvider === 'gemini') setApiKey(e.target.value);
                    else setGroqApiKey(e.target.value);
                  }}
                  placeholder="API Key"
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => {
                    if (aiProvider === 'gemini') setShowApiKey(!showApiKey);
                    else setShowGroqKey(!showGroqKey);
                  }}
                  title="Lihat / Sembunyikan Key"
                >
                  {(aiProvider === 'gemini' ? showApiKey : showGroqKey) ? (
                    <EyeOff size={15} />
                  ) : (
                    <Eye size={15} />
                  )}
                </button>
              </div>

              {(aiProvider === 'gemini' ? apiKey : groqApiKey) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-danger"
                  onClick={() => {
                    if (aiProvider === 'gemini') setApiKey('');
                    else setGroqApiKey('');
                  }}
                  style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                >
                  <Trash2 size={12} />
                  <span>Hapus Key Pribadi</span>
                </button>
              )}
            </div>
          </details>

          <div className="ai-actions-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleTestAi}
              disabled={isTestingAi}
            >
              <Bot size={13} />
              <span>{isTestingAi ? 'Menguji...' : 'Uji Koneksi AI'}</span>
            </button>
          </div>
        </div>

        {/* ROW 2: Banner Visual Sambutan (Dedicated Full-Width Card) */}
        <div className="card settings-card-clean settings-card-full-width">
          <div className="settings-row-between">
            <div className="settings-label-with-tooltip">
              <span className="settings-field-title" style={{ fontSize: '14.5px', fontWeight: 700 }}>
                Banner Visual Sambutan
              </span>
              <InfoTooltip
                title="Banner Visual Sambutan"
                text="Tampilkan kartu visual sinematik dengan video atau gambar di bagian atas halaman Hari Ini."
              />
            </div>
            <label className="toggle-switch" aria-label="Tampilkan Banner Visual Sambutan">
              <input
                type="checkbox"
                checked={bannerEnabled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setBannerEnabled(checked);
                  updateSettings({ heroBannerEnabled: checked, hasConfiguredBanner: true });
                }}
              />
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </label>
          </div>
          <span className="text-muted text-xs" style={{ display: 'block', marginTop: '-4px', lineHeight: 1.4 }}>
            Tampilkan kartu visual sinematik dengan gambar dinamis, video lofi, atau animasi mesh di beranda Hari Ini.
          </span>

          {bannerEnabled && (
            <div className="banner-studio-grid">
              {/* Left Column: Live Preview, Quote, and Display Sliders */}
              <div className="banner-studio-column">
                <div className="banner-mini-preview-wrap" style={{ marginTop: 0 }}>
                  <span className="preview-badge-label">PRATINJAU LANGSUNG</span>
                  <div className="banner-mini-preview-card">
                    {bannerSource === 'preset' && (
                      (() => {
                        const p = BANNER_PRESETS.find((item) => item.id === bannerPreset) || BANNER_PRESETS[0];
                        if (p.type === 'mesh') {
                          return <div className="mini-preview-media hero-banner-mesh" />;
                        }
                        return <img src={p.thumb || p.url} alt="Preview Banner" className="mini-preview-media" />;
                      })()
                    )}
                    {bannerSource === 'upload' && (
                      customMediaBlobUrl ? (
                        customMediaData?.mediaType === 'video' ? (
                          <video src={customMediaBlobUrl} className="mini-preview-media" autoPlay muted loop playsInline />
                        ) : (
                          <img src={customMediaBlobUrl} alt="Preview Banner" className="mini-preview-media" />
                        )
                      ) : (
                        <div className="mini-preview-media hero-banner-mesh" />
                      )
                    )}
                    {bannerSource === 'url' && (
                      bannerUrl.trim() ? (
                        bannerMediaType === 'video' ? (
                          <video src={bannerUrl.trim()} className="mini-preview-media" autoPlay muted loop playsInline />
                        ) : (
                          <img src={bannerUrl.trim()} alt="Preview Banner" className="mini-preview-media" />
                        )
                      ) : (
                        <div className="mini-preview-media hero-banner-mesh" />
                      )
                    )}
                    <div className={`mini-preview-overlay overlay-${bannerOverlay}`} />
                    <div className="mini-preview-hud">
                      <span className="mini-preview-title">
                        {userName.trim() ? `Selamat Datang, ${userName.trim()}` : 'Selamat Datang'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Teks Motivasi Banner */}
                <div className="settings-column">
                  <label className="input-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                    Teks Motivasi Banner
                  </label>
                  <input
                    type="text"
                    className="input-control"
                    value={bannerQuote}
                    onChange={(e) => {
                      setBannerQuote(e.target.value);
                      updateSettings({ heroBannerQuote: e.target.value });
                    }}
                    placeholder="Fokus pada hal penting hari ini."
                    maxLength={60}
                  />
                </div>

                {/* Side-by-side: Tinggi Banner & Kontras Overlay */}
                <div className="banner-options-split">
                  <div className="settings-column">
                    <label className="input-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                      Tinggi Banner
                    </label>
                    <div className="pill-segmented-group">
                      <button
                        type="button"
                        className={`size-pill ${bannerHeight === 'compact' ? 'is-active' : ''}`}
                        onClick={() => {
                          setBannerHeight('compact');
                          updateSettings({ heroBannerHeight: 'compact' });
                        }}
                      >
                        Kompak
                      </button>
                      <button
                        type="button"
                        className={`size-pill ${bannerHeight === 'normal' ? 'is-active' : ''}`}
                        onClick={() => {
                          setBannerHeight('normal');
                          updateSettings({ heroBannerHeight: 'normal' });
                        }}
                      >
                        Sedang
                      </button>
                      <button
                        type="button"
                        className={`size-pill ${bannerHeight === 'cinematic' ? 'is-active' : ''}`}
                        onClick={() => {
                          setBannerHeight('cinematic');
                          updateSettings({ heroBannerHeight: 'cinematic' });
                        }}
                      >
                        Sinematik
                      </button>
                    </div>
                  </div>

                  <div className="settings-column">
                    <label className="input-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                      Kontras Overlay
                    </label>
                    <div className="pill-segmented-group">
                      <button
                        type="button"
                        className={`size-pill ${bannerOverlay === 'light' ? 'is-active' : ''}`}
                        onClick={() => {
                          setBannerOverlay('light');
                          updateSettings({ heroBannerOverlay: 'light' });
                        }}
                      >
                        Halus
                      </button>
                      <button
                        type="button"
                        className={`size-pill ${bannerOverlay === 'medium' ? 'is-active' : ''}`}
                        onClick={() => {
                          setBannerOverlay('medium');
                          updateSettings({ heroBannerOverlay: 'medium' });
                        }}
                      >
                        Seimbang
                      </button>
                      <button
                        type="button"
                        className={`size-pill ${bannerOverlay === 'dark' ? 'is-active' : ''}`}
                        onClick={() => {
                          setBannerOverlay('dark');
                          updateSettings({ heroBannerOverlay: 'dark' });
                        }}
                      >
                        Pekat
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Source Tabs & Gallery */}
              <div className="banner-studio-column">
                <div className="settings-column">
                  <span className="input-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                    Pilihan Sumber Media
                  </span>
                  <div className="source-segmented-pills" role="tablist">
                    <button
                      type="button"
                      className={`source-pill ${bannerSource === 'preset' ? 'is-active' : ''}`}
                      onClick={() => {
                        setBannerSource('preset');
                        updateSettings({ heroBannerSource: 'preset' });
                      }}
                    >
                      <Layers size={14} />
                      <span>Preset</span>
                    </button>
                    <button
                      type="button"
                      className={`source-pill ${bannerSource === 'upload' ? 'is-active' : ''}`}
                      onClick={() => {
                        setBannerSource('upload');
                        updateSettings({ heroBannerSource: 'upload' });
                      }}
                    >
                      <Upload size={14} />
                      <span>Upload File</span>
                    </button>
                    <button
                      type="button"
                      className={`source-pill ${bannerSource === 'url' ? 'is-active' : ''}`}
                      onClick={() => {
                        setBannerSource('url');
                        updateSettings({ heroBannerSource: 'url' });
                      }}
                    >
                      <ArrowUpRight size={14} />
                      <span>URL Kustom</span>
                    </button>
                  </div>
                </div>

                {/* Tab 1: Preset */}
                {bannerSource === 'preset' && (
                  <div className="preset-cards-grid">
                    {BANNER_PRESETS.map((p) => {
                      const isSelected = bannerPreset === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`preset-card-item ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => {
                            setBannerPreset(p.id);
                            updateSettings({ heroBannerPreset: p.id, heroBannerSource: 'preset' });
                            showToast('Tema banner diperbarui.', 'info');
                          }}
                        >
                          <div className="preset-thumb-wrap">
                            {p.type === 'mesh' ? (
                              <div className="hero-banner-mesh" style={{ position: 'absolute', inset: 0 }} />
                            ) : (
                              <img src={p.thumb || p.url} alt={p.name} className="preset-thumb-img" loading="lazy" />
                            )}
                            <div className="preset-thumb-overlay" />
                          </div>
                          <div className="preset-meta-info">
                            <div className="preset-name-row">
                              <span className="preset-name">{p.name}</span>
                              <div className="preset-active-check">
                                <Check size={14} />
                              </div>
                            </div>
                            <span className="preset-vibe-desc">{p.vibe}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tab 2: Upload File */}
                {bannerSource === 'upload' && (
                  <div>
                    <input
                      type="file"
                      ref={bannerFileInputRef}
                      accept="image/*,video/mp4,video/webm"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleBannerFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div
                      className="upload-dropzone"
                      onClick={() => bannerFileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleBannerFileUpload(e.dataTransfer.files[0]);
                        }
                      }}
                    >
                      <div className="dropzone-content">
                        <div className="dropzone-icon">
                          <Upload size={22} />
                        </div>
                        <span className="dropzone-title">Pilih Video atau Gambar</span>
                        <span className="dropzone-desc">
                          Mendukung MP4, WebM, PNG, JPG, WebP, GIF. Disimpan lokal di browser (IndexedDB).
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            bannerFileInputRef.current?.click();
                          }}
                        >
                          Pilih dari Perangkat
                        </button>
                      </div>
                    </div>

                    {customMediaData && (
                      <div className="upload-status-card">
                        <div className="upload-status-meta">
                          <CheckCircle size={16} className="text-success" />
                          <span className="uploaded-filename">{customMediaData.filename || 'media-kustom'}</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-danger"
                          onClick={handleRemoveUploadedBanner}
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: URL Kustom */}
                {bannerSource === 'url' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="url"
                      className="input-control font-mono"
                      value={bannerUrl}
                      onChange={(e) => {
                        setBannerUrl(e.target.value);
                        updateSettings({ heroBannerUrl: e.target.value, heroBannerSource: 'url' });
                      }}
                      placeholder="https://example.com/banner.mp4 atau banner.jpg"
                    />
                    <div className="url-media-type-row" style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tipe Media:</span>
                      <label className="radio-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="url-media-type"
                          value="image"
                          checked={bannerMediaType === 'image'}
                          onChange={() => {
                            setBannerMediaType('image');
                            updateSettings({ heroBannerMediaType: 'image', heroBannerSource: 'url' });
                          }}
                        />
                        <span>Gambar</span>
                      </label>
                      <label className="radio-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="url-media-type"
                          value="video"
                          checked={bannerMediaType === 'video'}
                          onChange={() => {
                            setBannerMediaType('video');
                            updateSettings({ heroBannerMediaType: 'video', heroBannerSource: 'url' });
                          }}
                        />
                        <span>Video (MP4/WebM)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ROW 3 (Left): Pengingat & Suara */}
        <div className="card settings-card-clean">
          <div className="settings-label-with-tooltip">
            <span className="settings-field-title">Waktu Pengingat Sebelum Kegiatan</span>
            <InfoTooltip
              title="Waktu Pengingat"
              text="Berapa menit sebelum agenda notifikasi layar dan bel akustik dibunyikan."
            />
          </div>

          <div className="advance-chips-grid">
            {[5, 10, 15, 30].map((min) => (
              <button
                key={min}
                type="button"
                className={`advance-chip ${Number(notifyAdvance) === min ? 'is-active' : ''}`}
                onClick={() => setNotifyAdvance(min)}
              >
                <span className="advance-num font-mono">{min}</span>
                <span className="advance-unit">Menit</span>
              </button>
            ))}
          </div>

          <div className="settings-toggle-row">
            <div className="settings-label-with-tooltip">
              <span className="settings-field-title">Bunyi Bel Akustik</span>
              <InfoTooltip
                title="Bunyi Bel Akustik"
                text="Memutar melodi pengingat offline menggunakan Web Audio API saat waktu agenda tiba."
              />
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
              />
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </label>
          </div>

          {/* Tone Picker */}
          {soundEnabled && (
            <div className="tone-picker-wrap">
              <div className="tone-picker-clean">
                {[
                  { id: 'crystal', name: 'Crystal Bell', desc: 'Cerah & Nyaring' },
                  { id: 'marimba', name: 'Marimba', desc: 'Hangat & Akustik' },
                  { id: 'digital', name: 'Digital Pulse', desc: 'Modern & Tegas' },
                  {
                    id: 'custom',
                    name: 'Nada Kustom',
                    desc: customAudioData?.filename || 'File audio sendiri (.mp3/.wav)'
                  }
                ].map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    className={`tone-item-clean ${soundTone === tone.id ? 'is-active' : ''}`}
                    onClick={() => handleTestTone(tone.id)}
                  >
                    <div className="tone-info">
                      <span className="tone-name">{tone.name}</span>
                      <span className="tone-desc text-muted">{tone.desc}</span>
                    </div>
                    {tone.id === 'custom' ? (
                      <Music size={15} className={soundTone === 'custom' ? 'text-orange' : 'text-muted'} />
                    ) : (
                      <Volume2 size={15} className="text-muted" />
                    )}
                  </button>
                ))}
              </div>

              {/* Upload Dropzone / Management for Custom Tone */}
              {soundTone === 'custom' && (
                <div className="custom-tone-box">
                  <input
                    type="file"
                    ref={customAudioFileInputRef}
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCustomAudioUpload(e.target.files[0]);
                      }
                    }}
                  />

                  {customAudioData ? (
                    <div className="custom-tone-status-card">
                      <div className="custom-tone-meta">
                        <CheckCircle size={15} className="text-success" />
                        <span className="custom-tone-filename">{customAudioData.filename}</span>
                      </div>
                      <div className="custom-tone-btn-group">
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => {
                            notifications.unlockAudio();
                            notifications.testChime('custom');
                          }}
                        >
                          <Volume2 size={12} />
                          <span>Uji Suara</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => customAudioFileInputRef.current?.click()}
                        >
                          <Upload size={12} />
                          <span>Ganti File</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-danger"
                          onClick={handleRemoveCustomAudio}
                        >
                          <Trash2 size={12} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="custom-tone-dropzone"
                      onClick={() => customAudioFileInputRef.current?.click()}
                    >
                      <div className="dropzone-icon">
                        <Upload size={18} />
                      </div>
                      <div className="dropzone-text-wrap">
                        <span className="dropzone-title">Pilih File Audio Sendiri</span>
                        <span className="dropzone-desc">
                          Mendukung MP3, WAV, OGG, atau M4A (maksimal 12MB). Disimpan lokal di IndexedDB.
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          customAudioFileInputRef.current?.click();
                        }}
                      >
                        Pilih Audio
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="settings-toggle-row">
            <div className="settings-label-with-tooltip">
              <span className="settings-field-title">Notifikasi Layar</span>
              <InfoTooltip
                title="Notifikasi Layar & Pop-up"
                text="Pengingat sistem dan bel saat agenda mendekat. Beroperasi di latar belakang menggunakan Web Worker heartbeat dan Service Worker PWA."
              />
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={systemNotif}
                onChange={(e) => setSystemNotif(e.target.checked)}
              />
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </label>
          </div>

          <div className="settings-actions-row">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleTestNotification}
            >
              <Bell size={13} />
              <span>Uji Notifikasi & Suara</span>
            </button>
          </div>
        </div>

        {/* ROW 3 (Right): Kategori Agenda */}
        <div className="card settings-card-clean">
          <div className="settings-row-between">
            <div className="settings-label-with-tooltip">
              <span className="settings-field-title">Kategori Agenda</span>
              <InfoTooltip
                title="Kategori Kegiatan"
                text="Kelola label dan kode warna untuk mengelompokkan jadwal harian Anda secara terstruktur."
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={openCategoryModal}
            >
              <Plus size={12} />
              <span>Kelola Kategori</span>
            </button>
          </div>

          <div className="category-tags-preview" style={{ marginTop: '8px' }}>
            {categories.map((cat) => (
              <span key={cat.id} className="category-pill-badge">
                <span className="cat-color-dot" style={{ backgroundColor: cat.color }} />
                <span>{cat.name}</span>
              </span>
            ))}
          </div>

          <p className="text-muted text-xs" style={{ marginTop: '14px', lineHeight: 1.55 }}>
            Warna kategori membantu membedakan prioritas waktu di kalender dan grafik produktivitas. Anda dapat menambah kategori kustom atau mengubah palet warna sesuai kebutuhan.
          </p>
        </div>

        {/* ROW 4: Pusat Cadangan & Ekspor Data (Full Width Card) */}
        <div className="card settings-card-clean settings-card-full-width">
          <div className="backup-hub-settings-header" style={{ marginBottom: '12px' }}>
            <div className="backup-hub-settings-icon" aria-hidden="true">
            </div>
            <div className="backup-hub-settings-meta">
              <span className="backup-hub-settings-title" style={{ fontSize: '15px', fontWeight: 700 }}>
                Pusat Cadangan & Ekspor Data
              </span>
              <p className="backup-hub-settings-desc" style={{ marginTop: '2px' }}>
                Data Anda tersimpan secara privat di browser ini. Unduh salinan cadangan JSON lengkap atau ekspor ke format kalender universal (.ics).
              </p>
            </div>
          </div>

          <div className="backup-actions-grid">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={exportData}
              title="Unduh cadangan data lengkap format JSON"
            >
              <Download size={14} />
              <span>Unduh JSON</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => exportIcsCalendar()}
              title="Ekspor seluruh jadwal ke format iCalendar (.ics)"
            >
              <Calendar size={14} />
              <span>Ekspor .ics</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openBackupModal('backup')}
              title="Buka Pusat Cadangan Data Lengkap"
            >
              <HardDrive size={14} />
              <span>Buka Pusat Cadangan</span>
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          Simpan Pengaturan
        </button>
      </form>
    </section>
  );
}
