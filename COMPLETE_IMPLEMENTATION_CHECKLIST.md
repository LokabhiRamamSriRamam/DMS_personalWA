# Complete Implementation Checklist: Dynamic Message Scheduling

## Overview

Implement **dynamic, delayed message scheduling** for ALL WhatsApp message types based on frontend configurations. Every message respects the delay settings configured by the clinic admin.

```
FRONTEND CONFIG → BACKEND TIMING → WAAPI SCHEDULING → PATIENT DELIVERY

Examples:
- "Send invoice reminder 30 minutes after invoice created"
- "Send appointment reminder 24 hours before appointment"
- "Send post-care step 1 after 1 hour of treatment completion"
```

---

## Phase 1: Core Scheduling Function (2 hours)

### Task 1.1: Add `calculateScheduledTime()` Function

**File:** `dms_backend/services/whatsapp.service.js`

**What to add:** (Lines ~175-220)

```javascript
/**
 * Calculate when a message should be scheduled based on event settings
 * Reads from WhatsAppSettings.events[eventType]
 * 
 * @param {object} settings - WhatsAppSettings document
 * @param {string} eventType - 'appointmentReminder', 'invoiceGenerated', etc.
 * @param {Date} triggerTime - When the event occurred (now)
 * @param {Date} appointmentStartTime - (Optional) For appointmentReminder only
 * @returns {Date|null} - When to schedule (null = IMMEDIATE)
 */
export function calculateScheduledTime(
  settings,
  eventType,
  triggerTime,
  appointmentStartTime
) {
  const eventConfig = settings?.events?.[eventType];
  if (!eventConfig?.enabled) return null;

  // SPECIAL CASE: appointmentReminder
  // Frontend: "Send X hours BEFORE appointment"
  // Storage: { hoursBeforeAppointment: 24 }
  // Calculation: appointmentTime - (X * 3600000 ms)
  if (eventType === 'appointmentReminder' && appointmentStartTime) {
    const hoursBeforeAppointment = eventConfig.hoursBeforeAppointment ?? 24;
    const msBeforeAppointment = hoursBeforeAppointment * 60 * 60 * 1000;
    const scheduledAt = new Date(
      new Date(appointmentStartTime).getTime() - msBeforeAppointment
    );
    console.log(`[WhatsApp:Timing] appointmentReminder: ${hoursBeforeAppointment}h before appointment → ${scheduledAt.toISOString()}`);
    return scheduledAt;
  }

  // ALL OTHER EVENTS
  // Frontend: "Delay X minutes after event"
  // Storage: { delayMinutes: 30 }
  // Calculation: now + (X * 60000 ms)
  const delayMinutes = eventConfig.delayMinutes ?? 0;
  
  if (delayMinutes === 0) {
    console.log(`[WhatsApp:Timing] ${eventType}: No delay, sending immediately`);
    return null;  // IMMEDIATE
  }

  const scheduledAt = new Date(triggerTime.getTime() + (delayMinutes * 60 * 1000));
  console.log(`[WhatsApp:Timing] ${eventType}: ${delayMinutes}min delay → ${scheduledAt.toISOString()}`);
  return scheduledAt;
}
```

**Test it:**
```javascript
const settings = {
  events: {
    appointmentReminder: { enabled: true, hoursBeforeAppointment: 24 },
    invoiceGenerated: { enabled: true, delayMinutes: 30 },
  }
};

const appointmentTime = new Date('2026-04-27T14:00:00Z');
const now = new Date('2026-04-27T10:00:00Z');

// Test 1: Appointment reminder
const reminderTime = calculateScheduledTime(settings, 'appointmentReminder', now, appointmentTime);
console.log(reminderTime); // Should be: 2026-04-26T14:00:00Z (24h before)

// Test 2: Invoice with delay
const invoiceTime = calculateScheduledTime(settings, 'invoiceGenerated', now);
console.log(invoiceTime); // Should be: 2026-04-27T10:30:00Z (30min after)
```

---

### Task 1.2: Update `queueScheduledMessage()` Function

**File:** `dms_backend/services/whatsapp.service.js`

**What to update:** Add `calculateScheduledTime()` call inside:

