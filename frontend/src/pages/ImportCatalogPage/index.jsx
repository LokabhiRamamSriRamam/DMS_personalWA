import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { treatments, diagnoses, findings } from '../../data/dentalCatalog/index.js';
import CatalogImporter from './CatalogImporter.jsx';

const TABS = [
  {
    id: 'treatments',
    label: 'Treatments',
    count: treatments.length,
    endpoint: '/suggested-treatments',
    sourceData: treatments,
    description: 'Procedures and services your clinic offers — import to use them in treatment plans and invoices.',
  },
  {
    id: 'diagnoses',
    label: 'Diagnoses',
    count: diagnoses.length,
    endpoint: '/diagnoses',
    sourceData: diagnoses,
    description: 'ICD-10 coded dental diagnoses — import to record findings for each patient visit.',
  },
  {
    id: 'findings',
    label: 'Clinical Findings',
    count: findings.length,
    endpoint: '/clinical-findings',
    sourceData: findings,
    description: 'Clinical observations recorded during examination — import to speed up charting.',
  },
];

export default function ImportCatalogPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('treatments');
  const tab = TABS.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-xl text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#137fec]/10 rounded-xl">
              <BookOpen size={20} className="text-[#137fec]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Import from Dental Library</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pick from our curated starter catalog. Edit any item before importing.
              </p>
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-none">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-3.5 font-semibold text-sm transition-all whitespace-nowrap ${
                  activeTab === t.id
                    ? 'text-[#137fec] border-b-2 border-[#137fec]'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {t.label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === t.id ? 'bg-[#137fec]/10 text-[#137fec]' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab description */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">{tab.description}</p>
          </div>

          {/* Content */}
          <div className="px-5 pb-6">
            <CatalogImporter
              key={activeTab}
              type={activeTab}
              sourceData={tab.sourceData}
              endpoint={tab.endpoint}
              onImportDone={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
