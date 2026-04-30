import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const EVENT_OPTIONS = [
  { value: 'appointmentBooked',    label: 'Appointment Booked' },
  { value: 'appointmentReminder',  label: 'Appointment Reminder' },
  { value: 'appointmentRescheduled', label: 'Appointment Rescheduled' },
  { value: 'treatmentCompleted',   label: 'Treatment Completed' },
  { value: 'feedbackMessage',      label: 'Feedback Message' },
  { value: 'postCare',             label: 'Post-Care Journey' },
];

const VARIABLES = ['name', 'date', 'doctor', 'amount', 'invoiceId', 'treatment'];

const SAMPLE_DATA = {
  name:      'John Doe',
  date:      '23 Apr 2026',
  doctor:    'Dr. Sharma',
  amount:    '1500',
  invoiceId: 'INV-2026-001',
  treatment: 'Root Canal',
};

function renderPreview(body) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_DATA[key] ?? `{{${key}}}`);
}

export default function TemplateEditorModal({ isOpen, onClose, onSave, template, mediaList = [] }) {
  const [form, setForm] = useState({
    event:       'appointmentBooked',
    language:    'en',
    contentType: 'text',
    body:        '',
    mediaRef:    '',
    isActive:    true,
  });
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (template) {
      setForm({
        event:       template.event       || 'appointmentBooked',
        language:    template.language    || 'en',
        contentType: template.contentType || 'text',
        body:        template.body        || '',
        mediaRef:    template.mediaRef?._id || template.mediaRef || '',
        isActive:    template.isActive    ?? true,
      });
    } else {
      setForm({ event: 'appointmentBooked', language: 'en', contentType: 'text', body: '', mediaRef: '', isActive: true });
    }
  }, [template, isOpen]);

  if (!isOpen) return null;

  function insertVariable(varName) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end   = textarea.selectionEnd;
    const text  = form.body;
    const inserted = `{{${varName}}}`;
    const newBody = text.slice(0, start) + inserted + text.slice(end);
    setForm(f => ({ ...f, body: newBody }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + inserted.length, start + inserted.length);
    }, 0);
  }

  async function handleSave() {
    if (!form.body.trim()) return alert('Message body is required');
    setSaving(true);
    try {
      const payload = { ...form, mediaRef: form.mediaRef || undefined };
      let saved;
      if (template?._id) {
        const res = await api.put(`/whatsapp/templates/${template._id}`, payload);
        saved = res.data;
      } else {
        const res = await api.post('/whatsapp/templates', payload);
        saved = res.data;
      }
      onSave(saved);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  const previewText = renderPreview(form.body);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-[#1a2634] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {template ? 'Edit Template' : 'New Template'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 border-r border-slate-200 dark:border-slate-700">
            {/* Event */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Event</label>
              <select
                value={form.event}
                onChange={e => setForm(f => ({ ...f, event: e.target.value }))}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {EVENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Language</label>
              <div className="flex gap-2">
                {['en', 'hi'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setForm(f => ({ ...f, language: lang }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.language === lang
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {lang === 'en' ? 'English' : 'Hindi'}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content Type</label>
              <div className="flex gap-3">
                {['text', 'image', 'document'].map(ct => (
                  <label key={ct} className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="contentType"
                      value={ct}
                      checked={form.contentType === ct}
                      onChange={() => setForm(f => ({ ...f, contentType: ct }))}
                      className="accent-blue-600"
                    />
                    {ct.charAt(0).toUpperCase() + ct.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
              <textarea
                ref={textareaRef}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={5}
                placeholder="Type your message here..."
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {/* Variable inserter */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 self-center">Insert:</span>
                {VARIABLES.map(v => (
                  <button
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600 font-mono border border-slate-200 dark:border-slate-600"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Media picker (only when contentType is not text) */}
            {form.contentType !== 'text' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Attach Media</label>
                <select
                  value={form.mediaRef}
                  onChange={e => setForm(f => ({ ...f, mediaRef: e.target.value }))}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— No media —</option>
                  {mediaList.map(m => (
                    <option key={m._id} value={m._id}>{m.fileName}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Set as Active Template</span>
              <button
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="w-72 flex-shrink-0 flex flex-col bg-slate-50 dark:bg-slate-900">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Preview</p>
            </div>
            {/* WhatsApp-style chat background */}
            <div
              className="flex-1 p-4 overflow-y-auto"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.015) 10px, rgba(0,0,0,.015) 20px)' }}
            >
              {previewText ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-[#dcf8c6] dark:bg-[#005c4b] text-slate-900 dark:text-white text-sm rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm whitespace-pre-wrap">
                    {previewText}
                    <div className="text-right text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      <span className="ml-1">✓✓</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400 mt-8">Your message preview will appear here</p>
              )}
            </div>
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-slate-400">Sample values used for preview</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : (template ? 'Update Template' : 'Create Template')}
          </button>
        </div>
      </div>
    </div>
  );
}
