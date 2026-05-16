import React, { useState, useEffect } from 'react';

const NODE_TYPES = [
  { value: 'message',   label: 'Message',   icon: 'chat_bubble', desc: 'Send a WhatsApp message' },
  { value: 'delay',     label: 'Delay',     icon: 'schedule',    desc: 'Wait before continuing' },
  { value: 'condition', label: 'Condition', icon: 'alt_route',   desc: 'Branch based on reply' },
  { value: 'subflow',   label: 'Sub-Flow',  icon: 'account_tree', desc: 'Jump into another flow' },
  { value: 'end',       label: 'End',       icon: 'stop_circle', desc: 'End this flow' },
];

const MSG_TYPES = [
  { value: 'text',     label: 'Text',     icon: 'chat' },
  { value: 'image',    label: 'Image',    icon: 'image' },
  { value: 'video',    label: 'Video',    icon: 'videocam' },
  { value: 'document', label: 'Document', icon: 'description' },
  { value: 'audio',    label: 'Audio',    icon: 'mic' },
  { value: 'poll',     label: 'Poll',     icon: 'poll' },
  { value: 'location', label: 'Location', icon: 'location_on' },
];

const DEFAULT = {
  nodeType: 'message',
  label: '',
  messageType: 'text',
  content: { text: '', imageUrl: '', videoUrl: '', documentUrl: '', fileName: '', audioUrl: '', caption: '', poll: { question: '', options: ['', ''], multiSelect: false }, location: { latitude: '', longitude: '', name: '', address: '' } },
  delayValue: 1,
  delayUnit: 'hours',
  waitForResponse: false,
  referencedFlowId: '',
};

function merge(target, source) {
  return { ...target, ...source, content: { ...target.content, ...(source.content || {}), poll: { ...target.content.poll, ...(source.content?.poll || {}) }, location: { ...target.content.location, ...(source.content?.location || {}) } } };
}

// Available placeholder variables by trigger type
const PLACEHOLDERS = {
  first_message:           ['name', 'firstName', 'phone'],
  appointment_received:    ['name', 'firstName', 'phone', 'date', 'time', 'doctorName'],
  appointment_booked:      ['name', 'firstName', 'phone', 'date', 'time', 'doctorName'],
  appointment_confirmed:   ['name', 'firstName', 'phone', 'date', 'time', 'doctorName'],
  appointment_reminder:    ['name', 'firstName', 'phone', 'date', 'time', 'doctorName'],
  appointment_completed:   ['name', 'firstName', 'phone', 'date', 'time', 'doctorName'],
  appointment_rescheduled: ['name', 'firstName', 'phone', 'date', 'time', 'doctorName'],
  treatment_completed:     ['name', 'firstName', 'phone', 'treatment', 'doctorName'],
  post_treatment_care:     ['name', 'firstName', 'phone', 'treatment', 'doctorName'],
  invoice_created:         ['name', 'firstName', 'phone', 'invoiceId', 'amount'],
  custom_keyword:          ['name', 'firstName', 'phone'],
};

const SAMPLE_DATA = {
  name: 'John Smith', firstName: 'John', phone: '9876543210',
  date: '15 Mar 2025', time: '10:30 AM', doctorName: 'Dr. Sharma',
  treatment: 'Root Canal', invoiceId: 'INV-2025-042', amount: '4500',
};

// Triggers fired by an inbound WhatsApp message: only a phone number is known,
// so {{name}}/{{firstName}} resolve to the patient's name (if the number is
// already a patient), else the sender's WhatsApp profile name, else blank.
const NAME_RISK_TRIGGERS = ['first_message', 'custom_keyword'];
const SAMPLE_DATA_NO_NAME = { ...SAMPLE_DATA, name: '', firstName: '' };

function usesNamePlaceholder(content) {
  return /\{\{\s*(name|firstName)\s*\}\}/.test(JSON.stringify(content || {}));
}

function substitute(text, data) {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}

// Placeholder chip picker: clickable chips that insert {{var}} at cursor position
function PlaceholderPicker({ triggerType, onInsert }) {
  const vars = PLACEHOLDERS[triggerType] || PLACEHOLDERS.first_message;
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider self-center mr-1">Insert:</span>
      {vars.map(v => (
        <button key={v} type="button"
          onClick={() => onInsert(`{{${v}}}`)}
          className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors font-mono">
          {`{{${v}}}`}
        </button>
      ))}
    </div>
  );
}

