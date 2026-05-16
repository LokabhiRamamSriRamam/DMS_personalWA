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
    // No further node and not waiting for a reply → the flow path is exhausted.
    // Mark the session completed (same terminal state as an explicit End node)
    // so it doesn't linger 'active' and suppress re-engagement until the TTL.
    await ChatbotSession.findOneAndUpdate(
      { contactPhone: phone, status: 'active', flowId: flow._id },
      { status: 'completed', waitingForReply: false, lastActivityAt: new Date() }
    );

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
  const { ChatbotFlow, ChatbotSession, ScheduledMessage } = tenantModels;
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
      console.log('[triggerFlow] no matching flow | triggerType:', triggerType, '| phone:', normPhone);
      await logEvent(tenantModels, { flowId: null, triggerType, phone: normPhone, status: 'no_matching_flow', templateData });
      return;
    }
    if (!sessionApiKey) {
      console.log('[triggerFlow] no sessionApiKey | flow:', flow.name, '| phone:', normPhone);
      await logEvent(tenantModels, { flowId: flow._id, flowName: flow.name, triggerType, phone: normPhone, status: 'no_session_api_key', templateData });
      return;
    }
    if (!normPhone) {
      console.log('[triggerFlow] invalid phone | flow:', flow.name);
      await logEvent(tenantModels, { flowId: flow._id, flowName: flow.name, triggerType, phone: '', status: 'invalid_phone', templateData });
      return;
    }

    // Block only if genuinely engaged: waiting for a reply OR has a pending scheduled continuation
    const waitingSession = await ChatbotSession.findOne({
      contactPhone: normPhone, status: 'active', flowId: flow._id, waitingForReply: true,
    }).select('_id').lean();
    let genuinelyEngaged = !!waitingSession;
    if (!genuinelyEngaged && ScheduledMessage) {
      const pendingMsg = await ScheduledMessage.findOne({
        phone: normPhone, flowId: flow._id, status: 'pending',
      }).select('_id').lean();
      genuinelyEngaged = !!pendingMsg;
    }
    if (genuinelyEngaged) {
      console.log('[triggerFlow] duplicate_session_skipped (genuinely engaged) | flow:', flow.name, '| phone:', normPhone);
      await logEvent(tenantModels, { flowId: flow._id, flowName: flow.name, triggerType, phone: normPhone, status: 'duplicate_session_skipped', templateData });
      return;
    }
    // Stale active session (not waiting, no pending delay) — complete it before starting fresh
    await ChatbotSession.updateMany(
      { contactPhone: normPhone, status: 'active', flowId: flow._id },
      { status: 'completed', waitingForReply: false, lastActivityAt: new Date() },
    );

    const rootNode = (flow.nodes || []).find(n => n.id === flow.rootNodeId) || flow.nodes?.[0];
    if (!rootNode) {
      console.log('[triggerFlow] no root node | flow:', flow.name, '| rootNodeId:', flow.rootNodeId, '| nodeCount:', flow.nodes?.length);
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

export async function processIncomingMessage(tenantModels, sessionApiKey, phone, messageBody, eventType, senderName = '') {
  const { ChatbotFlow, ChatbotSession, ScheduledMessage } = tenantModels;
  const normPhone = normalizePhone(phone);

  // Inbound-triggered flows (first_message / custom_keyword) only have a phone
  // number to work with. Resolve a display name so {{name}}/{{firstName}}
  // aren't blank: existing patient → WhatsApp profile name → blank.
  // Memoized so a plain session-advance doesn't pay for the lookup.
  let _contactData;
  async function contactTemplateData() {
    if (_contactData) return _contactData;
    let name = '', firstName = '';
    try {
      const p = await tenantModels.Patient
        ?.findOne({ 'contact.mobile': { $regex: `${normPhone}$` } })
        .select('first_name last_name')
        .lean();
      if (p) {
        firstName = p.first_name || '';
        name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      }
    } catch { /* unknown number — fall through to profile name / blank */ }
    if (!name && senderName) {
      name = senderName;
      firstName = senderName.split(' ')[0] || '';
    }
    _contactData = { phone: normPhone, firstName, name };
    return _contactData;
  }

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

    // A fresh first_message is suppressed only by a *genuinely engaged*
    // session: one waiting for a reply, or one parked in a delay with a
    // pending scheduled continuation. A stale/terminal 'active' session must
    // NOT block — that was the bug that silenced returning senders for 24h.
    const engagedSession = await ChatbotSession.findOne({
      contactPhone: normPhone, status: 'active', waitingForReply: true,
    }).select('_id').lean();
    let engaged = !!engagedSession;
    if (!engaged && ScheduledMessage) {
      const pendingResume = await ScheduledMessage.findOne({
        phone: normPhone, status: 'pending',
      }).select('_id').lean();
      engaged = !!pendingResume;
    }
    console.log('[processIncoming] phone:', normPhone, '| waitingSession:', !!session, '| engaged:', engaged, '| body:', messageBody);
    if (!engaged) {
      const firstMsgFlow = await ChatbotFlow.findOne({ triggerType: 'first_message', isActive: true, isTemplate: false });
      console.log('[processIncoming] first_message flow (active+nonTemplate):', firstMsgFlow ? `"${firstMsgFlow.name}"` : 'NOT FOUND');
      await triggerFlow(tenantModels, sessionApiKey, 'first_message', normPhone, await contactTemplateData(), {});
    } else {
      console.log('[processIncoming] skipping first_message — genuinely engaged (waiting reply or pending delay)');
    }

    // Also check custom_keyword flows
    if (messageBody) {
      const keywordFlows = await ChatbotFlow.find({ triggerType: 'custom_keyword', isActive: true, isTemplate: false });
      for (const flow of keywordFlows) {
        const keywords = (flow.triggerKeywords || []).map(k => k.toLowerCase());
        if (keywords.includes(messageBody.trim().toLowerCase())) {
          await triggerFlow(tenantModels, sessionApiKey, 'custom_keyword', normPhone, await contactTemplateData(), {});
          break;
        }
      }
    }
  } catch (err) {
    console.error('[processIncomingMessage] error:', normPhone, err.message);
  }
}
