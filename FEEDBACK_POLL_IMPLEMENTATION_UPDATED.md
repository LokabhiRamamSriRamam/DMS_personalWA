# Feedback Poll Implementation — Updated (v2)

## Overview

**Feedback polls are now fully integrated as a first-class WhatsApp message type**, configured and triggered exactly like other automated messages:

- ✅ **Configured in WhatsApp → Messages tab** alongside other messages (Appointment Booked, Appointment Completed, etc.)
- ✅ **Multi-language support** (English, Hindi, Marathi) with per-language configuration
- ✅ **Enable/disable toggle** to control whether polls are sent
- ✅ **Auto-triggered** when appointment status is marked as "Completed"
- ✅ **Conditional follow-up messages** stored per patient, auto-sent based on 1-5 rating

---

## Data Flow

### 1. Admin Configuration (WhatsApp Page)

```
Admin enables "Feedback Poll" event
    ↓
Settings.events.feedbackPoll.enabled = true
    ↓
Admin configures poll question in each language:
  - English: "How satisfied are you with your treatment?"
  - Hindi: [similar translation]
  - Marathi: [similar translation]
    ↓
Settings stored in database
```

### 2. Doctor Patient Management (Treatment Page)

```
Doctor clicks "📊 Send Feedback Poll" button
    ↓
FeedbackPollModal opens
    ↓
Doctor configures follow-up messages for each rating (1-5):
  - 5⭐: "Thank you! Would you leave us a review?"
  - 4⭐: "Thanks! What could we improve?"
  - 3⭐: "How can we serve you better?"
  - 2⭐: "We apologize. Can we help?"
  - 1⭐: "We sincerely apologize. Please tell us what went wrong."
    ↓
Backend stores FollowUpTemplate for this patient
    ↓
Modal closes
```

### 3. Appointment Completion (Automatic)

```
Doctor marks appointment as "Completed"
    ↓
Backend updateStatus() is called
    ↓
1. Send appointmentCompleted message
2. Send feedbackPoll message (if enabled)
3. Trigger post-care journeys per treatment
    ↓
Patient receives poll via WhatsApp
```

### 4. Patient Response (Automatic Follow-up)

```
Patient receives poll on WhatsApp
    ↓
Patient taps one rating (e.g., "4-Satisfied")
    ↓
WAAPI receives pollResponseMessage
    ↓
WAAPI sends webhook to DMS at:
  POST /api/whatsapp/feedback/webhook
  {
    tenantId, from, messageId, 
    selectedOption: "4-Satisfied",
    timestamp
  }
    ↓
DMS webhook handler:
  - Parses rating (4)
  - Creates PollResponse document
  - Looks up FollowUpTemplate for this patient
  - If enabled for rating 4:
    - Queues follow-up: "Thanks! What could we improve?"
    - WAAPI sends it to patient
```

---

## Files Changed

### Frontend

#### 1. **frontend/src/pages/WhatsAppPage.jsx**

**Added:**
- `feedbackPoll` event to EVENTS array with `isFeedback: true` flag
- `teal` color scheme to COLOR_MAP
- `FeedbackPollEditor` component (replaces simple config with full TemplateEditor-like interface)
- Feedback Poll section in MessagesTab (between Appointment and Post-Visit Message sections)
- Editor routing: `activeEvent.isFeedback ? FeedbackPollEditor : ...`

**Changes:**
```javascript
// Line 22: Added to EVENTS
{ key: 'feedbackPoll', label: 'Feedback Poll', 
  description: 'Send rating poll (1-5) with conditional follow-ups',
  icon: 'poll', color: 'teal', variables: ['name', 'firstName'], 
  isFeedback: true }

// Line 39: Added teal to COLOR_MAP
teal: { card: 'bg-teal-50...', icon: 'text-teal-600...', ... }

// FeedbackPollEditor: 
// - Enable/disable toggle with delay (minutes)
// - Language tabs for multi-language config
// - LangEditor component for message editing per language
// - Info box explaining how polls trigger when appointment completes
```

#### 2. **frontend/src/modals/FeedbackPollModal.jsx**

**Simplified from 2-step to 1-step:**
- Removed "poll question scheduling" step (now configured in WhatsApp settings)
- Kept "follow-up message configuration" step
- Single button: "Save Follow-up Messages"
- Clear messaging: Poll is auto-sent when appointment completes

