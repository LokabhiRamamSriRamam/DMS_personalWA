import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';

const TRIGGER_LABELS = {
  first_message:           'First Message',
  appointment_received:    'Appt. Received',
  appointment_booked:      'Appt. Booked',
  appointment_confirmed:   'Appt. Confirmed',
  appointment_reminder:    'Appt. Reminder',
  appointment_completed:   'Appt. Completed',
  appointment_rescheduled: 'Appt. Rescheduled',
  treatment_completed:     'Treatment Completed',
  post_treatment_care:     'Post-Treatment Care',
  invoice_created:         'Invoice Created',
  custom_keyword:          'Custom Keyword',
};

const STATUS_META = {
  success:                   { color: 'bg-blue-50 text-blue-700 border-blue-200',         icon: 'bolt',           label: 'Triggered' },
  message_sent:              { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'check_circle',  label: 'Sent' },
  message_failed:            { color: 'bg-red-50 text-red-700 border-red-200',             icon: 'error',         label: 'Send Failed' },
  message_scheduled:         { color: 'bg-amber-50 text-amber-700 border-amber-200',       icon: 'schedule',      label: 'Scheduled' },
  no_matching_flow:          { color: 'bg-slate-50 text-slate-600 border-slate-200',       icon: 'help',          label: 'No Matching Flow' },
  no_session_api_key:        { color: 'bg-red-50 text-red-700 border-red-200',             icon: 'key_off',       label: 'No API Key' },
  invalid_phone:             { color: 'bg-red-50 text-red-700 border-red-200',             icon: 'phone_disabled', label: 'Invalid Phone' },
  duplicate_session_skipped: { color: 'bg-purple-50 text-purple-700 border-purple-200',    icon: 'content_copy',  label: 'Duplicate Skipped' },
  no_root_node:              { color: 'bg-red-50 text-red-700 border-red-200',             icon: 'broken_image',  label: 'No Root Node' },
  error:                     { color: 'bg-red-50 text-red-700 border-red-200',             icon: 'bug_report',    label: 'Error' },
  send_failed:               { color: 'bg-red-50 text-red-700 border-red-200',             icon: 'error',         label: 'Send Failed' },
};

