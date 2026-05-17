import crypto from 'crypto';
import multer from 'multer';
import * as wasender from '../services/wasender.service.js'; // includes updateWebhook, updateSession
import { processIncomingMessage, normalizePhone } from '../services/chatbot.service.js';
import { getAnalyticsDb } from '../config/analyticsDb.js';
import { getTenantConnection } from '../config/tenantDb.js';
import { getTenantModels } from '../config/tenantModels.js';
import { uploadFile, deleteFile } from '../services/cloudinary.service.js';
import mongoose from 'mongoose';
import { io } from '../index.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
export const uploadMediaMiddleware = upload.single('file');

// Mask a secret, showing only the last 4 chars
function mask(val) {
  if (!val || val.length <= 4) return '****';
  return `****${val.slice(-4)}`;
}

// Append the tenant id to the base webhook URL so each tenant's inbound
// webhook is self-identifying (no cross-tenant scan / fallback guessing).
// Idempotent: never double-appends if the URL is already scoped.
function buildTenantWebhookUrl(baseUrl, tenantId) {
  if (!baseUrl || !tenantId) return baseUrl;
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith(`/${tenantId}`)) return trimmed;
  return `${trimmed}/${tenantId}`;
}

// Map WaSender's 401 to 400 so the frontend Axios interceptor doesn't
// mistake it for a JWT auth failure and redirect to /login.
function wasenderStatus(err) {
  return err.statusCode === 401 ? 400 : (err.statusCode || 500);
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
    const fields = ['sessionId', 'sessionName', 'phoneNumber', 'webhookUrl', 'personalAccessToken', 'sessionApiKey', 'webhookSecret', 'logMessages', 'isActive'];
    const update = {};
    for (const f of fields) {
      if (req.body[f] !== undefined && req.body[f] !== null) {
        // Skip masked placeholders
        if (typeof req.body[f] === 'string' && req.body[f].startsWith('****')) continue;
        // Skip phone numbers that are just the country prefix with no digits
        if (f === 'phoneNumber' && typeof req.body[f] === 'string' && req.body[f].replace(/^\+\d{1,3}/, '').length < 7) continue;
        update[f] = req.body[f];
      }
    }
    console.log('[wasender] saveConfig update:', JSON.stringify(update));
    const config = await WaSenderConfig.findOneAndUpdate({}, { $set: update }, { upsert: true, new: true });

    // If webhook URL changed and a session already exists, sync it to WaSender automatically
    if (update.webhookUrl && config.sessionId && config.personalAccessToken) {
      // Try dedicated webhook endpoint first, fall back to general session update
      try {
        const scopedWebhookUrl = buildTenantWebhookUrl(config.webhookUrl, req.user.tenantId);
        const syncResult = await wasender.updateWebhook(config.sessionId, config.personalAccessToken, scopedWebhookUrl);
        console.log('[wasender] webhook synced to WaSender:', scopedWebhookUrl, '| events subscribed, groups/channels/broadcasts ignored');
        // WaSender owns the webhook secret — read it from the response and keep our DB in sync
        const wasenderSecret = syncResult?.data?.webhook_secret;
        if (wasenderSecret && wasenderSecret !== config.webhookSecret) {
          await config.updateOne({ webhookSecret: wasenderSecret });
          console.log('[wasender] webhook secret auto-saved from WaSender response');
        }
      } catch (syncErr) {
        console.warn('[wasender] webhook sync failed:', syncErr.message, '| body:', JSON.stringify(syncErr.wasenderBody));
      }
    }

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

export async function createSessionHandler(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.personalAccessToken) {
      return res.status(400).json({ message: 'Save your Personal Access Token first' });
    }
    const sessionName = req.body.sessionName || config.sessionName || 'DMS WhatsApp';
    const phoneNumber = req.body.phoneNumber || config.phoneNumber || '';
    const webhookUrl  = config.webhookUrl || '';
    if (!phoneNumber) return res.status(400).json({ message: 'Phone number is required to create a session (e.g. +919876543210)' });
    if (!webhookUrl)  return res.status(400).json({ message: 'Webhook URL is required. Contact your Connect POC for the public webhook URL.' });
    const scopedWebhookUrl = buildTenantWebhookUrl(webhookUrl, req.user.tenantId);
    const data = await wasender.createSession(config.personalAccessToken, sessionName, phoneNumber, scopedWebhookUrl);
    const sessionId = data?.data?.id || data?.data?.sessionId || data?.id;
    if (!sessionId) return res.status(500).json({ message: 'WaSender did not return a session ID', raw: data });
    const sessionUpdate = { sessionId, sessionName, status: 'disconnected' };
    if (phoneNumber) sessionUpdate.phoneNumber = phoneNumber;
    await WaSenderConfig.findOneAndUpdate({}, { $set: sessionUpdate }, { upsert: true, new: true });
    // Immediately connect — capture any error so the UI can show it
    let connectWarning = null;
    try {
      await wasender.connectSession(sessionId, config.personalAccessToken);
    } catch (connectErr) {
      console.warn('[wasender] auto-connect after create failed:', connectErr.message);
      connectWarning = connectErr.message;
    }
    res.json({ sessionId, sessionName, message: 'Session created and connection initiated', connectWarning });
  } catch (err) {
    console.error('[wasender] createSession', err);
    res.status(wasenderStatus(err)).json({ message: err.message, details: err.wasenderBody || null });
  }
}

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
    // Auto-capture session API key when connected (if WaSender returns it)
    const apiKey = data?.data?.api_key || data?.data?.apiKey;
    // Auto-capture webhook secret (WaSender returns it in the session details)
    const webhookSecret = data?.data?.webhook_secret || data?.data?.webhookSecret;
    const updateFields = { status, connectedPhone };
    if (apiKey && !config.sessionApiKey) updateFields.sessionApiKey = apiKey;
    if (webhookSecret && webhookSecret !== config.webhookSecret) updateFields.webhookSecret = webhookSecret;
    await config.updateOne(updateFields);
    res.json({ status, connectedPhone, sessionId: config.sessionId, sessionName: config.sessionName });
  } catch (err) {
    console.error('[wasender] getSessionStatus', err);
    res.status(wasenderStatus(err)).json({ message: err.message, details: err.wasenderBody || null });
  }
}

