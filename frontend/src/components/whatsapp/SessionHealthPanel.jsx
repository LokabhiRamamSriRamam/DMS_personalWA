import React, { useState, useEffect, useRef } from 'react';
import { io as socketIO } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api.js';

// WaSender returns the QR as base64 image data per their API docs.
// We also handle the raw WhatsApp protocol string as a fallback (contains commas, e.g. "2@xxx,abc=,...").
function isImageQr(s) {
  if (!s) return false;
  if (s.startsWith('data:image/')) return true;
  // PNG: "\x89PNG" → base64 "iVBORw"
  if (s.startsWith('iVBORw')) return true;
  // JPEG: FF D8 FF → base64 "/9j/"
  if (s.startsWith('/9j/')) return true;
  // GIF: "GIF8" → base64 "R0lGOD"
  if (s.startsWith('R0lGOD')) return true;
  // WebP inside RIFF: "RIFF" → base64 "UklGR"
  if (s.startsWith('UklGR')) return true;
  // Any long string with no commas is almost certainly base64 image data.
  // Raw WhatsApp protocol strings always contain commas (e.g. "2@xxx,key=,...")
  if (s.length > 100 && !s.includes(',')) return true;
  return false;
}

function qrDataUrl(s) {
  if (s.startsWith('data:')) return s;
  if (s.startsWith('/9j/'))   return `data:image/jpeg;base64,${s}`;
  if (s.startsWith('R0lGOD')) return `data:image/gif;base64,${s}`;
  if (s.startsWith('UklGR'))  return `data:image/webp;base64,${s}`;
  return `data:image/png;base64,${s}`;
}

const SOCKET_URL = 'http://localhost:5000';

