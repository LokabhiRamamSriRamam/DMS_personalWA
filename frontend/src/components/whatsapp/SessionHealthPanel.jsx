import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api.js';

const statusMeta = {
  connected:    { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500',              label: 'Connected' },
  disconnected: { color: 'text-red-600 bg-red-50 border-red-200',            dot: 'bg-red-500',                  label: 'Disconnected' },
  need_scan:    { color: 'text-amber-600 bg-amber-50 border-amber-200',       dot: 'bg-amber-400 animate-pulse',  label: 'Awaiting QR Scan' },
  unknown:      { color: 'text-slate-500 bg-slate-50 border-slate-200',       dot: 'bg-slate-400',               label: 'Not Configured' },
};

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 leading-relaxed">{hint}</p>}
    </div>
  );
}

function SecretInput({ value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 disabled:bg-slate-50 disabled:text-slate-400"
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        <span className="material-symbols-outlined text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
  );
}

function Step({ number, title, active, done }) {
  return (
    <div className={`flex items-center gap-3 ${active ? 'opacity-100' : done ? 'opacity-60' : 'opacity-30'}`}>
      <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
        {done ? <span className="material-symbols-outlined text-[14px]">check</span> : number}
      </div>
      <span className={`text-sm font-semibold ${active ? 'text-slate-800' : 'text-slate-500'}`}>{title}</span>
    </div>
  );
}