```javascript
export async function queueScheduledMessage(
  tenantModels,
  tenantId,
  waapiBaseUrl,
  eventType,
  patientPhone,
  data,
  scheduledAt,  // ← Can be pre-calculated OR null
  idempotencyKey,
  patientId,
  language
) {
  const { WhatsAppLog, WhatsAppSettings } = tenantModels;

  try {
    if (!waapiBaseUrl) return null;

    // Build message from template
    const payload = await buildMessage(tenantModels, tenantId, eventType, data, language);
    if (!payload) return null;

    payload.to = patientPhone;
    
    // Add scheduledAt if provided
    if (scheduledAt) {
      payload.scheduledAt = scheduledAt;
    }

    // Send to WAAPI
    const waapiPayload = {
      tenantId,
      to: patientPhone,
      message: payload.content?.text || JSON.stringify(payload.content),
      messageType: eventType,
      scheduledAt: scheduledAt || null,
      idempotencyKey,
    };

    console.log(`[WhatsApp:Queue] ${eventType} → ${patientPhone}, scheduledAt=${scheduledAt || 'NOW'}`);
    const waapiResponse = await sendToWAAPI(waapiPayload, waapiBaseUrl);

    // Log the message
    await WhatsAppLog.create({
      patientId,
      event: eventType,
      to: patientPhone,
      payload,
      status: 'scheduled',
      sentAt: new Date(),
    }).catch(err => {
      console.error(`[WhatsApp:Log] Failed to create log: ${err.message}`);
    });

    return {
      messageId: waapiResponse.messageId,
      idempotencyKey,
      scheduledFor: scheduledAt,
    };
  } catch (err) {
    console.error(`[WhatsApp:Queue] ${eventType} failed: ${err.message}`);
    return null;
  }
}
```

---

### Task 1.3: Add `triggerJourneyWithDynamicScheduling()` Function

**File:** `dms_backend/services/whatsapp.service.js`

**What to add:** (New function, lines ~280-340)

