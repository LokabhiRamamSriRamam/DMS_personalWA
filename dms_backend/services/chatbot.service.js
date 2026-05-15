import { sendMessage } from './wasender.service.js';

// ── Phone normalization (last 10 digits — survives +91, 91, @s.whatsapp.net, etc.) ──
export function normalizePhone(p) {
  if (!p) return '';
  return String(p).replace(/\D/g, '').slice(-10);
}

// ── Flow execution logging ────────────────────────────────────────────────────
async function logEvent(tenantModels, entry) {
  try {
    if (!tenantModels?.FlowLog) return;
    await tenantModels.FlowLog.create({
      flowId:       entry.flowId || null,
      flowName:     entry.flowName || '',
      triggerType:  entry.triggerType || '',
      phone:        entry.phone || '',
      status:       entry.status,
      nodeId:       entry.nodeId || '',
      messageType:  entry.messageType || '',
      scheduledFor: entry.scheduledFor || undefined,
      error:        entry.error || '',
      templateData: entry.templateData || {},
    });
  } catch {}
}

// ── Placeholder substitution ──────────────────────────────────────────────────

function substitute(text, data) {
  if (!text || !data) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}

function buildPayload(node, templateData) {
  const c = node.data?.content || {};
  const base = { to: undefined }; // caller fills `to`
  switch (node.data?.messageType) {
    case 'text':
      return { ...base, type: 'text', text: substitute(c.text, templateData) };
    case 'image':
      return { ...base, type: 'image', imageUrl: c.imageUrl, caption: substitute(c.caption, templateData) };
    case 'video':
      return { ...base, type: 'video', videoUrl: c.videoUrl, caption: substitute(c.caption, templateData) };
    case 'document':
      return { ...base, type: 'document', documentUrl: c.documentUrl, fileName: c.fileName, caption: substitute(c.caption, templateData) };
    case 'audio':
      return { ...base, type: 'audio', audioUrl: c.audioUrl };
    case 'poll': {
      const poll = c.poll || {};
      return { ...base, type: 'poll', poll: { question: substitute(poll.question, templateData), options: poll.options || [], multiSelect: !!poll.multiSelect } };
    }
    case 'location': {
      const loc = c.location || {};
      return { ...base, type: 'location', location: { latitude: loc.latitude, longitude: loc.longitude, name: loc.name, address: loc.address } };
    }
    default:
      return { ...base, type: 'text', text: '' };
  }
}

// ── Core executor ─────────────────────────────────────────────────────────────

