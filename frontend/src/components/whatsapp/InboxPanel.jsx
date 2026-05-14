import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api.js';

function Avatar({ name, size = 'md' }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const sz = size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm';
  return (
    <div className={`${sz} rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  );
}

function formatTs(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000 || ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function MessageBubble({ msg, myPhone }) {
  const isOut = msg.from === myPhone;
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${isOut ? 'bg-[#137fec] text-white rounded-br-sm' : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'}`}>
        {msg.type === 'text' || !msg.type
          ? <p className="whitespace-pre-wrap break-words">{msg.body || msg.text || ''}</p>
          : msg.type === 'image'
          ? <div className="flex flex-col gap-1">
              <span className={`text-xs font-semibold ${isOut ? 'text-blue-100' : 'text-slate-400'}`}>Image</span>
              {msg.mediaUrl && <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="underline text-xs">View Image</a>}
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
          : msg.type === 'poll'
          ? <div>
              <p className="text-xs font-semibold mb-1">{msg.poll?.question || 'Poll'}</p>
              {(msg.poll?.options || []).map((opt, i) => (
                <div key={i} className={`text-xs px-2 py-1 rounded mb-0.5 ${isOut ? 'bg-blue-600' : 'bg-slate-100 text-slate-700'}`}>{opt}</div>
              ))}
            </div>
          : <p className="text-xs italic">[{msg.type} message]</p>
        }
        <div className={`flex items-center justify-end gap-1 mt-1 ${isOut ? 'text-blue-200' : 'text-slate-400'}`}>
          <span className="text-[10px]">{formatTs(msg.timestamp)}</span>
          {isOut && (
            <span className="material-symbols-outlined text-[12px]">
              {msg.status === 'read' ? 'done_all' : msg.status === 'delivered' ? 'done_all' : 'check'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PatientCard({ patient }) {
  if (!patient) return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-400">
      <span className="material-symbols-outlined text-[16px]">person_off</span>
      Unknown Patient — not registered in DMS
    </div>
  );
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-100">
      <span className="material-symbols-outlined text-blue-500 text-[20px]">person</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{patient.first_name} {patient.last_name}</span>
          <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 font-mono">{patient.patientId}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
          {patient.last_visit_date && (
            <span>Last visit: {new Date(patient.last_visit_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          )}
          {patient.total_due > 0 && (
            <span className="text-amber-600 font-semibold">Outstanding: ₹{patient.total_due}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InboxPanel() {
  const [conversations, setConversations] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [messages, setMessages] = useState([]);
  const [patientInfo, setPatientInfo] = useState(undefined); // undefined = loading, null = not found
  const [messageInput, setMessageInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myPhone, setMyPhone] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchInbox();
  }, []);

  useEffect(() => {
    if (!selectedPhone) return;
    fetchThread(selectedPhone);
    fetchPatient(selectedPhone);
  }, [selectedPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchInbox() {
    setLoading(true);
    try {
      const res = await api.get('/wasender/inbox');
      setConversations(res.data.conversations || []);
      // Detect own phone from session status
      const statusRes = await api.get('/wasender/session/status').catch(() => ({}));
      setMyPhone(statusRes.data?.connectedPhone || '');
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchThread(phone) {
    try {
      const res = await api.get(`/wasender/inbox/${encodeURIComponent(phone)}`);
      setMessages(res.data.messages || []);
    } catch {
      setMessages([]);
    }
  }

  async function fetchPatient(phone) {
    setPatientInfo(undefined);
    try {
      const res = await api.get('/patients', { params: { search: phone } });
      const list = res.data?.patients || res.data || [];
      setPatientInfo(list.length > 0 ? list[0] : null);
    } catch {
      setPatientInfo(null);
    }
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

  const filtered = conversations.filter(c =>
    !search || c.phone?.includes(search)
  );

  return (
    <div className="h-full flex rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ minHeight: '500px' }}>
      {/* Left: conversation list */}
      <div className="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col">
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by phone…"
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
          ) : filtered.map(conv => (
            <button
              key={conv.phone}
              onClick={() => setSelectedPhone(conv.phone)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left ${selectedPhone === conv.phone ? 'bg-blue-50' : ''}`}
            >
              <Avatar name={conv.phone} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800 truncate">{conv.phone}</span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">{formatTs(conv.lastMessage?.timestamp)}</span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {conv.lastMessage?.body || conv.lastMessage?.text || `[${conv.lastMessage?.type || 'message'}]`}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-slate-100">
          <button onClick={fetchInbox} className="w-full text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 py-1">
            <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
          </button>
        </div>
      </div>

      {/* Right: message thread */}
      {selectedPhone ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <Avatar name={selectedPhone} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">{selectedPhone}</p>
              {patientInfo && (
                <p className="text-xs text-slate-500">{patientInfo.first_name} {patientInfo.last_name} · {patientInfo.patientId}</p>
              )}
            </div>
          </div>

          {/* Patient info card */}
          {patientInfo !== undefined && (
            <PatientCard patient={patientInfo} />
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">No messages</div>
            ) : messages.map((msg, i) => (
              <MessageBubble key={msg.id || i} msg={msg} myPhone={myPhone} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Send bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100 bg-white">
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
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
          <span className="material-symbols-outlined text-[48px]">chat_bubble_outline</span>
          <p className="text-sm">Select a conversation</p>
        </div>
      )}
    </div>
  );
}
