import React from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { DENTAL_CATEGORIES } from '../../data/dentalCatalog/index.js';

const CATEGORY_LABEL = Object.fromEntries(DENTAL_CATEGORIES.map(c => [c.id, c.label]));

export default function CatalogRow({ entry, type, isExisting, isSelected, isExpanded, editValues, onToggleSelect, onToggleExpand, onEdit }) {
  const values = editValues || entry;
  const isDuplicate = isExisting;

  return (
    <div className={`border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors ${isDuplicate ? 'opacity-50' : ''}`}>
      {/* Collapsed row */}
      <div
        className={`flex items-center gap-3 px-4 py-3 ${isDuplicate ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
        onClick={() => { if (!isDuplicate) onToggleExpand(); }}
      >
        {/* Checkbox */}
        <div onClick={e => { e.stopPropagation(); if (!isDuplicate) onToggleSelect(); }}>
          {isDuplicate ? (
            <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
              <Lock size={9} className="text-slate-400" />
            </div>
          ) : (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              onClick={e => e.stopPropagation()}
              className="w-4 h-4 rounded accent-[#137fec] cursor-pointer"
            />
          )}
        </div>

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-semibold ${isDuplicate ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>
            {values.name || entry.name}
          </span>
          <span className="ml-2 text-xs text-slate-400">{CATEGORY_LABEL[entry.category] || entry.category}</span>
          {isDuplicate && (
            <span className="ml-2 text-xs text-slate-400 italic">Already in your catalog</span>
          )}
        </div>

        {/* Cost (treatments only) */}
        {type === 'treatments' && (
          <span className={`text-sm font-bold tabular-nums ${isDuplicate ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            ₹{Number(values.cost ?? entry.default_cost).toLocaleString('en-IN')}
          </span>
        )}

        {/* Code (diagnoses only) */}
        {type === 'diagnoses' && (values.code || entry.code) && (
          <span className="text-xs font-mono text-slate-400">{values.code ?? entry.code}</span>
        )}

        {/* Expand toggle */}
        {!isDuplicate && (
          <span className="text-slate-400">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        )}
      </div>

      {/* Expanded editor */}
      {isExpanded && !isDuplicate && (
        <CatalogRowEditor
          entry={entry}
          type={type}
          values={values}
          onEdit={onEdit}
        />
      )}
    </div>
  );
}

function CatalogRowEditor({ entry, type, values, onEdit }) {
  const inputCls = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none';

  return (
    <div className="px-4 pb-4 pt-1 bg-blue-50/40 dark:bg-slate-700/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
          <input
            type="text"
            value={values.name ?? entry.name}
            onChange={e => onEdit('name', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Cost – treatments only */}
        {type === 'treatments' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Cost (₹)
              {entry.cost_range && (
                <span className="ml-2 font-normal text-slate-400 normal-case">
                  Typical: ₹{entry.cost_range.min.toLocaleString('en-IN')} – ₹{entry.cost_range.max.toLocaleString('en-IN')}
                </span>
              )}
            </label>
            <input
              type="number"
              min={0}
              value={values.cost ?? entry.default_cost}
              onChange={e => onEdit('cost', Number(e.target.value))}
              className={inputCls}
            />
          </div>
        )}

        {/* ICD Code – diagnoses only */}
        {type === 'diagnoses' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ICD Code (optional)</label>
            <input
              type="text"
              value={values.code ?? entry.code ?? ''}
              onChange={e => onEdit('code', e.target.value)}
              placeholder="e.g. K02.1"
              className={inputCls}
            />
          </div>
        )}

        {/* Description */}
        <div className={type === 'treatments' || type === 'diagnoses' ? '' : 'sm:col-span-2'}>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description (optional)</label>
          <textarea
            rows={2}
            value={values.description ?? entry.description ?? ''}
            onChange={e => onEdit('description', e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>
    </div>
  );
}
