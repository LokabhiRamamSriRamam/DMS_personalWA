/**
 * WhatsApp messaging service.
 * Builds correctly-shaped WAAPI payloads from tenant templates.
 * Never throws to callers — all errors are caught in triggerWhatsApp.
 *
 * TIMEZONE CONSISTENCY:
 * - Backend stores all times in UTC/ISO format (e.g., 2026-04-28T10:00:00Z)
 * - Frontend displays all times in IST (UTC+5:30) using getIndiaDate/getIndiaTime helpers
 * - Message templates receive IST-formatted dates for user-facing content
 * - Scheduling calculations use UTC for consistency
 */

// ─── Timezone helpers ─────────────────────────────────────────────────────────

function formatDateIST(date) {
  // Format the UTC instant in IST using an explicit timeZone — do NOT manually
  // shift the millisecond value, otherwise toLocaleString applies the host's
  // own timezone on top and the result becomes host-dependent.
  return new Date(date).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatTimeIST(date) {
  return new Date(date).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
}

// ─── Placeholder replacement ──────────────────────────────────────────────────

function replacePlaceholders(str, data) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}

function replacePlaceholdersDeep(obj, data) {
  if (typeof obj === 'string') return replacePlaceholders(obj, data);
  if (Array.isArray(obj))      return obj.map(v => replacePlaceholdersDeep(v, data));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = replacePlaceholdersDeep(v, data);
    return out;
  }
  return obj;
}

// ─── Build content block per type ────────────────────────────────────────────
// Each function takes the stored template.content and returns the WAAPI content shape.

export function buildContent(contentType, templateContent, data) {
  const c = replacePlaceholdersDeep(templateContent, data);

  switch (contentType) {
    case 'text':
      return { text: c.text || '' };

    case 'image':
      return {
        url:        c.url,
        caption:    c.caption,
        mimetype:   c.mimetype,
        width:      c.width,
        height:     c.height,
        viewOnce:   c.viewOnce ?? false,
      };

    case 'video':
      return {
        url:         c.url,
        mimetype:    c.mimetype,
        caption:     c.caption,
        gifPlayback: c.gifPlayback ?? false,
        ptv:         c.ptv ?? false,
      };

    case 'document':
      return {
        url:      c.url,
        mimetype: c.mimetype,
        fileName: c.fileName,
        caption:  c.caption,
      };

    case 'audio':
      return {
        url:      c.url,
        mimetype: c.mimetype,
        ptt:      c.ptt ?? false,
        seconds:  c.seconds,
      };

    case 'sticker':
      return {
        url:        c.url,
        isAnimated: c.isAnimated ?? false,
        mimetype:   c.mimetype ?? 'image/webp',
        width:      c.width,
        height:     c.height,
      };

    case 'location':
      return {
        degreesLatitude:  c.degreesLatitude,
        degreesLongitude: c.degreesLongitude,
        name:             c.name,
        address:          c.address,
      };

    case 'contact':
      return {
        displayName: c.displayName,
        contacts:    c.contacts ?? [],
      };

    case 'poll':
      return {
        name:            c.name,
        values:          c.values ?? [],
        selectableCount: c.selectableCount ?? 1,
      };

    default:
      return c;
  }
}

// ─── buildMessage ─────────────────────────────────────────────────────────────

/**
 * Builds the WAAPI payload for a given event type.
 * Returns null if WhatsApp is disabled, the event is toggled off, or no template found.
 *
 * Language resolution: explicitLang → defaultLanguage → fallbackLanguage → 'en'
 *
 * @param {object} tenantModels
 * @param {string} tenantId
 * @param {string} eventType
 * @param {object} data          placeholder values
 * @param {string} [explicitLang]
 * @param {Date|string} [appointmentStartTime] appointment start for reminder scheduling
 * @returns {object|null}        WAAPI payload (without .to)
 */
