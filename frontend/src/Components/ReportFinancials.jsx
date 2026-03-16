import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ReportFinancials = () => {
  const [subTab, setSubTab] = useState('Overview');

  // Mock Data
  const financialData = [
    { name: 'Jan', Income: 4000, Expense: 2400 },
    { name: 'Feb', Income: 3000, Expense: 1398 },
    { name: 'Mar', Income: 2000, Expense: 9800 },
    { name: 'Apr', Income: 2780, Expense: 3908 },
    { name: 'May', Income: 1890, Expense: 4800 },
  ];

  const expenseBreakdown = [
    { name: 'Lab Fees', value: 400 },
    { name: 'Salaries', value: 300 },
    { name: 'Consumables', value: 300 },
    { name: 'Utilities', value: 200 },
  ];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-6">
      {/* Sub-Navigation */}
      <div className="flex gap-2 bg-white p-1 rounded-xl w-fit border">
        {['Overview', 'Expenses', 'Vendors'].map(tab => (
          <button key={tab} onClick={() => setSubTab(tab)} className={`px-4 py-2 text-sm font-medium rounded-lg ${subTab === tab ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
        ))}
      </div>

      {subTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bar Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border shadow-sm h-96">
            <h3 className="font-bold text-slate-800 mb-4">Income vs Expense</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Income" fill="#137fec" radius={[4,4,0,0]} />
                <Bar dataKey="Expense" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm h-96">
            <h3 className="font-bold text-slate-800 mb-4">Expense Breakdown</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* (Add detailed tables for Expenses/Vendors in other conditional blocks here) */}
      {subTab === 'Vendors' && <div className="bg-white p-10 text-center text-slate-400">Vendor Table Component Here</div>}
    </div>
  );
};

export default ReportFinancials;