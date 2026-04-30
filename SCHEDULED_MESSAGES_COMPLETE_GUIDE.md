# Complete Guide: Appointment Lifecycle Scheduled Messages

## Executive Summary

Your DMS needs to **schedule WhatsApp messages at each appointment lifecycle event** with proper `scheduledAt` timestamps sent to WAAPI.

```
APPOINTMENT LIFECYCLE & MESSAGE SCHEDULING:

1. Booking Created
   ├─ appointmentBooked → SEND IMMEDIATELY
   └─ appointmentReminder → SCHEDULE 24h BEFORE appointment

2. Appointment Rescheduled
   ├─ appointmentRescheduled → SEND IMMEDIATELY
   └─ appointmentReminder (NEW) → SCHEDULE 24h BEFORE NEW appointment

3. Appointment Cancelled
   └─ appointmentCancelled → SEND IMMEDIATELY

4. Treatment Completed
   └─ postCare Journey
      ├─ Step 1 → SCHEDULE 1h AFTER completion
      ├─ Step 2 → SCHEDULE 24h AFTER completion
      └─ Step 3 → SCHEDULE 48h AFTER completion
```

---

## What Needs to Be Done

### ✅ ALREADY DONE (In DMS)
- [x] Fixed selectedJourney bug
- [x] Created scheduled message logging
- [x] DMS sends `scheduledAt` to WAAPI
- [x] WAAPI accepts `scheduledAt` in payload
- [x] Idempotency keys implemented

### ❌ TODO (Implementation)
- [ ] Create helper functions for scheduling
- [ ] Update appointment CREATE endpoint to queue 2 messages
- [ ] Create appointment RESCHEDULE endpoint
- [ ] Create appointment CANCEL endpoint
- [ ] Update treatment COMPLETE to use scheduling
- [ ] Create message templates for rescheduled/cancelled

---

## 3 Core Functions to Implement

### 1. `queueScheduledMessage()` - Universal Message Queuing

**Where:** `dms_backend/services/whatsapp.service.js`

**Purpose:** Queue ANY message with optional scheduling

**Parameters:**
```javascript
queueScheduledMessage(
  tenantModels,           // Database models
  tenantId,               // Clinic ID
  waapiBaseUrl,           // WAAPI endpoint
  eventType,              // 'appointmentBooked', 'appointmentReminder', etc.
  patientPhone,           // '+919876543210'
  data,                   // Template variables { name, date, doctorName, ... }
  scheduledAt,            // ISO8601 or null for immediate
  idempotencyKey,         // 'appointmentBooked-APT-123-clinic-001'
  patientId,              // Patient MongoDB ID
  language                // 'en', 'hi', 'mr'
)
```

**What it does:**
1. Builds message from template
2. Adds phone and scheduledAt to payload
3. Sends to WAAPI with idempotency key
4. Logs the message
5. Returns messageId for tracking

---

### 2. `triggerJourneyWithScheduling()` - Post-Care Scheduling

**Where:** `dms_backend/services/whatsapp.service.js`

**Purpose:** Queue post-care journey with proper delays

**Parameters:**
```javascript
triggerJourneyWithScheduling(
  tenantModels,           // Database models
  tenantId,               // Clinic ID
  waapiBaseUrl,           // WAAPI endpoint
  patientPhone,           // '+919876543210'
  treatmentName,          // 'Root Canal', 'Filling', etc.
  completedAt,            // Date of treatment completion
  data,                   // Template variables
  patientId,              // Patient MongoDB ID
  language                // 'en', 'hi', 'mr'
)
```

**What it does:**
1. Fetches TreatmentJourney for this treatment
2. For each step in journey:
   - Calculate: scheduledAt = completedAt + step delay
   - Queue message with that scheduledAt
3. Each step is a separate message in WAAPI queue

**Example:**
```
Treatment completed: 27/4/2026 10:00 AM
  ├─ Step 1 (delay: 1 hour)  → Schedule: 27/4/2026 11:00 AM
  ├─ Step 2 (delay: 24 hours) → Schedule: 28/4/2026 10:00 AM
  └─ Step 3 (delay: 48 hours) → Schedule: 29/4/2026 10:00 AM
```

---

### 3. Update Existing Functions to Use Scheduling

**appointmentCreate()** - Queue 2 messages
```javascript
// 1. Immediate confirmation
await queueScheduledMessage(
  ..., 'appointmentBooked', phone, data,
  null,  // ← No delay, send immediately
  `appointmentBooked-APT-${appointmentId}-${tenantId}`
);

// 2. Scheduled reminder
await queueScheduledMessage(
  ..., 'appointmentReminder', phone, data,
  new Date(appointmentTime - 24h).toISOString(),  // ← 24h before
  `appointmentReminder-APT-${appointmentId}-${tenantId}`
);
```

---

## Message Types & Their Scheduling

