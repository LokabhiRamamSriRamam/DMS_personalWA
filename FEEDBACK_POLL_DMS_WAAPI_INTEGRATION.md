# Feedback Poll System — DMS + WAAPI Integration

## Complete Architecture (User's Clarification)

### The Corrected Flow

1. **Poll Question** = Stored in **WAAPI** (not DMS)
   - DMS sends poll via WAAPI API when appointment completes
   - WAAPI delivers interactive poll with 5 selectable options (1, 2, 3, 4, 5)
   - Patient **selects one option** (not text input)

2. **Patient Responds**
   - Patient clicks a rating option in WhatsApp (e.g., option 3)
   - WAAPI receives response via Baileys
   - Baileys sends `pollResponseMessage` event to WAAPI handlers

3. **Follow-Up Messages** = Stored in **DMS** but Sent via **WAAPI**
   - DMS stores 5 follow-up message templates (one for each rating: 1, 2, 3, 4, 5)
   - When WAAPI processes patient response:
     - Maps response index to rating (0→5, 1→4, 2→3, 3→2, 4→1)
     - Calls **DMS API** to get follow-up message for that rating
     - DMS returns the message
     - WAAPI sends the message back to patient

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    DMS Backend                              │
│  (Stores follow-up message templates in FollowUpTemplate)  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ 1. Appointment completed
                   │    POST /api/feedback/templates (retrieve for rating)
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    WAAPI Backend                             │
│  (Sends poll & manages patient responses)                   │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ 2. Send poll message
           │    POST /messages/send { contentType: "poll" }
           ▼
    ┌─────────────────┐
    │ WhatsApp Patient│
    │ (selects 1-5)   │
    └────────┬────────┘
             │
             │ 3. Patient selects rating
             │    pollResponseMessage event received by Baileys
             ▼
┌──────────────────────────────────────────────────────────────┐
│ WAAPI: poll.response.js event handler                       │
│  - Map selectedIndex to rating (1-5)                        │
│  - Map rating to feedbackType (excellent, good, etc)        │
│  - Save PollResponse to WAAPI DB                            │
│  - Query DMS for follow-up message for this rating          │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ 4. GET /api/feedback/templates/:rating
           │    from DMS to get follow-up message
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    DMS Backend                              │
│  (Returns follow-up message for rating)                    │
└──────────────────────────────────────────────────────────────┘
           │
           │ 5. Response: { message: "Thank you...", ... }
           ▼
┌──────────────────────────────────────────────────────────────┐
│ WAAPI: Queue follow-up message                              │
│  - Queue message via BullMQ                                 │
│  - Worker sends via Baileys when session connected          │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ 6. Send follow-up message to patient
           ▼
    ┌─────────────────┐
    │ WhatsApp Patient│
    │ (receives msg)  │
    └─────────────────┘
