import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GeminiService } from '../../services/gemini';
import { getNoteAttachments } from '../../services/db';
import {
  formatFileSize,
  getNoteAttachmentAccept,
  MAX_NOTE_ATTACHMENT_COUNT,
  MAX_NOTE_ATTACHMENT_SIZE,
  MAX_NOTE_ATTACHMENTS_SIZE,
  prepareNoteAttachment
} from '../../services/noteAttachments';
import { FormattedMarkdown } from '../../utils/markdownRenderer';
import {
  AlertCircle,
  FileText,
  Image,
  LoaderCircle,
  Paperclip,
  ScanSearch,
  Sparkles,
  Trash2,
  Upload,
  X
} from 'lucide-react';

export default function NoteModal() {
  const { noteModal, closeAllModals, saveNote, showToast } = useApp();
  const { isOpen, item, mode: initialMode = 'edit' } = noteModal;
  const [mode, setMode] = useState(initialMode);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [storedFiles, setStoredFiles] = useState({});
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isPreparingFiles, setIsPreparingFiles] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const fileInputRef = useRef(null);
  const pendingUrlsRef = useRef(new Set());

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    const objectUrls = [];
    setIsLoadingAttachments(Boolean(item?.id));

    setMode(initialMode);
    setTitle(item?.title || '');
    setContent(item?.content || '');
    setExistingAttachments(Array.isArray(item?.attachments) ? item.attachments : []);
    setPendingAttachments([]);
    setRemovedAttachmentIds([]);
    setStoredFiles({});
    setSummary('');
    setSummaryError('');

    for (const url of pendingUrlsRef.current) URL.revokeObjectURL(url);
    pendingUrlsRef.current.clear();

    if (item?.id) {
      setIsLoadingAttachments(true);
      getNoteAttachments(item.id)
        .then((records) => {
          if (!active) return;
          const urls = {};
          if (records.length > 0) {
            setExistingAttachments(records.map(({ id, name, size, mimeType }) => ({ id, name, size, mimeType })));
          }
          records.forEach((record) => {
            if (record.blob) {
              const url = URL.createObjectURL(record.blob);
              objectUrls.push(url);
              urls[record.id] = { ...record, previewUrl: url };
            }
          });
          setStoredFiles(urls);
        })
        .catch((error) => {
          console.error('Gagal memuat lampiran catatan:', error);
          if (active) showToast(`Lampiran gagal dimuat: ${error.message}`, 'error');
        })
        .finally(() => {
          if (active) setIsLoadingAttachments(false);
        });
    } else {
      setIsLoadingAttachments(false);
    }

    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      for (const url of pendingUrlsRef.current) URL.revokeObjectURL(url);
      pendingUrlsRef.current.clear();
    };
  }, [isOpen, item?.id, initialMode, showToast]);

  if (!isOpen) return null;

  const visibleAttachments = existingAttachments.filter(
    (attachment) => !removedAttachmentIds.includes(attachment.id)
  );
  const totalAttachmentCount = visibleAttachments.length + pendingAttachments.length;
  const totalAttachmentSize = visibleAttachments.reduce((total, attachment) => total + (attachment.size || 0), 0)
    + pendingAttachments.reduce((total, attachment) => total + attachment.size, 0);

  const handleFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    setIsPreparingFiles(true);
    let count = totalAttachmentCount;
    let size = totalAttachmentSize;
    const preparedFiles = [];
    try {
      for (const file of files) {
        if (count >= MAX_NOTE_ATTACHMENT_COUNT) {
          showToast(`Maksimal ${MAX_NOTE_ATTACHMENT_COUNT} lampiran untuk satu catatan.`, 'warning');
          break;
        }
        if (size + file.size > MAX_NOTE_ATTACHMENTS_SIZE) {
          showToast('Total ukuran lampiran catatan maksimal 25 MB.', 'warning');
          break;
        }
        if (file.size > MAX_NOTE_ATTACHMENT_SIZE) {
          showToast(`"${file.name}" melebihi batas ukuran ${formatFileSize(MAX_NOTE_ATTACHMENT_SIZE)}.`, 'error');
          continue;
        }

        try {
          const prepared = await prepareNoteAttachment(file);
          const previewUrl = URL.createObjectURL(file);
          pendingUrlsRef.current.add(previewUrl);
          preparedFiles.push({ ...prepared, previewUrl });
          count += 1;
          size += file.size;
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
      if (preparedFiles.length) setPendingAttachments((current) => [...current, ...preparedFiles]);
    } finally {
      setIsPreparingFiles(false);
    }
  };

  const handleRemovePending = (attachment) => {
    URL.revokeObjectURL(attachment.previewUrl);
    pendingUrlsRef.current.delete(attachment.previewUrl);
    setPendingAttachments((current) => current.filter((entry) => entry !== attachment));
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummaryError('');
    setSummary('');
    try {
      const storedAttachments = item?.id ? await getNoteAttachments(item.id) : [];
      const removedIds = new Set(removedAttachmentIds);
      const attachments = [
        ...storedAttachments.filter((attachment) => !removedIds.has(attachment.id)),
        ...pendingAttachments.map((attachment) => ({
          name: attachment.name,
          mimeType: attachment.mimeType,
          blob: attachment.file,
          extractedText: attachment.extractedText
        }))
      ];
      const result = await GeminiService.summarizeNote({ title, content }, attachments);
      setSummary(result);
    } catch (error) {
      console.error('Gagal merangkum catatan:', error);
      setSummaryError(error.message || 'Rangkuman gagal dibuat. Silakan coba lagi.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!content.trim() && !title.trim() && totalAttachmentCount === 0) return;
    setIsSaving(true);
    try {
      const saved = await saveNote(title.trim(), content.trim(), pendingAttachments, removedAttachmentIds);
      if (saved) {
        for (const attachment of pendingAttachments) {
          URL.revokeObjectURL(attachment.previewUrl);
          pendingUrlsRef.current.delete(attachment.previewUrl);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;
  const isPreview = mode === 'preview';
  const titleText = isPreview ? (item?.title || 'Catatan Tanpa Judul') : (item ? 'Edit Catatan' : 'Catatan Baru');

  return (
    <div className="modal-overlay open" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
      <div className="bottom-sheet modal-content-wrap note-modal-wrap">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3 id="note-modal-title" className="sheet-title">{titleText}</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={closeAllModals}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {isPreview ? (
          <div className="note-preview-content">
            {content.trim() ? (
              <div className="note-preview-text">
                <FormattedMarkdown content={content} />
              </div>
            ) : (
              <p className="note-attachment-empty">Catatan ini tidak memiliki teks.</p>
            )}

            <section className="note-attachments-section" aria-label="Lampiran catatan">
              <div className="note-attachments-heading">
                <h4>Lampiran <span>{visibleAttachments.length}</span></h4>
                {isLoadingAttachments && <LoaderCircle size={15} className="note-spinner" aria-label="Memuat lampiran" />}
              </div>
              {visibleAttachments.length === 0 ? (
                <p className="note-attachment-empty">Belum ada lampiran.</p>
              ) : (
                <div className="note-attachment-list">
                  {visibleAttachments.map((attachment) => {
                    const stored = storedFiles[attachment.id];
                    return (
                      <article key={attachment.id} className="note-attachment-item">
                        <div className="note-attachment-file-heading">
                          {attachment.mimeType?.startsWith('image/') ? <Image size={16} /> : <FileText size={16} />}
                          <div className="note-attachment-file-meta">
                            <strong title={attachment.name}>{attachment.name}</strong>
                            <span>{formatFileSize(attachment.size || 0)}</span>
                          </div>
                          {stored?.previewUrl && (
                            <a className="btn btn-ghost btn-xs" href={stored.previewUrl} download={attachment.name}>
                              Unduh
                            </a>
                          )}
                        </div>
                        {!stored && (
                          <p className="note-attachment-empty">Data lampiran tidak tersedia di penyimpanan perangkat.</p>
                        )}
                        {stored?.mimeType?.startsWith('image/') && (
                          <img className="note-attachment-image-preview" src={stored.previewUrl} alt={`Pratinjau ${stored.name}`} />
                        )}
                        {stored?.mimeType === 'application/pdf' && (
                          <iframe className="note-attachment-pdf-preview" src={stored.previewUrl} title={`Pratinjau ${stored.name}`} />
                        )}
                        {stored?.extractedText && !stored?.mimeType?.startsWith('image/') && stored.mimeType !== 'application/pdf' && (
                          <pre className="note-attachment-text-preview">{stored.extractedText}</pre>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {summary && (
              <section className="note-ai-summary" aria-live="polite">
                <div className="note-ai-summary-heading"><Sparkles size={16} /><h4>Rangkuman AI untuk catatan ini</h4></div>
                <div className="note-ai-summary-body"><FormattedMarkdown content={summary} /></div>
              </section>
            )}
            {summaryError && (
              <div className="note-ai-summary-error" role="alert">
                <AlertCircle size={16} /> <span>{summaryError}</span>
              </div>
            )}

            <div className="note-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeAllModals}>Tutup</button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSummarize}
                disabled={isSummarizing || (!content.trim() && visibleAttachments.length === 0)}
              >
                {isSummarizing ? <LoaderCircle size={15} className="note-spinner" /> : <Sparkles size={15} />}
                <span>{isSummarizing ? 'Merangkum…' : 'Rangkum dengan AI'}</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setMode('edit')}>
                Edit Catatan
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form-clean">
            <div className="form-group">
              <label className="form-label" htmlFor="note-title">Judul (Opsional)</label>
              <input
                type="text"
                id="note-title"
                className="input-control"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Judul catatan"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="note-content">Isi Catatan</label>
              <textarea
                id="note-content"
                className="input-control textarea-control"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Tulis catatan..."
                rows={6}
              />
              <div className="note-counter-text font-mono tabular-nums text-xs text-muted">
                {words} kata · {chars} karakter
              </div>
            </div>

            <section className="note-attachments-section" aria-label="Lampiran catatan">
              <div className="note-attachments-heading">
                <h4>Lampiran <span>{totalAttachmentCount}/{MAX_NOTE_ATTACHMENT_COUNT}</span></h4>
                <span className="note-attachment-total-size">{formatFileSize(totalAttachmentSize)} / 25 MB</span>
              </div>
              <input
                ref={fileInputRef}
                className="note-file-input"
                type="file"
                accept={getNoteAttachmentAccept()}
                multiple
                onChange={handleFilesSelected}
                disabled={isPreparingFiles || totalAttachmentCount >= MAX_NOTE_ATTACHMENT_COUNT}
              />
              <button
                type="button"
                className="btn btn-secondary note-upload-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPreparingFiles || totalAttachmentCount >= MAX_NOTE_ATTACHMENT_COUNT}
              >
                {isPreparingFiles ? <LoaderCircle size={16} className="note-spinner" /> : <Upload size={16} />}
                <span>{isPreparingFiles ? 'Memeriksa berkas…' : 'Tambah lampiran'}</span>
              </button>
              <p className="note-attachment-help">Gambar, PDF, DOCX, PPTX, TXT, MD, dan CSV · Maks. 12 MB per berkas.</p>
              <p className="note-attachment-help">AI dapat membaca teks dokumen, gambar, dan hingga 5 halaman PDF termasuk hasil scan.</p>
              {(visibleAttachments.length > 0 || pendingAttachments.length > 0) && (
                <div className="note-attachment-list">
                  {visibleAttachments.map((attachment) => (
                    <div className="note-attachment-edit-item" key={attachment.id}>
                      {attachment.mimeType?.startsWith('image/') ? <Image size={16} /> : <Paperclip size={16} />}
                      <div className="note-attachment-file-meta">
                        <strong title={attachment.name}>{attachment.name}</strong>
                        <span>{formatFileSize(attachment.size || 0)}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-icon text-danger"
                        onClick={() => setRemovedAttachmentIds((current) => [...current, attachment.id])}
                        aria-label={`Hapus lampiran ${attachment.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  {pendingAttachments.map((attachment) => (
                    <div className="note-attachment-edit-item" key={attachment.previewUrl}>
                      {attachment.type === 'image' ? <Image size={16} /> : <Paperclip size={16} />}
                      <div className="note-attachment-file-meta">
                        <strong title={attachment.name}>{attachment.name}</strong>
                        <span>{formatFileSize(attachment.size)} · Baru</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-icon text-danger"
                        onClick={() => handleRemovePending(attachment)}
                        aria-label={`Hapus lampiran ${attachment.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="btn btn-secondary note-ai-button"
                onClick={handleSummarize}
                disabled={isSummarizing || isPreparingFiles || isLoadingAttachments || (!content.trim() && totalAttachmentCount === 0)}
              >
                {isSummarizing ? <LoaderCircle size={15} className="note-spinner" /> : <ScanSearch size={15} />}
                <span>{isSummarizing ? 'Menganalisis…' : 'Analisis isi dengan AI'}</span>
              </button>
            </section>

            {summary && (
              <section className="note-ai-summary" aria-live="polite">
                <div className="note-ai-summary-heading"><Sparkles size={16} /><h4>Hasil analisis AI</h4></div>
                <div className="note-ai-summary-body"><FormattedMarkdown content={summary} /></div>
              </section>
            )}
            {summaryError && (
              <div className="note-ai-summary-error" role="alert">
                <AlertCircle size={16} /> <span>{summaryError}</span>
              </div>
            )}

            <div className="note-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeAllModals} disabled={isSaving}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving || isPreparingFiles}>
                {isSaving ? <LoaderCircle size={15} className="note-spinner" /> : null}
                <span>{isSaving ? 'Menyimpan…' : 'Simpan Catatan'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
