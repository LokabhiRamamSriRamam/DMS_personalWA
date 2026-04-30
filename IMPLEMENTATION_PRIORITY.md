# Appointment Lifecycle Messaging: Implementation Priority

## Phase 1: Core Scheduling (Immediate)

### 1.1 Update Models
- [ ] Add message tracking fields to Appointment model
- [ ] Add `appointmentRescheduled` and `appointmentCancelled` to WhatsAppTemplate enum
- [ ] Add `cancellation_reason` and `cancelled_at` to Appointment model

**Impact:** Low (only model changes, no API breaking)
**Time:** 1 hour
**Files:**
  - `dms_backend/models/Appointment.model.js`
  - `dms_backend/models/WhatsAppTemplate.model.js`

---

### 1.2 Create Helper Functions
- [ ] Implement `queueScheduledMessage()` in whatsapp.service.js
- [ ] Implement `triggerJourneyWithScheduling()` with proper delay calculations
- [ ] Add console logging for debugging

**Impact:** None (new functions, no modifications to existing logic)
**Time:** 2 hours
**Files:**
  - `dms_backend/services/whatsapp.service.js`

---

### 1.3 Update Appointment Controller - CREATE
- [ ] Modify `createAppointment()` to queue both appointmentBooked (immediate) and appointmentReminder (24h before)
- [ ] Use idempotency keys to prevent duplicates

**Impact:** Medium (changes existing API behavior)
**Time:** 1 hour
**Files:**
  - `dms_backend/controllers/appointment.controller.js`

---

### 1.4 Create Templates in Database
- [ ] Create appointmentBooked template
- [ ] Create appointmentReminder template
- [ ] Create appointmentRescheduled template
- [ ] Create appointmentCancelled template

**Impact:** None (just data in DB)
**Time:** 30 minutes
**Seed Script:**
  - `dms_backend/seeds/setupWhatsAppDefaults.js` (add new templates)

---

## Phase 2: Reschedule & Cancel (Week 2)

### 2.1 Add Reschedule Endpoint
- [ ] Create `rescheduleAppointment()` controller function
- [ ] Queue appointmentRescheduled (immediate)
- [ ] Queue NEW appointmentReminder (24h before NEW time)
- [ ] Add route: `PATCH /api/appointments/:id/reschedule`

**Impact:** Medium (new endpoint)
**Time:** 1.5 hours
**Files:**
  - `dms_backend/controllers/appointment.controller.js`
  - `dms_backend/routes/appointment.routes.js`

---

### 2.2 Add Cancel Endpoint
- [ ] Create `cancelAppointment()` controller function
- [ ] Queue appointmentCancelled (immediate)
- [ ] Add route: `PATCH /api/appointments/:id/cancel`
- [ ] Add cancel button to frontend appointments page

**Impact:** Medium (new endpoint)
**Time:** 1.5 hours
**Files:**
  - `dms_backend/controllers/appointment.controller.js`
  - `dms_backend/routes/appointment.routes.js`
  - `frontend/src/pages/AppointmentsPage.jsx`

---

## Phase 3: Treatment Completion (Week 2)

### 3.1 Update Visit Controller
- [ ] Modify treatment completion to call `triggerJourneyWithScheduling()` instead of `triggerJourney()`
- [ ] Ensure `completedAt` is passed as base time for delay calculations

**Impact:** Medium (changes existing logic but maintains compatibility)
**Time:** 1 hour
**Files:**
  - `dms_backend/controllers/visit.controller.js`

---

## Phase 4: Testing & Verification (Week 3)

### 4.1 Backend Testing
- [ ] Test appointment creation → 2 messages queued
- [ ] Test reschedule → 2 messages queued (one immediate, one for new time)
- [ ] Test cancel → 1 message queued
- [ ] Test treatment complete → Journey messages queued with delays
- [ ] Verify WAAPI logs show correct scheduledAt timestamps
- [ ] Verify idempotency keys prevent duplicates

**Time:** 4 hours

---

### 4.2 Frontend Testing
- [ ] Test appointment creation flow
- [ ] Test reschedule button (if added)
- [ ] Test cancel button (if added)
- [ ] Verify UI updates correctly

**Time:** 2 hours

---

## Implementation Details by File

### File 1: `dms_backend/models/Appointment.model.js`

**What to add:**
```javascript
// Add to schema:
messagesQueued: {
  appointmentBooked: {
    queued: Boolean,
    messageId: String,
    idempotencyKey: String,
    queuedAt: Date,
  },
  appointmentReminder: {
    queued: Boolean,
    messageId: String,
    idempotencyKey: String,
    scheduledFor: Date,
    queuedAt: Date,
  },
  appointmentRescheduled: {
    queued: Boolean,
    messageId: String,
    idempotencyKey: String,
    queuedAt: Date,
  },
  appointmentCancelled: {
    queued: Boolean,
    messageId: String,
    idempotencyKey: String,
    queuedAt: Date,
  },
},
cancellation_reason: String,
cancelled_at: Date,
```

---

### File 2: `dms_backend/services/whatsapp.service.js`

**What to add:**
```javascript
// Add these two functions:

export async function queueScheduledMessage(
  tenantModels, tenantId, waapiBaseUrl,
  eventType, patientPhone, data,
  scheduledAt, idempotencyKey, patientId, language
) {
  // See APPOINTMENT_LIFECYCLE_SCHEDULED_MESSAGES.md for full implementation
}

export async function triggerJourneyWithScheduling(
  tenantModels, tenantId, waapiBaseUrl,
  patientPhone, treatmentName, completedAt,
  data, patientId, language
) {
  // See APPOINTMENT_LIFECYCLE_SCHEDULED_MESSAGES.md for full implementation
}
```

