import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import api from '../../services/api.js';
import ChatbotFlowModal from '../../modals/ChatbotFlowModal.jsx';
import ChatbotNodeModal from '../../modals/ChatbotNodeModal.jsx';

// ── Trigger badge labels ──────────────────────────────────────────────────────
const TRIGGER_LABELS = {
  first_message:           { label: 'First Message',    color: 'bg-purple-100 text-purple-700' },
  appointment_received:    { label: 'Appt Received',    color: 'bg-indigo-100 text-indigo-700' },
  appointment_booked:      { label: 'Appt Booked',      color: 'bg-blue-100 text-blue-700' },
  appointment_confirmed:   { label: 'Appt Confirmed',   color: 'bg-green-100 text-green-700' },
  appointment_reminder:    { label: 'Appt Reminder',    color: 'bg-yellow-100 text-yellow-700' },
  appointment_completed:   { label: 'Appt Completed',   color: 'bg-emerald-100 text-emerald-700' },
  appointment_rescheduled: { label: 'Appt Rescheduled', color: 'bg-orange-100 text-orange-700' },
  treatment_completed:     { label: 'Treatment Done',   color: 'bg-teal-100 text-teal-700' },
  post_treatment_care:     { label: 'Post-Treatment',   color: 'bg-cyan-100 text-cyan-700' },
  invoice_created:         { label: 'Invoice Created',  color: 'bg-slate-100 text-slate-700' },
  custom_keyword:          { label: 'Keyword',          color: 'bg-pink-100 text-pink-700' },
};

