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
  const [edgeEdit, setEdgeEdit] = useState(null); // { edgeId, label, x, y, suggestions[] }
  const edgeEditRef = useRef('');

  // Test-fire modal
  const [testFireOpen, setTestFireOpen] = useState(false);
  const [testPhone, setTestPhone]       = useState('');
  const [testFiring, setTestFiring]     = useState(false);
  const [clearing,  setClearing]        = useState(false);

  // Validation errors panel
  const [validationErrors, setValidationErrors] = useState([]);

  // Flow logs sidebar
  const [showLogs, setShowLogs] = useState(false);
  const [flowLogs, setFlowLogs] = useState([]);

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

  // Compute edge label suggestions based on source node type (poll options → suggested labels)
  function getEdgeSuggestions(sourceNodeId) {
    const sourceNode = nodesRef.current.find(n => n.id === sourceNodeId);
    if (!sourceNode) return [];
    const d = sourceNode.data || {};
    if (d.messageType === 'poll' && d.content?.poll?.options) {
      return [...d.content.poll.options.filter(Boolean), '*'];
    }
    if (d.waitForResponse || d.nodeType === 'condition') {
      return ['yes', 'no', '*'];
    }
    return [];
  }

  const onConnect = useCallback((params) => {
    const id = `e_${Date.now()}`;
    setEdges(es => addEdge({ ...params, id, label: '', type: 'smoothstep', style: { stroke: '#94a3b8' }, labelStyle: { fontSize: 11, fill: '#475569' } }, es));
    const suggestions = getEdgeSuggestions(params.source);
    setTimeout(() => {
      setEdgeEdit({ edgeId: id, sourceNodeId: params.source, label: '', x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100, suggestions });
      edgeEditRef.current = '';
    }, 50);
  }, [setEdges]);

  const onEdgeClick = useCallback((_evt, edge) => {
    const rect = _evt.target.getBoundingClientRect();
    const suggestions = getEdgeSuggestions(edge.source);
    setEdgeEdit({ edgeId: edge.id, sourceNodeId: edge.source, label: edge.label || '', x: rect.left, y: rect.top, suggestions });
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
    setValidationErrors([]);
    try {
      const dbNodes = nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: { ...n.data, onEdit: undefined, onDelete: undefined } }));
      // Strip dangling edges whose source/target no longer exists
      const nodeIdSet = new Set(dbNodes.map(n => n.id));
      const dbEdges = edges
        .filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
        .map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label || '' }));
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
    setValidationErrors([]);
    try {
      const res = await api.patch(`/chatbot/flows/${flow._id}/toggle`);
      setFlows(fs => fs.map(f => f._id === flow._id ? { ...f, isActive: res.data.isActive } : f));
      if (selectedFlow?._id === flow._id) setSelectedFlow(sf => ({ ...sf, isActive: res.data.isActive }));
    } catch (err) {
      // Backend returns validation errors when trying to activate an invalid flow
      const errors = err.response?.data?.errors;
      if (Array.isArray(errors) && errors.length) {
        setValidationErrors(errors);
      } else {
        alert(err.response?.data?.message || 'Failed to toggle flow');
      }
    }
  }

  async function handleTestFire() {
    if (!testPhone) return alert('Enter a phone number');
    setTestFiring(true);
    const fullPhone = `+91${testPhone}`;
    try {
      await api.post(`/chatbot/flows/${selectedFlow._id}/test-fire`, { phone: fullPhone });
      alert(`Test message sent to ${fullPhone}`);
      setTestFireOpen(false);
      setTestPhone('');
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (Array.isArray(errors)) setValidationErrors(errors);
      alert(err.response?.data?.message || 'Test fire failed');
    } finally {
      setTestFiring(false);
    }
  }

  async function handleClearSessions() {
    if (!testPhone) return alert('Enter a phone number first');
    if (!window.confirm(`Delete all active sessions for +91${testPhone}? This lets first_message re-trigger.`)) return;
    setClearing(true);
    try {
      const res = await api.post('/chatbot/sessions/clear', { phone: `+91${testPhone}` });
      alert(`Cleared ${res.data.deleted} session(s) for +91${testPhone}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Clear failed');
    } finally {
      setClearing(false);
    }
  }

  async function loadLogs() {
    if (!selectedFlow) return;
    try {
      const res = await api.get(`/chatbot/flows/${selectedFlow._id}/logs`);
      setFlowLogs(res.data || []);
    } catch {}
  }

  useEffect(() => { if (showLogs && selectedFlow) loadLogs(); }, [showLogs, selectedFlow?._id]);

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
                <div
                  onMouseDown={e => { e.stopPropagation(); toggleFlow(flow); }}
                  className={`mt-2 flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors select-none
                    ${flow.isActive ? 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 border border-slate-200 hover:bg-slate-200'}`}
                >
                  <span className={`text-xs font-semibold ${flow.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {flow.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {/* Toggle pill */}
                  <div className={`relative w-9 h-5 rounded-full transition-colors ${flow.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 size-4 bg-white rounded-full shadow transition-transform ${flow.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
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
                <button onClick={() => setShowLogs(s => !s)}
                  className={`flex items-center gap-1 text-sm border px-3 py-1.5 rounded-lg transition-colors ${showLogs ? 'bg-slate-100 border-slate-300 text-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>Logs
                </button>
                <button onClick={() => setTestFireOpen(true)}
                  className="flex items-center gap-1 text-sm text-amber-700 border border-amber-200 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100">
                  <span className="material-symbols-outlined text-[18px]">science</span>Test Fire
                </button>
                <button onClick={() => setNodeModal({ open: true, node: null, nodeId: null })}
                  className="flex items-center gap-1 text-sm text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                  <span className="material-symbols-outlined text-[18px]">add</span>Add Node
                </button>
                <button onClick={saveFlow} disabled={saving}
                  className="flex items-center gap-1 text-sm text-white bg-[#137fec] px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'save'}</span>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Validation errors banner */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border-b border-red-200 px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-600 text-[18px] mt-0.5">error</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-red-800 mb-1">Flow has {validationErrors.length} issue{validationErrors.length > 1 ? 's' : ''} — fix before activating:</p>
                    <ul className="text-xs text-red-700 list-disc list-inside space-y-0.5">
                      {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                  <button onClick={() => setValidationErrors([])} className="text-red-400 hover:text-red-600">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
            )}

            {/* ReactFlow canvas + optional logs sidebar */}
            <div className="flex-1 flex min-h-0">
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

              {/* Logs sidebar */}
              {showLogs && (
                <div className="w-72 border-l border-slate-200 flex flex-col bg-slate-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                    <p className="text-sm font-bold text-slate-800">Flow Activity</p>
                    <button onClick={loadLogs} className="text-slate-400 hover:text-slate-600">
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {flowLogs.length === 0 && (
                      <p className="text-xs text-slate-400 text-center mt-6">No activity yet. Trigger this flow or test fire it.</p>
                    )}
                    {flowLogs.map(log => {
                      const sm = {
                        success:                  { color: 'bg-emerald-100 text-emerald-700', icon: 'check_circle', label: 'Sent' },
                        no_matching_flow:         { color: 'bg-slate-100 text-slate-600',    icon: 'help',         label: 'No matching flow' },
                        no_session_api_key:       { color: 'bg-red-100 text-red-700',         icon: 'wifi_off',     label: 'No WhatsApp session' },
                        invalid_phone:            { color: 'bg-amber-100 text-amber-700',     icon: 'phone_disabled', label: 'Invalid phone' },
                        duplicate_session_skipped:{ color: 'bg-slate-100 text-slate-500',     icon: 'block',        label: 'Already running' },
                        no_root_node:             { color: 'bg-red-100 text-red-700',         icon: 'error',        label: 'No root node' },
                        error:                    { color: 'bg-red-100 text-red-700',         icon: 'error',        label: 'Error' },
                      }[log.status] || { color: 'bg-slate-100 text-slate-600', icon: 'circle', label: log.status };
                      return (
                        <div key={log._id} className="bg-white rounded-lg p-2.5 border border-slate-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${sm.color}`}>
                              <span className="material-symbols-outlined text-[12px]">{sm.icon}</span>
                              {sm.label}
                            </span>
                            <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString('en-IN')}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 font-mono">{log.phone || '—'}</p>
                          {log.error && <p className="text-[10px] text-red-600 mt-1">{log.error}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-80"
          style={{ left: Math.min(edgeEdit.x, window.innerWidth - 340), top: Math.min(edgeEdit.y, window.innerHeight - 220) }}
        >
          <p className="text-xs font-bold text-slate-700 mb-1">Edge Label — Response Match</p>
          <p className="text-[11px] text-slate-400 mb-2">
            Type the reply text, <code className="bg-slate-100 px-1 rounded">*</code> for any reply, or leave empty to auto-advance without waiting for a reply.
          </p>
          {(() => {
            const srcNode = nodesRef.current.find(n => n.id === edgeEdit.sourceNodeId);
            const waitForResponse = srcNode?.data?.waitForResponse;
            return (
              <>
                <button
                  onClick={() => {
                    edgeEditRef.current = '';
                    setEdges(es => es.map(e => e.id === edgeEdit.edgeId ? { ...e, label: '' } : e));
                    setEdgeEdit(null);
                  }}
                  className="w-full mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 py-2 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">arrow_downward</span>
                  Auto-advance (no label — sends immediately, no reply needed)
                </button>
                {waitForResponse && (
                  <div className="mb-3 flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <span className="material-symbols-outlined text-red-500 text-[15px] mt-0.5">warning</span>
                    <p className="text-[11px] text-red-700 leading-snug">
                      The source node has <span className="font-semibold">"Wait for reply"</span> checked — auto-advance won't work until you uncheck it on that node.
                    </p>
                  </div>
                )}
              </>
            );
          })()}

          {edgeEdit.suggestions?.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {edgeEdit.suggestions.map(s => (
                  <button key={s}
                    onClick={() => {
                      edgeEditRef.current = s;
                      setEdges(es => es.map(e => e.id === edgeEdit.edgeId ? { ...e, label: s } : e));
                      setEdgeEdit(null);
                    }}
                    className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                    {s === '*' ? '* (catch-all)' : s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            autoFocus
            defaultValue={edgeEdit.label}
            onChange={e => { edgeEditRef.current = e.target.value; }}
            onKeyDown={e => { if (e.key === 'Enter') commitEdgeLabel(); if (e.key === 'Escape') setEdgeEdit(null); }}
            placeholder='Or type custom: yes / no / 1 / *'
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex gap-2 mt-3">
            <button onClick={commitEdgeLabel} className="flex-1 bg-[#137fec] text-white text-xs font-semibold py-2 rounded-lg hover:bg-blue-700">Save</button>
            <button onClick={() => setEdgeEdit(null)} className="flex-1 border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Test Fire modal */}
      {testFireOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">science</span>
                Test Fire Flow
              </h2>
              <button onClick={() => setTestFireOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Fire <strong>{selectedFlow?.name}</strong> with sample data ({'{{firstName}}'} = "Test", etc.) without waiting for a real DMS event.
            </p>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Send to phone</label>
            <div className="flex items-stretch border border-slate-200 rounded-lg overflow-hidden mt-1 mb-4 focus-within:ring-2 focus-within:ring-blue-500">
              <span className="px-3 flex items-center text-sm font-semibold text-slate-600 bg-slate-100 select-none border-r border-slate-200">🇮🇳 +91</span>
              <input type="tel" inputMode="numeric" value={testPhone} onChange={e => setTestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10} placeholder="10-digit number"
                className="flex-1 px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleTestFire} disabled={testFiring}
                className="flex-1 bg-amber-500 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-amber-600 disabled:opacity-50">
                {testFiring ? 'Firing…' : 'Send Test'}
              </button>
              <button onClick={() => setTestFireOpen(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-slate-50">Cancel</button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-2">
                If the flow isn't re-triggering, a stale session may be blocking it.
              </p>
              <button onClick={handleClearSessions} disabled={clearing}
                className="w-full flex items-center justify-center gap-2 text-xs text-red-600 border border-red-200 bg-red-50 py-2 rounded-lg hover:bg-red-100 disabled:opacity-50">
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                {clearing ? 'Clearing…' : 'Clear Active Sessions for this Phone'}
              </button>
            </div>
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
        triggerType={selectedFlow?.triggerType || 'first_message'}
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
