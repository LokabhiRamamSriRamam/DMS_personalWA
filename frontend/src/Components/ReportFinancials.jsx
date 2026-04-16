import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import API from '../services/api';

const COLORS = ['#137fec', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

function fmt(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

function useAnalytics(section, from, to) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    API.get(`/analytics?section=${section}&from=${from}&to=${to}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [section, from, to]);

  return { data, loading, error };
}

function LoadingBox() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-[#137fec]" />
    </div>
  );
}

function ErrorBox({ msg }) {
  return <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{msg}</div>;
}

// ── Revenue ───────────────────────────────────────────────────────────────────
function Revenue({ from, to }) {
  const { data, loading, error } = useAnalytics('revenue', from, to);
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const d = data || {};

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Billed',   value: fmt(d.total || 0) },
          { label: 'Collected',      value: fmt(d.collected || 0) },
          { label: 'Pending',        value: fmt(d.pending || 0) },
        ].map(k => (
          <div key={k.label} className="bg-white p-6 rounded-2xl border shadow-sm">
            <p className="text-slate-500 text-sm">{k.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly revenue trend bar */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Monthly Revenue</h3>
          {d.trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={fmt} />
                <Tooltip formatter={v => [fmt(v), 'Revenue']} />
                <Bar dataKey="total" fill="#137fec" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No data.</p>}
        </div>

        {/* Payment method pie */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Payment Methods</h3>
          {d.by_payment_method?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={d.by_payment_method} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {d.by_payment_method.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => [fmt(v)]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No data.</p>}
        </div>
      </div>

      {/* Top patients table */}
      {d.top_patients?.length > 0 && (
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50"><h3 className="font-bold text-slate-800">Top Patients by Revenue</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr><th className="p-3 text-left">Patient</th><th className="p-3 text-right">Total Billed</th></tr>
            </thead>
            <tbody>
              {d.top_patients.map((p, i) => (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-right font-semibold text-slate-700">{fmt(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Expense ───────────────────────────────────────────────────────────────────
function Expense({ from, to }) {
  const { data, loading, error } = useAnalytics('expense', from, to);
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const d = data || {};

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <p className="text-slate-500 text-sm">Total Expenses</p>
        <p className="text-3xl font-bold text-slate-800 mt-1">{fmt(d.total || 0)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Monthly Expense Trend</h3>
          {d.trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={fmt} />
                <Tooltip formatter={v => [fmt(v), 'Expenses']} />
                <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No data.</p>}
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">By Category</h3>
          {d.by_category?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={d.by_category} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {d.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => [fmt(v)]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No data.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Vendors ───────────────────────────────────────────────────────────────────
function Vendors({ from, to }) {
  const { data, loading, error } = useAnalytics('vendors', from, to);
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const rows = data?.rows || [];

  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-slate-50">
        <h3 className="font-bold text-slate-800">Vendor Spend Summary</h3>
        <p className="text-xs text-slate-400 mt-0.5">Based on expense transactions linked to vendors</p>
      </div>
      {rows.length > 0 ? (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="p-3 text-left">Vendor</th>
              <th className="p-3 text-right">Transactions</th>
              <th className="p-3 text-right">Total Spent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                <td className="p-3 font-medium">{r.vendor_name}</td>
                <td className="p-3 text-right text-slate-500">{r.order_count}</td>
                <td className="p-3 text-right font-semibold text-slate-700">{fmt(r.total_spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-slate-400 text-sm text-center py-16">No vendor transactions in this period.</p>
      )}
    </div>
  );
}

// ── Medicine Orders ───────────────────────────────────────────────────────────
const STATUS_COLORS = { Pending: 'bg-yellow-100 text-yellow-700', Confirmed: 'bg-blue-100 text-blue-700', Received: 'bg-green-100 text-green-700', Cancelled: 'bg-red-100 text-red-700' };

function MedOrders({ from, to }) {
  const { data, loading, error } = useAnalytics('med_orders', from, to);
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const rows = data?.rows || [];

  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-slate-50"><h3 className="font-bold text-slate-800">Purchase Orders</h3></div>
      {rows.length > 0 ? (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="p-3 text-left">Vendor</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Order Date</th>
              <th className="p-3 text-center">Items</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                <td className="p-3 font-medium">{r.vendor_name}</td>
                <td className="p-3 text-slate-500">{r.category}</td>
                <td className="p-3 text-slate-500">{new Date(r.order_date).toLocaleDateString('en-GB')}</td>
                <td className="p-3 text-center">{r.item_count}</td>
                <td className="p-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                </td>
                <td className="p-3 text-right font-semibold">{fmt(r.total_cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-slate-400 text-sm text-center py-16">No purchase orders in this period.</p>
      )}
    </div>
  );
}

// ── Treatment Revenue ─────────────────────────────────────────────────────────
function TreatmentRevenue({ from, to }) {
  const { data, loading, error } = useAnalytics('treatment_revenue', from, to);
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const rows = data?.by_treatment || [];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h3 className="font-bold text-slate-800 mb-6">Revenue by Treatment Type</h3>
        {rows.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(300, rows.length * 36)}>
            <BarChart data={rows} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={fmt} />
              <YAxis dataKey="name" type="category" width={160} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => [fmt(v), 'Revenue']} />
              <Bar dataKey="total_cost" fill="#137fec" radius={[0, 4, 4, 0]} barSize={18} name="Revenue">
                {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-slate-400 text-sm text-center py-16">No treatment data in this period.</p>}
      </div>

      {rows.length > 0 && (
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50"><h3 className="font-bold text-slate-800">Treatment Breakdown</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="p-3 text-left">Treatment</th>
                <th className="p-3 text-right">Count</th>
                <th className="p-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-right text-slate-500">{r.count}</td>
                  <td className="p-3 text-right font-semibold text-slate-700">{fmt(r.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportFinancials({ from, to, section }) {
  if (section === 'revenue')           return <Revenue from={from} to={to} />;
  if (section === 'expense')           return <Expense from={from} to={to} />;
  if (section === 'vendors')           return <Vendors from={from} to={to} />;
  if (section === 'med_orders')        return <MedOrders from={from} to={to} />;
  if (section === 'treatment_revenue') return <TreatmentRevenue from={from} to={to} />;
  return <Revenue from={from} to={to} />;
}
