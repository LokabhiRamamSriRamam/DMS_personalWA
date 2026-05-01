import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Banknote, Receipt, Stethoscope,
  Store, Users, Calendar, Microscope, Pill,
  RotateCcw, ShoppingCart, Download, Calendar as CalendarIcon,
  ChevronDown, TrendingUp
} from 'lucide-react';

import ReportSummary from '../components/ReportSummary.jsx';
import ReportFinancials from '../components/ReportFinancials.jsx';
import ReportClinical from '../components/ReportClinical.jsx';
import ReportPatients from '../components/ReportPatients.jsx';
import ReportInventory from '../components/ReportInventory.jsx';

// ── Date preset helpers ──────────────────────────────────────────────────────
function toIso(d) { return d.toISOString().slice(0, 10); }

function getPresets() {
  const today = new Date();
  const todayIso = toIso(today);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const last3 = new Date(today);
  last3.setMonth(last3.getMonth() - 3);

  const startOfYear = new Date(today.getFullYear(), 0, 1);

  return [
    { label: 'Today',         from: todayIso,           to: todayIso },
    { label: 'This Week',     from: toIso(startOfWeek), to: todayIso },
    { label: 'This Month',    from: toIso(startOfMonth),to: todayIso },
    { label: 'Last 3 Months', from: toIso(last3),       to: todayIso },
    { label: 'This Year',     from: toIso(startOfYear), to: todayIso },
  ];
}

const PRESETS = getPresets();

// ── Nav config ───────────────────────────────────────────────────────────────
const REPORTS_NAV = [
  { id: 'summary', label: 'Clinic Summary', icon: LayoutDashboard, component: ReportSummary },

  { type: 'divider', label: 'Financials' },
  { id: 'revenue',          label: 'Revenue Report',     icon: Banknote,     component: ReportFinancials },
  { id: 'expense',          label: 'Expense Report',     icon: Receipt,      component: ReportFinancials },
  { id: 'treatment_revenue',label: 'Treatment Revenue',  icon: TrendingUp,   component: ReportFinancials },
  { id: 'vendors',          label: 'Vendors Report',     icon: Store,        component: ReportFinancials },
  { id: 'med_orders',       label: 'Medicine Orders',    icon: ShoppingCart, component: ReportFinancials },

  { type: 'divider', label: 'Clinical & Staff' },
  { id: 'doctors', label: 'Doctor Report', icon: Stethoscope, component: ReportClinical },
  { id: 'lab',     label: 'Lab Works',     icon: Microscope,  component: ReportClinical },

  { type: 'divider', label: 'Patients' },
  { id: 'appointments', label: 'Appointment Report', icon: Calendar,   component: ReportPatients },
  { id: 'patients',     label: 'Patients Report',    icon: Users,      component: ReportPatients },
  { id: 'no_show',      label: 'No-Show Report',     icon: RotateCcw,  component: ReportPatients },
  { id: 'recall',       label: 'Recall Report',      icon: RotateCcw,  component: ReportPatients },

  { type: 'divider', label: 'Inventory' },
  { id: 'medicine', label: 'Medicine Stock', icon: Pill, component: ReportInventory },
];

// ── Main Page ────────────────────────────────────────────────────────────────
const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState('summary');
  const [dateLabel, setDateLabel]       = useState('This Month');
  const [dateRange, setDateRange]       = useState(() => {
    const p = PRESETS.find(p => p.label === 'This Month');
    return { from: p.from, to: p.to };
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectPreset(preset) {
    setDateLabel(preset.label);
    setDateRange({ from: preset.from, to: preset.to });
    setPickerOpen(false);
  }

  const activeItem = REPORTS_NAV.find(item => item.id === activeReport);
  const ActiveComponent = activeItem?.component || ReportSummary;

  const handleExport = () => {
    const filename = `${activeReport}_report_${dateRange.from}_to_${dateRange.to}.csv`;

    // Create CSV content based on report type
    let csvContent = `Report: ${activeItem?.label}\nPeriod: ${dateLabel} (${dateRange.from} to ${dateRange.to})\n\n`;

    // Add basic content with date and report info
    csvContent += `Generated on: ${new Date().toLocaleString('en-IN')}\n`;

    // Create a Blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Reports</h2>
          <p className="text-xs text-slate-500 mt-1">Analytics & Performance</p>
        </div>
        <nav className="p-3 space-y-1">
          {REPORTS_NAV.map((item, idx) => {
            if (item.type === 'divider') {
              return (
                <div key={idx} className="px-3 pt-5 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {item.label}
                </div>
              );
            }
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveReport(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeReport === item.id
                    ? 'bg-blue-50 text-[#137fec]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={activeReport === item.id ? 'text-[#137fec]' : 'text-slate-400'} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{activeItem?.label}</h1>
            <p className="text-sm text-slate-500">
              Overview for <span className="font-medium text-slate-700">{dateLabel}</span>
              <span className="ml-2 text-slate-400 text-xs">({dateRange.from} → {dateRange.to})</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date preset picker */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setPickerOpen(o => !o)}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all"
              >
                <CalendarIcon size={16} className="text-slate-500" />
                {dateLabel}
                <ChevronDown size={14} className="text-slate-400 ml-1" />
              </button>

              {pickerOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                  {PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => selectPreset(preset)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        dateLabel === preset.label
                          ? 'bg-blue-50 text-[#137fec] font-medium'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export button */}
            <button onClick={handleExport} className="flex items-center gap-2 bg-[#137fec] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all">
              <Download size={16} /> Export
            </button>
          </div>
        </header>

        {/* Report content */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            <ActiveComponent
              from={dateRange.from}
              to={dateRange.to}
              section={activeReport}
            />
          </div>
        </main>

      </div>
    </div>
  );
};

export default ReportsPage;