// Curated emoji set — covers ~95% of clinic messaging. No dependency.
const EMOJIS = [
  '😀','😃','😄','😁','😉','😊','🙂','😍','😘','🥰','😎','🤗','🤔','😅','😇','🙃',
  '👍','👏','🙏','💪','🤝','✌️','👋','☝️','👌','🤙','✅','❌','❗','❓',
  '❤️','🩵','💙','💚','💛','🧡','💜','✨','⭐','🌟','🎉','🎊','🎁','🥳',
  '🦷','🪥','🦠','💊','🏥','🩺','🩹','😷','🚑','👨‍⚕️','👩‍⚕️','🧑‍⚕️',
  '📅','⏰','🕒','📞','📱','📍','📌','💬','📩','ℹ️','💡','🔔','😟','🙁','😢','🥺',
];

// Emoji palette: collapsible inline grid; inserts at cursor like PlaceholderPicker
function EmojiPicker({ onInsert }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors">
        <span className="material-symbols-outlined text-[16px]">mood</span>
        Emoji
        <span className="material-symbols-outlined text-[14px]">{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && (
        <div className="mt-1.5 flex flex-wrap gap-0.5 p-2 rounded-lg border border-slate-200 bg-slate-50 max-h-32 overflow-y-auto">
          {EMOJIS.map((e, i) => (
            <button key={i} type="button" onClick={() => onInsert(e)}
              className="w-7 h-7 flex items-center justify-center text-lg rounded hover:bg-blue-100 transition-colors">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// WhatsApp text formatting reminder
function FormattingHint() {
  return (
    <p className="text-[10px] text-slate-400 mt-1">
      Formatting: *bold*  _italic_  ~strike~  ```mono```  — press Enter for a new line
    </p>
  );
}

// Multiline caption with placeholder + emoji insertion (image/video/document)
function CaptionField({ value, onChange, triggerType, captionRef, insert }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Caption</label>
      <PlaceholderPicker triggerType={triggerType} onInsert={insert} />
      <EmojiPicker onInsert={insert} />
      <textarea
        ref={captionRef}
        rows={3}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            const el = captionRef.current;
            if (!el) return;
            const start = el.selectionStart || 0;
            const end = el.selectionEnd || 0;
            const next = el.value.slice(0, start) + '\n' + el.value.slice(end);
            onChange(next);
            setTimeout(() => { el.focus(); el.setSelectionRange(start + 1, start + 1); }, 0);
          }
        }}
        placeholder="Optional caption"
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
      />
      <FormattingHint />
    </div>
  );
}

// Minimal WhatsApp text formatting for the preview (escape first, then markup)
function waFormat(raw) {
  const esc = String(raw == null ? '' : raw)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/```([^`]+)```/g, '<span class="font-mono text-[12px] bg-black/5 rounded px-1">$1</span>')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/~([^~\n]+)~/g, '<del>$1</del>');
}

function WaBubble({ label, children }) {
  return (
    <div className="flex flex-col">
      {label && <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</span>}
      <div className="self-end max-w-[90%] bg-[#d9fdd3] rounded-lg rounded-tr-[3px] px-2.5 py-1.5 shadow-sm">
        {children}
        <span className="flex items-center justify-end gap-1 mt-1 -mb-0.5">
          <span className="text-[9px] text-slate-500">10:30</span>
          <span className="material-symbols-outlined text-[14px] text-sky-500 leading-none">done_all</span>
        </span>
      </div>
    </div>
  );
}

function WaMedia({ type, fileName }) {
  const icon = type === 'image' ? 'image' : type === 'video' ? 'movie' : type === 'audio' ? 'mic' : 'description';
  const fallback = type.charAt(0).toUpperCase() + type.slice(1);
  return (
    <div className="mb-1 rounded-md bg-black/5 flex items-center justify-center gap-2 py-6 text-slate-500 min-w-[160px]">
      <span className="material-symbols-outlined text-[26px]">{icon}</span>
      <span className="text-xs">{fileName || fallback}</span>
    </div>
  );
}

function WaMessageBody({ form, data }) {
  const c = form.content || {};
  const mt = form.messageType;
  const fmt = (s) => ({ __html: waFormat(substitute(s || '', data)) });

  if (mt === 'text') {
    return <p className="text-[13px] text-slate-800 leading-snug" style={{ whiteSpace: 'pre-wrap' }}
      dangerouslySetInnerHTML={fmt(c.text)} />;
  }
  if (mt === 'image' || mt === 'video' || mt === 'document') {
    return (
      <>
        <WaMedia type={mt} fileName={mt === 'document' ? c.fileName : null} />
        {c.caption && <p className="text-[13px] text-slate-800 leading-snug" style={{ whiteSpace: 'pre-wrap' }}
          dangerouslySetInnerHTML={fmt(c.caption)} />}
      </>
    );
  }
  if (mt === 'audio') return <WaMedia type="audio" />;
  if (mt === 'poll') {
    const poll = c.poll || {};
    return (
      <div className="min-w-[190px]">
        <p className="text-[13px] font-medium text-slate-800 leading-snug mb-1.5"
          dangerouslySetInnerHTML={fmt(poll.question || 'Poll question')} />
        <div className="flex flex-col gap-1.5">
          {(poll.options || []).filter(Boolean).map((o, i) => (
            <div key={i} className="flex items-center gap-2 border border-black/10 rounded-md px-2 py-1.5 bg-white/70">
              <span className={`w-3.5 h-3.5 border border-slate-400 ${poll.multiSelect ? 'rounded-sm' : 'rounded-full'}`} />
              <span className="text-[12px] text-slate-700">{o}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5">{poll.multiSelect ? 'Select one or more' : 'Select one'}</p>
      </div>
    );
  }
  if (mt === 'location') {
    const loc = c.location || {};
    return (
      <div className="min-w-[180px]">
        <div className="rounded-md bg-black/5 flex items-center justify-center py-5 mb-1">
          <span className="material-symbols-outlined text-[26px] text-red-500">location_on</span>
        </div>
        <p className="text-[12px] font-medium text-slate-800">{loc.name || 'Location'}</p>
        {loc.address && <p className="text-[11px] text-slate-500">{loc.address}</p>}
      </div>
    );
  }
  return null;
}

function WhatsAppPreview({ form, nameRiskActive }) {
  if (form.nodeType !== 'message') {
    const map = {
      delay: `Waits ${form.delayValue || 1} ${form.delayUnit || 'hours'}, then continues`,
      condition: 'Branches based on the customer reply',
      subflow: 'Jumps into another flow',
      end: 'Ends the conversation flow',
    };
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <p className="text-xs text-slate-600 bg-white/80 rounded-lg px-3 py-2">{map[form.nodeType] || 'No preview for this node'}</p>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-[#008069] text-white px-3 py-2 flex items-center gap-2">
        <span className="material-symbols-outlined text-[22px]">account_circle</span>
        <div className="leading-tight">
          <p className="text-xs font-semibold">Patient</p>
          <p className="text-[9px] text-white/70">WhatsApp preview</p>
        </div>
      </div>
      <div className="flex-1 px-3 py-4 flex flex-col gap-3">
        <WaBubble label={nameRiskActive ? 'Existing patient' : null}>
          <WaMessageBody form={form} data={SAMPLE_DATA} />
        </WaBubble>
        {nameRiskActive && (
          <WaBubble label="New customer — no name">
            <WaMessageBody form={form} data={SAMPLE_DATA_NO_NAME} />
          </WaBubble>
        )}
      </div>
    </div>
  );
}

export default function ChatbotNodeModal({ isOpen, onClose, onSave, nodeData, flows = [], triggerType = 'first_message' }) {
  const [form, setForm] = useState(DEFAULT);
  const textRef = React.useRef(null);
  const captionRef = React.useRef(null);
  const pollQuestionRef = React.useRef(null);

  // Insert text at cursor in given ref'd input
  const insertAtCursor = (ref, field, isContent = true, isPoll = false) => (placeholder) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart || 0;
    const end   = el.selectionEnd   || 0;
    const current = isPoll ? form.content.poll[field] || '' : isContent ? form.content[field] || '' : form[field] || '';
    const next = current.slice(0, start) + placeholder + current.slice(end);
    if (isPoll) setPoll(field, next);
    else if (isContent) setContent(field, next);
    else set(field, next);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + placeholder.length, start + placeholder.length); }, 0);
  };

  useEffect(() => {
    if (nodeData) {
      setForm(merge(DEFAULT, nodeData.data || nodeData));
    } else {
      setForm(DEFAULT);
    }
  }, [nodeData, isOpen]);

  if (!isOpen) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setContent = (k, v) => setForm(f => ({ ...f, content: { ...f.content, [k]: v } }));
  const setPoll = (k, v) => setForm(f => ({ ...f, content: { ...f.content, poll: { ...f.content.poll, [k]: v } } }));
  const setLocation = (k, v) => setForm(f => ({ ...f, content: { ...f.content, location: { ...f.content.location, [k]: v } } }));

  const nameRiskActive = NAME_RISK_TRIGGERS.includes(triggerType) && usesNamePlaceholder(form.content);

  function handleSave() {
    if (!form.label.trim() && form.nodeType !== 'end') return alert('Label is required');
    onSave(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{nodeData ? 'Edit Node' : 'Add Node'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 flex flex-col gap-5 min-h-0">
          {/* Node type selector (only for new nodes) */}
          {!nodeData && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Node Type</label>
              <div className="grid grid-cols-2 gap-2">
                {NODE_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => set('nodeType', t.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm transition-colors ${form.nodeType === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-blue-300'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{t.label}</p>
                      <p className="text-[10px] text-slate-400">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Label */}
          {form.nodeType !== 'end' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Label (shown on canvas)</label>
              <input
                type="text"
                value={form.label}
                onChange={e => set('label', e.target.value)}
                placeholder="e.g. Welcome Message"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* ── Message node fields ── */}
          {form.nodeType === 'message' && (
            <>
              {nameRiskActive && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[20px]">warning</span>
                  <div className="text-xs text-amber-800 leading-relaxed">
                    <p className="font-semibold mb-0.5">Name may be blank for new customers</p>
                    <p>
                      {'This flow is triggered by an incoming WhatsApp message, so we only know the sender’s phone number. '}
                      <span className="font-mono">{'{{name}}'}</span> /{' '}
                      <span className="font-mono">{'{{firstName}}'}</span>
                      {' resolve to the patient’s name if the number already exists in your records, otherwise the sender’s WhatsApp profile name, and '}
                      <span className="font-semibold">blank</span>
                      {' if neither is available. Write the message so it still reads correctly with no name (e.g. “Hi! Thanks for reaching out”).'}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message Type</label>
                <div className="flex flex-wrap gap-2">
                  {MSG_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => set('messageType', t.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${form.messageType === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-blue-300 text-slate-600'}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content by type */}
              {form.messageType === 'text' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message Text</label>
                  <PlaceholderPicker triggerType={triggerType} onInsert={insertAtCursor(textRef, 'text', true)} />
                  <EmojiPicker onInsert={insertAtCursor(textRef, 'text', true)} />
                  <textarea
                    ref={textRef}
                    rows={6}
                    value={form.content.text}
                    onChange={e => setContent('text', e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        const el = textRef.current;
                        if (!el) return;
                        const start = el.selectionStart || 0;
                        const end = el.selectionEnd || 0;
                        const next = el.value.slice(0, start) + '\n' + el.value.slice(end);
                        setContent('text', next);
                        setTimeout(() => { el.focus(); el.setSelectionRange(start + 1, start + 1); }, 0);
                      }
                    }}
                    placeholder="Hello {{firstName}}! Tap a chip above to insert variables."
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                  <FormattingHint />
                </div>
              )}
              {form.messageType === 'image' && (
                <>
                  <InputField label="Image URL" value={form.content.imageUrl} onChange={v => setContent('imageUrl', v)} placeholder="https://…" />
                  <CaptionField value={form.content.caption} onChange={v => setContent('caption', v)} triggerType={triggerType} captionRef={captionRef} insert={insertAtCursor(captionRef, 'caption', true)} />
                </>
              )}
              {form.messageType === 'video' && (
                <>
                  <InputField label="Video URL" value={form.content.videoUrl} onChange={v => setContent('videoUrl', v)} placeholder="https://…" />
                  <CaptionField value={form.content.caption} onChange={v => setContent('caption', v)} triggerType={triggerType} captionRef={captionRef} insert={insertAtCursor(captionRef, 'caption', true)} />
                </>
              )}
              {form.messageType === 'document' && (
                <>
                  <InputField label="Document URL" value={form.content.documentUrl} onChange={v => setContent('documentUrl', v)} placeholder="https://…" />
                  <InputField label="File Name" value={form.content.fileName} onChange={v => setContent('fileName', v)} placeholder="report.pdf" />
                  <CaptionField value={form.content.caption} onChange={v => setContent('caption', v)} triggerType={triggerType} captionRef={captionRef} insert={insertAtCursor(captionRef, 'caption', true)} />
                </>
              )}
              {form.messageType === 'audio' && (
                <InputField label="Audio URL" value={form.content.audioUrl} onChange={v => setContent('audioUrl', v)} placeholder="https://…" />
              )}
              {form.messageType === 'poll' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Poll Question</label>
                    <PlaceholderPicker triggerType={triggerType} onInsert={insertAtCursor(pollQuestionRef, 'question', false, true)} />
                    <EmojiPicker onInsert={insertAtCursor(pollQuestionRef, 'question', false, true)} />
                    <textarea ref={pollQuestionRef} rows={3} value={form.content.poll.question}
                      onChange={e => setPoll('question', e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          const el = pollQuestionRef.current;
                          if (!el) return;
                          const start = el.selectionStart || 0;
                          const end = el.selectionEnd || 0;
                          const next = el.value.slice(0, start) + '\n' + el.value.slice(end);
                          setPoll('question', next);
                          setTimeout(() => { el.focus(); el.setSelectionRange(start + 1, start + 1); }, 0);
                        }
                      }}
                      placeholder="How was your experience?"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Options</label>
                    {(form.content.poll.options || []).map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const opts = [...form.content.poll.options];
                            opts[i] = e.target.value;
                            setPoll('options', opts);
                          }}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {form.content.poll.options.length > 2 && (
                          <button onClick={() => setPoll('options', form.content.poll.options.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setPoll('options', [...form.content.poll.options, ''])}
                      className="text-xs text-blue-600 hover:underline text-left mt-1"
                    >
                      + Add Option
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.content.poll.multiSelect} onChange={e => setPoll('multiSelect', e.target.checked)} className="rounded" />
                    Allow multiple selections
                  </label>
                </div>
              )}
              {form.messageType === 'location' && (
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Latitude"  value={form.content.location.latitude}  onChange={v => setLocation('latitude', v)}  placeholder="18.9220" />
                  <InputField label="Longitude" value={form.content.location.longitude} onChange={v => setLocation('longitude', v)} placeholder="72.8347" />
                  <InputField label="Name"    value={form.content.location.name}    onChange={v => setLocation('name', v)}    placeholder="Clinic Name" />
                  <InputField label="Address" value={form.content.location.address} onChange={v => setLocation('address', v)} placeholder="123 Main St" />
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.waitForResponse} onChange={e => set('waitForResponse', e.target.checked)} className="rounded" />
                Wait for customer reply before continuing
              </label>
              {form.waitForResponse && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                  Draw edges from this node to define which reply leads where. Edge labels = customer reply text (or * for any).
                </p>
              )}
            </>
          )}

          {/* ── Delay node ── */}
          {form.nodeType === 'delay' && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Wait</label>
                <input
                  type="number"
                  min={1}
                  value={form.delayValue}
                  onChange={e => set('delayValue', Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1 mt-4">
                <select
                  value={form.delayUnit}
                  onChange={e => set('delayUnit', e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Subflow node ── */}
          {form.nodeType === 'subflow' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference Flow</label>
              <select
                value={form.referencedFlowId}
                onChange={e => set('referencedFlowId', e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a flow…</option>
                {flows.map(f => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400">Flow will jump into this sub-flow and not return.</p>
            </div>
          )}

          {/* ── End node ── */}
          {form.nodeType === 'end' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={e => set('label', e.target.value)}
                placeholder="End"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          </div>
          <div className="flex lg:w-[340px] shrink-0 flex-col border-t lg:border-t-0 lg:border-l border-slate-100 bg-[#efeae2] overflow-y-auto h-72 lg:h-auto">
            <WhatsAppPreview form={form} nameRiskActive={nameRiskActive} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#137fec] text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Save Node
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
