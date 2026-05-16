import React, { useState, useRef, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import {
  TEMPLATE_VARIABLES,
  TEMPLATE_VARIABLE_LABELS,
  SAMPLE_DATA,
  variablesForEvent,
  replacePlaceholders,
  fetchTemplateVariables,
} from '../utils/templateVariables';
import { STARTER_TEMPLATES } from '../utils/emailStarterTemplates';

const EVENT_OPTIONS = [
  { value: 'appointmentBooked',    label: 'Appointment Booked' },
  { value: 'appointmentCompleted', label: 'Appointment Completed' },
  { value: 'invoiceGenerated',     label: 'Invoice Generated' },
  { value: 'aiReportReady',        label: 'AI Report Ready' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
];

export default function EmailTemplateEditorModal({ template, onClose, onSave }) {
  const [form, setForm] = useState({
    event:    template?.event    || 'appointmentBooked',
    language: template?.language || 'en',
    subject:  template?.subject  || '',
    body:     template?.body     || '',
    isActive: template?.isActive !== false,
  });
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState('body'); // which field the cursor is in

  // Variable catalog — fetched from backend, falls back to local statics
  const [catalog, setCatalog] = useState({
    events: TEMPLATE_VARIABLES,
    labels: TEMPLATE_VARIABLE_LABELS,
    sample: SAMPLE_DATA,
  });

  const subjectRef = useRef(null);
  const bodyRef    = useRef(null);

  useEffect(() => {
    let alive = true;
    fetchTemplateVariables().then(c => { if (alive) setCatalog(c); });
    return () => { alive = false; };
  }, []);

  const eventVars = catalog.events?.[form.event] || variablesForEvent(form.event);
  const sample    = catalog.sample || SAMPLE_DATA;
  const labels    = catalog.labels || TEMPLATE_VARIABLE_LABELS;

  const previewSubject = replacePlaceholders(form.subject, sample);
  const previewBody    = replacePlaceholders(form.body, sample);

  const starter = STARTER_TEMPLATES[form.event];

  function importStarter() {
    if (!starter) return;
    if (
      (form.subject.trim() || form.body.trim()) &&
      !window.confirm('Replace the current subject and body with the starter template?')
    ) return;
    setForm(f => ({ ...f, subject: starter.subject, body: starter.body }));
  }

  function insertVariable(varName) {
    const insertion = `{{${varName}}}`;
    const field = focused === 'subject' ? 'subject' : 'body';
    const el = field === 'subject' ? subjectRef.current : bodyRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const next  = form[field].slice(0, start) + insertion + form[field].slice(end);
    setForm(f => ({ ...f, [field]: next }));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 0);
  }

  async function handleSave() {
    if (!form.subject.trim() || !form.body.trim()) {
      alert('Subject and Body are required');
      return;
    }
    setSaving(true);
    try {
      await onSave(form, template?._id);
      onClose();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
            {template ? 'Edit Email Template' : 'New Email Template'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Event + Language */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Event</label>
              <select
                value={form.event}
                onChange={e => setForm(f => ({ ...f, event: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none"
              >
                {EVENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Language</label>
              <select
                value={form.language}
                onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none"
              >
                {LANGUAGE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Import starter */}
          {starter && (
            <div className="flex items-center justify-between gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Start from a ready-made template for <strong>{EVENT_OPTIONS.find(o => o.value === form.event)?.label}</strong>, then edit it to taste.
              </p>
              <button
                type="button"
                onClick={importStarter}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#137fec] hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Download size={13} /> Import starter
              </button>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              Set as active template for this event/language
            </label>
          </div>

          {/* Variable chips — event-aware */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">
              Insert Variable <span className="font-normal text-slate-400 normal-case">(for this event — click to insert at cursor in {focused === 'subject' ? 'Subject' : 'Body'})</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {eventVars.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  title={labels[v] || v}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-md text-xs font-mono border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Subject *</label>
            <input
              ref={subjectRef}
              type="text"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              onFocus={() => setFocused('subject')}
              placeholder="e.g., Your visit summary from {{doctor}} on {{date}}"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Body *</label>
            <textarea
              ref={bodyRef}
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              onFocus={() => setFocused('body')}
              placeholder="Hi {{first_name}}, please find your visit summary attached..."
              rows={8}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none resize-none font-mono"
            />
          </div>

          {/* Live preview */}
          {(form.subject || form.body) && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-500 uppercase">
                Preview
              </div>
              <div className="p-4 space-y-2">
                {form.subject && (
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    Subject: {previewSubject}
                  </p>
                )}
                {form.body && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {previewBody}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-300 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-[#137fec] hover:bg-blue-600 text-white font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
