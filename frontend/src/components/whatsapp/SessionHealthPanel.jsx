import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api.js';

const statusMeta = {
  connected:    { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', label: 'Connected' },
  disconnected: { color: 'text-red-600 bg-red-50 border-red-200',           dot: 'bg-red-500',     label: 'Disconnected' },
  need_scan:    { color: 'text-amber-600 bg-amber-50 border-amber-200',      dot: 'bg-amber-400 animate-pulse', label: 'Scan QR Code' },
  unknown:      { color: 'text-slate-500 bg-slate-50 border-slate-200',      dot: 'bg-slate-400',   label: 'Unknown' },
};

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function SecretInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        <span className="material-symbols-outlined text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
  );
}

export default function SessionHealthPanel() {
  const [config, setConfig]       = useState({ sessionId: '', sessionName: '', personalAccessToken: '', sessionApiKey: '', webhookSecret: '' });
  const [status, setStatus]       = useState('unknown');
  const [connectedPhone, setConnectedPhone] = useState('');
  const [qrCode, setQrCode]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchConfig();
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 15000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (status === 'need_scan') {
      fetchQrCode();
      const qrInterval = setInterval(fetchQrCode, 30000);
      return () => clearInterval(qrInterval);
    } else {
      setQrCode(null);
    }
  }, [status]);

  async function fetchConfig() {
    try {
      const res = await api.get('/wasender/config');
      if (res.data) setConfig(c => ({ ...c, ...res.data }));
    } catch {}
  }

  async function fetchStatus() {
    try {
      const res = await api.get('/wasender/session/status');
      setStatus(res.data.status || 'unknown');
      setConnectedPhone(res.data.connectedPhone || '');
      setLastChecked(new Date());
    } catch {
      setStatus('unknown');
    }
  }

  async function fetchQrCode() {
    try {
      const res = await api.get('/wasender/session/qrcode');
      setQrCode(res.data?.data?.qrcode || res.data?.qrcode || null);
    } catch {}
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.put('/wasender/config', config);
      setConfig(c => ({ ...c, ...res.data }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await api.post('/wasender/session/connect');
      setStatus(res.data.status || 'unknown');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to connect');
    } finally {
      setConnecting(false);
      fetchStatus();
    }
  }

  const meta = statusMeta[status] || statusMeta.unknown;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-y-auto">
      {/* Credentials Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-blue-600">key</span>
          <h2 className="font-bold text-slate-800">Credentials</h2>
        </div>

        <Field label="Session Name">
          <input
            type="text"
            value={config.sessionName || ''}
            onChange={e => setConfig(c => ({ ...c, sessionName: e.target.value }))}
            placeholder="My Clinic WhatsApp"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="Session ID">
          <input
            type="text"
            value={config.sessionId || ''}
            onChange={e => setConfig(c => ({ ...c, sessionId: e.target.value }))}
            placeholder="session_abc123"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="PAT (Personal Access Token)">
          <SecretInput
            value={config.personalAccessToken || ''}
            onChange={e => setConfig(c => ({ ...c, personalAccessToken: e.target.value }))}
            placeholder="Account-level token from WaSender dashboard"
          />
          <p className="text-xs text-slate-400">Used for session management (connect, QR code). From WaSender → Account → API Tokens.</p>
        </Field>

        <Field label="Session API Key">
          <SecretInput
            value={config.sessionApiKey || ''}
            onChange={e => setConfig(c => ({ ...c, sessionApiKey: e.target.value }))}
            placeholder="Session-level key for sending messages"
          />
          <p className="text-xs text-slate-400">Used for sending messages. Generated after session connects in WaSender.</p>
        </Field>

        <Field label="Webhook Secret">
          <SecretInput
            value={config.webhookSecret || ''}
            onChange={e => setConfig(c => ({ ...c, webhookSecret: e.target.value }))}
            placeholder="HMAC secret for verifying incoming webhooks"
          />
        </Field>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-auto flex items-center justify-center gap-2 bg-[#137fec] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving
            ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Saving…</>
            : <><span className="material-symbols-outlined text-[18px]">save</span>Save Credentials</>
          }
        </button>
      </div>

      {/* Status + QR Card */}
      <div className="flex flex-col gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-slate-600">phone_iphone</span>
              <h2 className="font-bold text-slate-800">Session Status</h2>
            </div>
            <span className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${meta.color}`}>
              <span className={`size-2 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>

          {connectedPhone && (
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-500">smartphone</span>
              <span className="font-medium">{connectedPhone}</span>
            </div>
          )}

          {lastChecked && (
            <p className="text-xs text-slate-400">
              Last checked: {lastChecked.toLocaleTimeString('en-IN')}
            </p>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center justify-center gap-2 bg-slate-800 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-slate-900 disabled:opacity-50 transition-colors"
          >
            {connecting
              ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Connecting…</>
              : <><span className="material-symbols-outlined text-[18px]">wifi</span>
                {status === 'connected' ? 'Reconnect' : 'Connect Session'}</>
            }
          </button>
        </div>

        {/* QR Code Card */}
        {status === 'need_scan' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 self-start">
              <span className="material-symbols-outlined text-[20px] text-amber-600">qr_code_2</span>
              <h2 className="font-bold text-amber-800">Scan QR Code</h2>
            </div>
            {qrCode ? (
              <>
                <img src={`data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="size-56 rounded-xl border border-amber-300" />
                <p className="text-xs text-amber-700 text-center">Open WhatsApp on your phone → Linked Devices → Link a Device → Scan this code</p>
                <p className="text-xs text-amber-500">Auto-refreshes every 30 seconds</p>
              </>
            ) : (
              <div className="size-56 rounded-xl border-2 border-dashed border-amber-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-400 text-[48px] animate-pulse">qr_code_2</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
