# Feedback Poll System — Final Architecture & Implementation

**Status:** ✅ **COMPLETE & READY FOR TESTING**  
**Date:** April 27, 2026

---

## Correct UI Architecture

All feedback configuration is done **in one place**: **WhatsAppPage → Messages Tab**

```
WhatsAppPage
└─ Messages Tab
   ├─ Appointment Events (existing)
   ├─ Feedback Poll (NEW)
   │  ├─ Configure Poll Question
   │  │  └─ "How satisfied are you with your treatment?"
   │  │     (with 5 fixed rating options: 5-Excellent to 1-Very Poor)
   │  │
   │  └─ Follow-up Messages (NEW)
   │     └─ Button: "Configure Follow-up Messages"
   │        └─ Modal: Configure 5 rating-specific messages
   │           ├─ Rating 5 (Excellent) → message
   │           ├─ Rating 4 (Good) → message
   │           ├─ Rating 3 (Neutral) → message
   │           ├─ Rating 2 (Poor) → message
   │           └─ Rating 1 (Very Poor) → message
   │
   └─ Post-Visit Messages (existing)
```

---

## Complete Message Flow

### 1. Setup (Tenant Configuration)

**In DMS WhatsAppPage → Messages Tab:**

a) **Configure Poll Question**
   - Click feedbackPoll event
   - Enter poll question: "How satisfied are you with your treatment?"
   - Rating options auto-filled: [5-Excellent, 4-Good, 3-Neutral, 2-Poor, 1-Very Poor]
   - Save → Stored in DMS WhatsAppTemplate

b) **Configure Follow-up Messages**
   - Click "Configure Follow-up Messages" button
   - Modal opens with 5 rating sections
   - For each rating:
     - Enable toggle
     - Message type selector (text, image, document, location)
     - Message content editor
     - Send delay configuration
   - Save → Stored in DMS FollowUpTemplate + Posted to WAAPI

### 2. Appointment Completion

```
User Action: Click "Conclude Appointment"
    ↓
DMS API: PATCH /api/appointments/:id/status { status: "Completed" }
    ↓
appointment.controller.js updateStatus()
    ├─ triggerWhatsApp('feedbackPoll', patientPhone, data)
    ├─ buildMessage() finds WhatsAppTemplate
    ├─ contentType: 'poll'
    ├─ content.values: ["5-Excellent", "4-Good", "3-Neutral", "2-Poor", "1-Very Poor"]
    └─ sendToWAAPI(payload)
    ↓
WAAPI Backend
    ├─ Queues message in BullMQ
    ├─ Worker sends via Baileys
    └─ Patient receives poll on WhatsApp
```

### 3. Patient Responds to Poll

```
Patient: Selects rating (e.g., "4-Good")
    ↓
WhatsApp: Sends pollResponseMessage to Baileys
    ├─ selectedOptions: [3] (index 3 = 4th option = "4-Good")
    ↓
WAAPI: poll.response.js event handler
    ├─ rating = selectedIndex + 1 (3 + 1 = 4)
    ├─ feedbackType = mapRating(4) → "good"
    ├─ Save PollResponse to WAAPI MongoDB
    ├─ Look up FollowUpTemplate in WAAPI for (tenantId, feedbackType)
    └─ If found & enabled: Queue follow-up message
       ├─ Use template.contentType and template.content
       ├─ Apply template.sendDelay
       └─ Worker sends to patient
```

---

## Database Models

### DMS: WhatsAppTemplate (Poll Question)
```javascript
{
  event: "feedbackPoll",
  language: "en" | "hi" | "mr",
  contentType: "poll",
  content: {
    name: "How satisfied are you with your treatment?",
    values: ["5-Excellent", "4-Good", "3-Neutral", "2-Poor", "1-Very Poor"],
    selectableCount: 1
  },
  isActive: true
}
```

