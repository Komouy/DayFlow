import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock3, X } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0'));

export default function TimePicker({ id, value, onChange, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftHour, setDraftHour] = useState('09');
  const [draftMinute, setDraftMinute] = useState('00');
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const frame = requestAnimationFrame(() => {
      if (hourListRef.current) hourListRef.current.scrollTop = Number(draftHour) * 40;
      if (minuteListRef.current) minuteListRef.current.scrollTop = Number(draftMinute) * 40;
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const openPicker = () => {
    const [hour, minute] = /^([01]\d|2[0-3]):([0-5]\d)$/.test(value || '') ? value.split(':') : ['09', '00'];
    setDraftHour(hour);
    setDraftMinute(minute);
    setIsOpen(true);
  };

  const confirmTime = () => {
    onChange(`${draftHour}:${draftMinute}`);
    setIsOpen(false);
  };

  return (
    <>
      <button
        id={id}
        type="button"
        className={compact
          ? 'proposed-input-time custom-time-picker-compact font-mono tabular-nums'
          : 'input-control input-compact custom-picker-trigger'}
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-label={`Waktu mulai ${value || 'belum dipilih'}`}
      >
        {!compact && <Clock3 size={15} aria-hidden="true" />}
        <span>{value || 'Pilih waktu'}</span>
      </button>

      {isOpen && createPortal(
        <div className="custom-picker-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}>
          <section className="custom-picker-dialog time-picker-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-dialog-title`}>
            <header className="custom-picker-header">
              <div>
                <span className="custom-picker-eyebrow">WAKTU MULAI</span>
                <h3 id={`${id}-dialog-title`}>{draftHour}:{draftMinute}</h3>
              </div>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setIsOpen(false)} aria-label="Tutup pemilih waktu">
                <X size={18} />
              </button>
            </header>

            <div className="custom-time-columns">
              <div className="custom-time-column-wrap">
                <span className="custom-time-column-label">Jam</span>
                <div className="custom-time-column" role="listbox" aria-label="Pilih jam" ref={hourListRef}>
                  {HOURS.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      role="option"
                      aria-selected={draftHour === hour}
                      className={`custom-time-option ${draftHour === hour ? 'is-selected' : ''}`}
                      onClick={() => setDraftHour(hour)}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </div>
              <div className="custom-time-column-wrap">
                <span className="custom-time-column-label">Menit</span>
                <div className="custom-time-column" role="listbox" aria-label="Pilih menit" ref={minuteListRef}>
                  {MINUTES.map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      role="option"
                      aria-selected={draftMinute === minute}
                      className={`custom-time-option ${draftMinute === minute ? 'is-selected' : ''}`}
                      onClick={() => setDraftMinute(minute)}
                    >
                      {minute}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <footer className="custom-picker-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsOpen(false)}>Batal</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={confirmTime}>
                <Check size={15} />
                <span>Pilih waktu</span>
              </button>
            </footer>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
