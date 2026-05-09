import React, { useState, useEffect } from 'react';
import { Plus, X, Printer, Mail, Share2, Loader2, CreditCard, Receipt } from 'lucide-react';
import API from '../services/api';
import NewInvoiceModal from '../modals/NewInvoiceModal.jsx';

// --- PRINT HELPER ---
const printInvoice = (invoice) => {
  const w = window.open('', '_blank', 'width=800,height=650');
  if (!w) return;

  const statusColor = invoice.status === 'Paid' ? '#16a34a' : invoice.status === 'Pending' ? '#d97706' : '#dc2626';
  const rows = invoice.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">
        <div style="font-weight:600;color:#1e293b;">${item.name}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${item.type}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#475569;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#475569;">₹${Number(item.rate).toLocaleString('en-IN')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#1e293b;">₹${Number(item.total).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${invoice.invoice_id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    .page { max-width: 720px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #137fec; }
    .clinic-name { font-size: 24px; font-weight: 800; color: #137fec; }
    .clinic-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-number { font-size: 20px; font-weight: 700; color: #1e293b; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: ${statusColor}18; color: ${statusColor}; margin-top: 6px; }
    .invoice-date { font-size: 12px; color: #64748b; margin-top: 4px; }
    .bill-to { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; }
    .bill-to-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.06em; margin-bottom: 6px; }
    .bill-to-name { font-size: 18px; font-weight: 700; color: #1e293b; }
    .bill-to-phone { font-size: 13px; color: #64748b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead { background: #137fec; color: #fff; }
    thead th { padding: 11px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    thead th:not(:first-child) { text-align: center; }
    thead th:last-child { text-align: right; }
    thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
    .totals { margin-left: auto; width: 260px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #475569; }
    .totals-row.total { font-size: 17px; font-weight: 800; color: #1e293b; border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 6px; }
    .totals-row.paid { color: #16a34a; font-weight: 600; }
    .totals-row.due { color: #dc2626; font-weight: 700; background: #fef2f2; padding: 8px 10px; border-radius: 6px; margin-top: 6px; }
    .footer { margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
    .payment-method { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-top: 8px; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="clinic-name">Smile Dental Care</div>
      <div class="clinic-sub">123 Health Street, Mumbai · +91 98765 43210</div>
      <div class="clinic-sub">GSTIN: 27AABCC1234F1Z5</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">Invoice #${invoice.invoice_id}</div>
      <div class="status-badge">${invoice.status}</div>
      <div class="invoice-date">Date: ${new Date(invoice.date || invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>

  <div class="bill-to">
    <div class="bill-to-label">Bill To</div>
    <div class="bill-to-name">${invoice.patient_name}</div>
    <div class="bill-to-phone">${invoice.patient_phone || ''}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Description</th>
        <th>Qty</th>
        <th style="text-align:right;">Rate</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    ${invoice.subtotal != null ? `<div class="totals-row"><span>Subtotal</span><span>₹${Number(invoice.subtotal).toLocaleString('en-IN')}</span></div>` : ''}
    ${invoice.tax ? `<div class="totals-row"><span>Tax</span><span>₹${Number(invoice.tax).toLocaleString('en-IN')}</span></div>` : ''}
    <div class="totals-row total"><span>Total</span><span>₹${Number(invoice.total_amount).toLocaleString('en-IN')}</span></div>
    <div class="totals-row paid"><span>Paid</span><span>₹${Number(invoice.paid_amount).toLocaleString('en-IN')}</span></div>
    ${Number(invoice.pending_amount) > 0 ? `<div class="totals-row due"><span>Balance Due</span><span>₹${Number(invoice.pending_amount).toLocaleString('en-IN')}</span></div>` : ''}
  </div>

  ${invoice.payment_method ? `<div style="margin-top:20px;"><span class="payment-method">Payment via ${invoice.payment_method}</span></div>` : ''}

  <div class="footer">
    <p>Thank you for choosing Smile Dental Care. We care about your smile!</p>
    <p style="margin-top:6px;">For queries, contact us at +91 98765 43210 · info@smiledentalcare.in</p>
  </div>
</div>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };<\/script>
</body>
</html>`);
  w.document.close();
};

// --- VIEW INVOICE MODAL ---
const ViewInvoiceModal = ({ invoiceId, onClose }) => {
  const [invoice, setInvoice] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;
    setLoading(true);
    Promise.all([
      API.get(`/invoices/${invoiceId}`),
      API.get(`/transactions?invoice_id=${invoiceId}`),
    ])
      .then(([invRes, txnRes]) => {
        setInvoice(invRes.data);
        setTransactions(txnRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (!invoiceId) return null;

  const handleShareWhatsApp = () => {
    if (!invoice) return;
    const message = `Hello ${invoice.patient_name}, here is your invoice #${invoice.invoice_id} for ₹${invoice.total_amount}.`;
    window.open(`https://wa.me/${invoice.patient_phone}?text=${encodeURIComponent(message)}`, '_blank');
  };
  const handleShareMail = () => {
    if (!invoice) return;
    const subject = `Invoice ${invoice.invoice_id}`;
    const body = `Dear ${invoice.patient_name},\n\nInvoice Details:\nTotal: ₹${invoice.total_amount}\nPaid: ₹${invoice.paid_amount}\nBalance: ₹${invoice.pending_amount}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const statusStyles = {
    Paid: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-800',
    Overdue: 'bg-red-100 text-red-700',
    Draft: 'bg-slate-100 text-slate-600',
  };

  const methodIcon = {
    Cash: '💵', Card: '💳', UPI: '📱', 'Bank Transfer': '🏦', Cheque: '📄',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#137fec]/10 to-white px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#137fec]/10 rounded-lg"><Receipt size={20} className="text-[#137fec]" /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {invoice ? `Invoice #${invoice.invoice_id}` : 'Loading…'}
              </h2>
              {invoice && <p className="text-xs text-slate-500">{invoice.patient_name} · {new Date(invoice.date || invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
            </div>
            {invoice && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${statusStyles[invoice.status] || 'bg-slate-100 text-slate-600'}`}>
                {invoice.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {invoice && <>
              <button onClick={handleShareWhatsApp} title="WhatsApp" className="p-2 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded-lg transition-colors"><Share2 size={17} /></button>
              <button onClick={handleShareMail} title="Email" className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Mail size={17} /></button>
              <button onClick={() => printInvoice(invoice)} title="Print" className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"><Printer size={17} /></button>
            </>}
            <button onClick={onClose} className="ml-1 p-2 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-lg transition-colors"><X size={20} /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-[#137fec]" size={28} /></div>
          ) : invoice ? (
            <div className="p-6 space-y-6">

              {/* Clinic + Patient */}
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-[#137fec]">Smile Dental Care</p>
                  <p className="text-xs text-slate-400 mt-0.5">123 Health Street, Mumbai</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Bill To</p>
                  <p className="font-bold text-slate-800">{invoice.patient_name}</p>
                  <p className="text-xs text-slate-500">{invoice.patient_phone}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.type}</div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600">₹{Number(item.rate).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">₹{Number(item.total).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5">
                  {invoice.subtotal != null && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Subtotal</span><span>₹{Number(invoice.subtotal).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {invoice.tax > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Tax</span><span>₹{Number(invoice.tax).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base text-slate-800 border-t border-slate-200 pt-2 mt-1">
                    <span>Total</span><span>₹{Number(invoice.total_amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Paid</span><span>₹{Number(invoice.paid_amount).toLocaleString('en-IN')}</span>
                  </div>
                  {Number(invoice.pending_amount) > 0 && (
                    <div className="flex justify-between text-sm text-red-600 font-bold bg-red-50 px-3 py-2 rounded-lg">
                      <span>Balance Due</span><span>₹{Number(invoice.pending_amount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Payment History</h3>
                {transactions.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-6 text-center text-sm text-slate-400">
                    No payments recorded against this invoice.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {transactions.map((txn, idx) => (
                      <div key={txn._id || idx} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-lg" title={txn.payment_method}>{methodIcon[txn.payment_method] || '💰'}</span>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{txn.payment_method}</p>
                            <p className="text-xs text-slate-400">{new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {txn.notes || txn.category}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-green-600">+₹{Number(txn.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex justify-center items-center h-64 text-slate-400">Invoice not found.</div>
          )}
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
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
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

  const statusStyles = {
    Paid: 'bg-green-100 text-green-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    Overdue: 'bg-red-100 text-red-800',
    Draft: 'bg-slate-100 text-slate-600',
  };

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
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setViewInvoiceId(inv._id)}
                      className="font-semibold text-[#137fec] hover:underline focus:outline-none"
                    >
                      {inv.invoice_id}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{inv.patient_name}</div>
                    <div className="text-xs text-slate-500">{inv.patient_phone}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                  <td className={`px-6 py-4 text-right font-bold ${inv.pending_amount > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                    {inv.pending_amount > 0 ? `₹${Number(inv.pending_amount).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusStyles[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {inv.pending_amount > 0 && (
                      <button
                        onClick={() => setPayInvoice(inv)}
                        className="text-white bg-[#137fec] hover:bg-blue-600 flex items-center gap-1 font-medium text-xs rounded px-2 py-1 ml-auto"
                      >
                        <CreditCard size={14} /> Add Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ViewInvoiceModal invoiceId={viewInvoiceId} onClose={() => setViewInvoiceId(null)} />

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
