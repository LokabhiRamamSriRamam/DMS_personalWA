import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, Upload, ExternalLink, Loader2, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import API from '../services/api';
import { parseSpreadsheet, downloadSampleSheet } from '../utils/spreadsheet';

const TAB_ENDPOINT = {
  findings:   '/clinical-findings',
  diagnoses:  '/diagnoses',
  treatments: '/suggested-treatments',
};

const TAB_LABEL = {
  findings:   'Clinical Findings',
  diagnoses:  'Diagnoses',
  treatments: 'Suggested Treatments',
};

const HEADERS = {
  findings:   ['name', 'category', 'description'],
  diagnoses:  ['name', 'code', 'category', 'description'],
  treatments: ['name', 'cost', 'category', 'description'],
};

const EXAMPLES = {
  findings:   [{ name: 'Gingival Inflammation', category: 'Periodontal', description: 'Visible gum swelling' }],
  diagnoses:  [{ name: 'Dental Caries – Dentin', code: 'K02.1', category: 'Restorative', description: 'Caries into dentin' }],
  treatments: [{ name: 'Root Canal Treatment – Molar', cost: 6000, category: 'Endodontic', description: 'Multi-canal RCT' }],
};

export default function BulkUploadClinicalModal({ tab, onClose, onSaved }) {
  const [mode, setMode] = useState('file'); // 'file' | 'sheets'
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [preview, setPreview] = useState(null); // { rows: [], fileName: '' }
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const headers = HEADERS[tab];

  const handleDownloadSample = () => {
    downloadSampleSheet(`${tab}_template`, headers, EXAMPLES[tab]);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setPreview(null);
    try {
      const rows = await parseSpreadsheet(file);
      const mapped = rows.map(r => {
        const obj = {};
        headers.forEach(h => {
          const key = Object.keys(r).find(k => k.trim().toLowerCase() === h);
          obj[h] = key !== undefined ? String(r[key] || '') : (h === 'cost' ? '0' : '');
        });
        return obj;
      }).filter(r => String(r.name).trim());

      if (mapped.length === 0) {
        setError('No valid rows found. Make sure the first row has a "name" column.');
        return;
      }
      setPreview({ rows: mapped, fileName: file.name });
    } catch {
      setError('Could not read the file. Use the sample sheet as a reference.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fake = { target: { files: [file], value: '' } };
      fake.target.value = '';
      handleFileSelect(fake);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    try {
      let items;
      if (mode === 'file') {
        if (!preview) { setError('Please select a file first.'); setUploading(false); return; }
        items = preview.rows;
      } else {
        if (!sheetsUrl.trim()) { setError('Please enter a Google Sheets URL.'); setUploading(false); return; }
        const res = await API.post(`${TAB_ENDPOINT[tab]}/bulk-upload-sheets`, { sheetUrl: sheetsUrl.trim() });
        setResult(res.data);
        setUploading(false);
        onSaved();
        return;
      }

      const { data } = await API.post(`${TAB_ENDPOINT[tab]}/bulk`, { items });
      setResult(data);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const colSpan = headers.length + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <h2 className="font-bold text-lg text-slate-800 dark:text-white">Bulk Upload {TAB_LABEL[tab]}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Result screen */}
          {result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-700">{result.inserted ?? result.succeeded ?? 0}</p>
                  <p className="text-xs text-slate-500 uppercase mt-1">Imported</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-amber-700">{result.skipped ?? 0}</p>
                  <p className="text-xs text-slate-500 uppercase mt-1">Skipped</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">{result.total ?? 0}</p>
                  <p className="text-xs text-slate-500 uppercase mt-1">Total Rows</p>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <AlertTriangle size={15} /> {result.errors.length} row{result.errors.length > 1 ? 's' : ''} had errors
                  </p>
                  <div className="overflow-x-auto border border-amber-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-amber-50 dark:bg-amber-900/20">
                        <tr>
                          <th className="px-3 py-2 text-left text-amber-700 font-semibold">Row</th>
                          <th className="px-3 py-2 text-left text-amber-700 font-semibold">Column</th>
                          <th className="px-3 py-2 text-left text-amber-700 font-semibold">Value</th>
                          <th className="px-3 py-2 text-left text-amber-700 font-semibold">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {result.errors.map((err, i) => (
                          <tr key={i} className="hover:bg-amber-50/50">
                            <td className="px-3 py-2 text-slate-600">{err.row ?? i + 1}</td>
                            <td className="px-3 py-2 font-mono text-slate-700">{err.column ?? '—'}</td>
                            <td className="px-3 py-2 text-slate-600 max-w-[120px] truncate">{String(err.value ?? '—')}</td>
                            <td className="px-3 py-2 text-slate-600">{err.error ?? err.reason ?? 'Unknown error'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-400">Fix these rows in your sheet and re-upload. Already-imported rows will be skipped automatically.</p>
                </div>
              )}

              <button onClick={onClose} className="w-full px-4 py-2.5 bg-[#137fec] hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors">
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Mode switcher */}
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {['file', 'sheets'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(''); setPreview(null); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      mode === m
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {m === 'file' ? 'CSV / Excel File' : 'Google Sheets URL'}
                  </button>
                ))}
              </div>

              {/* Format guide */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs space-y-2">
                <p className="font-semibold text-slate-700 dark:text-slate-200">Required columns (row 1 headers):</p>
                <code className="block bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                  {headers.join(' | ')}
                </code>
                <p className="text-slate-500">Only <strong>name</strong> is required. Other columns are optional.</p>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="flex items-center gap-1.5 text-[#137fec] font-semibold hover:underline"
                >
                  <Download size={13} /> Download sample sheet
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'file' ? (
                  <>
                    {/* Drop zone */}
                    <div
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-[#137fec] hover:bg-blue-50/30 transition-colors"
                    >
                      <Upload size={28} className="mx-auto mb-2 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Drop your file here or click to browse</p>
                      <p className="text-xs text-slate-400 mt-1">Supports .csv, .xlsx, .xls</p>
                      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                    </div>

                    {/* Preview */}
                    {preview && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <CheckCircle size={15} className="text-green-600" />
                            {preview.fileName} — {preview.rows.length} rows ready
                          </p>
                          <button type="button" onClick={() => setPreview(null)} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                        </div>
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl max-h-40">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                              <tr>
                                {headers.map(h => (
                                  <th key={h} className="px-3 py-2 text-left text-slate-500 font-semibold capitalize">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {preview.rows.slice(0, 5).map((row, i) => (
                                <tr key={i}>
                                  {headers.map(h => (
                                    <td key={h} className="px-3 py-1.5 text-slate-600 dark:text-slate-400 max-w-[140px] truncate">{row[h] || '—'}</td>
                                  ))}
                                </tr>
                              ))}
                              {preview.rows.length > 5 && (
                                <tr>
                                  <td colSpan={colSpan} className="px-3 py-2 text-center text-xs text-slate-400">
                                    … and {preview.rows.length - 5} more rows
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-400">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">How to use Google Sheets:</p>
                      <ol className="list-decimal pl-4 space-y-0.5">
                        <li>Open your Google Sheet. Row 1 must have the column headers shown above.</li>
                        <li>Click <strong>Share → General access → Anyone with the link</strong> (Viewer).</li>
                        <li>Paste the URL below.</li>
                      </ol>
                      <a href="https://docs.google.com/spreadsheets/create" target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-[#137fec] font-semibold hover:underline">
                        <ExternalLink size={11} /> Create a new sheet
                      </a>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Google Sheets URL</label>
                      <input
                        type="url"
                        value={sheetsUrl}
                        onChange={e => setSheetsUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/…"
                        className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#137fec] outline-none"
                      />
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || (mode === 'file' && !preview)}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 transition-colors"
                  >
                    {uploading ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : <><Upload size={14} /> Import</>}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