export async function disconnectSessionHandler(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.sessionId || !config?.personalAccessToken) return res.status(400).json({ message: 'No session configured' });
    await wasender.disconnectSession(config.sessionId, config.personalAccessToken);
    await config.updateOne({ status: 'disconnected' });
    res.json({ status: 'disconnected' });
  } catch (err) {
    res.status(wasenderStatus(err)).json({ message: err.message, details: err.wasenderBody || null });
  }
}

export async function regenerateKeyHandler(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.sessionId || !config?.personalAccessToken) return res.status(400).json({ message: 'No session configured' });
    const data = await wasender.regenerateApiKey(config.sessionId, config.personalAccessToken);
    const apiKey = data?.data?.api_key || data?.data?.apiKey || data?.api_key;
    if (apiKey) await config.updateOne({ sessionApiKey: apiKey });
    res.json({ message: 'API key regenerated', masked: apiKey ? `****${apiKey.slice(-4)}` : null });
  } catch (err) {
    res.status(wasenderStatus(err)).json({ message: err.message, details: err.wasenderBody || null });
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
    console.log('[wasender] getQrCode raw response:', JSON.stringify(data));
    res.json(data);
  } catch (err) {
    console.error('[wasender] getQrCode', err);
    res.status(wasenderStatus(err)).json({ message: err.message, details: err.wasenderBody || null });
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
    res.status(wasenderStatus(err)).json({ message: err.message, details: err.wasenderBody || null });
  }
}

// ── Send message ──────────────────────────────────────────────────────────────

