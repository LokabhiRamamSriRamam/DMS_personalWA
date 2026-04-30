# Dynamic Message Scheduling: Complete Guide

## The Complete Picture

Your WhatsApp system has **dynamic delays configured on the frontend** that control WHEN messages are sent after events. Every message type (not just post-care) can have delays set by the clinic admin.

```
FRONTEND (WhatsAppPage.jsx)
    ↓
User sets delays for each event:
  - appointmentReminder: "Send X hours before"
  - invoiceGenerated: "Delay X minutes"
  - prescriptionIssued: "Delay X minutes"
  - etc.
    ↓
Settings saved to database:
  { 
    events: {
      appointmentReminder: { enabled: true, hoursBeforeAppointment: 24 },
      invoiceGenerated: { enabled: true, delayMinutes: 30 },
      prescriptionIssued: { enabled: true, delayMinutes: 0 },
      postCare: { enabled: true, ... }
    }
  }
    ↓
BACKEND (when event triggers)
    ↓
Fetch settings → Calculate scheduledAt → Send to WAAPI with scheduledAt
```

---

## Delay Configuration in Frontend

### Settings Structure (WhatsAppPage.jsx)

```javascript
// Line 721: How settings are structured per event
const eventSettings = settings.events?.[event.key] || { enabled: false, delayMinutes: 0 };

// Line 748-761: Two types of delays:
// Type 1: appointmentReminder - Uses hoursBeforeAppointment
{
  enabled: true,
  hoursBeforeAppointment: 24  // Send 24 hours BEFORE appointment.start_time
}

// Type 2: All other events - Uses delayMinutes
{
  enabled: true,
  delayMinutes: 30  // Send 30 minutes AFTER event triggers
}
```

### Which Events Have Which Delay Type

| Event | Delay Type | Default | Frontend Control |
|-------|-----------|---------|------------------|
| **appointmentBooked** | `delayMinutes` | 0 | Line 756-759 |
| **appointmentReminder** | `hoursBeforeAppointment` | 24 | Line 748-751 |
| **appointmentRescheduled** | `delayMinutes` | 0 | Line 756-759 |
| **appointmentCompleted** | `delayMinutes` | 0 | Line 756-759 |
| **invoiceGenerated** | `delayMinutes` | 0 | Line 756-759 |
| **invoiceAndPrescription** | `delayMinutes` | 0 | Line 756-759 |
| **prescriptionIssued** | `delayMinutes` | 0 | Line 756-759 |
| **treatmentScheduled** | `delayMinutes` | 0 | Line 756-759 |
| **postCare** | Custom per-step | N/A | Journey Editor (Line 858-862) |

---

## Backend: Reading Delays from Settings

### Function: Get Event Delay

**File:** `dms_backend/services/whatsapp.service.js` — ADD THIS:

```javascript
/**
 * Calculate when a message should be sent based on event settings
 * @param {object} settings - WhatsAppSettings document
 * @param {string} eventType - Event key ('appointmentReminder', 'invoiceGenerated', etc.)
 * @param {Date} triggerTime - When the event occurred
 * @param {Date} appointmentStartTime - (Optional) For appointmentReminder calculations
 * @returns {Date|null} - When to schedule the message (null = IMMEDIATE)
 */
export function calculateScheduledTime(
  settings,
  eventType,
  triggerTime,
  appointmentStartTime
) {
  const eventConfig = settings?.events?.[eventType];
  if (!eventConfig?.enabled) return null;

  // SPECIAL CASE: appointmentReminder - schedule BEFORE appointment time
  if (eventType === 'appointmentReminder' && appointmentStartTime) {
    const hoursBeforeAppointment = eventConfig.hoursBeforeAppointment ?? 24;
    const msBeforeAppointment = hoursBeforeAppointment * 60 * 60 * 1000;
    return new Date(new Date(appointmentStartTime).getTime() - msBeforeAppointment);
  }

  // ALL OTHER EVENTS: schedule AFTER event trigger time
  const delayMinutes = eventConfig.delayMinutes ?? 0;
  if (delayMinutes === 0) {
    return null;  // IMMEDIATE - no scheduling
  }
  
  return new Date(triggerTime.getTime() + (delayMinutes * 60 * 1000));
}
```

---

## Appointment Lifecycle: With Dynamic Delays

### EVENT 1: BOOKING CREATED

**Where:** `appointment.controller.js` → `createAppointment()`

