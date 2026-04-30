# WhatsApp Logs & Scheduled Messages Implementation

## What Was Implemented

### Problem
The logs were not properly tracking **scheduled/queued messages** in the post-care journey system. Messages were being queued in WAAPI for delayed delivery, but there was no visibility into what was pending or why some messages might fail to send.

### Solution
Implemented comprehensive logging with three new backend routes and enhanced frontend UI to track all message states.

---

## Backend Changes

### 1. **Enhanced WhatsAppLog Model** (already existed)
**File:** `dms_backend/models/WhatsAppLog.model.js`

The schema already supports three statuses:
```javascript
status: { type: String, enum: ['sent', 'failed', 'scheduled'], required: true }
```

**Status Meanings:**
- **`sent`** — Message successfully queued in WAAPI or immediately sent
- **`scheduled`** — Message is queued for future delivery with a `scheduledAt` timestamp
- **`failed`** — Message failed to queue (invalid phone, disabled event, template not found, etc.)

### 2. **New Controller Functions** 
**File:** `dms_backend/controllers/whatsapp.controller.js`

#### `getLogs(req, res)` — Enhanced
- **Route:** `GET /api/whatsapp/logs`
- **New Features:**
  - Date range filtering: `?dateFrom=2025-01-01&dateTo=2025-01-31`
  - Event filtering: `?event=postCare`
  - Status filtering: `?status=scheduled`
- **Returns:** Array of log entries with patient name, event type, phone, status, timestamp, error message
- **Limit:** 200 most recent entries

#### `getScheduledLogs(req, res)` — NEW
- **Route:** `GET /api/whatsapp/logs/scheduled`
- **Purpose:** Get only messages with `status='scheduled'` (messages currently queued, not yet sent)
- **Returns:** Same format as getLogs, but filtered to pending messages only
- **Use Case:** Dashboard widget showing "Pending Messages" count and details

#### `getLogsSummary(req, res)` — NEW
- **Route:** `GET /api/whatsapp/logs/summary`
- **Purpose:** Get KPI aggregates and recent failures for dashboard
- **Returns:**
  ```json
  {
    "byStatus": {
      "sent": 245,
      "scheduled": 18,
      "failed": 3
    },
    "byEvent": {
      "appointmentReminder": 120,
      "postCare": 108,
      "treatmentScheduled": 20
    },
    "recentFailed": [
      {
        "_id": "...",
        "patientId": { "first_name": "Jane", "last_name": "Smith" },
        "event": "appointmentReminder",
        "to": "+919876543210",
        "errorMessage": "Invalid phone number format",
        "sentAt": "2025-01-20T09:30:00Z"
      }
    ]
  }
  ```

### 3. **Updated Routes**
**File:** `dms_backend/routes/whatsapp.routes.js`

Added three new route registrations (in order - specifics before generics):
```javascript
router.get('/logs/scheduled', getScheduledLogs);    // Must be BEFORE /logs/:id
router.get('/logs/summary',   getLogsSummary);      // Must be BEFORE /logs/:id
router.get('/logs',           getLogs);             // General logs endpoint
```

**Important:** Route registration order matters in Express. Specific routes (`/logs/scheduled`) must be registered BEFORE generic routes with parameters (`/logs/:id`), otherwise the parameter route will catch it.

### 4. **Improved Journey Logging**
**File:** `dms_backend/services/whatsapp.service.js`

Enhanced `triggerJourney()` function:
- Added better logging for debugging: `[WhatsApp] Journey message queued: ...`
- Improved error handling with try-catch on log creation
- Added informative error messages to logs when queue fails

**Key Flow:**
```javascript
// For each message in a post-care journey:
let status = 'scheduled';
let errorMessage;
try {
  const waapiResponse = await sendToWAAPI(payload, waapiBaseUrl);
  console.log(`[WhatsApp] Journey message queued: ${payload.messageType}, scheduledAt=${payload.scheduledAt}`);
  // Status remains 'scheduled' — WAAPI will send it later
} catch (err) {
  status = 'failed';
  errorMessage = err.message;
  console.error(`[WhatsApp] Journey message failed to queue: ${err.message}`);
}

// Log the attempt (success or failure)
await WhatsAppLog.create({
  patientId, event: 'postCare', to: patientPhone,
  payload, status, errorMessage, sentAt: new Date(),
});
```

---

## Frontend Changes

### **Enhanced LogsPanel Component**
**File:** `frontend/src/pages/WhatsAppPage.jsx`

#### Features Added:

