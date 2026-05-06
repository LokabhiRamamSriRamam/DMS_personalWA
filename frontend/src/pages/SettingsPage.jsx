import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Download, Upload, Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import API from '../services/api';
import EmailTemplateEditorModal from '../modals/EmailTemplateEditorModal';

// ─── Email Tab ────────────────────────────────────────────────────────────────

const EVENT_LABELS = {
  aiReportReady:     'AI Report Ready',
  appointmentBooked: 'Appointment Booked',
  invoiceGenerated:  'Invoice Generated',
};

const LANG_LABELS = { en: 'English', hi: 'Hindi', mr: 'Marathi' };

function EmailTab() {
  const [emailSubTab, setEmailSubTab] = useState('connection');

  // Settings state
  const [settings, setSettings] = useState(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [smtpForm, setSmtpForm] = useState({
    mode: 'gmail', enabled: false, automationEnabled: false,
    fromName: '', fromEmail: '', replyTo: '',
    smtp: { host: 'smtp.gmail.com', port: 465, secure: true, user: '', password: '' },
    events: {
      aiReportReady:     { enabled: false, delayMinutes: 0 },
      appointmentBooked: { enabled: false, delayMinutes: 0 },
      invoiceGenerated:  { enabled: false, delayMinutes: 0 },
    },
  });
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState(null); // null | 'sending' | 'ok' | 'fail'
  const [testError, setTestError] = useState('');

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [templateModal, setTemplateModal] = useState(null); // null | template obj | 'new'
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState({ event: '', status: '' });
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (emailSubTab === 'templates') fetchTemplates();
    if (emailSubTab === 'logs') fetchLogs();
  }, [emailSubTab]);

  async function fetchSettings() {
    try {
      const res = await API.get('/email/settings');
      setSettings(res.data);
      setSmtpForm({
        mode:             res.data.mode || 'gmail',
        enabled:          res.data.enabled || false,
        automationEnabled: res.data.automationEnabled || false,
        fromName:         res.data.fromName || '',
        fromEmail:        res.data.fromEmail || '',
        replyTo:          res.data.replyTo || '',
        smtp: {
          host:     res.data.smtp?.host || 'smtp.gmail.com',
          port:     res.data.smtp?.port || 465,
          secure:   res.data.smtp?.secure !== false,
          user:     res.data.smtp?.user || '',
          password: '', // never pre-fill password
        },
        events: res.data.events || {
          aiReportReady:     { enabled: false, delayMinutes: 0 },
          appointmentBooked: { enabled: false, delayMinutes: 0 },
          invoiceGenerated:  { enabled: false, delayMinutes: 0 },
        },
      });
    } catch (err) {
      console.error('Failed to load email settings:', err);
    }
  }

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      await API.put('/email/settings', smtpForm);
      await fetchSettings();
      alert('Email settings saved.');
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSettingsSaving(false);
    }
  }

  async function sendTestEmail() {
    if (!testEmail.trim()) return;
    setTestStatus('sending');
    setTestError('');
    try {
      await API.post('/email/test', { to: testEmail.trim() });
      setTestStatus('ok');
    } catch (err) {
      setTestStatus('fail');
      setTestError(err.response?.data?.error || err.message);
    }
  }

  function handleModeSwitch(mode) {
    setSmtpForm(f => ({
      ...f,
      mode,
      smtp: {
        ...f.smtp,
        host:   mode === 'gmail' ? 'smtp.gmail.com' : '',
        port:   mode === 'gmail' ? 465 : 587,
        secure: mode === 'gmail',
      },
    }));
  }

  async function fetchTemplates() {
    setTemplatesLoading(true);
    try {
      const res = await API.get('/email/templates');
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load email templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function handleSaveTemplate(form, id) {
    if (id) {
      await API.put(`/email/templates/${id}`, form);
    } else {
      await API.post('/email/templates', form);
    }
    await fetchTemplates();
  }

  async function handleDeleteTemplate(id) {
    if (!window.confirm('Delete this template?')) return;
    await API.delete(`/email/templates/${id}`);
    setTemplates(ts => ts.filter(t => t._id !== id));
  }

  async function fetchLogs() {
    setLogsLoading(true);
    try {
      const params = {};
      if (logsFilter.event)  params.event  = logsFilter.event;
      if (logsFilter.status) params.status = logsFilter.status;
      const res = await API.get('/email/logs', { params });
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load email logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
        <Mail size={22} /> Email
      </h2>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700">
        {['connection', 'automation', 'templates', 'logs'].map(t => (
          <button
            key={t}
            onClick={() => setEmailSubTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize transition-all ${
              emailSubTab === t
                ? 'text-[#137fec] border-b-2 border-[#137fec]'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Connection ── */}
      {emailSubTab === 'connection' && (
        <div className="max-w-lg space-y-5">
          {/* Mode toggle */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Mode</label>
            <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 w-fit">
              {['gmail', 'custom'].map(m => (
                <button
                  key={m}
                  onClick={() => handleModeSwitch(m)}
                  className={`px-5 py-2 text-sm font-semibold capitalize transition-colors ${
                    smtpForm.mode === m
                      ? 'bg-[#137fec] text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {m === 'gmail' ? 'Gmail' : 'Custom SMTP'}
                </button>
              ))}
            </div>
            {smtpForm.mode === 'gmail' && (
              <p className="mt-2 text-xs text-slate-500">
                Gmail requires 2FA + an App Password (not your normal password).
                Generate one at <span className="font-mono">myaccount.google.com/apppasswords</span>.
              </p>
            )}
          </div>

          {/* Enable toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setSmtpForm(f => ({ ...f, enabled: !f.enabled }))}
              className={`w-10 h-5 rounded-full relative transition-colors ${smtpForm.enabled ? 'bg-[#137fec]' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${smtpForm.enabled ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable Email Delivery</span>
          </label>

          {/* SMTP fields */}
          {smtpForm.mode === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">SMTP Host</label>
                <input type="text" value={smtpForm.smtp.host} onChange={e => setSmtpForm(f => ({ ...f, smtp: { ...f.smtp, host: e.target.value } }))} placeholder="smtp.example.com" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Port</label>
                <input type="number" value={smtpForm.smtp.port} onChange={e => setSmtpForm(f => ({ ...f, smtp: { ...f.smtp, port: Number(e.target.value) } }))} className={inputCls} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-1">
                  <input type="checkbox" checked={smtpForm.smtp.secure} onChange={e => setSmtpForm(f => ({ ...f, smtp: { ...f.smtp, secure: e.target.checked } }))} className="w-4 h-4" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">TLS (port 465)</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email / SMTP Username</label>
            <input type="email" value={smtpForm.smtp.user} onChange={e => setSmtpForm(f => ({ ...f, smtp: { ...f.smtp, user: e.target.value } }))} placeholder="you@gmail.com" className={inputCls} />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
              {smtpForm.mode === 'gmail' ? 'App Password' : 'SMTP Password'}
            </label>
            <input type="password" value={smtpForm.smtp.password} onChange={e => setSmtpForm(f => ({ ...f, smtp: { ...f.smtp, password: e.target.value } }))} placeholder={settings?.smtp?.user ? '••••••••  (leave blank to keep existing)' : 'Password'} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">From Name</label>
              <input type="text" value={smtpForm.fromName} onChange={e => setSmtpForm(f => ({ ...f, fromName: e.target.value }))} placeholder="Dr. Name" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">From Email</label>
              <input type="email" value={smtpForm.fromEmail} onChange={e => setSmtpForm(f => ({ ...f, fromEmail: e.target.value }))} placeholder="clinic@example.com" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Reply-To (optional)</label>
              <input type="email" value={smtpForm.replyTo} onChange={e => setSmtpForm(f => ({ ...f, replyTo: e.target.value }))} placeholder="replies@example.com" className={inputCls} />
            </div>
          </div>

          <button onClick={saveSettings} disabled={settingsSaving} className="px-6 py-2.5 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60">
            {settingsSaving ? 'Saving...' : 'Save Settings'}
          </button>

          {/* Test send */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Send a Test Email</p>
            <div className="flex gap-2">
              <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="recipient@example.com" className={`${inputCls} flex-1`} />
              <button onClick={sendTestEmail} disabled={testStatus === 'sending'} className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60">
                {testStatus === 'sending' ? 'Sending…' : 'Send Test'}
              </button>
            </div>
            {testStatus === 'ok' && <p className="mt-2 text-sm text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Test email sent.</p>}
            {testStatus === 'fail' && <p className="mt-2 text-sm text-red-600 flex items-center gap-1"><XCircle size={14} /> {testError}</p>}
          </div>
        </div>
      )}

      {/* ── Automation ── */}
      {emailSubTab === 'automation' && (
        <div className="max-w-lg space-y-6">
          {/* Master toggles */}
          <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setSmtpForm(f => ({ ...f, automationEnabled: !f.automationEnabled }))} className={`w-10 h-5 rounded-full relative transition-colors ${smtpForm.automationEnabled ? 'bg-[#137fec]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${smtpForm.automationEnabled ? 'left-5' : 'left-0.5'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Automation Master Switch</p>
                <p className="text-xs text-slate-500">When OFF, doctor sends manually from the report modal.</p>
              </div>
            </label>
          </div>

          {/* Per-event toggles */}
          <div className="space-y-4">
            {Object.keys(EVENT_LABELS).map(event => (
              <div key={event} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{EVENT_LABELS[event]}</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setSmtpForm(f => ({
                        ...f,
                        events: { ...f.events, [event]: { ...f.events[event], enabled: !f.events[event]?.enabled } }
                      }))}
                      className={`w-8 h-4 rounded-full relative transition-colors ${smtpForm.events?.[event]?.enabled ? 'bg-[#137fec]' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${smtpForm.events?.[event]?.enabled ? 'left-4' : 'left-0.5'}`} />
                    </div>
                    <span className="text-xs text-slate-500">{smtpForm.events?.[event]?.enabled ? 'On' : 'Off'}</span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 whitespace-nowrap">Delay (minutes):</label>
                  <input
                    type="number" min="0"
                    value={smtpForm.events?.[event]?.delayMinutes || 0}
                    onChange={e => setSmtpForm(f => ({
                      ...f,
                      events: { ...f.events, [event]: { ...f.events[event], delayMinutes: Number(e.target.value) } }
                    }))}
                    className="w-24 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <button onClick={saveSettings} disabled={settingsSaving} className="px-6 py-2.5 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60">
            {settingsSaving ? 'Saving...' : 'Save Automation Settings'}
          </button>
        </div>
      )}

      {/* ── Templates ── */}
      {emailSubTab === 'templates' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">Manage per-event email templates with <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{'{{variable}}'}</code> substitution.</p>
            <button onClick={() => setTemplateModal('new')} className="flex items-center gap-2 px-4 py-2 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors">
              <Plus size={16} /> New Template
            </button>
          </div>

          {templatesLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No templates yet. Create one to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Language</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {templates.map(t => (
                    <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{EVENT_LABELS[t.event] || t.event}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{LANG_LABELS[t.language] || t.language}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">{t.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => setTemplateModal(t)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteTemplate(t._id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Logs ── */}
      {emailSubTab === 'logs' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <select value={logsFilter.event} onChange={e => setLogsFilter(f => ({ ...f, event: e.target.value }))} className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none">
              <option value="">All Events</option>
              {Object.entries(EVENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              <option value="manual">Manual</option>
            </select>
            <select value={logsFilter.status} onChange={e => setLogsFilter(f => ({ ...f, status: e.target.value }))} className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none">
              <option value="">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
            <button onClick={fetchLogs} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-sm transition-colors">
              <RefreshCw size={14} /> Refresh
            </button>
            <span className="text-xs text-slate-400 ml-auto">{logs.length} record{logs.length !== 1 ? 's' : ''}</span>
          </div>

          {logsLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No email logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {logs.map(log => (
                    <React.Fragment key={log._id}>
                      <tr
                        onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                      >
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.sentAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {log.patientId ? `${log.patientId.first_name} ${log.patientId.last_name || ''}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={log.subject}>{log.subject || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[12rem] truncate">{log.to}</td>
                        <td className="px-4 py-3">
                          {log.status === 'sent'
                            ? <span className="flex items-center gap-1 text-green-600 font-semibold text-xs"><CheckCircle size={13} /> Sent</span>
                            : <span className="flex items-center gap-1 text-red-500 font-semibold text-xs" title={log.errorMessage}><XCircle size={13} /> Failed</span>}
                        </td>
                      </tr>
                      {expandedLog === log._id && (
                        <tr className="bg-slate-50 dark:bg-slate-900">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                              <p><span className="font-semibold">Event:</span> {EVENT_LABELS[log.event] || log.event || 'Manual'}</p>
                              <p><span className="font-semibold">Subject:</span> {log.subject}</p>
                              <p><span className="font-semibold">To:</span> {log.to}</p>
                              {log.messageId && <p><span className="font-semibold">Message ID:</span> {log.messageId}</p>}
                              {log.attachments?.length > 0 && <p><span className="font-semibold">Attachments:</span> {log.attachments.map(a => a.filename).join(', ')}</p>}
                              {log.errorMessage && <p className="text-red-500"><span className="font-semibold">Error:</span> {log.errorMessage}</p>}
                              <p><span className="font-semibold">Sent at:</span> {new Date(log.sentAt).toLocaleString()}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Template editor modal */}
      {templateModal && (
        <EmailTemplateEditorModal
          template={templateModal === 'new' ? null : templateModal}
          onClose={() => setTemplateModal(null)}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('doctors');

  // Doctor states
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorFormData, setDoctorFormData] = useState({
    name: '',
    specialization: '',
    email: '',
    phone: '',
    license_number: '',
    qualification: '',
    experience_years: 0,
    is_active: true,
    notes: '',
    availability: {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
      saturday: { start: '10:00', end: '14:00' },
      sunday: { start: '', end: '' }
    }
  });

  // Treatment states
  const [clinicalFindings, setClinicalFindings] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [suggestedTreatments, setSuggestedTreatments] = useState([]);
  const [treatmentTab, setTreatmentTab] = useState('findings');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkItems, setBulkItems] = useState([]);

  // Service states
  const [services, setServices] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    category: 'General',
    cost: 0,
    description: '',
    isActive: true
  });

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'doctors') {
      fetchDoctors();
    } else if (activeTab === 'treatment') {
      fetchTreatmentData();
    } else if (activeTab === 'services') {
      fetchServices();
    }
  }, [activeTab, treatmentTab]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await API.get('/doctors');
      setDoctors(res.data);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTreatmentData = async () => {
    setLoading(true);
    try {
      const [findingsRes, diagnosesRes, treatmentsRes] = await Promise.all([
        API.get('/clinical-findings'),
        API.get('/diagnoses'),
        API.get('/suggested-treatments')
      ]);
      setClinicalFindings(findingsRes.data);
      setDiagnoses(diagnosesRes.data);
      setSuggestedTreatments(treatmentsRes.data);
    } catch (err) {
      console.error('Failed to load treatment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await API.get('/services');
      setServices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = () => {
    if (doctors.length >= 10) {
      alert('You can only add a maximum of 10 doctors.');
      return;
    }
    setEditingDoctor(null);
    setDoctorFormData({
      name: '',
      specialization: '',
      email: '',
      phone: '',
      license_number: '',
      qualification: '',
      experience_years: 0,
      is_active: true,
      notes: '',
      availability: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
        saturday: { start: '10:00', end: '14:00' },
        sunday: { start: '', end: '' }
      }
    });
    setShowModal(true);
  };

  const handleEditDoctor = (doctor) => {
    setEditingDoctor(doctor);
    setDoctorFormData(doctor);
    setShowModal(true);
  };

  const handleDeleteDoctor = async (id) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await API.delete(`/doctors/${id}`);
        setDoctors(doctors.filter(d => d._id !== id));
      } catch (err) {
        console.error('Failed to delete doctor:', err);
        alert('Failed to delete doctor');
      }
    }
  };

  const handleSubmitDoctor = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingDoctor) {
        const res = await API.put(`/doctors/${editingDoctor._id}`, doctorFormData);
        setDoctors(doctors.map(d => d._id === editingDoctor._id ? res.data : d));
      } else {
        const res = await API.post('/doctors', doctorFormData);
        setDoctors([...doctors, res.data]);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save doctor:', err);
      alert('Failed to save doctor: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('availability_')) {
      const [, day, timeType] = name.split('_');
      setDoctorFormData(prev => ({
        ...prev,
        availability: {
          ...prev.availability,
          [day]: {
            ...prev.availability[day],
            [timeType]: value
          }
        }
      }));
    } else {
      setDoctorFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : (name === 'experience_years' ? Number(value) : value)
      }));
    }
  };

  const addBulkRow = () => {
    if (treatmentTab === 'treatments') {
      setBulkItems([...bulkItems, { name: '', category: '', cost: 0, description: '' }]);
    } else if (treatmentTab === 'diagnoses') {
      setBulkItems([...bulkItems, { name: '', code: '', category: '', description: '' }]);
    } else {
      setBulkItems([...bulkItems, { name: '', category: '', description: '' }]);
    }
  };

  const updateBulkRow = (index, field, value) => {
    const newItems = [...bulkItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setBulkItems(newItems);
  };

  const removeBulkRow = (index) => {
    setBulkItems(bulkItems.filter((_, i) => i !== index));
  };

  const handleBulkAdd = async () => {
    if (bulkItems.length === 0) return;
    setLoading(true);

    try {
      for (const item of bulkItems) {
        if (!item.name.trim()) continue;

        if (treatmentTab === 'findings') {
          await API.post('/clinical-findings', {
            name: item.name.trim(),
            category: item.category || '',
            description: item.description || '',
            is_active: true
          });
        } else if (treatmentTab === 'diagnoses') {
          await API.post('/diagnoses', {
            name: item.name.trim(),
            code: item.code || '',
            category: item.category || '',
            description: item.description || '',
            is_active: true
          });
        } else if (treatmentTab === 'treatments') {
          await API.post('/suggested-treatments', {
            name: item.name.trim(),
            cost: parseFloat(item.cost) || 0,
            category: item.category || '',
            description: item.description || '',
            is_active: true
          });
        }
      }
      setBulkItems([]);
      setBulkMode(false);
      fetchTreatmentData();
      alert('Items added successfully!');
    } catch (err) {
      console.error('Failed to add items:', err);
      alert('Failed to add some items: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Delete treatment item
  const handleDeleteTreatmentItem = async (id, type) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const endpoint =
          type === 'findings' ? '/clinical-findings' :
          type === 'diagnoses' ? '/diagnoses' :
          '/suggested-treatments';
        await API.delete(`${endpoint}/${id}`);

        if (type === 'findings') setClinicalFindings(clinicalFindings.filter(f => f._id !== id));
        else if (type === 'diagnoses') setDiagnoses(diagnoses.filter(d => d._id !== id));
        else setSuggestedTreatments(suggestedTreatments.filter(t => t._id !== id));
      } catch (err) {
        console.error('Failed to delete item:', err);
        alert('Failed to delete item');
      }
    }
  };

  // Service Management
  const handleAddService = () => {
    setEditingService(null);
    setServiceFormData({
      name: '',
      category: 'General',
      cost: 0,
      description: '',
      isActive: true
    });
    setShowServiceModal(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceFormData(service);
    setShowServiceModal(true);
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await API.delete(`/services/${id}`);
        setServices(services.filter(s => s._id !== id));
      } catch (err) {
        console.error('Failed to delete service:', err);
        alert('Failed to delete service');
      }
    }
  };

  const handleSubmitService = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingService) {
        const res = await API.put(`/services/${editingService._id}`, serviceFormData);
        setServices(services.map(s => s._id === editingService._id ? res.data : s));
      } else {
        const res = await API.post('/services', serviceFormData);
        setServices([...services, res.data]);
      }
      setShowServiceModal(false);
    } catch (err) {
      console.error('Failed to save service:', err);
      alert('Failed to save service: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleServiceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setServiceFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'cost' ? parseFloat(value) || 0 : value)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-2">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage clinic configuration and clinical data</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'doctors'
                ? 'text-[#137fec] border-b-2 border-[#137fec]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Doctors
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'services'
                ? 'text-[#137fec] border-b-2 border-[#137fec]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Services
          </button>
          <button
            onClick={() => setActiveTab('treatment')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'treatment'
                ? 'text-[#137fec] border-b-2 border-[#137fec]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Clinical Data
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'email'
                ? 'text-[#137fec] border-b-2 border-[#137fec]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Email
          </button>
        </div>

        {/* Doctors Tab */}
        {activeTab === 'doctors' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Doctor Management</h2>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">({doctors.length}/10)</span>
              </div>
              <button
                onClick={handleAddDoctor}
                disabled={doctors.length >= 10}
                className={`flex items-center gap-2 px-4 py-2.5 font-semibold rounded-xl transition-colors ${
                  doctors.length >= 10
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-[#137fec] hover:bg-blue-600 text-white'
                }`}
                title={doctors.length >= 10 ? 'Maximum of 10 doctors reached' : 'Add a new doctor'}
              >
                <Plus size={20} /> Add Doctor
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No doctors added yet. Click "Add Doctor" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Specialization</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Phone</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Experience</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {doctors.map(doctor => (
                      <tr key={doctor._id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800 dark:text-white">{doctor.name}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {doctor.specialization || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {doctor.email || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {doctor.phone || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {doctor.experience_years} years
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEditDoctor(doctor)}
                              className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteDoctor(doctor._id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Service Management</h2>
              <button
                onClick={handleAddService}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
              >
                <Plus size={20} /> Add Service
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No services added yet. Click "Add Service" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Category</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Cost</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {services.map(service => (
                      <tr key={service._id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800 dark:text-white">{service.name}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          <span className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded">
                            {service.category || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-800 dark:text-white font-semibold">
                          ₹{service.cost?.toLocaleString('en-IN') || '0'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            service.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-300'
                          }`}>
                            {service.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEditService(service)}
                              className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service._id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Treatment Tab */}
        {activeTab === 'treatment' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            {/* Treatment Sub-tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
              {['findings', 'diagnoses', 'treatments'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setTreatmentTab(tab)}
                  className={`px-4 py-2 font-semibold transition-all capitalize ${
                    treatmentTab === tab
                      ? 'text-[#137fec] border-b-2 border-[#137fec]'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab === 'findings' ? 'Clinical Findings' : tab === 'diagnoses' ? 'Diagnoses' : 'Suggested Treatments'}
                </button>
              ))}
            </div>

            {/* Bulk Mode Toggle */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {treatmentTab === 'findings' ? 'Clinical Findings' : treatmentTab === 'diagnoses' ? 'Diagnoses' : 'Suggested Treatments'}
              </h3>
              <button
                onClick={() => setBulkMode(!bulkMode)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-colors ${
                  bulkMode
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Upload size={18} /> {bulkMode ? 'Cancel Bulk' : 'Bulk Add'}
              </button>
            </div>

            {/* Bulk Mode Input */}
            {bulkMode && (
              <div className="mb-6 p-6 bg-slate-50 dark:bg-slate-700 rounded-lg border-2 border-orange-300">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Add {treatmentTab === 'findings' ? 'Clinical Findings' : treatmentTab === 'diagnoses' ? 'Diagnoses' : 'Suggested Treatments'} in Bulk
                  </h4>
                  <button
                    onClick={addBulkRow}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Plus size={16} /> Add Row
                  </button>
                </div>

                <div className="overflow-x-auto mb-4 border border-orange-300 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-orange-100 dark:bg-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Name</th>
                        {treatmentTab === 'diagnoses' && (
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Code</th>
                        )}
                        {treatmentTab === 'treatments' && (
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Cost (₹)</th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Description</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-200 dark:divide-slate-600">
                      {bulkItems.length === 0 ? (
                        <tr>
                          <td colSpan={treatmentTab === 'treatments' ? 5 : treatmentTab === 'diagnoses' ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                            Click "Add Row" to start adding items
                          </td>
                        </tr>
                      ) : (
                        bulkItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-orange-50 dark:hover:bg-slate-600/50 transition-colors">
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateBulkRow(idx, 'name', e.target.value)}
                                placeholder="Item name"
                                className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm bg-white dark:bg-slate-800 dark:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </td>
                            {treatmentTab === 'diagnoses' && (
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.code}
                                  onChange={(e) => updateBulkRow(idx, 'code', e.target.value)}
                                  placeholder="ICD Code"
                                  className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm bg-white dark:bg-slate-800 dark:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                              </td>
                            )}
                            {treatmentTab === 'treatments' && (
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={item.cost}
                                  onChange={(e) => updateBulkRow(idx, 'cost', e.target.value)}
                                  placeholder="0"
                                  className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm bg-white dark:bg-slate-800 dark:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.category}
                                onChange={(e) => updateBulkRow(idx, 'category', e.target.value)}
                                placeholder="Category"
                                className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm bg-white dark:bg-slate-800 dark:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateBulkRow(idx, 'description', e.target.value)}
                                placeholder="Description (optional)"
                                className="w-full px-2 py-1.5 border border-orange-300 rounded text-sm bg-white dark:bg-slate-800 dark:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => removeBulkRow(idx)}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleBulkAdd}
                    disabled={loading || bulkItems.length === 0}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Add All Items
                  </button>
                  <button
                    onClick={() => {
                      setBulkMode(false);
                      setBulkItems([]);
                    }}
                    className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Items Table */}
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      {treatmentTab === 'diagnoses' && (
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Code</th>
                      )}
                      {treatmentTab === 'treatments' && (
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Cost</th>
                      )}
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Category</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {(treatmentTab === 'findings' ? clinicalFindings :
                      treatmentTab === 'diagnoses' ? diagnoses :
                      suggestedTreatments).map(item => (
                      <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800 dark:text-white">{item.name}</p>
                        </td>
                        {treatmentTab === 'diagnoses' && (
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                            {item.code || '-'}
                          </td>
                        )}
                        {treatmentTab === 'treatments' && (
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                            ₹{item.cost?.toLocaleString('en-IN') || '0'}
                          </td>
                        )}
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          <span className="text-xs bg-slate-100 dark:bg-slate-600 px-2 py-1 rounded">
                            {item.category || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDeleteTreatmentItem(item._id, treatmentTab)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* Email Tab */}
        {activeTab === 'email' && <EmailTab />}
      </div>

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                {editingService ? 'Edit Service' : 'Add Service'}
              </h3>
              <button
                onClick={() => setShowServiceModal(false)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitService} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Service Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g., Root Canal Treatment"
                  value={serviceFormData.name}
                  onChange={handleServiceChange}
                  required
                  className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <input
                    type="text"
                    name="category"
                    placeholder="e.g., Endodontics"
                    value={serviceFormData.category}
                    onChange={handleServiceChange}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Cost (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="cost"
                    placeholder="0"
                    value={serviceFormData.cost}
                    onChange={handleServiceChange}
                    required
                    min="0"
                    step="100"
                    className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                <textarea
                  name="description"
                  placeholder="Optional description"
                  value={serviceFormData.description}
                  onChange={handleServiceChange}
                  rows="3"
                  className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={serviceFormData.isActive}
                  onChange={handleServiceChange}
                  className="w-5 h-5 rounded cursor-pointer"
                />
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Mark as Active
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2.5 rounded-xl bg-[#137fec] hover:bg-blue-600 text-white font-semibold text-sm transition-colors ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                {editingDoctor ? 'Edit Doctor' : 'Add Doctor'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitDoctor} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={doctorFormData.name}
                  onChange={handleDoctorChange}
                  required
                  className="col-span-2 px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  name="specialization"
                  placeholder="Specialization"
                  value={doctorFormData.specialization}
                  onChange={handleDoctorChange}
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  name="qualification"
                  placeholder="Qualification (BDS/MDS)"
                  value={doctorFormData.qualification}
                  onChange={handleDoctorChange}
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={doctorFormData.email}
                  onChange={handleDoctorChange}
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone"
                  value={doctorFormData.phone}
                  onChange={handleDoctorChange}
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  name="license_number"
                  placeholder="License Number"
                  value={doctorFormData.license_number}
                  onChange={handleDoctorChange}
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
                <input
                  type="number"
                  name="experience_years"
                  placeholder="Years of Experience"
                  value={doctorFormData.experience_years}
                  onChange={handleDoctorChange}
                  min="0"
                  className="px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={doctorFormData.is_active}
                  onChange={handleDoctorChange}
                  className="w-5 h-5 rounded cursor-pointer"
                />
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Mark as Active
                </label>
              </div>

              {/* Availability */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Weekly Availability</h4>
                <div className="space-y-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                    <div key={day} className="flex items-center gap-3">
                      <label className="w-24 text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                        {day}
                      </label>
                      <input
                        type="time"
                        name={`availability_${day}_start`}
                        value={doctorFormData.availability[day]?.start || ''}
                        onChange={handleDoctorChange}
                        className="flex-1 px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                      />
                      <span className="text-slate-500">to</span>
                      <input
                        type="time"
                        name={`availability_${day}_end`}
                        value={doctorFormData.availability[day]?.end || ''}
                        onChange={handleDoctorChange}
                        className="flex-1 px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <textarea
                name="notes"
                placeholder="Additional Notes"
                value={doctorFormData.notes}
                onChange={handleDoctorChange}
                rows="3"
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 resize-none"
              />

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2.5 rounded-xl bg-[#137fec] hover:bg-blue-600 text-white font-semibold text-sm transition-colors ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Saving...' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
