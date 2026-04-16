import { useState, useEffect } from 'react';
import { X, Trash2, Stethoscope, Pill, TestTube, Search, Loader2 } from 'lucide-react';
import API from '../services/api';

// ── Patient search (used when no initialPatient is provided) ──────────────────
const PatientSearchInput = ({ onSelect, onAddNew }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        try {
          const { data } = await API.get(`/patients?search=${encodeURIComponent(query)}`);
          setResults(Array.isArray(data) ? data : []);
          setShowDropdown(true);
        } catch { /* ignore */ } finally { setLoading(false); }
      } else { setResults([]); setShowDropdown(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          autoFocus
          type="text"
          placeholder="Search by name or phone..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </div>
      </div>
      {showDropdown && (
        <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-56 overflow-y-auto">
          {results.length > 0 ? results.map(p => (
            <div
              key={p._id}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
              onClick={() => { onSelect(p); setQuery(`${p.first_name} ${p.last_name || ''}`); setShowDropdown(false); }}
            >
              <div className="font-bold text-slate-800">{p.first_name} {p.last_name}</div>
              <div className="text-xs text-slate-500">{p.contact?.mobile || p.phone}</div>
            </div>
          )) : (
            <div
              className="p-3 text-center cursor-pointer hover:bg-slate-50 text-blue-600 font-bold text-sm"
              onClick={() => { onAddNew(query); setShowDropdown(false); }}
            >
              + Create new patient "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Searchable select for Services / Pharmacy items ───────────────────────────
const SearchableSelect = ({ placeholder, type, onSelect, initialValue = '' }) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => { setQuery(initialValue); }, [initialValue]);

  useEffect(() => {
    if (query.length > 1) {
      const t = setTimeout(async () => {
        try {
          const endpoint = type === 'Pharmacy' ? '/inventory' : '/services';
          const { data } = await API.get(endpoint);
          const filtered = data.filter(item =>
            type === 'Pharmacy'
              ? item.type === 'Pharmacy' && item.name.toLowerCase().includes(query.toLowerCase())
              : item.name.toLowerCase().includes(query.toLowerCase())
          );
          setResults(filtered);
          setShowDropdown(true);
        } catch { /* ignore */ }
      }, 300);
      return () => clearTimeout(t);
    } else { setResults([]); setShowDropdown(false); }
  }, [query, type]);

  return (
    <div className="relative flex-1">
      <input
        className="w-full border border-slate-200 rounded-md text-sm py-1.5 px-2 focus:outline-none focus:border-[#137fec]"
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
              onClick={() => { onSelect(item); setQuery(item.name); setShowDropdown(false); }}
            >
              <div>
                <div className="font-medium">{item.name}</div>
                {type === 'Pharmacy' && <div className="text-[10px] text-slate-400">Stock: {item.stock_on_hand}</div>}
              </div>
              <span className="text-[#137fec] font-bold text-xs">
                ₹{type === 'Pharmacy' ? item.selling_price : item.cost}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Quick add patient modal ───────────────────────────────────────────────────
const QuickAddPatientModal = ({ phone, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');

  const handleSave = async () => {
    try {
      const { data } = await API.post('/patients', {
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || '',
        contact: { mobile: phone },
        gender,
      });
      onSave(data);
    } catch { alert('Failed to create patient'); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm border border-slate-200">
        <h3 className="font-bold text-lg mb-4 text-slate-800">New Patient</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
            <input disabled value={phone} className="w-full border p-2 rounded bg-slate-100 text-slate-500 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#137fec]" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full border p-2 rounded text-sm bg-white focus:outline-none">
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <button onClick={handleSave} className="w-full bg-[#137fec] text-white py-2 rounded-lg font-bold hover:bg-blue-600">Create Patient</button>
          <button onClick={onClose} className="w-full text-slate-400 text-xs hover:text-slate-600">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Modal ────────────────────────────────────────────────────────────────
/**
 * Props:
 *   isOpen          — boolean
 *   onClose         — () => void
 *   onSuccess       — (invoice) => void
 *   initialPatient  — patient object (pre-selects patient, hides search)
 *   initialItems    — array of { name, type, quantity, rate, total, item_id,
 *                                _treatmentRef?, _prescriptionRef? }
 *   visitRefs       — { treatmentRefs: [{visitId,treatmentId}],
 *                       prescriptionRefs: [{visitId,prescriptionId}] }
 */
export default function NewInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  initialPatient = null,
  initialItems = null,
  visitRefs = null,
}) {
  const today = new Date().toISOString().split('T')[0];

  const [patientInfo, setPatientInfo] = useState({ name: '', phone: '', id: null });
  const [items, setItems] = useState([]);
  const [date, setDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [addPatientQuery, setAddPatientQuery] = useState('');

  // Reset & pre-fill when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setDate(today);
    setPaymentMethod('Cash');
    setAmountPaid('');
    setSubmitting(false);
    setAttempted(false);

    if (initialPatient) {
      setPatientInfo({
        name: `${initialPatient.first_name} ${initialPatient.last_name || ''}`.trim(),
        phone: initialPatient.contact?.mobile || '',
        id: initialPatient._id,
      });
    } else {
      setPatientInfo({ name: '', phone: '', id: null });
    }

    if (initialItems && initialItems.length > 0) {
      setItems(initialItems.map(it => ({
        name:               it.name || '',
        type:               it.type || 'Service',
        quantity:           it.quantity || 1,
        rate:               it.rate || 0,
        total:              it.total || 0,
        item_id:            it.item_id || null,
        _treatmentRef:      it._treatmentRef || null,
        _prescriptionRef:   it._prescriptionRef || null,
      })));
    } else {
      setItems([]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  // ── Item helpers ────────────────────────────────────────────────────────────
  const addItem = (type) =>
    setItems(prev => [...prev, { name: '', type, quantity: 1, rate: 0, total: 0, item_id: null, _treatmentRef: null, _prescriptionRef: null }]);

  const updateItem = (idx, field, value) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      if (field === 'quantity' || field === 'rate')
        updated.total = Number(updated.quantity) * Number(updated.rate);
      return updated;
    }));

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const subtotal = items.reduce((acc, it) => acc + (it.total || 0), 0);

  // ── Validation ──────────────────────────────────────────────────────────────
  const itemErrors = items.map(it => ({
    name:     !it.name?.trim(),
    rate:     !(Number(it.rate) > 0),
    quantity: !(Number(it.quantity) > 0),
  }));
  const hasItemErrors = itemErrors.some(e => e.name || e.rate || e.quantity);
  const isValid =
    !!patientInfo.id &&
    !!date &&
    items.length > 0 &&
    !hasItemErrors &&
    amountPaid !== '';

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setAttempted(true);
    if (!isValid) return;
    setSubmitting(true);
    try {
      const payload = {
        patient_name:   patientInfo.name,
        patient_phone:  patientInfo.phone,
        patient_id:     patientInfo.id,
        date,
        items: items.filter(it => it.name?.trim()).map(it => ({
          name:       it.name,
          type:       it.type,
          quantity:   it.quantity,
          rate:       it.rate,
          total:      it.total,
          item_id:    it.item_id,
        })),
        subtotal,
        total_amount:   subtotal,
        paid_amount:    Number(amountPaid) || 0,
        payment_method: paymentMethod,
      };

      const { data: newInvoice } = await API.post('/invoices', payload);

      // Mark treatments & prescriptions as invoiced
      const treatmentRefs = items.filter(it => it._treatmentRef).map(it => it._treatmentRef);
      const prescriptionRefs = items.filter(it => it._prescriptionRef).map(it => it._prescriptionRef);

      // Also include refs passed explicitly via visitRefs prop
      const allTreatmentRefs = [
        ...treatmentRefs,
        ...(visitRefs?.treatmentRefs || []),
      ];
      const allPrescriptionRefs = [
        ...prescriptionRefs,
        ...(visitRefs?.prescriptionRefs || []),
      ];

      if (allTreatmentRefs.length > 0 || allPrescriptionRefs.length > 0) {
        await API.post('/visits/mark-invoiced', {
          invoice_id:       newInvoice._id,
          treatment_refs:   allTreatmentRefs,
          prescription_refs: allPrescriptionRefs,
        });
      }

      onSuccess?.(newInvoice);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error creating invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const typeBadge = { Service: 'SVC', Pharmacy: 'MED', Lab: 'LAB' };
  const typeColor = {
    Service:  'text-blue-600',
    Pharmacy: 'text-green-600',
    Lab:      'text-purple-600',
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
        <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col">

          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h2 className="text-lg font-bold text-slate-900">New Invoice</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Patient */}
            <div className={`mb-6 p-4 rounded-xl border ${attempted && !patientInfo.id ? 'bg-red-50 border-red-200' : 'bg-blue-50/50 border-blue-100'}`}>
              {initialPatient ? (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Patient <span className="text-red-500">*</span></label>
                  <div className="flex gap-3 mt-1">
                    <input disabled className="flex-1 border p-2 rounded text-sm bg-slate-100 font-bold text-slate-700" value={patientInfo.name} />
                    <input disabled className="w-36 border p-2 rounded text-sm bg-slate-100 text-slate-500" value={patientInfo.phone} />
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Patient Search <span className="text-red-500">*</span></label>
                    <div className="mt-1">
                      <PatientSearchInput
                        onSelect={p => setPatientInfo({ name: `${p.first_name} ${p.last_name || ''}`.trim(), phone: p.contact?.mobile || p.phone || '', id: p._id })}
                        onAddNew={q => { setAddPatientQuery(q); setShowAddPatient(true); }}
                      />
                    </div>
                  </div>
                  <div className="flex-[1.5]">
                    <label className="text-xs font-bold text-slate-500 uppercase">Selected</label>
                    <div className="flex gap-2 mt-1">
                      <input disabled className="flex-1 border p-2 rounded text-sm bg-slate-100 font-bold text-slate-700" value={patientInfo.name} placeholder="Name" />
                      <input disabled className="w-32 border p-2 rounded text-sm bg-slate-100 text-slate-500" value={patientInfo.phone} placeholder="Phone" />
                    </div>
                  </div>
                </div>
              )}
              {attempted && !patientInfo.id && <p className="text-xs text-red-500 mt-1">Please select a patient.</p>}
              <div className="mt-3">
                <label className="text-xs font-bold text-slate-500 uppercase">Invoice Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className={`w-full border p-2 rounded mt-1 text-sm ${attempted && !date ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
                {attempted && !date && <p className="text-xs text-red-500 mt-1">Date is required.</p>}
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-700">Bill Items <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <button onClick={() => addItem('Service')} className="text-xs flex items-center gap-1 text-slate-600 hover:text-blue-600 font-bold border px-2 py-1 rounded">
                    <Stethoscope size={12} /> Service
                  </button>
                  <button onClick={() => addItem('Pharmacy')} className="text-xs flex items-center gap-1 text-slate-600 hover:text-green-600 font-bold border px-2 py-1 rounded">
                    <Pill size={12} /> Medicine
                  </button>
                  <button onClick={() => addItem('Lab')} className="text-xs flex items-center gap-1 text-slate-600 hover:text-purple-600 font-bold border px-2 py-1 rounded">
                    <TestTube size={12} /> Lab
                  </button>
                </div>
              </div>

              <div className={`bg-slate-50 border rounded-lg overflow-visible ${attempted && (items.length === 0 || hasItemErrors) ? 'border-red-300' : 'border-slate-200'}`}>
                {items.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    No items added. Use the buttons above to add Services, Medicines, or Lab charges.
                  </div>
                )}
                {items.map((item, idx) => {
                  const err = itemErrors[idx] || {};
                  return (
                    <div key={idx} className="flex gap-2 p-2 border-b last:border-0 items-center">
                      <span className={`text-xs w-8 font-bold ${typeColor[item.type]}`}>
                        {typeBadge[item.type]}
                      </span>

                      {/* Name input */}
                      {item.type === 'Lab' ? (
                        <input
                          className={`flex-1 border rounded-md text-sm py-1.5 px-2 focus:outline-none focus:border-[#137fec] ${attempted && err.name ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                          placeholder="Lab item name *"
                          value={item.name}
                          onChange={e => updateItem(idx, 'name', e.target.value)}
                        />
                      ) : (
                        <div className={`flex-1 ${attempted && err.name ? 'ring-1 ring-red-400 rounded-md' : ''}`}>
                          <SearchableSelect
                            type={item.type}
                            initialValue={item.name}
                            placeholder={item.type === 'Pharmacy' ? 'Search Medicine *' : 'Search Service *'}
                            onSelect={data => {
                              const rate = item.type === 'Pharmacy' ? (data.selling_price || 0) : (data.cost || 0);
                              setItems(prev => prev.map((it, i) => i === idx
                                ? { ...it, name: data.name, item_id: data._id, rate, total: rate * it.quantity }
                                : it
                              ));
                            }}
                          />
                        </div>
                      )}

                      <input
                        type="number"
                        className={`w-14 border rounded-md text-sm py-1.5 text-center focus:outline-none focus:border-[#137fec] ${attempted && err.quantity ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                        value={item.quantity}
                        min={1}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      />
                      <input
                        type="number"
                        className={`w-20 border rounded-md text-sm py-1.5 text-right px-1 focus:outline-none focus:border-[#137fec] ${attempted && err.rate ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
                        placeholder="Rate *"
                        value={item.rate}
                        onChange={e => updateItem(idx, 'rate', e.target.value)}
                      />
                      <span className="w-20 text-right font-bold text-sm text-slate-700">₹{item.total}</span>
                      <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
              {attempted && items.length === 0 && <p className="text-xs text-red-500 mt-1">Add at least one item.</p>}
              {attempted && items.length > 0 && hasItemErrors && <p className="text-xs text-red-500 mt-1">Each item must have a name, quantity ≥ 1, and rate &gt; 0.</p>}
            </div>

            {/* Totals & Payment */}
            <div className="border-t pt-4">
              <div className="flex justify-between mb-4">
                <span className="text-slate-500">Total Amount</span>
                <span className="text-xl font-bold text-slate-900">₹{subtotal}</span>
              </div>
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
                <select
                  className="w-full border p-2 rounded mt-1 text-sm bg-white"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                >
                  <option>Cash</option>
                  <option>Card</option>
                  <option>UPI</option>
                  <option>Insurance</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Amount Paid Now <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  className={`w-full border p-2 rounded mt-1 text-lg font-bold focus:outline-none ${attempted && amountPaid === '' ? 'border-red-400 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                />
                {attempted && amountPaid === '' && <p className="text-xs text-red-500 mt-1">Amount paid is required (enter 0 if nothing paid).</p>}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-slate-50">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 bg-[#137fec] hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg disabled:opacity-60"
            >
              {submitting ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </div>
      </div>

      {showAddPatient && (
        <QuickAddPatientModal
          phone={addPatientQuery}
          onClose={() => setShowAddPatient(false)}
          onSave={p => {
            setShowAddPatient(false);
            setPatientInfo({ name: `${p.first_name} ${p.last_name || ''}`.trim(), phone: p.contact?.mobile || '', id: p._id });
          }}
        />
      )}
    </>
  );
}