1. **Summary KPI Cards** (displayed at top of logs panel)
   - Green card: "Sent" count
   - Yellow card: "Pending" (scheduled) count  
   - Red card: "Failed" count
   - Blue card: "Total" messages

2. **Dual API Calls**
   ```javascript
   // Load both logs and summary in parallel
   const [logsRes, summaryRes] = await Promise.all([
     api.get('/whatsapp/logs', { params }),
     api.get('/whatsapp/logs/summary'),
   ]);
   ```

3. **Enhanced Filters**
   - Event type dropdown (all EVENTS)
   - Status dropdown (Sent, Failed, Scheduled)
   - Refresh button to reload

4. **Logs Table** (already existed, unchanged)
   - Shows patient name, event, phone, status badge, timestamp, error message
   - Color-coded status badges (green for sent, yellow for scheduled, red for failed)

---

## How It Works (Complete Flow)

### Scenario: Post-Care Journey After Treatment Completion

```
1. Patient has treatment marked "Completed" in Visit
   ↓
2. Visit controller calls: triggerJourney(patientPhone, treatmentName, ...)
   ↓
3. Service fetches TreatmentJourney document matching treatmentName
   ↓
4. For each message in journey (e.g., 3 steps):
   a. Calculate: scheduledAt = now + delay (e.g., 1 hour later)
   b. Build message content with patient/treatment variables
   c. Call sendToWAAPI(payload with scheduledAt)
   d. WAAPI API returns success (message queued for later)
   e. Create WhatsAppLog entry:
      - status: "scheduled"
      - sentAt: now (timestamp of when queued, not when will be sent)
      - payload.scheduledAt: the time when WAAPI will send it
   ↓
5. Frontend calls GET /api/whatsapp/logs/summary
   → Shows "Pending: 3" (three messages queued)
   ↓
6. Frontend calls GET /api/whatsapp/logs?status=scheduled
   → Shows the three message details with their scheduled times
   ↓
7. At the scheduled time, WAAPI sends the message
   (In future) Webhook from WAAPI updates log status to "sent"
```

---

## Data Schema in Logs

Each WhatsAppLog document contains:

```javascript
{
  _id: ObjectId,
  patientId: ObjectId,           // Ref to Patient, auto-populated
  event: String,                 // "postCare", "appointmentReminder", etc.
  to: String,                    // Phone number, e.g. "+919876543210"
  payload: {
    tenantId: String,
    to: String,
    messageType: String,         // Same as event
    contentType: String,         // "text", "image", "video", etc.
    content: {                   // Varies by contentType
      text: String,              // For text messages
      url: String,               // For images/videos
      caption: String,           // Optional caption
      // ... other media fields
    },
    scheduledAt: ISO8601String   // ONLY if scheduled for later delivery
  },
  status: String,                // "sent" | "scheduled" | "failed"
  errorMessage: String,          // null if successful, error text if failed
  sentAt: Date,                  // Timestamp when the log entry was created
  timestamps: {
    createdAt: Date,
    updatedAt: Date
  }
}
```

---

## Debugging Guide

### Issue: Logs page shows "No messages logged yet" even though I've sent messages

**Debug Steps:**
1. Check backend is running: `tail -f logs/*.log` for `[WhatsApp]` lines
2. Check WhatsApp is enabled globally:
   ```bash
   curl http://localhost:5000/api/whatsapp/settings \
     -H "Authorization: Bearer YOUR_TOKEN"
   # Look for: "enabled": true
   ```
3. Check specific event is enabled:
   ```bash
   # In settings response, look for: events.postCare.enabled: true
   ```
4. Check a template exists:
   ```bash
   curl http://localhost:5000/api/whatsapp/templates?event=postCare \
     -H "Authorization: Bearer YOUR_TOKEN"
   # Should return at least one template with isActive: true
   ```
5. Check database directly:
   ```javascript
   // In MongoDB shell
   db.whatsapplogs.find().count()  // Should be > 0
   db.whatsapplogs.find().limit(3) // See recent entries
   ```

### Issue: Logs show "scheduled" but messages never actually send

**Likely Causes:**
1. **WAAPI_BASE_URL not configured**
   - Check `.env`: `WAAPI_BASE_URL=https://...`
   - Restart backend after env change
   - Logs would show status as "failed" with error

2. **Invalid phone number format**
   - WAAPI expects: `+<country><number>` e.g. `+919876543210`
   - Missing country code → message fails
   - Look for: `errorMessage: "Invalid phone number format"`

3. **WAAPI service is down**
   - Check WAAPI health: `curl https://waapi.your-domain.com/health`
   - Look for fetch timeout errors in logs: `WAAPI request timeout (8s)`

