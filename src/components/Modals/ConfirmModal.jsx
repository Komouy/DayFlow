import React from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function ConfirmModal() {
  const { confirmModal, closeAllModals } = useApp();
  const { isOpen, title, message, onConfirm, confirmText, icon } = confirmModal;

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    closeAllModals();
  };

  return (
    <div
      className="modal-overlay open"
      role="alertdialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAllModals();
      }}
    >
      <div className="bottom-sheet confirm-sheet-wrap">
        <div className={`confirm-icon-circle ${icon === 'danger' ? 'danger' : ''}`}>
          {icon === 'danger' ? (
            <AlertTriangle size={24} className="text-danger" />
          ) : icon === 'info' ? (
            <Info size={24} className="text-orange" />
          ) : (
            <AlertCircle size={24} className="text-orange" />
          )}
        </div>

        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-desc">{message}</p>

        <div className="modal-actions-grid">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={closeAllModals}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
          >
            {confirmText || 'Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
