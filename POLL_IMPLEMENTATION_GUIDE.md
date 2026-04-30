# Feedback Poll System - Complete Implementation Guide

## Overview

A completely independent feedback poll system has been implemented that allows administrators to create 1-5 rating polls and send them automatically to patients after appointment completion.

---

## Architecture

### Separation of Concerns

Two **independent messaging types**:

1. **feedbackMessage** — Traditional text/image/video feedback
   - Uses `WhatsAppTemplate` model
   - Configured per language
   - Managed in "Messages" tab → "Feedback Message" card

2. **feedbackPoll** — 1-5 rating poll surveys
   - Uses `PollTemplate` model
   - Single question with mandatory 5 options
   - Managed in "Poll Templates" tab

**Both can be active simultaneously with different delays.**

---

## Database Schema

### PollTemplate Collection

```javascript
{
  _id: ObjectId,
  tenantId: String,
  name: String,                    // Poll question
  options: [                       // Exactly 5 options
    "1 - Very Unhappy",
    "2 - Unhappy", 
    "3 - Neutral",
    "4 - Happy",
    "5 - Very Happy"
  ],
  sendDelayMinutes: 15,            // Minutes after appointment
  isActive: true,
  messageType: "feedbackMessage",
  contentType: "poll",
  createdAt: Date,
  updatedAt: Date
}
```

### WhatsAppSettings - feedbackPoll Config

```javascript
events: {
  feedbackPoll: {
    enabled: Boolean,
    delayMinutes: Number,
    pollTemplateId: String         // Reference to PollTemplate._id
  }
}
```

---

## API Endpoints

### Poll Template CRUD

Base: `/api/feedback/poll-templates`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List all templates |
| POST | `/` | Create template |
| GET | `/:id` | Get single template |
| PUT | `/:id` | Update template |
| DELETE | `/:id` | Delete template |

---

## Frontend UI Flow

### 1. Create Poll Template

**Path:** WhatsApp → Poll Templates tab → New Poll Template

**Form:**
- Poll Question (required)
- 5 Options (must start with "1 -" through "5 -")
- Send Delay (minutes, default 15)
- Active toggle (default on)
- Live preview showing to patients

### 2. Configure in Settings

**Path:** WhatsApp → Messages → Feedback Poll card → Configure

**Fields:**
- Enable toggle
- Template dropdown (active templates only)
- Delay input (overrides template default)

### 3. Manage Templates

**Path:** WhatsApp → Poll Templates tab

**Features:**
- List all templates
- Edit/Delete buttons
- Active/Inactive status
- Preview options

---

## How It Works End-to-End

### Setup (Admin)

```
1. Create poll template
   "How satisfied were you with treatment?"
   Options: 1-5 rating scale
   Delay: 30 minutes after completion

2. Enable feedback poll in settings
   Select template
   Set delay
   Toggle ON
```

### Execution (Auto)

```
1. Appointment marked "Completed"
2. System triggers feedbackPoll event
3. Fetches selected PollTemplate
4. Builds poll message with question + options
5. Calculates scheduledAt = now + 30 minutes
6. Queues to BullMQ worker
7. Worker sends to WAHA at scheduled time
8. Patient receives poll on WhatsApp
9. Patient votes (1-5)
10. WAHA webhook to middleware
11. Middleware sends auto-reply based on rating
```

---

## Implementation Checklist

Backend:
- [x] PollTemplate model with 1-5 validation
- [x] Updated WhatsAppSettings with feedbackPoll config
- [x] Poll template CRUD endpoints
- [x] buildMessage() handles feedbackPoll event type
- [x] Appointment completion triggers feedbackPoll

Frontend:
- [x] Poll Templates tab in WhatsApp page
- [x] PollTemplateModal component
- [x] PollTemplateList component  
- [x] PollTemplateSelector component
- [x] FeedbackPollConfigEditor (simplified, no template editor)

Integration:
- [x] Settings.events.feedbackPoll stored separately
- [x] Both feedbackMessage and feedbackPoll can be active
- [x] Messages queued via BullMQ with scheduledAt
- [x] Proper error handling and logging

---

## Key Files Modified

**Backend:**
- `dms_backend/models/PollTemplate.model.js` (NEW)
- `dms_backend/models/WhatsAppSettings.model.js`
- `dms_backend/config/tenantModels.js`
- `dms_backend/routes/feedback.routes.js`
- `dms_backend/controllers/feedback.controller.js`
- `dms_backend/services/whatsapp.service.js`
- `dms_backend/controllers/appointment.controller.js`

**Frontend:**
- `frontend/src/pages/WhatsAppPage.jsx`
- `frontend/src/components/PollTemplateModal.jsx` (NEW)
- `frontend/src/components/PollTemplateList.jsx` (NEW)
- `frontend/src/components/PollTemplateSelector.jsx` (NEW)

---

## Testing

### Manual Test Flow

1. **Backend Running:** `nodemon server.js` ✅
2. **Frontend Running:** `npm run dev` ✅
3. **Create Template:**
   - Go to WhatsApp → Poll Templates
   - Click "New Poll Template"
   - Fill form with valid 1-5 options
   - Click Save
4. **Enable Poll:**
   - Go to Messages → Feedback Poll
   - Enable toggle
   - Select created template
   - Set delay (15 min default)
5. **Test Appointment:**
   - Create appointment
   - Mark as Completed
   - Check backend logs for poll queuing
   - Verify BullMQ has scheduled job

---

## Quick Reference

**Valid Poll Option Format:**
```
["1 - Very Unhappy", "2 - Unhappy", "3 - Neutral", "4 - Happy", "5 - Very Happy"]
```

**Invalid (will be rejected):**
```
["Very Unhappy", "Unhappy", ...]           // Missing "1 -", etc
["1 - A", "2 - B", "3 - C"]                // Only 3 options
["1 - Very Happy", "1 - Unhappy", ...]     // Both start with "1 -"
```

---

## Status

✅ **Production Ready**

All components implemented, integrated, and tested.
System ready for deployment.
