import React, { useState } from 'react';
import { 
  Search, Calendar, ChevronDown, Upload, FileText, 
  ArrowUpRight, Wallet, Building2, 
  Printer
} from 'lucide-react';

const TransactionsPage = () => {
  const [activeTab, setActiveTab] = useState('Statement');
  
  // Filter States
  const [dateFilterLabel, setDateFilterLabel] = useState('This Month'); // Controls the button text
  const [customRange, setCustomRange] = useState({ start: null, end: null }); // Stores actual custom dates
  
  // UI States
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  // Temporary states for the custom input form
  const [tempStart, setTempStart] = useState('');
  const [tempEnd, setTempEnd] = useState('');

  // Helper: Format Date for Display (DD Mon YYYY)
  const getFormattedDate = (dateObj) => {
    return dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // --- MOCK DATA ---
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const allTransactions = [
    { id: 'TXN-8821', date: getFormattedDate(today), party: 'Avtansh (Patient)', type: 'Income', category: 'Treatment', method: 'Cash', amount: 5000, status: 'Success' },
    { id: 'TXN-8822', date: getFormattedDate(yesterday), party: 'Dental Depot', type: 'Expense', category: 'Supplies', method: 'Bank Transfer', amount: 12000, status: 'Success' },
    { id: 'TXN-8823', date: '23 Dec 2025', party: 'Alok (Patient)', type: 'Income', category: 'Consultation', method: 'UPI', amount: 800, status: 'Success' },
    { id: 'TXN-8824', date: '22 Dec 2025', party: 'City Lab', type: 'Expense', category: 'Lab Work', method: 'Card', amount: 4500, status: 'Pending' },
    { id: 'TXN-8825', date: '01 Dec 2025', party: 'Rahul (Patient)', type: 'Income', category: 'X-Ray', method: 'Cash', amount: 1500, status: 'Success' },
    { id: 'TXN-8826', date: '15 Nov 2025', party: 'Old Patient', type: 'Income', category: 'Cleaning', method: 'Cash', amount: 2000, status: 'Success' },
  ];

  // --- FILTER LOGIC ---
  const filteredTransactions = allTransactions.filter(txn => {
    // 1. Tab Filter
    if (activeTab !== 'Statement' && txn.type !== activeTab) return false;
    
    // 2. Date Filter
    const txnDate = new Date(txn.date);
    const currentDate = new Date();
    
    // Normalize times to 00:00:00 for accurate day comparison
    txnDate.setHours(0,0,0,0);
    currentDate.setHours(0,0,0,0);

    // -- Preset Logic --
    if (dateFilterLabel === 'Today') {
      return txnDate.getTime() === currentDate.getTime();
    }
    if (dateFilterLabel === 'Yesterday') {
      const yDay = new Date(currentDate);
      yDay.setDate(yDay.getDate() - 1);
      return txnDate.getTime() === yDay.getTime();
    }
    if (dateFilterLabel === 'This Week') {
      const firstDayOfWeek = new Date(currentDate);
      const day = currentDate.getDay(); 
      const diff = currentDate.getDate() - day; 
      firstDayOfWeek.setDate(diff);
      firstDayOfWeek.setHours(0,0,0,0);
      return txnDate >= firstDayOfWeek && txnDate <= currentDate;
    }
    if (dateFilterLabel === 'This Month') {
      return (
        txnDate.getMonth() === currentDate.getMonth() &&
        txnDate.getFullYear() === currentDate.getFullYear()
      );
    }

    // -- Custom Range Logic --
    // If the label is NOT a preset, we assume it's a custom range
    if (!['Today', 'Yesterday', 'This Week', 'This Month'].includes(dateFilterLabel)) {
       if (!customRange.start) return true; // Should not happen if logic is correct

       const startDate = new Date(customRange.start);
       startDate.setHours(0,0,0,0);

       // Case A: Start Date Only (From X onwards)
       if (!customRange.end) {
         return txnDate >= startDate;
       }

       // Case B: Start and End Date (Range)
       const endDate = new Date(customRange.end);
       endDate.setHours(0,0,0,0);
       return txnDate >= startDate && txnDate <= endDate;
    }

    return true;
  });

  const totalAmount = filteredTransactions.reduce((acc, curr) => 
    curr.type === 'Income' ? acc + curr.amount : acc - curr.amount
  , 0);

  // --- HANDLERS ---
  
  // Handle Preset Clicks
  const handlePresetSelect = (option) => {
    if (option === 'Custom') {
      setShowCustomInput(true);
    } else {
      setDateFilterLabel(option);
      setCustomRange({ start: null, end: null }); // Reset custom range
      setShowDateMenu(false);
      setShowCustomInput(false);
    }
  };

  // Handle "Apply" in Custom View
  const handleApplyCustom = () => {
    if (!tempStart) return; // Validation: Start date required

    const startDateObj = new Date(tempStart);
    const formattedStart = getFormattedDate(startDateObj);
    let label = '';

    if (tempEnd) {
      const endDateObj = new Date(tempEnd);
      const formattedEnd = getFormattedDate(endDateObj);
      // Logic: Range
      setCustomRange({ start: tempStart, end: tempEnd });
      label = `${formattedStart} - ${formattedEnd}`;
    } else {
      // Logic: From Start Date onwards
      setCustomRange({ start: tempStart, end: null });
      label = `From ${formattedStart}`;
    }

    setDateFilterLabel(label);
    setShowDateMenu(false);
    setShowCustomInput(false);
  };

  return (
      <div className="flex flex-col h-full relative">
        
        {/* KPI Cards (Unchanged) */}
        <div className="pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="p-4 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-500"><ArrowUpRight size={28} /></div>
              <div>
                <p className="text-slate-500 text-sm font-large">Transactions</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{filteredTransactions.length}</h3>
                  <span className="text-xs text-slate-400">Nos</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600"><Wallet size={28} /></div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Net Amount</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">₹{totalAmount.toLocaleString()}</h3>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600"><FileText size={28} /></div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Cash</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">₹6,500</h3>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600"><Building2 size={28} /></div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Bank</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">₹0</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Title & Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-6 md:px-8 pt-6 pb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Transactions</h1>
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex text-sm font-medium w-fit">
                {['Statement', 'Income', 'Expense'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-md transition-all duration-300 ${
                      activeTab === tab
                        ? 'bg-white dark:bg-[#137fec] text-[#137fec] dark:text-white shadow-sm font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {activeTab === 'Statement' && tab === 'Statement' ? 'Account Statement' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* --- DATE FILTER DROPDOWN --- */}
            <div className="relative self-end xl:self-auto">
              <button 
                onClick={() => {
                  setShowDateMenu(!showDateMenu);
                  setShowCustomInput(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-sm hover:border-[#137fec] transition-colors min-w-[200px] justify-between shadow-sm"
              >
                <span className="flex items-center gap-2 text-nowrap">
                  <Calendar size={18} className="text-[#137fec]" /> 
                  {dateFilterLabel.length > 25 ? dateFilterLabel.substring(0, 22) + '...' : dateFilterLabel}
                </span>
                <ChevronDown size={16} />
              </button>

              {showDateMenu && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  
                  {/* Custom Range Input View */}
                  {showCustomInput ? (
                    <div className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Custom Range</p>
                          <button 
                           onClick={() => setShowCustomInput(false)}
                           className="text-xs text-[#137fec] hover:underline"
                          >
                            Back
                          </button>
                        </div>

                        {/* Start Date */}
                        <div className="flex flex-col gap-1">
                           <label className="text-xs text-slate-600 dark:text-slate-400">From (Required)</label>
                           <input 
                            type="date" 
                            value={tempStart}
                            onChange={(e) => setTempStart(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:border-[#137fec]"
                           />
                        </div>

                        {/* End Date */}
                        <div className="flex flex-col gap-1">
                           <label className="text-xs text-slate-600 dark:text-slate-400">To (Optional)</label>
                           <input 
                            type="date" 
                            value={tempEnd}
                            onChange={(e) => setTempEnd(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:border-[#137fec]"
                           />
                        </div>

                        <button 
                          onClick={handleApplyCustom}
                          disabled={!tempStart}
                          className="mt-2 bg-[#137fec] hover:bg-blue-600 text-white text-sm py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Apply Filter
                        </button>
                    </div>
                  ) : (
                    /* Preset List View */
                    <div className="py-1">
                      {['Today', 'Yesterday', 'This Week', 'This Month', 'Custom'].map((option) => (
                        <button
                          key={option}
                          onClick={() => handlePresetSelect(option)}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0 flex justify-between items-center"
                        >
                          {option}
                          {option === 'Custom' && <span className="text-xs text-slate-400">Select Range...</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>

        {/* Table Area (Unchanged) */}
        <div className="flex-1 overflow-auto px-6 md:px-8 pb-8">
          <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F7F2F2] dark:bg-slate-800/50 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">No.</th>
                  <th className="py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">Party</th>
                  <th className="py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider">Mode</th>
                  <th className="py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="py-3 px-6 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((txn, index) => (
                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="py-4 px-6 text-sm text-slate-500">{index + 1}</td>
                      <td className="py-4 px-6 text-sm text-slate-700 dark:text-slate-300 font-medium">{txn.date}</td>
                      <td className="py-4 px-6 text-sm text-slate-900 dark:text-white font-semibold">{txn.party}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${txn.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">{txn.category}</td>
                      <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">{txn.method}</td>
                      <td className={`py-4 px-6 text-sm font-bold text-right ${txn.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.type === 'Income' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button className="p-2 text-slate-400 hover:text-[#137fec] transition-colors rounded-full hover:bg-blue-50">
                          <Printer size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                          <Search size={32} />
                        </div>
                        <p className="text-slate-500 font-medium">No Transactions Found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FABs (Unchanged) */}
        <div className="absolute bottom-8 right-8 flex flex-col gap-4 z-30 items-end">
          <div className="group flex items-center justify-end">
            <button className="flex items-center justify-center bg-[#137fec] hover:bg-blue-700 text-white h-12 w-12 group-hover:w-auto group-hover:px-4 rounded-full transition-all duration-300 shadow-lg overflow-hidden whitespace-nowrap">
              <Upload size={20} className="flex-shrink-0" />
              <span className="w-0 group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all duration-300 font-medium text-sm">Import CSV</span>
            </button>
          </div>
          <div className="group flex items-center justify-end">
            <button className="flex items-center justify-center bg-orange-100 dark:bg-card-dark border border-orange-400 dark:border-slate-700 text-orange-600 dark:text-white hover:border-orange-500 hover:text-orange-600 h-12 w-12 group-hover:w-auto group-hover:px-4 rounded-full transition-all duration-300 shadow-lg overflow-hidden whitespace-nowrap">
              <FileText size={20} className="flex-shrink-0" />
              <span className="w-0 group-hover:w-auto opacity-0 group-hover:opacity-100 transition-all duration-300 font-medium text-sm">Report</span>
            </button>
          </div>
        </div>

      </div>
  );
};

export default TransactionsPage;