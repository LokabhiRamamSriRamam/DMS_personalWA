import React, { useState } from 'react';
import SessionHealthPanel from '../components/whatsapp/SessionHealthPanel.jsx';
import InboxPanel from '../components/whatsapp/InboxPanel.jsx';
import ChatbotBuilderPanel from '../components/whatsapp/ChatbotBuilderPanel.jsx';

const TABS = [
  { id: 'session',  label: 'Session Health', icon: 'wifi' },
  { id: 'inbox',    label: 'Inbox',           icon: 'inbox' },
  { id: 'chatbots', label: 'Flows',            icon: 'account_tree' },
];

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState('session');

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-green-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-green-600 text-[20px]">chat</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">WhatsApp</h1>
          <p className="text-xs text-slate-500">Powered by WaSender</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="flex-1 min-h-0">
        {activeTab === 'session'  && <SessionHealthPanel />}
        {activeTab === 'inbox'    && <InboxPanel />}
        {activeTab === 'chatbots' && <ChatbotBuilderPanel />}
      </div>
    </div>
  );
}