### DMS: FollowUpTemplate (Follow-up Messages)
```javascript
{
  tenantId: "clinic-001",
  feedbackType: "excellent" | "good" | "neutral" | "poor" | "very_poor",
  rating: 5 | 4 | 3 | 2 | 1,
  contentType: "text" | "image" | "document" | "location",
  content: { /* varies by type */ },
  isEnabled: true,
  sendDelay: 0, // milliseconds
  createdAt: Date,
  updatedAt: Date
}
```

### WAAPI: FollowUpTemplate (Mirror of DMS)
```javascript
{
  tenantId: "clinic-001",
  feedbackType: "excellent",
  rating: 5,
  contentType: "text",
  content: { text: "Thank you for excellent feedback!" },
  isEnabled: true,
  sendDelay: 0,
  createdAt: Date
}
```

### WAAPI: PollResponse (Patient Responses)
```javascript
{
  tenantId: "clinic-001",
  messageId: "msg-123",
  from: "919876543210",
  pollQuestion: "How satisfied are you?",
  selectedIndex: 3,
  rating: 4,
  feedbackType: "good",
  createdAt: Date
}
```

---

## Frontend Components

### WhatsAppPage
- Main page with three tabs: Messages, Settings, Logs
- Messages tab shows:
  - Appointment events (existing)
  - **Feedback Poll** section with:
    - Poll question configuration (FeedbackPollEditor)
    - "Configure Follow-up Messages" button
  - Post-visit messages (existing)

### FeedbackPollEditor
- Configures poll question in multi-language
- Locked to contentType: 'poll'
- Fixed rating options: ["5-Excellent", "4-Good", "3-Neutral", "2-Poor", "1-Very Poor"]
- Saves to DMS WhatsAppTemplate

### FeedbackFollowUpEditor (NEW)
- Modal dialog for configuring 5 follow-up messages
- Left side: 5 rating buttons
- Right side: Message editor
  - Content type selector (text, image, document, location)
  - Message content editor
  - Enable toggle
  - Send delay input
- Save button: Saves to DMS + POSTs to WAAPI

---

## Backend Implementation

### Models
✅ **FollowUpTemplate.model.js** (DMS)
- tenantId + feedbackType unique index
- rating, contentType, content, isEnabled, sendDelay

### Controllers
✅ **feedback.controller.js** (DMS)
- getFollowUpTemplates() — List all
- createFollowUpTemplate() — Create/update (upsert)
- updateFollowUpTemplate() — Update by feedbackType
- deleteFollowUpTemplate() — Delete
- getPollResponses() — Query with filters
- getFeedbackStats() — Aggregated stats

### Routes
✅ **feedback.routes.js** (DMS)
```
GET    /api/feedback/templates
POST   /api/feedback/templates
GET    /api/feedback/templates/:feedbackType
PUT    /api/feedback/templates/:feedbackType
DELETE /api/feedback/templates/:feedbackType
GET    /api/feedback/responses
GET    /api/feedback/stats
```

### Integration
✅ **appointment.controller.js** — Sends poll on completion
✅ **whatsapp.service.js** — buildContent() handles poll type
✅ **index.js** — Feedback routes registered

---

## Frontend Implementation

### Files Changed
✅ **WhatsAppPage.jsx**
- Updated FeedbackPollEditor component
- Added FeedbackFollowUpEditor component (modal)
- Updated MessagesTab to show follow-up button
- Updated activeEditor logic to handle 'feedbackFollowUp'

✅ **App.jsx**
- Removed FeedbackPage import
- Removed /feedback route

✅ **NavigationLayout.jsx**
- Removed Feedback nav item

### Deleted
✅ **FeedbackPage.jsx** — No longer needed

---

## API Endpoints

### DMS Endpoints
```
GET    /api/feedback/templates              # List all follow-up templates
POST   /api/feedback/templates              # Create follow-up template
GET    /api/feedback/templates/:feedbackType # Get by rating
PUT    /api/feedback/templates/:feedbackType # Update by rating
DELETE /api/feedback/templates/:feedbackType # Delete by rating
GET    /api/feedback/responses              # Query poll responses
GET    /api/feedback/stats                  # Aggregated stats
```

