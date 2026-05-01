import React, { useState, useEffect } from 'react';
import { Plus, X, Printer, Eye, Mail, Share2, Loader2, CreditCard } from 'lucide-react';
import API from '../services/api';
import NewInvoiceModal from '../modals/NewInvoiceModal.jsx';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">Invoice #{invoice.invoice_id}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${invoice.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{invoice.status}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleShareWhatsApp} className="p-2 hover:bg-green-50 text-slate-600 hover:text-green-600 rounded-lg" title="WhatsApp"><Share2 size={18} /></button>
            <button onClick={handleShareMail} className="p-2 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg" title="Email"><Mail size={18} /></button>
            <button onClick={handlePrint} className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg" title="Print"><Printer size={18} /></button>
            <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg ml-2"><X size={20} /></button>
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
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between font-bold text-lg text-slate-800"><span>Total</span><span>₹{invoice.total_amount}</span></div>
              <div className="flex justify-between text-sm text-green-600 font-medium"><span>Paid</span><span>-₹{invoice.paid_amount}</span></div>
              {invoice.pending_amount > 0 && <div className="flex justify-between text-sm text-red-600 font-bold bg-red-50 p-2 rounded"><span>Due</span><span>₹{invoice.pending_amount}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ADD PAYMENT MODAL ---
const AddPaymentModal = ({ invoice, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  if (!invoice) return null;

  const handleSubmit = async () => {
    setAttempted(true);
    if (!amount || Number(amount) <= 0) return;
    setSubmitting(true);
    try {
      await API.post('/transactions', {
        type: 'Income',
        category: 'Invoice Payment',
        amount: Number(amount),
        payment_method: paymentMethod,
        date: new Date(),
        party_name: invoice.patient_name,
        invoice_id: invoice._id,
        notes: `Payment for ${invoice.invoice_id}`,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Add Payment</h2>
            <p className="text-xs text-slate-500 mt-0.5">{invoice.invoice_id} · {invoice.patient_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-500">Total</span><span className="font-bold text-slate-800">₹{invoice.total_amount}</span>
          </div>
          <div className="flex justify-between text-sm bg-green-50 p-3 rounded-lg border border-green-100">
            <span className="text-green-700">Already Paid</span><span className="font-bold text-green-700">₹{invoice.paid_amount}</span>
          </div>
          <div className="flex justify-between text-sm bg-red-50 p-3 rounded-lg border border-red-100">
            <span className="text-red-600 font-bold">Pending</span><span className="font-bold text-red-600">₹{invoice.pending_amount}</span>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
            <select
              className="w-full border border-slate-300 p-2 rounded-lg mt-1 text-sm bg-white focus:outline-none focus:border-[#137fec]"
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
            <label className="text-xs font-bold text-slate-500 uppercase">Amount <span className="text-red-500">*</span></label>
            <input
              autoFocus
              type="number"
              className={`w-full border p-2 rounded-lg mt-1 text-lg font-bold focus:outline-none ${attempted && !(Number(amount) > 0) ? 'border-red-400 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700 focus:border-green-400'}`}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`Max ₹${invoice.pending_amount}`}
              max={invoice.pending_amount}
            />
            {attempted && !(Number(amount) > 0) && <p className="text-xs text-red-500 mt-1">Enter a valid amount.</p>}
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-[#137fec] hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <CreditCard size={18} /> {submitting ? 'Recording...' : 'Record Payment'}
          </button>
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
  const [payInvoice, setPayInvoice] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/invoices');
      setInvoices(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, []);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <header className="pb-6 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div><h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices</h1><p className="text-slate-500 mt-1">Manage billing</p></div>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#137fec] text-white rounded-lg hover:bg-blue-600 shadow-lg text-sm font-bold">
            <Plus size={20} /> New Invoice
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto relative z-0 mt-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Pending</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoices.map(inv => (
                <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#137fec]">{inv.invoice_id}</td>
                  <td className="px-6 py-4"><div className="font-bold text-slate-800">{inv.patient_name}</div><div className="text-xs text-slate-500">{inv.patient_phone}</div></td>
                  <td className="px-6 py-4 text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">₹{inv.total_amount}</td>
                  <td className={`px-6 py-4 text-right font-bold ${inv.pending_amount > 0 ? 'text-red-500' : 'text-slate-300'}`}>{inv.pending_amount > 0 ? `₹${inv.pending_amount}` : '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${inv.status === 'Paid' ? 'bg-green-100 text-green-800' : inv.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{inv.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {inv.pending_amount > 0 ? (
                        <button onClick={() => setPayInvoice(inv)} className="text-white bg-[#137fec] hover:bg-blue-600 p-1 flex items-center gap-1 font-medium text-xs rounded px-2 py-1"><CreditCard size={14} /> Add Payment</button>
                      ) : (
                        <button onClick={() => setViewInvoice(inv)} className="text-slate-400 hover:text-blue-600 p-1 flex items-center gap-1 font-medium text-xs border rounded px-2"><Eye size={14} /> View</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ViewInvoiceModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />

      <AddPaymentModal
        invoice={payInvoice}
        onClose={() => setPayInvoice(null)}
        onSuccess={() => { fetchInvoices(); setPayInvoice(null); }}
      />

      <NewInvoiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchInvoices()}
      />
    </div>
  );
};

export default InvoicesPage;
