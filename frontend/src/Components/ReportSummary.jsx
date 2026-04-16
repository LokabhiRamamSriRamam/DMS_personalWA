import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, Users, TestTube, Loader2 } from 'lucide-react';
import API from '../services/api';

function fmt(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

const KPI_CONFIGS = [
  { key: 'total_revenue',      label: 'Total Revenue',      icon: TrendingUp, color: 'text-blue-600',  bg: 'bg-blue-50',   format: fmt },
  { key: 'total_appointments', label: 'Appointments',        icon: Calendar,   color: 'text-green-600', bg: 'bg-green-50',  format: n => n },
  { key: 'new_patients',       label: 'New Patients',        icon: Users,      color: 'text-purple-600',bg: 'bg-purple-50', format: n => n },
  { key: 'pending_labs',       label: 'Pending Lab Orders',  icon: TestTube,   color: 'text-orange-600',bg: 'bg-orange-50', format: n => n },
];

export default function ReportSummary({ from, to }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    API.get(`/analytics?section=summary&from=${from}&to=${to}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [from, to]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-[#137fec]" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error}</div>
  );

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CONFIGS.map(cfg => {
          const Icon = cfg.icon;
          const val = data?.[cfg.key] ?? 0;
          return (
            <div key={cfg.key} className="bg-white p-6 rounded-2xl border shadow-sm">
              <div className={`size-10 rounded-xl ${cfg.bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={cfg.color} />
              </div>
              <p className="text-slate-500 text-sm font-medium">{cfg.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{cfg.format(val)}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue trend */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h3 className="font-bold text-slate-800 mb-6">Revenue Trend</h3>
        {data?.revenue_trend?.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.revenue_trend}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#137fec" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#137fec" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'K' : v}`} />
              <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="amount" stroke="#137fec" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-400 text-sm text-center py-16">No revenue data in this period.</p>
        )}
      </div>
    </div>
  );
}