```javascript
/**
 * Trigger post-care journey with per-step delays from Journey Editor
 * Each step's delay is configured individually: Step 1 = 1h, Step 2 = 24h, etc.
 */
export async function triggerJourneyWithDynamicScheduling(
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
  const { TreatmentJourney, WhatsAppSettings } = tenantModels;

  try {
    if (!waapiBaseUrl) return;

    const settings = await WhatsAppSettings.findOne({}).lean();
    if (!settings?.enabled || !settings.events?.postCare?.enabled) return;

    const journey = await TreatmentJourney.findOne({
      treatmentName: { $regex: new RegExp(`^${treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      enabled: true,
    }).lean();

    if (!journey?.messages?.length) {
      console.log(`[WhatsApp:Journey] No journey found for ${treatmentName}`);
      return;
    }

    const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };

    // For EACH step in journey
    for (let stepIdx = 0; stepIdx < journey.messages.length; stepIdx++) {
      const msg = journey.messages[stepIdx];

      // Step's delay: configured in Journey Editor
      // Example: { delay: { value: 1, unit: 'hours' } }
      const delayMs = (msg.delay?.value || 0) * (UNIT_MS[msg.delay?.unit] || UNIT_MS.hours);
      const scheduledAt = new Date(completedAt.getTime() + delayMs);

      console.log(`[WhatsApp:Journey] ${treatmentName} Step ${stepIdx + 1}: delay=${msg.delay?.value}${msg.delay?.unit}, scheduledAt=${scheduledAt.toISOString()}`);

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
      if (!langVariant) {
        console.log(`[WhatsApp:Journey] Step ${stepIdx + 1}: No content found, skipping`);
        continue;
      }

      // Queue this step
      await queueScheduledMessage(
        tenantModels,
        tenantId,
        waapiBaseUrl,
        'postCare',
        patientPhone,
        data,
        scheduledAt.toISOString(),
        `postCare-TREAT-${treatmentName}-step${stepIdx + 1}-${patientId}-${tenantId}`,
        patientId,
        language
      );
    }

    console.log(`[WhatsApp:Journey] Queued ${journey.messages.length} steps for ${treatmentName}`);
  } catch (err) {
    console.error(`[WhatsApp:Journey] Error: ${err.message}`);
  }
}
```

---

## Phase 2: Update Appointment Controller (3 hours)

### Task 2.1: Update `createAppointment()`

**File:** `dms_backend/controllers/appointment.controller.js`

**What to modify:** (Around createAppointment function)

```javascript
export async function createAppointment(req, res) {
  try {
    const { patient_id, doctor_id, patient_phone, start_time, ...rest } = req.body;

    const saved = await Appointment.create({
      patient_id,
      doctor_id,
      patient_phone,
      start_time,
      ...rest,
      status: 'Scheduled',
    });

    // Get settings & patient data
    const settings = await req.tenantModels.WhatsAppSettings.findOne({});
    const patient = await req.tenantModels.Patient.findById(patient_id);
    const doctor = await req.tenantModels.Doctor.findById(doctor_id);

    if (settings?.enabled && patient_phone && patient && doctor) {
      const appointmentTime = new Date(start_time);
      const now = new Date();

      const templateData = {
        name: patient.first_name,
        firstName: patient.first_name,
        date: appointmentTime.toLocaleDateString('en-IN'),
        time: appointmentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        doctorName: doctor.name,
        doctorSpecialization: doctor.specialization,
        appointmentType: rest.type || 'General',
        roomNumber: rest.room_number || '-',
        tokenNumber: rest.token_number || '-',
        patientId: patient.patientId,
        mobile: patient_phone,
      };

      // IMPORT: calculateScheduledTime from services/whatsapp.service.js
      const { calculateScheduledTime } = await import('../services/whatsapp.service.js');

      // MESSAGE 1: appointmentBooked
      if (settings.events?.appointmentBooked?.enabled) {
        const bookedScheduledAt = calculateScheduledTime(
          settings, 'appointmentBooked', now, null
        );

        await queueScheduledMessage(
          req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
          'appointmentBooked', patient_phone, templateData,
          bookedScheduledAt?.toISOString() || null,
          `appointmentBooked-APT-${saved._id}-${req.user.tenantId}`,
          patient_id, 'en'
        );
      }

      // MESSAGE 2: appointmentReminder
      if (settings.events?.appointmentReminder?.enabled) {
        const reminderScheduledAt = calculateScheduledTime(
          settings, 'appointmentReminder', now, appointmentTime
        );

        await queueScheduledMessage(
          req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
          'appointmentReminder', patient_phone, templateData,
          reminderScheduledAt?.toISOString() || null,
          `appointmentReminder-APT-${saved._id}-${req.user.tenantId}`,
          patient_id, 'en'
        );
      }
    }

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### Task 2.2: Add `rescheduleAppointment()`

**File:** `dms_backend/controllers/appointment.controller.js`

**What to add:** (New function)

```javascript
export async function rescheduleAppointment(req, res) {
  try {
    const { id } = req.params;
    const { start_time: newStartTime } = req.body;

    const oldAppointment = await req.tenantModels.Appointment.findById(id);
    if (!oldAppointment) return res.status(404).json({ error: 'Appointment not found' });

    const updated = await req.tenantModels.Appointment.findByIdAndUpdate(
      id,
      { start_time: newStartTime },
      { new: true }
    );

    const settings = await req.tenantModels.WhatsAppSettings.findOne({});
    const patient = await req.tenantModels.Patient.findById(oldAppointment.patient_id);
    const doctor = await req.tenantModels.Doctor.findById(oldAppointment.doctor_id);

    if (settings?.enabled && oldAppointment.patient_phone && patient && doctor) {
      const oldTime = new Date(oldAppointment.start_time);
      const newTime = new Date(newStartTime);
      const now = new Date();

      const templateData = {
        name: patient.first_name,
        firstName: patient.first_name,
        oldDate: oldTime.toLocaleDateString('en-IN'),
        oldTime: oldTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        newDate: newTime.toLocaleDateString('en-IN'),
        newTime: newTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        date: newTime.toLocaleDateString('en-IN'),
        time: newTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        doctorName: doctor.name,
        patientId: patient.patientId,
        mobile: oldAppointment.patient_phone,
      };

      const { calculateScheduledTime } = await import('../services/whatsapp.service.js');

      // MESSAGE 1: appointmentRescheduled
      if (settings.events?.appointmentRescheduled?.enabled) {
        const reschedScheduledAt = calculateScheduledTime(
          settings, 'appointmentRescheduled', now, null
        );

        await queueScheduledMessage(
          req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
          'appointmentRescheduled', oldAppointment.patient_phone, templateData,
          reschedScheduledAt?.toISOString() || null,
          `appointmentRescheduled-APT-${id}-${req.user.tenantId}`,
          oldAppointment.patient_id, 'en'
        );
      }

      // MESSAGE 2: NEW appointmentReminder (for new time)
      if (settings.events?.appointmentReminder?.enabled) {
        const newReminderScheduledAt = calculateScheduledTime(
          settings, 'appointmentReminder', now, newTime
        );

        await queueScheduledMessage(
          req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
          'appointmentReminder', oldAppointment.patient_phone, templateData,
          newReminderScheduledAt?.toISOString() || null,
          `appointmentReminder-APT-${id}-NEW-${req.user.tenantId}`,
          oldAppointment.patient_id, 'en'
        );
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### Task 2.3: Add `cancelAppointment()`

**File:** `dms_backend/controllers/appointment.controller.js`

**What to add:** (New function)

```javascript
export async function cancelAppointment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await req.tenantModels.Appointment.findById(id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const updated = await req.tenantModels.Appointment.findByIdAndUpdate(
      id,
      {
        status: 'Cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date(),
      },
      { new: true }
    );

    const settings = await req.tenantModels.WhatsAppSettings.findOne({});
    const patient = await req.tenantModels.Patient.findById(appointment.patient_id);
    const doctor = await req.tenantModels.Doctor.findById(appointment.doctor_id);

    if (settings?.enabled && appointment.patient_phone && patient && doctor) {
      const appointmentTime = new Date(appointment.start_time);
      const now = new Date();

      const templateData = {
        name: patient.first_name,
        firstName: patient.first_name,
        date: appointmentTime.toLocaleDateString('en-IN'),
        time: appointmentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        doctorName: doctor.name,
        reason: reason || 'No reason provided',
        patientId: patient.patientId,
        mobile: appointment.patient_phone,
      };

      const { calculateScheduledTime } = await import('../services/whatsapp.service.js');

      if (settings.events?.appointmentCancelled?.enabled) {
        const cancelScheduledAt = calculateScheduledTime(
          settings, 'appointmentCancelled', now, null
        );

        await queueScheduledMessage(
          req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
          'appointmentCancelled', appointment.patient_phone, templateData,
          cancelScheduledAt?.toISOString() || null,
          `appointmentCancelled-APT-${id}-${req.user.tenantId}`,
          appointment.patient_id, 'en'
        );
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### Task 2.4: Update Routes

**File:** `dms_backend/routes/appointment.routes.js`

**What to add:**

```javascript
// Add these routes:
router.patch('/:id/reschedule', rescheduleAppointment);
router.patch('/:id/cancel', cancelAppointment);
```

**What to export from controller:**

```javascript
export {
  // ... existing exports
  rescheduleAppointment,
  cancelAppointment,
};
```

---

## Phase 3: Update Treatment Completion (2 hours)

### Task 3.1: Update `markTreatmentComplete()`

**File:** `dms_backend/controllers/visit.controller.js`

**What to modify:** (In markTreatmentComplete function)

```javascript
export async function markTreatmentComplete(req, res) {
  try {
    const { visitId, treatmentId } = req.params;

    const visit = await req.tenantModels.Visit.findByIdAndUpdate(
      visitId,
      { 'treatments.$[elem].status': 'Completed' },
      { arrayFilters: [{ 'elem._id': treatmentId }], new: true }
    ).populate('patient_id doctor_id appointment_id');

    const treatment = visit.treatments.find(t => t._id.toString() === treatmentId);
    const completedAt = new Date();
    const settings = await req.tenantModels.WhatsAppSettings.findOne({});

    if (settings?.enabled && visit.patient_id?.mobile) {
      const { calculateScheduledTime, triggerJourneyWithDynamicScheduling } = 
        await import('../services/whatsapp.service.js');

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

      // Check MUTEX_GROUP: only ONE can be active (Line 25 in frontend)
      // appointmentCompleted, invoiceGenerated, invoiceAndPrescription, prescriptionIssued, treatmentScheduled

      // MESSAGE 1: appointmentCompleted
      if (settings.events?.appointmentCompleted?.enabled) {
        const scheduledAt = calculateScheduledTime(
          settings, 'appointmentCompleted', completedAt, null
        );

        await queueScheduledMessage(
          req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
          'appointmentCompleted', visit.patient_id.mobile, templateData,
          scheduledAt?.toISOString() || null,
          `appointmentCompleted-APT-${visit.appointment_id}-${req.user.tenantId}`,
          visit.patient_id._id, 'en'
        );
      }
      // MESSAGE 1 (MUTEX): treatmentScheduled (if appointmentCompleted disabled)
      else if (settings.events?.treatmentScheduled?.enabled) {
        const scheduledAt = calculateScheduledTime(
          settings, 'treatmentScheduled', completedAt, null
        );

        await queueScheduledMessage(
          req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
          'treatmentScheduled', visit.patient_id.mobile, templateData,
          scheduledAt?.toISOString() || null,
          `treatmentScheduled-TREAT-${treatmentId}-${req.user.tenantId}`,
          visit.patient_id._id, 'en'
        );
      }

      // MESSAGE 2: postCare Journey (independent of mutex, can run alongside)
      if (settings.events?.postCare?.enabled) {
        await triggerJourneyWithDynamicScheduling(
          req.tenantModels,
          req.user.tenantId,
          process.env.WAAPI_BASE_URL,
          visit.patient_id.mobile,
          treatment.treatment_name,
          completedAt,
          templateData,
          visit.patient_id._id,
          'en'
        );
      }
    }

    res.json(visit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

## Phase 4: Update Invoice & Prescription Controllers (2 hours)

### Task 4.1: Update `createInvoice()`

**File:** `dms_backend/controllers/invoice.controller.js`

**What to modify:**

```javascript
export async function createInvoice(req, res) {
  try {
    const invoice = await req.tenantModels.Invoice.create(req.body);
    const patient = await req.tenantModels.Patient.findById(invoice.patient_id);
    const settings = await req.tenantModels.WhatsAppSettings.findOne({});

    if (settings?.enabled && patient?.contact?.mobile) {
      const { calculateScheduledTime } = await import('../services/whatsapp.service.js');

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

      // MUTEX: invoiceGenerated, invoiceAndPrescription, prescriptionIssued
      if (settings.events?.invoiceGenerated?.enabled) {
        const scheduledAt = calculateScheduledTime(
          settings, 'invoiceGenerated', now, null
        );

        await queueScheduledMessage(
          req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
          'invoiceGenerated', patient.contact.mobile, templateData,
          scheduledAt?.toISOString() || null,
          `invoiceGenerated-INV-${invoice._id}-${req.user.tenantId}`,
          patient._id, 'en'
        );
      }
    }

    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

### Task 4.2: Update `addPrescription()`

**File:** `dms_backend/controllers/visit.controller.js`

**What to modify:**

```javascript
export async function addPrescription(req, res) {
  try {
    const { visitId } = req.params;
    const { prescription } = req.body;

    const visit = await req.tenantModels.Visit.findByIdAndUpdate(
      visitId,
      { $push: { prescriptions: prescription } },
      { new: true }
    ).populate('patient_id');

    const patient = visit.patient_id;
    const settings = await req.tenantModels.WhatsAppSettings.findOne({});

    if (settings?.enabled && patient?.contact?.mobile) {
      const { calculateScheduledTime } = await import('../services/whatsapp.service.js');

      const now = new Date();
      const templateData = {
        name: patient.first_name,
        firstName: patient.first_name,
        drug: prescription.drug_name,
        dosage: prescription.dosage,
        duration: prescription.duration,
        instructions: prescription.instructions,
        prescriptionUrl: prescription.file_url || '',
        patientId: patient.patientId,
        mobile: patient.contact.mobile,
      };

      // MUTEX: invoiceGenerated, invoiceAndPrescription, prescriptionIssued
      if (settings.events?.prescriptionIssued?.enabled) {
        const scheduledAt = calculateScheduledTime(
          settings, 'prescriptionIssued', now, null
        );

        await queueScheduledMessage(
          req.tenantModels, req.user.tenantId, process.env.WAAPI_BASE_URL,
          'prescriptionIssued', patient.contact.mobile, templateData,
          scheduledAt?.toISOString() || null,
          `prescriptionIssued-PRX-${prescription._id}-${req.user.tenantId}`,
          patient._id, 'en'
        );
      }
    }

    res.json(visit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

---

## Phase 5: Testing (4 hours)

### Test 1: Appointment Lifecycle

```bash
# 1. Create appointment with reminder set to 24h
curl -X POST http://localhost:5000/api/appointments \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "patient_id": "...",
    "patient_phone": "+919876543210",
    "start_time": "2026-04-28T14:00:00Z"
  }'

# Check WAAPI:
# - appointmentBooked: scheduledAt = null (immediate)
# - appointmentReminder: scheduledAt = 2026-04-27T14:00:00Z (24h before)

# 2. Reschedule to 2h later
curl -X PATCH http://localhost:5000/api/appointments/APT_ID/reschedule \
  -H "Authorization: Bearer TOKEN" \
  -d '{ "start_time": "2026-04-28T16:00:00Z" }'

# Check WAAPI:
# - appointmentRescheduled: scheduledAt = null (immediate)
# - appointmentReminder (NEW): scheduledAt = 2026-04-27T16:00:00Z (new time -24h)

# 3. Cancel
curl -X PATCH http://localhost:5000/api/appointments/APT_ID/cancel \
  -H "Authorization: Bearer TOKEN" \
  -d '{ "reason": "Patient request" }'

# Check WAAPI:
# - appointmentCancelled: scheduledAt = null (immediate)
```

### Test 2: Treatment Completion with Post-Care

```bash
# 1. Mark treatment complete
curl -X PATCH http://localhost:5000/api/visits/VISIT_ID/treatments/TREAT_ID/status \
  -H "Authorization: Bearer TOKEN" \
  -d '{ "status": "Completed" }'

# Check WAAPI:
# - appointmentCompleted OR treatmentScheduled: with delay from settings
# - postCare Step 1: scheduledAt = completedAt + 1h
# - postCare Step 2: scheduledAt = completedAt + 24h
# - postCare Step 3: scheduledAt = completedAt + 48h
```

### Test 3: Invoice with Delay

```bash
# 1. Create invoice with 30-minute delay
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer TOKEN" \
  -d '{...}'

# Check WAAPI:
# - invoiceGenerated: scheduledAt = now + 30min
```

---

## Success Criteria

- [ ] All message types respect frontend delay settings
- [ ] `calculateScheduledTime()` correctly reads settings and calculates delays
- [ ] `appointmentReminder` uses `hoursBeforeAppointment` (hours before, not delay)
- [ ] All other events use `delayMinutes` (delay after event)
- [ ] PostCare journey steps use per-step delay from Journey Editor
- [ ] WAAPI receives correct `scheduledAt` timestamp for each message
- [ ] Logs show correct scheduling calculations: `[WhatsApp:Timing]` messages
- [ ] Duplicate detection works via idempotency keys
- [ ] MUTEX group respected (only one of 5 completion messages sends)
- [ ] All message templates created and active in database

---

## Implementation Timeline

| Phase | Tasks | Hours | Status |
|-------|-------|-------|--------|
| 1 | Core functions | 2 | ⬜ |
| 2 | Appointment CRUD | 3 | ⬜ |
| 3 | Treatment completion | 2 | ⬜ |
| 4 | Invoice/Prescription | 2 | ⬜ |
| 5 | Testing | 4 | ⬜ |
| **Total** | | **13** | |

---

## Reference Documents

- **DYNAMIC_MESSAGE_SCHEDULING_GUIDE.md** — Complete flow explanation
- **APPOINTMENT_LIFECYCLE_SCHEDULED_MESSAGES.md** — Lifecycle details
- **WHATSAPP_ROUTES_GUIDE.md** — API reference

---

Start with Phase 1, then move through phases sequentially.

