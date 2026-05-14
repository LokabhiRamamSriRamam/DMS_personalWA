import React, { useState, useEffect } from 'react';

const NODE_TYPES = [
  { value: 'message',   label: 'Message',   icon: 'chat_bubble', desc: 'Send a WhatsApp message' },
  { value: 'delay',     label: 'Delay',     icon: 'schedule',    desc: 'Wait before continuing' },
  { value: 'condition', label: 'Condition', icon: 'alt_route',   desc: 'Branch based on reply' },
  { value: 'subflow',   label: 'Sub-Flow',  icon: 'account_tree', desc: 'Jump into another flow' },
  { value: 'end',       label: 'End',       icon: 'stop_circle', desc: 'End this flow' },
];

const MSG_TYPES = [
  { value: 'text',     label: 'Text',     icon: 'chat' },
  { value: 'image',    label: 'Image',    icon: 'image' },
  { value: 'video',    label: 'Video',    icon: 'videocam' },
  { value: 'document', label: 'Document', icon: 'description' },
  { value: 'audio',    label: 'Audio',    icon: 'mic' },
  { value: 'poll',     label: 'Poll',     icon: 'poll' },
  { value: 'location', label: 'Location', icon: 'location_on' },
];

const DEFAULT = {
  nodeType: 'message',
  label: '',
  messageType: 'text',
  content: { text: '', imageUrl: '', videoUrl: '', documentUrl: '', fileName: '', audioUrl: '', caption: '', poll: { question: '', options: ['', ''], multiSelect: false }, location: { latitude: '', longitude: '', name: '', address: '' } },
  delayValue: 1,
  delayUnit: 'hours',
  waitForResponse: false,
  referencedFlowId: '',
};

function merge(target, source) {
  return { ...target, ...source, content: { ...target.content, ...(source.content || {}), poll: { ...target.content.poll, ...(source.content?.poll || {}) }, location: { ...target.content.location, ...(source.content?.location || {}) } } };
}