// ── Custom node components ────────────────────────────────────────────────────
function NodeWrapper({ children, borderColor, selected, onEdit, onDelete, hasTarget = true, hasSource = true }) {
  return (
    <div className={`relative rounded-xl border-2 bg-white shadow-sm min-w-[180px] max-w-[240px] ${borderColor} ${selected ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}>
      {hasTarget  && <Handle type="target"  position={Position.Top}    className="!bg-blue-500 !size-3" />}
      {hasSource  && <Handle type="source"  position={Position.Bottom} className="!bg-blue-500 !size-3" />}
      {children}
      <div className="nodrag nopan flex items-center justify-end gap-1 border-t border-slate-100 px-2 py-1">
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
        >
          <span className="material-symbols-outlined text-[13px]">edit</span>Edit
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
        >
          <span className="material-symbols-outlined text-[13px]">delete</span>
        </button>
      </div>
    </div>
  );
}

const MSG_ICONS = { text: 'chat', image: 'image', video: 'videocam', document: 'description', audio: 'mic', poll: 'poll', location: 'location_on' };

function MessageNode({ data, selected }) {
  return (
    <NodeWrapper borderColor="border-blue-400" selected={selected} onEdit={data.onEdit} onDelete={data.onDelete}>
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-blue-500 text-[18px]">{MSG_ICONS[data.messageType] || 'chat'}</span>
          <span className="text-xs font-bold text-slate-700 truncate">{data.label || 'Message'}</span>
        </div>
        <span className="text-[10px] bg-blue-50 text-blue-600 rounded px-1.5 py-0.5 font-medium uppercase">{data.messageType || 'text'}</span>
        {data.content?.text && <p className="text-[11px] text-slate-500 mt-1 truncate">{data.content.text.slice(0, 60)}</p>}
        {data.waitForResponse && <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">reply</span>Waits for reply</p>}
      </div>
    </NodeWrapper>
  );
}

function DelayNode({ data, selected }) {
  return (
    <NodeWrapper borderColor="border-amber-400" selected={selected} onEdit={data.onEdit} onDelete={data.onDelete}>
      <div className="px-3 py-2.5 flex items-center gap-2">
        <span className="material-symbols-outlined text-amber-500 text-[18px]">schedule</span>
        <div>
          <p className="text-xs font-bold text-slate-700">{data.label || 'Delay'}</p>
          <p className="text-[11px] text-slate-500">Wait {data.delayValue} {data.delayUnit}</p>
        </div>
      </div>
    </NodeWrapper>
  );
}

function ConditionNode({ data, selected }) {
  return (
    <NodeWrapper borderColor="border-purple-400" selected={selected} onEdit={data.onEdit} onDelete={data.onDelete}>
      <div className="px-3 py-2.5 flex items-center gap-2">
        <span className="material-symbols-outlined text-purple-500 text-[18px]">alt_route</span>
        <div>
          <p className="text-xs font-bold text-slate-700">{data.label || 'Condition'}</p>
          <p className="text-[11px] text-slate-500">Wait for reply</p>
        </div>
      </div>
    </NodeWrapper>
  );
}

function SubflowNode({ data, selected }) {
  return (
    <NodeWrapper borderColor="border-teal-400" selected={selected} onEdit={data.onEdit} onDelete={data.onDelete} hasSource={false}>
      <div className="px-3 py-2.5 flex items-center gap-2">
        <span className="material-symbols-outlined text-teal-500 text-[18px]">account_tree</span>
        <div>
          <p className="text-xs font-bold text-slate-700">{data.label || 'Sub-Flow'}</p>
          <p className="text-[11px] text-slate-500 truncate">{data.referencedFlowName || data.referencedFlowId || '(none)'}</p>
        </div>
      </div>
    </NodeWrapper>
  );
}

function EndNode({ data, selected }) {
  return (
    <NodeWrapper borderColor="border-slate-400" selected={selected} onEdit={data.onEdit} onDelete={data.onDelete} hasSource={false}>
      <div className="px-3 py-2.5 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-500 text-[18px]">stop_circle</span>
        <p className="text-xs font-bold text-slate-700">{data.label || 'End'}</p>
      </div>
    </NodeWrapper>
  );
}

const NODE_TYPES = { messageNode: MessageNode, delayNode: DelayNode, conditionNode: ConditionNode, subflowNode: SubflowNode, endNode: EndNode };

const TYPE_TO_NODETYPE = { message: 'messageNode', delay: 'delayNode', condition: 'conditionNode', subflow: 'subflowNode', end: 'endNode' };

// ── Convert DB nodes/edges to ReactFlow format ────────────────────────────────
function toRfNodes(dbNodes, handlersRef) {
  return (dbNodes || []).map(n => ({
    id: n.id,
    type: TYPE_TO_NODETYPE[n.data?.nodeType] || 'messageNode',
    position: n.position || { x: 100, y: 100 },
    data: { ...n.data, onEdit: () => handlersRef.current.onEdit(n.id), onDelete: () => handlersRef.current.onDelete(n.id) },
  }));
}

function toRfEdges(dbEdges) {
  return (dbEdges || []).map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label || '',
    type: 'smoothstep',
    style: { stroke: '#94a3b8' },
    labelStyle: { fontSize: 11, fill: '#475569' },
  }));
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ChatbotBuilderPanel() {
  const [flows, setFlows]               = useState([]);
  const [templates, setTemplates]       = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [saving, setSaving]             = useState(false);

  // Modals
  const [flowModal, setFlowModal]   = useState({ open: false, flow: null });
  const [nodeModal, setNodeModal]   = useState({ open: false, node: null, nodeId: null });
  const [templatePicker, setTemplatePicker] = useState(false);

  // Edge label editor
  const [edgeEdit, setEdgeEdit] = useState(null); // { edgeId, label, x, y }
  const edgeEditRef = useRef('');

  const handlersRef = useRef({});
  const nodesRef    = useRef([]);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  useEffect(() => {
    fetchFlows();
    fetchTemplates();
  }, []);

  async function fetchFlows() {
    try {
      const res = await api.get('/chatbot/flows');
      setFlows(res.data || []);
    } catch {}
  }

  async function fetchTemplates() {
    try {
      const res = await api.get('/chatbot/templates');
      setTemplates(res.data || []);
    } catch {}
  }

  function loadFlow(flow) {
    setSelectedFlow(flow);
    const rfNodes = toRfNodes(flow.nodes, handlersRef);
    const rfEdges = toRfEdges(flow.edges);
    setNodes(rfNodes);
    setEdges(rfEdges);
  }

  // Keep handlers fresh — read live node data from nodesRef, not the stale DB snapshot
  handlersRef.current = {
    onEdit: (id) => {
      const rfNode = nodesRef.current.find(n => n.id === id);
      setNodeModal({ open: true, nodeId: id, node: rfNode ?? null });
    },
    onDelete: (id) => deleteNode(id),
  };

  function deleteNode(nodeId) {
    setNodes(ns => ns.filter(n => n.id !== nodeId));
    setEdges(es => es.filter(e => e.source !== nodeId && e.target !== nodeId));
  }

  const onConnect = useCallback((params) => {
    const id = `e_${Date.now()}`;
    setEdges(es => addEdge({ ...params, id, label: '', type: 'smoothstep', style: { stroke: '#94a3b8' }, labelStyle: { fontSize: 11, fill: '#475569' } }, es));
    // open label editor immediately after connecting
    setTimeout(() => {
      setEdgeEdit({ edgeId: id, label: '', x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 60 });
      edgeEditRef.current = '';
    }, 50);
  }, [setEdges]);

  const onEdgeClick = useCallback((_evt, edge) => {
    const rect = _evt.target.getBoundingClientRect();
    setEdgeEdit({ edgeId: edge.id, label: edge.label || '', x: rect.left, y: rect.top });
    edgeEditRef.current = edge.label || '';
  }, []);

  function commitEdgeLabel() {
    const label = edgeEditRef.current;
    setEdges(es => es.map(e => e.id === edgeEdit.edgeId ? { ...e, label } : e));
    setEdgeEdit(null);
  }

  function addNode(formData) {
    const nodeType = TYPE_TO_NODETYPE[formData.nodeType] || 'messageNode';
    const id = `n_${Date.now()}`;
    const newNode = {
      id,
      type: nodeType,
      position: { x: 150 + Math.random() * 100, y: 100 + (nodes.length * 120) },
      data: {
        ...formData,
        onEdit:   () => handlersRef.current.onEdit(id),
        onDelete: () => handlersRef.current.onDelete(id),
      },
    };
    setNodes(ns => [...ns, newNode]);
  }

  function updateNode(nodeId, formData) {
    setNodes(ns => ns.map(n => n.id === nodeId
      ? { ...n, data: { ...formData, onEdit: n.data.onEdit, onDelete: n.data.onDelete } }
      : n
    ));
  }

  async function saveFlow() {
    if (!selectedFlow) return;
    setSaving(true);
    try {
      const dbNodes = nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: { ...n.data, onEdit: undefined, onDelete: undefined } }));
      const dbEdges = edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label || '' }));
      const rootNodeId = dbNodes[0]?.id || selectedFlow.rootNodeId;
      const res = await api.put(`/chatbot/flows/${selectedFlow._id}`, { nodes: dbNodes, edges: dbEdges, rootNodeId });
      setSelectedFlow(res.data);
      fetchFlows();
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleFlow(flow) {
    try {
      const res = await api.patch(`/chatbot/flows/${flow._id}/toggle`);
      setFlows(fs => fs.map(f => f._id === flow._id ? { ...f, isActive: res.data.isActive } : f));
      if (selectedFlow?._id === flow._id) setSelectedFlow(sf => ({ ...sf, isActive: res.data.isActive }));
    } catch {}
  }

  async function deleteFlow(flow) {
    if (!window.confirm(`Delete flow "${flow.name}"?`)) return;
    try {
      await api.delete(`/chatbot/flows/${flow._id}`);
      setFlows(fs => fs.filter(f => f._id !== flow._id));
      if (selectedFlow?._id === flow._id) { setSelectedFlow(null); setNodes([]); setEdges([]); }
    } catch {}
  }

  async function useTemplate(template) {
    try {
      const res = await api.post(`/chatbot/flows/${template._id}/duplicate`);
      setFlows(fs => [res.data, ...fs]);
      setTemplatePicker(false);
      loadFlow(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to use template');
    }
  }

  const triggerMeta = t => TRIGGER_LABELS[t] || { label: t, color: 'bg-slate-100 text-slate-600' };

  return (
    <div className="h-full flex gap-4" style={{ minHeight: '600px' }}>
      {/* Left: flow list */}
      <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-slate-200 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-sm">Flows</h2>
          <button
            onClick={() => setTemplatePicker(true)}
            className="flex items-center gap-1 text-xs text-white bg-[#137fec] px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {flows.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs gap-2">
              <span className="material-symbols-outlined text-[32px]">account_tree</span>No flows yet
            </div>
          )}
          {flows.map(flow => {
            const m = triggerMeta(flow.triggerType);
            return (
              <div
                key={flow._id}
                onClick={() => loadFlow(flow)}
                className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${selectedFlow?._id === flow._id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800 truncate">{flow.name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onMouseDown={e => { e.stopPropagation(); setFlowModal({ open: true, flow }); }}
                      className="size-6 flex items-center justify-center rounded text-slate-400 hover:text-blue-600"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      onMouseDown={e => { e.stopPropagation(); deleteFlow(flow); }}
                      className="size-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${m.color}`}>{m.label}</span>
                  {flow.treatmentName && <span className="text-[10px] text-slate-500 truncate">{flow.treatmentName}</span>}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[10px] font-medium ${flow.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {flow.isActive ? '● Active' : '○ Inactive'}
                  </span>
                  <button
                    onMouseDown={e => { e.stopPropagation(); toggleFlow(flow); }}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${flow.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                  >
                    {flow.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: canvas */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
        {selectedFlow ? (
          <>
            {/* Canvas toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">{selectedFlow.name}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${triggerMeta(selectedFlow.triggerType).color}`}>
                  {triggerMeta(selectedFlow.triggerType).label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNodeModal({ open: true, node: null, nodeId: null })}
                  className="flex items-center gap-1 text-sm text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>Add Node
                </button>
                <button
                  onClick={saveFlow}
                  disabled={saving}
                  className="flex items-center gap-1 text-sm text-white bg-[#137fec] px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'save'}</span>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* ReactFlow canvas */}
            <div className="flex-1">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={onEdgeClick}
                nodeTypes={NODE_TYPES}
                fitView
                defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#94a3b8' } }}
              >
                <Background gap={16} color="#f1f5f9" />
                <Controls />
                <MiniMap nodeColor={n => ({ messageNode: '#3b82f6', delayNode: '#f59e0b', conditionNode: '#a855f7', subflowNode: '#14b8a6', endNode: '#94a3b8' }[n.type] || '#94a3b8')} />
              </ReactFlow>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <span className="material-symbols-outlined text-[56px]">account_tree</span>
            <p className="text-sm font-medium">Select a flow to edit</p>
            <p className="text-xs">or create a new one</p>
          </div>
        )}
      </div>

      {/* Edge label editor popover */}
      {edgeEdit && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-72"
          style={{ left: Math.min(edgeEdit.x, window.innerWidth - 300), top: Math.min(edgeEdit.y, window.innerHeight - 160) }}
        >
          <p className="text-xs font-bold text-slate-700 mb-1">Edge Label — Response Match</p>
          <p className="text-[11px] text-slate-400 mb-3">
            Type the exact reply text, poll option, <code className="bg-slate-100 px-1 rounded">*</code> to match any reply, or leave empty for auto-advance.
          </p>
          <input
            autoFocus
            defaultValue={edgeEdit.label}
            onChange={e => { edgeEditRef.current = e.target.value; }}
            onKeyDown={e => { if (e.key === 'Enter') commitEdgeLabel(); if (e.key === 'Escape') setEdgeEdit(null); }}
            placeholder='e.g. yes  /  Excellent  /  *  /  (empty)'
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex gap-2 mt-3">
            <button onClick={commitEdgeLabel} className="flex-1 bg-[#137fec] text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-700">Save</button>
            <button onClick={() => setEdgeEdit(null)} className="flex-1 border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Template picker modal */}
      {templatePicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">New Flow</h2>
              <button onClick={() => setTemplatePicker(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
              <button
                onClick={() => { setTemplatePicker(false); setFlowModal({ open: true, flow: null }); }}
                className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-slate-400 text-[28px]">add_circle</span>
                <div>
                  <p className="font-semibold text-slate-700 text-sm">Start from scratch</p>
                  <p className="text-xs text-slate-400">Build your own custom flow</p>
                </div>
              </button>
              {templates.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2">Built-in Templates</p>
                  {templates.map(tmpl => {
                    const m = triggerMeta(tmpl.triggerType);
                    return (
                      <button
                        key={tmpl._id}
                        onClick={() => useTemplate(tmpl)}
                        className="flex items-start gap-3 px-4 py-3 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                      >
                        <span className="material-symbols-outlined text-blue-500 text-[24px] mt-0.5">auto_awesome</span>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{tmpl.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{tmpl.description}</p>
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1.5 ${m.color}`}>{m.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flow metadata modal */}
      <ChatbotFlowModal
        isOpen={flowModal.open}
        onClose={() => setFlowModal({ open: false, flow: null })}
        flow={flowModal.flow}
        onSave={saved => {
          if (flowModal.flow) {
            setFlows(fs => fs.map(f => f._id === saved._id ? saved : f));
            if (selectedFlow?._id === saved._id) setSelectedFlow(saved);
          } else {
            setFlows(fs => [saved, ...fs]);
            loadFlow(saved);
          }
        }}
      />

      {/* Node edit modal */}
      <ChatbotNodeModal
        isOpen={nodeModal.open}
        onClose={() => setNodeModal({ open: false, node: null, nodeId: null })}
        nodeData={nodeModal.node}
        flows={flows.filter(f => f._id !== selectedFlow?._id)}
        onSave={formData => {
          if (nodeModal.nodeId) {
            updateNode(nodeModal.nodeId, formData);
          } else {
            addNode(formData);
          }
        }}
      />
    </div>
  );
}
