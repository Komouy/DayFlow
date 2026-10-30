import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { state } from '../../services/state';
import InfoTooltip from '../Common/InfoTooltip';
import { FormattedMarkdown } from '../../utils/markdownRenderer';
import { getAllNoteAttachments } from '../../services/db';
import { formatFileSize } from '../../services/noteAttachments';
import {
  FileText,
  Search,
  Plus,
  Pin,
  Trash2,
  Edit2,
  Calendar,
  Image,
  Download
} from 'lucide-react';

function getFileBadgeInfo(mimeType = '', name = '') {
  const lowerName = (name || '').toLowerCase();
  if (mimeType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(lowerName)) {
    return { type: 'image', label: 'IMG', colorClass: 'badge-image' };
  }
  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return { type: 'pdf', label: 'PDF', colorClass: 'badge-pdf' };
  }
  if (mimeType.includes('word') || lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
    return { type: 'docx', label: 'DOC', colorClass: 'badge-docx' };
  }
  if (mimeType.includes('presentation') || lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt')) {
    return { type: 'pptx', label: 'PPT', colorClass: 'badge-pptx' };
  }
  if (mimeType.includes('sheet') || mimeType.includes('csv') || lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx')) {
    return { type: 'sheet', label: 'XLS', colorClass: 'badge-sheet' };
  }
  return { type: 'file', label: 'FILE', colorClass: 'badge-file' };
}

