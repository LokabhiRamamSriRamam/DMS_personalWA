# Feedback System - Simplified Implementation

**Status:** Updated - Ready for Testing
**Date:** April 28, 2026

---

## Changes Made

### 1. Frontend (WhatsAppPage.jsx)

✅ **Commented out:**
- Interactive feedback poll UI from Messages tab
- FeedbackFollowUpEditor modal
- All feedback poll configuration sections

✅ **Updated:**
- Changed `feedbackPoll` event to `feedbackMessage` event
- `feedbackMessage` now appears as regular message in Appointment events section
- Removed `isFeedback` flag (treated like other events)
- Removed special rendering logic for feedback events

### 2. Backend (appointment.controller.js)

✅ **Updated:**
- Changed trigger from `'feedbackPoll'` to `'feedbackMessage'`
- Message is now scheduled using standard `delayMinutes` setting
- Works with regular WhatsAppTemplate configuration

### 3. Backend (WhatsAppTemplate.model.js)

✅ **Updated:**
- Changed event enum from `'feedbackPoll'` to `'feedbackMessage'`
- Now supports regular text, image, document, location message types
- Integrated into standard message scheduling system

---

## How It Now Works

### Configuration

**In WhatsAppPage → Messages → Appointment section:**

```
1. Go to "Feedback Message" card
2. Toggle enabled/disabled
3. Set delay in minutes (can be 0 for immediate)
4. Click to edit message templates
5. Configure message in EN, HI, MR languages
6. Save (like any other message)
```

### At Appointment Completion

```
When doctor clicks "Conclude Appointment":

1. DMS triggers all scheduled messages:
   - appointmentCompleted (immediate)
   - feedbackMessage (after X hours as configured)
   - postCare journeys (after X hours per treatment)

2. All messages scheduled with scheduledAt timestamp

3. WAAPI queues them via BullMQ

4. Worker sends at scheduled time
```

### Message Scheduling Logic

```javascript
// From buildMessage in whatsapp.service.js

if (eventType === 'appointmentReminder') {
  // Schedule X hours BEFORE appointment
  fireAt = appointmentStartTime - (hoursBeforeAppointment * 60 * 60 * 1000)
} else if (eventConfig.delayMinutes > 0) {
  // Schedule X minutes AFTER now
  fireAt = now + (delayMinutes * 60 * 1000)
}

payload.scheduledAt = fireAt.toISOString()
```

---

## Configuration UI

### Simple and Consistent

```
Messages Tab
├── Appointment Events
│   ├── Appointment Booked
│   ├── Appointment Reminder
│   ├── Appointment Rescheduled
│   ├── Appointment Completed
│   └── Feedback Message  ← NEW (simple, like others)
├── Post-Visit Message (mutex group)
└── Post-Care Journey
```

Each message shows:
- Toggle enable/disable
- Delay input (in minutes)
- Configure button to edit templates

---

## Invoice & Prescription Structure Verification

### ✅ Invoice Model - Ready for WhatsApp

**Fields available:**
- `invoice_id` — Unique invoice number (INV-2025-001)
- `patient_name` — Patient name
- `patient_phone` — WhatsApp number
- `items[]` — Line items with name, quantity, rate, total
- `subtotal` — Subtotal amount
- `tax` — Tax amount
- `total_amount` — Total invoice amount
- `paid_amount` — Amount paid
- `pending_amount` — Amount pending
- `payment_method` — How patient paid
- `status` — Draft, Pending, Paid, Overdue, Cancelled
- `date` — Invoice date

**WhatsApp template variables available:**
```
{{invoiceId}}       → invoice_id
{{amount}}          → total_amount (formatted as ₹)
{{paidAmount}}      → paid_amount (formatted as ₹)
{{pendingAmount}}   → pending_amount (formatted as ₹)
{{paymentMethod}}   → payment_method
{{date}}            → formatted date
```

**Example message template:**
```
Hi {{firstName}},

Your invoice {{invoiceId}} has been generated.

Total Amount: {{amount}}
Paid: {{paidAmount}}
Pending: {{pendingAmount}}

Payment Method: {{paymentMethod}}

Please pay within 7 days.

Thank you!
```

### ✅ Prescription Model - Ready for WhatsApp

**Fields available (from Visit.prescriptions[]):**
- `drug_name` — Medicine name
- `dosage` — Dosage strength (e.g., "500mg")
- `duration` — Duration (e.g., "5 days")
- `instructions` — Special instructions (e.g., "Take after meals")

**WhatsApp template variables available:**
```
{{drug}}            → drug_name
{{dosage}}          → dosage
{{duration}}        → duration
{{instructions}}    → instructions
```

**Example message template:**
```
Hi {{firstName}},

Your prescription from {{date}}:

💊 {{drug}} {{dosage}}
   Duration: {{duration}}
   Instructions: {{instructions}}

Take medicines as prescribed. If symptoms persist, contact us.

Thank you!
```

### ✅ Combined Invoice + Prescription Message

**Example template:**
```
Hi {{firstName}},

Your visit on {{date}} with {{doctorName}} is complete.

📄 Invoice: {{invoiceId}}
   Total: {{amount}}
   Paid: {{paidAmount}}
   Pending: {{pendingAmount}}

💊 Prescription:
   {{drug}} {{dosage}} - {{duration}}
   {{instructions}}

Please pay within 7 days.
Questions? Contact us.
```

---

## Data Flow: Appointment Completion

