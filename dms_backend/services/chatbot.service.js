import { sendMessage } from './wasender.service.js';

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

export async function executeNode(tenantModels, sessionApiKey, phone, node, templateData, flow) {
  const { ChatbotSession, ScheduledMessage, ChatbotFlow } = tenantModels;
  const nodeType = node.data?.nodeType;

  if (nodeType === 'message') {
    const payload = buildPayload(node, templateData);
    payload.to = phone;
    await sendMessage(sessionApiKey, payload);

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
  if (!match) return;

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
    if (!flow) return;

    // Check if there's already an active session for this flow+phone to avoid duplicates
    const existingSession = await ChatbotSession.findOne({ contactPhone: phone, status: 'active', flowId: flow._id });
    if (existingSession) return;

    const rootNode = (flow.nodes || []).find(n => n.id === flow.rootNodeId) || flow.nodes?.[0];
    if (!rootNode) return;

    await ChatbotSession.create({
      contactPhone: phone,
      flowId: flow._id,
      currentNodeId: rootNode.id,
      waitingForReply: false,
      templateData,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      status: 'active',
    });

    await executeNode(tenantModels, sessionApiKey, phone, rootNode, templateData, flow);
  } catch (err) {
    console.error('[triggerFlow] error:', triggerType, phone, err.message);
  }
}

// ── Entry point 2: Inbound webhook message ────────────────────────────────────

export async function processIncomingMessage(tenantModels, sessionApiKey, phone, messageBody, eventType) {
  const { ChatbotFlow, ChatbotSession } = tenantModels;
  try {
    // Check for a paused session waiting for reply
    const session = await ChatbotSession.findOne({ contactPhone: phone, status: 'active', waitingForReply: true });
    if (session) {
      const flow = await ChatbotFlow.findById(session.flowId);
      if (flow) {
        await advanceFlowSession(tenantModels, sessionApiKey, session, messageBody, flow);
        return;
      }
    }

    // No waiting session — check if this is first_message or custom_keyword
    const firstMsgSession = await ChatbotSession.findOne({ contactPhone: phone, status: 'active' });
    if (!firstMsgSession) {
      // First ever message from this phone
      await triggerFlow(tenantModels, sessionApiKey, 'first_message', phone, { phone }, {});
    }

    // Also check custom_keyword flows
    if (messageBody) {
      const keywordFlows = await ChatbotFlow.find({ triggerType: 'custom_keyword', isActive: true, isTemplate: false });
      for (const flow of keywordFlows) {
        const keywords = (flow.triggerKeywords || []).map(k => k.toLowerCase());
        if (keywords.includes(messageBody.trim().toLowerCase())) {
          await triggerFlow(tenantModels, sessionApiKey, 'custom_keyword', phone, { phone }, {});
          break;
        }
      }
    }
  } catch (err) {
    console.error('[processIncomingMessage] error:', phone, err.message);
  }
}
