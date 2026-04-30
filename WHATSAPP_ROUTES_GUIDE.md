# WhatsApp API Routes Guide

## Overview

The WhatsApp integration handles automated patient messaging through scheduled notifications and post-care journeys. All routes are under `/api/whatsapp` and require authentication (JWT token in `Authorization: Bearer <token>` header).

---

## Route Categories

### 1. Settings Routes

#### `GET /api/whatsapp/settings`
**Purpose:** Fetch global WhatsApp configuration  
**Response:**
```json
{
  "enabled": true,
  "defaultLanguage": "en",
  "fallbackLanguage": "en",
  "events": {
    "appointmentReminder": { "enabled": true, "hoursBeforeAppointment": 24 },
    "invoiceAndPrescription": { "enabled": false },
    "treatmentScheduled": { "enabled": true },
    "postCare": { "enabled": true, "delayMinutes": 0 },
    ...
  }
}
```
**Use case:** Load settings on app startup

---

#### `PUT /api/whatsapp/settings`
**Purpose:** Update global WhatsApp settings  
**Request Body:**
```json
{
  "enabled": true,
  "defaultLanguage": "en",
  "events": {
    "appointmentReminder": { "enabled": true, "hoursBeforeAppointment": 24 },
    "postCare": { "enabled": true, "delayMinutes": 0 }
  }
}
```
**Response:** Updated settings object (same as GET)  
**Use case:** Admin toggles messaging on/off or changes event triggers

---

### 2. Template Routes

#### `GET /api/whatsapp/templates`
**Purpose:** List all message templates  
**Query Params:**
- `event` (optional): Filter by event type (e.g., `appointmentReminder`, `postCare`)
- `language` (optional): Filter by language code (`en`, `hi`, `mr`)
- `active` (optional): Filter by active status

**Response:**
```json
[
  {
    "_id": "ObjectId",
    "event": "appointmentReminder",
    "language": "en",
    "contentType": "text",
    "content": { "text": "Your appointment is tomorrow at {{time}}" },
    "isActive": true,
    "createdAt": "2025-01-20T10:00:00Z"
  }
]
```
**Use case:** Load templates for editing or preview

---

#### `POST /api/whatsapp/templates`
**Purpose:** Create a new message template  
**Request Body:**
```json
{
  "event": "appointmentReminder",
  "language": "en",
  "contentType": "text",
  "content": { "text": "Your appointment is tomorrow at {{time}}" },
  "isActive": true
}
```
**Response:** Created template object with `_id`  
**Use case:** Admin creates new template for an event

---

#### `PUT /api/whatsapp/templates/:id`
**Purpose:** Update an existing template  
**Request Body:** Same as POST  
**Response:** Updated template object  
**Use case:** Edit template text, media, or activation status

---

#### `DELETE /api/whatsapp/templates/:id`
**Purpose:** Delete a template  
**Response:** `{ "success": true }`  
**Use case:** Remove unused templates

---

### 3. Post-Care Journey Routes

Post-care journeys are multi-step automated message sequences sent after treatment completion.

#### `GET /api/whatsapp/journeys`
**Purpose:** List all post-care journey configurations  
**Response:**
```json
[
  {
    "_id": "ObjectId",
    "treatmentName": "Root Canal",
    "enabled": true,
    "messages": [
      {
        "id": "msg_1234567890",
        "delay": { "value": 1, "unit": "hours" },
        "languages": {
          "en": {
            "contentType": "text",
            "content": { "text": "Take care of your tooth..." }
          },
          "hi": { "contentType": "text", "content": { "text": "..." } }
        }
      }
    ],
    "createdAt": "2025-01-20T10:00:00Z"
  }
]
```
**Use case:** Load journeys for editing on WhatsAppPage

---

#### `GET /api/whatsapp/journeys/treatments`
**Purpose:** Get list of available treatments (from Services collection)  
**Response:**
```json
[
  { "name": "Root Canal", "category": "Endodontics" },
  { "name": "Filling", "category": "General" }
]
```
**Use case:** Populate treatment selector on Journey Editor

---