4. **Scheduled time is in the past**
   - If scheduledAt < now, WAAPI sends immediately
   - Check `payload.scheduledAt` in log entry

### Issue: Some messages show status "failed"

**Check the errorMessage field:**
```bash
curl "http://localhost:5000/api/whatsapp/logs?status=failed" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Look at the "errorMessage" field in each entry
```

**Common Errors:**
| Error | Cause | Fix |
|-------|-------|-----|
| "No template found for event=..." | No active template for that event | Create/enable template in WhatsApp admin |
| "Invalid phone number format" | Phone missing country code | Update patient phone to +CC format |
| "WhatsApp messaging is disabled" | Global enable is off | Check `/settings` and toggle on |
| "WAAPI responded 401: Unauthorized" | WAAPI_BASE_URL or token invalid | Check `.env` WAAPI_BASE_URL |
| "WAAPI request timeout (8s)" | WAAPI service too slow/down | Check WAAPI status |

### Issue: Dashboard KPI cards show 0 for everything

**Check:**
1. Is the logs table below showing data? 
   - If yes: refresh button may not be calling load()
   - If no: see above issues

2. Try direct API call:
   ```bash
   curl http://localhost:5000/api/whatsapp/logs/summary \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Routes Quick Reference

| Endpoint | Query Params | Purpose | Returns |
|----------|-------------|---------|---------|
| `GET /api/whatsapp/logs` | `?event=` `?status=` `?dateFrom=` `?dateTo=` | All logs with filters | Array of logs |
| `GET /api/whatsapp/logs/scheduled` | — | Pending messages only | Array of scheduled logs only |
| `GET /api/whatsapp/logs/summary` | — | Dashboard KPIs | { byStatus, byEvent, recentFailed } |

---

## Testing the Implementation

### Test 1: Create a test journey, trigger treatment completion

```bash
# 1. Get treatment names
curl http://localhost:5000/api/whatsapp/journeys/treatments \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Create a journey for "Root Canal"
curl -X POST http://localhost:5000/api/whatsapp/journeys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "treatmentName": "Root Canal",
    "enabled": true,
    "messages": [
      {
        "id": "msg_1",
        "delay": { "value": 1, "unit": "hours" },
        "languages": {
          "en": {
            "contentType": "text",
            "content": { "text": "Take care of your tooth..." }
          }
        }
      }
    ]
  }'

# 3. Mark a treatment as complete
# (via frontend: Treatments page → mark treatment Complete)

# 4. Check logs
curl http://localhost:5000/api/whatsapp/logs/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should show: "scheduled": 1
```

### Test 2: Verify error logging

```bash
# 1. Send test message with invalid phone
curl -X POST http://localhost:5000/api/whatsapp/test-send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientPhone": "invalid",
    "eventType": "appointmentReminder"
  }'

# 2. Check logs for failed entry
curl "http://localhost:5000/api/whatsapp/logs?status=failed" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should show error message explaining why it failed
```

---

## Environment Variables

Required in `dms_backend/.env`:
```env
WAAPI_BASE_URL=https://your-waapi-domain.com/api
```

Without this:
- All WhatsApp sends silently fail (buildMessage returns null)
- No log entries are created (because sendToWAAPI is never called)
- Frontend shows "No messages logged yet" even if feature appears to work

---

## Summary of Files Changed

| File | Change | Lines |
|------|--------|-------|
| `dms_backend/controllers/whatsapp.controller.js` | Added `getScheduledLogs()` and `getLogsSummary()` | 289-330 |
| `dms_backend/routes/whatsapp.routes.js` | Added route registrations for new functions | 5-9, 40-44 |
| `dms_backend/services/whatsapp.service.js` | Enhanced `triggerJourney()` logging, added console logs | 289-310 |
| `frontend/src/pages/WhatsAppPage.jsx` | Added summary KPI cards, dual API load, enhanced UI | 1584-1600, 1615+ |

---

## Future Enhancements

1. **Webhook Support** — WAAPI sends webhook when scheduled message is actually sent/failed
   - Update log status from "scheduled" → "sent" or "failed"
   - Mark message as delivered

2. **Retry Logic** — Automatically retry failed messages
   - Exponential backoff for transient failures
   - Manual retry button for permanent failures

3. **Advanced Filtering** — Date range picker, patient search in logs
   - `GET /api/whatsapp/logs?patientId=...`
   - Date picker UI instead of manual ISO strings

4. **Export** — Download logs as CSV
   - `GET /api/whatsapp/logs/export?format=csv`

5. **Analytics** — Delivery rates, engagement metrics
   - `GET /api/whatsapp/analytics?period=month`