export async function buildMessage(tenantModels, tenantId, eventType, data, explicitLang, appointmentStartTime) {
  const { WhatsAppSettings, WhatsAppTemplate, PollTemplate } = tenantModels;

  const settings = await WhatsAppSettings.findOne({}).lean();
  console.log(`[WhatsApp] buildMessage: event=${eventType}, settingsEnabled=${settings?.enabled}`);
  if (!settings?.enabled) return null;

  const eventConfig = settings.events?.[eventType];
  console.log(`[WhatsApp] Event config for ${eventType}:`, eventConfig);
  if (!eventConfig?.enabled) return null;

  let content, contentType;

  // Special handling for feedbackPoll — use PollTemplate
  if (eventType === 'feedbackPoll') {
    const pollTemplateId = eventConfig.pollTemplateId;
    if (!pollTemplateId) {
      console.log(`[WhatsApp] feedbackPoll enabled but no pollTemplateId configured`);
      return null;
    }
    const pollTemplate = await PollTemplate.findById(pollTemplateId).lean();
    if (!pollTemplate || !pollTemplate.isActive) {
      console.log(`[WhatsApp] PollTemplate ${pollTemplateId} not found or inactive`);
      return null;
    }
    content = buildContent('poll', {
      name: pollTemplate.name,
      values: pollTemplate.options,
      selectableCount: 1,
    }, data);
    contentType = 'poll';
    console.log(`[WhatsApp] Using PollTemplate ${pollTemplateId} for feedbackPoll`);
  } else {
    // Standard template lookup for all other events
    // Language resolution chain — deduplicated
    const chain = [];
    const push  = (l) => { if (l && !chain.includes(l)) chain.push(l); };
    push(explicitLang);
    push(settings.defaultLanguage);
    push(settings.fallbackLanguage);
    push('en');

    let template = null;
    console.log(`[WhatsApp] Looking for template with chain:`, chain);
    for (const lang of chain) {
      console.log(`[WhatsApp] Trying to find template: event=${eventType}, language=${lang}, isActive=true`);
      template = await WhatsAppTemplate.findOne({ event: eventType, language: lang, isActive: true }).lean();
      console.log(`[WhatsApp] Result for ${lang}:`, template ? `Found (id=${template._id})` : 'Not found');
      if (template) break;
    }
    if (!template) {
      console.log(`[WhatsApp] No template found for event=${eventType}, languages tried:`, chain);
      const allTemplates = await WhatsAppTemplate.find({ event: eventType }).lean();
      console.log(`[WhatsApp] All templates for ${eventType}:`, allTemplates.map(t => ({ lang: t.language, active: t.isActive })));
      return null;
    }

    content = buildContent(template.contentType, template.content, data);
    contentType = template.contentType;
    console.log(`[WhatsApp] Built message for ${eventType}, contentType=${contentType}`);
  }

  const payload = {
    tenantId,
    to:          '',            // caller fills this
    messageType: eventType,
    contentType,
    content,
  };

  if (eventType === 'appointmentReminder' && appointmentStartTime) {
    const hoursBeforeMs = (eventConfig.hoursBeforeAppointment ?? 24) * 3_600_000;
    const appointmentTimeMs = new Date(appointmentStartTime).getTime();
    const fireAtMs = appointmentTimeMs - hoursBeforeMs;
    const nowMs = Date.now();

    // Skip reminder if there's not enough time before appointment
    // (i.e., if the scheduled send time would be in the past or very close to now)
    if (fireAtMs <= nowMs) {
      console.log(`[WhatsApp:Timing] appointmentReminder skipped: appointment is within ${eventConfig.hoursBeforeAppointment ?? 24} hours from now. appointmentTime=${new Date(appointmentTimeMs).toISOString()}, fireAt=${new Date(fireAtMs).toISOString()}, now=${new Date(nowMs).toISOString()}`);
      return null;
    }

    // Schedule for the calculated time
    payload.scheduledAt = new Date(fireAtMs).toISOString();
    console.log(`[WhatsApp:Timing] appointmentReminder scheduled for ${payload.scheduledAt}`);
  } else if (eventConfig.delayMinutes > 0) {
    payload.scheduledAt = new Date(Date.now() + eventConfig.delayMinutes * 60 * 1000).toISOString();
  }

  return payload;
}

