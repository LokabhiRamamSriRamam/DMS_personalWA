import React, { useState } from 'react';
import SessionHealthPanel from '../components/whatsapp/SessionHealthPanel.jsx';
import InboxPanel from '../components/whatsapp/InboxPanel.jsx';
import ChatbotBuilderPanel from '../components/whatsapp/ChatbotBuilderPanel.jsx';
import LogsPanel from '../components/whatsapp/LogsPanel.jsx';

const TABS = [
  { id: 'session',  label: 'Session Health', icon: 'wifi' },
  { id: 'inbox',    label: 'Inbox',           icon: 'inbox' },
  { id: 'chatbots', label: 'Flows',           icon: 'account_tree' },
  { id: 'logs',     label: 'Logs & Stats',    icon: 'analytics' },
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
          <p className="text-xs text-slate-500">Powered by Molaris AI</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-0.5 -mx-1 px-1">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-max min-w-full sm:w-fit sm:min-w-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] sm:text-[22px]">{tab.icon}</span>
              <span className="hidden xs:inline sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div className="flex-1 min-h-0">
        {activeTab === 'session'  && <SessionHealthPanel />}
        {activeTab === 'inbox'    && <InboxPanel />}
        {activeTab === 'chatbots' && <ChatbotBuilderPanel />}
        {activeTab === 'logs'     && <LogsPanel />}
      </div>
    </div>
  );
}