export async function executeNode(tenantModels, sessionApiKey, phoneRaw, node, templateData, flow) {
  const { ChatbotSession, ScheduledMessage, ChatbotFlow } = tenantModels;
  const phone = normalizePhone(phoneRaw);           // 10-digit — used for session tracking & logging
  const waPhone = `91${phone}`;                     // E.164 without '+' — required by WaSender 'to' field
  const nodeType = node.data?.nodeType;

  if (nodeType === 'message') {
    const payload = buildPayload(node, templateData);
    payload.to = waPhone;
    try {
      await sendMessage(sessionApiKey, payload);
      await logEvent(tenantModels, {
        flowId: flow._id, flowName: flow.name, triggerType: flow.triggerType, phone,
        status: 'message_sent', nodeId: node.id, messageType: payload.type, templateData,
      });
    } catch (sendErr) {
      await logEvent(tenantModels, {
        flowId: flow._id, flowName: flow.name, triggerType: flow.triggerType, phone,
        status: 'message_failed', nodeId: node.id, messageType: payload.type,
        error: sendErr.message, templateData,
      });
      throw sendErr;
    }

    if (node.data?.waitForResponse) {
      await ChatbotSession.findOneAndUpdate(
        { contactPhone: phone, status: 'active', flowId: flow._id },
        { currentNodeId: node.id, waitingForReply: true, lastActivityAt: new Date() }
      );
      return; // paused — wait for inbound reply
    }
    // auto-advance to first unconditional (empty-label) outgoing edge
    const nextEdge = (flow.edges || []).find(e => e.source === node.id && !e.label);
    if (nextEdge) {
      const nextNode = (flow.nodes || []).find(n => n.id === nextEdge.target);
      if (nextNode) return executeNode(tenantModels, sessionApiKey, phone, nextNode, templateData, flow);
    }

  } else if (nodeType === 'delay') {
    const { delayValue = 1, delayUnit = 'hours' } = node.data || {};
    const unitMs = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 }[delayUnit] || 3_600_000;
    const scheduledAt = new Date(Date.now() + delayValue * unitMs);

    const nextEdge = (flow.edges || []).find(e => e.source === node.id);
    if (!nextEdge) return;

    const session = await ChatbotSession.findOne({ contactPhone: phone, status: 'active', flowId: flow._id });
    await ScheduledMessage.create({
      sessionApiKey,
      phone,
      flowSessionId: session?._id,
      flowId: flow._id,
      nextNodeId: nextEdge.target,
      templateData,
      scheduledAt,
    });
    await logEvent(tenantModels, {
      flowId: flow._id, flowName: flow.name, triggerType: flow.triggerType, phone,
      status: 'message_scheduled', nodeId: node.id, scheduledFor: scheduledAt, templateData,
    });

  } else if (nodeType === 'condition') {
    // just pauses; outgoing edges are response conditions
    await ChatbotSession.findOneAndUpdate(
      { contactPhone: phone, status: 'active', flowId: flow._id },
      { currentNodeId: node.id, waitingForReply: true, lastActivityAt: new Date() }
    );

  } else if (nodeType === 'subflow') {
    const refId = node.data?.referencedFlowId;
    if (!refId) return;
    const subflow = await ChatbotFlow.findById(refId);
    if (!subflow) return;
    const rootNode = (subflow.nodes || []).find(n => n.id === subflow.rootNodeId) || subflow.nodes?.[0];
    if (rootNode) await executeNode(tenantModels, sessionApiKey, phone, rootNode, templateData, subflow);

  } else if (nodeType === 'end') {
    await ChatbotSession.findOneAndUpdate(
      { contactPhone: phone, status: 'active', flowId: flow._id },
      { status: 'completed', waitingForReply: false, lastActivityAt: new Date() }
    );
  }
}

// ── Advance an existing session on inbound reply ──────────────────────────────

export async function advanceFlowSession(tenantModels, sessionApiKey, session, messageBody, flow) {
  const edges = (flow.edges || []).filter(e => e.source === session.currentNodeId);
  if (!edges.length) return;

  const body = (messageBody || '').trim().toLowerCase();
  // prefer exact match → then wildcard
  const match = edges.find(e => e.label && e.label.toLowerCase() === body)
             || edges.find(e => e.label === '*');

  if (!match) {
    // No edge matched — send a fallback and keep the session waiting at the same node
    const waPhone = `91${session.contactPhone}`;
    try {
      await sendMessage(sessionApiKey, {
        to:   waPhone,
        type: 'text',
        text: "Sorry, I didn't understand that. Please reply with one of the options provided.",
      });
    } catch {}
    // Update lastActivityAt so the 24h TTL doesn't expire prematurely
    await session.model('ChatbotSession').findByIdAndUpdate(session._id, {
      lastActivityAt: new Date(),
    });
    return;
  }

  const nextNode = (flow.nodes || []).find(n => n.id === match.target);
  if (!nextNode) return;

  await session.model('ChatbotSession').findByIdAndUpdate(session._id, {
    currentNodeId: match.target,
    waitingForReply: false,
    lastActivityAt: new Date(),
  });

  await executeNode(tenantModels, sessionApiKey, session.contactPhone, nextNode, session.templateData || {}, flow);
}

// ── Entry point 1: DMS events trigger a flow ──────────────────────────────────