// ─── sendToWAAPI ──────────────────────────────────────────────────────────────

export async function sendToWAAPI(payload, waapiBaseUrl) {
  const waapiPayload = {
    tenantId:      payload.tenantId,
    to:            payload.to,
    messageType:   payload.messageType || 'general',
    contentType:   payload.contentType,
    content:       payload.content,
    message:       payload.message, // for legacy calls that pass message directly
    scheduledAt:   payload.scheduledAt || null,
    patientId:     payload.patientId     || undefined,
    appointmentId: payload.appointmentId || undefined,
  };

  // Ensure content exists for structured messages
  if (!waapiPayload.message && waapiPayload.contentType && !waapiPayload.content) {
     waapiPayload.content = {};
  }

  console.log(`[WhatsApp] WAAPI payload:`, JSON.stringify(waapiPayload, null, 2));

  try {
    const res = await fetch(`${waapiBaseUrl}/dms/sendmessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(waapiPayload),
      signal:  AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`WAAPI responded ${res.status}: ${text}`);
    }
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`WAAPI request timeout (8s): ${err.message}`);
    }
    if (err instanceof TypeError) {
      throw new Error(`WAAPI fetch failed - network error: ${err.message}`);
    }
    throw err;
  }
}

// ─── triggerWhatsApp ──────────────────────────────────────────────────────────

// ─── Journey engine ───────────────────────────────────────────────────────────

const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };

/**
 * Fires a full post-care journey for a completed treatment.
 * Each message step becomes a separate scheduled WAAPI job.
 * Safe to call without await — never throws.
 *
 * @param {object} tenantModels
 * @param {string} tenantId
 * @param {string} waapiBaseUrl
 * @param {string} patientPhone
 * @param {string} treatmentName    matches TreatmentJourney.treatmentName (case-insensitive)
 * @param {Date}   completedAt      base time for delay calculation
 * @param {object} data             placeholder values { name, treatment, date, ... }
 * @param {string} [patientId]
 * @param {string} [explicitLang]
 */
export async function triggerJourney(tenantModels, tenantId, waapiBaseUrl, patientPhone, treatmentName, completedAt, data, patientId, explicitLang) {
  const { WhatsAppSettings, TreatmentJourney, WhatsAppLog } = tenantModels;
  try {
    if (!waapiBaseUrl) return;

    const settings = await WhatsAppSettings.findOne({}).lean();
    if (!settings?.enabled) return;
    if (!settings.events?.postCare?.enabled) return;

    const journey = await TreatmentJourney.findOne({
      treatmentName: { $regex: new RegExp(`^${treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      enabled: true,
    }).lean();
    if (!journey || !journey.messages?.length) return;

    // Language resolution chain
    const chain = [];
    const push = (l) => { if (l && !chain.includes(l)) chain.push(l); };
    push(explicitLang);
    push(settings.defaultLanguage);
    push(settings.fallbackLanguage);
    push('en');

    for (const msg of journey.messages) {
      const delayMs     = (msg.delay?.value || 0) * (UNIT_MS[msg.delay?.unit] || UNIT_MS.hours);
      const scheduledAt = new Date(completedAt.getTime() + delayMs);

      // Resolve best language variant — pick first in chain that has content
      let langVariant = null;
      for (const l of chain) {
        const v = msg.languages?.[l];
        // A variant is considered set if it has any non-empty content
        const hasContent = v?.contentType === 'text'
          ? v?.content?.text?.trim()
          : v?.content && Object.keys(v.content).some(k => v.content[k]);
        if (hasContent) { langVariant = v; break; }
      }
      if (!langVariant) continue; // no content for any language — skip step

      // Build content with placeholder replacement
      const content = buildContent(langVariant.contentType, langVariant.content, data);

      const payload = {
        tenantId,
        to:          patientPhone,
        messageType: 'postCare',
        contentType: langVariant.contentType,
        content,
        scheduledAt: scheduledAt.toISOString(),
      };

      let status = 'scheduled';
      let errorMessage;
      try {
        const waapiResponse = await sendToWAAPI(payload, waapiBaseUrl);
        // Successfully sent to WAAPI — stays as 'scheduled' since it has scheduledAt
        // (once WAAPI actually sends it, status would be updated by a webhook)
        console.log(`[WhatsApp] Journey message queued: ${payload.messageType}, scheduledAt=${payload.scheduledAt}`);
      } catch (err) {
        status = 'failed';
        errorMessage = err.message;
        console.error(`[WhatsApp] Journey message failed to queue: ${err.message}`);
      }

      await WhatsAppLog.create({
        patientId, event: 'postCare', to: patientPhone,
        payload, status, errorMessage, sentAt: new Date(),
      }).catch((logErr) => {
        console.error(`[WhatsApp] Failed to create log entry: ${logErr.message}`);
      });
    }
  } catch (err) {
    console.error(`[WhatsApp] triggerJourney failed [${treatmentName}]:`, err.message);
  }
}