#### `POST /api/whatsapp/journeys`
**Purpose:** Create a new post-care journey  
**Request Body:**
```json
{
  "treatmentName": "Root Canal",
  "enabled": true,
  "messages": [
    {
      "id": "msg_1234567890",
      "delay": { "value": 1, "unit": "hours" },
      "languages": {
        "en": { "contentType": "text", "content": { "text": "..." } }
      }
    }
  ]
}
```
**Response:** Created journey object with `_id`  
**Use case:** Admin configures post-care messages for a treatment type

---

#### `PUT /api/whatsapp/journeys/:id`
**Purpose:** Update an existing journey  
**Request Body:** Same as POST  
**Response:** Updated journey object  
**Use case:** Edit journey steps, delays, or enable/disable

---

#### `DELETE /api/whatsapp/journeys/:id`
**Purpose:** Delete a journey  
**Response:** `{ "success": true }`  
**Use case:** Remove journey when treatment is no longer offered

---

### 4. Media Routes

#### `GET /api/whatsapp/media`
**Purpose:** List all uploaded media files  
**Response:**
```json
[
  {
    "_id": "ObjectId",
    "fileName": "tooth-care.png",
    "fileSize": 102400,
    "mimeType": "image/png",
    "cloudinaryUrl": "https://res.cloudinary.com/...",
    "uploadedAt": "2025-01-20T10:00:00Z"
  }
]
```
**Use case:** Show available media library in template editor

---

#### `POST /api/whatsapp/media`
**Purpose:** Upload media file (image, video, document)  
**Request:** Multipart form-data
- `file`: Binary file (required)

**Response:** Created media object with `_id` and `cloudinaryUrl`  
**Use case:** Upload image/video for use in templates

---

#### `DELETE /api/whatsapp/media/:id`
**Purpose:** Delete a media file  
**Response:** `{ "success": true }`  
**Use case:** Remove unused media

---

### 5. Logs Routes (Critical for Monitoring)

#### `GET /api/whatsapp/logs`
**Purpose:** Get all message logs with optional filtering  
**Query Params:**
- `event`: Filter by event type (e.g., `appointmentReminder`, `postCare`)
- `status`: Filter by status (`sent`, `scheduled`, `failed`)
- `dateFrom`: ISO date string (e.g., `2025-01-01`)
- `dateTo`: ISO date string (e.g., `2025-01-31`)

**Response:**
```json
[
  {
    "_id": "ObjectId",
    "patientId": { "first_name": "John", "last_name": "Doe" },
    "event": "postCare",
    "to": "+919876543210",
    "status": "scheduled",
    "payload": {
      "tenantId": "clinic123",
      "messageType": "postCare",
      "contentType": "text",
      "content": { "text": "..." },
      "scheduledAt": "2025-01-21T10:00:00Z"
    },
    "errorMessage": null,
    "sentAt": "2025-01-20T10:00:00Z"
  }
]
```
**Statuses:**
- `sent`: Message successfully sent to patient
- `scheduled`: Message queued in WAAPI, waiting for scheduled send time
- `failed`: Message failed to queue in WAAPI (check `errorMessage`)

**Use case:** Track all messages, see what's queued, monitor failures  
**Example query:** `/api/whatsapp/logs?status=scheduled` — see all pending messages

---

#### `GET /api/whatsapp/logs/scheduled`
**Purpose:** Get only messages with `status='scheduled'` (queued, not yet sent)  
**Response:** Same as `/logs` but filtered to scheduled only  
**Use case:** Dashboard widget showing "Messages Pending Send"

---

#### `GET /api/whatsapp/logs/summary`
**Purpose:** Get KPI counts for dashboard  
**Response:**
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
      "_id": "ObjectId",
      "patientId": { "first_name": "Jane", "last_name": "Smith" },
      "event": "appointmentReminder",
      "to": "+919876543210",
      "errorMessage": "Invalid phone number format",
      "sentAt": "2025-01-20T09:30:00Z"
    }
  ]
}
```
**Use case:** Dashboard KPI cards showing message statistics

---

### 6. Test Send Route

#### `POST /api/whatsapp/test-send`
**Purpose:** Send a test message immediately (not scheduled)  
**Request Body:**
```json
{
  "patientPhone": "+919876543210",
  "eventType": "appointmentReminder",
  "language": "en",
  "data": {
    "name": "John Doe",
    "time": "3:00 PM",
    "doctorName": "Dr. Smith"
  }
}
```
**Response:**
```json
{
  "payload": { "...": "..." },
  "waapiResponse": { "messageId": "..." },
  "status": "sent",
  "errorMessage": null
}
```
**Use case:** Test templates before enabling them for production

---

## Data Flow Explanation

### 1. Treatment Completion → Post-Care Journey

```
Patient Visit → Treatment marked "Completed"
    ↓
