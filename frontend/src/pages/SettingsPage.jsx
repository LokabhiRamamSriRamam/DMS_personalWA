import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Download, Upload, Mail, CheckCircle, XCircle, RefreshCw, Pill, FileSpreadsheet, ExternalLink, Loader2, Calendar, Clock, Globe } from 'lucide-react';
import API from '../services/api';
import EmailTemplateEditorModal from '../modals/EmailTemplateEditorModal';
import { useInventorySettings } from '../Context/SettingsContext';

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function ToggleSwitch({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-[#137fec]' : 'bg-slate-300 dark:bg-slate-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function MedicineFormModal({ medicine, onClose, onSave }) {
  const [form, setForm] = useState({
    name: medicine?.name || '',
    composition: medicine?.composition || '',
    manufacturer: medicine?.manufacturer || '',
    category: medicine?.category || '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (medicine?._id) {
        await API.put(`/inventory/${medicine._id}`, form);
      } else {
        await API.post('/inventory', { ...form, type: 'Pharmacy' });
      }
      onSave();
      onClose();
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
            {medicine?._id ? 'Edit Medicine' : 'Add Medicine'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Name <span className="text-red-500">*</span></label>
            <input
              required
              autoFocus
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Composition</label>
            <input
              type="text"
              value={form.composition}
              onChange={e => setForm({ ...form, composition: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Manufacturer</label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={e => setForm({ ...form, manufacturer: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Antibiotic"
                className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-[#137fec] text-white text-sm font-bold hover:bg-blue-600 disabled:opacity-60">
              {saving ? 'Saving…' : medicine?._id ? 'Update' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkUploadModal({ onClose, onSuccess }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const res = await API.post('/inventory/bulk-upload-medicines', { sheetUrl: sheetUrl.trim() });
      setResult(res.data);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-green-600" />
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Bulk Upload via Google Sheets</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
            <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">How to use:</p>
            <ol className="list-decimal pl-5 space-y-1 text-slate-700 dark:text-slate-300">
              <li>Create a Google Sheet with these column headers in row 1:
                <div className="mt-1 font-mono text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                  name | composition | manufacturer | category
                </div>
                <span className="text-xs text-slate-500">Only <b>name</b> is required.</span>
              </li>
              <li>Click <b>Share → General access</b> → set to <b>"Anyone with the link"</b> (Viewer).</li>
              <li>Copy the URL and paste it below.</li>
            </ol>
            <a
              href="https://docs.google.com/spreadsheets/create"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-[#137fec] font-semibold text-xs hover:underline"
            >
              <ExternalLink size={12} /> Create a new Google Sheet
            </a>
          </div>

          {!result && (
            <form onSubmit={submit}>
              <label className="text-xs font-bold text-slate-500 uppercase">Google Sheets URL</label>
              <input
                autoFocus
                required
                type="url"
                value={sheetUrl}
                onChange={e => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800"
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={uploading} className="px-5 py-2 rounded-lg bg-[#137fec] text-white text-sm font-bold hover:bg-blue-600 disabled:opacity-60 flex items-center gap-2">
                  {uploading ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : <><Upload size={14} /> Import</>}
                </button>
              </div>
            </form>
          )}

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.inserted}</p>
                  <p className="text-xs text-slate-500 uppercase">Imported</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                  <p className="text-xs text-slate-500 uppercase">Skipped</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{result.total}</p>
                  <p className="text-xs text-slate-500 uppercase">Total Rows</p>
                </div>
              </div>
              {result.skippedDetails?.length > 0 && (
                <details className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-sm">
                  <summary className="font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                    View skipped rows ({result.skippedDetails.length})
                  </summary>
                  <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto pl-2">
                    {result.skippedDetails.map((s, i) => (
                      <li key={i} className="text-xs text-slate-500">
                        <b>{s.name || '(no name)'}</b> — {s.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="flex justify-end pt-2">
                <button onClick={onClose} className="px-5 py-2 rounded-lg bg-[#137fec] text-white text-sm font-bold hover:bg-blue-600">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InventoryTab() {
  const { inventorySettings, refreshInventorySettings } = useInventorySettings();
  const [savingToggle, setSavingToggle] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [loadingMeds, setLoadingMeds] = useState(false);
  const [search, setSearch] = useState('');
  const [editingMedicine, setEditingMedicine] = useState(null); // null | {} | object
  const [showBulkModal, setShowBulkModal] = useState(false);

  const updateToggle = async (key, value) => {
    setSavingToggle(true);
    try {
      await API.put('/inventory/settings', { [key]: value });
      await refreshInventorySettings();
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingToggle(false);
    }
  };

  const fetchMedicines = async () => {
    setLoadingMeds(true);
    try {
      const res = await API.get('/inventory');
      setMedicines((res.data || []).filter(i => i.type === 'Pharmacy'));
    } catch (err) {
      console.error('Failed to load medicines', err);
    } finally {
      setLoadingMeds(false);
    }
  };

  useEffect(() => {
    if (!inventorySettings.medicineEnabled) fetchMedicines();
  }, [inventorySettings.medicineEnabled]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this medicine?')) return;
    try {
      await API.delete(`/inventory/${id}`);
      fetchMedicines();
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredMedicines = medicines.filter(m =>
    !search || `${m.name} ${m.composition || ''} ${m.manufacturer || ''} ${m.category || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toggles */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Inventory Modules</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Disable modules you don't track. Disabling Medicine Inventory hides stock tracking and
          invoice charges, but the medicine list below is still used for prescriptions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Pill size={20} className="text-[#137fec]" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">Medicine Inventory</p>
                <p className="text-xs text-slate-500">Track pharmacy stock & charge in invoices</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={inventorySettings.medicineEnabled}
              onChange={(v) => updateToggle('medicineEnabled', v)}
              disabled={savingToggle}
            />
          </div>
          <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                <FileSpreadsheet size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">Consumable Inventory</p>
                <p className="text-xs text-slate-500">Track consumables used per treatment</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={inventorySettings.consumableEnabled}
              onChange={(v) => updateToggle('consumableEnabled', v)}
              disabled={savingToggle}
            />
          </div>
        </div>
      </div>

      {/* Medicine List — only visible when Medicine Inventory is OFF */}
      {!inventorySettings.medicineEnabled && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Medicine List</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Used for prescriptions in the Treatment page. ({medicines.length} medicines)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-md"
              >
                <FileSpreadsheet size={16} /> Bulk Upload
              </button>
              <button
                onClick={() => setEditingMedicine({})}
                className="flex items-center gap-2 px-4 py-2 bg-[#137fec] hover:bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md"
              >
                <Plus size={16} /> Add Medicine
              </button>
            </div>
          </div>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, composition, manufacturer or category…"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 mb-4"
          />

          {loadingMeds ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#137fec]" /></div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {medicines.length === 0 ? 'No medicines yet. Add one or bulk-upload via Google Sheets.' : 'No medicines match your search.'}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Composition</th>
                    <th className="px-4 py-3 text-left">Manufacturer</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMedicines.map(m => (
                    <tr key={m._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{m.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.composition || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.manufacturer || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.category || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditingMedicine(m)} className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-[#137fec]">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(m._id)} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600">
                            <Trash2 size={15} />
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

      {editingMedicine && (
        <MedicineFormModal
          medicine={editingMedicine}
          onClose={() => setEditingMedicine(null)}
          onSave={fetchMedicines}
        />
      )}
      {showBulkModal && (
        <BulkUploadModal
          onClose={() => setShowBulkModal(false)}
          onSuccess={fetchMedicines}
        />
      )}
    </div>
  );
}

// ─── Email Tab ────────────────────────────────────────────────────────────────

const EVENT_LABELS = {
  appointmentBooked:    'Appointment Booked',
  appointmentCompleted: 'Appointment Completed',
};

const COMPLETION_DOCS = [
  { key: 'smartReport',  label: 'Smart Report',  sub: 'Treatments, notes & visit summary PDF' },
  { key: 'prescription', label: 'Prescription',  sub: 'Medication list from the visit' },
  { key: 'invoice',      label: 'Invoice',        sub: 'Latest invoice for this patient' },
  { key: 'aiReport',     label: 'AI Report',      sub: 'Most recent AI-generated clinical report' },
];

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
  const [saveBanner, setSaveBanner] = useState(null); // null | { ok, msg }
  const [showGuide, setShowGuide] = useState(false);

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
    setSaveBanner(null);
    try {
      await API.put('/email/settings', smtpForm);
      await fetchSettings();
      setSaveBanner({ ok: true, msg: 'Settings saved successfully.' });
    } catch (err) {
      const raw = err.response?.data?.error || err.message || 'Unknown error';
      const hint = raw.includes('ECONNREFUSED')
        ? `${raw} — Check that your SMTP host and port are correct.`
        : raw.includes('535') || raw.includes('Invalid login')
        ? `${raw} — Authentication failed. For Gmail, use an App Password (not your account password).`
        : raw.includes('ETIMEDOUT')
        ? `${raw} — Connection timed out. Check your SMTP host, port, and firewall.`
        : raw;
      setSaveBanner({ ok: false, msg: hint });
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
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowGuide(g => !g)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📖</span>
                    <div>
                      <p className="text-sm font-bold text-blue-800">How to connect Gmail — Step by step</p>
                      <p className="text-xs text-blue-600">Gmail blocks regular passwords — you need a special App Password</p>
                    </div>
                  </div>
                  <span className="text-blue-500 font-bold text-lg leading-none">{showGuide ? '▲' : '▼'}</span>
                </button>
                {showGuide && (
                  <div className="border-t border-blue-200 px-4 py-5 space-y-4 text-sm text-slate-700 bg-white">

                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                      <strong>Why App Password?</strong> Google blocks sign-ins from apps using your regular Gmail password as a security measure. An App Password is a special 16-character code generated only for this app — it cannot be used to log into your Google account.
                    </div>

                    <ol className="space-y-4">
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#137fec] text-white text-xs font-bold flex items-center justify-center">1</span>
                        <div>
                          <p className="font-semibold">Open your Google Account</p>
                          <p className="text-xs text-slate-500 mt-0.5">In any browser, go to <span className="font-mono bg-slate-100 px-1 rounded border border-slate-200">myaccount.google.com</span> and sign in with the Gmail account you want to send emails from.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#137fec] text-white text-xs font-bold flex items-center justify-center">2</span>
                        <div>
                          <p className="font-semibold">Go to Security settings</p>
                          <p className="text-xs text-slate-500 mt-0.5">In the left sidebar click <strong>Security</strong>. Scroll down to the section titled <strong>"How you sign in to Google"</strong>.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#137fec] text-white text-xs font-bold flex items-center justify-center">3</span>
                        <div>
                          <p className="font-semibold">Enable 2-Step Verification</p>
                          <p className="text-xs text-slate-500 mt-0.5">Click <strong>2-Step Verification</strong> and follow the steps to turn it on. You can use SMS or the Google Authenticator app. <span className="text-red-500 font-medium">This step is mandatory</span> — App Passwords are hidden until 2-Step Verification is active.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#137fec] text-white text-xs font-bold flex items-center justify-center">4</span>
                        <div>
                          <p className="font-semibold">Find App Passwords</p>
                          <p className="text-xs text-slate-500 mt-0.5">Go back to <span className="font-mono bg-slate-100 px-1 rounded border border-slate-200">myaccount.google.com</span>, click the <strong>search bar at the top</strong> of the page and type <strong>"App Passwords"</strong>. Click the result that appears.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#137fec] text-white text-xs font-bold flex items-center justify-center">5</span>
                        <div>
                          <p className="font-semibold">Generate a new App Password</p>
                          <p className="text-xs text-slate-500 mt-0.5">In the <strong>"App name"</strong> field type <strong>Dental DMS</strong> and click <strong>Create</strong>. Google will show you a 16-character password like <span className="font-mono bg-slate-100 px-1 rounded border border-slate-200">abcd efgh ijkl mnop</span>.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#137fec] text-white text-xs font-bold flex items-center justify-center">6</span>
                        <div>
                          <p className="font-semibold">Fill in the fields below</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            <strong>Email / SMTP Username</strong> = your full Gmail address (e.g. <span className="font-mono">clinic@gmail.com</span>)<br/>
                            <strong>App Password</strong> = the 16-character code (spaces don't matter, copy it as-is)<br/>
                            <strong>From Name</strong> = what patients will see as the sender (e.g. "City Dental Clinic")<br/>
                            Host, Port and TLS are pre-filled correctly — do not change them.
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#137fec] text-white text-xs font-bold flex items-center justify-center">7</span>
                        <div>
                          <p className="font-semibold">Turn on "Enable Email Delivery" and save</p>
                          <p className="text-xs text-slate-500 mt-0.5">Toggle <strong>Enable Email Delivery</strong> to ON — this is the master switch that allows the system to actually send emails. Then click <strong>Save Settings</strong>.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#137fec] text-white text-xs font-bold flex items-center justify-center">8</span>
                        <div>
                          <p className="font-semibold">Verify with a test email</p>
                          <p className="text-xs text-slate-500 mt-0.5">Scroll down to <strong>Send a Test Email</strong>, enter your own email address and click <strong>Send Test</strong>. If it arrives in your inbox, you're all set. If it fails, the error message will tell you exactly what's wrong.</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#137fec] text-white text-xs font-bold flex items-center justify-center">9</span>
                        <div>
                          <p className="font-semibold">Set up automatic emails (optional)</p>
                          <p className="text-xs text-slate-500 mt-0.5">Once the test passes, go to the <strong>Automation</strong> tab (next to Connection at the top) to configure which emails are sent automatically — e.g. when an invoice is generated or an AI report is ready.</p>
                        </div>
                      </li>
                    </ol>

                    <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 border border-slate-200 space-y-0.5">
                      <p><strong>Host:</strong> smtp.gmail.com &nbsp;·&nbsp; <strong>Port:</strong> 465 &nbsp;·&nbsp; <strong>TLS:</strong> On (pre-filled, do not change)</p>
                      <p><strong>Tip:</strong> Check your Spam folder if the test email doesn't arrive in inbox.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {smtpForm.mode === 'custom' && (
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-700 mb-1">Common SMTP settings</p>
                <p><strong>Outlook / Office 365:</strong> smtp.office365.com · Port 587 · TLS off</p>
                <p><strong>Yahoo Mail:</strong> smtp.mail.yahoo.com · Port 465 · TLS on</p>
                <p><strong>Zoho Mail:</strong> smtp.zoho.in · Port 465 · TLS on</p>
                <p><strong>SendGrid:</strong> smtp.sendgrid.net · Port 587 · user = apikey</p>
              </div>
            )}
          </div>

          {/* Enable toggle */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div
              onClick={() => setSmtpForm(f => ({ ...f, enabled: !f.enabled }))}
              className={`mt-0.5 flex-shrink-0 w-10 h-5 rounded-full relative transition-colors cursor-pointer ${smtpForm.enabled ? 'bg-[#137fec]' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${smtpForm.enabled ? 'left-5' : 'left-0.5'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Enable Email Delivery</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                This is the master on/off switch for all emails sent by the system. When <strong>ON</strong>, the system can send treatment summaries, invoices and AI reports to patients. When <strong>OFF</strong>, no emails are sent even if your SMTP credentials are saved — useful if you want to configure first and enable later, or temporarily pause emails without losing your settings.
              </p>
            </div>
          </div>

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

          {saveBanner && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
              saveBanner.ok
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {saveBanner.ok
                ? <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />
                : <XCircle    size={14} className="mt-0.5 flex-shrink-0" />}
              {saveBanner.msg}
            </div>
          )}

          {/* Test send */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Verify with a Test Email</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">After saving your settings, send a test email to confirm everything is working. Enter your own email address below and click <strong>Send Test</strong>. If it arrives in your inbox your setup is complete. Check your <strong>Spam folder</strong> if you don't see it within a minute. If it fails, the error message will tell you exactly what to fix.</p>
            </div>
            <div className="flex gap-2">
              <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" className={`${inputCls} flex-1`} />
              <button onClick={sendTestEmail} disabled={testStatus === 'sending'} className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60">
                {testStatus === 'sending' ? 'Sending…' : 'Send Test'}
              </button>
            </div>
            {testStatus === 'ok' && <p className="mt-1 text-sm text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Test email sent successfully — check your inbox.</p>}
            {testStatus === 'fail' && <p className="mt-1 text-sm text-red-600 flex items-center gap-1"><XCircle size={14} /> {testError}</p>}
          </div>
        </div>
      )}

      {/* ── Automation ── */}
      {emailSubTab === 'automation' && (
        <div className="max-w-lg space-y-6">

          {/* Explainer guide */}
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <p className="text-sm font-bold text-green-800">What is Automation?</p>
            </div>
            <p className="text-xs text-green-700 leading-relaxed">
              Automation lets the system send emails to patients <strong>automatically</strong> — without you having to click anything. For example, the moment an invoice is created, the patient gets a copy by email. Or when an AI Report is generated, it is emailed directly to the patient.
            </p>
            <div className="bg-white border border-green-100 rounded-lg p-3 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <p><strong>Prerequisites before using Automation:</strong></p>
              <p>✅ Gmail (or SMTP) must be connected and tested in the <strong>Connection</strong> tab</p>
              <p>✅ <strong>Enable Email Delivery</strong> must be turned ON in the Connection tab</p>
              <p>✅ The <strong>Automation Master Switch</strong> below must be turned ON</p>
              <p>✅ Each individual event (Invoice, AI Report, etc.) must also be turned ON</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              If Automation is <strong>OFF</strong>, emails are not sent automatically — the doctor can still send them manually using the <strong>Send Mail</strong> button on the Treatment page.
            </p>
          </div>

          {/* Master toggles */}
          <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <div onClick={() => setSmtpForm(f => ({ ...f, automationEnabled: !f.automationEnabled }))} className={`mt-0.5 flex-shrink-0 w-10 h-5 rounded-full relative transition-colors cursor-pointer ${smtpForm.automationEnabled ? 'bg-[#137fec]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${smtpForm.automationEnabled ? 'left-5' : 'left-0.5'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Automation Master Switch</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">The global on/off for all automatic emails. Individual event switches below only work when this is ON. Turn this OFF to pause all automated emails instantly without losing your per-event settings.</p>
              </div>
            </div>
          </div>

          {/* Per-event explainer */}
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed space-y-1">
            <p className="font-semibold text-slate-600">Per-event settings</p>
            <p><strong>Toggle</strong> — Turn individual events on or off. For example, you may want to auto-send invoices but not AI reports.</p>
            <p><strong>Delay (minutes)</strong> — How many minutes after the event to wait before sending. Set to 0 to send immediately. Useful if you want to review before the email goes out.</p>
          </div>

          {/* Per-event toggles */}
          <div className="space-y-4">
            {Object.keys(EVENT_LABELS).map(event => (
              <div key={event} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{EVENT_LABELS[event]}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {event === 'appointmentBooked'    && 'Sends a confirmation email when a new appointment is created'}
                      {event === 'appointmentCompleted' && 'Sends a summary email with selected documents when an appointment is marked Completed'}
                    </p>
                  </div>
                  <div
                    onClick={() => setSmtpForm(f => ({
                      ...f,
                      events: { ...f.events, [event]: { ...f.events[event], enabled: !f.events[event]?.enabled } }
                    }))}
                    className={`flex-shrink-0 w-10 h-5 rounded-full relative transition-colors cursor-pointer ${smtpForm.events?.[event]?.enabled ? 'bg-[#137fec]' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${smtpForm.events?.[event]?.enabled ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </div>

                {/* Delay */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 whitespace-nowrap">Send after (minutes):</label>
                  <input
                    type="number" min="0"
                    value={smtpForm.events?.[event]?.delayMinutes || 0}
                    onChange={e => setSmtpForm(f => ({
                      ...f,
                      events: { ...f.events, [event]: { ...f.events[event], delayMinutes: Number(e.target.value) } }
                    }))}
                    className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none"
                  />
                  <span className="text-xs text-slate-400">0 = immediately</span>
                </div>

                {/* Document selection — only for appointmentCompleted */}
                {event === 'appointmentCompleted' && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Documents to attach</p>
                    {COMPLETION_DOCS.map(doc => (
                      <label key={doc.key} className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smtpForm.events?.appointmentCompleted?.include?.[doc.key] ?? false}
                          onChange={() => setSmtpForm(f => ({
                            ...f,
                            events: {
                              ...f.events,
                              appointmentCompleted: {
                                ...f.events?.appointmentCompleted,
                                include: {
                                  ...f.events?.appointmentCompleted?.include,
                                  [doc.key]: !f.events?.appointmentCompleted?.include?.[doc.key],
                                },
                              },
                            },
                          }))}
                          className="accent-[#137fec] w-4 h-4 mt-0.5 flex-shrink-0"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{doc.label}</p>
                          <p className="text-xs text-slate-400">{doc.sub}</p>
                        </div>
                      </label>
                    ))}
                    <p className="text-xs text-slate-400 pt-1">Only documents that exist for the patient at the time of completion will be attached. If none exist, the email is skipped.</p>
                  </div>
                )}
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
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-slate-700">Email Templates</p>
            <button onClick={() => setTemplateModal('new')} className="flex items-center gap-2 px-4 py-2 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors">
              <Plus size={16} /> New Template
            </button>
          </div>

          {/* Guide card */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs text-slate-600">
            <p className="text-sm font-bold text-slate-700">How templates work</p>
            <p className="leading-relaxed">Templates define the <strong>subject line and body text</strong> of the email. They apply to both automated emails (when an appointment is completed) and the manual <strong>Send Mail</strong> button on the Treatment page. The selected PDF documents (Smart Report, Invoice, etc.) are attached automatically — you only write the message here.</p>
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
              <p className="font-bold text-slate-700">Available variables — type these in your subject or body:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  ['{{name}}',        'Patient full name (e.g. Rahul Sharma)'],
                  ['{{first_name}}',  'Patient first name only (e.g. Rahul)'],
                  ['{{doctor}}',      'Doctor\'s name'],
                  ['{{date}}',        'Today\'s date (e.g. 12 May 2026)'],
                  ['{{treatments}}',  'Comma-separated treatment names from the visit'],
                ].map(([v, d]) => (
                  <div key={v} className="flex gap-2 items-start">
                    <code className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-mono text-xs flex-shrink-0">{v}</code>
                    <span className="text-slate-500">{d}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-slate-400">Each event can have one active template per language. If no template is set for an event, a sensible default message is used automatically.</p>
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

// ─── Booking: Day Row ─────────────────────────────────────────────────────────

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function DayRow({ day, dayData = {}, onChange }) {
  const breaks = dayData.breaks || [];
  const addBreak = () => onChange(day, 'breaks', [...breaks, { start: '13:00', end: '14:00' }]);
  const removeBreak = (i) => onChange(day, 'breaks', breaks.filter((_, idx) => idx !== i));
  const updateBreak = (i, field, val) => {
    const updated = [...breaks];
    updated[i] = { ...updated[i], [field]: val };
    onChange(day, 'breaks', updated);
  };
  return (
    <div className="py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer w-28">
          <input type="checkbox" checked={!!dayData.isOpen} onChange={e => onChange(day, 'isOpen', e.target.checked)} className="w-4 h-4 rounded accent-[#137fec]" />
          <span className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">{day}</span>
        </label>
        {dayData.isOpen ? (
          <>
            <input type="time" value={dayData.start || '09:00'} onChange={e => onChange(day, 'start', e.target.value)}
              className="px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
            <span className="text-slate-400 text-sm">to</span>
            <input type="time" value={dayData.end || '17:00'} onChange={e => onChange(day, 'end', e.target.value)}
              className="px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
            <button type="button" onClick={addBreak} className="text-xs text-[#137fec] hover:underline ml-1">+ Add Break</button>
          </>
        ) : (
          <span className="text-xs text-slate-400 italic">Closed</span>
        )}
      </div>
      {dayData.isOpen && breaks.map((brk, i) => (
        <div key={i} className="flex items-center gap-2 ml-32 mt-1.5 text-xs text-slate-600 dark:text-slate-400">
          <Clock size={12} className="text-slate-400" />
          <span>Break:</span>
          <input type="time" value={brk.start} onChange={e => updateBreak(i, 'start', e.target.value)}
            className="px-1.5 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800" />
          <span>–</span>
          <input type="time" value={brk.end} onChange={e => updateBreak(i, 'end', e.target.value)}
            className="px-1.5 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800" />
          <button onClick={() => removeBreak(i)} className="text-red-400 hover:text-red-600 ml-1"><X size={12} /></button>
        </div>
      ))}
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

  // Booking settings state
  const defaultDay = (open, start = '09:00', end = '17:00') => ({ isOpen: open, start, end, breaks: [] });
  const [bookingSettings, setBookingSettings] = useState({
    isBookingEnabled: false,
    slotDurationMinutes: 30,
    clinicDisplayName: '',
    clinicTagline: '',
    clinicLogoUrl: '',
    workingHours: {
      monday:    defaultDay(true),
      tuesday:   defaultDay(true),
      wednesday: defaultDay(true),
      thursday:  defaultDay(true),
      friday:    defaultDay(true),
      saturday:  defaultDay(true, '10:00', '14:00'),
      sunday:    defaultDay(false),
    },
    blockedDates: [],
  });
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedReason, setNewBlockedReason] = useState('');

  // Doctor schedule state
  const [bookingDoctors, setBookingDoctors] = useState([]);
  const [doctorSchedModal, setDoctorSchedModal] = useState({ open: false, doctor: null });
  const [scheduleForm, setScheduleForm] = useState(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'doctors') {
      fetchDoctors();
    } else if (activeTab === 'treatment') {
      fetchTreatmentData();
    } else if (activeTab === 'services') {
      fetchServices();
    } else if (activeTab === 'booking') {
      fetchBookingSettings();
    } else if (activeTab === 'doctorSchedules') {
      fetchBookingDoctors();
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

  // ── Booking settings ──
  const fetchBookingSettings = async () => {
    setBookingLoading(true);
    try {
      const res = await API.get('/settings/booking');
      if (res.data && Object.keys(res.data).length > 0) {
        // Strip Mongoose metadata before merging into state
        const { _id, __v, createdAt, updatedAt, ...data } = res.data;
        setBookingSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to load booking settings:', err);
      alert('Failed to load booking settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSaveBookingSettings = async () => {
    setBookingSaving(true);
    try {
      // Strip any stale Mongoose metadata before sending
      const { _id, __v, createdAt, updatedAt, ...payload } = bookingSettings;
      const res = await API.put('/settings/booking', payload);
      // Update state with what the server confirmed (strips metadata)
      const { _id: i2, __v: v2, createdAt: c2, updatedAt: u2, ...saved } = res.data;
      setBookingSettings(prev => ({ ...prev, ...saved }));
      alert('Booking settings saved!');
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.message || err.message));
    } finally {
      setBookingSaving(false);
    }
  };

  const updateWorkingHourField = (day, field, value) => {
    setBookingSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: { ...prev.workingHours[day], [field]: value },
      },
    }));
  };

  // Saves ONLY blockedDates — never touches isBookingEnabled or other fields
  const saveBlockedDates = async (newList) => {
    try {
      await API.put('/settings/booking', { blockedDates: newList });
    } catch (err) {
      alert('Failed to save blocked date: ' + (err.response?.data?.message || err.message));
    }
  };

  const addBlockedDate = async () => {
    if (!newBlockedDate) return;
    const newList = [...(bookingSettings.blockedDates || []), { date: newBlockedDate, reason: newBlockedReason }];
    setBookingSettings(prev => ({ ...prev, blockedDates: newList }));
    setNewBlockedDate('');
    setNewBlockedReason('');
    await saveBlockedDates(newList);
  };

  const removeBlockedDate = async (i) => {
    const newList = bookingSettings.blockedDates.filter((_, idx) => idx !== i);
    setBookingSettings(prev => ({ ...prev, blockedDates: newList }));
    await saveBlockedDates(newList);
  };

  // Parse a date value (ISO string or YYYY-MM-DD) without UTC timezone shift
  const formatBlockedDate = (dateVal) => {
    const str = typeof dateVal === 'string' ? dateVal.slice(0, 10) : new Date(dateVal).toISOString().slice(0, 10);
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // ── Doctor schedules ──
  const fetchBookingDoctors = async () => {
    try {
      const res = await API.get('/doctors');
      setBookingDoctors(res.data);
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }
  };

  const openDoctorSchedule = async (doctor) => {
    try {
      const res = await API.get(`/settings/doctors/${doctor._id}/schedule`);
      const s = res.data || {};
      const dd = (open, start = '09:00', end = '17:00') => ({ isOpen: open, start, end, breaks: [] });
      // Merge server values with defaults per-day so no day key is ever missing
      const defaultWH = {
        monday: dd(true), tuesday: dd(true), wednesday: dd(true),
        thursday: dd(true), friday: dd(true),
        saturday: dd(true, '10:00', '14:00'), sunday: dd(false),
      };
      const serverWH = s.bookingWorkingHours || {};
      const mergedWH = {};
      for (const day of Object.keys(defaultWH)) {
        mergedWH[day] = { ...defaultWH[day], ...(serverWH[day] || {}) };
        mergedWH[day].breaks = serverWH[day]?.breaks || [];
      }
      setScheduleForm({
        isBookable:          s.isBookable ?? false,
        bookingWorkingHours: mergedWH,
        holidays:            s.holidays    || [],
        blockedSlots:        s.blockedSlots || [],
      });
      setDoctorSchedModal({ open: true, doctor });
    } catch (err) {
      alert('Failed to load schedule: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveDoctorSchedule = async () => {
    setScheduleSaving(true);
    try {
      // Only send the four schedule fields — no Mongoose metadata
      const payload = {
        isBookable:          scheduleForm.isBookable,
        bookingWorkingHours: scheduleForm.bookingWorkingHours,
        holidays:            scheduleForm.holidays,
        blockedSlots:        scheduleForm.blockedSlots,
      };
      await API.put(`/settings/doctors/${doctorSchedModal.doctor._id}/schedule`, payload);
      setBookingDoctors(prev => prev.map(d =>
        d._id === doctorSchedModal.doctor._id ? { ...d, isBookable: scheduleForm.isBookable } : d
      ));
      setDoctorSchedModal({ open: false, doctor: null });
      alert('Schedule saved!');
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.message || err.message));
    } finally {
      setScheduleSaving(false);
    }
  };

  const updateSchedDayField = (day, field, value) => {
    setScheduleForm(prev => ({
      ...prev,
      bookingWorkingHours: {
        ...prev.bookingWorkingHours,
        [day]: { ...prev.bookingWorkingHours[day], [field]: value },
      },
    }));
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
    setDoctorFormData({ ...doctor, phone: (doctor.phone || '').replace(/^\+91/, '') });
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
      const doctorPayload = { ...doctorFormData, phone: doctorFormData.phone ? `+91${doctorFormData.phone}` : '' };
      if (editingDoctor) {
        const res = await API.put(`/doctors/${editingDoctor._id}`, doctorPayload);
        setDoctors(doctors.map(d => d._id === editingDoctor._id ? res.data : d));
      } else {
        const res = await API.post('/doctors', doctorPayload);
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
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'inventory'
                ? 'text-[#137fec] border-b-2 border-[#137fec]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Inventory
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
          <button
            onClick={() => setActiveTab('booking')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'booking'
                ? 'text-[#137fec] border-b-2 border-[#137fec]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Online Booking
          </button>
          <button
            onClick={() => setActiveTab('doctorSchedules')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'doctorSchedules'
                ? 'text-[#137fec] border-b-2 border-[#137fec]'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Doctor Schedules
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
        {/* Inventory Tab */}
        {activeTab === 'inventory' && <InventoryTab />}

        {/* Email Tab */}
        {activeTab === 'email' && <EmailTab />}

        {/* Online Booking Tab */}
        {activeTab === 'booking' && (
          <div className="space-y-6">
            {bookingLoading ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : (
              <>
                {/* General Settings */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Globe size={22} className="text-[#137fec]" />
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">General</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-5">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">Enable Online Booking</p>
                        <p className="text-xs text-slate-500 mt-0.5">Allow patients to book appointments via the public link</p>
                      </div>
                      <ToggleSwitch
                        enabled={bookingSettings.isBookingEnabled}
                        onChange={v => setBookingSettings(p => ({ ...p, isBookingEnabled: v }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Clinic Display Name</label>
                        <input type="text" value={bookingSettings.clinicDisplayName || ''} placeholder="e.g. Bright Smiles Dental"
                          onChange={e => setBookingSettings(p => ({ ...p, clinicDisplayName: e.target.value }))}
                          className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Slot Duration (minutes)</label>
                        <select value={bookingSettings.slotDurationMinutes || 30}
                          onChange={e => setBookingSettings(p => ({ ...p, slotDurationMinutes: Number(e.target.value) }))}
                          className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                          {[15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} min</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tagline</label>
                        <input type="text" value={bookingSettings.clinicTagline || ''} placeholder="e.g. Your smile is our priority"
                          onChange={e => setBookingSettings(p => ({ ...p, clinicTagline: e.target.value }))}
                          className="w-full mt-1 px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#137fec] outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock size={22} className="text-[#137fec]" />
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Clinic Working Hours</h2>
                    <span className="text-xs text-slate-400 ml-1">(default schedule — override per doctor in Doctor Schedules tab)</span>
                  </div>
                  {DAYS.map(day => (
                    <DayRow key={day} day={day} dayData={bookingSettings.workingHours?.[day] || {}} onChange={updateWorkingHourField} />
                  ))}
                </div>

                {/* Blocked Dates */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar size={22} className="text-[#137fec]" />
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Blocked Dates</h2>
                  </div>
                  <div className="flex gap-3 mb-4 flex-wrap sm:flex-nowrap">
                    <input type="date" value={newBlockedDate} onChange={e => setNewBlockedDate(e.target.value)}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#137fec] outline-none w-full sm:w-auto" />
                    <input type="text" value={newBlockedReason} onChange={e => setNewBlockedReason(e.target.value)}
                      placeholder="Reason (optional, e.g. Public Holiday)"
                      onKeyDown={e => e.key === 'Enter' && addBlockedDate()}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#137fec] outline-none w-full sm:w-auto" />
                    <button onClick={addBlockedDate} disabled={!newBlockedDate}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#137fec] text-white rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-40 transition-colors whitespace-nowrap">
                      <Plus size={16} /> Add Date
                    </button>
                  </div>
                  {(bookingSettings.blockedDates || []).length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No blocked dates. The clinic is open every working day.</p>
                  ) : (
                    <div className="space-y-2">
                      {bookingSettings.blockedDates.map((bd, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl">
                          <div>
                            <span className="font-semibold text-sm text-slate-800 dark:text-white">{formatBlockedDate(bd.date)}</span>
                            {bd.reason && <span className="ml-3 text-xs text-slate-500">{bd.reason}</span>}
                          </div>
                          <button onClick={() => removeBlockedDate(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <X size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button onClick={handleSaveBookingSettings} disabled={bookingSaving}
                    className="px-8 py-3 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-60">
                    {bookingSaving ? 'Saving...' : 'Save Booking Settings'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Doctor Schedules Tab */}
        {activeTab === 'doctorSchedules' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar size={22} className="text-[#137fec]" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Doctor Booking Schedules</h2>
              <span className="text-xs text-slate-400 ml-1">Configure per-doctor availability for online booking</span>
            </div>
            {bookingDoctors.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No doctors added yet. Add doctors in the Doctors tab first.</p>
            ) : (
              <div className="space-y-3">
                {bookingDoctors.map(doctor => (
                  <div key={doctor._id} className="flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{doctor.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{doctor.specialization || 'General'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${doctor.isBookable ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                        {doctor.isBookable ? 'Bookable' : 'Not Bookable'}
                      </span>
                      <button onClick={() => openDoctorSchedule(doctor)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#137fec] text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors">
                        <Edit2 size={14} /> Configure
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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

      {/* Doctor Schedule Modal */}
      {doctorSchedModal.open && scheduleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Booking Schedule — {doctorSchedModal.doctor?.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Configure working hours for online bookings</p>
              </div>
              <button onClick={() => setDoctorSchedModal({ open: false, doctor: null })}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Bookable Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">Bookable Online</p>
                  <p className="text-xs text-slate-500">Show this doctor as an option in the public booking page</p>
                </div>
                <ToggleSwitch
                  enabled={scheduleForm.isBookable}
                  onChange={v => setScheduleForm(p => ({ ...p, isBookable: v }))}
                />
              </div>

              {/* Working Hours */}
              {scheduleForm.isBookable && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Working Hours</h4>
                  {DAYS.map(day => (
                    <DayRow key={day} day={day} dayData={scheduleForm.bookingWorkingHours?.[day] || {}} onChange={updateSchedDayField} />
                  ))}
                </div>
              )}

              {/* Holidays */}
              {scheduleForm.isBookable && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Holidays / Days Off</h4>
                    <button type="button" onClick={() => setScheduleForm(p => ({ ...p, holidays: [...p.holidays, { date: '', reason: '' }] }))}
                      className="text-xs text-[#137fec] hover:underline flex items-center gap-1">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {scheduleForm.holidays.length === 0 && <p className="text-xs text-slate-400 italic">No holidays configured.</p>}
                  {scheduleForm.holidays.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input type="date" value={h.date ? h.date.slice(0, 10) : ''}
                        onChange={e => { const hs = [...scheduleForm.holidays]; hs[i] = { ...hs[i], date: e.target.value }; setScheduleForm(p => ({ ...p, holidays: hs })); }}
                        className="px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
                      <input type="text" value={h.reason || ''} placeholder="Reason"
                        onChange={e => { const hs = [...scheduleForm.holidays]; hs[i] = { ...hs[i], reason: e.target.value }; setScheduleForm(p => ({ ...p, holidays: hs })); }}
                        className="flex-1 px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white" />
                      <button onClick={() => setScheduleForm(p => ({ ...p, holidays: p.holidays.filter((_, idx) => idx !== i) }))}
                        className="text-red-400 hover:text-red-600"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
              <button onClick={() => setDoctorSchedModal({ open: false, doctor: null })}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveDoctorSchedule} disabled={scheduleSaving}
                className="px-6 py-2.5 rounded-xl bg-[#137fec] hover:bg-blue-600 text-white font-semibold text-sm transition-colors disabled:opacity-60">
                {scheduleSaving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
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
                <div className="flex items-stretch border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#137fec] bg-white dark:bg-slate-800">
                  <span className="px-3 flex items-center text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 select-none border-r border-slate-300 dark:border-slate-600">🇮🇳 +91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="phone"
                    placeholder="10-digit number"
                    value={doctorFormData.phone}
                    onChange={e => setDoctorFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    maxLength={10}
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent"
                  />
                </div>
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
