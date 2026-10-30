import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import { state } from './services/state';
import { notifications } from './services/notifications';
import { GeminiService } from './services/gemini';
import './styles/app.css';

// Attach services to window for diagnostics, audio/timer hooks, and test automation
if (typeof window !== 'undefined') {
  window.DayFlowState = state;
  window.DayFlowNotifications = notifications;
  window.GeminiService = GeminiService;
}

// Register Service Worker for notifications and offline capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      reg.update();

      // Register periodic background sync if supported
      if ('periodicSync' in reg) {
        try {
          const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
          if (status.state === 'granted') {
            await reg.periodicSync.register('dayflow-check-schedules', {
              minInterval: 10 * 60 * 1000 // 10 minutes
            });
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('SW registration skipped:', err);
    }
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>
  );
}