```javascript
export async function createAppointment(req, res) {
  try {
    const appointmentData = req.body;
    const saved = await Appointment.create(appointmentData);

    // Get clinic settings
    const settings = await WhatsAppSettings.findOne({});
    const appointmentTime = new Date(appointmentData.start_time);
    const now = new Date();

    // QUEUE: appointmentBooked
    if (settings?.events?.appointmentBooked?.enabled) {
      const bookedScheduledAt = calculateScheduledTime(
        settings, 'appointmentBooked', now, null
      );
      // Line 756-759: delayMinutes default is 0 = IMMEDIATE
      
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        'appointmentBooked',
        appointmentData.patient_phone,
        { /* template variables */ },
        bookedScheduledAt?.toISOString() || null,  // null = send now
        `appointmentBooked-APT-${saved._id}-${req.user.tenantId}`,
        patient._id
      );
    }

    // QUEUE: appointmentReminder
    if (settings?.events?.appointmentReminder?.enabled) {
      const reminderScheduledAt = calculateScheduledTime(
        settings,
        'appointmentReminder',
        now,
        appointmentTime  // ← Pass appointment time for calculation
      );
      // Line 748-751: hoursBeforeAppointment default is 24
      // scheduledAt = appointmentTime - (24 * 3600000 ms)
      
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        'appointmentReminder',
        appointmentData.patient_phone,
        { /* template variables */ },
        reminderScheduledAt.toISOString(),  // Calculated from settings
        `appointmentReminder-APT-${saved._id}-${req.user.tenantId}`,
        patient._id
      );
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### EVENT 2: APPOINTMENT RESCHEDULED

**Where:** `appointment.controller.js` → `rescheduleAppointment()`

```javascript
export async function rescheduleAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const { start_time: newStartTime } = req.body;

    const oldAppointment = await Appointment.findById(appointmentId);
    const updated = await Appointment.findByIdAndUpdate(
      appointmentId,
      { start_time: newStartTime },
      { new: true }
    );

    const settings = await WhatsAppSettings.findOne({});
    const now = new Date();

    // QUEUE: appointmentRescheduled
    if (settings?.events?.appointmentRescheduled?.enabled) {
      const rescheduledScheduledAt = calculateScheduledTime(
        settings, 'appointmentRescheduled', now, null
      );
      // delayMinutes from settings (default 0 = IMMEDIATE)
      
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        'appointmentRescheduled',
        oldAppointment.patient_phone,
        { /* template variables with oldTime, newTime */ },
        rescheduledScheduledAt?.toISOString() || null,
        `appointmentRescheduled-APT-${appointmentId}-${req.user.tenantId}`,
        oldAppointment.patient_id
      );
    }

    // QUEUE: NEW appointmentReminder (for new time)
    if (settings?.events?.appointmentReminder?.enabled) {
      const newReminderScheduledAt = calculateScheduledTime(
        settings,
        'appointmentReminder',
        now,
        newStartTime  // ← NEW appointment time
      );
      
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        'appointmentReminder',
        oldAppointment.patient_phone,
        { /* template variables */ },
        newReminderScheduledAt.toISOString(),
        `appointmentReminder-APT-${appointmentId}-NEW-${req.user.tenantId}`,
        oldAppointment.patient_id
      );
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### EVENT 3: APPOINTMENT CANCELLED

**Where:** `appointment.controller.js` → `cancelAppointment()`

