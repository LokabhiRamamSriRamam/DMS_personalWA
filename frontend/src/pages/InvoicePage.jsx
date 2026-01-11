import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, X, User, Trash2, CreditCard, 
  Printer, Edit3, Pill, Phone, Eye, Mail, 
  Share2, Loader2, Stethoscope
} from 'lucide-react';
import API from '../services/api';

// --- COMPONENT: LIVE PATIENT SEARCH ---
const PatientSearchInput = ({ onSelect, onAddNew }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Debounce logic: Only search 300ms after user stops typing
    const delaySearch = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        try {
          // Assuming GET /patients returns a list. 
          // In a real app, use GET /patients?search=${query} for server-side filtering
          const { data } = await API.get('/patients');
          
          const filtered = data.filter(p => 
             p.phone.includes(query) || 
             p.first_name.toLowerCase().includes(query.toLowerCase()) ||
             (p.last_name && p.last_name.toLowerCase().includes(query.toLowerCase()))
          );
          
          setResults(filtered);
          setShowDropdown(true);
        } catch (err) {
          console.error("Search failed", err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [query]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <input 
          autoFocus
          type="text" 
          placeholder="Search Name or Phone..." 
          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && setShowDropdown(true)}
          // Delay blur to allow clicking the dropdown items
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)} 
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </div>
      </div>

      {/* DROPDOWN RESULTS */}
      {showDropdown && (
        <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {results.length > 0 ? (
            results.map(patient => (
              <div 
                key={patient._id} 
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group"
                onClick={() => {
                  onSelect(patient);
                  setQuery(patient.phone); // Set input to phone after selection
                  setShowDropdown(false);
                }}
              >
                <div className="flex justify-between items-center">
                    <div>
                        <div className="font-bold text-slate-800 group-hover:text-[#137fec]">{patient.first_name} {patient.last_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1"><Phone size={10}/> {patient.phone}</div>
                    </div>
                    <div className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {patient.age}Y / {patient.gender.charAt(0)}
                    </div>
                </div>
              </div>
            ))
          ) : (
            // NO RESULTS FOUND -> OPTION TO CREATE
            <div 
                className="p-3 text-center cursor-pointer hover:bg-slate-50 text-blue-600 font-bold text-sm"
                onClick={() => {
                    onAddNew(query); // Pass the typed number to the modal
                    setShowDropdown(false);
                }}
            >
                <div className="flex items-center justify-center gap-2">
                    <Plus size={16}/> Create new patient "{query}"
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- GENERIC SEARCHABLE SELECT (For Services/Meds) ---
const SearchableSelect = ({ placeholder, type, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (query.length > 1) {
      const delay = setTimeout(async () => {
        try {
          let endpoint = type === 'Pharmacy' ? '/inventory' : '/services';
          const { data } = await API.get(endpoint);
          
          const filtered = data.filter(item => {
             if (type === 'Pharmacy') return item.type === 'Pharmacy' && item.name.toLowerCase().includes(query.toLowerCase());
             return item.name.toLowerCase().includes(query.toLowerCase());
          });
          setResults(filtered);
          setShowDropdown(true);
        } catch (e) { console.error(e); }
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [query, type]);

  return (
    <div className="relative flex-1">
      <input 
        className="w-full border-slate-200 rounded-md text-sm py-1.5 focus:ring-[#137fec] focus:border-[#137fec]" 
        placeholder={placeholder}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-md shadow-xl mt-1 max-h-40 overflow-auto">
          {results.map(item => (
            <div 
              key={item._id} 
              className="p-2 hover:bg-slate-50 cursor-pointer text-sm flex justify-between items-center"
              onClick={() => {
                onSelect(item);
                setQuery(item.name);
                setShowDropdown(false);
              }}
            >
              <div>
                  <div className="font-medium">{item.name}</div>
                  {type === 'Pharmacy' && <div className="text-[10px] text-slate-400">Stock: {item.stock_on_hand}</div>}
              </div>
              <div className="text-right">
                  <span className="text-[#137fec] font-bold text-xs">₹{type === 'Pharmacy' ? item.selling_price : item.cost}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- QUICK ADD PATIENT MODAL ---
const QuickAddPatientModal = ({ phone, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('Male');

    const handleSave = async () => {
        try {
            const { data } = await API.post('/patients', { 
                first_name: name.split(' ')[0], 
                last_name: name.split(' ')[1] || '',
                phone, age, gender 
            });
            onSave(data);
        } catch (err) { alert("Failed to create patient"); }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-slate-200">
                <h3 className="font-bold text-lg mb-4 text-slate-800">New Patient Found</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                        <input disabled value={phone} className="w-full border p-2 rounded bg-slate-100 text-slate-500 text-sm"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                        <input autoFocus value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded focus:ring-[#137fec] outline-none text-sm"/>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Age</label>
                            <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full border p-2 rounded focus:ring-[#137fec] outline-none text-sm"/>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full border p-2 rounded focus:ring-[#137fec] outline-none text-sm bg-white">
                                <option>Male</option><option>Female</option><option>Other</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={handleSave} className="w-full bg-[#137fec] text-white py-2 rounded-lg font-bold mt-2 hover:bg-blue-600 transition-colors">Create Patient</button>
                    <button onClick={onClose} className="w-full text-slate-400 text-xs hover:text-slate-600 mt-2">Cancel</button>
                </div>
            </div>
        </div>
    );
};

// --- VIEW INVOICE MODAL ---
const ViewInvoiceModal = ({ invoice, onClose }) => {
  if (!invoice) return null;
  const handlePrint = () => window.print();
  const handleShareWhatsApp = () => {
    const message = `Hello ${invoice.patient_name}, here is your invoice #${invoice.invoice_id} for ₹${invoice.total_amount}.`;
    window.open(`https://wa.me/${invoice.patient_phone}?text=${encodeURIComponent(message)}`, '_blank');
  };
  const handleShareMail = () => {
    const subject = `Invoice ${invoice.invoice_id}`;
    const body = `Dear ${invoice.patient_name},\n\nAttached invoice details.\nTotal: ₹${invoice.total_amount}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-800">Invoice #{invoice.invoice_id}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${invoice.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{invoice.status}</span>
            </div>
            <div className="flex gap-2">
                <button onClick={handleShareWhatsApp} className="p-2 hover:bg-green-50 text-slate-600 hover:text-green-600 rounded-lg transition-all" title="WhatsApp"><Share2 size={18}/></button>
                <button onClick={handleShareMail} className="p-2 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-all" title="Email"><Mail size={18}/></button>
                <button onClick={handlePrint} className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-all" title="Print"><Printer size={18}/></button>
                <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all ml-2"><X size={20}/></button>
            </div>
        </div>
        <div className="p-8 overflow-y-auto print:p-0">
            <div className="flex justify-between mb-8">
                <div><h1 className="text-2xl font-bold text-[#137fec]">Dental Clinic</h1><p className="text-slate-500 text-sm">123 Health Street</p></div>
                <div className="text-right"><p className="text-sm text-slate-500">Invoice Date</p><p className="font-medium text-slate-800">{new Date(invoice.date).toLocaleDateString()}</p></div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg mb-8 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Bill To</p>
                <p className="text-lg font-bold text-slate-800">{invoice.patient_name}</p>
                <p className="text-slate-500 text-sm">{invoice.patient_phone}</p>
            </div>
            <table className="w-full text-left mb-8 text-sm">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-xs">
                    <tr><th className="p-3">Item</th><th className="p-3 text-center">Qty</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item, idx) => (
                        <tr key={idx}>
                            <td className="p-3"><div className="font-medium text-slate-800">{item.name}</div><div className="text-xs text-slate-400">{item.type}</div></td>
                            <td className="p-3 text-center text-slate-600">{item.quantity}</td>
                            <td className="p-3 text-right text-slate-600">₹{item.rate}</td>
                            <td className="p-3 text-right font-bold text-slate-800">₹{item.total}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex justify-end"><div className="w-64 space-y-2"><div className="flex justify-between font-bold text-lg text-slate-800"><span>Total</span><span>₹{invoice.total_amount}</span></div><div className="flex justify-between text-sm text-green-600 font-medium"><span>Paid</span><span>-₹{invoice.paid_amount}</span></div>{invoice.pending_amount > 0 && <div className="flex justify-between text-sm text-red-600 font-bold bg-red-50 p-2 rounded"><span>Due</span><span>₹{invoice.pending_amount}</span></div>}</div></div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  
  // Patient Entry State
  const [patientSearchQuery, setPatientSearchQuery] = useState(''); // Holds typed number for modal
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);

  const [newInv, setNewInv] = useState({
    patientName: '', phone: '', patientId: null,
    date: new Date().toISOString().split('T')[0], items: [], paymentMethod: 'Cash', amountPaid: ''
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
        const { data } = await API.get('/invoices');
        setInvoices(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, []);

  // --- HANDLER: PATIENT SELECTED FROM DROPDOWN ---
  const handlePatientSelect = (patient) => {
      setNewInv(prev => ({ 
          ...prev, 
          patientName: `${patient.first_name} ${patient.last_name}`, 
          phone: patient.phone,
          patientId: patient._id
      }));
  };

  // --- HANDLER: PATIENT NOT FOUND -> CREATE ---
  const handleAddNewPatient = (query) => {
      setPatientSearchQuery(query); // Pass what user typed to the modal
      setShowAddPatientModal(true);
  };

  const handlePatientCreated = (newPatient) => {
      setShowAddPatientModal(false);
      handlePatientSelect(newPatient); // Select the newly created patient
  };

  // Item Handlers
  const addItem = (type) => setNewInv({...newInv, items: [...newInv.items, { name: '', type, quantity: 1, rate: 0, total: 0, itemId: null }]});
  const updateItem = (index, field, value) => {
    const updated = [...newInv.items];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'rate') updated[index].total = Number(updated[index].quantity) * Number(updated[index].rate);
    setNewInv({ ...newInv, items: updated });
  };
  const removeItem = (index) => setNewInv({ ...newInv, items: newInv.items.filter((_, i) => i !== index) });
  const calculateTotals = () => {
    const subtotal = newInv.items.reduce((acc, item) => acc + item.total, 0);
    return { subtotal, total: subtotal };
  };

  const handleSubmitInvoice = async () => {
    const totals = calculateTotals();
    const paid = Number(newInv.amountPaid) || 0;
    const payload = {
        patient_name: newInv.patientName, patient_phone: newInv.phone, patient_id: newInv.patientId,
        date: newInv.date, items: newInv.items.map(i => ({ name: i.name, type: i.type, quantity: i.quantity, rate: i.rate, total: i.total, item_id: i.itemId })),
        subtotal: totals.subtotal, total_amount: totals.total, paid_amount: paid, payment_method: newInv.paymentMethod
    };
    try {
        await API.post('/invoices', payload);
        setShowCreateModal(false);
        setNewInv({ patientName: '', phone: '', date: new Date().toISOString().split('T')[0], items: [], paymentMethod: 'Cash', amountPaid: '' });
        fetchInvoices();
    } catch (err) { alert("Error creating invoice"); }
  };

  if(loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400"/></div>;

  return (
      <div className="flex flex-col h-full overflow-hidden relative">
        <header className="pb-6 bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div><h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices</h1><p className="text-slate-500 mt-1">Manage billing</p></div>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#137fec] text-white rounded-lg hover:bg-blue-600 shadow-lg text-sm font-bold"><Plus size={20} /> New Invoice</button>
          </div>
        </header>

        <div className="flex-1 overflow-auto relative z-0 mt-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Patient</th><th className="px-6 py-4">Date</th><th className="px-6 py-4 text-right">Total</th><th className="px-6 py-4 text-right">Pending</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#137fec]">{inv.invoice_id}</td>
                    <td className="px-6 py-4"><div className="font-bold text-slate-800">{inv.patient_name}</div><div className="text-xs text-slate-500">{inv.patient_phone}</div></td>
                    <td className="px-6 py-4 text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">₹{inv.total_amount}</td>
                    <td className={`px-6 py-4 text-right font-bold ${inv.pending_amount > 0 ? 'text-red-500' : 'text-slate-300'}`}>{inv.pending_amount > 0 ? `₹${inv.pending_amount}` : '-'}</td>
                    <td className="px-6 py-4 text-center"><span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${inv.status === 'Paid' ? 'bg-green-100 text-green-800' : inv.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{inv.status}</span></td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => setViewInvoice(inv)} className="text-slate-400 hover:text-blue-600 p-1 flex items-center gap-1 font-medium text-xs border rounded px-2"><Eye size={14} /> View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ViewInvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />

        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50"><h2 className="text-lg font-bold text-slate-900">New Invoice</h2><button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={24} /></button></div>
              <div className="flex-1 overflow-y-auto p-6">
                
                {/* 1. Patient Search (Replaced old manual input with Live Search) */}
                <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                   <div className="flex gap-4 items-end">
                       <div className="flex-1">
                           <label className="text-xs font-bold text-slate-500 uppercase">Patient Search</label>
                           <div className="mt-1">
                               <PatientSearchInput 
                                   onSelect={handlePatientSelect} 
                                   onAddNew={handleAddNewPatient} 
                               />
                           </div>
                       </div>
                       <div className="flex-[1.5]">
                           <label className="text-xs font-bold text-slate-500 uppercase">Selected Patient</label>
                           <div className="flex gap-3 mt-1">
                               <input disabled type="text" className="flex-1 border p-2 rounded text-sm bg-slate-100 font-bold text-slate-700" value={newInv.patientName} placeholder="Name" />
                               <input disabled type="text" className="w-32 border p-2 rounded text-sm bg-slate-100 text-slate-500" value={newInv.phone} placeholder="Phone" />
                           </div>
                       </div>
                   </div>
                   <div className="mt-3"><label className="text-xs font-bold text-slate-500 uppercase">Invoice Date</label><input type="date" className="w-full border p-2 rounded mt-1 text-sm border-slate-300" value={newInv.date} onChange={e => setNewInv({...newInv, date: e.target.value})} /></div>
                </div>

                {/* 2. Items */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold text-slate-700">Bill Items</label><div className="flex gap-2"><button onClick={() => addItem('Service')} className="text-xs flex items-center gap-1 text-slate-600 hover:text-blue-600 font-bold border px-2 py-1 rounded"><Stethoscope size={12}/> Service</button><button onClick={() => addItem('Pharmacy')} className="text-xs flex items-center gap-1 text-slate-600 hover:text-blue-600 font-bold border px-2 py-1 rounded"><Pill size={12}/> Medicine</button></div></div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        {newInv.items.map((item, idx) => (
                            <div key={idx} className="flex gap-2 p-2 border-b last:border-0 items-center">
                                <span className="text-xs w-8 text-slate-400 uppercase font-bold">{item.type === 'Pharmacy' ? 'MED' : 'SVC'}</span>
                                <SearchableSelect 
                                    type={item.type}
                                    placeholder={item.type === 'Pharmacy' ? "Search Medicine..." : "Search Service..."}
                                    onSelect={(data) => {
                                        const newData = [...newInv.items];
                                        newData[idx].name = data.name;
                                        newData[idx].itemId = data._id; 
                                        newData[idx].rate = item.type === 'Pharmacy' ? (data.selling_price || 0) : (data.cost || 0);
                                        newData[idx].total = newData[idx].rate * newData[idx].quantity;
                                        setNewInv({ ...newInv, items: newData });
                                    }}
                                />
                                <input type="number" className="w-16 border-slate-200 rounded-md text-sm py-1.5 text-center" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}/>
                                <input type="number" className="w-20 border-slate-200 rounded-md text-sm py-1.5 text-right" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)}/>
                                <span className="w-20 text-right font-bold text-sm text-slate-700">₹{item.total}</span>
                                <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Totals & Payment */}
                <div className="border-t pt-4">
                    <div className="flex justify-between mb-2"><span className="text-slate-500">Total Amount</span><span className="text-xl font-bold text-slate-900">₹{calculateTotals().total}</span></div>
                    <div className="mb-4"><label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label><select className="w-full border p-2 rounded mt-1 text-sm bg-white" value={newInv.paymentMethod} onChange={e => setNewInv({...newInv, paymentMethod: e.target.value})}><option>Cash</option><option>Card</option><option>Insurance</option><option>UPI</option></select></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Amount Paid Now</label><input type="number" className="w-full border p-2 rounded mt-1 text-lg font-bold text-green-700 border-green-200 bg-green-50" value={newInv.amountPaid} onChange={e => setNewInv({...newInv, amountPaid: e.target.value})} placeholder="0.00" /></div>
                </div>
              </div>
              <div className="p-6 border-t bg-slate-50"><button onClick={handleSubmitInvoice} className="w-full py-3 bg-[#137fec] hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg">Generate Invoice</button></div>
            </div>
          </div>
        )}

        {/* --- ADD PATIENT MODAL --- */}
        {showAddPatientModal && <QuickAddPatientModal phone={patientSearchQuery} onClose={() => setShowAddPatientModal(false)} onSave={handlePatientCreated}/>}
      </div>
  );
};

export default InvoicesPage;