import React, { useState, useEffect } from 'react';
import api from '../services/api.js';

const TRIGGER_OPTIONS = [
  { value: 'first_message',           label: 'First Message from Customer' },
  { value: 'appointment_received',    label: 'Appointment Received (Online Booking)' },
  { value: 'appointment_booked',      label: 'Appointment Booked (Dashboard)' },
  { value: 'appointment_confirmed',   label: 'Appointment Confirmed' },
  { value: 'appointment_reminder',    label: 'Appointment Reminder' },
  { value: 'appointment_completed',   label: 'Appointment Completed' },
  { value: 'appointment_rescheduled', label: 'Appointment Rescheduled' },
  { value: 'treatment_completed',     label: 'Treatment Completed' },
  { value: 'post_treatment_care',     label: 'Post-Treatment Care' },
  { value: 'invoice_created',         label: 'Invoice Created' },
  { value: 'custom_keyword',          label: 'Custom Keyword' },
];

const DEFAULT = {
  name: '',
  description: '',
  triggerType: 'appointment_booked',
  treatmentName: '',
  reminderOffsetHours: 24,
  triggerKeywords: [],
};

export default function ChatbotFlowModal({ isOpen, onClose, onSave, flow }) {
  const [form, setForm]       = useState(DEFAULT);
  const [saving, setSaving]   = useState(false);
  const [kwInput, setKwInput] = useState('');
  const [error, setError]     = useState('');

  useEffect(() => {
    if (flow) {
      setForm({
        name:               flow.name || '',
        description:        flow.description || '',
        triggerType:        flow.triggerType || 'appointment_booked',
        treatmentName:      flow.treatmentName || '',
        reminderOffsetHours: flow.reminderOffsetHours ?? 24,
        triggerKeywords:    flow.triggerKeywords || [],
      });
    } else {
      setForm(DEFAULT);
    }
    setKwInput('');
  }, [flow, isOpen]);

  if (!isOpen) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function addKeyword() {
    const kw = kwInput.trim().toLowerCase();
    if (kw && !form.triggerKeywords.includes(kw)) {
      set('triggerKeywords', [...form.triggerKeywords, kw]);
    }
    setKwInput('');
  }

  async function handleSave() {
    setError('');
    if (!form.name.trim()) { setError('Flow name is required'); return; }
    if (form.triggerType === 'custom_keyword' && !form.triggerKeywords.length) {
      setError('Add at least one keyword for custom-keyword flows');
      return;
    }
    setSaving(true);
    try {
      let res;
      if (flow?._id) {
        res = await api.put(`/chatbot/flows/${flow._id}`, form);
      } else {
        res = await api.post('/chatbot/flows', form);
      }
      onSave(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save flow');
    } finally {
      setSaving(false);
    }
  }

  const needsTreatment = ['treatment_completed', 'post_treatment_care'].includes(form.triggerType);
  const needsReminder  = form.triggerType === 'appointment_reminder';
  const needsKeywords  = form.triggerType === 'custom_keyword';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{flow ? 'Edit Flow' : 'New Flow'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Flow Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Root Canal Follow-up"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="What this flow does…"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trigger Event</label>
            <select
              value={form.triggerType}
              onChange={e => set('triggerType', e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {TRIGGER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {needsTreatment && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Treatment Name</label>
              <input
                type="text"
                value={form.treatmentName}
                onChange={e => set('treatmentName', e.target.value)}
                placeholder="e.g. Root Canal (or leave blank to match all)"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400">Case-insensitive match against treatment name in visit records. Leave blank to fire for any treatment.</p>
            </div>
          )}

          {form.triggerType === 'post_treatment_care' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2.5">
              <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5 flex-shrink-0">tips_and_updates</span>
              <div className="flex flex-col gap-1.5 text-xs text-blue-900">
                <p className="font-semibold">How post-treatment care flows work:</p>
                <p className="text-blue-800 leading-relaxed">
                  After you save this flow, open the canvas and build a sequence using <strong>delay nodes</strong> between messages. For example:
                </p>
                <p className="font-mono text-[11px] bg-white/70 border border-blue-100 rounded px-2 py-1.5 leading-relaxed">
                  [Thank-you msg] → [Delay 2 days] → [Check-in msg] → [Delay 5 days] → [Follow-up msg] → [End]
                </p>
                <p className="text-blue-800 leading-relaxed">
                  When a doctor marks the matching treatment as <strong>Completed</strong> in the Visit screen, this flow fires automatically. Delays survive server restarts.
                </p>
              </div>
            </div>
          )}

          {needsReminder && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Send X hours before appointment</label>
              <input
                type="number"
                min={1}
                max={168}
                value={form.reminderOffsetHours}
                onChange={e => set('reminderOffsetHours', Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
              />
              <p className="text-xs text-slate-400">Default: 24 hours before appointment start time</p>
            </div>
          )}

          {needsKeywords && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Keywords</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={kwInput}
                  onChange={e => setKwInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  placeholder="Type keyword + Enter"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={addKeyword} className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-medium hover:bg-slate-200">Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.triggerKeywords.map((kw, i) => (
                  <span key={i} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs rounded-full px-2.5 py-1">
                    {kw}
                    <button onClick={() => set('triggerKeywords', form.triggerKeywords.filter((_, j) => j !== i))} className="hover:text-red-500">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Inline error */}
        {error && (
          <div className="mx-6 mb-3 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700">
            <span className="material-symbols-outlined text-[16px] mt-0.5 text-red-500">error</span>
            <p className="flex-1 leading-snug">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#137fec] text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Flow'}
          </button>
        </div>
      </div>
    </div>
  );
}