const statusMeta = {
  connected:    { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500',             label: 'Connected' },
  disconnected: { color: 'text-red-600 bg-red-50 border-red-200',            dot: 'bg-red-500',                 label: 'Disconnected' },
  need_scan:    { color: 'text-amber-600 bg-amber-50 border-amber-200',       dot: 'bg-amber-400 animate-pulse', label: 'Awaiting QR Scan' },
  unknown:      { color: 'text-slate-500 bg-slate-50 border-slate-200',       dot: 'bg-slate-400',              label: 'Not Configured' },
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

function SecretInput({ value, onChange, placeholder, disabled, readOnly }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${
          disabled || readOnly ? 'bg-slate-50 text-slate-500 cursor-default' : ''
        }`}
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        <span className="material-symbols-outlined text-[18px]">{show ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
  );
}

function StepBadge({ n, active, done }) {
  return (
    <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
      ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
      {done ? <span className="material-symbols-outlined text-[14px]">check</span> : n}
    </div>
  );
}

function StepRow({ n, title, active, done }) {
  return (
    <div className={`flex items-center gap-2 transition-opacity ${active ? 'opacity-100' : done ? 'opacity-60' : 'opacity-25'}`}>
      <StepBadge n={n} active={active} done={done} />
      <span className={`text-sm font-semibold ${active ? 'text-slate-800' : 'text-slate-500'}`}>{title}</span>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0 text-red-500">error</span>
      <p className="flex-1 leading-snug">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 text-red-400 hover:text-red-600">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}

function SuccessBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
      <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0 text-emerald-500">check_circle</span>
      <p className="flex-1 leading-snug">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 text-emerald-400 hover:text-emerald-600">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}

function WarningBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
      <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0 text-amber-500">warning</span>
      <p className="flex-1 leading-snug">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 text-amber-400 hover:text-amber-600">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
      <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0 text-blue-500">info</span>
      <div className="flex-1 leading-snug space-y-1">{children}</div>
    </div>
  );
}

function extractError(err) {
  const d = err.response?.data;
  if (!d) return err.message || 'An unexpected error occurred';
  const detail = d.details?.message || d.details?.error || d.details?.errors?.[0];
  return detail ? `${d.message} — ${detail}` : (d.message || 'An unexpected error occurred');
}

// ── How It Works collapsible guide ───────────────────────────────────────────

function HowItWorksGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-blue-500">menu_book</span>
          <span className="font-bold text-slate-800">How to Connect WhatsApp — Step-by-Step Guide</span>
        </div>
        <span className="material-symbols-outlined text-[20px] text-slate-400">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 space-y-5 pt-4">

          <p className="text-sm text-slate-600">
            Connecting WhatsApp to the DMS lets the system automatically send appointment reminders,
            treatment summaries, invoices, and follow-up messages to your patients — all without you
            doing anything manually. Follow the four steps below to get set up.
          </p>

          {/* Step 1 */}
          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">Get your Personal Access Token (PAT)</p>
              <p className="text-sm text-slate-600">
                Contact your <strong>Connect POC</strong> and ask them to share your Personal Access Token (PAT).
                This is a long string of characters that acts as your master key for creating and managing WhatsApp sessions.
                Keep it safe — treat it like a password.
              </p>
              <p className="text-xs text-slate-400">Once you have the PAT and the Webhook URL, paste them into Step 1 on this page and click <strong>Save PAT</strong>. The Webhook URL must be a public HTTPS address — not localhost.</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">Create a WhatsApp Session</p>
              <p className="text-sm text-slate-600">
                After saving your PAT, click <strong>Create &amp; Connect Session</strong>. The system will register a new
                WhatsApp session linked to your clinic's phone number. This only needs to be done once —
                the session persists even if you refresh or restart.
              </p>
              <p className="text-xs text-slate-400">
                You will need to enter the <strong>10-digit WhatsApp phone number</strong> that you want to use for your clinic
                (the number patients will receive messages from).
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">Scan the QR Code with your WhatsApp</p>
              <p className="text-sm text-slate-600">
                A QR code will appear on the right side of this screen. On the phone whose WhatsApp you are linking:
              </p>
              <ol className="text-sm text-slate-600 list-decimal list-inside space-y-0.5 pl-1">
                <li>Open <strong>WhatsApp</strong></li>
                <li>Tap the three-dot menu <strong>⋯</strong> (top-right)</li>
                <li>Go to <strong>Linked Devices</strong></li>
                <li>Tap <strong>Link a Device</strong></li>
                <li>Point your camera at the QR code on screen</li>
              </ol>
              <p className="text-xs text-slate-400 pt-1">
                Once scanned, the status will change to <strong>Connected</strong> automatically — no page refresh needed.
                A <strong>Sending Key</strong> will also be captured automatically at this point; you don't need to do anything for it.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">Save the Webhook Secret</p>
              <p className="text-sm text-slate-600">
                After connecting, contact your <strong>Connect POC</strong> again and ask them for the <strong>Webhook Secret</strong>
                for your session. Paste it into Step 4 and click <strong>Save Webhook Secret</strong>.
              </p>
              <p className="text-xs text-slate-400">
                The webhook secret ensures that only genuine incoming WhatsApp messages are processed — it protects your
                inbox from spoofed requests.
              </p>
            </div>
          </div>

          {/* Managing the session */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-sm font-bold text-slate-700">Managing your session after setup</p>

            <div className="flex gap-3">
              <span className="material-symbols-outlined text-[18px] text-slate-400 mt-0.5 flex-shrink-0">wifi</span>
              <div>
                <p className="text-sm font-semibold text-slate-700">Session disconnected?</p>
                <p className="text-sm text-slate-600">
                  Sessions can disconnect if the phone is offline or WhatsApp is logged out. Click <strong>Reconnect</strong>
                  on the right panel — if it returns to "Awaiting QR Scan", scan the QR again from your phone.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="material-symbols-outlined text-[18px] text-slate-400 mt-0.5 flex-shrink-0">refresh</span>
              <div>
                <p className="text-sm font-semibold text-slate-700">Regenerate Sending Key</p>
                <p className="text-sm text-slate-600">
                  If you are advised by your Connect POC to rotate the sending key, click <strong>Regenerate API Key</strong>.
                  The system will update automatically — no other action is needed.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="material-symbols-outlined text-[18px] text-slate-400 mt-0.5 flex-shrink-0">wifi_off</span>
              <div>
                <p className="text-sm font-semibold text-slate-700">Disconnecting intentionally</p>
                <p className="text-sm text-slate-600">
                  Use the <strong>Disconnect</strong> button only if instructed to do so. Disconnecting stops all
                  WhatsApp messages immediately. You will need to reconnect and re-scan the QR code to resume.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="material-symbols-outlined text-[18px] text-slate-400 mt-0.5 flex-shrink-0">update</span>
              <div>
                <p className="text-sm font-semibold text-slate-700">Updating your PAT</p>
                <p className="text-sm text-slate-600">
                  If your Connect POC issues you a new PAT, click <strong>Update PAT</strong> in Step 1, paste the new token,
                  and save. The session will continue working without interruption.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SessionHealthPanel() {
  const [config, setConfig]               = useState(null);
  const [pat, setPat]                     = useState('');
  const [editingPat, setEditingPat]       = useState(false);
  const [sessionName, setSessionName]     = useState('DMS WhatsApp');
  const [phoneNumber, setPhoneNumber]     = useState('');
  const [webhookUrl, setWebhookUrl]         = useState('');
  const [editingWebhookUrl, setEditingWebhookUrl] = useState(false);
  const [savingWebhookUrl, setSavingWebhookUrl]   = useState(false);
  const [webhookUrlError, setWebhookUrlError]     = useState('');
  const [savingPhone, setSavingPhone]     = useState(false);
  const [phoneError, setPhoneError]       = useState('');
  const [webhookSecret, setWebhookSecret]   = useState('');
  const [savingSecret, setSavingSecret]     = useState(false);
  const [editingSecret, setEditingSecret]   = useState(false);

  const [status, setStatus]               = useState('unknown');
  const [connectedPhone, setConnectedPhone] = useState('');
  const [qrCode, setQrCode]               = useState(null);
  const [lastChecked, setLastChecked]     = useState(null);

  const [savingPat, setSavingPat]         = useState(false);
  const [creating, setCreating]           = useState(false);
  const [connecting, setConnecting]       = useState(false);
  const [regenerating, setRegenerating]   = useState(false);

  const [patError, setPatError]             = useState('');
  const [sessionError, setSessionError]     = useState('');
  const [sessionWarning, setSessionWarning] = useState('');
  const [connectError, setConnectError]     = useState('');
  const [secretError, setSecretError]       = useState('');
  const [secretSuccess, setSecretSuccess]   = useState('');
  const [regenSuccess, setRegenSuccess]     = useState('');
  const [regenError, setRegenError]         = useState('');
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);

  const pollRef = useRef(null);
  const qrRef   = useRef(null);
  const [fetchingQr, setFetchingQr] = useState(false);

  const hasPat      = !!config?.personalAccessToken;
  const hasSession  = !!config?.sessionId;
  const isConnected = status === 'connected';
  const needsScan   = status === 'need_scan';
  const hasSecret   = !!config?.webhookSecret;

  // Whether the PAT input is in "edit new value" mode vs showing the saved masked value
  const patInputMode = !hasPat || editingPat;

  useEffect(() => { loadConfig(); }, []);

  useEffect(() => {
    if (!hasSession) return;
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 30000);
    return () => clearInterval(pollRef.current);
  }, [hasSession]);

  useEffect(() => {
    if (needsScan) {
      fetchQrCode();
      // QR codes expire every ~36s on WaSender — refresh every 25s so the user always has a fresh one
      qrRef.current = setInterval(fetchQrCode, 25000);
      return () => clearInterval(qrRef.current);
    } else {
      clearInterval(qrRef.current);
      setQrCode(null);
    }
  }, [needsScan]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('dms_user') || '{}');
    const socket = socketIO(SOCKET_URL, { query: { tenantId: user?.tenantId || '' } });
    socket.on('wasender:qrcode', ({ qrcode }) => { setQrCode(qrcode); setStatus('need_scan'); });
    socket.on('wasender:status', ({ status, connectedPhone }) => {
      setStatus(status || 'unknown');
      if (connectedPhone) setConnectedPhone(connectedPhone);
      setLastChecked(new Date());
    });
    return () => socket.disconnect();
  }, []);

  async function loadConfig() {
    try {
      const res = await api.get('/wasender/config');
      if (res.data) {
        setConfig(res.data);
        setSessionName(res.data.sessionName || 'DMS WhatsApp');
        if (res.data.phoneNumber) setPhoneNumber((res.data.phoneNumber || '').replace(/^\+91/, ''));
        if (res.data.webhookUrl)  setWebhookUrl(res.data.webhookUrl);
      }
    } catch {}
  }

  async function fetchStatus() {
    try {
      const res = await api.get('/wasender/session/status');
      setStatus(res.data.status || 'unknown');
      setConnectedPhone(res.data.connectedPhone || '');
      setLastChecked(new Date());
    } catch { /* keep current status on poll failure — don't flicker to unknown */ }
  }

  async function fetchQrCode() {
    setFetchingQr(true);
    try {
      const res = await api.get('/wasender/session/qrcode');
      console.log('[QR] raw response:', JSON.stringify(res.data));
      // WaSender returns data.qrCode (capital C) — also try lowercase variants for safety
      const qr = res.data?.data?.qrCode
               || res.data?.data?.qrcode
               || res.data?.data?.qr
               || res.data?.qrCode
               || res.data?.qrcode
               || res.data?.qr
               || null;
      console.log('[QR] extracted value (first 80 chars):', qr ? String(qr).slice(0, 80) : null);
      if (qr) setQrCode(qr);
    } catch (err) {
      console.error('[QR] fetchQrCode error:', err?.response?.data || err.message);
    }
    finally { setFetchingQr(false); }
  }

  async function handleSavePat() {
    setPatError('');
    if (!pat || pat.startsWith('****')) { setPatError('Paste your new Personal Access Token before saving'); return; }
    if (phoneNumber.length !== 10) { setPatError('Enter a valid 10-digit WhatsApp phone number'); return; }
    if (!webhookUrl || webhookUrl.startsWith('http://localhost') || webhookUrl.startsWith('http://127.')) {
      setPatError('Enter a valid public Webhook URL (contact your Connect POC)'); return;
    }
    setSavingPat(true);
    try {
      const res = await api.put('/wasender/config', {
        personalAccessToken: pat,
        sessionName,
        phoneNumber: `+91${phoneNumber}`,
        webhookUrl,
      });
      setConfig(res.data);
      setSessionName(res.data.sessionName || 'DMS WhatsApp');
      if (res.data.phoneNumber) setPhoneNumber((res.data.phoneNumber || '').replace(/^\+91/, ''));
      if (res.data.webhookUrl)  setWebhookUrl(res.data.webhookUrl);
      setPat('');
      setEditingPat(false);
    } catch (err) {
      setPatError(extractError(err));
    } finally { setSavingPat(false); }
  }

  async function handleSavePhone() {
    setPhoneError('');
    if (phoneNumber.length !== 10) { setPhoneError('Enter a valid 10-digit number'); return; }
    setSavingPhone(true);
    try {
      const res = await api.put('/wasender/config', { phoneNumber: `+91${phoneNumber}` });
      setConfig(res.data);
      if (res.data.phoneNumber) setPhoneNumber((res.data.phoneNumber || '').replace(/^\+91/, ''));
    } catch (err) {
      setPhoneError(extractError(err));
    } finally { setSavingPhone(false); }
  }

  async function handleSaveWebhookUrl() {
    setWebhookUrlError('');
    if (!webhookUrl || webhookUrl.startsWith('http://localhost') || webhookUrl.startsWith('http://127.')) {
      setWebhookUrlError('Must be a public HTTPS URL'); return;
    }
    setSavingWebhookUrl(true);
    try {
      const res = await api.put('/wasender/config', { webhookUrl });
      setConfig(res.data);
      if (res.data.webhookUrl) setWebhookUrl(res.data.webhookUrl);
      setEditingWebhookUrl(false);
    } catch (err) {
      setWebhookUrlError(extractError(err));
    } finally { setSavingWebhookUrl(false); }
  }

  async function handleCreateSession() {
    setSessionError('');
    setSessionWarning('');
    setCreating(true);
    try {
      const pn = phoneNumber || (config?.phoneNumber || '').replace(/^\+91/, '');
      const res = await api.post('/wasender/session/create', {
        sessionName,
        phoneNumber: pn ? `+91${pn}` : '',
      });
      await loadConfig();
      setStatus('need_scan');
      if (res.data?.connectWarning) {
        setSessionWarning(`Session created but auto-connect failed: ${res.data.connectWarning}. Use the Reconnect button on the right.`);
      }
    } catch (err) {
      setSessionError(extractError(err));
    } finally { setCreating(false); }
  }

  async function handleConnect() {
    setConnectError('');
    setConnecting(true);
    try {
      await api.post('/wasender/session/connect');
      await fetchStatus();
    } catch (err) {
      setConnectError(extractError(err));
    } finally { setConnecting(false); }
  }

  async function handleDisconnect() {
    setDisconnectConfirm(false);
    try {
      await api.post('/wasender/session/disconnect');
      setStatus('disconnected');
    } catch (err) {
      setConnectError(extractError(err));
    }
  }

  async function handleRegenerateKey() {
    setRegenError('');
    setRegenSuccess('');
    setRegenerating(true);
    try {
      const res = await api.post('/wasender/session/regenerate-key');
      await loadConfig();
      setRegenSuccess(`Sending key regenerated successfully.`);
    } catch (err) {
      setRegenError(extractError(err));
    } finally { setRegenerating(false); }
  }

  async function handleSaveSecret() {
    setSecretError('');
    setSecretSuccess('');
    if (!webhookSecret) { setSecretError('Paste the webhook secret shared by your Connect POC'); return; }
    setSavingSecret(true);
    try {
      const res = await api.put('/wasender/config', { webhookSecret });
      setConfig(res.data);
      setWebhookSecret('');
      setEditingSecret(false);
      setSecretSuccess('Webhook secret saved.');
    } catch (err) {
      setSecretError(extractError(err));
    } finally { setSavingSecret(false); }
  }

  const meta = statusMeta[status] || statusMeta.unknown;

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto">

      {/* How it works guide */}
      <HowItWorksGuide />

      <div className="flex gap-6">

        {/* Left: step-by-step setup */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">

          {/* Progress tracker */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-2">
            <StepRow n="1" title="Save PAT"       active={!hasPat}                   done={hasPat} />
            <div className="flex-1 h-px bg-slate-200" />
            <StepRow n="2" title="Create Session" active={hasPat && !hasSession}      done={hasSession} />
            <div className="flex-1 h-px bg-slate-200" />
            <StepRow n="3" title="Scan & Connect" active={hasSession && !isConnected} done={isConnected} />
            <div className="flex-1 h-px bg-slate-200" />
            <StepRow n="4" title="Webhook Secret" active={isConnected && !hasSecret}  done={isConnected && hasSecret} />
          </div>

          {/* Step 1: PAT */}
          <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 ${hasPat && !editingPat ? 'border-emerald-200 opacity-70' : 'border-blue-300 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StepBadge n="1" active={!hasPat} done={hasPat && !editingPat} />
                <h2 className="font-bold text-slate-800">Personal Access Token (PAT)</h2>
              </div>
              {hasPat && !editingPat && (
                <button onClick={() => { setEditingPat(true); setPat(''); }}
                  className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">edit</span>Update PAT
                </button>
              )}
            </div>

            <InfoBox>
              <p>
                Contact your <strong>Connect POC</strong> to receive your Personal Access Token (PAT).
                It is a long string of characters — treat it like a password and never share it with anyone else.
              </p>
            </InfoBox>

            {/* PAT field — read-only display when saved, editable when updating */}
            <Field label="Personal Access Token">
              {hasPat && !editingPat ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2.5 text-sm font-mono text-emerald-700 tracking-widest">
                    {config?.personalAccessToken}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold whitespace-nowrap">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>Saved
                  </span>
                </div>
              ) : (
                <SecretInput
                  value={pat}
                  onChange={e => setPat(e.target.value)}
                  placeholder="Paste your PAT here…"
                />
              )}
            </Field>

            {patInputMode && (
              <>
                <Field label="Session Name" hint="A friendly label for this WhatsApp connection (e.g. your clinic name)">
                  <input type="text" value={sessionName} onChange={e => setSessionName(e.target.value)}
                    placeholder="e.g. Smile Dental WhatsApp"
                    className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
                <Field label="WhatsApp Phone Number" hint="The clinic number patients will receive messages from">
                  <div className="flex items-stretch border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                    <span className="px-3 flex items-center text-sm font-semibold text-slate-600 bg-slate-100 select-none border-r border-slate-200">🇮🇳 +91</span>
                    <input type="tel" inputMode="numeric" value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10} placeholder="10-digit number"
                      className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
                  </div>
                </Field>
                <Field label="Webhook URL" hint="Contact your Connect POC for the public webhook URL (e.g. https://your-domain.com/api/wasender/webhook)">
                  <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                    placeholder="https://your-domain.com/api/wasender/webhook"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
                <ErrorBanner message={patError} onDismiss={() => setPatError('')} />
                <div className="flex gap-2">
                  <button onClick={handleSavePat} disabled={savingPat}
                    className="flex items-center justify-center gap-2 bg-[#137fec] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {savingPat
                      ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Saving…</>
                      : <><span className="material-symbols-outlined text-[18px]">save</span>{hasPat ? 'Update PAT' : 'Save PAT'}</>}
                  </button>
                  {editingPat && (
                    <button onClick={() => { setEditingPat(false); setPat(''); setPatError(''); }}
                      className="flex items-center gap-2 border border-slate-200 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
                      Cancel
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Show session name + phone + webhook in read-only mode */}
            {hasPat && !editingPat && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Session Name</label>
                    <div className="border border-slate-200 bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-700">
                      {config?.sessionName || '—'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">WhatsApp Number</label>
                    {config?.phoneNumber ? (
                      <div className="border border-slate-200 bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-700 font-mono">
                        {config.phoneNumber}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-stretch border border-amber-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                          <span className="px-3 flex items-center text-sm font-semibold text-slate-600 bg-slate-100 select-none border-r border-slate-200">🇮🇳 +91</span>
                          <input type="tel" inputMode="numeric" value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            maxLength={10} placeholder="10-digit number"
                            className="flex-1 px-3 py-2 text-sm focus:outline-none" />
                          <button onClick={handleSavePhone} disabled={savingPhone}
                            className="px-3 bg-[#137fec] text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                            {savingPhone ? '…' : 'Save'}
                          </button>
                        </div>
                        {phoneError && <p className="text-xs text-red-600">{phoneError}</p>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Webhook URL</label>
                    {config?.webhookUrl && !editingWebhookUrl && (
                      <button onClick={() => { setEditingWebhookUrl(true); setWebhookUrlError(''); }}
                        className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full hover:bg-blue-100 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">edit</span>Update URL
                      </button>
                    )}
                  </div>
                  {config?.webhookUrl && !editingWebhookUrl ? (
                    <div className="border border-slate-200 bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-700 font-mono break-all">
                      {config.webhookUrl}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-stretch border border-amber-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                        <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                          placeholder="https://your-domain.com/api/wasender/webhook"
                          className="flex-1 px-3 py-2 text-sm focus:outline-none" />
                        <button onClick={handleSaveWebhookUrl} disabled={savingWebhookUrl}
                          className="px-3 bg-[#137fec] text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                          {savingWebhookUrl ? '…' : 'Save & Sync'}
                        </button>
                        {editingWebhookUrl && (
                          <button onClick={() => { setEditingWebhookUrl(false); setWebhookUrl(config?.webhookUrl || ''); setWebhookUrlError(''); }}
                            className="px-3 bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 border-l border-slate-200">
                            Cancel
                          </button>
                        )}
                      </div>
                      {webhookUrlError && <p className="text-xs text-red-600">{webhookUrlError}</p>}
                      {!config?.webhookUrl && <p className="text-[11px] text-amber-600">Required to create a session — contact your Connect POC for this URL</p>}
                      {editingWebhookUrl && <p className="text-[11px] text-blue-600">Saving will update the URL in DMS and sync it to WaSender automatically.</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Create Session */}
          <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 ${!hasPat ? 'opacity-25 pointer-events-none' : hasSession ? 'border-emerald-200 opacity-70' : 'border-blue-300 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StepBadge n="2" active={hasPat && !hasSession} done={hasSession} />
                <h2 className="font-bold text-slate-800">Create WhatsApp Session</h2>
              </div>
              {hasSession && <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-full">Created ✓</span>}
            </div>

            {hasSession ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs text-slate-500">
                  Session ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700">{config?.sessionId}</code>
                </p>
                <p className="text-xs text-slate-400">This session persists across restarts. You only need to re-scan the QR if the session disconnects.</p>
              </div>
            ) : (
              <>
                <InfoBox>
                  <p>
                    Clicking the button below will register a new WhatsApp session using your PAT. A QR code
                    will appear on the right — scan it with your clinic's WhatsApp to activate the connection.
                    <strong> This only needs to be done once.</strong>
                  </p>
                </InfoBox>
                <ErrorBanner message={sessionError} onDismiss={() => setSessionError('')} />
                <WarningBanner message={sessionWarning} onDismiss={() => setSessionWarning('')} />
                <button onClick={handleCreateSession} disabled={creating}
                  className="flex items-center justify-center gap-2 bg-slate-800 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-slate-900 disabled:opacity-50">
                  {creating
                    ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Creating…</>
                    : <><span className="material-symbols-outlined text-[18px]">add_circle</span>Create &amp; Connect Session</>}
                </button>
              </>
            )}
          </div>

          {/* Step 4: Webhook Secret — only shown after connected */}
          {isConnected && (
            <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 ${hasSecret && !editingSecret ? 'border-emerald-200 opacity-70' : 'border-blue-300 shadow-sm'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StepBadge n="4" active={!hasSecret} done={hasSecret && !editingSecret} />
                  <h2 className="font-bold text-slate-800">Webhook Secret</h2>
                </div>
                {hasSecret && !editingSecret && (
                  <button onClick={() => { setEditingSecret(true); setWebhookSecret(''); setSecretError(''); setSecretSuccess(''); }}
                    className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span>Update Secret
                  </button>
                )}
              </div>

              <InfoBox>
                <p>
                  Contact your <strong>Connect POC</strong> and ask for the <strong>Webhook Secret</strong> for your session.
                  This secret verifies that incoming WhatsApp messages processed by this system are genuine and have not
                  been tampered with.
                </p>
              </InfoBox>

              {hasSecret && !editingSecret ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2.5 text-sm font-mono text-emerald-700 tracking-widest">
                    {config?.webhookSecret}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold whitespace-nowrap">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>Saved
                  </span>
                </div>
              ) : (
                <Field label="Webhook Secret">
                  <SecretInput value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)}
                    placeholder="Paste webhook secret from your Connect POC…" />
                </Field>
              )}

              {(!hasSecret || editingSecret) && (
                <>
                  <ErrorBanner message={secretError} onDismiss={() => setSecretError('')} />
                  <SuccessBanner message={secretSuccess} onDismiss={() => setSecretSuccess('')} />
                  <div className="flex gap-2">
                    <button onClick={handleSaveSecret} disabled={savingSecret}
                      className="flex items-center justify-center gap-2 bg-[#137fec] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                      {savingSecret
                        ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Saving…</>
                        : <><span className="material-symbols-outlined text-[18px]">save</span>{hasSecret ? 'Update Webhook Secret' : 'Save Webhook Secret'}</>}
                    </button>
                    {editingSecret && (
                      <button onClick={() => { setEditingSecret(false); setWebhookSecret(''); setSecretError(''); }}
                        className="flex items-center gap-2 border border-slate-200 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: live status + QR */}
        <div className="w-96 flex-shrink-0 flex flex-col gap-5">

          {/* Status card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-slate-600">phone_iphone</span>
                <h2 className="font-bold text-slate-800">Session Status</h2>
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

            {lastChecked && <p className="text-[11px] text-slate-400">Checked: {lastChecked.toLocaleTimeString('en-IN')}</p>}

            <ErrorBanner message={connectError} onDismiss={() => setConnectError('')} />
            <SuccessBanner message={regenSuccess} onDismiss={() => setRegenSuccess('')} />
            <ErrorBanner message={regenError} onDismiss={() => setRegenError('')} />

            {hasSession && (
              <div className="flex flex-col gap-2">
                {!isConnected && (
                  <button onClick={handleConnect} disabled={connecting}
                    className="flex items-center justify-center gap-2 bg-[#137fec] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {connecting
                      ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>Connecting…</>
                      : <><span className="material-symbols-outlined text-[18px]">wifi</span>Reconnect</>}
                  </button>
                )}

                {isConnected && !disconnectConfirm && (
                  <button onClick={() => setDisconnectConfirm(true)}
                    className="flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-red-50">
                    <span className="material-symbols-outlined text-[18px]">wifi_off</span>Disconnect
                  </button>
                )}

                {disconnectConfirm && (
                  <div className="flex flex-col gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-xs text-red-700 font-semibold">Disconnect this WhatsApp session?</p>
                    <p className="text-xs text-red-600">All automatic messaging will stop immediately.</p>
                    <div className="flex gap-2">
                      <button onClick={handleDisconnect}
                        className="flex-1 bg-red-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-red-700">
                        Yes, Disconnect
                      </button>
                      <button onClick={() => setDisconnectConfirm(false)}
                        className="flex-1 border border-red-200 text-red-600 rounded-lg py-1.5 text-xs font-semibold hover:bg-red-100">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={handleRegenerateKey} disabled={regenerating}
                  className="flex items-center justify-center gap-2 border border-slate-200 text-slate-600 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  {regenerating ? 'Regenerating…' : 'Regenerate Sending Key'}
                </button>
              </div>
            )}
          </div>

          {/* QR Code — shown during need_scan */}
          {needsScan && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-amber-600">qr_code_2</span>
                  <h2 className="font-bold text-amber-800">Step 3 — Scan to Connect</h2>
                </div>
                <button onClick={fetchQrCode} disabled={fetchingQr}
                  className="flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                  <span className={`material-symbols-outlined text-[15px] ${fetchingQr ? 'animate-spin' : ''}`}>refresh</span>
                  {fetchingQr ? 'Refreshing…' : 'Refresh QR'}
                </button>
              </div>
              {qrCode
                ? (isImageQr(qrCode)
                    ? <img src={qrDataUrl(qrCode)}
                        alt="WhatsApp QR Code"
                        className="block w-full rounded-xl border border-amber-300 bg-white p-2" />
                    : <div className="w-full rounded-xl border border-amber-300 bg-white p-3 flex items-center justify-center">
                        <QRCodeSVG value={qrCode} size={320} level="M" includeMargin={false}
                          style={{ width: '100%', height: 'auto' }} />
                      </div>
                  )
                : <div className="w-full rounded-xl border-2 border-dashed border-amber-300 bg-white flex items-center justify-center" style={{ minHeight: '320px' }}>
                    <span className="material-symbols-outlined text-amber-300 text-[80px]">qr_code_2</span>
                  </div>
              }
              <div className="text-xs text-amber-700 text-center space-y-1">
                <p className="font-semibold">Open WhatsApp on your phone</p>
                <p>⋯ Menu → Linked Devices → Link a Device</p>
                <p className="text-amber-500 text-[11px]">QR auto-refreshes every 25 s — or tap Refresh QR for a new one instantly</p>
              </div>
            </div>
          )}

          {/* Sending Key info — auto-captured, no manual entry needed */}
          {hasSession && config?.sessionApiKey && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-slate-500">vpn_key</span>
                <p className="text-xs font-semibold text-slate-600">Sending Key</p>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full">Auto-captured</span>
              </div>
              <p className="text-xs text-slate-500 font-mono">{config.sessionApiKey}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This key was captured automatically when your session connected. It is used internally to send
                messages to patients — you do not need to enter or manage it manually.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
