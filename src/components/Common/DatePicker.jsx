import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getLocalDateString } from '../../services/state';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
    ? parsed
    : null;
}

function formatDate(value) {
  const date = parseDate(value);
  return date
    ? date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
}

export default function DatePicker({ id, value, onChange, allowClear = false, required = false, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDate(value) || new Date());
  const selectedDate = parseDate(value);
  const today = getLocalDateString();

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return { date, value: getLocalDateString(date), isCurrentMonth: date.getMonth() === visibleMonth.getMonth() };
    });
  }, [visibleMonth]);

  const shiftMonth = (amount) => {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
  };

  const openPicker = () => {
    setVisibleMonth(selectedDate || new Date());
    setIsOpen(true);
  };

  return (
    <>
      <button
        id={id}
        type="button"
        className={compact
          ? 'btn btn-secondary btn-xs btn-icon date-picker-button custom-date-picker-compact'
          : 'input-control input-compact custom-picker-trigger'}
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-label={value ? `Pilih tanggal kalender, ${formatDate(value)}` : 'Pilih tanggal kalender'}
        aria-required={required}
      >
        <CalendarDays size={compact ? 13 : 15} aria-hidden="true" />
        {!compact && (
          <span className={value ? '' : 'custom-picker-placeholder'}>
            {value ? formatDate(value) : 'Pilih tanggal'}
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <div className="custom-picker-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}>
          <section className="custom-picker-dialog date-picker-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-dialog-title`}>
            <header className="custom-picker-header">
              <div>
                <span className="custom-picker-eyebrow">KALENDER</span>
                <h3 id={`${id}-dialog-title`}>{value ? formatDate(value) : 'Pilih tanggal'}</h3>
              </div>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setIsOpen(false)} aria-label="Tutup kalender">
                <X size={18} />
              </button>
            </header>

            <div className="custom-calendar-toolbar">
              <strong>{visibleMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</strong>
              <div>
                <button type="button" className="btn btn-secondary btn-xs btn-icon" onClick={() => shiftMonth(-1)} aria-label="Bulan sebelumnya">
                  <ChevronLeft size={15} />
                </button>
                <button type="button" className="btn btn-secondary btn-xs btn-icon" onClick={() => shiftMonth(1)} aria-label="Bulan berikutnya">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            <div className="custom-calendar-grid" role="grid" aria-label="Pilih tanggal">
              {WEEKDAYS.map((day) => (
                <span key={day} className="custom-calendar-weekday" role="columnheader">{day}</span>
              ))}
              {calendarDays.map(({ date, value: dayValue, isCurrentMonth }) => {
                const isSelected = dayValue === value;
                const isToday = dayValue === today;
                return (
                  <button
                    key={dayValue}
                    type="button"
                    className={`custom-calendar-day ${isCurrentMonth ? '' : 'is-outside-month'} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                    onClick={() => {
                      onChange(dayValue);
                      setIsOpen(false);
                    }}
                    aria-label={date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    aria-pressed={isSelected}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <footer className="custom-picker-footer">
              {allowClear && value && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}>
                  Hapus tanggal
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                onChange(today);
                setIsOpen(false);
              }}>
                Hari ini
              </button>
            </footer>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
