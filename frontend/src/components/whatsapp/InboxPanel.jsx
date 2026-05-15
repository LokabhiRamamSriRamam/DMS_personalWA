import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { User, Phone, MapPin, Activity, Edit2, X, ChevronDown } from 'lucide-react';
import api from '../../services/api.js';

function formatTs(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatDate(ds) {
  if (!ds) return '-';
  return new Date(ds).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getAge(dob) {
  if (!dob) return 'N/A';
  return new Date().getFullYear() - new Date(dob).getFullYear();
}

function Avatar({ name, src, size = 'md' }) {
  const [imgErr, setImgErr] = useState(false);
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const sz = size === 'sm' ? 'size-8 text-xs' : size === 'lg' ? 'size-14 text-base' : 'size-10 text-sm';
  if (src && !imgErr) {
    return <img src={src} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} onError={() => setImgErr(true)} />;
  }
  return (
    <div className={`${sz} rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isOut = msg.direction === 'outbound';
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm
        ${isOut ? 'bg-[#137fec] text-white rounded-br-sm' : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'}`}>
        {msg.type === 'text' || !msg.type
          ? <p className="whitespace-pre-wrap break-words">{msg.body || ''}</p>
          : msg.type === 'image'
          ? <div className="flex flex-col gap-1">
              <span className={`text-xs font-semibold ${isOut ? 'text-blue-100' : 'text-slate-400'}`}>Image</span>
              {msg.mediaUrl && <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="underline text-xs">View</a>}
              {msg.caption && <p className="text-xs mt-1">{msg.caption}</p>}
            </div>
          : msg.type === 'document'
          ? <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">description</span>
              <div>
                <p className="text-xs font-medium">{msg.fileName || 'Document'}</p>
                {msg.mediaUrl && <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="text-xs underline">Download</a>}
              </div>
            </div>
          : <p className="text-xs italic">[{msg.type}]</p>
        }
        <div className={`flex items-center justify-end gap-1 mt-1 ${isOut ? 'text-blue-200' : 'text-slate-400'}`}>
          <span className="text-[10px]">{formatTs(msg.timestamp)}</span>
          {isOut && <span className="material-symbols-outlined text-[12px]">check</span>}
        </div>
      </div>
    </div>
  );
}

// ── Right panel: full patient profile card ─────────────────────────────────────

function PatientRightPanel({ contact, patientId }) {
  const [patient,  setPatient]  = useState(null);
  const [visits,   setVisits]   = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState('general');
  const [editing,  setEditing]  = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (!patientId) { setPatient(null); return; }
    setLoading(true);
    Promise.all([
      api.get(`/patients/${patientId}`),
      api.get(`/visits/patient/${patientId}`),
      api.get(`/invoices?patient_id=${patientId}`),
    ]).then(([pRes, vRes, iRes]) => {
      setPatient(pRes.data);
      setVisits(vRes.data || []);
      setInvoices(iRes.data || []);
      const p = pRes.data;
      setEditForm({
        blood_group:             p.blood_group || '',
        address:                 p.contact?.address || '',
        email:                   p.contact?.email || '',
        emergency_contact_name:  p.emergency_contact?.name || '',
        emergency_contact_phone: (p.emergency_contact?.phone || '').replace(/^\+91/, ''),
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [patientId]);

  async function saveEdit() {
    try {
      await api.put(`/patients/${patientId}`, {
        blood_group: editForm.blood_group,
        contact: { address: editForm.address, email: editForm.email, mobile: patient.contact?.mobile, city: patient.contact?.city },
        emergency_contact: {
          name: editForm.emergency_contact_name,
          phone: editForm.emergency_contact_phone ? `+91${editForm.emergency_contact_phone}` : '',
          relation: patient.emergency_contact?.relation || '',
        },
      });
      setEditing(false);
      const res = await api.get(`/patients/${patientId}`);
      setPatient(res.data);
    } catch { alert('Failed to save'); }
  }

  // ── No patient registered ──
  if (!patientId && !loading) {
    return (
      <div className="flex flex-col h-full bg-slate-50 border-l border-slate-100">
        {/* Contact info header */}
        <div className="flex flex-col items-center gap-2 p-4 border-b border-slate-100 bg-white">
          <Avatar name={contact?.name || contact?.phone} src={contact?.picture} size="lg" />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-800">{contact?.name || contact?.phone || '—'}</p>
            {contact?.status && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{contact.status}</p>}
            <p className="text-xs text-slate-400 mt-1 font-mono">{contact?.phone}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-slate-400 p-4">
          <span className="material-symbols-outlined text-[40px]">person_off</span>
          <p className="text-xs text-center">This contact is not registered as a patient in DMS.</p>
        </div>
      </div>
    );
  }

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 border-l border-slate-100">
        <span className="material-symbols-outlined animate-spin text-blue-400 text-[28px]">refresh</span>
      </div>
    );
  }

  const p = patient;
  const totalBilled  = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPending = invoices.reduce((s, i) => s + (i.pending_amount || 0), 0);

  return (
    <div className="flex flex-col h-full bg-[#f6f7f8] border-l border-slate-200 overflow-hidden">

      {/* Contact + patient header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={contact?.name || `${p.first_name} ${p.last_name}`} src={contact?.picture} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{p.first_name} {p.last_name}</p>
            <p className="text-[10px] font-mono text-blue-600">{p.patientId}</p>
            {contact?.status && <p className="text-[10px] text-slate-400 truncate">{contact.status}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">{p.gender}</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">{getAge(p.dob)} Yrs</span>
          {p.blood_group && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded uppercase">{p.blood_group}</span>}
          {p.total_due > 0 && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded">₹{p.total_due} due</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        {[['general', 'General'], ['medical', 'Medical'], ['finance', 'Finance']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors
              ${tab === key ? 'border-[#137fec] text-[#137fec]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">

        {tab === 'general' && (
          <>
            {/* Contact details */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <User size={11}/> Personal Details
                </p>
                {!editing
                  ? <button onClick={() => setEditing(true)} className="text-[10px] text-[#137fec] flex items-center gap-0.5 hover:underline">
                      <Edit2 size={10}/> Edit
                    </button>
                  : <div className="flex gap-1">
                      <button onClick={() => setEditing(false)} className="text-[10px] text-slate-500 hover:underline">Cancel</button>
                      <button onClick={saveEdit} className="text-[10px] text-[#137fec] font-semibold hover:underline">Save</button>
                    </div>
                }
              </div>
              {editing ? (
                <div className="flex flex-col gap-2">
                  {[
                    ['Blood Group', 'blood_group', 'text'],
                    ['Address', 'address', 'text'],
                    ['Email', 'email', 'email'],
                    ['Emergency Name', 'emergency_contact_name', 'text'],
                    ['Emergency Phone', 'emergency_contact_phone', 'tel'],
                  ].map(([label, key, type]) => (
                    <div key={key}>
                      <label className="text-[10px] text-slate-400 block mb-0.5">{label}</label>
                      <input
                        type={type}
                        value={editForm[key]}
                        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {[
                    ['Mobile',     p.contact?.mobile],
                    ['Email',      p.contact?.email],
                    ['City',       p.contact?.city],
                    ['Address',    p.contact?.address],
                    ['Blood Group',p.blood_group],
                    ['DOB',        p.dob ? formatDate(p.dob) : null],
                    ['Emrg. Name', p.emergency_contact?.name],
                    ['Emrg. Phone',p.emergency_contact?.phone],
                    ['Reference',  p.reference_source],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-2 border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400 flex-shrink-0">{label}</span>
                      <span className="font-medium text-slate-800 text-right truncate">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visit stats */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Visit Summary</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-700">{visits.length}</p>
                  <p className="text-[10px] text-blue-500">Total Visits</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-xs font-bold text-slate-700">{p.last_visit_date ? formatDate(p.last_visit_date) : 'Never'}</p>
                  <p className="text-[10px] text-slate-500">Last Visit</p>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'medical' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Activity size={11}/> Medical Profile
            </p>
            <div className="mb-3">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1.5">Conditions</p>
              <div className="flex flex-wrap gap-1.5">
                {p.medical_history?.length > 0
                  ? p.medical_history.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-semibold rounded-full border border-red-100">{t}</span>
                    ))
                  : <span className="text-[11px] text-slate-400 italic">None</span>
                }
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1.5">Allergies</p>
              <div className="flex flex-wrap gap-1.5">
                {p.allergies?.length > 0
                  ? p.allergies.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-semibold rounded-full border border-orange-100">{t}</span>
                    ))
                  : <span className="text-[11px] text-slate-400 italic">None</span>
                }
              </div>
            </div>
            {p.dentition_type && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Dentition</p>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full">{p.dentition_type}</span>
              </div>
            )}
          </div>
        )}

        {tab === 'finance' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-blue-600 font-semibold">Total Billed</p>
                <p className="text-base font-bold text-blue-900">₹{totalBilled.toLocaleString()}</p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-orange-600 font-semibold">Pending</p>
                <p className="text-base font-bold text-orange-900">₹{totalPending.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {invoices.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3">No invoices.</p>
              ) : invoices.map(inv => (
                <div key={inv._id} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-[10px] font-mono text-slate-500">{inv.invoice_id}</p>
                    <p className="text-[10px] text-slate-400">{formatDate(inv.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-800">₹{inv.total_amount?.toLocaleString()}</p>
                    <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function InboxPanel() {
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [contact,       setContact]       = useState(null);
  const [patientId,     setPatientId]     = useState(null);  // _id of matched DMS patient
  const [messageInput,  setMessageInput]  = useState('');
  const [search,        setSearch]        = useState('');
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);

  const messagesContainerRef = useRef(null);
  const contactCache = useRef({});

  // Scroll to bottom of the thread (like WhatsApp)
  function scrollToBottom(behavior = 'instant') {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  useEffect(() => { fetchInbox(); }, []);

  // Scroll to bottom whenever messages update
  useLayoutEffect(() => {
    scrollToBottom(messages.length > 0 ? 'smooth' : 'instant');
  }, [messages]);

  useEffect(() => {
    if (!selectedPhone) return;
    fetchThread(selectedPhone);
    fetchContactInfo(selectedPhone);
    fetchPatientId(selectedPhone);
  }, [selectedPhone]);

  async function fetchInbox() {
    setLoading(true);
    try {
      const res = await api.get('/wasender/inbox');
      const convos = res.data.conversations || [];
      setConversations(convos);
      convos.slice(0, 20).forEach(c => loadContactName(c.phone));
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadContactName(phone) {
    if (contactCache.current[phone]) return;
    try {
      const res = await api.get(`/wasender/contacts/${encodeURIComponent(phone)}`);
      const d = res.data?.data || res.data || {};
      contactCache.current[phone] = { name: d.name || d.notify || d.pushname || null, picture: null };
      setConversations(prev => [...prev]);
    } catch {}
  }

  async function fetchThread(phone) {
    try {
      const res = await api.get(`/wasender/inbox/${encodeURIComponent(phone)}`);
      setMessages(res.data.messages || []);
    } catch {
      setMessages([]);
    }
  }

  async function fetchContactInfo(phone) {
    setContact({ phone });
    try {
      const infoRes = await api.get(`/wasender/contacts/${encodeURIComponent(phone)}`).catch(() => null);
      const d = infoRes?.data?.data || infoRes?.data || {};
      const picRes  = await api.get(`/wasender/contacts/${encodeURIComponent(phone)}/picture`).catch(() => null);
      const picture = picRes?.data?.data?.picture || picRes?.data?.picture || null;
      const info = { phone, name: d.name || d.notify || d.pushname || null, status: d.status || null, picture };
      contactCache.current[phone] = info;
      setContact(info);
    } catch {
      setContact({ phone });
    }
  }

  async function fetchPatientId(phone) {
    setPatientId(null);
    try {
      const res  = await api.get('/patients', { params: { search: phone } });
      const list = res.data?.patients || res.data || [];
      setPatientId(list.length > 0 ? list[0]._id : null);
    } catch {}
  }

  async function handleSend() {
    if (!messageInput.trim() || !selectedPhone) return;
    setSending(true);
    try {
      await api.post('/wasender/send', { to: selectedPhone, type: 'text', text: messageInput.trim() });
      setMessageInput('');
      fetchThread(selectedPhone);
    } catch (err) {
      alert(err.response?.data?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  }

  const displayName = phone => contactCache.current[phone]?.name || phone;

  const filtered = conversations.filter(c =>
    !search ||
    c.phone?.includes(search) ||
    (contactCache.current[c.phone]?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ minHeight: '500px' }}>

      {/* ── Left: conversation list ── */}
      <div className="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col">
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm gap-2">
              <span className="material-symbols-outlined text-[32px]">inbox</span>
              No conversations
            </div>
          ) : filtered.map(conv => {
            const cached = contactCache.current[conv.phone];
            const name   = cached?.name || conv.phone;
            return (
              <button
                key={conv.phone}
                onClick={() => setSelectedPhone(conv.phone)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left ${selectedPhone === conv.phone ? 'bg-blue-50' : ''}`}
              >
                <Avatar name={name} src={cached?.picture} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 truncate">{name}</span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">{formatTs(conv.lastMessage?.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                    {conv.lastMessage?.direction === 'outbound' &&
                      <span className="material-symbols-outlined text-[11px] text-slate-300">arrow_forward</span>}
                    {conv.lastMessage?.body || `[${conv.lastMessage?.type || 'message'}]`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-100">
          <button onClick={fetchInbox} className="w-full text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 py-1">
            <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
          </button>
        </div>
      </div>

      {/* ── Middle + Right ── */}
      {selectedPhone ? (
        <>
          {/* Middle: message thread */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <Avatar name={contact?.name || selectedPhone} src={contact?.picture} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{contact?.name || selectedPhone}</p>
                <p className="text-xs text-slate-400">{selectedPhone}</p>
              </div>
              <button onClick={() => fetchThread(selectedPhone)} className="text-slate-400 hover:text-slate-600 p-1" title="Refresh">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            </div>

            {/* Messages — oldest at top, newest at bottom (WhatsApp style) */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50"
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">No messages yet</div>
              ) : messages.map((msg, i) => (
                <MessageBubble key={msg._id || msg.messageId || i} msg={msg} />
              ))}
            </div>

            {/* Send bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 bg-white flex-shrink-0">
              <input
                type="text"
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a message…"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={sending || !messageInput.trim()}
                className="size-10 rounded-xl bg-[#137fec] text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
          </div>

          {/* Right: full patient profile */}
          <div className="w-72 flex-shrink-0 overflow-hidden flex flex-col">
            <PatientRightPanel contact={contact} patientId={patientId} />
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
          <span className="material-symbols-outlined text-[48px]">chat_bubble_outline</span>
          <p className="text-sm">Select a conversation</p>
        </div>
      )}
    </div>
  );
}
