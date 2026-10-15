/**
 * DayFlow Custom Confirm Dialog Component
 * Zero-hang, promise-based accessible confirm/alert sheet.
 */

import { renderIcons } from '../icons.js';

export function showConfirmDialog({ title, message, confirmText = 'Lanjutkan', isDanger = false, icon = 'alert' }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('confirm-modal-title');
    const descEl = document.getElementById('confirm-modal-desc');
    const btnAccept = document.getElementById('confirm-modal-btn-accept');
    const btnCancel = document.getElementById('confirm-modal-btn-cancel');
    const iconWrap = document.getElementById('confirm-modal-icon-wrap');
    const iconEl = document.getElementById('confirm-modal-icon');

    if (!modal) {
      resolve(window.confirm(`${title}\n${message}`));
      return;
    }

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = message;
    if (btnAccept) btnAccept.textContent = confirmText;

    if (btnAccept) {
      if (isDanger) {
        btnAccept.className = 'btn btn-danger';
        if (iconWrap) iconWrap.className = 'confirm-icon-wrap danger';
      } else {
        btnAccept.className = 'btn btn-primary';
        if (iconWrap) iconWrap.className = 'confirm-icon-wrap';
      }
    }

    if (iconEl) {
      iconEl.setAttribute('data-icon', icon);
    }

    const onOverlayClick = (e) => {
      if (e.target === modal) cleanup(false);
    };
    const onEscKey = (e) => {
      if (e.key === 'Escape') cleanup(false);
    };

    const cleanup = (result) => {
      modal.classList.remove('open');
      modal.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onEscKey);
      if (btnAccept) btnAccept.onclick = null;
      if (btnCancel) btnCancel.onclick = null;
      resolve(result);
    };

    modal.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onEscKey);
    if (btnAccept) btnAccept.onclick = () => cleanup(true);
    if (btnCancel) btnCancel.onclick = () => cleanup(false);

    modal.classList.add('open');
    renderIcons();
  });
}

export const confirmDialogMethods = {
  showConfirmDialog
};
