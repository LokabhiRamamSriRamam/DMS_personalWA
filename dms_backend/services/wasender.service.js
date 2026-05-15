import fetch from 'node-fetch';

const BASE_URL = process.env.WASENDER_BASE_URL || 'https://wasenderapi.com';

async function apiCall(method, path, token, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Capture every possible error field WasenderAPI may return
    const msg = data.message || data.error || data.errors?.[0] || data.detail || `WaSender API error ${res.status}`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.wasenderBody = data;
    throw err;
  }
  return data;
}

export async function createSession(pat, name, phoneNumber, webhookUrl) {
  return apiCall('POST', '/api/whatsapp-sessions', pat, {
    name,
    phone_number:      phoneNumber,
    account_protection: false,
    log_messages:      true,
    webhook_url:       webhookUrl,
    webhook_enabled:   !!webhookUrl,
    webhook_events:    [
      'messages.received',
      'messages-personal.received',
      'messages.upsert',
      'poll.results',
      'session.status',
      'qrcode.updated',
    ],
    ignore_groups:     true,
    ignore_channels:   true,
    ignore_broadcasts: true,
  });
}

export async function getSessionStatus(sessionId, pat) {
  return apiCall('GET', `/api/whatsapp-sessions/${sessionId}`, pat);
}

export async function regenerateApiKey(sessionId, pat) {
  return apiCall('POST', `/api/whatsapp-sessions/${sessionId}/regenerate-key`, pat);
}

export async function disconnectSession(sessionId, pat) {
  return apiCall('POST', `/api/whatsapp-sessions/${sessionId}/disconnect`, pat);
}

export async function getQrCode(sessionId, pat) {
  return apiCall('GET', `/api/whatsapp-sessions/${sessionId}/qrcode`, pat);
}

export async function connectSession(sessionId, pat) {
  return apiCall('POST', `/api/whatsapp-sessions/${sessionId}/connect`, pat);
}

export async function updateSession(sessionId, pat, body) {
  return apiCall('PUT', `/api/whatsapp-sessions/${sessionId}`, pat, body);
}

export async function updateWebhook(sessionId, pat, webhookUrl) {
  return apiCall('PUT', `/api/whatsapp-sessions/${sessionId}`, pat, {
    webhook_url:      webhookUrl,
    webhook_enabled:  !!webhookUrl,
    webhook_events:   [
      'messages.received',
      'messages-personal.received',
      'messages.upsert',
      'poll.results',
      'session.status',
      'qrcode.updated',
    ],
    ignore_groups:    true,
    ignore_channels:  true,
    ignore_broadcasts: true,
  });
}

/**
 * Send a message via WaSender.
 * payload shape (matches WaSender /api/send-message):
 *   { to, type, text?, imageUrl?, videoUrl?, documentUrl?, fileName?,
 *     audioUrl?, caption?, poll?, location?, replyTo? }
 */
export async function sendMessage(sessionApiKey, payload) {
  return apiCall('POST', '/api/send-message', sessionApiKey, payload);
}

export async function getMessageLogs(sessionId, sessionApiKey, page = 1, limit = 50) {
  return apiCall('GET', `/api/whatsapp-sessions/${sessionId}/message-logs?page=${page}&limit=${limit}`, sessionApiKey);
}

export async function getContacts(sessionApiKey) {
  return apiCall('GET', '/api/contacts', sessionApiKey);
}

export async function getContact(sessionApiKey, phone) {
  return apiCall('GET', `/api/contacts/${phone}`, sessionApiKey);
}

export async function getContactPicture(sessionApiKey, phone) {
  return apiCall('GET', `/api/contacts/${phone}/picture`, sessionApiKey);
}
