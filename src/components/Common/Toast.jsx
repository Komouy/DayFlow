import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast() {
  const { toasts, dismissToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" id="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const type = toast.type || 'info';
        return (
          <div
            key={toast.id}
            className={`toast toast-${type}`}
            role="status"
          >
            <div className="toast-icon">
              {type === 'success' ? (
                <CheckCircle size={15} />
              ) : type === 'warning' ? (
                <AlertTriangle size={15} />
              ) : type === 'error' || type === 'danger' ? (
                <AlertCircle size={15} />
              ) : (
                <Info size={15} />
              )}
            </div>
            <span className="toast-text">{toast.message}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => dismissToast?.(toast.id)}
              aria-label="Tutup notifikasi"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
