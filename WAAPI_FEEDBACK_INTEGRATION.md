# WAAPI ↔ DMS: Feedback Poll Message Integration

## Overview
DMS sends feedback poll messages to WAAPI, and WAAPI sends back poll responses (via webhooks) for tenant-isolated processing.

---

## 1. DMS → WAAPI: Send Feedback Poll

### Request Format
**Endpoint:** `POST {WAAPI_BASE_URL}/messages/send`

```json
{
  "tenantId": "clinic-a-001",
  "to": "918104489957",
  "message": "{\"name\":\"How satisfied are you with your treatment?\",\"values\":[\"5-Very Satisfied\",\"4-Satisfied\",\"3-Neutral\",\"2-Dissatisfied\",\"1-Very Dissatisfied\"]}",
  "messageType": "feedback",
  "scheduledAt": "2026-04-28T10:00:00.000Z"
}
```

### Key Fields

| Field | Type | Purpose |
|-------|------|---------|
| `tenantId` | String | **CRITICAL FOR ISOLATION** - Clinic ID, used to route responses back |
| `to` | String | Patient phone (E.164 format: +918104489957 or 918104489957) |
| `message` | JSON String | Poll question + options (always sent as stringified JSON) |
| `messageType` | String | Always "feedback" for poll messages |
| `scheduledAt` | ISO DateTime | Optional - when to send the poll |

### Message JSON Structure
```json
{
  "name": "How satisfied are you with your treatment?",
  "values": ["5-Very Satisfied", "4-Satisfied", "3-Neutral", "2-Dissatisfied", "1-Very Dissatisfied"]
}
```

- **name**: Poll question text
- **values**: Array of poll options (exactly 5 for rating scale, or 2-4 for custom)
- **Each option SHOULD include rating number** (e.g., "5-", "4-", etc.) for easy parsing

### What DMS Expects from WAAPI:
✅ **Acknowledge the message was queued**
```json
{
  "ok": true,
  "messageId": "msg_1234567890",
  "status": "queued",
  "scheduledFor": "2026-04-28T10:00:00.000Z"
}
```

✅ **Store the message with these fields:**
- `messageId` - Unique ID for tracking
- `tenantId` - For routing poll responses back
- `to` - Patient phone
- `question` - The poll question
- `options` - The poll options array
- `messageType` - "feedback"
- `sentAt` / `scheduledAt` - When sent

---

## 2. WAAPI → DMS: Poll Response Webhook

### Webhook Setup
DMS expects WAAPI to POST poll responses to:
```
POST http://localhost:5000/api/whatsapp/feedback/webhook
```

### Payload Format
When patient selects an option on the poll, WAAPI sends:

```json
{
  "tenantId": "clinic-a-001",
  "from": "918104489957",
  "messageId": "msg_1234567890",
  "messageType": "pollResponseMessage",
  "selectedOption": "4-Satisfied",
  "selectedIndex": 1,
  "pollQuestion": "How satisfied are you with your treatment?",
  "timestamp": "2026-04-28T10:15:30.000Z"
}
```

### Key Fields

| Field | Type | Purpose |
|-------|------|---------|
| `tenantId` | String | **CRITICAL** - Must match the tenantId from original poll message |
| `from` | String | Patient phone who responded |
| `messageId` | String | Links response back to original poll message |
| `messageType` | String | Always "pollResponseMessage" |
| `selectedOption` | String | The option patient selected (e.g., "4-Satisfied") |
| `selectedIndex` | Number | 0-based index (0 = first option) |
| `pollQuestion` | String | Echo of original question |
| `timestamp` | ISO DateTime | When response was received |

### DMS Webhook Handler Expectations

**Location:** `dms_backend/controllers/whatsapp.controller.js` → new function `handlePollResponse`

