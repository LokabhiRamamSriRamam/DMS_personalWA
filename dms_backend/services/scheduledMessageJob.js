import { getTenantPool } from '../config/tenantDb.js';
import { getTenantModels } from '../config/tenantModels.js';
import { executeNode } from './chatbot.service.js';

let running = false;

async function processTenant(tenantModels) {
  const { ScheduledMessage, ChatbotFlow } = tenantModels;
  const due = await ScheduledMessage.find({
    status: 'pending',
    scheduledAt: { $lte: new Date() },
  }).limit(50);

  for (const msg of due) {
    try {
      const flow = await ChatbotFlow.findById(msg.flowId);
      if (!flow) { await msg.updateOne({ status: 'failed' }); continue; }
      const node = (flow.nodes || []).find(n => n.id === msg.nextNodeId);
      if (!node) { await msg.updateOne({ status: 'failed' }); continue; }

      await executeNode(tenantModels, msg.sessionApiKey, msg.phone, node, msg.templateData || {}, flow);
      await msg.updateOne({ status: 'sent' });
    } catch (err) {
      console.error('[scheduledMessageJob] failed for msg', msg._id, err.message);
      await msg.updateOne({ status: 'failed' }).catch(() => {});
    }
  }
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const pool = getTenantPool();
    for (const conn of pool.values()) {
      if (conn.readyState !== 1) continue;
      try {
        const models = getTenantModels(conn);
        if (!models.ScheduledMessage) continue;
        await processTenant(models);
      } catch (err) {
        console.error('[scheduledMessageJob] tenant error', err.message);
      }
    }
  } finally {
    running = false;
  }
}

export function startScheduledMessageJob() {
  console.log('⏰ Scheduled message job started (60s interval)');
  setInterval(() => tick().catch(err => console.error('[scheduledMessageJob]', err.message)), 60_000);
}
