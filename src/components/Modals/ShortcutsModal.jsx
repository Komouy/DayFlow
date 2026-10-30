import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Keyboard } from 'lucide-react';

export default function ShortcutsModal() {
  const { shortcutsModal, closeAllModals } = useApp();
  if (!shortcutsModal.isOpen) return null;

  const shortcuts = [
    { desc: 'Pencarian Global', keys: ['Ctrl+K', '/'] },
    { desc: 'Buka Tab Hari Ini', keys: ['1', 'T'] },
    { desc: 'Buka Tab Jadwal', keys: ['2', 'J'] },
    { desc: 'Buka Tab Rencana AI', keys: ['3', 'A'] },
    { desc: 'Buka Tab Catatan', keys: ['4', 'C'] },
    { desc: 'Buka Tab Setelan', keys: ['5', 'S'] },
    { desc: 'Buka Chatbot AI (Jadwal & Catatan)', keys: ['N', '3'] },
    { desc: 'Tambah Catatan Baru', keys: ['M'] },
    { desc: 'Bantuan Pintasan', keys: ['?'] },
    { desc: 'Tutup Dialog / Batal', keys: ['Esc'] }
  ];

  return (
    <div className="modal-overlay open" role="dialog" aria-modal="true">
      <div className="bottom-sheet modal-content-wrap">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-title-with-tooltip">
            <Keyboard size={18} className="text-orange" />
            <h3 className="sheet-title">Pintasan Keyboard</h3>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={closeAllModals}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="shortcuts-list">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="shortcut-row">
              <span className="shortcut-desc">{s.desc}</span>
              <div className="shortcut-keys">
                {s.keys.map((k, i) => (
                  <React.Fragment key={k}>
                    {i > 0 && <span className="key-separator">/</span>}
                    <kbd className="shortcut-kbd">{k}</kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