export default function NotesView() {
  const { notes, schedules, openNoteModal, deleteNote, togglePinNote, showToast, refreshAllState } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [attachmentsMap, setAttachmentsMap] = useState({});

  useEffect(() => {
    let isMounted = true;
    const generatedUrls = [];

    getAllNoteAttachments()
      .then((records) => {
        if (!isMounted) return;
        const map = {};
        for (const record of records) {
          let previewUrl = null;
          if (record.blob && (record.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(record.name || ''))) {
            previewUrl = URL.createObjectURL(record.blob);
            generatedUrls.push(previewUrl);
          } else if (record.blob) {
            previewUrl = URL.createObjectURL(record.blob);
            generatedUrls.push(previewUrl);
          }
          if (!map[record.noteId]) {
            map[record.noteId] = [];
          }
          map[record.noteId].push({
            ...record,
            previewUrl
          });
        }
        setAttachmentsMap(map);
      })
      .catch((err) => {
        console.error('Gagal memuat lampiran catatan untuk pratinjau:', err);
      });

    return () => {
      isMounted = false;
      generatedUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {}
      });
    };
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q) ||
        (Array.isArray(n.attachments) && n.attachments.some((attachment) => attachment.name?.toLowerCase().includes(q)))
    );
  }, [notes, searchQuery]);

  return (
    <section id="view-notes" className="view-tab view-notes-redesign">
      <div className="page-control-bar">
        <div className="section-title-wrap">
          <span className="section-title">Catatan Cepat</span>
          <InfoTooltip
            title="Catatan & Memo"
            text="Simpan ide, draft tugas, atau rangkuman rapat. Buka catatan untuk melihat lampiran atau membuat rangkuman AI khusus untuk catatan tersebut."
          />
        </div>

        <div className="control-bar-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => openNoteModal()}
          >
            <Plus size={15} />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* Clean Search Bar */}
      <div className="notes-search-bar">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="search"
            className="input-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari..."
          />
        </div>
      </div>

      {/* Notes Grid */}
      <div className="notes-grid">
        {filteredNotes.length === 0 ? (
          <div className="empty-state-card" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon-wrap">
              <FileText size={28} />
            </div>
            <h4 className="empty-title">
              {searchQuery ? 'Tidak Ada Catatan yang Cocok' : 'Belum Ada Catatan'}
            </h4>
            <p className="empty-desc">
              {searchQuery
                ? 'Coba gunakan kata kunci pencarian yang lain.'
                : 'Tulis ide, materi kuliah, atau notula rapat pertamamu di sini.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openNoteModal()}
              >
                <Plus size={14} />
                <span>Buat Catatan Pertama</span>
              </button>
            )}
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`note-card ${note.pinned ? 'is-pinned' : ''}`}
              onClick={() => openNoteModal(note, 'preview')}
              tabIndex={0}
              role="button"
              aria-label={`Buka catatan: ${note.title || 'Tanpa Judul'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openNoteModal(note, 'preview');
                }
              }}
            >
              <div className="note-card-top">
                <h4 className="note-card-title">{note.title}</h4>
                <div className="note-top-actions">
                  <button
                    type="button"
                    className={`btn btn-ghost btn-xs btn-icon ${note.pinned ? 'text-orange' : 'text-muted'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinNote(note.id);
                    }}
                    aria-label={note.pinned ? `Lepas sematan ${note.title}` : `Sematkan ${note.title}`}
                    aria-pressed={note.pinned === true}
                    title={note.pinned ? 'Lepas Sematan' : 'Sematkan ke Atas'}
                  >
                    <Pin size={13} fill={note.pinned === true ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>

              <div className="note-card-body">
                <FormattedMarkdown
                  content={note.content}
                  onToggleTask={(lineIdx, newChecked) => {
                    const lines = (note.content || '').split('\n');
                    if (lines[lineIdx] !== undefined) {
                      lines[lineIdx] = lines[lineIdx].replace(/^([-*•]\s+\[)[ xX](\])/, `$1${newChecked ? 'x' : ' '}$2`);
                      state.updateNote(note.id, note.title, lines.join('\n'));
                      refreshAllState();
                      showToast(newChecked ? 'Tugas ditandai selesai' : 'Tugas dibuka kembali', 'info');
                    }
                  }}
                />
              </div>

              {/* Direct Attachment Previews (Images & Files) */}
              {(() => {
                const noteAttachments = attachmentsMap[note.id] || note.attachments || [];
                if (!noteAttachments || noteAttachments.length === 0) return null;

                const imageAttachments = noteAttachments.filter(
                  (att) => att.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.name || '')
                );
                const docAttachments = noteAttachments.filter(
                  (att) => !att.mimeType?.startsWith('image/') && !/\.(png|jpe?g|webp|gif)$/i.test(att.name || '')
                );

                return (
                  <div className="note-card-attachments" onClick={(e) => e.stopPropagation()}>
                    {/* Image Previews */}
                    {imageAttachments.length > 0 && (
                      <div className={`note-card-images-wrap ${imageAttachments.length === 1 ? 'is-single' : 'is-multi'}`}>
                        {imageAttachments.slice(0, 3).map((img, idx) => (
                          <div
                            key={img.id || idx}
                            className="note-card-image-box"
                            onClick={() => openNoteModal(note, 'preview')}
                            title={`Lihat gambar: ${img.name}`}
                          >
                            {img.previewUrl ? (
                              <img src={img.previewUrl} alt={img.name} loading="lazy" />
                            ) : (
                              <div className="note-card-image-placeholder">
                                <Image size={18} />
                              </div>
                            )}
                            {imageAttachments.length === 1 && (
                              <span className="note-card-image-overlay-name">{img.name}</span>
                            )}
                          </div>
                        ))}
                        {imageAttachments.length > 3 && (
                          <div
                            className="note-card-image-more"
                            onClick={() => openNoteModal(note, 'preview')}
                            title={`${imageAttachments.length - 3} gambar lainnya`}
                          >
                            +{imageAttachments.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Document / File Previews */}
                    {docAttachments.length > 0 && (
                      <div className="note-card-docs-wrap">
                        {docAttachments.map((doc, idx) => {
                          const info = getFileBadgeInfo(doc.mimeType, doc.name);
                          return (
                            <div
                              key={doc.id || idx}
                              className="note-card-doc-item"
                              onClick={() => openNoteModal(note, 'preview')}
                              title={`Buka pratinjau: ${doc.name}`}
                            >
                              <div className={`note-card-doc-badge ${info.colorClass}`}>
                                <span>{info.label}</span>
                              </div>
                              <div className="note-card-doc-details">
                                <span className="note-card-doc-name">{doc.name}</span>
                                <span className="note-card-doc-size font-mono">{formatFileSize(doc.size || 0)}</span>
                                {doc.extractedText && (
                                  <p className="note-card-doc-snippet">
                                    &ldquo;{doc.extractedText.slice(0, 75).trim()}...&rdquo;
                                  </p>
                                )}
                              </div>
                              {doc.previewUrl && (
                                <a
                                  href={doc.previewUrl}
                                  download={doc.name}
                                  className="note-card-doc-download-btn"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`Unduh ${doc.name}`}
                                >
                                  <Download size={13} />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="note-card-footer">
                <div className="note-footer-left">
                  <span className="note-date font-mono tabular-nums">
                    {note.updatedAt
                      ? new Date(note.updatedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short'
                        })
                      : ''}
                  </span>
                  {(() => {
                    const linked = note.relatedScheduleId
                      ? schedules?.find((s) => s.relatedNoteId === note.relatedScheduleId || s.id === note.relatedScheduleId)
                      : schedules?.find((s) => s.title && note.title && s.title.length > 3 && (s.title.toLowerCase().includes(note.title.toLowerCase()) || note.title.toLowerCase().includes(s.title.toLowerCase())));
                    if (!linked) return null;
                    return (
                      <span className="note-linked-schedule-badge" title={`Terkait jadwal: ${linked.title}`}>
                        <Calendar size={10} className="text-orange flex-shrink-0" />
                        <span>{linked.title}</span>
                      </span>
                    );
                  })()}
                </div>

                <div className="note-footer-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-icon"
                    onClick={() => openNoteModal(note)}
                    title="Edit Catatan"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-icon text-danger"
                    onClick={() => deleteNote(note.id)}
                    title="Hapus Catatan"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
