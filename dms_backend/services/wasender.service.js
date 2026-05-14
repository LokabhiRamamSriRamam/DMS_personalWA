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
  if (!res.ok) throw new Error(data.message || `WaSender ${res.status}: ${path}`);
  return data;
}

export async function createSession(pat, name, webhookUrl, webhookSecret) {
  return apiCall('POST', '/api/whatsapp-sessions', pat, {
    name,
    log_messages: true,
    webhook_url: webhookUrl,
    webhook_secret: webhookSecret,
    webhook_enabled: true,
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
