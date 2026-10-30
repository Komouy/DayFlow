import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { state, getLocalDateString } from '../../services/state';
import InfoTooltip from '../Common/InfoTooltip';
import { X, Share2, Copy, Calendar, ExternalLink } from 'lucide-react';

export default function ShareModal() {
  const { shareModal, closeAllModals, schedules, showToast } = useApp();
  const { isOpen, date } = shareModal;

  const targetDate = date || getLocalDateString();

  const dateSchedules = useMemo(() => {
    return state.getSchedules(targetDate);
  }, [schedules, targetDate]);

  const shareText = useMemo(() => {
    const d = new Date(targetDate + 'T00:00:00');
    const valid = isNaN(d.getTime()) ? new Date() : d;
    const dateFormatted = valid.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (dateSchedules.length === 0) {
      return `📅 Agenda DayFlow (${dateFormatted})\n\nBelum ada jadwal kegiatan tercatat.`;
    }

    const itemsText = dateSchedules
      .map((s, idx) => {
        const check = s.completed ? '✅' : '⏳';
        const desc = s.description ? ` - ${s.description}` : '';
        return `${idx + 1}. [${s.time}] ${s.title}${desc} ${check}`;
      })
      .join('\n');

    return `📅 Agenda DayFlow (${dateFormatted})\n\n${itemsText}\n\nDisusun dengan DayFlow AI`;
  }, [dateSchedules, targetDate]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        showToast('Teks agenda disalin ke clipboard', 'success');
      } else {
        showToast('Clipboard API tidak didukung pada peramban ini', 'warning');
      }
    } catch {
      showToast('Gagal menyalin teks ke clipboard', 'error');
    }
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleDownloadIcs = () => {
    if (dateSchedules.length === 0) {
      showToast('Tidak ada kegiatan untuk diekspor', 'info');
      return;
    }

    const dateParts = targetDate.split('-').map(Number);
    const bYear = isNaN(dateParts[0]) ? new Date().getFullYear() : dateParts[0];
    const bMonth = isNaN(dateParts[1]) ? new Date().getMonth() + 1 : dateParts[1];
    const bDay = isNaN(dateParts[2]) ? new Date().getDate() : dateParts[2];

    const formatIcsTime = (d) => {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const sec = String(d.getSeconds()).padStart(2, '0');
      return `${y}${mo}${day}T${hr}${min}${sec}`;
    };

    let eventsIcs = '';
    dateSchedules.forEach((s) => {
      const [h, m] = String(s.time || '09:00').split(':').map(Number);
      const validH = isNaN(h) ? 9 : Math.min(23, Math.max(0, h));
      const validM = isNaN(m) ? 0 : Math.min(59, Math.max(0, m));
      const dur = Math.max(5, parseInt(s.duration, 10) || 30);

      const sDateObj = new Date(bYear, bMonth - 1, bDay, validH, validM, 0);
      const eDateObj = new Date(sDateObj.getTime() + dur * 60 * 1000);

      const startIcs = formatIcsTime(sDateObj);
      const endIcs = formatIcsTime(eDateObj);

      const cleanSummary = String(s.title || 'Agenda').replace(/[\r\n]+/g, ' ');
      const cleanDesc = String(s.description || '').replace(/[\r\n]+/g, ' ');

      eventsIcs += `BEGIN:VEVENT\nSUMMARY:${cleanSummary}\nDESCRIPTION:${cleanDesc}\nDTSTART:${startIcs}\nDTEND:${endIcs}\nEND:VEVENT\n`;
    });

    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//DayFlow//ID\n${eventsIcs}END:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dayflow_${targetDate}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File kalender .ICS diunduh', 'success');
  };

  return (
    <div className="modal-overlay open" role="dialog" aria-modal="true">
      <div className="bottom-sheet modal-content-wrap">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-title-with-tooltip">
            <h3 className="sheet-title">Bagikan Agenda</h3>
            <InfoTooltip
              title="Bagikan Agenda"
              text="Format teks ringkas siap kirim ke WhatsApp atau sinkronisasi dengan kalender Google & Apple."
            />
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

        <div className="share-modal-body">
          <textarea
            className="input-control font-mono text-xs"
            rows={7}
            value={shareText}
            readOnly
          />

          <div className="share-actions-grid">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleWhatsApp}
            >
              <Share2 size={14} />
              <span>Kirim ke WhatsApp</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopy}
            >
              <Copy size={14} />
              <span>Salin Teks</span>
            </button>
          </div>

          <div className="share-calendar-row">
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={handleDownloadIcs}
            >
              <Calendar size={13} />
              <span>Unduh .ICS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