```javascript
POST /api/whatsapp/feedback/webhook
{
  const { tenantId, from, messageId, selectedOption, selectedIndex, pollQuestion, timestamp } = req.body;
  
  // 1. Validate tenantId (security check)
  // 2. Find original message using messageId + tenantId
  // 3. Extract rating from selectedOption (parse "4-Satisfied" → 4)
  // 4. Create PollResponse document:
  //    {
  //      tenantId,
  //      messageId,
  //      from,
  //      rating: 4,
  //      feedbackType: "good", // based on rating
  //      selectedOption,
  //      pollQuestion,
  //      respondedAt: timestamp,
  //      createdAt: now
  //    }
  // 5. Log to WhatsAppLog
  // 6. Return 200 OK
  
  return { ok: true, stored: true };
}
```

---

## 3. Data Flow: Tenant Isolation

```
Step 1: Send Poll
┌──────────────────────────────────┐
│ DMS (Clinic A)                   │
│ POST /messages/send              │
│ { tenantId: "clinic-a-001", ... }
└────────────┬──────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ WAAPI                            │
│ Store Message:                   │
│ { messageId, tenantId: A, ... }  │
│ Send to patient's WhatsApp       │
└──────────────────────────────────┘

Step 2: Patient Responds
┌──────────────────────────────────┐
│ WhatsApp                         │
│ Patient taps "4-Satisfied"       │
└────────────┬──────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ WAAPI                            │
│ Receives pollResponseMessage     │
│ Looks up messageId → gets tenantId
└────────────┬──────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ WAAPI Webhook                    │
│ POST /api/whatsapp/feedback/hook │
│ { tenantId: "clinic-a-001", ... }
└────────────┬──────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ DMS                              │
│ Store PollResponse:              │
│ { tenantId: "clinic-a-001", ... }
│ Create WhatsAppLog entry         │
└──────────────────────────────────┘

Step 3: Query Feedback (Isolated)
┌──────────────────────────────────┐
│ DMS - Clinic A Query             │
│ GET /feedback/clinic-a-001       │
│ WHERE tenantId = "clinic-a-001"  │
│ Result: Only Clinic A responses  │
└──────────────────────────────────┘

                   AND

┌──────────────────────────────────┐
│ DMS - Clinic B Query             │
│ GET /feedback/clinic-b-002       │
│ WHERE tenantId = "clinic-b-002"  │
│ Result: Only Clinic B responses  │
└──────────────────────────────────┘
```

---

## 4. Rating Parsing & Categorization

### How DMS Parses Rating from `selectedOption`

```javascript
const option = "4-Satisfied";  // What WAAPI sends
const rating = parseInt(option.split('-')[0]); // Extract: 4

// Map rating to feedback type
const feedbackTypeMap = {
  5: 'excellent',
  4: 'good',
  3: 'neutral',
  2: 'poor',
  1: 'very_poor'
};

const feedbackType = feedbackTypeMap[rating]; // 'good'
```

### Database Storage
```javascript
// PollResponse collection
{
  _id: ObjectId,
  tenantId: "clinic-a-001",          // ← ISOLATION KEY
  messageId: "msg_1234567890",       // Link to original
  from: "918104489957",              // Patient phone
  rating: 4,                         // 1-5 numeric
  feedbackType: "good",              // excellent/good/neutral/poor/very_poor
  selectedOption: "4-Satisfied",     // Original text
  pollQuestion: "How satisfied...",
  respondedAt: "2026-04-28T10:15:30Z",
  createdAt: "2026-04-28T10:15:30Z",
  updatedAt: "2026-04-28T10:15:30Z"
}
```

---

## 5. Conditional Follow-up Messages

### Setup (DMS → DMS Local Storage)
Doctor configures follow-up messages for each rating:

```javascript
POST /feedback/followup-templates
{
  patientId: "patient-123",
  tenantId: "clinic-a-001",
  followUpMessages: {
    5: { 
      message: "Thank you! Would you review us on Google Maps: {{googleMapsUrl}}", 
      enabled: true 
    },
    4: { 
      message: "Thank you! Any suggestions to improve?", 
      enabled: true 
    },
    3: { 
      message: "We appreciate your feedback. What can we improve?", 
      enabled: true 
    },
    2: { 
      message: "We're sorry. Can we schedule a follow-up?", 
      enabled: true 
    },
    1: { 
      message: "We sincerely apologize. Please tell us what went wrong.", 
      enabled: true 
    }
  }
}
```