```javascript
export async function cancelAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    const updated = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: 'Cancelled', cancellation_reason: reason, cancelled_at: new Date() },
      { new: true }
    );

    const settings = await WhatsAppSettings.findOne({});
    const now = new Date();

    // QUEUE: appointmentCancelled
    if (settings?.events?.appointmentCancelled?.enabled) {
      const cancelledScheduledAt = calculateScheduledTime(
        settings, 'appointmentCancelled', now, null
      );
      // delayMinutes from settings (default 0 = IMMEDIATE)
      
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        'appointmentCancelled',
        appointment.patient_phone,
        { /* template variables */ },
        cancelledScheduledAt?.toISOString() || null,
        `appointmentCancelled-APT-${appointmentId}-${req.user.tenantId}`,
        appointment.patient_id
      );
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### EVENT 4: APPOINTMENT COMPLETED (Treatment Done)

**Where:** `visit.controller.js` → `markTreatmentComplete()`

Multiple messages can trigger AFTER appointment completion. Each has its own delay setting:

```javascript
export async function markTreatmentComplete(req, res) {
  try {
    const { visitId, treatmentId } = req.params;

    const visit = await Visit.findByIdAndUpdate(
      visitId,
      { 'treatments.$[elem].status': 'Completed' },
      { arrayFilters: [{ 'elem._id': treatmentId }], new: true }
    ).populate('patient_id doctor_id');

    const treatment = visit.treatments.find(t => t._id.toString() === treatmentId);
    const completedAt = new Date();
    const settings = await WhatsAppSettings.findOne({});

    const templateData = {
      name: visit.patient_id.first_name,
      firstName: visit.patient_id.first_name,
      treatment: treatment.treatment_name,
      teethNumbers: treatment.teeth_numbers?.join(', ') || 'Multiple',
      date: completedAt.toLocaleDateString('en-IN'),
      doctorName: visit.doctor_id?.name || 'Doctor',
      patientId: visit.patient_id.patientId,
      mobile: visit.patient_id.mobile,
    };

    // MESSAGE 1: appointmentCompleted
    // Line 25: Part of MUTEX_GROUP - only ONE can be active at a time
    if (settings?.events?.appointmentCompleted?.enabled) {
      const scheduledAt = calculateScheduledTime(
        settings, 'appointmentCompleted', completedAt, null
      );
      // delayMinutes from settings (default 0)
      
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        'appointmentCompleted',
        visit.patient_id.mobile,
        templateData,
        scheduledAt?.toISOString() || null,
        `appointmentCompleted-APT-${visit.appointment_id}-${req.user.tenantId}`,
        visit.patient_id._id
      );
    }
    // MESSAGE 2: treatmentScheduled
    else if (settings?.events?.treatmentScheduled?.enabled) {
      const scheduledAt = calculateScheduledTime(
        settings, 'treatmentScheduled', completedAt, null
      );
      
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        'treatmentScheduled',
        visit.patient_id.mobile,
        templateData,
        scheduledAt?.toISOString() || null,
        `treatmentScheduled-TREAT-${treatmentId}-${req.user.tenantId}`,
        visit.patient_id._id
      );
    }

    // MESSAGE 3: postCare Journey (multi-step with individual delays)
    if (settings?.events?.postCare?.enabled) {
      await triggerJourneyWithDynamicScheduling(
        req.tenantModels,
        req.user.tenantId,
        process.env.WAAPI_BASE_URL,
        visit.patient_id.mobile,
        treatment.treatment_name,
        completedAt,
        templateData,
        visit.patient_id._id
      );
    }

    res.json(visit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### EVENT 5: INVOICE GENERATED

**Where:** `invoice.controller.js` → `createInvoice()`

```javascript
export async function createInvoice(req, res) {
  try {
    const invoice = await Invoice.create(req.body);
    const patient = await Patient.findById(invoice.patient_id);
    const settings = await WhatsAppSettings.findOne({});
    const now = new Date();

    const templateData = {
      name: patient.first_name,
      firstName: patient.first_name,
      invoiceId: invoice.invoice_id,
      amount: invoice.total_amount,
      paidAmount: invoice.paid_amount,
      pendingAmount: invoice.pending_amount,
      paymentMethod: invoice.payment_method,
      patientId: patient.patientId,
      mobile: patient.contact.mobile,
    };

    // QUEUE: invoiceGenerated
    // Line 756-759: delayMinutes from settings
    if (settings?.events?.invoiceGenerated?.enabled) {
      const scheduledAt = calculateScheduledTime(
        settings, 'invoiceGenerated', now, null
      );
      
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        'invoiceGenerated',
        patient.contact.mobile,
        templateData,
        scheduledAt?.toISOString() || null,
        `invoiceGenerated-INV-${invoice._id}-${req.user.tenantId}`,
        patient._id
      );
    }

    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### EVENT 6: PRESCRIPTION ISSUED

**Where:** `visit.controller.js` → `addPrescription()`

```javascript
export async function addPrescription(req, res) {
  try {
    const { visitId } = req.params;
    const { prescription } = req.body;

    const visit = await Visit.findByIdAndUpdate(
      visitId,
      { $push: { prescriptions: prescription } },
      { new: true }
    ).populate('patient_id doctor_id');

    const patient = visit.patient_id;
    const settings = await WhatsAppSettings.findOne({});
    const now = new Date();

    const templateData = {
      name: patient.first_name,
      firstName: patient.first_name,
      drug: prescription.drug_name,
      dosage: prescription.dosage,
      duration: prescription.duration,
      instructions: prescription.instructions,
      prescriptionUrl: prescription.file_url || 'https://...',
      patientId: patient.patientId,
      mobile: patient.contact.mobile,
    };

    // QUEUE: prescriptionIssued
    // Line 756-759: delayMinutes from settings
    if (settings?.events?.prescriptionIssued?.enabled) {
      const scheduledAt = calculateScheduledTime(
        settings, 'prescriptionIssued', now, null
      );
      
      await queueScheduledMessage(
        req.tenantModels,
        req.user.tenantId,
        'prescriptionIssued',
        patient.contact.mobile,
        templateData,
        scheduledAt?.toISOString() || null,
        `prescriptionIssued-PRX-${prescription._id}-${req.user.tenantId}`,
        patient._id
      );
    }

    res.json(visit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

## Post-Care Journey: Dynamic Per-Step Scheduling

**File:** `dms_backend/services/whatsapp.service.js` — ADD THIS:

```javascript
/**
 * Trigger post-care journey with dynamic delays from TreatmentJourney config
 * Each step has its OWN delay configured in Journey Editor
 */
export async function triggerJourneyWithDynamicScheduling(
  tenantModels,
  tenantId,
  waapiBaseUrl,
  patientPhone,
  treatmentName,
  completedAt,
  data,
  patientId
) {
  const { TreatmentJourney, WhatsAppSettings } = tenantModels;

  try {
    if (!waapiBaseUrl) return;

    const settings = await WhatsAppSettings.findOne({}).lean();
    if (!settings?.enabled || !settings.events?.postCare?.enabled) return;

    const journey = await TreatmentJourney.findOne({
      treatmentName: { $regex: new RegExp(`^${treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      enabled: true,
    }).lean();

    if (!journey?.messages?.length) return;

    const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };

    // For EACH step in journey, use ITS delay configuration
    for (let stepIdx = 0; stepIdx < journey.messages.length; stepIdx++) {
      const msg = journey.messages[stepIdx];

      // Step's delay: configured in Journey Editor (Line 858-862)
      const delayMs = (msg.delay?.value || 0) * (UNIT_MS[msg.delay?.unit] || UNIT_MS.hours);
      const scheduledAt = new Date(completedAt.getTime() + delayMs);

      console.log(`[WhatsApp] PostCare Step ${stepIdx + 1}: delay=${msg.delay?.value}${msg.delay?.unit}, scheduledAt=${scheduledAt.toISOString()}`);

      await queueScheduledMessage(
        tenantModels,
        tenantId,
        waapiBaseUrl,
        'postCare',
        patientPhone,
        data,
        scheduledAt.toISOString(),
        `postCare-TREAT-${treatmentName}-step${stepIdx + 1}-${patientId}-${tenantId}`,
        patientId
      );
    }
  } catch (err) {
    console.error(`[WhatsApp] Journey trigger failed: ${err.message}`);
  }
}
```

---

## Complete Event → Delay Mapping Table

| Event | Trigger | Delay Source | Calculation |
|-------|---------|--------------|-------------|
| **appointmentBooked** | Appointment created | `events.appointmentBooked.delayMinutes` | `now + delayMinutes` |
| **appointmentReminder** | Appointment created | `events.appointmentReminder.hoursBeforeAppointment` | `appointmentTime - hoursBeforeAppointment` |
| **appointmentRescheduled** | Appointment rescheduled | `events.appointmentRescheduled.delayMinutes` | `now + delayMinutes` |
| **appointmentCancelled** | Appointment cancelled | `events.appointmentCancelled.delayMinutes` | `now + delayMinutes` |
| **appointmentCompleted** | Treatment marked complete | `events.appointmentCompleted.delayMinutes` | `completedAt + delayMinutes` |
| **treatmentScheduled** | Treatment marked complete | `events.treatmentScheduled.delayMinutes` | `completedAt + delayMinutes` |
| **invoiceGenerated** | Invoice created | `events.invoiceGenerated.delayMinutes` | `now + delayMinutes` |
| **prescriptionIssued** | Prescription added | `events.prescriptionIssued.delayMinutes` | `now + delayMinutes` |
| **postCare Step 1** | Treatment completed | `journey.messages[0].delay` | `completedAt + delay` |
| **postCare Step 2** | Treatment completed | `journey.messages[1].delay` | `completedAt + delay` |
| **postCare Step 3** | Treatment completed | `journey.messages[2].delay` | `completedAt + delay` |

---

## Code Flow Diagram

```
USER CONFIGURES IN FRONTEND (WhatsAppPage.jsx)
│
├─ appointmentReminder:
│  └─ Input: "Send X hours before appointment"
│     Storage: { hoursBeforeAppointment: 24 }
│
├─ invoiceGenerated:
│  └─ Input: "Delay X minutes after invoice created"
│     Storage: { delayMinutes: 30 }
│
└─ postCare Journey:
   └─ For each step:
      Input: "Step 1: Delay X hours after treatment"
      Storage: { delay: { value: 1, unit: 'hours' } }