export default function SessionHealthPanel() {
  const [pat, setPat]               = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [sessionName, setSessionName] = useState('DMS WhatsApp');
  const [config, setConfig]         = useState(null); // full saved config
  const [status, setStatus]         = useState('unknown');
  const [connectedPhone, setConnectedPhone] = useState('');
  const [qrCode, setQrCode]         = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const [savingPat, setSavingPat]       = useState(false);
  const [creating, setCreating]         = useState(false);
  const [connecting, setConnecting]     = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const pollRef = useRef(null);

  // Derived step state
  const hasPat      = config?.personalAccessToken && !config.personalAccessToken.startsWith('****') || (config?.personalAccessToken?.length > 4);
  const hasSession  = !!config?.sessionId;
  const isConnected = status === 'connected';
  const needsScan   = status === 'need_scan';

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (hasSession) {
      fetchStatus();
      pollRef.current = setInterval(fetchStatus, 10000);
      return () => clearInterval(pollRef.current);
    }
  }, [hasSession]);

  useEffect(() => {
    if (needsScan) {
      fetchQrCode();
      const t = setInterval(fetchQrCode, 30000);
      return () => clearInterval(t);
    } else {
      setQrCode(null);
    }
  }, [needsScan]);

  async function loadConfig() {
    try {
      const res = await api.get('/wasender/config');
      if (res.data) {
        setConfig(res.data);
        setSessionName(res.data.sessionName || 'DMS WhatsApp');
      }
    } catch {}
  }

  async function fetchStatus() {
    try {
      const res = await api.get('/wasender/session/status');
      setStatus(res.data.status || 'unknown');
      setConnectedPhone(res.data.connectedPhone || '');
      setLastChecked(new Date());
    } catch { setStatus('unknown'); }
  }

  async function fetchQrCode() {
    try {
      const res = await api.get('/wasender/session/qrcode');
      setQrCode(res.data?.data?.qrcode || res.data?.qrcode || null);
    } catch {}
  }

  async function handleSavePat() {
    if (!pat || pat.startsWith('****')) return alert('Enter your Personal Access Token');
    setSavingPat(true);
    try {
      const res = await api.put('/wasender/config', { personalAccessToken: pat, webhookSecret, sessionName });
      setConfig(res.data);
      setPat('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save');
    } finally {
      setSavingPat(false);
    }
  }

  async function handleCreateSession() {
    setCreating(true);
    try {
      const webhookUrl = `${window.location.origin.replace('5173', '5000')}/api/wasender/webhook`;
      const res = await api.post('/wasender/session/create', { sessionName, webhookUrl });
      await loadConfig();
      setStatus('need_scan');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      await api.post('/wasender/session/connect');
      await fetchStatus();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect this WhatsApp session?')) return;
    try {
      await api.post('/wasender/session/disconnect');
      setStatus('disconnected');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to disconnect');
    }
  }

  async function handleRegenerateKey() {
    if (!window.confirm('Regenerate the Session API Key? Existing key will stop working.')) return;
    setRegenerating(true);
    try {
      const res = await api.post('/wasender/session/regenerate-key');
      await loadConfig();
      alert(`Key regenerated: ${res.data.masked}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to regenerate key');
    } finally {
      setRegenerating(false);
    }
  }

  const meta = statusMeta[status] || statusMeta.unknown;

  return (
    <div className="flex gap-6 h-full overflow-y-auto">

      {/* Left: steps + forms */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">

        {/* Progress steps */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-0">
          <Step number="1" title="Save PAT"          active={!hasPat}              done={hasPat} />
          <div className="flex-1 h-px bg-slate-200 mx-3" />
          <Step number="2" title="Create Session"    active={hasPat && !hasSession} done={hasSession} />
          <div className="flex-1 h-px bg-slate-200 mx-3" />
          <Step number="3" title="Scan QR Code"      active={hasSession && needsScan} done={hasSession && !needsScan && isConnected} />
          <div className="flex-1 h-px bg-slate-200 mx-3" />
          <Step number="4" title="Connected"         active={isConnected} done={isConnected} />
        </div>

        {/* Step 1: PAT */}
        <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 transition-opacity ${hasPat ? 'border-emerald-200 opacity-70' : 'border-blue-300 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-blue-600">key</span>
              <h2 className="font-bold text-slate-800">Step 1 — Personal Access Token</h2>
            </div>
            {hasPat && <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-full">Saved ✓</span>}
          </div>
          <p className="text-xs text-slate-500">
            Get your PAT from <strong>wasenderapi.com → Settings → Personal Access Token</strong>. This is account-level — one PAT for everything.
          </p>
          <Field label="Personal Access Token">
            <SecretInput
              value={pat}
              onChange={e => setPat(e.target.value)}
              placeholder={hasPat ? config?.personalAccessToken : 'Paste your PAT here…'}
            />
          </Field>
          <Field label="Session Name">
            <input type="text" value={sessionName} onChange={e => setSessionName(e.target.value)}
              placeholder="e.g. Smile Dental WhatsApp"
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </Field>
          <Field label="Webhook Secret" hint="Any random string. Set the same value in WaSender's webhook config to verify incoming events.">
            <SecretInput
              value={webhookSecret}
              onChange={e => setWebhookSecret(e.target.value)}
              placeholder={config?.webhookSecret || 'e.g. my-dental-secret-2025'}
            />
          </Field>
          <button onClick={handleSavePat} disabled={savingPat}
            className="flex items-center justify-center gap-2 bg-[#137fec] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {savingPat
              ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Saving…</>
              : <><span className="material-symbols-outlined text-[18px]">save</span>{hasPat ? 'Update PAT' : 'Save PAT'}</>}
          </button>
        </div>

        {/* Step 2: Create Session */}
        <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 transition-opacity ${!hasPat ? 'opacity-30 pointer-events-none' : hasSession ? 'border-emerald-200 opacity-70' : 'border-blue-300 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-blue-600">add_circle</span>
              <h2 className="font-bold text-slate-800">Step 2 — Create WhatsApp Session</h2>
            </div>
            {hasSession && <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-full">Created ✓</span>}
          </div>
          {hasSession
            ? <p className="text-xs text-slate-500">Session ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{config?.sessionId}</code></p>
            : <p className="text-xs text-slate-500">This will create a new WhatsApp session on WaSender and immediately initiate the connection. A QR code will appear for you to scan.</p>
          }
          {!hasSession && (
            <button onClick={handleCreateSession} disabled={creating}
              className="flex items-center justify-center gap-2 bg-slate-800 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-slate-900 disabled:opacity-50 transition-colors">
              {creating
                ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Creating…</>
                : <><span className="material-symbols-outlined text-[18px]">add_circle</span>Create & Connect Session</>}
            </button>
          )}
        </div>

      </div>

      {/* Right: status + QR */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-5">

        {/* Status card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-slate-600">phone_iphone</span>
              <h2 className="font-bold text-slate-800">Status</h2>
            </div>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${meta.color}`}>
              <span className={`size-2 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>

          {connectedPhone && (
            <div className="flex items-center gap-2 text-sm text-slate-700 bg-emerald-50 rounded-xl px-3 py-2.5 border border-emerald-100">
              <span className="material-symbols-outlined text-emerald-500 text-[20px]">smartphone</span>
              <span className="font-semibold">{connectedPhone}</span>
            </div>
          )}

          {lastChecked && (
            <p className="text-[11px] text-slate-400">Checked: {lastChecked.toLocaleTimeString('en-IN')}</p>
          )}

          {hasSession && (
            <div className="flex flex-col gap-2 pt-1">
              {!isConnected && (
                <button onClick={handleConnect} disabled={connecting}
                  className="flex items-center justify-center gap-2 bg-[#137fec] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {connecting
                    ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Connecting…</>
                    : <><span className="material-symbols-outlined text-[18px]">wifi</span>Reconnect</>}
                </button>
              )}
              {isConnected && (
                <button onClick={handleDisconnect}
                  className="flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-red-50 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">wifi_off</span>Disconnect
                </button>
              )}
              <button onClick={handleRegenerateKey} disabled={regenerating}
                className="flex items-center justify-center gap-2 border border-slate-200 text-slate-600 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                {regenerating ? 'Regenerating…' : 'Regenerate API Key'}
              </button>
            </div>
          )}
        </div>

        {/* QR Code card */}
        {needsScan && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 self-start">
              <span className="material-symbols-outlined text-[20px] text-amber-600">qr_code_2</span>
              <h2 className="font-bold text-amber-800">Scan to Connect</h2>
            </div>
            {qrCode
              ? <img src={`data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="size-52 rounded-xl border border-amber-300 bg-white p-1" />
              : <div className="size-52 rounded-xl border-2 border-dashed border-amber-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400 text-[48px] animate-pulse">qr_code_2</span>
                </div>
            }
            <div className="text-xs text-amber-700 text-center space-y-1">
              <p className="font-semibold">Open WhatsApp on your phone</p>
              <p>⋯ Menu → Linked Devices → Link a Device</p>
              <p className="text-amber-500">Auto-refreshes every 30 seconds</p>
            </div>
          </div>
        )}

        {/* Session API Key info */}
        {hasSession && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-slate-500">vpn_key</span>
              <p className="text-xs font-semibold text-slate-600">Session API Key</p>
            </div>
            <p className="text-xs text-slate-400 font-mono">{config?.sessionApiKey || '—'}</p>
            <p className="text-[11px] text-slate-400">Auto-captured when session connects. Used for sending messages.</p>
          </div>
        )}

      </div>
    </div>
  );
}