---

### File 3: `dms_backend/controllers/appointment.controller.js`

**Modify `createAppointment()`:**
- After creating appointment, call `queueScheduledMessage()` twice:
  1. appointmentBooked with scheduledAt=null (immediate)
  2. appointmentReminder with scheduledAt=24h before appointment

**Add `rescheduleAppointment()`:**
- Update appointment with new start_time
- Call `queueScheduledMessage()` twice:
  1. appointmentRescheduled with scheduledAt=null (immediate)
  2. appointmentReminder with scheduledAt=24h before NEW appointment

**Add `cancelAppointment()`:**
- Update appointment status to Cancelled
- Call `queueScheduledMessage()` once:
  1. appointmentCancelled with scheduledAt=null (immediate)

---

### File 4: `dms_backend/routes/appointment.routes.js`

**Add routes:**
```javascript
router.patch('/:id/reschedule', rescheduleAppointment);
router.patch('/:id/cancel', cancelAppointment);
```

---

### File 5: `dms_backend/controllers/visit.controller.js`

**Modify treatment completion (markTreatmentComplete()):**

Change from:
```javascript
triggerJourney(req.tenantModels, req.user.tenantId, ...)
```

To:
```javascript
triggerJourneyWithScheduling(req.tenantModels, req.user.tenantId, ...)
```

Pass `new Date()` as `completedAt` parameter.

---

### File 6: `frontend/src/pages/AppointmentsPage.jsx` (Optional Phase 4)

**Add buttons:**
- Reschedule button
- Cancel button

**Add modals:**
- Reschedule modal (select new date/time)
- Cancel modal (optional reason)

---

## Data Validation

Before sending messages, validate:

```javascript
// Phone validation
if (!patientPhone || !patientPhone.startsWith('+')) {
  console.error('Invalid phone format, skipping message');
  return;
}

// scheduledAt validation
if (scheduledAt && new Date(scheduledAt) <= new Date()) {
  console.error('scheduledAt cannot be in the past');
  return;
}

// Template exists
const template = await WhatsAppTemplate.findOne({
  event: eventType,
  language: language,
  isActive: true,
});
if (!template) {
  console.log(`No active template for ${eventType}, message not queued`);
  return;
}
```

---

## Error Handling

For each message queue attempt:

```javascript
try {
  const result = await queueScheduledMessage(...);
  if (result) {
    // Update appointment.messagesQueued with messageId
    await Appointment.updateOne(
      { _id: appointmentId },
      { [`messagesQueued.${eventType}.messageId`]: result.messageId }
    );
  }
} catch (err) {
  console.error(`Failed to queue ${eventType}: ${err.message}`);
  // Don't throw - continue execution
}
```

---

## Testing Commands

### Create Appointment (with scheduling)
```bash
curl -X POST http://localhost:5000/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "PATIENT_ID",
    "doctor_id": "DOCTOR_ID",
    "patient_phone": "+919876543210",
    "start_time": "2026-04-27T14:30:00Z",
    "type": "Consultation"
  }'

# Expected: 2 messages queued
# - appointmentBooked: immediate
# - appointmentReminder: 24h before
```

### Reschedule Appointment
```bash
curl -X PATCH http://localhost:5000/api/appointments/APT_ID/reschedule \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "2026-04-28T10:00:00Z"
  }'

# Expected: 2 messages queued
# - appointmentRescheduled: immediate
# - appointmentReminder: 24h before new time
```

### Cancel Appointment
```bash
curl -X PATCH http://localhost:5000/api/appointments/APT_ID/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Patient requested cancellation"
  }'

# Expected: 1 message queued
# - appointmentCancelled: immediate
```

---

## Logging & Debugging

Enable detailed logging to verify scheduling:

```javascript
// In queueScheduledMessage():
console.log(`[WhatsApp:Queue] Event: ${eventType}`);
console.log(`[WhatsApp:Queue] Patient: ${patientPhone}`);
console.log(`[WhatsApp:Queue] Scheduled: ${scheduledAt || 'IMMEDIATE'}`);
console.log(`[WhatsApp:Queue] Idempotency: ${idempotencyKey}`);
console.log(`[WhatsApp:Queue] Status: sent to WAAPI`);
```

Check logs with:
```bash
tail -f /path/to/app.log | grep "\[WhatsApp:Queue\]"
```

---

## Success Criteria

- [ ] All 5 lifecycle events trigger appropriate messages
- [ ] All messages have correct `scheduledAt` timestamps
- [ ] All messages have unique idempotency keys
- [ ] WAAPI receives payload with `scheduledAt` field
- [ ] No duplicate messages sent (idempotency validated)
- [ ] DMS logs show [WhatsApp] messages for each event
- [ ] Frontend can create/reschedule/cancel appointments

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Core Scheduling | 4.5 hours | Week 1 Mon | Week 1 Wed |
| Phase 2: Reschedule & Cancel | 3 hours | Week 1 Wed | Week 1 Fri |
| Phase 3: Treatment Completion | 1 hour | Week 2 Mon | Week 2 Mon |
| Phase 4: Testing & Verification | 6 hours | Week 2 Mon | Week 2 Wed |
| **Total** | **14.5 hours** | **Week 1** | **Week 2** |

---

## Rollback Plan

If issues arise:

1. Disable WhatsApp in settings: `settings.enabled = false`
2. Messages won't be sent, but logging continues
3. Fix code, re-enable, retry

No database migration needed - all fields are optional.

