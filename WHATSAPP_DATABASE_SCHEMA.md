# WhatsApp Database Schema: Complete Structure

## Overview

Your DMS has 5 main WhatsApp-related collections in MongoDB for managing scheduled messages.

---

## 1. WhatsAppLog Collection

**Purpose:** Stores every message that is sent, queued, or failed

**Location:** `dms_backend/models/WhatsAppLog.model.js`

### Schema Definition

```javascript
{
  patientId: ObjectId,           // Reference to Patient collection
  event: String,                 // 'appointmentReminder', 'invoiceGenerated', etc.
  to: String,                    // Phone number: '+918104489957'
  payload: Mixed,                // Complete WAAPI payload sent
  status: String,                // 'sent' | 'failed' | 'scheduled'
  errorMessage: String,          // Error details if status='failed'
  sentAt: Date,                  // Timestamp when logged (not when sent)
  createdAt: Date,               // MongoDB timestamp
  updatedAt: Date                // MongoDB timestamp
}
```

### Example Document: Scheduled Message

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "patientId": "507f1f77bcf86cd799439012",
  "event": "appointmentReminder",
  "to": "+918104489957",
  "status": "scheduled",
  "payload": {
    "tenantId": "clinic-001",
    "to": "+918104489957",
    "messageType": "appointmentReminder",
    "contentType": "text",
    "content": {
      "text": "Your appointment is in 24 hours at 2:58 AM with Dr. DD Sharma"
    },
    "scheduledAt": "2026-04-26T02:58:00.000Z"
  },
  "errorMessage": null,
  "sentAt": "2026-04-25T02:58:00.000Z",
  "createdAt": "2026-04-25T02:58:00.000Z",
  "updatedAt": "2026-04-25T02:58:00.000Z"
}
```

### Example Document: Sent Message

```json
{
  "_id": "507f1f77bcf86cd799439014",
  "patientId": "507f1f77bcf86cd799439012",
  "event": "appointmentBooked",
  "to": "+918104489957",
  "status": "sent",
  "payload": {
    "tenantId": "clinic-001",
    "to": "+918104489957",
    "messageType": "appointmentBooked",
    "contentType": "text",
    "content": {
      "text": "Appointment booked with Dr. DD Sharma on 27/4/2026 at 2:58 AM"
    },
    "scheduledAt": null
  },
  "errorMessage": null,
  "sentAt": "2026-04-25T02:58:00.000Z",
  "createdAt": "2026-04-25T02:58:00.000Z",
  "updatedAt": "2026-04-25T02:58:00.000Z"
}
```

### Example Document: Failed Message

```json
{
  "_id": "507f1f77bcf86cd799439015",
  "patientId": "507f1f77bcf86cd799439012",
  "event": "invoiceGenerated",
  "to": "8104489957",
  "status": "failed",
  "payload": {
    "tenantId": "clinic-001",
    "to": "8104489957",
    "messageType": "invoiceGenerated",
    "contentType": "text",
    "content": { "text": "Your invoice is ready" },
    "scheduledAt": "2026-04-25T15:30:00.000Z"
  },
  "errorMessage": "Invalid phone number format. Expected E.164 format (+country code)",
  "sentAt": "2026-04-25T02:58:00.000Z",
  "createdAt": "2026-04-25T02:58:00.000Z",
  "updatedAt": "2026-04-25T02:58:00.000Z"
}
```

### Indexes

```javascript
// For fast queries by patient
{ patientId: 1, sentAt: -1 }

