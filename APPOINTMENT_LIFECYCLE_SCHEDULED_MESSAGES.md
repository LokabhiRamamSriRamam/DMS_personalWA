# Appointment Lifecycle: Scheduled Messages Implementation

## Overview

Every appointment in the DMS has 5 lifecycle events. At each event, WhatsApp messages should be **scheduled** and sent to WAAPI with proper `scheduledAt` timestamps.

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPOINTMENT LIFECYCLE                        │
└─────────────────────────────────────────────────────────────────┘

1. BOOKING CREATED
   ├─ Message: "Appointment Booked" (appointmentBooked)
   └─ Schedule: IMMEDIATE (scheduledAt = now)

2. APPOINTMENT REMINDER (Before appointment)
   ├─ Message: "Your appointment is in 24 hours" (appointmentReminder)
   └─ Schedule: 24 hours BEFORE appointment start time

3. APPOINTMENT RESCHEDULED
   ├─ Message: "Appointment Rescheduled" (appointmentRescheduled) [NEW]
   └─ Schedule: IMMEDIATE + NEW reminder at 24h before NEW time

4. APPOINTMENT CANCELLED
   ├─ Message: "Appointment Cancelled" (appointmentCancelled) [NEW]
   └─ Schedule: IMMEDIATE

5. APPOINTMENT COMPLETED
   ├─ Message: "Post-Care Journey" (postCare) [Multiple steps]
   ├─ Step 1: After 1 hour
   ├─ Step 2: After 24 hours
   └─ Step 3: After 48 hours (if configured)