**Changes:**
```javascript
// Removed state: pollQuestion, scheduledDate, scheduledTime, step
// Removed handleSendPoll function
// Renamed handleSendFollowUps to handleSaveFollowUps
// Updated modal title: "Configure Follow-up Messages"
// Updated info box to explain: "Poll auto-sent when appointment completes"
```

### Backend

#### 1. **dms_backend/controllers/appointment.controller.js**

**Updated updateStatus() function:**

Added feedback poll trigger when appointment is marked as "Completed":

```javascript
// Line 150: Added after appointmentCompleted message
triggerWhatsApp(
  req.tenantModels,
  req.user.tenantId,
  process.env.WAAPI_BASE_URL,
  'feedbackPoll',
  patient.contact.mobile,
  baseData,
  patient._id.toString(),
  appt.whatsapp_language || null
);
```

**Execution order when appointment completed:**
1. appointmentCompleted message
2. feedbackPoll message (if enabled)
3. Post-care journeys (per treatment)

---

## User Workflows

### Workflow 1: Clinic Admin Setup

**Location:** WhatsApp → Messages tab

```
1. See "Feedback Poll" section (teal color)
2. Click EventCard to expand FeedbackPollEditor
3. Toggle "Enable feedback polls" ON
4. Set delay (optional): "5 min" before sending poll
5. Configure poll question per language:
   - Click English flag
   - Configure message in LangEditor
   - Message can include variables: {{name}}, {{firstName}}
   - Message can use WhatsApp formatting: *bold*, _italic_, etc.
6. Repeat for Hindi, Marathi
7. Changes auto-save to database
```

**Result:** When any appointment is completed, feedback poll automatically sends

### Workflow 2: Doctor Patient Personalization

**Location:** Treatment Page → Conclude Appointment → Send Feedback Poll

```
1. Doctor marks appointment as "Completed"
   (If feedback polls enabled, poll is auto-queued)

2. Doctor opens "📊 Send Feedback Poll" modal
3. Modal shows patient details
4. For each rating (1-5⭐):
   - Enable/disable checkbox
   - Configure custom follow-up message
   - Example placeholders in modal
5. Save Follow-up Messages
6. FollowUpTemplate stored for this patient
```

**Result:** When patient responds to poll, the configured follow-up is auto-sent

### Workflow 3: Patient Rating & Auto Follow-up

**Location:** Patient's WhatsApp

```
1. Patient receives poll:
   "How satisfied are you with your treatment?"
   [5-Very Satisfied] [4-Satisfied] [3-Neutral] [2-Dissatisfied] [1-Very Dissatisfied]

2. Patient taps "4-Satisfied"

3. WAAPI receives response, sends webhook to DMS

4. DMS webhook handler:
   - Stores PollResponse (rating=4, feedbackType=good)
   - Looks up FollowUpTemplate for this patient
   - Finds: rating 4 is enabled with message "Thanks! What could we improve?"
   - Queues follow-up via WAAPI
   
5. Patient receives follow-up in WhatsApp
```

---

## Message Configuration (WhatsApp Settings)

### Enable/Disable

**Toggle in FeedbackPollEditor:**
- ON: Poll automatically sends when appointments completed
- OFF: No polls sent (even if doctor configures follow-ups)

### Delay Configuration

**Input field:** Set minutes to delay before sending poll
- Default: 0 (immediate)
- Example: 5 minutes after appointment completion

### Language-Specific Content

**Poll Question:**
```
English: "How satisfied are you with your treatment?"
Hindi: "आप अपने उपचार से कितने संतुष्ट हैं?"
Marathi: "आपण आपल्या उपचारांवर किती संतुष्ट आहात?"
```

**Supported Formatting:**
- *bold text*
- _italic text_
- ~strikethrough~
- `monospace`
- New lines
- Emojis

**Available Variables:**
- {{name}} — Full name
- {{firstName}} — First name only

---

## Follow-up Message Configuration (Treatment Page)

### Per-Patient Setup

**When doctor sends poll:**
- Configure custom follow-up for each rating
- Each rating has: checkbox (enable/disable) + message textarea

### Rating-Specific Messages