### WAAPI Endpoints (DMS calls these)
```
POST /feedback/:tenantId/template/:feedbackType
  └─ Create/update follow-up template in WAAPI

GET /feedback/:tenantId/templates
  └─ Retrieve all templates

GET /feedback/:tenantId
  └─ Retrieve poll responses
```

---

## Testing Workflow

### 1. Configure Poll Question
```
WhatsAppPage → Messages Tab → feedbackPoll
├─ Enter poll question in EN, HI, MR
└─ Save
```

### 2. Configure Follow-up Messages
```
WhatsAppPage → Messages Tab → Feedback Poll → "Configure Follow-up Messages"
├─ For each rating (5, 4, 3, 2, 1):
│  ├─ Select rating
│  ├─ Enable toggle
│  ├─ Select content type (text)
│  ├─ Enter follow-up message
│  ├─ Set send delay (0 for immediate)
│  └─ Save
└─ All saved to DMS + Posted to WAAPI
```

### 3. Complete Appointment
```
Appointments → Select appointment → Start Visit
├─ Complete treatment
├─ Click "Conclude Appointment"
└─ Poll sent to WAAPI
```

### 4. Verify Poll Delivery
```
Check WAAPI logs for:
├─ [Messages] Poll queued
├─ [Worker] Poll sent
└─ Patient receives poll on WhatsApp
```

### 5. Simulate Patient Response
```
WAAPI: Simulate poll response
├─ selectedIndex: 3 (rating 4 = "Good")
└─ Follow-up message auto-sent to patient
```

### 6. Query Feedback
```
DMS: GET /api/feedback/responses
└─ See poll response stored in DMS
```

---

## Key Architectural Points

✅ **Single Point of Configuration** — WhatsAppPage Messages tab only  
✅ **DMS Storage** — Follow-up templates stored in DMS FollowUpTemplate  
✅ **WAAPI Sync** — When tenant saves, DMS POSTs to WAAPI  
✅ **Tenant Isolation** — Each clinic has their own templates  
✅ **Flexible Content** — Support text, image, document, location  
✅ **Configurable Timing** — sendDelay for delayed follow-ups  
✅ **Multi-language** — Poll question in EN, HI, MR  

---

## Files Summary

### Backend (DMS)
```
✅ dms_backend/models/FollowUpTemplate.model.js
✅ dms_backend/controllers/feedback.controller.js
✅ dms_backend/routes/feedback.routes.js
✅ dms_backend/controllers/appointment.controller.js (unchanged, uses triggerWhatsApp)
✅ dms_backend/services/whatsapp.service.js (buildContent exported)
✅ dms_backend/index.js (feedback routes registered)
```

### Frontend (DMS)
```
✅ frontend/src/pages/WhatsAppPage.jsx (updated)
✅ frontend/src/App.jsx (FeedbackPage route removed)
✅ frontend/src/components/NavigationLayout.jsx (Feedback item removed)
❌ frontend/src/pages/FeedbackPage.jsx (DELETED)
```

---

## Next Steps: WAAPI Integration

When patient responds to poll in WAAPI:

1. WAAPI poll.response.js calculates rating & feedbackType
2. WAAPI looks up FollowUpTemplate in its own DB (already synced from DMS)
3. WAAPI queues follow-up message
4. Worker sends message to patient

**No additional changes needed in DMS** — just ensure WAAPI has the templates (they're POSTed when tenant saves).

---

## Status: READY FOR TESTING ✅

All UI, models, and API endpoints are complete. System is ready to:
1. Configure feedback messages in WhatsAppPage
2. Send polls when appointments complete
3. Auto-send follow-ups when patients respond
4. Query feedback responses
