# Timezone Consistency Guide

**Status:** ✅ Implemented  
**Date:** April 28, 2026

---

## Core Principle

- **Backend:** All times stored in UTC/ISO format (e.g., `2026-04-28T10:00:00Z`)
- **Frontend:** All times displayed in IST (UTC+5:30)
- **Messages:** Template variables use IST-formatted dates for user-facing content
- **Scheduling:** All delay calculations use UTC for precision

---

## Frontend (React)

### Helper Functions

**File:** `frontend/src/pages/AppointmentsPage.jsx` & `frontend/src/modals/NewAppointmentModal.jsx`

```javascript
// Get today's date in IST (UTC+5:30)
const getIndiaDate = () => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const istTime = new Date(utcTime + (5.5 * 60 * 60 * 1000));
  return istTime.toISOString().split('T')[0];
};

// Get current time in IST (UTC+5:30)
const getIndiaTime = () => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const istTime = new Date(utcTime + (5.5 * 60 * 60 * 1000));
  return istTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};
```

### Frontend Flows

**Appointment Creation (NewAppointmentModal):**
1. User enters date/time in UI → **IST format**
2. Form defaults to `getIndiaDate()` and `getIndiaTime()`
3. On submit: Convert IST → UTC before sending to backend
   ```javascript
   const istDateTime = new Date(`${formData.date}T${formData.time}`);
   const utcStartTime = new Date(istDateTime.getTime() - (5.5 * 60 * 60 * 1000));
   ```

**Appointment Display (AppointmentsPage):**
1. Backend returns UTC times
2. Convert UTC → IST for display
   ```javascript
   const istStart = new Date(utcStart.getTime() + (5.5 * 60 * 60 * 1000));
   ```
3. Show IST date in calendar (correctly shows date 28, not 27)
4. Show IST time in appointment blocks

**Edit Appointment Modal:**
1. Backend sends UTC time
2. Convert to IST before filling form
   ```javascript
   const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
   ```

---

## Backend (Node.js)

### Database

**All times stored as:** ISO/UTC strings (from `Date.toISOString()`)

**Example:** `"start_time": "2026-04-28T10:00:00Z"`

---

### Message Templates (appointment.controller.js)

When sending WhatsApp messages, convert UTC appointment time to IST for template variables.

**Pattern:**
```javascript
// Convert UTC to IST for message templates
const utcStartDate = new Date(saved.start_time);
const istStartDate = new Date(utcStartDate.getTime() + (5.5 * 60 * 60 * 1000));

const data = {
  name,
  firstName,
  date: istStartDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
  time: istStartDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
  // ... other fields
};
```

**Flows:**

1. **appointmentBooked** (immediate)
   - Uses IST-formatted date/time in message
   
2. **appointmentReminder** (scheduled)
   - Calculate fire time: `appointmentTime - hoursBeforeAppointment`
   - All calculations use UTC
   - Skip if appointment is within the hours-before window
   - Store `scheduledAt` in UTC

3. **appointmentRescheduled** (immediate)
   - Uses IST-formatted date/time in message

4. **appointmentCompleted** (immediate)
   - Uses IST-formatted date/time in message

5. **feedbackMessage** (scheduled)
   - Schedule with `delayMinutes` from settings
   - Calculate: `now + delayMinutes * 60 * 1000`
   - Uses IST-formatted date/time in message

6. **postCareJourney** (scheduled per treatment)
   - Schedule with journey-specific delays
   - Uses IST-formatted date/time in message

---

### Message Scheduling (whatsapp.service.js)

**WAAPI Payload Structure:**
```javascript
{
  tenantId: "...",              // UTC
  to: "+919876543210",          // UTC
  messageType: "appointmentReminder",  // UTC
  contentType: "text",          // UTC
  scheduledAt: "2026-04-28T14:00:00Z",  // ← ISO/UTC TIME
  content: {
    text: "Hi John, Your appointment on 28 April 2026, 19:40..."  // ← IST dates IN text
  }
}
```

**Key:** 
- **Payload metadata** (`scheduledAt`, `tenantId`, etc.) → **Always ISO/UTC**
- **Message content text** (variables like `{{date}}`, `{{time}}`) → **IST-formatted for user readability**

**Appointment Reminder Logic:**
```javascript
if (eventType === 'appointmentReminder' && appointmentStartTime) {
  const hoursBeforeMs = (eventConfig.hoursBeforeAppointment ?? 24) * 3_600_000;
  const appointmentTimeMs = new Date(appointmentStartTime).getTime();
  const fireAtMs = appointmentTimeMs - hoursBeforeMs;
  const nowMs = Date.now();

  // Skip if appointment is too soon
  if (fireAtMs <= nowMs) {
    console.log(`Reminder skipped: appointment is within ${hours} hours`);
    return null;
  }

  // Schedule for UTC time
  payload.scheduledAt = new Date(fireAtMs).toISOString();  // ← ISO/UTC
}
```

**Other Event Delays:**
```javascript
else if (eventConfig.delayMinutes > 0) {
  // Schedule X minutes from now (UTC)
  payload.scheduledAt = new Date(Date.now() + eventConfig.delayMinutes * 60 * 1000).toISOString();  // ← ISO/UTC
}
```

---

## WhatsApp Log Entry

When a message is sent/scheduled, it's logged with:

```javascript
{
  patientId: ObjectId,
  event: 'appointmentReminder',         // Event type
  to: '+919876543210',                  // Phone number
  payload: { ... },                     // Full message payload
  status: 'scheduled' | 'sent',         // 'scheduled' if scheduledAt is set, else 'sent'
  sentAt: Date.now(),                   // When log was created
  scheduledAt: '2026-04-28T10:00:00Z',  // When message will be sent (if scheduled)
  errorMessage: null                    // If status is 'failed'
}
```

---

## Testing Checklist

- [ ] Create appointment at 5:40 PM IST → Calendar shows correct date (28, not 27) and time
- [ ] Book appointment → Check logs for `appointmentBooked` (sent) and `appointmentReminder` (scheduled)
- [ ] Edit appointment → Form pre-fills with IST time (not UTC)
- [ ] Complete appointment → Check logs for all configured messages with correct `scheduledAt`
- [ ] Message template receives correct date/time (e.g., "28 April 2026, 5:40 PM")
- [ ] Appointment within reminder window → Reminder is skipped

---

## Files Modified

- `frontend/src/pages/AppointmentsPage.jsx` — IST date/time helpers, appointment display
- `frontend/src/modals/NewAppointmentModal.jsx` — IST date/time defaults, UTC conversion on submit
- `dms_backend/controllers/appointment.controller.js` — UTC → IST conversion for message templates
- `dms_backend/services/whatsapp.service.js` — Scheduling logic, timezone helpers added
- `dms_backend/models/WhatsAppLog.model.js` — Added `scheduledAt` field

---

## Summary

✅ **Backend:** Always UTC  
✅ **Frontend UI:** Always IST (UTC+5:30)  
✅ **Message Templates:** IST-formatted dates  
✅ **Scheduling:** UTC calculations with IST display  
✅ **Logs:** Store both `sentAt` (creation) and `scheduledAt` (execution)

This ensures users see correct local times while maintaining precision in scheduling.