```
┌─────────────────────────────────────────────────────────┐
│ Doctor: Clicks "Conclude Appointment"                   │
└──────────────────────┬──────────────────────────────────┘
                       │
PATCH /api/appointments/:id/status { status: "Completed" }
                       │
                       ├─ 1. appointmentCompleted (immediate)
                       │    "Your appointment on {{date}} with {{doctorName}} is complete"
                       │
                       ├─ 2. feedbackMessage (after {{delayMinutes}})
                       │    "How satisfied are you with your treatment?"
                       │    (configurable - can be text, image, etc)
                       │
                       ├─ 3. postCareJourney (after treatment-specific delays)
                       │    "Post-care instructions for {{treatment}}"
                       │
                       └─ 4. invoiceGenerated OR invoiceAndPrescription
                            (only if invoice was created)
                            "Your invoice {{invoiceId}} for ₹{{amount}}"

All messages:
- Built with correct template
- Scheduled with scheduledAt timestamp
- Sent to WAAPI
- Queued in BullMQ
- Delivered when scheduled time reaches
```

---

## Testing Checklist

### UI Verification

- [ ] WhatsAppPage loads without errors
- [ ] Messages tab shows "Feedback Message" in Appointment events
- [ ] Feedback Message toggle works
- [ ] Delay input accepts minutes (0-1440)
- [ ] Configure button opens template editor
- [ ] Save/Load messages work

### Configuration

- [ ] Create feedback message in English
- [ ] Set delay to 0 (immediate)
- [ ] Set delay to 60 (1 hour)
- [ ] Save message
- [ ] Verify WhatsAppTemplate created in DB

### Appointment Flow

- [ ] Create appointment
- [ ] Start visit
- [ ] Complete treatment
- [ ] Click "Conclude Appointment"
- [ ] Check logs for messages queued
- [ ] Verify scheduledAt timestamps

### Message Delivery

- [ ] appointmentCompleted sent immediately
- [ ] feedbackMessage sent after delay
- [ ] Both appear in WhatsAppLog
- [ ] Correct template data substituted

### Invoice + Prescription

- [ ] Create invoice after visit
- [ ] Generate prescription
- [ ] Verify variables available: {{invoiceId}}, {{amount}}, {{drug}}, etc.
- [ ] Test sending invoice message
- [ ] Test sending prescription message
- [ ] Test combined invoice+prescription message

---

## API Endpoints (Unchanged)

All WhatsApp endpoints work with feedbackMessage:

```
GET    /api/whatsapp/templates              # Get all templates
POST   /api/whatsapp/templates              # Create template
PUT    /api/whatsapp/templates/:id          # Update template
DELETE /api/whatsapp/templates/:id          # Delete template

GET    /api/whatsapp/settings               # Get WhatsApp settings
PUT    /api/whatsapp/settings               # Update settings (enable/delay)
```

---

## Database Changes

### Migration

```javascript
// Remove feedbackPoll events
db.whatsapptemplates.deleteMany({ event: 'feedbackPoll' })

// No need to update WhatsAppSettings — existing delayMinutes will be used

// Clean up FollowUpTemplates (no longer used)
db.followuptemplates.deleteMany({})
```

### New feedbackMessage Template

```javascript
db.whatsapptemplates.insertMany([
  {
    event: "feedbackMessage",
    language: "en",
    contentType: "text",
    content: {
      text: "Hi {{firstName}},\n\nHow satisfied are you with your treatment?\n\nYour feedback helps us improve.\n\nThank you!"
    },
    isActive: true
  },
  {
    event: "feedbackMessage",
    language: "hi",
    contentType: "text",
    content: {
      text: "नमस्ते {{firstName}},\n\nआपकी उपचार से संतुष्टि कैसी है?\n\nआपकी प्रतिक्रिया हमें बेहतर बनने में मदद करती है।\n\nधन्यवाद!"
    },
    isActive: true
  },
  {
    event: "feedbackMessage",
    language: "mr",
    contentType: "text",
    content: {
      text: "नमस्कार {{firstName}},\n\nआपल्या उपचारशी आप संतुष्ट आहात का?\n\nआपली अभिप्राय आम्हाला सुधारण्यास मदत करते.\n\nधन्यवाद!"
    },
    isActive: true
  }
])
```

---

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Feedback Type** | Interactive 1-5 poll | Simple text message |
| **Configuration** | Special "Feedback Poll" section | Regular "Feedback Message" event |
| **Scheduling** | Immediate only | Can delay X hours |
| **Message Types** | Poll only | Text, image, document, location |
| **UI Complexity** | Complex (5 rating configs) | Simple (like other events) |
| **Follow-ups** | Auto-triggered per rating | Separate messages if needed |
| **Setup Time** | ~10 minutes | ~2 minutes |

---

## Benefits

✅ **Simpler** — One unified message system for all post-appointment messages  
✅ **Flexible** — Can send feedback immediately or delayed  
✅ **Consistent** — Uses same template system as all other messages  
✅ **Reliable** — Proven scheduling mechanism  
✅ **Extensible** — Easy to add more message types  

---

## Next Steps

1. **Verify UI changes** — Check frontend renders correctly
2. **Test configuration** — Create feedback message template
3. **Test scheduling** — Complete appointment and verify messages queued
4. **Test invoice/prescription** — Verify all variables available
5. **Integration testing** — Full end-to-end flow

---

## Files Modified

- `frontend/src/pages/WhatsAppPage.jsx` — Commented out feedback poll UI, replaced with feedbackMessage event
- `dms_backend/controllers/appointment.controller.js` — Changed trigger from feedbackPoll to feedbackMessage
- `dms_backend/models/WhatsAppTemplate.model.js` — Updated event enum

---

## Backward Compatibility

- Old feedbackPoll templates will need to be recreated as feedbackMessage
- No breaking changes to API
- No database schema changes (only enum value)
- Settings structure unchanged

---

**Ready for testing!** 🚀