```

---

## Database Schema Updates Required

### 1. Add Message Type to WhatsAppTemplate Model

**File:** `dms_backend/models/WhatsAppTemplate.model.js`

Currently supports:
```javascript
event: {
  type: String,
  enum: [
    'appointmentBooked',
    'appointmentReminder',
    'appointmentRescheduled',  // ← ADD THIS
    'appointmentCancelled',    // ← ADD THIS
    'invoiceGenerated',
    // ... others
  ]
}
```

**Add to enum:**
```javascript
'appointmentRescheduled',   // Sent when appointment date/time changes
'appointmentCancelled',     // Sent when appointment is cancelled
```

### 2. Update Appointment Model to Track Queued Messages

**File:** `dms_backend/models/Appointment.model.js`

Add these fields to track which messages have been queued:

```javascript
const appointmentSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // Message tracking
  messagesQueued: {
    appointmentBooked: {
      queued: { type: Boolean, default: false },
      messageId: String,
      idempotencyKey: String,
      queuedAt: Date,
    },
    appointmentReminder: {
      queued: { type: Boolean, default: false },
      messageId: String,
      idempotencyKey: String,
      scheduledFor: Date,
      queuedAt: Date,
    },
    appointmentRescheduled: {
      queued: { type: Boolean, default: false },
      messageId: String,
      idempotencyKey: String,
      queuedAt: Date,
    },
    appointmentCancelled: {
      queued: { type: Boolean, default: false },
      messageId: String,
      idempotencyKey: String,
      queuedAt: Date,
    },
    postCare: {
      queued: { type: Boolean, default: false },
      steps: [
        {
          stepNumber: Number,
          messageId: String,
          idempotencyKey: String,
          scheduledFor: Date,
          queuedAt: Date,
        }
      ],
    },
  },
});
```

---

## Implementation: Message Scheduling at Each Lifecycle Event

### EVENT 1: Appointment Booking Created

**File:** `dms_backend/controllers/appointment.controller.js` → `createAppointment()`

```javascript
export async function createAppointment(req, res) {
  try {
    const appointmentData = req.body;
    
    // 1. Create appointment in DB
    const saved = await Appointment.create({
      ...appointmentData,
      status: 'Scheduled',
    });

    // 2. Queue "Appointment Booked" message (IMMEDIATE)
    if (appointmentData.patient_phone) {
      const patient = await Patient.findById(appointmentData.patient_id);
      
      const data = {
        name: patient.first_name,
        firstName: patient.first_name,
        date: new Date(appointmentData.start_time).toLocaleDateString('en-IN'),
        time: new Date(appointmentData.start_time).toLocaleTimeString('en-IN'),
        doctorName: (await Doctor.findById(appointmentData.doctor_id))?.name || 'Doctor',
        patientId: patient.patientId,
        mobile: appointmentData.patient_phone,
      };

      // Queue message IMMEDIATELY
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        process.env.WAAPI_BASE_URL,
        'appointmentBooked',                          // Event type
        appointmentData.patient_phone,                // Phone
        data,                                         // Template variables
        null,                                         // No scheduledAt = IMMEDIATE
        `appointmentBooked-APT-${saved._id}-${req.user.tenantId}`, // Idempotency key
        patient._id,                                  // Patient ID
        'en'                                          // Language
      );

      // 3. Queue "Appointment Reminder" (24 hours BEFORE appointment)
      const reminderScheduledAt = new Date(
        new Date(appointmentData.start_time).getTime() - (24 * 60 * 60 * 1000)
      );

      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        process.env.WAAPI_BASE_URL,
        'appointmentReminder',
        appointmentData.patient_phone,
        data,
        reminderScheduledAt.toISOString(),  // Schedule for 24h before
        `appointmentReminder-APT-${saved._id}-${req.user.tenantId}`,
        patient._id,
        'en'
      );
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### EVENT 2: Appointment Rescheduled

**File:** `dms_backend/controllers/appointment.controller.js` → `updateAppointment()` or `rescheduleAppointment()`

```javascript
export async function rescheduleAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const { start_time: newStartTime } = req.body;
    
    // 1. Get old appointment data
    const oldAppointment = await Appointment.findById(appointmentId);
    
    // 2. Update appointment with new time
    const updated = await Appointment.findByIdAndUpdate(
      appointmentId,
      { start_time: newStartTime, status: 'Rescheduled' },
      { new: true }
    );

    if (oldAppointment.patient_phone) {
      const patient = await Patient.findById(oldAppointment.patient_id);
      const doctor = await Doctor.findById(oldAppointment.doctor_id);
      
      const data = {
        name: patient.first_name,
        firstName: patient.first_name,
        oldDate: new Date(oldAppointment.start_time).toLocaleDateString('en-IN'),
        oldTime: new Date(oldAppointment.start_time).toLocaleTimeString('en-IN'),
        newDate: new Date(newStartTime).toLocaleDateString('en-IN'),
        newTime: new Date(newStartTime).toLocaleTimeString('en-IN'),
        doctorName: doctor?.name || 'Doctor',
        patientId: patient.patientId,
        mobile: oldAppointment.patient_phone,
      };

      // 1. Queue "Appointment Rescheduled" message (IMMEDIATE)
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        process.env.WAAPI_BASE_URL,
        'appointmentRescheduled',
        oldAppointment.patient_phone,
        data,
        null,  // Immediate
        `appointmentRescheduled-APT-${appointmentId}-${req.user.tenantId}`,
        patient._id,
        'en'
      );

      // 2. Queue NEW "Appointment Reminder" for NEW time (24h before)
      const newReminderScheduledAt = new Date(
        new Date(newStartTime).getTime() - (24 * 60 * 60 * 1000)
      );

      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        process.env.WAAPI_BASE_URL,
        'appointmentReminder',
        oldAppointment.patient_phone,
        data,
        newReminderScheduledAt.toISOString(),
        `appointmentReminder-APT-${appointmentId}-NEW-${req.user.tenantId}`,
        patient._id,
        'en'
      );
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### EVENT 3: Appointment Cancelled

**File:** `dms_backend/controllers/appointment.controller.js` → Add new `cancelAppointment()` function

```javascript
export async function cancelAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body; // Optional cancellation reason
    
    // 1. Get appointment data
    const appointment = await Appointment.findById(appointmentId);
    
    // 2. Update status to Cancelled
    const updated = await Appointment.findByIdAndUpdate(
      appointmentId,
      { 
        status: 'Cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date(),
      },
      { new: true }
    );

    if (appointment.patient_phone) {
      const patient = await Patient.findById(appointment.patient_id);
      const doctor = await Doctor.findById(appointment.doctor_id);
      
      const data = {
        name: patient.first_name,
        firstName: patient.first_name,
        date: new Date(appointment.start_time).toLocaleDateString('en-IN'),
        time: new Date(appointment.start_time).toLocaleTimeString('en-IN'),
        doctorName: doctor?.name || 'Doctor',
        reason: reason || 'No reason provided',
        patientId: patient.patientId,
        mobile: appointment.patient_phone,
      };

      // Queue "Appointment Cancelled" message (IMMEDIATE)
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        process.env.WAAPI_BASE_URL,
        'appointmentCancelled',
        appointment.patient_phone,
        data,
        null,  // Immediate
        `appointmentCancelled-APT-${appointmentId}-${req.user.tenantId}`,
        patient._id,
        'en'
      );
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### EVENT 4: Appointment Completed

**File:** `dms_backend/controllers/visit.controller.js` → When treatment is marked complete

(This already exists but needs to pass `scheduledAt` correctly)

```javascript
export async function markTreatmentComplete(req, res) {
  try {
    const { visitId, treatmentId } = req.params;
    
    // 1. Mark treatment complete
    const visit = await Visit.findByIdAndUpdate(
      visitId,
      { 'treatments.$[elem].status': 'Completed' },
      { arrayFilters: [{ 'elem._id': treatmentId }], new: true }
    ).populate('patient_id doctor_id appointment_id');

    const treatment = visit.treatments.find(t => t._id.toString() === treatmentId);
    const completedAt = new Date();

    if (visit.patient_id?.mobile) {
      const data = {
        name: visit.patient_id.first_name,
        firstName: visit.patient_id.first_name,
        treatment: treatment.treatment_name,
        teethNumbers: treatment.teeth_numbers?.join(', ') || 'Multiple',
        date: completedAt.toLocaleDateString('en-IN'),
        doctorName: visit.doctor_id?.name || 'Doctor',
        patientId: visit.patient_id.patientId,
        mobile: visit.patient_id.mobile,
      };

      // Trigger post-care journey with proper scheduledAt timestamps
      await triggerJourneyWithScheduling(
        req.tenantModels,
        req.user.tenantId,
        process.env.WAAPI_BASE_URL,
        visit.patient_id.mobile,
        treatment.treatment_name,
        completedAt,  // Base time for all delays
        data,
        visit.patient_id._id,
        'en'
      );
    }

    res.json(visit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

## Helper Functions

### queueScheduledMessage() - NEW FUNCTION

**File:** `dms_backend/services/whatsapp.service.js`

```javascript
/**
 * Queue a message with optional scheduling
 * @param {object} tenantModels
 * @param {string} tenantId
 * @param {string} waapiBaseUrl
 * @param {string} eventType
 * @param {string} patientPhone
 * @param {object} data (template variables)
 * @param {string} scheduledAt ISO8601 timestamp or null for immediate
 * @param {string} idempotencyKey
 * @param {string} patientId
 * @param {string} language
 */
export async function queueScheduledMessage(
  tenantModels,
  tenantId,
  waapiBaseUrl,
  eventType,
  patientPhone,
  data,
  scheduledAt,
  idempotencyKey,
  patientId,
  language
) {
  const { WhatsAppLog } = tenantModels;
  
  try {
    if (!waapiBaseUrl) {
      console.log('[WhatsApp] WAAPI_BASE_URL not configured, skipping');
      return null;
    }

    // 1. Build the message payload
    const payload = await buildMessage(tenantModels, tenantId, eventType, data, language);
    if (!payload) {
      console.log(`[WhatsApp] No template found for ${eventType}`);
      return null;
    }

    // 2. Add phone and scheduled time to payload
    payload.to = patientPhone;
    if (scheduledAt) {
      payload.scheduledAt = scheduledAt;
    }

    // 3. Send to WAAPI with idempotency key
    console.log(`[WhatsApp] Queueing ${eventType} for ${patientPhone}, scheduledAt=${scheduledAt || 'IMMEDIATE'}`);
    
    const waapiPayload = {
      tenantId,
      to: patientPhone,
      message: payload.content?.text || JSON.stringify(payload.content),
      messageType: eventType,
      scheduledAt: scheduledAt || null,
      idempotencyKey,
    };

    const waapiResponse = await sendToWAAPI(waapiPayload, waapiBaseUrl);

    // 4. Log the queued message
    await WhatsAppLog.create({
      patientId,
      event: eventType,
      to: patientPhone,
      payload,
      status: 'scheduled',
      sentAt: new Date(),
    }).catch(err => {
      console.error(`[WhatsApp] Failed to log message: ${err.message}`);
    });

    console.log(`[WhatsApp] ${eventType} queued: messageId=${waapiResponse.messageId}`);
    
    return {
      messageId: waapiResponse.messageId,
      idempotencyKey,
      scheduledFor: scheduledAt,
    };
  } catch (err) {
    console.error(`[WhatsApp] Failed to queue ${eventType}: ${err.message}`);
    return null;
  }
}
```

### triggerJourneyWithScheduling() - ENHANCED FUNCTION

**File:** `dms_backend/services/whatsapp.service.js`

```javascript
/**
 * Trigger post-care journey with proper scheduledAt timestamps
 * @param {object} tenantModels
 * @param {string} tenantId
 * @param {string} waapiBaseUrl
 * @param {string} patientPhone
 * @param {string} treatmentName
 * @param {Date} completedAt (base time for delay calculations)
 * @param {object} data
 * @param {string} patientId
 * @param {string} language
 */
export async function triggerJourneyWithScheduling(
  tenantModels,
  tenantId,
  waapiBaseUrl,
  patientPhone,
  treatmentName,
  completedAt,
  data,
  patientId,
  language
) {
  const { TreatmentJourney, WhatsAppLog } = tenantModels;
  
  try {
    if (!waapiBaseUrl) return;

    const settings = await tenantModels.WhatsAppSettings.findOne({}).lean();
    if (!settings?.enabled || !settings.events?.postCare?.enabled) return;

    const journey = await TreatmentJourney.findOne({
      treatmentName: { $regex: new RegExp(`^${treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      enabled: true,
    }).lean();

    if (!journey?.messages?.length) return;

    const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };

    for (let stepIdx = 0; stepIdx < journey.messages.length; stepIdx++) {
      const msg = journey.messages[stepIdx];
      
      // Calculate when this step should be sent
      const delayMs = (msg.delay?.value || 0) * (UNIT_MS[msg.delay?.unit] || UNIT_MS.hours);
      const scheduledAt = new Date(completedAt.getTime() + delayMs);

      console.log(`[WhatsApp] PostCare journey step ${stepIdx + 1}/${journey.messages.length}: scheduled for ${scheduledAt.toISOString()}`);

      // Find best language variant
      const chain = [language, settings.defaultLanguage, settings.fallbackLanguage, 'en'];
      let langVariant = null;
      for (const lang of chain) {
        const v = msg.languages?.[lang];
        const hasContent = v?.contentType === 'text'
          ? v?.content?.text?.trim()
          : v?.content && Object.keys(v.content).some(k => v.content[k]);
        if (hasContent) { langVariant = v; break; }
      }
      if (!langVariant) continue;

      // Build content
      const content = buildContent(langVariant.contentType, langVariant.content, data);

      // Queue via queueScheduledMessage with idempotency key
      await queueScheduledMessage(
        tenantModels,
        tenantId,
        waapiBaseUrl,
        'postCare',
        patientPhone,
        data,
        scheduledAt.toISOString(),  // ← Proper scheduledAt with delay
        `postCare-TREAT-${treatmentName}-step${stepIdx + 1}-${patientId}-${tenantId}`,
        patientId,
        language
      );
    }

    console.log(`[WhatsApp] PostCare journey queued for ${treatmentName}: ${journey.messages.length} steps`);
  } catch (err) {
    console.error(`[WhatsApp] Journey trigger failed: ${err.message}`);
  }
}
```

---

## Routes to Add/Update

**File:** `dms_backend/routes/appointment.routes.js`

```javascript
// Add new cancel appointment route
router.patch('/:id/cancel', cancelAppointment);

// Add reschedule route
router.patch('/:id/reschedule', rescheduleAppointment);
```

---

## Message Type Templates to Create

Add these templates in WhatsAppTemplate collection:

### 1. appointmentRescheduled

```json
{
  "event": "appointmentRescheduled",
  "language": "en",
  "isActive": true,
  "contentType": "text",
  "content": {
    "text": "Hello {{name}},\n\nYour appointment has been rescheduled!\n\nOld: {{oldDate}} at {{oldTime}}\nNew: {{newDate}} at {{newTime}}\n\nWith: Dr. {{doctorName}}\n\nPlease confirm your attendance."
  }
}
```

### 2. appointmentCancelled

```json
{
  "event": "appointmentCancelled",
  "language": "en",
  "isActive": true,
  "contentType": "text",
  "content": {
    "text": "Hello {{name}},\n\nYour appointment scheduled for {{date}} at {{time}} with Dr. {{doctorName}} has been cancelled.\n\nReason: {{reason}}\n\nPlease contact us if you'd like to reschedule."
  }
}
```

---

## Complete Appointment Lifecycle Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                  APPOINTMENT LIFECYCLE FLOW                    │
└────────────────────────────────────────────────────────────────┘

STEP 1: User books appointment
│
├─→ CREATE APPOINTMENT
│   ├─ Queue: appointmentBooked (IMMEDIATE)
│   │  Idempotency: appointmentBooked-APT-{id}-{tenantId}
│   │  scheduledAt: null (send now)
│   │
│   └─ Queue: appointmentReminder (24h BEFORE)
│      Idempotency: appointmentReminder-APT-{id}-{tenantId}
│      scheduledAt: appointmentTime - 24 hours
│
├─→ WAAPI receives both messages
│   ├─ appointmentBooked: Sends immediately
│   └─ appointmentReminder: Queued for 24h before
│
└─ Status: Scheduled ✓


STEP 2: (Optional) User reschedules appointment
│
├─→ RESCHEDULE APPOINTMENT
│   ├─ Queue: appointmentRescheduled (IMMEDIATE)
│   │  Idempotency: appointmentRescheduled-APT-{id}-{tenantId}
│   │  scheduledAt: null (send now)
│   │
│   └─ Queue: appointmentReminder (NEW 24h BEFORE)
│      Idempotency: appointmentReminder-APT-{id}-NEW-{tenantId}
│      scheduledAt: newAppointmentTime - 24 hours
│
├─→ WAAPI receives both messages
│   ├─ appointmentRescheduled: Sends immediately (patient notified of change)
│   └─ appointmentReminder (NEW): Queued for 24h before NEW time
│
└─ Status: Rescheduled ✓


STEP 3: (Optional) User cancels appointment
│
├─→ CANCEL APPOINTMENT
│   └─ Queue: appointmentCancelled (IMMEDIATE)
│      Idempotency: appointmentCancelled-APT-{id}-{tenantId}
│      scheduledAt: null (send now)
│
├─→ WAAPI receives cancellation
│   └─ appointmentCancelled: Sends immediately (patient notified)
│
└─ Status: Cancelled ✓


STEP 4: Appointment time arrives → Patient completes treatment
│
├─→ MARK TREATMENT COMPLETE
│   └─ Trigger: POST-CARE JOURNEY
│      For each step in journey:
│      ├─ Step 1: After 1 hour
│      │  scheduledAt: completedAt + 1 hour
│      │
│      ├─ Step 2: After 24 hours
│      │  scheduledAt: completedAt + 24 hours
│      │
│      └─ Step 3: After 48 hours
│         scheduledAt: completedAt + 48 hours
│
├─→ WAAPI receives journey messages
│   ├─ postCare Step 1: Queued, sends in 1 hour
│   ├─ postCare Step 2: Queued, sends in 24 hours
│   └─ postCare Step 3: Queued, sends in 48 hours
│
└─ Status: Completed ✓
```

---

## Testing Checklist

- [ ] Create appointment → Verify appointmentBooked sent immediately
- [ ] Create appointment → Verify appointmentReminder queued for 24h before
- [ ] Reschedule appointment → Verify appointmentRescheduled sent immediately
- [ ] Reschedule appointment → Verify NEW appointmentReminder at new time
- [ ] Cancel appointment → Verify appointmentCancelled sent immediately
- [ ] Complete treatment → Verify postCare steps queued with delays
- [ ] Check WAAPI logs → All messages have correct scheduledAt timestamps
- [ ] Check DMS logs → See [WhatsApp] messages with scheduling info

---

## Environment Variables

Ensure in `dms_backend/.env`:
```env
WAAPI_BASE_URL=https://your-waapi-domain.com/api
```

---

## Summary

| Lifecycle Event | Message Type | Timing | Idempotency Key |
|---|---|---|---|
| Appointment Created | appointmentBooked | IMMEDIATE | appointmentBooked-APT-{id}-{tenantId} |
| Appointment Created | appointmentReminder | 24h BEFORE appt | appointmentReminder-APT-{id}-{tenantId} |
| Appointment Rescheduled | appointmentRescheduled | IMMEDIATE | appointmentRescheduled-APT-{id}-{tenantId} |
| Appointment Rescheduled | appointmentReminder | 24h BEFORE NEW appt | appointmentReminder-APT-{id}-NEW-{tenantId} |
| Appointment Cancelled | appointmentCancelled | IMMEDIATE | appointmentCancelled-APT-{id}-{tenantId} |
| Treatment Completed | postCare Step 1 | +1h after completion | postCare-TREAT-{name}-step1-{patientId}-{tenantId} |
| Treatment Completed | postCare Step 2 | +24h after completion | postCare-TREAT-{name}-step2-{patientId}-{tenantId} |
| Treatment Completed | postCare Step 3 | +48h after completion | postCare-TREAT-{name}-step3-{patientId}-{tenantId} |

All messages use idempotency keys to ensure duplicates are prevented, even if network errors cause retries.

