/**
 * DayFlow Early Bootstrap & Safe Proxy
 * Fast-path execution for instantaneous interaction, PWA cache purge, and early icon rendering.
 */

// Aggressive PWA Cache Purge for obsolete versions
if ('caches' in window) {
  caches.keys().then(function(keys) {
    keys.forEach(function(k) {
      if (k.indexOf('dayflow-') === 0 && k !== 'dayflow-v6.9') {
        console.log('[DayFlow] Purging obsolete cache:', k);
        caches.delete(k);
      }
    });
  });
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      if (reg) {
        reg.update();
      }
    }).catch(function(err) {
      console.warn('SW registration:', err);
    });
  });
}

// Global buffer for fast interactions before ES module bundle completes loading
window._dfBuffer = [];
window.dayflowApp = {
  switchTab: function(tab) {
    if (window._actualDayflowApp) {
      window._actualDayflowApp.switchTab(tab);
    } else {
      document.querySelectorAll('.view-tab').forEach(function(v) {
        v.classList.toggle('hidden', v.id !== ('view-' + tab));
      });
      document.querySelectorAll('.nav-tab').forEach(function(t) {
        var active = t.getAttribute('data-target') === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('.modal-overlay').forEach(function(m) {
        m.classList.remove('open');
      });
      window._dfBuffer.push(['switchTab', tab]);
    }
  },
  openScheduleModal: function(id) {
    if (window._actualDayflowApp) {
      window._actualDayflowApp.openScheduleModal(id);
    } else {
      var m = document.getElementById('modal-schedule');
      if (m) m.classList.add('open');
      window._dfBuffer.push(['openScheduleModal', id]);
    }
  },
  openNoteModal: function(id) {
    if (window._actualDayflowApp) {
      window._actualDayflowApp.openNoteModal(id);
    } else {
      var m = document.getElementById('modal-note');
      if (m) m.classList.add('open');
      window._dfBuffer.push(['openNoteModal', id]);
    }
  },
  openCategoryModal: function() {
    if (window._actualDayflowApp) {
      window._actualDayflowApp.openCategoryModal();
    } else {
      var m = document.getElementById('modal-category');
      if (m) m.classList.add('open');
      window._dfBuffer.push(['openCategoryModal']);
    }
  },
  closeAllModals: function() {
    if (window._actualDayflowApp) {
      window._actualDayflowApp.closeAllModals();
    }
    document.querySelectorAll('.modal-overlay').forEach(function(m) {
      m.classList.remove('open');
    });
  },
  clearChat: function() {
    if (window._actualDayflowApp) window._actualDayflowApp.clearChat();
    else window._dfBuffer.push(['clearChat']);
  }
};

// Immediate icon pre-renderer for instant visual polish
(function() {
  var iconSvgs = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
    'file-text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
    'check-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    'chevrons-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg>',
    'chevron-down': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>'
  };

  function initQuickIcons() {
    document.querySelectorAll('[data-icon]').forEach(function(el) {
      if (el.children.length === 0) {
        var iconName = el.getAttribute('data-icon');
        var size = el.getAttribute('data-icon-size') || 18;
        var svg = iconSvgs[iconName];
        if (svg) {
          el.innerHTML = svg.replace('<svg ', '<svg class="df-icon" width="' + size + '" height="' + size + '" aria-hidden="true" ');
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickIcons);
  } else {
    initQuickIcons();
  }
})();

// Fail-safe date, greeting & clock bootstrap (guarantees zero UI freeze regardless of network latency)
(function() {
  function initQuickGreeting() {
    try {
      var now = new Date();
      var meta = document.getElementById('today-date-meta');
      if (meta) {
        meta.textContent = now.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      var greeting = document.getElementById('today-greeting');
      if (greeting) {
        var hour = now.getHours();
        var prefix = 'Selamat Pagi';
        if (hour >= 11 && hour < 15) prefix = 'Selamat Siang';
        else if (hour >= 15 && hour < 18) prefix = 'Selamat Sore';
        else if (hour >= 18 || hour < 4) prefix = 'Selamat Malam';
        greeting.textContent = prefix;
      }
      var clock = document.getElementById('banner-live-clock');
      if (clock) {
        var h = String(now.getHours()).padStart(2, '0');
        var m = String(now.getMinutes()).padStart(2, '0');
        var s = String(now.getSeconds()).padStart(2, '0');
        clock.textContent = h + ':' + m + ':' + s;
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickGreeting);
  } else {
    initQuickGreeting();
  }
})();