SAVED TO DATABASE (WhatsAppSettings collection)
│
⬇️
│
BACKEND EVENT TRIGGERS
│
├─ appointmentCreate()
│  ├─ GET settings.events.appointmentBooked.delayMinutes
│  ├─ scheduledAt = now + delayMinutes (default 0 = immediate)
│  ├─ GET settings.events.appointmentReminder.hoursBeforeAppointment
│  ├─ scheduledAt = appointmentTime - hoursBeforeAppointment
│  └─ SEND TO WAAPI with 2 scheduledAt values
│
├─ invoiceCreate()
│  ├─ GET settings.events.invoiceGenerated.delayMinutes
│  ├─ scheduledAt = now + delayMinutes
│  └─ SEND TO WAAPI with scheduledAt
│
├─ treatmentComplete()
│  ├─ GET settings.events.appointmentCompleted.delayMinutes OR
│  ├─ GET settings.events.treatmentScheduled.delayMinutes
│  ├─ scheduledAt = completedAt + delayMinutes
│  ├─ GET settings.events.postCare.enabled
│  ├─ FOR EACH journey step:
│  │  ├─ GET journey.messages[i].delay.value & unit
│  │  ├─ scheduledAt = completedAt + delay
│  │  └─ SEND TO WAAPI
│  └─ SEND ALL TO WAAPI
│
WAAPI RECEIVES PAYLOADS
│
Each payload:
{
  tenantId: "...",
  to: "918104489957",
  message: "...",
  messageType: "appointmentBooked|invoiceGenerated|postCare|...",
  scheduledAt: "2026-04-27T10:30:00Z",  // ← From backend calculation
  idempotencyKey: "..."
}

