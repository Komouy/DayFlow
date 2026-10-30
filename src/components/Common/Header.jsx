import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sun, Moon, Bell, BellOff, Search } from 'lucide-react';
import { notifications } from '../../services/notifications';

export default function Header() {
  const { settings, updateSettings, showToast, setActiveTab, openSearchModal } = useApp();

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

  return (
    <header className="app-header">
      <div
        className="brand-wrap"
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
        <h1 className="brand-title">
          Day<span className="brand-title-accent">Flow</span>
        </h1>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm global-search-trigger"
          onClick={() => openSearchModal()}
          aria-label="Pencarian Global (Ctrl+K)"
          title="Pencarian Global (Ctrl+K)"
        >
          <Search size={16} />
          <span className="search-trigger-text">Cari...</span>
          <kbd className="search-trigger-kbd"></kbd>
        </button>

        <button
          type="button"
          className={`btn btn-ghost btn-sm btn-icon ${isNotificationsActive ? 'is-active text-orange' : ''}`}
          onClick={handleToggleNotifications}
          aria-label={isNotificationsActive ? "Matikan Notifikasi & Suara" : "Aktifkan Notifikasi & Suara"}
          title={isNotificationsActive ? "Notifikasi & Suara Aktif (Klik untuk nonaktifkan)" : "Notifikasi & Suara Nonaktif (Klik untuk aktifkan & minta izin)"}
        >
          {isNotificationsActive ? <Bell size={17} /> : <BellOff size={17} />}
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-sm btn-icon"
          onClick={toggleTheme}
          aria-label="Ganti Tema Tampilan"
          title={settings.theme === 'light' ? "Beralih ke Mode Gelap" : "Beralih ke Mode Terang"}
        >
          {settings.theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
      </div>
    </header>
  );
}
