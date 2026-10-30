import React from 'react';
import { useApp } from './context/AppContext';
import Header from './components/Common/Header';
import Sidebar from './components/Common/Sidebar';
import BottomNav from './components/Common/BottomNav';
import Toast from './components/Common/Toast';
import { CalendarPlus, Info, X } from 'lucide-react';

// Views
import TodayView from './components/Views/TodayView';
import ScheduleView from './components/Views/ScheduleView';
import AiPlanView from './components/Views/AiPlanView';
import NotesView from './components/Views/NotesView';
import SettingsView from './components/Views/SettingsView';

// Modals
import ScheduleModal from './components/Modals/ScheduleModal';
import NoteModal from './components/Modals/NoteModal';
import CategoryModal from './components/Modals/CategoryModal';
import ShareModal from './components/Modals/ShareModal';
import ShortcutsModal from './components/Modals/ShortcutsModal';
import ConfirmModal from './components/Modals/ConfirmModal';
import SearchModal from './components/Modals/SearchModal';
import BackupModal from './components/Modals/BackupModal';
import IntroModal from './components/Modals/IntroModal';

export default function App() {
  const { activeTab, setActiveTab, proactiveNudge, dismissProactiveNudge, sendPromptToAi } = useApp();
  const swipeStartRef = React.useRef(null);
  const tabOrder = ['today', 'schedule', 'ai-plan', 'notes', 'settings'];

  const handleTouchStart = (event) => {
    if (window.innerWidth >= 1024 || event.touches.length !== 1) return;

    const target = event.target;
    if (!(target instanceof Element) || target.closest('button, a, input, textarea, select, [role="button"], [role="tab"], [contenteditable="true"], [data-swipe-ignore]')) {
      swipeStartRef.current = null;
      return;
    }

    let element = target;
    while (element && element !== event.currentTarget) {
      const { overflowX } = window.getComputedStyle(element);
      if (/(auto|scroll)/.test(overflowX) && element.scrollWidth > element.clientWidth) {
        swipeStartRef.current = null;
        return;
      }
      element = element.parentElement;
    }

    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || window.innerWidth >= 1024) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

    const currentIndex = tabOrder.indexOf(activeTab);
    const nextIndex = currentIndex + (deltaX < 0 ? 1 : -1);
    if (nextIndex >= 0 && nextIndex < tabOrder.length) {
      setActiveTab(tabOrder[nextIndex]);
    }
  };

  React.useEffect(() => {
    const mainEl = document.querySelector('.main-viewport');
    if (mainEl) mainEl.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [activeTab]);

  return (
    <div id="app-root" className="app-root-container">
      {/* Top Header */}
      <Header />

      {/* Desktop Left Sidebar */}
      <Sidebar />

      {/* Main Viewport */}
      <main
        className="main-viewport"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          swipeStartRef.current = null;
        }}
      >
        {proactiveNudge && activeTab !== 'ai-plan' && (
          <div className="alert-banner alert-banner-info ai-proactive-banner" role="status" aria-live="polite">
            <div className="alert-banner-icon-wrap">
              <Info size={16} />
            </div>
            <div className="alert-banner-content">
              <span className="alert-banner-title">{proactiveNudge.slotTitle}</span>
              <span className="alert-banner-desc">{proactiveNudge.text}</span>
              {proactiveNudge.offerSchedule && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm ai-proactive-cta"
                  onClick={() => {
                    dismissProactiveNudge();
                    sendPromptToAi('Susun jadwal fokus hari ini');
                  }}
                >
                  <CalendarPlus size={14} />
                  <span>Buat jadwal dengan AI</span>
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn-close-alert"
              onClick={dismissProactiveNudge}
              aria-label="Tutup pengingat"
              title="Tutup pengingat"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {activeTab === 'today' && <TodayView />}
        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'ai-plan' && <AiPlanView />}
        {activeTab === 'notes' && <NotesView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>



      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Modals Root */}
      <ScheduleModal />
      <NoteModal />
      <CategoryModal />
      <ShareModal />
      <ShortcutsModal />
      <ConfirmModal />
      <SearchModal />
      <BackupModal />
      <IntroModal />

      {/* Toast Notifications */}
      <Toast />
    </div>
  );
}
