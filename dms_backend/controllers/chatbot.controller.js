import { triggerFlow, executeNode, normalizePhone } from '../services/chatbot.service.js';

// ── Validation ───────────────────────────────────────────────────────────────
// Returns array of error strings (empty = valid)
export function validateFlow(flow) {
  const errors = [];
  const nodes = flow.nodes || [];
  const edges = flow.edges || [];

  if (!nodes.length) {
    errors.push('Flow has no nodes — add at least one message node and an End node');
    return errors;
  }

  const nodeIds = new Set(nodes.map(n => n.id));
  const rootId  = flow.rootNodeId || nodes[0]?.id;
  if (!rootId || !nodeIds.has(rootId)) errors.push('No root/start node defined');

  // Edge integrity
  for (const e of edges) {
    if (!nodeIds.has(e.source)) errors.push(`Edge "${e.label || ''}" starts from a missing node`);
    if (!nodeIds.has(e.target)) errors.push(`Edge "${e.label || ''}" points to a missing node`);
  }

  // Per-node validation
  for (const n of nodes) {
    const d = n.data || {};
    const label = d.label || n.id;
    if (d.nodeType === 'message') {
      if (!d.messageType) errors.push(`Node "${label}": message type missing`);
      const c = d.content || {};
      if (d.messageType === 'text' && !c.text)            errors.push(`Node "${label}": text content is empty`);
      if (d.messageType === 'image' && !c.imageUrl)        errors.push(`Node "${label}": image URL is empty`);
      if (d.messageType === 'video' && !c.videoUrl)        errors.push(`Node "${label}": video URL is empty`);
      if (d.messageType === 'document' && !c.documentUrl)  errors.push(`Node "${label}": document URL is empty`);
      if (d.messageType === 'audio' && !c.audioUrl)        errors.push(`Node "${label}": audio URL is empty`);
      if (d.messageType === 'poll') {
        if (!c.poll?.question)            errors.push(`Node "${label}": poll question is empty`);
        if ((c.poll?.options || []).filter(Boolean).length < 2) errors.push(`Node "${label}": poll needs at least 2 options`);
      }
      if (d.messageType === 'location' && (!c.location?.latitude || !c.location?.longitude)) {
        errors.push(`Node "${label}": location coordinates missing`);
      }
    }
    if (d.nodeType === 'delay') {
      if (!d.delayValue || d.delayValue <= 0) errors.push(`Node "${label}": delay value must be > 0`);
    }
    if (d.nodeType === 'subflow' && !d.referencedFlowId) {
      errors.push(`Node "${label}": no flow selected to jump into`);
    }
  }

  // Reachability
  if (rootId && nodeIds.has(rootId)) {
    const reachable = new Set([rootId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of edges) {
        if (reachable.has(e.source) && !reachable.has(e.target)) {
          reachable.add(e.target);
          changed = true;
        }
      }
    }
    for (const n of nodes) {
      if (!reachable.has(n.id)) errors.push(`Node "${n.data?.label || n.id}" is unreachable from the start node`);
    }
  }

  return errors;
}

// Strip edges whose endpoints don't exist in nodes[]
function cleanEdges(nodes, edges) {
  const nodeIds = new Set((nodes || []).map(n => n.id));
  return (edges || []).filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
}

// ── Flow CRUD ────────────────────────────────────────────────────────────────

