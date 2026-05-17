import React, { useState, useEffect } from 'react';
import { onCircuitChange, isUsingFallback } from '../services/api.js';

const AFFECTED = [
  { icon: 'schedule',        text: 'Scheduled WhatsApp messages (delay nodes) will not fire during this window' },
  { icon: 'event_available', text: 'Automatic appointment status updates are paused' },
  { icon: 'qr_code_scanner', text: 'WhatsApp QR code push notifications are unavailable — manual page refresh required' },
];

const WORKING = [
  'Patient records, appointments, treatments, invoices',
  'Manual WhatsApp messages from the Inbox',
  'Flow triggers from DMS events',
  'File uploads, reports, inventory',
];

export default function ServerStatusBanner() {
  const [usingFallback, setUsingFallback] = useState(isUsingFallback());
  const [modalDismissed, setModalDismissed] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [recoveryVisible, setRecoveryVisible] = useState(false);

  useEffect(() => {
    const unsub = onCircuitChange((down) => {
      if (down) {
        setUsingFallback(true);
        setModalDismissed(false);
        setBannerDismissed(false);
        setRecovered(false);
      } else if (usingFallback) {
        // Was on fallback, now recovered
        setUsingFallback(false);
        setModalDismissed(false);
        setBannerDismissed(false);
        setRecovered(true);
        setRecoveryVisible(true);
        setTimeout(() => setRecoveryVisible(false), 6000);
      }
    });
    return unsub;
  }, [usingFallback]);

  // Recovery toast
  if (recoveryVisible) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-fade-in">
        <span className="material-symbols-outlined text-[22px]">check_circle</span>
        <div>
          <p className="text-sm font-bold">Primary server restored</p>
          <p className="text-xs text-emerald-100">All systems are fully operational again.</p>
        </div>
        <button onClick={() => setRecoveryVisible(false)} className="ml-2 text-emerald-200 hover:text-white">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    );
  }

  if (!usingFallback) return null;

  // Full-screen modal — shown once until dismissed
  if (!modalDismissed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 flex items-start gap-4">
            <div className="bg-white/20 rounded-xl p-2 mt-0.5">
              <span className="material-symbols-outlined text-white text-[26px]">cloud_sync</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">Switched to Backup System</p>
              <p className="text-amber-100 text-sm mt-0.5">Your work continues without interruption</p>
            </div>
          </div>

          <div className="px-6 py-5 flex flex-col gap-5">
            {/* Reassurance */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex gap-3">
              <span className="material-symbols-outlined text-blue-500 text-[20px] mt-0.5">info</span>
              <p className="text-sm text-blue-800 leading-relaxed">
                Our primary infrastructure is temporarily unreachable. Your session has automatically switched to a redundant backup system. <span className="font-semibold">No data has been lost.</span> The system will reconnect automatically and silently once the primary is restored.
              </p>
            </div>

            {/* What still works */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Everything working normally</p>
              <div className="flex flex-col gap-1.5">
                {WORKING.map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
                    <p className="text-sm text-slate-700">{w}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* What's affected */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Temporarily limited</p>
              <div className="flex flex-col gap-2">
                {AFFECTED.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    <span className="material-symbols-outlined text-amber-500 text-[16px] mt-0.5">{a.icon}</span>
                    <p className="text-xs text-amber-800 leading-relaxed">{a.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setModalDismissed(true)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              Understood, continue working
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Slim persistent banner — shown after modal is dismissed
  if (bannerDismissed) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 z-40">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="material-symbols-outlined text-amber-500 text-[18px] flex-shrink-0">cloud_sync</span>
        <p className="text-xs text-amber-800 font-medium truncate">
          Running on backup infrastructure — scheduled messages & QR push paused.{' '}
          <button onClick={() => setModalDismissed(false)} className="underline font-semibold hover:text-amber-900">
            View details
          </button>
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider ml-1">Backup active</p>
        <button onClick={() => setBannerDismissed(true)} className="ml-3 text-amber-400 hover:text-amber-700">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}
