import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Calendar, Clock, Bot, FileText, Settings } from 'lucide-react';

export default function BottomNav() {
  const { activeTab, setActiveTab } = useApp();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const swipeStartRef = useRef(null);
  const suppressClickRef = useRef(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleViewportChange = () => {
      if (window.visualViewport) {
        const isShrunk = window.visualViewport.height < window.innerHeight * 0.78;
        setIsKeyboardOpen(isShrunk);
        document.body.classList.toggle('keyboard-open', isShrunk);
      }
    };

    const handleFocusIn = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        setIsKeyboardOpen(true);
        document.body.classList.add('keyboard-open');
      }
    };

    const handleFocusOut = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        setTimeout(() => {
          const activeTag = document.activeElement?.tagName?.toLowerCase();
          if (activeTag !== 'input' && activeTag !== 'textarea') {
            setIsKeyboardOpen(false);
            document.body.classList.remove('keyboard-open');
          }
        }, 120);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      document.body.classList.remove('keyboard-open');
    };
  }, []);

  const navItems = [
    { id: 'today', label: 'Hari Ini', icon: Calendar },
    { id: 'schedule', label: 'Jadwal', icon: Clock },
    { id: 'ai-plan', label: 'Rencana AI', icon: Bot },
    { id: 'notes', label: 'Catatan', icon: FileText },
    { id: 'settings', label: 'Setelan', icon: Settings }
  ];

  const handleNavTouchStart = (event) => {
    if (window.innerWidth >= 1024 || event.touches.length !== 1) return;
    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleNavTouchEnd = (event) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || window.innerWidth >= 1024) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

    const currentIndex = navItems.findIndex((item) => item.id === activeTab);
    const nextIndex = currentIndex + (deltaX < 0 ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= navItems.length) return;

    setActiveTab(navItems[nextIndex].id);
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 350);
  };

  return (
    <div className={`bottom-nav-shell ${isKeyboardOpen ? 'is-keyboard-hidden' : ''}`}>
      <nav
        id="mobile-bottom-navigation"
        className="bottom-nav"
        role="tablist"
        aria-label="Navigasi Utama"
        onTouchStart={handleNavTouchStart}
        onTouchEnd={handleNavTouchEnd}
        onTouchCancel={() => {
          swipeStartRef.current = null;
        }}
        onClickCapture={(event) => {
          if (suppressClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClickRef.current = false;
          }
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-target={item.id}
              className={`nav-tab ${isActive ? 'active' : ''}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} />
              <span className="nav-tab-label">{item.label}</span>
              <span className="nav-tab-pill" />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
