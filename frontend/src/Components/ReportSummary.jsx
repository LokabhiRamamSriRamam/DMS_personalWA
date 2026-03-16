import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ReportSummary = () => {
  const data = [
    { name: 'Mon', revenue: 4000 }, { name: 'Tue', revenue: 3000 },
    { name: 'Wed', revenue: 2000 }, { name: 'Thu', revenue: 2780 },
    { name: 'Fri', revenue: 1890 }, { name: 'Sat', revenue: 2390 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {['Total Revenue', 'Appointments', 'New Patients', 'Pending Labs'].map((t, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="text-slate-500 text-sm font-medium">{t}</h3>
            <p className="text-2xl font-bold text-slate-800 mt-2">{i === 0 ? '₹1.2L' : '42'}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-white p-6 rounded-2xl border shadow-sm h-80">
        <h3 className="font-bold text-slate-800 mb-4">Weekly Revenue Trend</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#137fec" fill="#137fec" fillOpacity={0.1} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ReportSummary;