// For fast queries by event type
{ event: 1, sentAt: -1 }
```

### Key Fields Explained

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `patientId` | ObjectId | Identify which patient | Links to Patient collection |
| `event` | String | Type of message | 'appointmentReminder', 'invoiceGenerated' |
| `to` | String | Phone number | '+918104489957' |
| `status` | String | Current state | 'sent', 'scheduled', 'failed' |
| `payload.scheduledAt` | ISO8601 | **WHEN TO SEND** | '2026-04-26T02:58:00.000Z' |
| `sentAt` | Date | When logged (not when sent) | NOW (when message queued) |

---

## 2. WhatsAppTemplate Collection

**Purpose:** Stores message templates for each event type and language

**Location:** `dms_backend/models/WhatsAppTemplate.model.js`

### Schema Definition

```javascript
{
  event: String,              // 'appointmentReminder', 'invoiceGenerated', etc.
  language: String,           // 'en' | 'hi' | 'mr'
  contentType: String,        // 'text' | 'image' | 'video' | 'document' | 'audio'
  content: Mixed,             // Flexible based on contentType
  isActive: Boolean,          // true = use this template
  createdAt: Date,
  updatedAt: Date
}
```

### Example Documents

**Text Template:**
```json
{
  "_id": "507f...",
  "event": "appointmentReminder",
  "language": "en",
  "contentType": "text",
  "content": {
    "text": "Hi {{firstName}},\nYour appointment with Dr. {{doctorName}} is on {{date}} at {{time}}."
  },
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

**Image Template with Caption:**
```json
{
  "_id": "507f...",
  "event": "invoiceGenerated",
  "language": "en",
  "contentType": "image",
  "content": {
    "url": "https://res.cloudinary.com/.../invoice-template.png",
    "caption": "Invoice {{invoiceId}} for {{name}}\nTotal: {{amount}}",
    "mimetype": "image/png",
    "width": 800,
    "height": 600,
    "viewOnce": false
  },
  "isActive": true
}
```

### Content Type Structures

**text:**
```javascript
{ text: "Your message here with {{variables}}" }
```

**image/video:**
```javascript
{
  url: "https://...",
  caption: "Optional caption",
  mimetype: "image/jpeg" | "video/mp4",
  width: 800,
  height: 600,
  viewOnce: false
}
```

**document:**
```javascript
{
  url: "https://...",
  mimetype: "application/pdf",
  fileName: "invoice.pdf",
  caption: "Your invoice"
}
```

### Indexes

```javascript
// Fast lookup by event, language, and active status
{ event: 1, language: 1, isActive: 1 }
```

---

## 3. WhatsAppSettings Collection

**Purpose:** Stores global and per-event configuration for message scheduling

**Location:** `dms_backend/models/WhatsAppSettings.model.js`

### Schema Definition

```javascript
{
  enabled: Boolean,           // Master switch for all WhatsApp
  defaultLanguage: String,    // 'en' | 'hi' | 'mr'
  fallbackLanguage: String,   // 'en' | 'hi' | 'mr'
  events: {
    appointmentBooked: {
      enabled: Boolean,
      delayMinutes: Number
    },
    appointmentReminder: {
      enabled: Boolean,
      hoursBeforeAppointment: Number
    },
    // ... other events
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Complete Example Document

```json
{
  "_id": "507f1f77bcf86cd799439020",
  "enabled": true,
  "defaultLanguage": "en",
  "fallbackLanguage": "en",
  "events": {
    "appointmentBooked": {
      "enabled": true,
      "delayMinutes": 0
    },
    "appointmentReminder": {
      "enabled": true,
      "hoursBeforeAppointment": 24
    },
    "appointmentRescheduled": {
      "enabled": true,
      "delayMinutes": 0
    },
    "appointmentCancelled": {
      "enabled": true,
      "delayMinutes": 0
    },
    "appointmentCompleted": {
      "enabled": true,
      "delayMinutes": 0
    },
    "treatmentScheduled": {
      "enabled": false,
      "delayMinutes": 0
    },
    "invoiceGenerated": {
      "enabled": true,
      "delayMinutes": 30
    },
    "invoiceAndPrescription": {
      "enabled": false,
      "delayMinutes": 0
    },
    "prescriptionIssued": {
      "enabled": true,
      "delayMinutes": 0
    },
    "postCare": {
      "enabled": true,
      "delayMinutes": 0
    }
  },
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-04-25T10:30:00.000Z"
}
```

### Settings Interpretation

```javascript
// Read by backend to calculate scheduledAt:

appointmentReminder: hoursBeforeAppointment = 24
  → scheduledAt = appointmentTime - 24 hours

appointmentBooked: delayMinutes = 0
  → scheduledAt = null (immediate)

invoiceGenerated: delayMinutes = 30
  → scheduledAt = now + 30 minutes

postCare: delayMinutes = 0 (but uses journey steps instead)
  → scheduledAt = (per step delay)
```

---

## 4. TreatmentJourney Collection

**Purpose:** Stores multi-step post-care message sequences for each treatment

**Location:** `dms_backend/models/TreatmentJourney.model.js`

### Schema Definition

```javascript
{
  treatmentName: String,      // 'Root Canal', 'Filling', etc.
  enabled: Boolean,           // true = active journey
  messages: [
    {
      id: String,             // 'msg_1234567890'
      delay: {
        value: Number,        // 1, 24, 48, etc.
        unit: String          // 'minutes' | 'hours' | 'days'
      },
      languages: {
        en: {
          contentType: String, // 'text', 'image', etc.
          content: Mixed      // Template content
        },
        hi: { ... },
        mr: { ... }
      }
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Complete Example Document

```json
{
  "_id": "507f1f77bcf86cd799439030",
  "treatmentName": "Root Canal",
  "enabled": true,
  "messages": [
    {
      "id": "msg_1704067200000",
      "delay": {
        "value": 1,
        "unit": "hours"
      },
      "languages": {
        "en": {
          "contentType": "text",
          "content": {
            "text": "Hi {{firstName}},\n\nTake rest for today. Avoid hard foods.\n\nDr. {{doctorName}}"
          }
        },
        "hi": {
          "contentType": "text",
          "content": {
            "text": "नमस्ते {{firstName}},\n\nआज आराम करें। कठोर खाना न खाएं।\n\nडॉ. {{doctorName}}"
          }
        },
        "mr": {
          "contentType": "text",
          "content": {
            "text": "नमस्कार {{firstName}},\n\nआज विश्रांती घ्या। कठीण पदार्थ खाऊ नका।\n\nडॉ. {{doctorName}}"
          }
        }
      }
    },
    {
      "id": "msg_1704153600000",
      "delay": {
        "value": 24,
        "unit": "hours"
      },
      "languages": {
        "en": {
          "contentType": "text",
          "content": {
            "text": "Hi {{firstName}},\n\nHow are you feeling? Any pain? Contact us if needed.\n\nDr. {{doctorName}}"
          }
        },
        "hi": { "contentType": "text", "content": { "text": "..." } },
        "mr": { "contentType": "text", "content": { "text": "..." } }
      }
    },
    {
      "id": "msg_1704240000000",
      "delay": {
        "value": 48,
        "unit": "hours"
      },
      "languages": {
        "en": {
          "contentType": "text",
          "content": {
            "text": "Hi {{firstName}},\n\nCome back in 1 week for follow-up.\nBook appointment: {{appointmentLink}}\n\nDr. {{doctorName}}"
          }
        },
        "hi": { "contentType": "text", "content": { "text": "..." } },
        "mr": { "contentType": "text", "content": { "text": "..." } }
      }
    }
  ],
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-04-25T14:30:00.000Z"
}
```

### Journey Timing Calculation

When treatment is completed at: **2026-04-25 10:00 AM**

```javascript
Step 1: delay = { value: 1, unit: 'hours' }
  → scheduledAt = 2026-04-25 11:00 AM (10:00 + 1 hour)

Step 2: delay = { value: 24, unit: 'hours' }
  → scheduledAt = 2026-04-26 10:00 AM (10:00 + 24 hours)

Step 3: delay = { value: 48, unit: 'hours' }
  → scheduledAt = 2026-04-27 10:00 AM (10:00 + 48 hours)
```

### Indexes

```javascript
// Fast lookup by treatment name
{ treatmentName: 1 }
```

---

## 5. WhatsAppMedia Collection

**Purpose:** Stores uploaded media files for use in templates

**Location:** `dms_backend/models/WhatsAppMedia.model.js`

### Schema Definition

```javascript
{
  publicId: String,           // Cloudinary public_id
  url: String,                // Cloudinary secure_url
  type: String,               // 'image' | 'video' | 'audio' | 'document'
  mimeType: String,           // 'image/jpeg', 'video/mp4', etc.
  fileName: String,           // Original filename
  fileSize: Number,           // Size in bytes
  tags: [String],             // For categorization
  uploadedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439040",
  "publicId": "dms/whatsapp-media/root-canal-care-instructions",
  "url": "https://res.cloudinary.com/dcpya36yc/image/upload/v1704067200/dms/whatsapp-media/root-canal-care-instructions.png",
  "type": "image",
  "mimeType": "image/png",
  "fileName": "root-canal-care-instructions.png",
  "fileSize": 245632,
  "tags": ["root-canal", "post-care", "instructions"],
  "uploadedAt": "2026-01-15T10:00:00.000Z",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

---

## Complete Data Flow: From Event to WAAPI Queue

```
USER EVENT TRIGGERS (e.g., Treatment Completed)
        ↓
BACKEND CALCULATES TIMING:
  ├─ Fetch WhatsAppSettings
  ├─ Read event.delayMinutes or journey step delays
  ├─ Calculate: scheduledAt = eventTime + delay
  └─ Result: scheduledAt = "2026-04-25T11:00:00.000Z"
        ↓
CREATE WAAPI PAYLOAD:
  {
    tenantId: "clinic-001",
    to: "+918104489957",
    messageType: "postCare",
    message: "Hi John, take rest for 24 hours",
    scheduledAt: "2026-04-25T11:00:00.000Z",
    idempotencyKey: "postCare-TREAT-Root Canal-step1-..."
  }
        ↓
SEND TO WAAPI ENDPOINT
        ↓
WAAPI RESPONSE:
  {
    ok: true,
    messageId: "msg_507f1f77bcf86cd799439013",
    status: "queued"
  }
        ↓
LOG IN WHATSAPP LOG COLLECTION:
  {
    patientId: ObjectId,
    event: "postCare",
    to: "+918104489957",
    status: "scheduled",
    payload: { ... complete payload above ... },
    sentAt: "2026-04-25T10:00:00.000Z"
  }
        ↓
STORED IN MONGODB (WhatsAppLog)
        ↓
AT SCHEDULED TIME (2026-04-25 11:00 AM):
  WAAPI sends message to patient
        ↓
STATUS UPDATED:
  log.status = "sent"
  (via webhook from WAAPI or polling)
```

---

## Query Examples

### Get All Scheduled Messages

```javascript
db.whatsapplogs.find({ status: "scheduled" })
  .populate('patientId', 'first_name last_name')
  .sort({ 'payload.scheduledAt': 1 })
```

### Get Messages Scheduled for Specific Date

```javascript
const startDate = new Date('2026-04-27T00:00:00Z');
const endDate = new Date('2026-04-27T23:59:59Z');

db.whatsapplogs.find({
  status: "scheduled",
  'payload.scheduledAt': {
    $gte: startDate,
    $lte: endDate
  }
})
```

### Get Messages by Event Type

```javascript
db.whatsapplogs.find({
  event: "postCare",
  status: "scheduled"
}).count()
```

### Get Failed Messages with Error Reasons

```javascript
db.whatsapplogs.find({
  status: "failed"
}).project({
  to: 1,
  event: 1,
  errorMessage: 1,
  sentAt: 1
})
```

### Get Journey Configuration for Treatment

```javascript
db.treatmentjourneys.findOne({
  treatmentName: "Root Canal"
})
```

---

## Summary Table

| Collection | Purpose | Key Field | Used For |
|------------|---------|-----------|----------|
| **WhatsAppLog** | Message audit trail | `status` | Tracking sent/scheduled/failed |
| **WhatsAppTemplate** | Message templates | `event` | Building message content |
| **WhatsAppSettings** | Global configuration | `events[].delayMinutes` | Calculating scheduledAt |
| **TreatmentJourney** | Post-care sequences | `messages[].delay` | Multi-step journeys |
| **WhatsAppMedia** | Media library | `url` | Images/videos in templates |

---

## Important Notes

1. **scheduledAt in Payload:** This is the KEY field
   - Stored in `WhatsAppLog.payload.scheduledAt`
   - null = send immediately
   - ISO8601 date = queue until that time

2. **sentAt vs scheduledAt:**
   - `sentAt` = when the log entry was created (NOW)
   - `payload.scheduledAt` = when WAAPI should send it (FUTURE)

3. **Status Values:**
   - `scheduled` = queued, waiting to be sent
   - `sent` = successfully sent to patient
   - `failed` = couldn't queue in WAAPI

4. **Idempotency:** Messages are keyed by:
   - Event type
   - Object ID (appointment, invoice, etc.)
   - Tenant ID
   - Pattern: `{type}-{objectId}-{tenantId}`

