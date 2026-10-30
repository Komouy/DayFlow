import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { GeminiService } from '../../services/gemini';
import { state, getLocalDateString, USAGE_LIMITS } from '../../services/state';
import InfoTooltip from '../Common/InfoTooltip';
import TimePicker from '../Common/TimePicker';
import { FormattedMarkdown } from '../../utils/markdownRenderer';
import { generateGoogleCalendarUrl } from '../../utils/scheduleHelpers';
import { getNoteAttachmentAccept, prepareNoteAttachment, renderPdfPages } from '../../services/noteAttachments';
import {
  Bot,
  User,
  Send,
  Paperclip,
  Mic,
  MicOff,
  Trash2,
  Calendar,
  Check,
  FileText,
  X,
  Loader2,
  Copy,
  RotateCcw,
  Plus,
  PenLine,
  Clock,
  CalendarPlus,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Zap
} from 'lucide-react';

export default function AiPlanView() {
  const {
    chatHistory,
    addChatMessage,
    updateChatMessage,
    clearChat,
    schedules,
    pendingChatPrompt,
    setPendingChatPrompt,
    showToast,
    refreshAllState,
    dailyUsage
  } = useApp();

  const maxAttachLimit = USAGE_LIMITS.MAX_AI_ATTACHMENT;
  const usedAttachments = dailyUsage?.aiAttachmentCount || 0;
  const remainingAttachments = Math.max(0, maxAttachLimit - usedAttachments);
  const canCreateSchedule = true; // Chatbot adalah pusat kendali utama jadwal & catatan
  const canAttachFile = remainingAttachments > 0;

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [isPreparingAttachment, setIsPreparingAttachment] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const chatScrollRef = useRef(null);
  const chatInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const pendingPromptRef = useRef('');

  const todayStr = getLocalDateString();
  const todaySchedules = useMemo(() => state.getSchedules(todayStr), [schedules, todayStr]);

  const isFreshSession = chatHistory.length <= 1 && !chatHistory.some((msg) => msg.role === 'user');

  const handleCopyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Teks berhasil disalin ke clipboard', 'success');
    } catch {
      showToast('Gagal menyalin teks', 'error');
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading]);

  // Cleanup speech recognition on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  // Voice speech-to-text initialization
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Browser tidak mendukung pengenalan suara', 'error');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        showToast('Mendengarkan suara...', 'info');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsRecording(false);
      showToast('Gagal mengaktifkan mikrofon', 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!canAttachFile) {
      showToast(`Batas lampiran file harian telah tercapai (maksimal ${maxAttachLimit} kali per hari).`, 'warning');
      return;
    }

    setIsPreparingAttachment(true);
    try {
      const prepared = await prepareNoteAttachment(file);
      if (prepared.type === 'image') {
        const reader = new FileReader();
        const dataUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error(`Gagal membaca gambar "${file.name}".`));
          reader.readAsDataURL(file);
        });
        setAttachment({
          type: 'image',
          name: file.name,
          mimeType: prepared.mimeType,
          base64: String(dataUrl).split(',')[1] || '',
          previewUrl: dataUrl
        });
      } else {
        const imageParts = prepared.mimeType === 'application/pdf' ? await renderPdfPages(file) : [];
        if (!prepared.extractedText && imageParts.length === 0) {
          throw new Error(`Tidak ada teks yang bisa dibaca dari "${file.name}".`);
        }
        setAttachment({
          type: 'document',
          name: file.name,
          mimeType: prepared.mimeType,
          textContent: prepared.extractedText,
          imageParts
        });
      }
      showToast(`Dokumen "${file.name}" siap dianalisis AI.`, 'success');
    } catch (error) {
      console.error('Gagal menyiapkan lampiran AI:', error);
      showToast(error.message || 'Gagal membaca berkas. Periksa format dan ukuran berkas.', 'error');
    } finally {
      setIsPreparingAttachment(false);
    }
  };

  const executeChat = async (textToSend, attachToSend = null) => {
    if (!textToSend && !attachToSend) return;

    setIsLoading(true);

    // Record user message into state
    addChatMessage({
      role: 'user',
      text: textToSend || (attachToSend ? `[Lampiran: ${attachToSend.name}]` : 'Halo'),
      attachment: attachToSend,
      timestamp: Date.now()
    });

    try {
      const response = await GeminiService.sendChatMessage(textToSend, attachToSend);

      // Increment public usage quotas
      state.incrementAiSchedule();
      if (attachToSend) {
        state.incrementAiAttachment();
      }
      refreshAllState();

      // Parse schedules, notes, and direct actions
      const previousAssistantMessage = [...chatHistory].reverse().find((message) => message.role === 'assistant')?.text || '';
      const previousUserMessage = [...chatHistory].reverse().find((message) => message.role === 'user')?.text || '';
      const isClarifyingDateOrTime = textToSend.trim().length <= 80 &&
        /\b(tanggal|hari|waktu|jam|pukul)\b/i.test(previousAssistantMessage) &&
        /\?/.test(previousAssistantMessage);
      const confirmsClarification = /^(ya|iya|betul|benar|boleh|setuju|oke|ok|silakan)\b/i.test(textToSend.trim()) ||
        /\b(?:jam|pukul)\s*\d{1,2}\b/i.test(textToSend) ||
        /\b\d{1,2}(?:[:.]\d{2})?\s*(?:pagi|siang|sore|malam)\b/i.test(textToSend);
      const assistantDateContext = previousAssistantMessage
        .split(/\n/)
        .filter((line) => line.includes('?'))
        .join(' ')
        .replace(/\b(?:jam|pukul)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:pagi|siang|sore|malam)?\b/gi, ' ')
        .replace(/\b\d{1,2}[:.]\d{2}\b/g, ' ');
      const includeClarificationContext = isClarifyingDateOrTime && confirmsClarification;
      const userGroundingContext = [
        ...(includeClarificationContext && previousUserMessage ? [previousUserMessage] : []),
        ...(includeClarificationContext ? [assistantDateContext] : []),
        textToSend,
        attachToSend?.textContent || ''
      ].filter(Boolean).join('\n');
      const parsedSchedules = GeminiService.parseStructuredSchedules(response, {
        userContext: userGroundingContext,
        allowDocumentEvidence: Boolean(attachToSend)
      });
      const parsedNote = GeminiService.parseStructuredNote(response);
      const parsedActions = GeminiService.parseProposedActions(response);
      const actionResolution = GeminiService.resolveProposedActions(
        parsedActions,
        textToSend,
        state.getSchedules(),
        state.getNotes()
      );
      const hasInvalidActionBlock = /\[DAYFLOW_ACTIONS\]/i.test(response) && parsedActions.length === 0;
      const scheduleBlock = response.match(/\[DAYFLOW_SCHEDULES\]([\s\S]*?)\[\/DAYFLOW_SCHEDULES\]/i)?.[1]?.trim();
      const hasRejectedScheduleBlock = Boolean(scheduleBlock && scheduleBlock !== '[]' && parsedSchedules.length === 0);
      const noteBlock = response.match(/\[DAYFLOW_NOTE\]([\s\S]*?)\[\/DAYFLOW_NOTE\]/i)?.[1]?.trim();
      const hasRejectedNoteBlock = Boolean(noteBlock && !parsedNote);
      const cleanText = actionResolution.blockedActions.length
        ? `Saya belum mengubah data karena target atau permintaannya belum bisa dipastikan. ${
          actionResolution.blockedActions.map((action) => {
            const candidates = action.candidates.length ? ` Pilihan yang cocok: ${action.candidates.join(', ')}.` : '';
            return `${action.targetTitle || 'Target'}: ${action.reason}.${candidates}`;
          }).join(' ')
        } Sebutkan judul kegiatan/catatan yang tepat dan detail tanggal atau waktunya bila ada beberapa yang serupa.`
        : hasInvalidActionBlock
          ? 'Saya belum mengubah data karena instruksi aksi dari AI tidak dapat divalidasi. Jelaskan kembali tindakan dan judul targetnya secara spesifik.'
          : hasRejectedScheduleBlock
            ? 'Saya belum membuat usulan jadwal karena tanggal, waktu, atau data jadwal tidak dapat divalidasi. Untuk kegiatan spesifik, kirim tanggal dan waktu yang dimaksud.'
            : hasRejectedNoteBlock
              ? 'Saya belum membuat usulan catatan karena format atau isinya tidak dapat divalidasi. Coba jelaskan kembali informasi yang ingin dicatat.'
        : GeminiService.cleanResponseText(response);

      // Contextual Linking: Auto-link schedules & notes generated in the same turn
      if (Array.isArray(parsedSchedules) && parsedSchedules.length > 0 && parsedNote) {
        const linkKey = 'link_' + Date.now();
        parsedSchedules.forEach((s) => {
          s.relatedNoteId = linkKey;
        });
        parsedNote.relatedScheduleId = linkKey;
      }

      let savedSchedules = false;
      let savedNote = false;

      // Execute Direct Mutation Actions (Pilar 1: AI Action Engine with Undo)
      const executedActions = [];
      if (actionResolution.resolvedActions.length > 0) {
        for (const act of actionResolution.resolvedActions) {
          if (act.type === 'DELETE_SCHEDULE') {
            const target = act.schedule;
            state.deleteSchedule(target.id);
            executedActions.push({
              type: 'DELETE_SCHEDULE',
              summary: act.summary || `Jadwal "${target.title}" (${target.time}) telah dihapus`,
              item: target,
              canUndo: true,
              undone: false
            });
          } else if (act.type === 'COMPLETE_SCHEDULE') {
            const target = act.schedule;
            const newCompleted = act.completed;
            const prevCompleted = !!target.completed;
            if (target.completed !== newCompleted) {
              state.toggleScheduleComplete(target.id);
            }
            executedActions.push({
              type: 'COMPLETE_SCHEDULE',
              summary: act.summary || `Jadwal "${target.title}" ditandai ${newCompleted ? 'selesai' : 'belum selesai'}`,
              item: target,
              prevCompleted,
              canUndo: true,
              undone: false
            });
          } else if (act.type === 'RESCHEDULE') {
            const target = act.schedule;
            const prevItem = { ...target };
            const updated = {
              ...target,
              time: act.newTime || target.time,
              date: act.newDate || target.date
            };
            state.updateSchedule(target.id, updated);
            executedActions.push({
              type: 'RESCHEDULE',
              summary: act.summary || `Jadwal "${target.title}" digeser ke jam ${updated.time}`,
              prevItem,
              updatedId: target.id,
              canUndo: true,
              undone: false
            });
          } else if (act.type === 'DELETE_NOTE') {
            const target = act.note;
            state.deleteNote(target.id);
            executedActions.push({
              type: 'DELETE_NOTE',
              summary: act.summary || `Catatan "${target.title}" telah dihapus`,
              note: target,
              canUndo: true,
              undone: false
            });
          }
        }

        if (executedActions.length > 0) {
          refreshAllState();
          showToast(`${executedActions.length} tindakan AI berhasil dijalankan`, 'success');
        }
      }

      addChatMessage({
        role: 'assistant',
        text: cleanText,
        proposedSchedules: parsedSchedules,
        proposedNote: parsedNote,
        executedActions,
        savedSchedules,
        savedNote,
        rawResponse: response,
        timestamp: Date.now()
      });
    } catch (err) {
      addChatMessage({
        role: 'assistant',
        text: `Maaf, terjadi kendala saat memproses permintaan: ${err.message || 'Koneksi gagal'}`,
        timestamp: Date.now()
      });
      showToast('Gagal menghubungi AI', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!pendingChatPrompt) {
      pendingPromptRef.current = '';
      return;
    }

    if (isLoading || pendingPromptRef.current === pendingChatPrompt) return;

    const promptToRun = pendingChatPrompt;
    pendingPromptRef.current = promptToRun;
    setPendingChatPrompt('');
    executeChat(promptToRun);
  }, [pendingChatPrompt, isLoading]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend && !attachment) return;

    setInputText('');
    const attachToSend = attachment;
    setAttachment(null);
    await executeChat(textToSend, attachToSend);
  };

  const handleRegenerate = async (msgIndex) => {
    if (isLoading) return;

    // Search backwards from this assistant message for preceding user message
    let lastUserPrompt = '';
    let lastAttachment = null;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (chatHistory[i]?.role === 'user') {
        lastUserPrompt = chatHistory[i].text || '';
        lastAttachment = chatHistory[i].attachment || null;
        break;
      }
    }

    if (!lastUserPrompt && !lastAttachment) {
      showToast('Tidak ada pesan pengguna sebelumnya untuk dibuat ulang', 'warning');
      return;
    }

    showToast('Membuat ulang tanggapan AI...', 'info');
    await executeChat(lastUserPrompt, lastAttachment);
  };

  const handleSaveToNotes = async (msg) => {
    try {
      const text = msg.text || '';
      if (!text.trim()) {
        showToast('Tidak ada teks untuk disimpan ke Catatan', 'warning');
        return;
      }

      // Also copy text to clipboard for user convenience
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        }
      } catch (clipErr) {
        // Safe to ignore clipboard write failure if browser restricts it
      }

      let title = '';
      let content = text;
      if (msg.proposedNote && msg.proposedNote.title) {
        title = msg.proposedNote.title;
        content = msg.proposedNote.content || text;
      } else {
        const firstLine = text.split('\n').map((l) => l.trim()).filter(Boolean)[0] || 'Catatan Asisten AI';
        title = firstLine.replace(/^[#*-\s]+/, '').slice(0, 60).trim() || 'Catatan Asisten AI';
      }

      state.addNote(title, content);
      refreshAllState();
      showToast('Tanggapan berhasil disalin ke Catatan!', 'success');
    } catch (err) {
      console.error('Error saving note:', err);
      showToast('Gagal menyimpan ke Catatan: ' + err.message, 'error');
    }
  };

  const handleUpdateProposedItem = (msgId, itemIdx, field, value) => {
    const msg = chatHistory.find((m) => m.id === msgId);
    if (!msg || !Array.isArray(msg.proposedSchedules)) return;

    const updatedList = msg.proposedSchedules.map((item, idx) => {
      if (idx === itemIdx) {
        return { ...item, [field]: value };
      }
      return item;
    });

    if (updateChatMessage) {
      updateChatMessage(msgId, {
        proposedSchedules: updatedList,
        savedSchedules: false
      });
    } else {
      state.updateChatMessage(msgId, {
        proposedSchedules: updatedList,
        savedSchedules: false
      });
      refreshAllState();
    }
  };

  const handleDeleteProposedItem = (msgId, itemIdx) => {
    const msg = chatHistory.find((m) => m.id === msgId);
    if (!msg || !Array.isArray(msg.proposedSchedules)) return;

    const updatedList = msg.proposedSchedules.filter((_, idx) => idx !== itemIdx);

    if (updateChatMessage) {
      updateChatMessage(msgId, {
        proposedSchedules: updatedList,
        savedSchedules: false
      });
    } else {
      state.updateChatMessage(msgId, {
        proposedSchedules: updatedList,
        savedSchedules: false
      });
      refreshAllState();
    }
    showToast('Agenda dihapus dari usulan', 'info');
  };

  const handleAddProposedItem = (msgId) => {
    const msg = chatHistory.find((m) => m.id === msgId);
    if (!msg) return;

    const currentList = Array.isArray(msg.proposedSchedules) ? [...msg.proposedSchedules] : [];
    let nextTime = '09:00';
    if (currentList.length > 0) {
      const last = currentList[currentList.length - 1];
      if (last.time && typeof last.time === 'string') {
        const [h, m] = last.time.split(':').map(Number);
        const lastMinutes = (h || 0) * 60 + (m || 0) + (parseInt(last.duration, 10) || 30);
        const nextH = Math.floor(lastMinutes / 60) % 24;
        const nextM = lastMinutes % 60;
        nextTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
      }
    }

    const newItem = {
      title: 'Kegiatan Baru',
      time: nextTime,
      duration: 30,
      category: 'Kerja',
      recurrence: 'none',
      date: getLocalDateString(),
      priority: 'medium'
    };

    const updatedList = [...currentList, newItem];
    if (updateChatMessage) {
      updateChatMessage(msgId, {
        proposedSchedules: updatedList,
        savedSchedules: false
      });
    } else {
      state.updateChatMessage(msgId, {
        proposedSchedules: updatedList,
        savedSchedules: false
      });
      refreshAllState();
    }
    showToast('Kegiatan baru ditambahkan ke usulan', 'success');
  };

  const handleApplySchedules = (msgId) => {
    const msg = chatHistory.find((m) => m.id === msgId);
    if (!msg || !Array.isArray(msg.proposedSchedules) || msg.proposedSchedules.length === 0) {
      showToast('Tidak ada agenda untuk disimpan', 'warning');
      return;
    }

    const validItems = msg.proposedSchedules.map((item) => {
      if (!item || typeof item !== 'object') return null;
      const date = String(item.date || '').trim();
      const time = String(item.time || '').trim();
      const duration = Number(item.duration);
      const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : null;
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        parsedDate &&
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date;
      const validTime = /^([01]?\d|2[0-3]):([0-5]\d)$/.test(time);
      if (
        typeof item.title !== 'string' ||
        item.title.trim().length < 2 ||
        !validDate ||
        !validTime ||
        !Number.isInteger(duration) ||
        duration < 5 ||
        duration > 1440
      ) {
        return null;
      }
      return { ...item, date, time, duration };
    });

    if (validItems.some((item) => !item)) {
      showToast('Lengkapi judul, tanggal, waktu, dan durasi setiap kegiatan sebelum menyimpan', 'warning');
      return;
    }

    state.addSchedules(validItems);
    if (updateChatMessage) {
      updateChatMessage(msgId, { savedSchedules: true });
    } else {
      state.updateChatMessage(msgId, { savedSchedules: true });
      refreshAllState();
    }
    showToast(`${validItems.length} agenda berhasil disimpan ke Jadwal!`, 'success');
  };

  const handleApplyNote = (noteObj, msgId = null) => {
    if (!noteObj) return;
    state.addNote(noteObj.title, noteObj.content);
    if (msgId) {
      updateChatMessage(msgId, { savedNote: true });
    }
    refreshAllState();
    showToast('Catatan berhasil disimpan ke Catatan', 'success');
  };

  const handleUndoAction = (msgId, actionIndex) => {
    const msg = chatHistory.find((m) => m.id === msgId);
    if (!msg || !Array.isArray(msg.executedActions) || !msg.executedActions[actionIndex]) return;
    const action = msg.executedActions[actionIndex];
    if (action.undone) return;

    if (action.type === 'DELETE_SCHEDULE' && action.item) {
      state.addSchedule(action.item);
      showToast(`Penghapusan "${action.item.title}" dibatalkan`, 'info');
    } else if (action.type === 'COMPLETE_SCHEDULE' && action.item) {
      state.toggleScheduleComplete(action.item.id);
      showToast(`Status "${action.item.title}" dikembalikan`, 'info');
    } else if (action.type === 'RESCHEDULE' && action.prevItem) {
      state.updateSchedule(action.updatedId, action.prevItem);
      showToast(`Jadwal "${action.prevItem.title}" dikembalikan`, 'info');
    } else if (action.type === 'DELETE_NOTE' && action.note) {
      state.addNote(action.note.title, action.note.content);
      showToast(`Catatan "${action.note.title}" dipulihkan`, 'info');
    }

    action.undone = true;
    updateChatMessage(msgId, { executedActions: [...msg.executedActions] });
    refreshAllState();
  };

  const handleStartNewSession = () => {
    setInputText('');
    setAttachment(null);
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }
    clearChat();
  };

  const quickPrompts = [
    'Susun jadwal fokus hari ini',
    'Buat rencana hari yang seimbang untuk hari ini',
    'Rapikan daftar tugas jadi agenda'
  ];

  return (
    <section id="view-ai-plan" className="view-tab view-ai-redesign">
      {/* Unified AI Card — 1 Single Outer Container & Border */}
      <div className="card ai-chat-card-redesign unified-ai-card">
        {/* Integrated Card Header Bar */}
        <div className="ai-plan-unified-header">
          <div className="ai-header-left">
            <div className="ai-header-avatar">
              <Bot size={15} />
            </div>
            <div className="ai-header-titles">
              <span className="ai-header-title">Asisten AI</span>
              <div className="ai-header-subtitle font-mono tabular-nums">
                <span>{todaySchedules.length} kegiatan</span>
              </div>
            </div>
          </div>

          <div className="ai-header-right">
            <button
              type="button"
              className="ai-toolbar-btn btn-new-session"
              onClick={handleStartNewSession}
              title="Mulai sesi baru & bersihkan percakapan"
              aria-label="Mulai sesi baru"
            >
              <Plus size={14} />
              <span className="btn-label-desktop">Sesi Baru</span>
            </button>
          </div>
        </div>

        {/* Chat Area Scroll */}
        <div className="chat-history-scroll" ref={chatScrollRef}>
          {isFreshSession ? (
            <div className="ai-welcome-screen">
              <div className="ai-welcome-icon">
                <Bot size={23} />
              </div>
              <span className="ai-welcome-eyebrow">PERENCANA HARIAN</span>
              <h2>Rencanakan hari dengan lebih teratur</h2>
              <p>
                Tulis kegiatanmu dengan bahasa sehari-hari. AI akan menyusunnya menjadi agenda yang
                bisa kamu periksa dan edit sebelum disimpan.
              </p>
            </div>
          ) : chatHistory.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`chat-bubble-row ${isUser ? 'is-user-row' : 'is-ai-row'} ${Array.isArray(msg.proposedSchedules) && msg.proposedSchedules.length > 0 ? 'has-proposed-card' : ''}`}
              >
                <div className={`chat-avatar ${isUser ? 'avatar-user' : 'avatar-ai'}`}>
                  {isUser ? <User size={15} /> : <Bot size={15} />}
                </div>

                <div className="chat-bubble-content">
                  <div className={`chat-bubble ${isUser ? 'bubble-user' : 'bubble-ai'}`}>
                    {isUser ? (
                      <>
                        {msg.attachment && (
                          <div className="chat-user-attachment-preview">
                            {msg.attachment.previewUrl ? (
                              <img
                                src={msg.attachment.previewUrl}
                                alt={msg.attachment.name}
                                className="chat-user-attachment-img"
                              />
                            ) : (
                              <div className="chat-user-attachment-file">
                                <Paperclip size={13} />
                                <span>{msg.attachment.name}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="bubble-text">{msg.text}</p>
                      </>
                    ) : (
                      <div className="bubble-text formatted-content">
                        <FormattedMarkdown content={msg.text} />
                      </div>
                    )}
                  </div>

                  {!isUser && (
                    <div className="msg-actions-row">
                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => handleCopyMessage(msg.text)}
                        title="Salin ke papan klip"
                      >
                        <Copy size={11} />
                        <span>Salin</span>
                      </button>

                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => handleRegenerate(index)}
                        disabled={isLoading}
                        title="Buat ulang tanggapan asisten AI"
                      >
                        <RotateCcw size={11} className={isLoading ? 'animate-spin' : ''} />
                        <span>Regenerate</span>
                      </button>

                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => handleSaveToNotes(msg)}
                        title="Salin dan simpan ke Catatan DayFlow"
                      >
                        <FileText size={11} />
                        <span>Catatan</span>
                      </button>
                    </div>
                  )}

                  {/* Proposed Schedules Card - Check & Direct Inline Edit */}
                  {Array.isArray(msg.proposedSchedules) && msg.proposedSchedules.length > 0 && (
                    <div className="proposed-items-card">
                      <div className="proposed-items-header">
                        <div className="proposed-items-header-left">
                          <Calendar size={13} className="text-orange" />
                          <span className="proposed-items-title">
                            Rekomendasi Agenda ({msg.proposedSchedules.length})
                          </span>
                        </div>

                        <div className="proposed-items-header-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => handleAddProposedItem(msg.id)}
                            title="Tambah kegiatan baru ke daftar usulan"
                          >
                            <Plus size={11} />
                            <span>Tambah</span>
                          </button>

                          {msg.savedSchedules ? (
                            <span className="badge-tag badge-tag-success" title="Agenda ini sudah tersimpan di Jadwal Anda">
                              <Check size={12} /> Tersimpan
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary btn-xs"
                              onClick={() => handleApplySchedules(msg.id)}
                              title="Terapkan dan simpan semua agenda ini ke Jadwal"
                            >
                              <CalendarPlus size={12} />
                              <span>Simpan ke Jadwal</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="proposed-items-list">
                        {msg.proposedSchedules.map((item, idx) => {
                          const targetDate = item.date || todayStr;
                          const dayItems = state.getSchedules(targetDate);
                          const [ih, im] = (item.time || '09:00').split(':').map(Number);
                          const iStart = (isNaN(ih) ? 9 : ih) * 60 + (isNaN(im) ? 0 : im);
                          const iEnd = iStart + (parseInt(item.duration, 10) || 30);
                          const conflictExisting = dayItems.find((ex) => {
                            // If this schedule was already saved, don't flag as conflict with itself
                            const isSame = (ex.id && item.id && ex.id === item.id) ||
                              (ex.title?.trim().toLowerCase() === item.title?.trim().toLowerCase() && ex.time === item.time);
                            if (isSame) return false;

                            const [eh, em] = (ex.time || '09:00').split(':').map(Number);
                            const eStart = (isNaN(eh) ? 9 : eh) * 60 + (isNaN(em) ? 0 : em);
                            const eEnd = eStart + (parseInt(ex.duration, 10) || 30);
                            return iStart < eEnd && iEnd > eStart;
                          });
                          const gCalUrl = generateGoogleCalendarUrl(item);

                          return (
                            <div key={idx} className={`proposed-item-row-editable ${conflictExisting ? 'has-conflict' : ''}`}>
                              <div className="proposed-field-time" title="Jam mulai kegiatan (klik untuk ubah)">
                                <Clock size={11} className="text-muted" />
                                <TimePicker
                                  id={`ai-proposed-time-${msg.id}-${idx}`}
                                  value={item.time || '09:00'}
                                  onChange={(value) => handleUpdateProposedItem(msg.id, idx, 'time', value)}
                                  compact
                                />
                              </div>

                              <div className="proposed-title-wrap">
                                <input
                                  type="text"
                                  className="proposed-input-title"
                                  value={item.title || ''}
                                  placeholder="Nama kegiatan..."
                                  onChange={(e) => handleUpdateProposedItem(msg.id, idx, 'title', e.target.value)}
                                  title="Nama kegiatan (klik untuk edit langsung)"
                                />
                                {conflictExisting && (
                                  <span
                                    className="badge-tag badge-tag-warning"
                                    title={`Waktu bertabrakan dengan: ${conflictExisting.title} (${conflictExisting.time})`}
                                  >
                                    <AlertTriangle size={10} /> Bentrok: {conflictExisting.title}
                                  </span>
                                )}
                              </div>

                              <div className="proposed-field-duration font-mono tabular-nums" title="Durasi kegiatan dalam menit">
                                <input
                                  type="number"
                                  min="5"
                                  step="5"
                                  className="proposed-input-duration"
                                  value={item.duration || 30}
                                  onChange={(e) => handleUpdateProposedItem(msg.id, idx, 'duration', Math.max(5, parseInt(e.target.value, 10) || 5))}
                                />
                                <span className="proposed-unit">m</span>
                              </div>

                              {gCalUrl && (
                                <a
                                  href={gCalUrl}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="proposed-action-link"
                                  title="Buka di Google Calendar"
                                  aria-label="Buka di Google Calendar"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}

                              <button
                                type="button"
                                className="proposed-delete-btn"
                                onClick={() => handleDeleteProposedItem(msg.id, idx)}
                                title="Hapus agenda ini dari daftar usulan"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {msg.proposedSchedules.length > 2 && !msg.savedSchedules && (
                        <div className="proposed-items-footer">
                          <span className="proposed-help-hint">
                            Bisa diedit langsung sebelum disimpan.
                          </span>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => handleApplySchedules(msg.id)}
                          >
                            <CalendarPlus size={12} />
                            <span>Simpan Semua ({msg.proposedSchedules.length})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Proposed Note Card */}
                  {msg.proposedNote && (
                    <div className="proposed-items-card">
                      <div className="proposed-items-header">
                        <span className="proposed-items-title">
                          <FileText size={13} />
                          <span>{msg.proposedNote.title || 'Catatan Baru'}</span>
                        </span>
                        {msg.savedNote ? (
                          <span className="badge-tag badge-tag-success" title="Catatan ini sudah tersimpan di Catatan Anda">
                            <Check size={11} /> Tersimpan
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => handleApplyNote(msg.proposedNote, msg.id)}
                            title="Simpan rangkuman ini ke menu Catatan"
                          >
                            <Plus size={11} />
                            <span>Simpan Catatan</span>
                          </button>
                        )}
                      </div>
                      <p className="proposed-note-preview">{msg.proposedNote.content}</p>
                    </div>
                  )}

                  {/* Executed Actions Receipt (Pilar 1: AI Action Engine with Undo) */}
                  {Array.isArray(msg.executedActions) && msg.executedActions.length > 0 && (
                    <div className="executed-actions-card">
                      <div className="executed-actions-header">
                        <Zap size={12} className="text-orange" />
                        <span className="executed-actions-title">Tindakan Dijalankan ({msg.executedActions.length})</span>
                      </div>
                      <div className="executed-actions-list">
                        {msg.executedActions.map((action, aIdx) => (
                          <div key={aIdx} className={`executed-action-item ${action.undone ? 'is-undone' : ''}`}>
                            <div className="action-item-left">
                              {action.undone ? (
                                <RotateCcw size={12} className="text-muted flex-shrink-0" />
                              ) : (
                                <CheckCircle2 size={12} className="text-success flex-shrink-0" />
                              )}
                              <span className="action-summary-text">{action.summary}</span>
                            </div>
                            {action.canUndo && !action.undone ? (
                              <button
                                type="button"
                                className="btn-undo-action"
                                onClick={() => handleUndoAction(msg.id, aIdx)}
                                title="Batalkan perubahan ini"
                              >
                                <RotateCcw size={10} />
                                <span>Urungkan</span>
                              </button>
                            ) : action.undone ? (
                              <span className="action-undone-badge">Dibatalkan</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="chat-bubble-row is-ai-row">
              <div className="chat-avatar avatar-ai">
                <Bot size={15} />
              </div>
              <div className="chat-bubble bubble-ai is-loading-bubble">
                <Loader2 size={16} className="animate-spin text-orange" />
                <span>DayFlow AI sedang berpikir...</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Dock: Chips, Attachment, and Form */}
        <div className="chat-bottom-dock-redesign">
          {/* Quick Prompts Chips */}
          <div className="chat-quick-chips-row">
            {quickPrompts.map((promptText, i) => (
              <button
                key={i}
                type="button"
                className="chat-prompt-chip"
                onClick={() => setInputText(promptText)}
              >
                <span>{promptText}</span>
              </button>
            ))}
          </div>

          {/* Attachment Preview Pill */}
          {attachment && (
            <div className="chat-attachment-pill">
              {attachment.previewUrl ? (
                <img src={attachment.previewUrl} alt={attachment.name} className="chat-attachment-thumb" />
              ) : (
                <Paperclip size={13} className="text-orange" />
              )}
              <span className="attachment-pill-name">{attachment.name}</span>
              <button
                type="button"
                className="btn-cancel-attach"
                onClick={() => setAttachment(null)}
                aria-label="Hapus Lampiran"
                title="Hapus Lampiran"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <form className="chat-input-bar" onSubmit={handleSubmit}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept={getNoteAttachmentAccept()}
              className="hidden"
              disabled={isLoading || isPreparingAttachment}
            />

            <button
              type="button"
              className={`btn btn-ghost btn-sm btn-icon ${!canAttachFile || isPreparingAttachment ? 'opacity-40 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (isPreparingAttachment) return;
                if (!canAttachFile) {
                  showToast(`Batas lampiran file harian telah tercapai (maksimal ${maxAttachLimit} kali per hari). Coba lagi besok.`, 'warning');
                  return;
                }
                fileInputRef.current?.click();
              }}
              title={isPreparingAttachment ? 'Membaca berkas…' : canAttachFile ? 'Lampirkan file (PDF, DOCX, gambar, teks, dll)' : 'Batas lampiran file harian tercapai'}
              aria-label="Lampirkan File"
              disabled={isPreparingAttachment || isLoading}
            >
              {isPreparingAttachment ? <Loader2 size={16} className="animate-spin text-orange" /> : <Paperclip size={16} />}
            </button>

            <button
              type="button"
              className={`btn btn-ghost btn-sm btn-icon ${isRecording ? 'is-recording-btn' : ''}`}
              onClick={toggleSpeechRecognition}
              title="Dikte Suara"
              aria-label="Dikte Suara"
            >
              {isRecording ? <MicOff size={16} className="text-danger" /> : <Mic size={16} />}
            </button>

            <input
              type="text"
              ref={chatInputRef}
              className="chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tulis Jadwal/Catatan..."
              disabled={isLoading}
            />

            <button
              type="submit"
              className="btn btn-primary btn-sm btn-icon"
              disabled={isLoading || isPreparingAttachment || (!inputText.trim() && !attachment)}
              aria-label="Kirim Pesan"
            >
              <PenLine size={15} />
            </button>
          </form>

        </div>
      </div>
    </section>
  );
}
