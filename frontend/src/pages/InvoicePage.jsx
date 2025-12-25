import React, { useState } from 'react';
import { 
  Plus, Search, Calendar, Zap, MoreVertical, X, 
  User, Trash2, CreditCard, Banknote, ShieldCheck, 
  Printer, Edit3, Pill, CirclePlus, ChevronDown, Phone, CalendarDays
} from 'lucide-react';
import NavigationLayout from '../components/NavigationLayout';

const InvoicesPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('This Month');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [customDate, setCustomDate] = useState('');

  // Mock Invoice Data (Added 'pending' field)
  const invoices = [
    { id: 'INV-2023-089', patient: 'John Doe', avatar: 'JD', avatarColor: 'bg-orange-100 text-orange-600', date: 'Oct 24, 2023', service: 'Root Canal Treatment', amount: '$450.00', pending: '$0.00', status: 'Paid', statusColor: 'green' },
    { id: 'INV-2023-090', patient: 'Alice Smith', avatar: 'AS', avatarColor: 'bg-purple-100 text-purple-600', date: 'Oct 23, 2023', service: 'Dental Cleaning', amount: '$120.00', pending: '$120.00', status: 'Pending', statusColor: 'yellow' },
    { id: 'INV-2023-091', patient: 'Michael Key', avatar: 'MK', avatarColor: 'bg-blue-100 text-blue-600', date: 'Oct 22, 2023', service: 'Consultation', amount: '$80.00', pending: '$80.00', status: 'Overdue', statusColor: 'red' },
  ];

  // Helper for Status Styles
  const getStatusStyles = (status) => {
    const map = {
      'Paid': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Overdue': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  };

  const handleDateSelect = (option) => {
    setDateFilter(option);
    setShowDateMenu(false);
  };

  return (
      <div className="flex flex-col h-full overflow-hidden relative">
        
        {/* --- Header --- */}
        <header className="pb-6 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Invoices Management</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Manage patient billing, payments, and pharmacy records</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium">
                <Printer size={20} />
                Print Report
              </button>
              <button 
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#137fec] text-white rounded-lg hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all text-sm font-bold"
              >
                <Plus size={20} />
                New Invoice
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="mt-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 w-full gap-4 items-center">
              
              {/* Search */}
              <div className="relative flex-1 lg:max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] transition-all text-slate-900 dark:text-white" 
                  placeholder="Search invoice ID or patient name..." 
                  type="text"
                />
              </div>

              {/* Date Filter Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowDateMenu(!showDateMenu)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-sm hover:border-[#137fec] hover:text-[#137fec] transition-colors min-w-[160px] justify-between"
                >
                  <span className="flex items-center gap-2"><Calendar size={18} /> {dateFilter}</span>
                  <ChevronDown size={16} />
                </button>

                {/* Dropdown Menu */}
                {showDateMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                    {['Today', 'Yesterday', 'This Week', 'This Month', 'Custom Date'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleDateSelect(option)}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Date Input (Shows only if Custom Date is selected) */}
              {dateFilter === 'Custom Date' && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                  <input 
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-sm focus:border-[#137fec] focus:outline-none"
                  />
                </div>
              )}

            </div>
          </div>
        </header>

        {/* --- Content Table Area --- */}
        <div className="flex-1 overflow-auto relative z-0">
          <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4 w-16">
                    <input className="rounded border-slate-300 text-[#137fec] focus:ring-[#137fec] h-4 w-4" type="checkbox"/>
                  </th>
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Main Service</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Pending Amount</th> {/* New Column */}
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {invoices.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <input className="rounded border-slate-300 text-[#137fec] focus:ring-[#137fec] h-4 w-4" type="checkbox"/>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#137fec] cursor-pointer hover:underline">{inv.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full ${inv.avatarColor} flex items-center justify-center text-xs font-bold`}>{inv.avatar}</div>
                        <span className="text-slate-900 dark:text-white font-medium">{inv.patient}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{inv.date}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{inv.service}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">{inv.amount}</td>
                    
                    {/* Pending Amount Logic */}
                    <td className={`px-6 py-4 text-right font-medium ${inv.pending === '$0.00' ? 'text-slate-400' : 'text-red-500'}`}>
                        {inv.pending}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-[#137fec] transition-colors p-1">
                        <Edit3 size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-card-dark">
              <p className="text-sm text-slate-500">Showing 1 to 3 of 124 results</p>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-sm rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">Previous</button>
                <button className="px-3 py-1 text-sm rounded border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* --- Add New Invoice Modal (Overlay) --- */}
        {showModal && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] z-30 transition-opacity flex justify-end">
            <div className="w-full max-w-2xl bg-white dark:bg-card-dark h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
              
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg text-[#137fec]">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Invoice</h2>
                    <p className="text-xs text-slate-500">Create a new bill for patient</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {/* Updated Patient Details Section */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 border-b pb-2">Patient Details</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Phone Number (PK) */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] text-slate-900 dark:text-white" 
                                placeholder="999-999-9999" 
                                type="tel"
                            />
                        </div>
                    </div>

                    {/* Patient Name */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Patient Name <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] text-slate-900 dark:text-white" 
                                placeholder="Full Name" 
                                type="text"
                            />
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Invoice Date</label>
                        <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] text-slate-900 dark:text-white" 
                                type="date"
                            />
                        </div>
                    </div>
                  </div>
                </div>

                {/* Services Table (Unchanged logic, just UI check) */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Treatment & Services</label>
                    <button className="text-[#137fec] text-xs font-bold hover:underline flex items-center gap-1">
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 font-semibold uppercase">
                        <tr>
                          <th className="px-4 py-2 w-[45%]">Item</th>
                          <th className="px-4 py-2 w-[15%] text-center">Qty</th>
                          <th className="px-4 py-2 w-[25%] text-right">Price</th>
                          <th className="px-4 py-2 w-[15%]"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        <tr>
                          <td className="px-4 py-3"><input className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 text-slate-900 dark:text-white font-medium placeholder-slate-400" type="text" defaultValue="Dental Consultation"/></td>
                          <td className="px-4 py-3"><input className="w-full bg-slate-50 dark:bg-slate-700 border-none rounded text-center py-1 text-sm focus:ring-0 text-slate-900 dark:text-white" type="number" defaultValue="1"/></td>
                          <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">$50.00</td>
                          <td className="px-4 py-3 text-right"><button className="text-slate-400 hover:text-red-500"><Trash2 size={18} /></button></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pharmacy Section */}
                <div className="mb-8 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Pill className="text-[#137fec]" size={20} />
                      <label className="block text-sm font-bold text-slate-800 dark:text-slate-100">Pharmacy & Prescriptions</label>
                    </div>
                    <button className="text-[#137fec] text-xs font-bold hover:underline flex items-center gap-1">
                      <CirclePlus size={14} /> Add Medicine
                    </button>
                  </div>
                  {/* Pharmacy Row 1 */}
                  <div className="flex gap-2 mb-2 items-start">
                    <div className="flex-1">
                      <input className="w-full border-slate-200 dark:border-slate-700 rounded-md text-sm py-1.5 focus:ring-[#137fec] focus:border-[#137fec] dark:bg-slate-800" placeholder="Medicine Name" type="text" defaultValue="Amoxicillin 500mg"/>
                      <p className="text-[10px] text-slate-500 mt-0.5 ml-1">Take 1 capsule every 8 hours</p>
                    </div>
                    <div className="w-20">
                      <input className="w-full border-slate-200 dark:border-slate-700 rounded-md text-sm py-1.5 text-center focus:ring-[#137fec] dark:bg-slate-800" placeholder="Qty" type="number" defaultValue="20"/>
                    </div>
                    <div className="w-24">
                      <input className="w-full border-slate-200 dark:border-slate-700 rounded-md text-sm py-1.5 text-right focus:ring-[#137fec] dark:bg-slate-800" placeholder="Price" type="text" defaultValue="$15.00"/>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                </div>

                {/* Summary & Totals */}
                <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-slate-700 pt-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                    <span className="font-semibold text-slate-900 dark:text-white">$65.00</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Tax (0%)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">$0.00</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                    <span className="text-base font-bold text-slate-900 dark:text-white">Total Payable</span>
                    <span className="text-xl font-black text-[#137fec]">$65.00</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Payment Method</label>
                  <div className="flex gap-3">
                    <label className="flex-1 cursor-pointer border-2 border-[#137fec] bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-center justify-center gap-2 transition-all">
                      <input defaultChecked className="sr-only" name="payment" type="radio"/>
                      <CreditCard className="text-[#137fec]" size={20} />
                      <span className="text-sm font-bold text-[#137fec]">Card</span>
                    </label>
                    <label className="flex-1 cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-lg p-3 flex items-center justify-center gap-2 transition-all">
                      <input className="sr-only" name="payment" type="radio"/>
                      <Banknote className="text-slate-500" size={20} />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Cash</span>
                    </label>
                    <label className="flex-1 cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-lg p-3 flex items-center justify-center gap-2 transition-all">
                      <input className="sr-only" name="payment" type="radio"/>
                      <ShieldCheck className="text-slate-500" size={20} />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Insurance</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Modal Footer (Updated) */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-end gap-4">
                
                {/* Amount Paid Input (Replaced Save Draft) */}
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Amount Paid</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                        <input 
                            type="number" 
                            className="w-full pl-7 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <button className="flex-[2] py-2.5 px-4 rounded-lg bg-[#137fec] hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 h-[46px]">
                  {/* Assuming check icon is desired here */}
                  Generate Invoice
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
  );
};

export default InvoicesPage;