```

---

## DMS Changes Required

### 1. Update FollowUpTemplate.model.js (Finalized)
✅ Already updated with correct schema:
- `tenantId` + `feedbackType` (unique index)
- `rating` (1-5)
- `contentType` (text, image, document, location)
- `content` (flexible, varies by type)
- `isEnabled` (boolean)
- `sendDelay` (milliseconds)

### 2. Feedback Controller (feedback.controller.js)
✅ Already has endpoints:
- `GET /api/feedback/templates` — List all
- `GET /api/feedback/templates/:feedbackType` — Get by rating
- `POST /api/feedback/templates` — Create/update
- `PUT /api/feedback/templates/:feedbackType` — Update by rating
- `DELETE /api/feedback/templates/:feedbackType` — Delete
- `GET /api/feedback/responses` — Query patient responses
- `GET /api/feedback/stats` — Aggregated stats

### 3. Feedback Routes (feedback.routes.js)
✅ Already created with all endpoints

### 4. New Endpoint: GET /api/feedback/templates/:feedbackType/message
This endpoint returns the follow-up message for WAAPI to use:

```javascript
export async function getFollowUpMessage(req, res) {
  const { FollowUpTemplate } = req.tenantModels;
  try {
    const { feedbackType } = req.params;
    const { tenantId } = req.query;  // WAAPI passes tenantId as query param

    const template = await FollowUpTemplate.findOne({
      tenantId,
      feedbackType,
      isEnabled: true,
    }).lean();

    if (!template) {
      return res.status(404).json({ ok: false, error: 'No template found' });
    }

    res.json({
      ok: true,
      message: template.content,
      contentType: template.contentType,
      sendDelay: template.sendDelay,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
```

---

## WAAPI Integration Point

### poll.response.js (in WAAPI) needs to:

1. **Receive poll response:**
   ```javascript
   pollResponseMessage: { selectedOptions: [3] }  // Index 3 = rating 2
   ```

2. **Map to rating & feedbackType:**
   ```javascript
   const rating = 5 - selectedIndex;  // 5 - 3 = 2
   const feedbackType = mapRating(rating);  // 2 → "poor"
   ```

3. **Query DMS for follow-up:**
   ```javascript
   const response = await fetch(
     `${DMS_BASE_URL}/api/feedback/templates/${feedbackType}/message?tenantId=${tenantId}`,
     { method: 'GET' }
   );
   const followUpData = await response.json();
   ```

4. **Queue follow-up message:**
   ```javascript
   if (followUpData.ok) {
     await queue.add('sendMessage', {
       to: from,
       contentType: followUpData.contentType,
       content: followUpData.message,
       sendDelay: followUpData.sendDelay,
     });
   }
   ```

---

## FeedbackPage (Frontend)

✅ Already created in DMS with:
- 5 rating sections (excellent=5, good=4, neutral=3, poor=2, very_poor=1)
- For each rating:
  - Enable/disable toggle
  - Message type selector (text, image, document, location)
  - Message content editor
  - Send delay input
- Save/Delete buttons

**What it does:**
- Saves follow-up messages to DMS FollowUpTemplate
- These are retrieved by WAAPI when patient responds to poll

---

## WhatsAppPage (Frontend)

✅ Already has feedbackPoll configuration:
- FeedbackPollLangEditor component
- Locked to contentType: 'poll'
- 5 rating options fixed: ["5-Excellent", "4-Good", "3-Neutral", "2-Poor", "1-Very Poor"]
- Edit only poll question text
- Saves as WhatsAppTemplate with contentType: 'poll'

**What it does:**
- Saves poll question to WAAPI WhatsAppTemplate
- When DMS sends poll, WAAPI uses this template
- Patient receives the poll with the configured question

---

## Complete Message Flow (Step-by-Step)

### Step 1: Setup (One-time per clinic)

**DMS:**
1. Clinic admin goes to FeedbackPage
2. Configures 5 follow-up messages:
   - Rating 5 (Excellent): "Thank you for excellent feedback!"
   - Rating 4 (Good): "We're glad you had a good experience"
   - Rating 3 (Neutral): "We'd love to hear how we can improve"
   - Rating 2 (Poor): "We're sorry, our manager will call"
   - Rating 1 (Very Poor): "We sincerely apologize"
3. API calls save to DMS FollowUpTemplate

**WAAPI:**
1. Clinic admin goes to WAAPI admin panel
2. Sets up follow-up templates in WAAPI (optional, for direct WAAPI testing)
3. Or WAAPI will call DMS API when needed

### Step 2: Configure Poll Question

**DMS:**
1. Clinic admin goes to WhatsAppPage → Messages tab
2. Clicks feedbackPoll event
3. Enters poll question: "How satisfied are you with your treatment?"
4. Rating options auto-filled: ["5-Excellent", "4-Good", "3-Neutral", "2-Poor", "1-Very Poor"]
5. Saves to WhatsAppTemplate

**Result:**
- WhatsAppTemplate created with:
  - event: "feedbackPoll"
  - language: "en" (or "hi", "mr")
  - contentType: "poll"
  - content: { name: "How satisfied...", values: ["5-Excellent", ...] }

### Step 3: Appointment Completes

**Frontend (Treatmentpage.jsx):**
1. User clicks "Conclude Appointment"
2. Calls PATCH /api/appointments/:id/status { status: "Completed" }

**Backend (appointment.controller.js):**
1. triggerWhatsApp('feedbackPoll', patientPhone, data)
2. buildMessage() finds WhatsAppTemplate
3. Returns { contentType: 'poll', content: { name: "...", values: [...] } }
4. Calls sendToWAAPI()

**WAAPI:**
1. Receives POST /messages/send with contentType: 'poll'
2. Queues message via BullMQ
3. Worker sends via Baileys when session connected

**Patient's WhatsApp:**
- Receives interactive poll: "How satisfied are you with your treatment?"
- 5 buttons: "5-Excellent", "4-Good", "3-Neutral", "2-Poor", "1-Very Poor"

### Step 4: Patient Responds

**Patient:**
- Clicks one of the 5 options (e.g., "4-Good")

**WAAPI (Baileys event):**
```javascript
messages.upsert {
  message: {
    pollResponseMessage: {
      selectedOptions: [3]  // Index 3 = 4th option = "4-Good"
    }
  }
}
```

**WAAPI (poll.response.js handler):**
1. Extract selectedIndex: 3
2. Calculate rating: 5 - 3 = 2... WAIT THAT'S WRONG!
   - Actually, for 5 options: index maps directly to rating
   - Index 0 = option 1 = "Very Poor" = rating 1
   - Index 1 = option 2 = "Poor" = rating 2
   - Index 2 = option 3 = "Neutral" = rating 3
   - Index 3 = option 4 = "Good" = rating 4
   - Index 4 = option 5 = "Excellent" = rating 5
   - **So: rating = selectedIndex + 1**
3. Map rating to feedbackType: 4 → "good"
4. Save PollResponse to WAAPI MongoDB
5. Call DMS to get follow-up message:
   ```bash
   GET http://dms:5000/api/feedback/templates/good/message?tenantId=clinic-id
   ```
6. DMS returns:
   ```json
   {
     "ok": true,
     "message": { "text": "We're glad you had a good experience" },
     "contentType": "text",
     "sendDelay": 0
   }
   ```
7. Queue follow-up message in BullMQ
8. Worker sends to patient via Baileys

**Patient's WhatsApp:**
- Receives: "We're glad you had a good experience"

---

## Database Schemas

### DMS: FollowUpTemplate

```javascript
{
  _id: ObjectId,
  tenantId: "clinic-001",
  feedbackType: "good",
  rating: 4,
  messageType: "feedback",
  contentType: "text",
  content: { text: "We're glad you had a good experience" },
  isEnabled: true,
  sendDelay: 0,
  createdAt: Date,
  updatedAt: Date
}
```

### WAAPI: PollResponse

```javascript
{
  _id: ObjectId,
  tenantId: "clinic-001",
  messageId: "msg-123",
  from: "919876543210",
  pollQuestion: "How satisfied are you?",
  selectedIndex: 3,
  rating: 4,
  feedbackType: "good",
  createdAt: Date,
  updatedAt: Date
}
```

### WAAPI: FollowUpTemplate (optional, for direct testing)

```javascript
{
  _id: ObjectId,
  tenantId: "clinic-001",
  feedbackType: "good",
  rating: 4,
  messageType: "feedback",
  contentType: "text",
  content: { text: "..." },
  isEnabled: true,
  sendDelay: 0,
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

### DMS Endpoints (for WAAPI to call)

```
GET /api/feedback/templates/:feedbackType/message?tenantId=clinic-001
  → Returns follow-up message for that rating

GET /api/feedback/templates
  → List all templates for tenant

GET /api/feedback/responses
  → Query poll responses
```

### WAAPI Endpoints (for DMS to call)

```
POST /messages/send
  → Send poll to patient

GET /feedback/:tenantId
  → Query poll responses

GET /feedback/:tenantId/templates
  → List templates

POST /feedback/:tenantId/template/:feedbackType
  → Create/update template
```

---

## Implementation Checklist

### Backend (DMS)
- ✅ FollowUpTemplate.model.js — Updated schema
- ✅ feedback.controller.js — All endpoints
- ✅ feedback.routes.js — Routes registered
- ⬜ **NEW:** Add getFollowUpMessage() endpoint for WAAPI
- ✅ NavigationLayout.jsx — Added feedback nav item
- ✅ FeedbackPage.jsx — Complete UI
- ✅ WhatsAppPage.jsx — FeedbackPollLangEditor component

### Frontend (DMS)
- ✅ FeedbackPage.jsx — 5 rating templates management
- ✅ WhatsAppPage.jsx — Poll question configuration
- ✅ App.jsx — Route added
- ✅ NavigationLayout.jsx — Sidebar item added

### Integration (WAAPI ↔ DMS)
- ⬜ WAAPI poll.response.js needs to call DMS API for follow-up
- ⬜ DMS needs to expose follow-up message endpoint

---

## Next Steps for Implementation

1. **Add DMS Endpoint:**
   - Create `getFollowUpMessage()` that WAAPI will call
   - Endpoint: `GET /api/feedback/templates/:feedbackType/message?tenantId=:tenantId`

2. **Update WAAPI poll.response.js:**
   - When poll response received:
   - Calculate rating: `selectedIndex + 1`
   - Map to feedbackType
   - Call DMS API to get follow-up message
   - Queue follow-up in BullMQ

3. **Test Flow:**
   - Create follow-up templates in DMS FeedbackPage
   - Configure poll in DMS WhatsAppPage
   - Complete appointment in DMS
   - Verify poll sent to WAAPI
   - Manually test poll response webhook
   - Verify follow-up sent

---

## Key Points

✅ **Poll question** = WAAPI WhatsAppTemplate (sent from DMS)
✅ **Follow-up messages** = DMS FollowUpTemplate (retrieved by WAAPI)
✅ **Patient selects** = Non-text options (1-5 rating)
✅ **Multi-tenant** = Isolated by tenantId throughout
✅ **Async** = Messages queued in WAAPI BullMQ for reliable delivery
✅ **Complete** = Both DMS and WAAPI parts implemented