function StatCard({ label, value, icon, accent }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-1 ${accent || ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="material-symbols-outlined text-slate-300 text-[20px]">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value.toLocaleString('en-IN')}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.error;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${meta.color}`}>
      <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
      {meta.label}
    </span>
  );
}

function formatTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function MiniBarChart({ data }) {
  if (!data?.length) return <p className="text-xs text-slate-400 text-center py-8">No activity in the last 30 days</p>;
  const max = Math.max(...data.map(d => d.sent + d.failed + d.scheduled), 1);
  return (
    <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
      {data.map(d => {
        const total = d.sent + d.failed + d.scheduled;
        const h = (total / max) * 100;
        return (
          <div key={d.date} className="flex flex-col items-center gap-1 min-w-[24px]">
            <div className="text-[9px] text-slate-400 font-mono">{total || ''}</div>
            <div className="w-5 bg-slate-100 rounded-t flex flex-col-reverse" style={{ height: '100%' }}>
              <div className="bg-emerald-400 w-full"   style={{ height: `${(d.sent / max) * 100}%` }} title={`Sent: ${d.sent}`} />
              <div className="bg-red-400 w-full"        style={{ height: `${(d.failed / max) * 100}%` }} title={`Failed: ${d.failed}`} />
              <div className="bg-amber-300 w-full"      style={{ height: `${(d.scheduled / max) * 100}%` }} title={`Scheduled: ${d.scheduled}`} />
            </div>
            <div className="text-[9px] text-slate-400 rotate-45 origin-top-left whitespace-nowrap mt-1">{d.date.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function LogsPanel() {
  const [stats, setStats]       = useState(null);
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter]   = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const [phoneFilter, setPhoneFilter]     = useState('');

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadLogs(); }, [statusFilter, triggerFilter, phoneFilter, page]);

  useEffect(() => {
    if (!autoRefresh) return;
    const i = setInterval(() => { loadLogs(); loadStats(); }, 30_000);
    return () => clearInterval(i);
  }, [autoRefresh, statusFilter, triggerFilter, phoneFilter, page]);

  async function loadStats() {
    try {
      const res = await api.get('/chatbot/logs/stats');
      setStats(res.data);
    } catch (err) {
      console.error('loadStats', err);
    }
  }

  async function loadLogs() {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (statusFilter)  params.status      = statusFilter;
      if (triggerFilter) params.triggerType = triggerFilter;
      if (phoneFilter)   params.phone       = phoneFilter;
      const res = await api.get('/chatbot/logs', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('loadLogs', err);
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setStatusFilter(''); setTriggerFilter(''); setPhoneFilter(''); setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-lg">Activity Logs & Statistics</h2>
          <p className="text-xs text-slate-500">Showing the rolling last 30 days. Older entries are auto-deleted.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="accent-blue-600" />
            Auto-refresh (30s)
          </label>
          <button onClick={() => { loadLogs(); loadStats(); }}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg">
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard label="Triggers"            value={stats.totals.triggers}           icon="bolt" />
          <StatCard label="Messages Sent"       value={stats.totals.messages_sent}      icon="check_circle" />
          <StatCard label="Scheduled"           value={stats.totals.messages_scheduled} icon="schedule" />
          <StatCard label="Send Failures"       value={stats.totals.messages_failed}    icon="error" />
          <StatCard label="No Matching Flow"    value={stats.totals.no_matching_flow}   icon="help" />
          <StatCard label="Trigger Errors"      value={stats.totals.errors}             icon="bug_report" />
        </div>
      )}

      {/* Daily activity chart */}
      {stats?.byDay && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 text-sm">Daily Activity (last 30 days)</h3>
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="size-2 bg-emerald-400 rounded-sm" /> Sent</span>
              <span className="flex items-center gap-1"><span className="size-2 bg-red-400 rounded-sm" /> Failed</span>
              <span className="flex items-center gap-1"><span className="size-2 bg-amber-300 rounded-sm" /> Scheduled</span>
            </div>
          </div>
          <MiniBarChart data={stats.byDay} />
        </div>
      )}

      {/* Top flows + trigger breakdown */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Top Flows (by activity)</h3>
            {stats.topFlows?.length
              ? <ul className="space-y-2">
                  {stats.topFlows.map(f => (
                    <li key={f.flowId} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 truncate">{f.flowName || '(unnamed)'}</span>
                      <span className="font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded text-xs">{f.count}</span>
                    </li>
                  ))}
                </ul>
              : <p className="text-xs text-slate-400">No flow activity yet</p>}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">By Trigger Type</h3>
            {stats.byTrigger?.length
              ? <ul className="space-y-2">
                  {stats.byTrigger.slice(0, 6).map(t => (
                    <li key={t.triggerType} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{TRIGGER_LABELS[t.triggerType] || t.triggerType}</span>
                      <span className="font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded text-xs">{t.count}</span>
                    </li>
                  ))}
                </ul>
              : <p className="text-xs text-slate-400">No triggers yet</p>}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</label>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All statuses</option>
            {Object.keys(STATUS_META).map(s => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Trigger Type</label>
          <select value={triggerFilter} onChange={e => { setTriggerFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All triggers</option>
            {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Phone (last digits)</label>
          <input type="text" value={phoneFilter} onChange={e => { setPhoneFilter(e.target.value); setPage(1); }}
            placeholder="9876…"
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {(statusFilter || triggerFilter || phoneFilter) && (
          <button onClick={clearFilters}
            className="text-xs text-slate-600 hover:text-red-600 border border-slate-200 px-3 py-1.5 rounded-lg">
            Clear
          </button>
        )}
      </div>

      {/* Logs table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="text-xs text-slate-500">
            Showing <strong>{logs.length}</strong> of <strong>{total.toLocaleString('en-IN')}</strong> entries
            {loading && <span className="ml-2 text-blue-500">Loading…</span>}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-2 py-1 border border-slate-200 rounded text-xs disabled:opacity-30">←</button>
            <span className="text-xs text-slate-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-2 py-1 border border-slate-200 rounded text-xs disabled:opacity-30">→</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2.5">Time</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Trigger</th>
                <th className="text-left px-4 py-2.5">Flow</th>
                <th className="text-left px-4 py-2.5">Phone</th>
                <th className="text-left px-4 py-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">No log entries match your filters.</td></tr>
              )}
              {logs.map(l => (
                <tr key={l._id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs text-slate-500 font-mono whitespace-nowrap">{formatTime(l.createdAt)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-slate-700">{TRIGGER_LABELS[l.triggerType] || l.triggerType || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-700 truncate max-w-[180px]">{l.flowName || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">{l.phone ? `+91${l.phone}` : '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {l.status === 'message_scheduled' && l.scheduledFor
                      ? <span>Fires at <strong>{formatTime(l.scheduledFor)}</strong></span>
                      : l.error
                      ? <span className="text-red-600">{l.error}</span>
                      : l.messageType
                      ? <span className="text-slate-500">{l.messageType} message</span>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