export async function triggerFlow(tenantModels, sessionApiKey, triggerType, phone, templateData, options = {}) {
  const { ChatbotFlow, ChatbotSession } = tenantModels;
  const normPhone = normalizePhone(phone);
  try {
    const query = { triggerType, isActive: true, isTemplate: false };
    if (options.treatmentName) {
      query.$or = [
        { treatmentName: { $regex: new RegExp(`^${options.treatmentName}$`, 'i') } },
        { treatmentName: null },
        { treatmentName: '' },
      ];
    }
    const flow = await ChatbotFlow.findOne(query);
    if (!flow) {
      await logEvent(tenantModels, { flowId: null, triggerType, phone: normPhone, status: 'no_matching_flow', templateData });
      return;
    }
    if (!sessionApiKey) {
      await logEvent(tenantModels, { flowId: flow._id, flowName: flow.name, triggerType, phone: normPhone, status: 'no_session_api_key', templateData });
      return;
    }
    if (!normPhone) {
      await logEvent(tenantModels, { flowId: flow._id, flowName: flow.name, triggerType, phone: '', status: 'invalid_phone', templateData });
      return;
    }

    const existingSession = await ChatbotSession.findOne({ contactPhone: normPhone, status: 'active', flowId: flow._id });
    if (existingSession) {
      await logEvent(tenantModels, { flowId: flow._id, flowName: flow.name, triggerType, phone: normPhone, status: 'duplicate_session_skipped', templateData });
      return;
    }

    const rootNode = (flow.nodes || []).find(n => n.id === flow.rootNodeId) || flow.nodes?.[0];
    if (!rootNode) {
      await logEvent(tenantModels, { flowId: flow._id, flowName: flow.name, triggerType, phone: normPhone, status: 'no_root_node', templateData });
      return;
    }

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

    await executeNode(tenantModels, sessionApiKey, normPhone, rootNode, templateData, flow);
    await logEvent(tenantModels, { flowId: flow._id, flowName: flow.name, triggerType, phone: normPhone, status: 'success', templateData });
  } catch (err) {
    console.error('[triggerFlow] error:', triggerType, normPhone, err.message);
    await logEvent(tenantModels, { flowId: null, triggerType, phone: normPhone, status: 'error', error: err.message, templateData });
  }
}

// ── Entry point 2: Inbound webhook message ────────────────────────────────────

export async function processIncomingMessage(tenantModels, sessionApiKey, phone, messageBody, eventType) {
  const { ChatbotFlow, ChatbotSession } = tenantModels;
  const normPhone = normalizePhone(phone);
  try {
    // Check for a paused session waiting for reply
    const session = await ChatbotSession.findOne({ contactPhone: normPhone, status: 'active', waitingForReply: true });
    if (session) {
      const flow = await ChatbotFlow.findById(session.flowId);
      if (flow) {
        console.log('[processIncoming] advancing session | phone:', normPhone, '| flow:', flow.name, '| body:', messageBody);
        await advanceFlowSession(tenantModels, sessionApiKey, session, messageBody, flow);
        return;
      }
    }

    // No waiting session — check if this is first_message or custom_keyword
    const firstMsgSession = await ChatbotSession.findOne({ contactPhone: normPhone, status: 'active' });
    console.log('[processIncoming] phone:', normPhone, '| waitingSession:', !!session, '| activeSession:', !!firstMsgSession, '| body:', messageBody);
    if (!firstMsgSession) {
      // Diagnostic: dump all first_message flows to find the mismatch
      const allFirstMsgFlows = await ChatbotFlow.find({ triggerType: 'first_message' }).lean();
      console.log('[processIncoming] all first_message flows in DB:', allFirstMsgFlows.map(f => ({
        id: f._id, name: f.name, isActive: f.isActive, isTemplate: f.isTemplate, triggerType: f.triggerType,
      })));
      const firstMsgFlow = await ChatbotFlow.findOne({ triggerType: 'first_message', isActive: true, isTemplate: false });
      console.log('[processIncoming] first_message flow (active+nonTemplate):', firstMsgFlow ? `"${firstMsgFlow.name}"` : 'NOT FOUND');
      await triggerFlow(tenantModels, sessionApiKey, 'first_message', normPhone, { phone: normPhone, firstName: '', name: '' }, {});
    } else {
      console.log('[processIncoming] skipping first_message — active session exists:', firstMsgSession._id, '| status:', firstMsgSession.status, '| waitingForReply:', firstMsgSession.waitingForReply, '| flow:', firstMsgSession.flowId);
    }

    // Also check custom_keyword flows
    if (messageBody) {
      const keywordFlows = await ChatbotFlow.find({ triggerType: 'custom_keyword', isActive: true, isTemplate: false });
      for (const flow of keywordFlows) {
        const keywords = (flow.triggerKeywords || []).map(k => k.toLowerCase());
        if (keywords.includes(messageBody.trim().toLowerCase())) {
          await triggerFlow(tenantModels, sessionApiKey, 'custom_keyword', normPhone, { phone: normPhone, firstName: '', name: '' }, {});
          break;
        }
      }
    }
  } catch (err) {
    console.error('[processIncomingMessage] error:', normPhone, err.message);
  }
}