WAAPI QUEUES
│
├─ Status: queued
├─ scheduledAt: 2026-04-27T10:30:00Z
└─ At scheduled time: SENDS TO PATIENT
```

---

## Implementation Checklist

- [ ] Add `calculateScheduledTime()` function to whatsapp.service.js
- [ ] Add `triggerJourneyWithDynamicScheduling()` to whatsapp.service.js
- [ ] Update `createAppointment()` to read and use delays
- [ ] Update `rescheduleAppointment()` to read and use delays
- [ ] Add `cancelAppointment()` to read and use delays
- [ ] Update `markTreatmentComplete()` to handle ALL message types (not just postCare)
- [ ] Update `createInvoice()` to read and use delays
- [ ] Update `addPrescription()` to read and use delays
- [ ] Create templates for appointmentRescheduled, appointmentCancelled
- [ ] Test each message type with different delay values

---

## Testing: Verify Delays Are Applied

### Test 1: Frontend Configuration
```
1. Go to WhatsApp → Messages
2. Select "Invoice" event
3. Set: Enable + Delay 45 minutes
4. Save
```

### Test 2: Check Database
```
db.whatsappsettings.findOne({})
// Should show:
{
  events: {
    invoiceGenerated: {
      enabled: true,
      delayMinutes: 45
    }
  }
}
```

### Test 3: Trigger Event with Delay
```
Create an invoice at: 2026-04-27 10:00 AM

BACKEND should:
1. Fetch settings → invoiceGenerated.delayMinutes = 45
2. Calculate: scheduledAt = 10:00 AM + 45 min = 10:45 AM
3. Send to WAAPI:
   {
     messageType: "invoiceGenerated",
     scheduledAt: "2026-04-27T10:45:00Z"
   }
```

### Test 4: Check WAAPI
```
Query WAAPI for messages:
{
  type: "invoiceGenerated",
  status: "queued",
  scheduledAt: "2026-04-27T10:45:00Z"  // ← Matches our calculation
}
```

---

## Summary

✅ **Dynamic delays are configured in frontend**
✅ **Stored in WhatsAppSettings.events[eventType].delayMinutes or hoursBeforeAppointment**
✅ **Backend reads settings when event triggers**
✅ **Backend calculates scheduledAt based on settings**
✅ **All message types (not just postCare) respect delays**
✅ **Each event has its own delay configuration**
✅ **PostCare journey has per-step delays from Journey Editor**

The key function is `calculateScheduledTime()` which reads settings and returns the proper scheduledAt timestamp for WAAPI.