| Event | Message Type | Timing | Idempotency Pattern |
|-------|------|--------|---|
| Create | appointmentBooked | NOW | appointmentBooked-APT-{id}-{tenant} |
| Create | appointmentReminder | -24h | appointmentReminder-APT-{id}-{tenant} |
| Reschedule | appointmentRescheduled | NOW | appointmentRescheduled-APT-{id}-{tenant} |
| Reschedule | appointmentReminder (NEW) | -24h NEW | appointmentReminder-APT-{id}-NEW-{tenant} |
| Cancel | appointmentCancelled | NOW | appointmentCancelled-APT-{id}-{tenant} |
| Complete | postCare Step N | +delay | postCare-TREAT-{name}-step{n}-{patient}-{tenant} |

---

## Payload Sent to WAAPI

After scheduling, DMS sends to WAAPI:

```json
{
  "tenantId": "clinic-001",
  "to": "918104489957",
  "message": "Your appointment is tomorrow at 3 PM...",
  "messageType": "appointmentReminder",
  "scheduledAt": "2026-04-27T02:58:00.000Z",
  "idempotencyKey": "appointmentReminder-APT-12345-clinic-001"
}
```

WAAPI then:
1. Checks idempotencyKey - if duplicate, returns existing messageId
2. Stores message in queue with status: "queued"
3. At `scheduledAt` time, sends message to patient
4. Updates status: "sent" when delivered

---

## Implementation Files & Changes

### File 1: `dms_backend/models/Appointment.model.js`
- Add `messagesQueued` object with tracking fields
- Add `cancellation_reason` and `cancelled_at` fields

### File 2: `dms_backend/services/whatsapp.service.js`
- **Add:** `queueScheduledMessage()` function (30 lines)
- **Add:** `triggerJourneyWithScheduling()` function (50 lines)
- **Modify:** Export both functions

### File 3: `dms_backend/controllers/appointment.controller.js`
- **Modify:** `createAppointment()` - add 2 message queues
- **Add:** `rescheduleAppointment()` - new function with 2 message queues
- **Add:** `cancelAppointment()` - new function with 1 message queue

### File 4: `dms_backend/routes/appointment.routes.js`
- **Add:** `router.patch('/:id/reschedule', rescheduleAppointment);`
- **Add:** `router.patch('/:id/cancel', cancelAppointment);`

### File 5: `dms_backend/controllers/visit.controller.js`
- **Modify:** Treatment completion - change `triggerJourney()` to `triggerJourneyWithScheduling()`

### File 6: `dms_backend/seeds/setupWhatsAppDefaults.js` (Optional)
- **Add:** Template records for appointmentRescheduled and appointmentCancelled

---

## Step-by-Step Implementation

### Step 1: Add Helper Functions (1 hour)
Create `queueScheduledMessage()` and `triggerJourneyWithScheduling()` in `whatsapp.service.js`

**Test:** Call functions manually in a Node REPL:
```javascript
const result = await queueScheduledMessage(
  tenantModels, 'clinic-001', 'https://waapi.com/api',
  'test', '+919876543210', { name: 'Test' },
  null, 'test-key-123', null, 'en'
);
console.log(result); // Should show messageId
```

---

### Step 2: Update Appointment Model (15 min)
Add message tracking fields to Appointment schema

**Test:** Create appointment, inspect messagesQueued object

---

### Step 3: Update Appointment Create (30 min)
Call `queueScheduledMessage()` twice in createAppointment()

**Test:**
```bash
POST /api/appointments
{
  "patient_id": "...",
  "doctor_id": "...",
  "patient_phone": "+919876543210",
  "start_time": "2026-04-27T14:00:00Z"
}

# Check WAAPI logs: should see 2 messages queued
# 1. appointmentBooked (immediate)
# 2. appointmentReminder (scheduled for 2026-04-26T14:00:00Z)
```

---

### Step 4: Add Reschedule Endpoint (45 min)
Create `rescheduleAppointment()` function and route

**Test:**
```bash
PATCH /api/appointments/APT123/reschedule
{
  "start_time": "2026-04-28T10:00:00Z"
}

# Check WAAPI logs: should see 2 messages
# 1. appointmentRescheduled (immediate)
# 2. appointmentReminder (scheduled for 2026-04-27T10:00:00Z - NEW time)
```

---

### Step 5: Add Cancel Endpoint (45 min)
Create `cancelAppointment()` function and route

**Test:**
```bash
PATCH /api/appointments/APT123/cancel
{
  "reason": "Patient requested"
}

# Check WAAPI logs: should see 1 message
# 1. appointmentCancelled (immediate)
```

---

### Step 6: Update Treatment Completion (15 min)
Change `triggerJourney()` to `triggerJourneyWithScheduling()` in visit controller

**Test:**
```bash
# Mark treatment complete
PATCH /api/visits/VISIT123/treatments/TREAT123/status
{ "status": "Completed" }

# Check WAAPI logs: should see postCare messages scheduled with delays
# - Step 1: +1h
# - Step 2: +24h
# - Step 3: +48h
```

