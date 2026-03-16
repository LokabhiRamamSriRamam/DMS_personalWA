import React, { useState } from 'react';
import { 
  LayoutDashboard, Banknote, Receipt, Stethoscope, 
  Store, Users, Calendar, Microscope, Pill, 
  RotateCcw, ShoppingCart, Download, Calendar as CalendarIcon,
  ChevronDown, Filter
} from 'lucide-react';

// --- IMPORT THE 5 CONSOLIDATED COMPONENTS ---
import ReportSummary from '../components/ReportSummary';
import ReportFinancials from '../components/ReportFinancials';
import ReportClinical from '../components/ReportClinical';
import ReportPatients from '../components/ReportPatients';
import ReportInventory from '../components/ReportInventory';

const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState('summary');
  const [dateRange, setDateRange] = useState('This Month');

  // --- NAVIGATION CONFIGURATION ---
  // We map multiple specific sidebar items to the same consolidated component
  const REPORTS_NAV = [
    // 1. Dashboard
    { id: 'summary', label: 'Clinic Summary', icon: LayoutDashboard, component: ReportSummary },
    
    { type: 'divider', label: 'Financials' },
    // All these point to ReportFinancials
    { id: 'revenue', label: 'Revenue Report', icon: Banknote, component: ReportFinancials },
    { id: 'expense', label: 'Expense Report', icon: Receipt, component: ReportFinancials }, 
    { id: 'vendors', label: 'Vendors Report', icon: Store, component: ReportFinancials },
    { id: 'med_orders', label: 'Medicine Orders', icon: ShoppingCart, component: ReportFinancials }, 
    
    { type: 'divider', label: 'Clinical & Staff' },
    // All these point to ReportClinical
    { id: 'doctors', label: 'Doctor Report', icon: Stethoscope, component: ReportClinical },
    { id: 'lab', label: 'Lab Works', icon: Microscope, component: ReportClinical },
    
    { type: 'divider', label: 'Patients' },
    // All these point to ReportPatients
    { id: 'appointments', label: 'Appointment Report', icon: Calendar, component: ReportPatients },
    { id: 'patients', label: 'Patients Report', icon: Users, component: ReportPatients },
    { id: 'recall', label: 'Recall Report', icon: RotateCcw, component: ReportPatients },
    
    { type: 'divider', label: 'Inventory' },
    // Points to ReportInventory
    { id: 'medicine', label: 'Medicine Stock', icon: Pill, component: ReportInventory },
  ];

  // Find Active Component
  const activeItem = REPORTS_NAV.find(item => item.id === activeReport);
  // Fallback to Summary if not found
  const ActiveComponent = activeItem ? activeItem.component : ReportSummary;

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      
      {/* --- LEFT SIDEBAR --- */}
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

      {/* --- RIGHT CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header Toolbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{activeItem?.label}</h1>
            <p className="text-sm text-slate-500">Overview for <span className="font-medium text-slate-700">{dateRange}</span></p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Picker Mock */}
            <div className="relative">
              <button className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all">
                <CalendarIcon size={16} className="text-slate-500" />
                {dateRange}
                <ChevronDown size={14} className="text-slate-400 ml-1" />
              </button>
            </div>

            {/* Filter Button */}
            <button className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700">
               <Filter size={18} />
            </button>

            {/* Export Button */}
            <button className="flex items-center gap-2 bg-[#137fec] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all">
              <Download size={16} /> Export Report
            </button>
          </div>
        </header>

        {/* Scrollable Report Content */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto">
             {/* We pass 'activeReport' as a prop (e.g., 'expense', 'revenue').
                This allows the component to know WHICH specific section triggered it 
                if you want to auto-select a tab inside the component later.
             */}
             <ActiveComponent 
                dateRange={dateRange} 
                section={activeReport} 
             />
          </div>
        </main>

      </div>
    </div>
  );
};

export default ReportsPage;