| Rating | Label | Default Scenario |
|--------|-------|-------------------|
| 5⭐ | Very Satisfied | Request review, referral, testimonial |
| 4⭐ | Satisfied | Thank them, ask for improvements |
| 3⭐ | Neutral | Gather feedback, offer improvements |
| 2⭐ | Dissatisfied | Apologize, offer follow-up, resolve issue |
| 1⭐ | Very Dissatisfied | Urgent apology, immediate action offer |

### Message Rules

- **Optional:** Only enabled follow-ups are sent
- **Conditional:** Only the matched rating's follow-up is sent
- **Automatic:** Sent immediately when patient responds
- **Scoped:** Per-patient basis (each patient can have different follow-ups)

---

## Comparison: Old vs New

| Aspect | Old Implementation | New Implementation |
|--------|-------------------|-------------------|
| **Configuration** | Only in Treatment page modal | WhatsApp Messages tab (like other messages) |
| **Scheduling** | Manual scheduling per patient | Automatic when appointment completed |
| **Multi-language** | Not supported | Fully supported (EN, HI, MR) |
| **Enable/Disable** | Always on (if doctor opens modal) | Toggle in WhatsApp settings |
| **Template Reuse** | Only per-patient configs | Can reuse templates across patients |
| **Timing** | Custom schedule per patient | Clinic-wide delay setting |
| **Follow-ups** | Stored per patient | Stored per patient (no change) |

---

## Technical Details

### Backend Flow

1. **Admin saves settings:**
   ```
   PUT /api/whatsapp/settings
   { events: { feedbackPoll: { enabled: true, delayMinutes: 5 } } }
   ```

2. **Doctor saves follow-ups:**
   ```
   POST /api/whatsapp/feedback/followup-templates
   { patientId: "...", followUpMessages: { 1: {...}, 2: {...}, ... } }
   ```

3. **Appointment completion trigger:**
   ```
   PATCH /api/appointments/:id/status
   { status: "Completed" }
   
   → Calls triggerWhatsApp(..., 'feedbackPoll', ...)
   → Uses template from settings (multi-language)
   → WAAPI queues message
   ```

4. **Webhook response:**
   ```
   POST /api/whatsapp/feedback/webhook
   { tenantId, from, messageId, selectedOption: "4-Satisfied", ... }
   
   → Creates PollResponse
   → Looks up FollowUpTemplate
   → Calls triggerWhatsApp(..., 'followUpFeedback', ...)
   ```

### Database

**Templates Collection:**
- Stored per event, language, tenant
- Can include multi-language variants

**FollowUpTemplate Collection:**
- `tenantId`, `patientId`, `followUpMessages` object
- Upsertable (one per patient per clinic)

**PollResponse Collection:**
- `tenantId`, `messageId`, `from`, `rating`, `feedbackType`
- Tenant-isolated queries

---

## Testing Checklist

**Admin Setup:**
- [ ] Navigate to WhatsApp → Messages tab
- [ ] Find "Feedback Poll" section
- [ ] Click to open FeedbackPollEditor
- [ ] Enable toggle, set delay to 5 min
- [ ] Configure poll question in each language
- [ ] Verify changes save to database
- [ ] Toggle OFF, verify setting persists

**Doctor Usage:**
- [ ] Complete an appointment
- [ ] Verify poll is queued automatically
- [ ] Open "Send Feedback Poll" modal
- [ ] Configure follow-up messages for 2-3 ratings
- [ ] Save, verify FollowUpTemplate created

**Patient Flow:**
- [ ] Verify poll message arrives on WhatsApp
- [ ] Respond with rating
- [ ] Verify follow-up message arrives automatically
- [ ] Test with different ratings, verify correct follow-up sent

**Tenant Isolation:**
- [ ] Clinic A enables polls, Clinic B disables
- [ ] Clinic A gets polls, Clinic B doesn't
- [ ] Clinic A sees only their follow-ups
- [ ] Verify webhooks route to correct clinic

---

## Summary

The feedback poll system is now a **first-class message type** in the DMS:

✅ Configured like other messages (WhatsApp tab, multi-language, enable/disable)  
✅ Auto-triggered on appointment completion (not manual)  
✅ Conditional follow-ups per patient  
✅ Tenant-isolated throughout  
✅ Webhook-driven response handling  
✅ Clean separation: admin config vs doctor personalization