export async function sendMessageHandler(req, res) {
  try {
    const { WaSenderConfig, WaSenderMessage } = req.tenantModels;
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

    // Persist outbound message so the thread is fully in MongoDB
    const phone = normalizePhone(to);
    if (phone) {
      await WaSenderMessage.create({
        phone,
        direction: 'outbound',
        body:      text || caption || (poll ? poll.question : '') || `[${type}]`,
        type:      type || 'text',
        timestamp: Math.floor(Date.now() / 1000),
        mediaUrl:  imageUrl || videoUrl || documentUrl || audioUrl,
        caption,
        fileName,
      });
    }

    res.json(data);
  } catch (err) {
    console.error('[wasender] sendMessage', err);
    res.status(500).json({ message: err.message });
  }
}

// ── Inbox ─────────────────────────────────────────────────────────────────────

export async function getInbox(req, res) {
  try {
    const { WaSenderMessage } = req.tenantModels;

    // Aggregate: one doc per phone with last message and total count
    const convos = await WaSenderMessage.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: {
        _id:         '$phone',
        lastBody:    { $first: '$body' },
        lastType:    { $first: '$type' },
        lastTs:      { $first: '$timestamp' },
        lastDir:     { $first: '$direction' },
        count:       { $sum: 1 },
      }},
      { $sort: { lastTs: -1 } },
    ]);

    const conversations = convos.map(c => ({
      phone:       c._id,
      lastMessage: { body: c.lastBody, type: c.lastType, timestamp: c.lastTs, direction: c.lastDir },
      count:       c.count,
    }));

    res.json({ conversations });
  } catch (err) {
    console.error('[wasender] getInbox', err);
    res.status(500).json({ message: err.message });
  }
}

export async function getThread(req, res) {
  try {
    const { WaSenderMessage } = req.tenantModels;
    const phone = req.params.phone;
    const limit = parseInt(req.query.limit) || 100;

    const messages = await WaSenderMessage
      .find({ phone })
      .sort({ timestamp: 1 })
      .limit(limit)
      .lean();

    res.json({ messages });
  } catch (err) {
    console.error('[wasender] getThread', err);
    res.status(500).json({ message: err.message });
  }
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function getContactsList(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.sessionApiKey) return res.status(400).json({ message: 'No session API key configured' });
    const data = await wasender.getContacts(config.sessionApiKey);
    res.json(data);
  } catch (err) {
    console.error('[wasender] getContacts', err);
    res.status(wasenderStatus(err)).json({ message: err.message });
  }
}

export async function getContactInfo(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.sessionApiKey) return res.status(400).json({ message: 'No session API key configured' });
    const data = await wasender.getContact(config.sessionApiKey, req.params.phone);
    res.json(data);
  } catch (err) {
    // "Contact not found" is expected for numbers not yet synced — soft error, no stacktrace
    res.status(wasenderStatus(err)).json({ message: err.message });
  }
}

export async function getContactPicture(req, res) {
  try {
    const { WaSenderConfig } = req.tenantModels;
    const config = await WaSenderConfig.findOne();
    if (!config?.sessionApiKey) return res.status(400).json({ message: 'No session API key configured' });
    const data = await wasender.getContactPicture(config.sessionApiKey, req.params.phone);
    res.json(data);
  } catch (err) {
    // Profile picture not found is a soft error — return null
    res.json({ picture: null });
  }
}

// ── Webhook ───────────────────────────────────────────────────────────────────

// Deterministic resolver: tenant id comes straight from the webhook URL path.
// One analytics lookup, no scan, no cross-tenant guessing.
async function resolveTenantFromParam(tenantId, sessionId) {
  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) return null;
  const analyticsDb = getAnalyticsDb();
  const tenant = await analyticsDb.collection('tenants').findOne({
    _id: new mongoose.Types.ObjectId(tenantId),
  });
  if (!tenant?.mongoUri || !tenant?.mongoDbName) return null;

  const conn   = await getTenantConnection(tenant.mongoUri, tenant.mongoDbName);
  const models = getTenantModels(conn);
  const cfg    = await models.WaSenderConfig?.findOne();
  if (!cfg) return null;

  // Safe to learn the hash-based webhookSessionId now: the tenant is known
  // for certain from the URL, so there is no misrouting risk.
  if (sessionId && !cfg.webhookSessionId) {
    await cfg.updateOne({ webhookSessionId: sessionId });
  }
  return { tenantModels: models, tenantConfig: cfg, tenantId: tenant._id.toString() };
}