export async function listFlows(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const flows = await ChatbotFlow.find({ isTemplate: false }).sort({ createdAt: -1 }).lean();
    res.json(flows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const flow = await ChatbotFlow.findById(req.params.id).lean();
    if (!flow) return res.status(404).json({ message: 'Flow not found' });
    res.json(flow);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const { name, description, triggerType, triggerKeywords, treatmentName, reminderOffsetHours } = req.body;
    const flow = await ChatbotFlow.create({
      name, description, triggerType, triggerKeywords, treatmentName,
      reminderOffsetHours: reminderOffsetHours ?? 24,
      isActive: false,
      isTemplate: false,
      nodes: [],
      edges: [],
    });
    res.status(201).json(flow);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function updateFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const allowed = ['name', 'description', 'triggerType', 'triggerKeywords', 'treatmentName',
                     'reminderOffsetHours', 'nodes', 'edges', 'rootNodeId', 'isActive'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

    // Auto-clean dangling edges if both nodes and edges are being updated together
    if (update.nodes && update.edges) {
      update.edges = cleanEdges(update.nodes, update.edges);
    }

    const flow = await ChatbotFlow.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!flow) return res.status(404).json({ message: 'Flow not found' });
    res.json(flow);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const flow = await ChatbotFlow.findByIdAndDelete(req.params.id);
    if (!flow) return res.status(404).json({ message: 'Flow not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function toggleFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const flow = await ChatbotFlow.findById(req.params.id);
    if (!flow) return res.status(404).json({ message: 'Flow not found' });

    // Validate only when activating
    if (!flow.isActive) {
      const errors = validateFlow(flow.toObject());
      if (errors.length) {
        return res.status(400).json({ message: 'Flow has validation errors', errors });
      }
    }

    flow.isActive = !flow.isActive;
    await flow.save();
    res.json({ isActive: flow.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function validateFlowEndpoint(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const flow = await ChatbotFlow.findById(req.params.id).lean();
    if (!flow) return res.status(404).json({ message: 'Flow not found' });
    res.json({ valid: validateFlow(flow).length === 0, errors: validateFlow(flow) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function listTemplates(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const templates = await ChatbotFlow.find({ isTemplate: true }).sort({ triggerType: 1 }).lean();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function duplicateFlow(req, res) {
  try {
    const { ChatbotFlow } = req.tenantModels;
    const source = await ChatbotFlow.findById(req.params.id).lean();
    if (!source) return res.status(404).json({ message: 'Flow not found' });
    const { _id, createdAt, updatedAt, __v, ...rest } = source;
    const copy = await ChatbotFlow.create({
      ...rest,
      name: source.isTemplate ? source.name : `${source.name} (copy)`,
      isActive: false,
      isTemplate: false,
    });
    res.status(201).json(copy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// ── Test-fire: trigger a flow with sample data, without waiting for a real DMS event
export async function testFireFlow(req, res) {
  try {
    const { ChatbotFlow, WaSenderConfig } = req.tenantModels;
    const flow = await ChatbotFlow.findById(req.params.id);
    if (!flow) return res.status(404).json({ message: 'Flow not found' });

    const phone = req.body.phone;
    if (!phone) return res.status(400).json({ message: 'phone is required' });

    const config = await WaSenderConfig.findOne();
    if (!config?.sessionApiKey) return res.status(400).json({ message: 'No active WhatsApp session — connect first' });

    // Validate before firing
    const errors = validateFlow(flow.toObject());
    if (errors.length) return res.status(400).json({ message: 'Flow has validation errors', errors });

    // Sample template data — uses what the user provides or sensible defaults
    const templateData = {
      name:       req.body.name       || 'Test Patient',
      firstName:  req.body.firstName  || 'Test',
      phone,
      date:       req.body.date       || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time:       req.body.time       || '10:00 AM',
      doctorName: req.body.doctorName || 'Dr. Smith',
      treatment:  req.body.treatment  || 'Consultation',
      invoiceId:  req.body.invoiceId  || 'INV-TEST-001',
      amount:     req.body.amount     || '500',
      ...(req.body.templateData || {}),
    };

    const { ChatbotSession } = req.tenantModels;
    const normPhone = normalizePhone(phone);

    // Clear any existing session so the duplicate guard in triggerFlow doesn't block us
    await ChatbotSession.deleteMany({ contactPhone: normPhone, flowId: flow._id });

    // Execute starting from the root node directly — bypasses triggerFlow's duplicate check
    const rootNode = (flow.nodes || []).find(n => n.id === flow.rootNodeId) || flow.nodes?.[0];
    if (!rootNode) return res.status(400).json({ message: 'Flow has no root node' });

    await ChatbotSession.create({
      contactPhone: normPhone,
      flowId: flow._id,
      currentNodeId: rootNode.id,
      waitingForReply: false,
      templateData,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      status: 'active',
    });

    console.log(`[testFireFlow] firing flow "${flow.name}" (${flow.triggerType}) → ${normPhone}`);
    await executeNode(req.tenantModels, config.sessionApiKey, normPhone, rootNode, templateData, flow);
    console.log(`[testFireFlow] done`);

    res.json({ message: 'Test message sent to ' + phone, templateData });
  } catch (err) {
    console.error('[testFireFlow]', err);
    res.status(500).json({ message: err.message });
  }
}

// ── Clear sessions for a phone (admin / test reset) ──────────────────────────
export async function clearSessions(req, res) {
  try {
    const { ChatbotSession } = req.tenantModels;
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'phone is required' });
    const { normalizePhone } = await import('../services/chatbot.service.js');
    const normPhone = normalizePhone(phone);
    const result = await ChatbotSession.deleteMany({ contactPhone: normPhone });
    console.log(`[clearSessions] deleted ${result.deletedCount} session(s) for ${normPhone}`);
    res.json({ deleted: result.deletedCount, phone: normPhone });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── Flow logs ────────────────────────────────────────────────────────────────
export async function getFlowLogs(req, res) {
  try {
    const { FlowLog } = req.tenantModels;
    if (!FlowLog) return res.json([]);
    const q = {};
    if (req.params.id && req.params.id !== 'all') q.flowId = req.params.id;
    const logs = await FlowLog.find(q).sort({ createdAt: -1 }).limit(50).lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ── All logs (paginated + filterable) ────────────────────────────────────────
export async function listAllLogs(req, res) {
  try {
    const { FlowLog } = req.tenantModels;
    if (!FlowLog) return res.json({ logs: [], total: 0 });

    const q = {};
    if (req.query.status)      q.status      = req.query.status;
    if (req.query.triggerType) q.triggerType = req.query.triggerType;
    if (req.query.flowId)      q.flowId      = req.query.flowId;
    if (req.query.phone)       q.phone       = { $regex: req.query.phone.replace(/\D/g, ''), $options: 'i' };
    if (req.query.from || req.query.to) {
      q.createdAt = {};
      if (req.query.from) q.createdAt.$gte = new Date(req.query.from);
      if (req.query.to)   q.createdAt.$lte = new Date(req.query.to);
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const skip  = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      FlowLog.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      FlowLog.countDocuments(q),
    ]);

    res.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[listAllLogs]', err);
    res.status(500).json({ message: err.message });
  }
}

// ── 30-day statistics dashboard ──────────────────────────────────────────────
export async function getLogStats(req, res) {
  try {
    const { FlowLog } = req.tenantModels;
    if (!FlowLog) return res.json({ totals: {}, byTrigger: [], byDay: [], topFlows: [] });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const base  = { createdAt: { $gte: since } };

    const [byStatus, byTrigger, byDay, topFlows] = await Promise.all([
      FlowLog.aggregate([
        { $match: base },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      FlowLog.aggregate([
        { $match: { ...base, triggerType: { $ne: '' } } },
        { $group: { _id: '$triggerType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      FlowLog.aggregate([
        { $match: base },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
            sent:      { $sum: { $cond: [{ $eq: ['$status', 'message_sent'] }, 1, 0] } },
            failed:    { $sum: { $cond: [{ $eq: ['$status', 'message_failed'] }, 1, 0] } },
            scheduled: { $sum: { $cond: [{ $eq: ['$status', 'message_scheduled'] }, 1, 0] } },
            triggers:  { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        } },
        { $sort: { _id: 1 } },
      ]),
      FlowLog.aggregate([
        { $match: { ...base, flowId: { $ne: null } } },
        { $group: { _id: { flowId: '$flowId', flowName: '$flowName' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const totals = byStatus.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});

    res.json({
      windowDays: 30,
      since,
      totals: {
        triggers:          totals.success || 0,
        messages_sent:     totals.message_sent || 0,
        messages_failed:   totals.message_failed || 0,
        messages_scheduled: totals.message_scheduled || 0,
        no_matching_flow:  totals.no_matching_flow || 0,
        duplicate_skipped: totals.duplicate_session_skipped || 0,
        errors:            totals.error || 0,
      },
      byTrigger:  byTrigger.map(r => ({ triggerType: r._id, count: r.count })),
      byDay:      byDay.map(r => ({ date: r._id, sent: r.sent, failed: r.failed, scheduled: r.scheduled, triggers: r.triggers })),
      topFlows:   topFlows.map(r => ({ flowId: r._id.flowId, flowName: r._id.flowName, count: r.count })),
    });
  } catch (err) {
    console.error('[getLogStats]', err);
    res.status(500).json({ message: err.message });
  }
}