---

### Step 7: Create Templates (30 min)
Add template records for new message types

```javascript
// appointmentRescheduled
{
  event: 'appointmentRescheduled',
  language: 'en',
  contentType: 'text',
  content: { text: 'Your appointment has been rescheduled from {{oldDate}} at {{oldTime}} to {{newDate}} at {{newTime}}' },
  isActive: true
}

// appointmentCancelled
{
  event: 'appointmentCancelled',
  language: 'en',
  contentType: 'text',
  content: { text: 'Your appointment on {{date}} at {{time}} with {{doctorName}} has been cancelled. Reason: {{reason}}' },
  isActive: true
}
```

---

## Testing Scenarios

### Scenario 1: Full Appointment Lifecycle
```
1. Create appointment for 27/4 at 2 PM
   ✓ appointmentBooked sent (immediate)
   ✓ appointmentReminder scheduled (26/4 at 2 PM)

2. Reschedule to 28/4 at 10 AM
   ✓ appointmentRescheduled sent (immediate)
   ✓ appointmentReminder scheduled (27/4 at 10 AM) - NEW

3. Cancel
   ✓ appointmentCancelled sent (immediate)

4. Create new appointment, complete treatment
   ✓ appointmentBooked sent
   ✓ appointmentReminder scheduled
   ✓ postCare Step 1 scheduled (+1h)
   ✓ postCare Step 2 scheduled (+24h)
   ✓ postCare Step 3 scheduled (+48h)
```

### Scenario 2: Duplicate Prevention
```
1. Create appointment
   → appointmentBooked queued (idempotencyKey: APT-123-clinic-001)

2. Network error, retry with SAME appointmentId
   → WAAPI returns existing messageId (no duplicate created)
   → DMS sees duplicate: true in response
```

### Scenario 3: Timezone Handling
```
Appointment time: 27/4/2026 2:58 PM IST (UTC+5:30)
Converted to ISO8601: 2026-04-27T09:28:00Z

Reminder scheduled: 24h before
IST: 26/4/2026 2:58 PM
ISO8601: 2026-04-26T09:28:00Z

WAAPI receives ISO8601 and sends at correct UTC time
```

---

## Debugging Commands

```bash
# Check what messages are in WAAPI queue
curl https://waapi.com/api/messages?status=queued \
  -H "Authorization: Bearer WAAPI_TOKEN"

# Check a specific message
curl https://waapi.com/api/messages/MESSAGE_ID \
  -H "Authorization: Bearer WAAPI_TOKEN"

# See DMS logs for message queueing
tail -f /var/log/dms.log | grep "[WhatsApp:Queue]"

# Query DMS for scheduled appointments
db.appointments.find({
  "messagesQueued.appointmentReminder.queued": true
}).pretty()
```

---

## Error Handling Checklist

- [ ] Phone number invalid → log error, skip message
- [ ] Template not found → log error, skip message
- [ ] scheduledAt in past → WAAPI returns 400, log error
- [ ] Network timeout → retry with same idempotencyKey
- [ ] WAAPI rate limit → exponential backoff, retry with same key
- [ ] Duplicate detected → OK, reuse messageId

---

## Documentation Generated

You now have these files in your project:

1. **APPOINTMENT_LIFECYCLE_SCHEDULED_MESSAGES.md** (This is the main guide)
   - Complete implementation with code examples
   - All 5 lifecycle events covered
   - Helper functions fully documented

2. **IMPLEMENTATION_PRIORITY.md**
   - Phased approach (4 phases)
   - Time estimates per phase
   - File-by-file breakdown

3. **WHATSAPP_LOGS_SUMMARY.txt**
   - Quick reference

4. **WAAPI_SCHEDULED_MESSAGES_FIX.md**
   - Why scheduledAt wasn't showing in WAAPI UI
   - What WAAPI needs to fix

5. **WHATSAPP_ROUTES_GUIDE.md**
   - All existing routes documented

6. **WHATSAPP_LOGS_IMPLEMENTATION.md**
   - Technical details of log structure

---

## Key Takeaways

✅ **DMS Backend:**
- Already sends `scheduledAt` to WAAPI
- Already supports idempotency keys
- Just needs controllers updated to use scheduling

✅ **WAAPI:**
- Already accepts `scheduledAt` in payload
- Already stores it in messages
- Just needs UI to display `scheduledAt` in message details

✅ **Implementation:**
- 3 core functions to add
- 3 controller endpoints to update/create
- ~10-14 hours of work
- No breaking changes
- Full backward compatibility

---

## Next Steps

1. **Read** APPOINTMENT_LIFECYCLE_SCHEDULED_MESSAGES.md carefully
2. **Review** code examples for queueScheduledMessage()
3. **Start** Phase 1: Add helper functions
4. **Test** each phase before moving to next
5. **Monitor** WAAPI logs to verify scheduledAt timestamps

Questions? Reference the implementation guides or check the code examples.