Visit Controller calls: triggerJourney(...)
    ↓
Services/whatsapp.service.js: triggerJourney()
    ↓
For each message in TreatmentJourney:
  - Calculate scheduledAt = now + delay
  - Build content with placeholders
  - Call sendToWAAPI(payload) with scheduledAt
  - Create WhatsAppLog with status="scheduled"
    ↓
WAAPI queue receives the message
    ↓
At scheduled time: WAAPI sends to patient
    ↓
(Future) Webhook from WAAPI updates log status to "sent"
```

### 2. Message Statuses Explained

| Status | Meaning | Next Step |
|--------|---------|-----------|
| `scheduled` | Message sent to WAAPI with `scheduledAt` timestamp; waiting to be sent at scheduled time | WAAPI sends it at the time, status updated via webhook |
| `sent` | Message successfully delivered to patient | No further action |
| `failed` | Message failed to queue in WAAPI (invalid phone, disabled event, etc.) | Check `errorMessage`, review template or settings |

---

## Example Usage Scenarios

### Scenario 1: Monitor Today's Pending Messages
```bash
GET /api/whatsapp/logs/scheduled
```
Returns all messages queued for later delivery today.

### Scenario 2: Check Why Messages Aren't Sending
```bash
GET /api/whatsapp/logs?status=failed&dateFrom=2025-01-20&dateTo=2025-01-21
```
See all messages that failed in the last 24 hours, check `errorMessage`.

### Scenario 3: Dashboard KPIs
```bash
GET /api/whatsapp/logs/summary
```
Show:
- Total sent: 245
- Currently pending: 18
- Recent failures: 3 (with details)

### Scenario 4: Verify Journey Configuration
```bash
GET /api/whatsapp/journeys
```
Admin sees all configured post-care journeys, confirms "Root Canal" has 3 steps.

---

## Common Issues & Debugging

### Issue: Logs showing empty or no messages
**Check:**
1. Is WhatsApp enabled globally? `GET /api/whatsapp/settings` → `enabled: true`
2. Is the specific event enabled? `settings.events.<eventType>.enabled: true`
3. Is there an active template? `GET /api/whatsapp/templates?event=<eventType>&language=en`
4. Check the service logs for errors: look for `[WhatsApp]` prefix

### Issue: Messages showing as "scheduled" but never sent
**Check:**
1. Is WAAPI_BASE_URL configured in `.env`?
2. Are patient phone numbers valid (+country code)?
3. Check `GET /api/whatsapp/logs` and look at `payload.scheduledAt` — is it a valid future time?

### Issue: "Connect Desk" not showing logs
**Check:**
1. Use `/api/whatsapp/logs/summary` to verify logs exist
2. Confirm `status` filters are not filtering out what you want to see
3. Check date range filters — try without `dateFrom`/`dateTo`
4. Look at browser console for CORS errors

---

## Environment Variables Required

```env
WAAPI_BASE_URL=https://waapi.your-domain.com
# Example: https://api.whatsapp-sender.com/api
```

Without this, all WhatsApp sends will fail silently (return null from buildMessage).

---

## Summary Table

| Endpoint | Method | Purpose | Status Tracking |
|----------|--------|---------|-----------------|
| `/settings` | GET/PUT | Global config | N/A |
| `/templates` | GET/POST/PUT/DELETE | Message templates | N/A |
| `/journeys` | GET/POST/PUT/DELETE | Post-care sequences | N/A |
| `/journeys/treatments` | GET | Available treatments | N/A |
| `/media` | GET/POST/DELETE | Media library | N/A |
| `/logs` | GET | All messages with filters | sent/scheduled/failed |
| `/logs/scheduled` | GET | Queued messages only | scheduled |
| `/logs/summary` | GET | Dashboard KPIs | counts by status |
| `/test-send` | POST | Test message | sent/failed |

