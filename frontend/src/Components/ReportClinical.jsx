import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import API from '../services/api';

const COLORS = ['#137fec', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

const STATUS_COLORS = {
  Sent: 'bg-blue-100 text-blue-700',
  'In Process': 'bg-yellow-100 text-yellow-700',
  Received: 'bg-green-100 text-green-700',
  'Delivered to Patient': 'bg-purple-100 text-purple-700',
};

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

// ── Doctors ───────────────────────────────────────────────────────────────────
function Doctors({ from, to }) {
  const { data, loading, error } = useAnalytics('doctors', from, to);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-[#137fec]" /></div>;
  if (error)   return <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error}</div>;

  const d = data || {};
  const chart = d.chart || [];
  const rows  = d.rows  || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient count per doctor */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Patients Seen by Doctor</h3>
          {chart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="patient_count" fill="#137fec" radius={[0, 4, 4, 0]} barSize={18} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No visit data in this period.</p>}
        </div>

        {/* Treatments per doctor */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Treatments by Doctor</h3>
          {chart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="treatment_count" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={18} name="Treatments" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No treatment data in this period.</p>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50"><h3 className="font-bold text-slate-800">Doctor Summary</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="p-3 text-left">Doctor</th>
              <th className="p-3 text-right">Visits</th>
              <th className="p-3 text-right">Treatments</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-right">{r.patient_count}</td>
                <td className="p-3 text-right">{r.treatment_count}</td>
              </tr>
            )) : (
              <tr><td colSpan={3} className="p-6 text-center text-slate-400">No doctor data in this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Lab Works ─────────────────────────────────────────────────────────────────
function Lab({ from, to }) {
  const { data, loading, error } = useAnalytics('lab', from, to);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-[#137fec]" /></div>;
  if (error)   return <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error}</div>;

  const d = data || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status pie */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Orders by Status</h3>
          {d.by_status?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={d.by_status} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="count" nameKey="name">
                  {d.by_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No lab orders in this period.</p>}
        </div>

        {/* By vendor */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Orders by Lab Vendor</h3>
          {d.by_vendor?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.by_vendor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#137fec" radius={[0, 4, 4, 0]} barSize={18} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-400 text-sm text-center py-16">No vendor data.</p>}
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50"><h3 className="font-bold text-slate-800">Recent Lab Orders</h3></div>
        {d.rows?.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="p-3 text-left">Patient</th>
                <th className="p-3 text-left">Lab</th>
                <th className="p-3 text-left">Order Date</th>
                <th className="p-3 text-left">Expected</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="p-3 font-medium">{r.patient_name}</td>
                  <td className="p-3 text-slate-500">{r.vendor_name}</td>
                  <td className="p-3 text-slate-500">{new Date(r.order_date).toLocaleDateString('en-GB')}</td>
                  <td className="p-3 text-slate-500">{r.expected_delivery ? new Date(r.expected_delivery).toLocaleDateString('en-GB') : '—'}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                  </td>
                  <td className="p-3 text-right font-semibold">₹{(r.cost_to_clinic || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-400 text-sm text-center py-12">No lab orders in this period.</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportClinical({ from, to, section }) {
  if (section === 'lab') return <Lab from={from} to={to} />;
  return <Doctors from={from} to={to} />;
}
