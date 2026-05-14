import crypto from 'crypto';
import * as wasender from '../services/wasender.service.js';
import { processIncomingMessage } from '../services/chatbot.service.js';
import { getAnalyticsDb } from '../config/analyticsDb.js';
import { getTenantConnection } from '../config/tenantDb.js';
import { getTenantModels } from '../config/tenantModels.js';
import mongoose from 'mongoose';

// Mask a secret, showing only the last 4 chars
function mask(val) {
  if (!val || val.length <= 4) return '****';
  return `****${val.slice(-4)}`;
}

// ── Config ────────────────────────────────────────────────────────────────────

export async function getConfig(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne().lean();
    if (!config) return res.json(null);
    res.json({
      ...config,
      personalAccessToken: mask(config.personalAccessToken),
      sessionApiKey:       mask(config.sessionApiKey),
      webhookSecret:       mask(config.webhookSecret),
    });
  } catch (err) {
    console.error('[wasender] getConfig', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function saveConfig(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const fields = ['sessionId', 'sessionName', 'personalAccessToken', 'sessionApiKey', 'webhookSecret', 'logMessages', 'isActive'];
    const update = {};
    for (const f of fields) {
      if (req.body[f] !== undefined && req.body[f] !== null) {
        // Don't overwrite if the value is the masked placeholder
        if (typeof req.body[f] === 'string' && req.body[f].startsWith('****')) continue;
        update[f] = req.body[f];
      }
    }
    const config = await WaSenderConfig.findOneAndUpdate({}, { $set: update }, { upsert: true, new: true });
    res.json({
      ...config.toObject(),
      personalAccessToken: mask(config.personalAccessToken),
      sessionApiKey:       mask(config.sessionApiKey),
      webhookSecret:       mask(config.webhookSecret),
    });
  } catch (err) {
    console.error('[wasender] saveConfig', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// ── Session ───────────────────────────────────────────────────────────────────

export async function getSessionStatus(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.sessionId || !config?.personalAccessToken) {
      return res.status(400).json({ message: 'No session configured' });
    }
    const data = await wasender.getSessionStatus(config.sessionId, config.personalAccessToken);
    const status = data?.data?.status || 'unknown';
    const connectedPhone = data?.data?.phone || config.connectedPhone;
    await config.updateOne({ status, connectedPhone });
    res.json({ status, connectedPhone, sessionId: config.sessionId, sessionName: config.sessionName });
  } catch (err) {
    console.error('[wasender] getSessionStatus', err);
    res.status(500).json({ message: err.message });
  }
}

export async function getQrCode(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.sessionId || !config?.personalAccessToken) {
      return res.status(400).json({ message: 'No session configured' });
    }
    const data = await wasender.getQrCode(config.sessionId, config.personalAccessToken);
    res.json(data);
  } catch (err) {
    console.error('[wasender] getQrCode', err);
    res.status(500).json({ message: err.message });
  }
}

export async function connectSession(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.sessionId || !config?.personalAccessToken) {
      return res.status(400).json({ message: 'No session configured' });
    }
    const data = await wasender.connectSession(config.sessionId, config.personalAccessToken);
    const status = data?.data?.status || 'unknown';
    await config.updateOne({ status });
    res.json({ status, data });
  } catch (err) {
    console.error('[wasender] connectSession', err);
    res.status(500).json({ message: err.message });
  }
}

// ── Send message ──────────────────────────────────────────────────────────────

export async function sendMessageHandler(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.sessionApiKey) return res.status(400).json({ message: 'No session API key configured' });

    const { to, type, text, imageUrl, videoUrl, documentUrl, fileName,
            audioUrl, caption, poll, location, replyTo } = req.body;

    const payload = { to, type };
    if (text)        payload.text        = text;
    if (imageUrl)    payload.imageUrl    = imageUrl;
    if (videoUrl)    payload.videoUrl    = videoUrl;
    if (documentUrl) payload.documentUrl = documentUrl;
    if (fileName)    payload.fileName    = fileName;
    if (audioUrl)    payload.audioUrl    = audioUrl;
    if (caption)     payload.caption     = caption;
    if (poll)        payload.poll        = poll;
    if (location)    payload.location    = location;
    if (replyTo)     payload.replyTo     = replyTo;

    const data = await wasender.sendMessage(config.sessionApiKey, payload);
    res.json(data);
  } catch (err) {
    console.error('[wasender] sendMessage', err);
    res.status(500).json({ message: err.message });
  }
}