export default function ChatbotNodeModal({ isOpen, onClose, onSave, nodeData, flows = [] }) {
  const [form, setForm] = useState(DEFAULT);

  useEffect(() => {
    if (nodeData) {
      setForm(merge(DEFAULT, nodeData.data || nodeData));
    } else {
      setForm(DEFAULT);
    }
  }, [nodeData, isOpen]);

  if (!isOpen) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setContent = (k, v) => setForm(f => ({ ...f, content: { ...f.content, [k]: v } }));
  const setPoll = (k, v) => setForm(f => ({ ...f, content: { ...f.content, poll: { ...f.content.poll, [k]: v } } }));
  const setLocation = (k, v) => setForm(f => ({ ...f, content: { ...f.content, location: { ...f.content.location, [k]: v } } }));

  function handleSave() {
    if (!form.label.trim() && form.nodeType !== 'end') return alert('Label is required');
    onSave(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{nodeData ? 'Edit Node' : 'Add Node'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Node type selector (only for new nodes) */}
          {!nodeData && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Node Type</label>
              <div className="grid grid-cols-2 gap-2">
                {NODE_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => set('nodeType', t.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-sm transition-colors ${form.nodeType === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-blue-300'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{t.label}</p>
                      <p className="text-[10px] text-slate-400">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Label */}
          {form.nodeType !== 'end' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Label (shown on canvas)</label>
              <input
                type="text"
                value={form.label}
                onChange={e => set('label', e.target.value)}
                placeholder="e.g. Welcome Message"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* ── Message node fields ── */}
          {form.nodeType === 'message' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message Type</label>
                <div className="flex flex-wrap gap-2">
                  {MSG_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => set('messageType', t.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${form.messageType === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-blue-300 text-slate-600'}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content by type */}
              {form.messageType === 'text' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message Text</label>
                  <textarea
                    rows={4}
                    value={form.content.text}
                    onChange={e => setContent('text', e.target.value)}
                    placeholder="Hello {{firstName}}! Use {{name}}, {{date}}, {{time}}, {{doctorName}}, {{treatment}}, {{invoiceId}}, {{amount}}"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-slate-400">Supports: {'{{'+'name}}'},  {'{{'+'firstName}}'},  {'{{'+'date}}'},  {'{{'+'time}}'},  {'{{'+'doctorName}}'},  {'{{'+'treatment}}'},  {'{{'+'amount}}'}</p>
                </div>
              )}
              {form.messageType === 'image' && (
                <>
                  <InputField label="Image URL" value={form.content.imageUrl} onChange={v => setContent('imageUrl', v)} placeholder="https://…" />
                  <InputField label="Caption" value={form.content.caption} onChange={v => setContent('caption', v)} placeholder="Optional caption" />
                </>
              )}
              {form.messageType === 'video' && (
                <>
                  <InputField label="Video URL" value={form.content.videoUrl} onChange={v => setContent('videoUrl', v)} placeholder="https://…" />
                  <InputField label="Caption" value={form.content.caption} onChange={v => setContent('caption', v)} />
                </>
              )}
              {form.messageType === 'document' && (
                <>
                  <InputField label="Document URL" value={form.content.documentUrl} onChange={v => setContent('documentUrl', v)} placeholder="https://…" />
                  <InputField label="File Name" value={form.content.fileName} onChange={v => setContent('fileName', v)} placeholder="report.pdf" />
                  <InputField label="Caption" value={form.content.caption} onChange={v => setContent('caption', v)} />
                </>
              )}
              {form.messageType === 'audio' && (
                <InputField label="Audio URL" value={form.content.audioUrl} onChange={v => setContent('audioUrl', v)} placeholder="https://…" />
              )}
              {form.messageType === 'poll' && (
                <div className="flex flex-col gap-3">
                  <InputField label="Poll Question" value={form.content.poll.question} onChange={v => setPoll('question', v)} placeholder="How was your experience?" />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Options</label>
                    {(form.content.poll.options || []).map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const opts = [...form.content.poll.options];
                            opts[i] = e.target.value;
                            setPoll('options', opts);
                          }}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {form.content.poll.options.length > 2 && (
                          <button onClick={() => setPoll('options', form.content.poll.options.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setPoll('options', [...form.content.poll.options, ''])}
                      className="text-xs text-blue-600 hover:underline text-left mt-1"
                    >
                      + Add Option
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.content.poll.multiSelect} onChange={e => setPoll('multiSelect', e.target.checked)} className="rounded" />
                    Allow multiple selections
                  </label>
                </div>
              )}
              {form.messageType === 'location' && (
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Latitude"  value={form.content.location.latitude}  onChange={v => setLocation('latitude', v)}  placeholder="18.9220" />
                  <InputField label="Longitude" value={form.content.location.longitude} onChange={v => setLocation('longitude', v)} placeholder="72.8347" />
                  <InputField label="Name"    value={form.content.location.name}    onChange={v => setLocation('name', v)}    placeholder="Clinic Name" />
                  <InputField label="Address" value={form.content.location.address} onChange={v => setLocation('address', v)} placeholder="123 Main St" />
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.waitForResponse} onChange={e => set('waitForResponse', e.target.checked)} className="rounded" />
                Wait for customer reply before continuing
              </label>
              {form.waitForResponse && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                  Draw edges from this node to define which reply leads where. Edge labels = customer reply text (or * for any).
                </p>
              )}
            </>
          )}

          {/* ── Delay node ── */}
          {form.nodeType === 'delay' && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Wait</label>
                <input
                  type="number"
                  min={1}
                  value={form.delayValue}
                  onChange={e => set('delayValue', Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1 mt-4">
                <select
                  value={form.delayUnit}
                  onChange={e => set('delayUnit', e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Subflow node ── */}
          {form.nodeType === 'subflow' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference Flow</label>
              <select
                value={form.referencedFlowId}
                onChange={e => set('referencedFlowId', e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a flow…</option>
                {flows.map(f => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400">Flow will jump into this sub-flow and not return.</p>
            </div>
          )}

          {/* ── End node ── */}
          {form.nodeType === 'end' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={e => set('label', e.target.value)}
                placeholder="End"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#137fec] text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Save Node
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