// Legacy resolver: scan tenants by sessionId. Only reached for sessions
// registered against the old bare webhook URL (no tenant id in path).
async function resolveTenantByScan(sessionId) {
  const analyticsDb = getAnalyticsDb();
  const tenants = await analyticsDb.collection('tenants').find({}).toArray();

  for (const tenant of tenants) {
    try {
      const conn   = await getTenantConnection(tenant.mongoUri, tenant.mongoDbName);
      const models = getTenantModels(conn);
      const cfg = await models.WaSenderConfig?.findOne({
        $or: [{ sessionId }, { webhookSessionId: sessionId }],
      });
      if (cfg) return { tenantModels: models, tenantConfig: cfg, tenantId: tenant._id.toString() };
    } catch { /* skip */ }
  }

  // First-ever webhook from a legacy session — WaSender uses a hash ID we
  // haven't stored yet. This branch is inherently ambiguous with multiple
  // tenants; new onboarding uses the tenant-scoped URL and never reaches it.
  for (const tenant of tenants) {
    try {
      const conn   = await getTenantConnection(tenant.mongoUri, tenant.mongoDbName);
      const models = getTenantModels(conn);
      const cfg    = await models.WaSenderConfig?.findOne({ sessionId: { $exists: true, $ne: null }, webhookSessionId: { $exists: false } });
      if (cfg) {
        await cfg.updateOne({ webhookSessionId: sessionId });
        console.log('[webhook] (legacy) learned webhookSessionId:', sessionId, '→ linked to sessionId:', cfg.sessionId);
        const linked = await models.WaSenderConfig?.findOne({ webhookSessionId: sessionId });
        return { tenantModels: models, tenantConfig: linked, tenantId: tenant._id.toString() };
      }
    } catch { /* skip */ }
  }
  return null;
}

async function processWebhookEvent(payload, tenantModels, tenantConfig, tenantId) {
  const eventType = payload.event || payload.type;

  if (eventType === 'messages.received') {
    const msg   = payload.data?.messages || {};
    const phone = normalizePhone(msg?.key?.cleanedSenderPn || msg?.key?.cleanedParticipantPn);
    const body  = msg?.messageBody || '';
    // Sender's own WhatsApp profile name — used as a name fallback for
    // first-time senders who aren't yet patients in the DB.
    const senderName = msg?.pushName || msg?.verifiedBizName || msg?.notifyName || '';
    console.log('[webhook] inbound message | phone:', phone, '| body:', body);
    if (phone) {
      // Persist to MongoDB so the inbox has full history
      const { WaSenderMessage } = tenantModels;
      if (WaSenderMessage) {
        await WaSenderMessage.create({
          phone,
          direction: 'inbound',
          body,
          type:      'text',
          timestamp: payload.timestamp || Math.floor(Date.now() / 1000),
          messageId: msg?.key?.id,
        }).catch(() => {}); // ignore duplicate messageId
      }
      await processIncomingMessage(tenantModels, tenantConfig.sessionApiKey, phone, body, 'text', senderName);
    } else {
      console.warn('[webhook] could not extract phone from message payload:', JSON.stringify(msg?.key));
    }

  } else if (eventType === 'poll.results') {
    const d = payload.data || {};
    // Find the option that has at least one voter
    const pollResults = d.pollResult || d.pollResults || [];
    const voted = pollResults.find(r => r.voters?.length > 0);
    const option = voted?.name;
    // Phone is in voters[0] as "91XXXXXXXXXX@s.whatsapp.net"
    const voterJid = voted?.voters?.[0] || '';
    const phone = normalizePhone(voterJid.replace(/@.*$/, ''));
    console.log('[webhook] poll result | phone:', phone, '| option:', option);
    if (phone && option) await processIncomingMessage(tenantModels, tenantConfig.sessionApiKey, phone, option, 'poll_vote');

  } else if (eventType === 'qrcode.updated') {
    const qrcode = payload.data?.qrCode || payload.data?.qrcode || payload.qrCode || payload.qrcode;
    if (qrcode) {
      await tenantConfig.updateOne({ status: 'need_scan' });
      // Push new QR instantly to the frontend — tagged with the correct tenant
      io.emit('wasender:qrcode', { qrcode, tenantId });
    }

  } else if (eventType === 'session.status') {
    const status = payload.data?.status || payload.status;
    const phone  = payload.data?.phone  || payload.phone;
    if (status) {
      await tenantConfig.updateOne({ status, ...(phone ? { connectedPhone: phone } : {}) });
      // Push status change instantly to frontend
      io.emit('wasender:status', { status, connectedPhone: phone || tenantConfig.connectedPhone, tenantId });
    }
  }
}