/**
 * High-level trigger: build → send → log. Safe to call without await.
 * Never throws — all errors are caught and logged.
 *
 * @param {object} tenantModels
 * @param {string} tenantId
 * @param {string} waapiBaseUrl
 * @param {string} eventType
 * @param {string} patientPhone
 * @param {object} data
 * @param {string} [patientId]
 * @param {string} [explicitLang]
 * @param {Date|string} [appointmentStartTime] appointment start for reminder scheduling
 */
export async function triggerWhatsApp(tenantModels, tenantId, waapiBaseUrl, eventType, patientPhone, data, patientId, explicitLang, appointmentStartTime, appointmentId) {
  const { WhatsAppLog } = tenantModels;
  let payload = null;
  try {
    console.log(`[WhatsApp] triggerWhatsApp called: event=${eventType}, phone=${patientPhone}, waapiUrl=${waapiBaseUrl}`);
    if (!waapiBaseUrl) {
      console.log('[WhatsApp] WAAPI_BASE_URL not configured, skipping');
      return;
    }

    payload = await buildMessage(tenantModels, tenantId, eventType, data, explicitLang, appointmentStartTime);
    if (!payload) {
      console.log(`[WhatsApp] buildMessage returned null for ${eventType}`);
      return;
    }
    console.log(`[WhatsApp] Built payload for ${eventType}, scheduledAt=${payload.scheduledAt}`);

    payload.to = patientPhone;
    if (patientId)     payload.patientId     = patientId;
    if (appointmentId) payload.appointmentId = appointmentId;

    console.log(`[WhatsApp] Sending to WAAPI: ${waapiBaseUrl}/messages/send`);
    const waapiResponse = await sendToWAAPI(payload, waapiBaseUrl);
    console.log(`[WhatsApp] WAAPI response for ${eventType}:`, waapiResponse);

    const logStatus = payload.scheduledAt ? 'scheduled' : 'sent';
    const logPayload = {
      patientId,
      event: eventType,
      to: patientPhone,
      payload,
      status: logStatus,
      sentAt: new Date(),
    };
    if (payload.scheduledAt) {
      logPayload.scheduledAt = payload.scheduledAt;
    }
    await WhatsAppLog.create(logPayload);
    console.log(`[WhatsApp] ${eventType} logged as ${logStatus}`, payload.scheduledAt ? `scheduled for ${payload.scheduledAt}` : '');
  } catch (err) {
    console.error(`[WhatsApp] triggerWhatsApp failed [${eventType}]:`, err.message);
    if (payload) {
      try {
        await WhatsAppLog.create({
          patientId, event: eventType, to: patientPhone, payload,
          status: 'failed', errorMessage: err.message, sentAt: new Date(),
        });
      } catch (_) {}
    }
  }
}