// ── Inbox ─────────────────────────────────────────────────────────────────────

export async function getInbox(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.sessionId || !config?.sessionApiKey) {
      return res.status(400).json({ message: 'No session configured' });
    }
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 100;
    const data  = await wasender.getMessageLogs(config.sessionId, config.sessionApiKey, page, limit);
    const messages = data?.data || [];

    // Group by contactPhone into conversation list
    const convMap = new Map();
    for (const msg of messages) {
      const phone = msg.from === config.connectedPhone ? msg.to : msg.from;
      if (!convMap.has(phone)) {
        convMap.set(phone, { phone, lastMessage: msg, messages: [msg] });
      } else {
        const conv = convMap.get(phone);
        conv.messages.push(msg);
        if (new Date(msg.timestamp) > new Date(conv.lastMessage.timestamp)) {
          conv.lastMessage = msg;
        }
      }
    }

    const conversations = Array.from(convMap.values())
      .sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp))
      .map(c => ({ phone: c.phone, lastMessage: c.lastMessage, count: c.messages.length }));

    res.json({ conversations, pagination: data?.pagination });
  } catch (err) {
    console.error('[wasender] getInbox', err);
    res.status(500).json({ message: err.message });
  }
}

export async function getThread(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.sessionId || !config?.sessionApiKey) {
      return res.status(400).json({ message: 'No session configured' });
    }
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const data  = await wasender.getMessageLogs(config.sessionId, config.sessionApiKey, page, limit);
    const phone = req.params.phone;
    const messages = (data?.data || []).filter(m => m.from === phone || m.to === phone);
    res.json({ messages, pagination: data?.pagination });
  } catch (err) {
    console.error('[wasender] getThread', err);
    res.status(500).json({ message: err.message });
  }
}

// ── Webhook ───────────────────────────────────────────────────────────────────

export async function handleWebhook(req, res) {
  // Respond immediately so WaSender doesn't retry
  res.sendStatus(200);

  try {
    const payload = req.body;
    const sessionId = payload?.session?.id || payload?.sessionId;
    if (!sessionId) return;

    // Find tenant by sessionId
    const analyticsDb = getAnalyticsDb();
    const tenants = await analyticsDb.collection('tenants').find({}).toArray();

    let tenantModels = null;
    let tenantConfig = null;

    for (const tenant of tenants) {
      try {
        const conn   = await getTenantConnection(tenant.mongoUri, tenant.mongoDbName);
        const models = getTenantModels(conn);
        const cfg    = await models.WaSenderConfig?.findOne({ sessionId });
        if (cfg) { tenantModels = models; tenantConfig = cfg; break; }
      } catch { /* skip */ }
    }

    if (!tenantModels || !tenantConfig) return;

    // Verify webhook signature if secret is configured
    if (tenantConfig.webhookSecret) {
      const sig = req.headers['x-webhook-signature'] || req.headers['x-hub-signature-256'];
      if (sig) {
        const expected = crypto.createHmac('sha256', tenantConfig.webhookSecret)
          .update(JSON.stringify(req.body)).digest('hex');
        if (sig.replace('sha256=', '') !== expected) {
          console.warn('[webhook] invalid signature, ignoring');
          return;
        }
      }
    }

    const eventType = payload.event || payload.type;

    if (['messages.received', 'messages-personal.received', 'messages.upsert'].includes(eventType)) {
      const msg   = payload.data?.message || payload.data || {};
      const phone = msg.from || payload.from;
      const body  = msg.body || msg.text || '';
      if (phone) await processIncomingMessage(tenantModels, tenantConfig.sessionApiKey, phone, body, 'text');

    } else if (eventType === 'poll.results') {
      const phone  = payload.data?.from || payload.from;
      const option = (payload.data?.selectedOptions || payload.selectedOptions || [])[0];
      if (phone && option) await processIncomingMessage(tenantModels, tenantConfig.sessionApiKey, phone, option, 'poll_vote');

    } else if (['session.status', 'qrcode.updated'].includes(eventType)) {
      const status = payload.data?.status || payload.status;
      if (status) await tenantConfig.updateOne({ status });
    }
  } catch (err) {
    console.error('[webhook] error', err.message);
  }
}
