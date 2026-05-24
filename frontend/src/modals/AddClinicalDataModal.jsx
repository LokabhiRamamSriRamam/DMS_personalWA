import React from 'react';
import { X, BookOpen, Plus, Rows3, FileSpreadsheet } from 'lucide-react';

const TAB_META = {
  findings: {
    label: 'Clinical Findings',
    context: 'Clinical Findings are observations you record when examining a patient — things you see, probe, or measure. Examples: "Periodontal Pocket ≥ 5 mm", "Gingival Bleeding on Probing", "Extrinsic Staining".',
  },
  diagnoses: {
    label: 'Diagnoses',
    context: 'Diagnoses are confirmed clinical conclusions drawn from your findings. They can carry an ICD-10 code for insurance and reporting. Examples: "Chronic Periodontitis – Moderate (K05.3)", "Irreversible Pulpitis (K04.0)", "Dental Caries – Dentin (K02.1)".',
  },
  treatments: {
    label: 'Suggested Treatments',
    context: 'Suggested Treatments are your clinic\'s standard procedures with default costs. They appear as pick-list options when building treatment plans. Examples: "Root Canal Treatment – Molar ₹6,000", "Scaling & Polishing ₹1,200", "Zirconia Crown ₹9,000".',
  },
};

const OPTIONS = [
  {
    key: 'library',
    icon: BookOpen,
    iconBg: 'bg-violet-100 dark:bg-violet-900/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    title: 'Import from Library',
    badge: 'Recommended for new clinics',
    badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    bestFor: 'Just getting started',
    description: 'Browse our curated dental starter catalog. Search, filter, edit costs, and import in one click.',
    needs: 'Nothing — everything is pre-filled.',
  },
  {
    key: 'single',
    icon: Plus,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-[#137fec]',
    title: 'Add One',
    badge: 'Quick, ad-hoc',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    bestFor: 'A single item you need right now',
    description: 'Fill in a small form — name, cost, ICD code — and save. Done in under 30 seconds.',
    needs: 'The item name (and cost for treatments).',
  },
  {
    key: 'quick',
    icon: Rows3,
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    title: 'Quick Entry',
    badge: '5–20 items',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    bestFor: 'A small list you have in your head',
    description: 'An inline spreadsheet-style table opens on the page. Add rows, fill them in, save all at once.',
    needs: 'The list of item names (and costs if treatments).',
  },
  {
    key: 'bulk',
    icon: FileSpreadsheet,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Bulk Upload',
    badge: '50+ items or migration',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    bestFor: 'Migrating from another system or a large list',
    description: 'Upload a CSV / Excel file or paste a Google Sheets link. Row-level error report included.',
    needs: 'A spreadsheet with a "name" column (download the sample for the exact format).',
  },
];

export default function AddClinicalDataModal({ tab, onClose, onPickSingle, onPickQuickEntry, onPickBulkUpload, onPickLibrary }) {
  const meta = TAB_META[tab] || TAB_META.findings;

  const handlePick = (key) => {
    if (key === 'library')  { onPickLibrary();    return; }
    if (key === 'single')   { onPickSingle();     return; }
    if (key === 'quick')    { onPickQuickEntry(); return; }
    if (key === 'bulk')     { onPickBulkUpload(); return; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-lg text-slate-800 dark:text-white">Add {meta.label}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Context banner */}
          <div className="mx-6 mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{meta.context}</p>
          </div>

          {/* Option cards */}
          <div className="px-6 py-4 space-y-3">
            {OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => handlePick(opt.key)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#137fec] hover:bg-blue-50/40 dark:hover:bg-slate-800 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${opt.iconBg}`}>
                      <Icon size={18} className={opt.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-[#137fec] transition-colors">
                          {opt.title}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${opt.badgeColor}`}>
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Best for: {opt.bestFor}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-1">
                        {opt.description}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        You need: {opt.needs}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            All methods can be mixed — import from the library first, then add extras manually.
          </p>
        </div>
      </div>
    </div>
  );
}
