import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import API from '../services/api';

const TAB_ENDPOINT = {
  findings:   '/clinical-findings',
  diagnoses:  '/diagnoses',
  treatments: '/suggested-treatments',
};

const TAB_LABEL = {
  findings:   'Clinical Finding',
  diagnoses:  'Diagnosis',
  treatments: 'Suggested Treatment',
};

export default function SingleClinicalItemModal({ tab, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', category: '', description: '', code: '', cost: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));
  const inputCls = 'w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        is_active: true,
        ...(tab === 'diagnoses'  && { code: form.code.trim() }),
        ...(tab === 'treatments' && { cost: parseFloat(form.cost) || 0 }),
      };
      await API.post(TAB_ENDPOINT[tab], payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-800 dark:text-white">Add {TAB_LABEL[tab]}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder={
                tab === 'findings'   ? 'e.g. Periodontal Pocket ≥ 5mm' :
                tab === 'diagnoses'  ? 'e.g. Irreversible Pulpitis' :
                'e.g. Root Canal Treatment – Molar'
              }
              className={inputCls}
            />
          </div>

          {/* Cost — treatments only */}
          {tab === 'treatments' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost (₹)</label>
              <input
                type="number"
                min={0}
                value={form.cost}
                onChange={e => set('cost', e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
          )}

          {/* ICD Code — diagnoses only */}
          {tab === 'diagnoses' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ICD Code (optional)</label>
              <input
                type="text"
                value={form.code}
                onChange={e => set('code', e.target.value)}
                placeholder="e.g. K04.0"
                className={inputCls}
              />
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category (optional)</label>
            <input
              type="text"
              value={form.category}
              onChange={e => set('category', e.target.value)}
              placeholder="e.g. Endodontic, Periodontal, Restorative…"
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description (optional)</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Brief clinical note…"
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#137fec] hover:bg-blue-600 text-white text-sm font-bold disabled:opacity-60 transition-colors"
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