### Auto-Send (When Response Arrives)
When poll response webhook arrives:

```javascript
// 1. Parse rating from selectedOption
const rating = 4; // from "4-Satisfied"

// 2. Look up template for this patient + rating
const template = await FollowUpTemplate.findOne({ 
  patientId, 
  tenantId,
  rating,
  enabled: true 
});

// 3. If template exists, send follow-up
if (template && template.message) {
  await triggerWhatsApp(
    tenantModels,
    tenantId,
    WAAPI_BASE_URL,
    'followUpFeedback',
    patientPhone,
    { ...data, rating, feedbackType },
    patientId,
    language
  );
}
```

---

## 6. Complete Message Lifecycle Example

### Timeline
```
10:00 AM (Day 1)
├─ DMS sends poll: "How satisfied are you?"
│  └─ Options: [5-Very Satisfied, 4-Satisfied, 3-Neutral, 2-Dissatisfied, 1-Very Dissatisfied]
│  └─ WAAPI queues and sends to patient
│
10:15 AM
├─ Patient receives poll on WhatsApp
├─ Patient taps: "4-Satisfied" ✓
│
10:15:30 AM
├─ WAAPI receives pollResponseMessage
├─ WAAPI sends webhook: POST /feedback/webhook
│  └─ { tenantId, from, messageId, selectedOption: "4-Satisfied", ... }
│
10:16 AM
├─ DMS receives webhook
├─ Parses rating: 4
├─ Creates PollResponse document
├─ Looks up follow-up template for rating 4
├─ Sends auto-follow-up: "Thank you! Any suggestions to improve?"
│
10:16:30 AM
├─ WAAPI receives follow-up message request
├─ Sends to patient's WhatsApp
└─ Stores in Message collection with tenantId
```

---

## 7. DMS API Endpoints (What DMS Will Expose)

### Send Poll
```
POST /api/whatsapp/feedback/send
{
  patientId: "patient-123",
  question: "How satisfied are you?",
  options: ["5-Very Satisfied", "4-Satisfied", "3-Neutral", "2-Dissatisfied", "1-Very Dissatisfied"],
  scheduledAt: "2026-04-28T10:00:00Z"
}
Response: { ok: true, messageId, status: "scheduled" }
```

### Receive Poll Response (Webhook)
```
POST /api/whatsapp/feedback/webhook
{
  tenantId, from, messageId, selectedOption, timestamp
}
Response: { ok: true, stored: true }
```

### Get Feedback (Tenant-Isolated)
```
GET /api/whatsapp/feedback?feedbackType=good&dateFrom=2026-04-01
Response: {
  ok: true,
  count: 42,
  data: [
    {
      _id, tenantId, from, rating, feedbackType, 
      respondedAt, createdAt
    }
  ]
}
```

### Send Follow-up
```
POST /api/whatsapp/feedback/:tenantId/:phone/respond
{
  message: "Thank you for your feedback!",
  messageType: "feedback"
}
Response: { ok: true, queued: true }
```

---

## 8. Error Handling

### If Webhook Fails
```javascript
// DMS retries webhook delivery
// Max 3 retries with exponential backoff
// If all retries fail, response is stored as "manual_review_needed"
```

### If tenantId Mismatch
```javascript
// SECURITY: Reject webhook if:
// 1. tenantId not found in Message collection
// 2. from doesn't match patient phone in original message
// 3. messageId is invalid

// Response:
{
  ok: false,
  error: "tenantId mismatch or invalid messageId"
}
```

---

## Summary: What WAAPI Must Do

| Step | Action | Data to Send |
|------|--------|--------------|
| 1 | Receive `POST /messages/send` | Acknowledge with messageId, store message |
| 2 | Send poll to WhatsApp | Standard poll format |
| 3 | Receive poll response from WhatsApp | pollResponseMessage from patient |
| 4 | **Send webhook** `POST /feedback/webhook` | **tenantId, from, messageId, selectedOption, timestamp** |
| 5 | Receive follow-up message request | Standard message format |
| 6 | Send follow-up to WhatsApp | Message delivery |

**CRITICAL:** Every webhook MUST include `tenantId` for proper isolation!