export async function handleWebhook(req, res) {
  // Respond immediately so WaSender doesn't retry
  res.sendStatus(200);

  try {
    const payload = req.body;
    console.log('[webhook] received event:', payload?.event || payload?.type, '| tenant:', req.params.tenantId || '(legacy)', '| session:', payload?.session?.id || payload?.sessionId, '| keys:', Object.keys(payload || {}).join(','));

    const sessionId = payload?.session?.id || payload?.sessionId || payload?.session_id;
    let resolved = null;

    if (req.params.tenantId) {
      // Preferred path: self-identifying URL → deterministic, no scan.
      resolved = await resolveTenantFromParam(req.params.tenantId, sessionId);
      if (!resolved) {
        console.warn('[webhook] tenant-scoped URL but tenant/config not resolvable:', req.params.tenantId);
        return;
      }
    } else {
      // Legacy bare URL — fall back to sessionId scan.
      if (!sessionId) {
        console.warn('[webhook] no sessionId in payload and no tenant in URL — ignoring. Full payload:', JSON.stringify(payload));
        return;
      }
      resolved = await resolveTenantByScan(sessionId);
      if (!resolved) {
        console.warn('[webhook] no tenant found for sessionId:', sessionId);
        return;
      }
    }

    const { tenantModels, tenantConfig, tenantId } = resolved;

    // Verify webhook signature if secret is configured
    // WaSender sends the raw secret as the header value (not an HMAC digest)
    if (tenantConfig.webhookSecret) {
      const sig = req.headers['x-webhook-signature'] || req.headers['x-hub-signature-256'];
      if (sig && sig !== tenantConfig.webhookSecret) {
        console.warn('[webhook] invalid signature — header does not match stored secret');
        return;
      }
    }

    await processWebhookEvent(payload, tenantModels, tenantConfig, tenantId);
  } catch (err) {
    console.error('[webhook] error', err.message);
  }
}

// ── WhatsApp Media Library ────────────────────────────────────────────────────

function inferMediaType(mimeType, originalName) {
  if (!mimeType) return 'document';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

export async function listMedia(req, res) {
  try {
    const { WhatsAppMedia } = req.tenantModels;
    const items = await WhatsAppMedia.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function uploadMedia(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { WhatsAppMedia } = req.tenantModels;
    const mediaType = inferMediaType(req.file.mimetype, req.file.originalname);
    const result = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      'dms/whatsapp-media',
      ['whatsapp-media'],
      req.tenantConfig,
    );
    const doc = await WhatsAppMedia.create({
      publicId:  result.publicId,
      url:       result.url,
      fileName:  req.file.originalname,
      mediaType,
      mimeType:  req.file.mimetype,
      size:      req.file.size,
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteMedia(req, res) {
  try {
    const { WhatsAppMedia } = req.tenantModels;
    const doc = await WhatsAppMedia.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    await deleteFile(doc.publicId, req.tenantConfig);
    await doc.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
