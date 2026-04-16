import { useRef, useEffect, useState } from 'react';
import { X, Bold, Italic, Underline, List, ListOrdered, Loader2, Mic, MicOff, Trash2 } from 'lucide-react';
import API from '../services/api';

const TOOLBAR_BUTTONS = [
  { cmd: 'bold',                icon: Bold,         label: 'Bold'          },
  { cmd: 'italic',              icon: Italic,        label: 'Italic'        },
  { cmd: 'underline',           icon: Underline,     label: 'Underline'     },
  { divider: true },
  { cmd: 'insertUnorderedList', icon: List,          label: 'Bullet list'   },
  { cmd: 'insertOrderedList',   icon: ListOrdered,   label: 'Numbered list' },
];

const TEXT_SIZES = [
  { label: 'Small',  cmd: 'fontSize', arg: '2' },
  { label: 'Normal', cmd: 'fontSize', arg: '3' },
  { label: 'Large',  cmd: 'fontSize', arg: '5' },
  { label: 'Huge',   cmd: 'fontSize', arg: '7' },
];

/**
 * RichTextEditorModal
 *
 * Props:
 *  isOpen          — boolean
 *  onClose         — fn
 *  type            — 'note' | 'advice'   (drives title + placeholder)
 *  initialContent  — string (HTML)        edit mode: pre-populates editor
 *  onSave(content) — async fn             caller handles the API call
 */
export default function RichTextEditorModal({ isOpen, onClose, type, initialContent, onSave, onDelete }) {
  const editorRef         = useRef(null);
  const savedRangeRef     = useRef(null);
  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [isEmpty, setIsEmpty]       = useState(true);
  const [activeFormats, setActiveFormats] = useState({});
  const [recording, setRecording]   = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  // Populate / clear editor when modal opens
  useEffect(() => {
    if (!isOpen || !editorRef.current) return;
    editorRef.current.innerHTML = initialContent || '';
    const text = editorRef.current.innerText?.trim() || '';
    setIsEmpty(text.length === 0);
    // Focus at end
    const range = document.createRange();
    const sel   = window.getSelection();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    editorRef.current.focus();
  }, [isOpen, initialContent]);

  // --- Selection helpers (needed so dropdown doesn't lose selection) ---
  function saveSelection() {
    const sel = window.getSelection();
    if (sel?.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }

  function execCmd(cmd, arg = null) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    updateActiveFormats();
  }

  function updateActiveFormats() {
    setActiveFormats({
      bold:      document.queryCommandState('bold'),
      italic:    document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }

  function handleInput() {
    const text = editorRef.current?.innerText?.trim() || '';
    setIsEmpty(text.length === 0);
    updateActiveFormats();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  }

  function handleSizeChange(e) {
    const size = TEXT_SIZES.find(s => s.label === e.target.value);
    if (!size) return;
    restoreSelection();
    execCmd(size.cmd, size.arg);
    e.target.value = ''; // reset dropdown to placeholder
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); sendAudioForTranscription(); };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      alert('Microphone access denied. Please allow microphone permissions.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function sendAudioForTranscription() {
    setTranscribing(true);
    try {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const { data } = await API.post('/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.transcript) {
        // Insert transcript at cursor position (or at end if no cursor)
        editorRef.current?.focus();
        const sel = window.getSelection();
        if (savedRangeRef.current && sel) {
          sel.removeAllRanges();
          sel.addRange(savedRangeRef.current);
        }
        document.execCommand('insertText', false, data.transcript);
        handleInput();
      }
    } catch (err) {
      alert('Transcription failed. Please try again.');
      console.error('Transcription error:', err);
    } finally {
      setTranscribing(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm(`Delete this ${type === 'note' ? 'consultation note' : 'advice'}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    const content = editorRef.current?.innerHTML?.trim();
    if (!content || editorRef.current?.innerText?.trim() === '') return;

    setSaving(true);
    try {
      await onSave(content);
      onClose();
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const isEdit = !!initialContent;
  const title  = isEdit
    ? (type === 'note' ? 'Edit Consultation Note' : 'Edit Advice')
    : (type === 'note' ? 'New Consultation Note'  : 'New Advice');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-lg text-slate-800">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-4 py-2 border-b border-slate-100 bg-slate-50 flex-wrap">

          {/* Text size dropdown */}
          <select
            defaultValue=""
            onChange={handleSizeChange}
            onMouseDown={saveSelection}
            className="h-8 px-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-md mr-1
                       hover:border-slate-300 focus:outline-none focus:border-[#137fec] cursor-pointer"
          >
            <option value="" disabled>Text size</option>
            {TEXT_SIZES.map(s => (
              <option key={s.label} value={s.label}>{s.label}</option>
            ))}
          </select>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Format buttons */}
          {TOOLBAR_BUTTONS.map((item, i) => {
            if (item.divider) return <div key={i} className="w-px h-5 bg-slate-200 mx-1" />;
            const Icon     = item.icon;
            const isActive = activeFormats[item.cmd];
            return (
              <button
                key={item.cmd}
                onMouseDown={(e) => {
                  e.preventDefault();
                  execCmd(item.cmd);
                }}
                title={item.label}
                className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                  isActive ? 'bg-[#137fec] text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon size={15} />
              </button>
            );
          })}

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Mic / transcribe button */}
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={recording ? stopRecording : startRecording}
            disabled={transcribing}
            title={recording ? 'Stop recording' : transcribing ? 'Transcribing…' : 'Dictate (speech to text)'}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
              recording
                ? 'bg-red-500 text-white animate-pulse'
                : transcribing
                ? 'bg-slate-200 text-slate-500'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {transcribing
              ? <><Loader2 size={14} className="animate-spin" /> Transcribing…</>
              : recording
              ? <><MicOff size={14} /> Stop</>
              : <><Mic size={14} /> Dictate</>
            }
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[220px]">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onKeyUp={() => { saveSelection(); updateActiveFormats(); }}
            onMouseUp={() => { saveSelection(); updateActiveFormats(); }}
            className="outline-none text-slate-700 text-sm leading-relaxed min-h-[200px]
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
              [&_li]:my-0.5
              [&_b]:font-semibold [&_strong]:font-semibold"
            data-placeholder={type === 'note'
              ? 'Write consultation notes here — findings, diagnosis, observations...'
              : 'Write patient advice here — post-op care, dietary restrictions, follow-up instructions...'}
          />
          {isEmpty && (
            <style>{`[contenteditable]:empty:before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; display: block; }`}</style>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            {isEdit && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <p className="text-xs text-slate-400">Ctrl + Enter to save</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || isEmpty}
              className="px-6 py-2 text-sm font-semibold text-white bg-[#137fec] rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
