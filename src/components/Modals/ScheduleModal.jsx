import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { getLocalDateString, state } from '../../services/state';
import DatePicker from '../Common/DatePicker';
import TimePicker from '../Common/TimePicker';
import { X, Sliders, AlertTriangle, ChevronDown } from 'lucide-react';

export default function ScheduleModal() {
  const { scheduleModal, closeAllModals, saveSchedule, categories, schedules } = useApp();
  const { isOpen, item, initialDate } = scheduleModal;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(30);
  const [category, setCategory] = useState('Kerja');
  const [priority, setPriority] = useState('medium');
  const [recurrence, setRecurrence] = useState('none');
  const [deadline, setDeadline] = useState('');
  const [reminder, setReminder] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (item) {
        setTitle(item.title || '');
        setDescription(item.description || '');
        setDate(item.date || initialDate || getLocalDateString());
        setTime(item.time || '09:00');
        setDuration(item.duration || 30);
        setCategory(item.category || 'Kerja');
        setPriority(item.priority || 'medium');
        setRecurrence(item.recurrence || 'none');
        setDeadline(item.deadline || '');
        setReminder(item.reminder !== false);
        setShowAdvanced(!!(item.deadline || item.priority !== 'medium'));
      } else {
        const now = new Date();
        const nextHour = (now.getHours() + 1) % 24;
        const defaultTime = `${String(nextHour).padStart(2, '0')}:00`;
        setTitle('');
        setDescription('');
        setDate(initialDate || getLocalDateString());
        setTime(defaultTime);
        setDuration(30);
        setCategory(categories[0]?.name || 'Kerja');
        setPriority('medium');
        setRecurrence('none');
        setDeadline('');
        setReminder(true);
        setShowAdvanced(false);
      }
    }
  }, [isOpen, item, initialDate, categories]);

  const timeRangeText = useMemo(() => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const startMinutes = (h || 0) * 60 + (m || 0);
    const endMinutes = (startMinutes + Number(duration)) % (24 * 60);
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');
    return `${time} — ${endH}:${endM} (${duration}m)`;
  }, [time, duration]);

  const collisionAlert = useMemo(() => {
    if (!time || !date) return null;
    const [h, m] = time.split(':').map(Number);
    const startMin = (h || 0) * 60 + (m || 0);
    const endMin = startMin + Number(duration);
    const daySchedules = state.getSchedules(date);
    const conflicting = daySchedules.find((s) => {
      if (item && s.id === item.id) return false;
      const [sh, sm] = (s.time || '00:00').split(':').map(Number);
      const sStart = (sh || 0) * 60 + (sm || 0);
      const sEnd = sStart + (Number(s.duration) || 30);
      return startMin < sEnd && endMin > sStart;
    });
    return conflicting ? `Bentrok: "${conflicting.title}" (${conflicting.time})` : null;
  }, [date, time, duration, schedules, item]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    saveSchedule({
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      duration: Number(duration),
      category,
      priority,
      recurrence,
      deadline: deadline || null,
      reminder
    });
  };

  const PRIORITY_OPTIONS = [
    { id: 'high', label: 'Tinggi', color: '#ef4444' },
    { id: 'medium', label: 'Sedang', color: '#f59e0b' },
    { id: 'low', label: 'Rendah', color: '#6b7280' }
  ];

  const RECURRENCE_OPTIONS = [
    { id: 'none', label: 'Sekali' },
    { id: 'daily', label: 'Tiap Hari' },
    { id: 'weekdays', label: 'Hari Kerja' },
    { id: 'weekly', label: 'Mingguan' }
  ];

  return (
    <div className="modal-overlay open" role="dialog" aria-modal="true">
      <div className="bottom-sheet modal-content-wrap modal-schedule-clean">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-title-row">
            <h3 className="sheet-title">{item?.id ? 'Edit Jadwal' : 'Jadwal Baru'}</h3>
            <span className="sheet-time-badge font-mono tabular-nums">{timeRangeText}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={closeAllModals} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-clean">
          {/* Main Title Input */}
          <div className="form-group mb-1">
            <input
              type="text"
              id="sch-title"
              className="input-control input-title-prominent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nama kegiatan..."
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group mb-1">
            <input
              type="text"
              id="sch-desc"
              className="input-control input-subtle"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tambahkan keterangan atau lokasi (opsional)"
              maxLength={120}
            />
          </div>

          {/* Date & Time Row */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label-compact" htmlFor="sch-date">Tanggal</label>
              <DatePicker
                id="sch-date"
                value={date}
                onChange={setDate}
                required={true}
              />
            </div>
            <div className="form-group">
              <label className="form-label-compact" htmlFor="sch-time">Waktu Mulai</label>
              <TimePicker
                id="sch-time"
                value={time}
                onChange={setTime}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label-compact" htmlFor="sch-recurrence">Ulangi</label>
            <select
              id="sch-recurrence"
              className="input-control input-compact select-clean"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
            >
              {RECURRENCE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Duration Pills Inline */}
          <div className="form-group mb-1">
            <div className="duration-row-clean">
              <span className="duration-label font-mono">{duration}m durasi:</span>
              <div className="duration-pills-row">
                {[15, 30, 45, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`pill-btn ${Number(duration) === d ? 'active' : ''}`}
                    onClick={() => setDuration(d)}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Collision Warning */}
          {collisionAlert && (
            <div className="clean-alert-inline">
              <AlertTriangle size={13} />
              <span>{collisionAlert}</span>
            </div>
          )}

          {/* Category Chips Row */}
          <div className="form-group">
            <label className="form-label-compact">Kategori</label>
            <div className="category-chips-scroll">
              {categories.map((cat) => {
                const isSelected = category.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => setCategory(cat.name)}
                  >
                    <span className="cat-color-dot" style={{ backgroundColor: cat.color }} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Options Accordion */}
          <div className="advanced-options-card">
            <button
              type="button"
              className="advanced-toggle-btn"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="advanced-toggle-left">
                <Sliders size={13} />
                <span>Pengaturan Lanjutan</span>
              </span>
              <ChevronDown size={14} className={`chevron-transition ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="advanced-content-clean">
                {/* Priority */}
                <div className="form-group">
                  <label className="form-label-compact">Prioritas</label>
                  <div className="segmented-selector">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`segmented-btn ${priority === p.id ? 'active' : ''}`}
                        onClick={() => setPriority(p.id)}
                      >
                        <span className="priority-dot" style={{ backgroundColor: p.color }} />
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deadline & Reminder Row */}
                <div className="form-grid-2 align-center mt-1">
                  <div className="form-group">
                    <label className="form-label-compact" htmlFor="sch-deadline">Tenggat Target</label>
                    <DatePicker
                      id="sch-deadline"
                      value={deadline}
                      onChange={setDeadline}
                      allowClear
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label-compact">Pengingat</label>
                    <div className="clean-toggle-field">
                      <span className="text-xs text-muted">Notifikasi aktif</span>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={reminder}
                          onChange={(e) => setReminder(e.target.checked)}
                        />
                        <span className="toggle-track"><span className="toggle-thumb" /></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="modal-actions-clean">
            <button type="button" className="btn btn-secondary" onClick={closeAllModals}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan Jadwal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
