import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  Clock,
  Bot,
  FileText,
  Settings,
  Plus,
  HelpCircle,
  Sun,
  Moon,
  Bell,
  BellOff,
  Search
} from 'lucide-react';
import { notifications } from '../../services/notifications';

export default function Sidebar() {
  const { activeTab, setActiveTab, openSearchModal, settings, updateSettings, showToast } = useApp();

  const isNotificationsActive = settings.systemNotificationsEnabled !== false && settings.soundEnabled !== false;

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
    updateSettings({ theme: nextTheme });
    showToast(`Tema beralih ke ${nextTheme === 'light' ? 'Mode Terang' : 'Mode Gelap'}`, 'info');
  };

  const handleToggleNotifications = async () => {
    notifications.unlockAudio();

    if (isNotificationsActive) {
      updateSettings({
        systemNotificationsEnabled: false,
        soundEnabled: false
      });
      showToast('Notifikasi banner dan suara dinonaktifkan', 'info');
    } else {
      let perm = 'granted';
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'default') {
          perm = await notifications.requestPermission();
        } else if (Notification.permission === 'denied') {
          showToast('Notifikasi diblokir browser. Buka setelan situs di bilah URL (ikon gembok) lalu ubah Notifikasi ke Izinkan.', 'warning', 6000);
          updateSettings({ soundEnabled: true });
          return;
        }
      }

      if (perm === 'granted') {
        updateSettings({
          systemNotificationsEnabled: true,
          soundEnabled: true
        });
        notifications.testChime(settings.soundTone || 'crystal');
        notifications.sendSystemNotification('DayFlow: Notifikasi Aktif', {
          body: 'Notifikasi banner dan pengingat suara berhasil diaktifkan!',
          tag: 'dayflow_perm_granted'
        });
        showToast('Notifikasi banner dan suara diaktifkan', 'success');
      } else {
        updateSettings({ soundEnabled: true });
        showToast('Izin notifikasi belum diberikan di browser. Suara pengingat tetap aktif.', 'warning');
      }
    }
  };

  const navItems = [
    { id: 'today', label: 'Hari Ini', icon: Calendar, keyHint: '1' },
    { id: 'schedule', label: 'Jadwal', icon: Clock, keyHint: '2' },
    { id: 'ai-plan', label: 'Rencana AI', icon: Bot, keyHint: '3' },
    { id: 'notes', label: 'Catatan', icon: FileText, keyHint: '4' },
    { id: 'settings', label: 'Setelan', icon: Settings, keyHint: '5' }
  ];

  return (
    <aside className="sidebar-desktop app-sidebar" aria-label="Navigasi Samping">
      <div className="sidebar-top-section">
        {/* macOS Window Controls */}
        <div className="macos-traffic-lights" aria-hidden="true" title="DayFlow macOS System">
          <span className="traffic-dot traffic-dot-close" />
          <span className="traffic-dot traffic-dot-minimize" />
          <span className="traffic-dot traffic-dot-zoom" />
        </div>

        <div
          className="sidebar-brand"
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('today')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveTab('today');
            }
          }}
          aria-label="DayFlow Beranda"
        >
          <img src="/icons/icon.svg" alt="DayFlow Logo" className="brand-logo-img" width="28" height="28" />
          <span className="brand-title">
            Day<span className="brand-title-accent">Flow</span>
          </span>
        </div>

        <div className="sidebar-cta-wrap" style={{ marginBottom: '10px' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm sidebar-cta-btn"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => setActiveTab('ai-plan')}
            title="Buka Chatbot Asisten AI untuk Mengatur Seluruh Jadwal & Catatan"
          >
            <Bot size={15} />
            <span>Atur dengan AI</span>
          </button>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <button
            type="button"
            className="sidebar-search-btn"
            onClick={() => openSearchModal()}
            title="Pencarian Global (Ctrl+K)"
            aria-label="Pencarian Global (Ctrl+K)"
          >
            <Search size={14} className="text-muted" />
            <span style={{ flex: 1, textAlign: 'left', fontSize: '13px' }}>Cari...</span>
            <kbd className="sidebar-shortcut-hint font-mono"></kbd>
          </button>
        </div>

        <nav className="sidebar-nav" role="tablist">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-target={item.id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(item.id)}
              >
                <IconComponent size={18} />
                <span className="sidebar-nav-label">{item.label}</span>
                <span className="sidebar-shortcut-hint font-mono">{item.keyHint}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          className={`sidebar-footer-btn ${isNotificationsActive ? 'is-active text-orange' : ''}`}
          onClick={handleToggleNotifications}
          aria-label={isNotificationsActive ? "Matikan Notifikasi" : "Aktifkan Notifikasi"}
          title={isNotificationsActive ? "Notifikasi & Suara Aktif (Klik untuk nonaktifkan)" : "Notifikasi & Suara Nonaktif (Klik untuk aktifkan & minta izin)"}
        >
          {isNotificationsActive ? <Bell size={16} /> : <BellOff size={16} />}
          <span className="sidebar-footer-label">{isNotificationsActive ? 'Notif On' : 'Notif Off'}</span>
        </button>

        <button
          type="button"
          className="sidebar-footer-btn"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
          }}
          title="Pintasan Keyboard (?)"
          aria-label="Pintasan Keyboard"
        >
          <HelpCircle size={16} />
          <span className="sidebar-footer-label">Pintasan (?)</span>
        </button>

        <button
          type="button"
          className="sidebar-footer-btn"
          onClick={toggleTheme}
          aria-label="Ganti Tema Tampilan"
          title="Ganti Tema Tampilan"
        >
          {settings.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          <span className="sidebar-footer-label">Tema</span>
        </button>
      </div>
    </aside>
  );
}
