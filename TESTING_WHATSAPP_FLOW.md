# WhatsApp Integration Testing Plan

## Environment Setup Verification

### 1. Backend Configuration
- [ ] `WAAPI_BASE_URL=http://localhost:3005` in `.env`
- [ ] MongoDB connection pooling active:
  - [ ] `maxPoolSize: 50`, `minPoolSize: 5`
  - [ ] `retryWrites: true`, `retryReads: true`
  - [ ] Heartbeat every 10 seconds
  - [ ] Auto-reconnect on disconnect (5-second retry)
- [ ] Both `analyticsDb.js` and `tenantDb.js` have identical pool settings

### 2. Database Initialization
Before testing, ensure WhatsApp settings exist:
```bash
# In MongoDB Analytics DB:
db.tenants.findOne({ _id: <tenantId> })
# Should have: cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret (for media uploads)

# In Tenant DB, create initial WhatsApp settings:
db.whatsappsettings.insertOne({
  enabled: true,
  defaultLanguage: "en",
  fallbackLanguage: "en",
  events: {
    appointmentBooked: { enabled: true, delayMinutes: 0 },
    appointmentReminder: { enabled: true, hoursBeforeAppointment: 24 },
    appointmentRescheduled: { enabled: false, delayMinutes: 0 },
    appointmentCompleted: { enabled: false, delayMinutes: 0 },
    invoiceGenerated: { enabled: false, delayMinutes: 0 },
    invoiceAndPrescription: { enabled: false, delayMinutes: 0 },
    prescriptionIssued: { enabled: false, delayMinutes: 0 },
    treatmentScheduled: { enabled: false, delayMinutes: 0 },
    postCare: { enabled: false, delayMinutes: 0 }
  }
})

# Create a sample template for appointmentBooked:
db.whatsapptemplates.insertOne({
  event: "appointmentBooked",
  language: "en",
  isActive: true,
  contentType: "text",
  content: { text: "Hi {{name}}, your appointment with Dr. {{doctorName}} is confirmed for {{date}} at {{time}} in room {{roomNumber}}. Token: {{tokenNumber}}" }
})
```

---

## Test Scenario 1: Appointment Booking → Immediate Message + Scheduled Reminder

### Setup
1. Create a test patient with mobile number
2. Create a test doctor
3. Use frontend or API to book an appointment:
   - Date: tomorrow or later (so reminder can be scheduled)
   - Time: any time
   - Patient: test patient
   - Doctor: test doctor

### Expected Behavior
1. **API Response**: Appointment created with `_id`, `status: 'Scheduled'`
2. **WhatsAppLog entries** (check in tenant DB):
   - One entry with `event: 'appointmentBooked'`, `status: 'sent'` (no `scheduledAt`)
   - One entry with `event: 'appointmentReminder'`, `status: 'sent'` or `'scheduled'`
     - `scheduledAt` should equal: `appointment.start_time − 24 hours`
   - Both should have fully-resolved `payload.content.text` (no `{{...}}` tokens)

3. **WAAPI Log** (if running WAAPI on localhost:3005):
   - Two POST requests to `/messages/send`
   - Status codes: 200 or 201
   - Request bodies match the payload

### Verification Steps
```javascript
// In MongoDB tenant DB:
// 1. Check appointment was created
db.appointments.findOne({ _id: ObjectId("...") })

// 2. Check WhatsApp logs
db.whatsapplogs.find({ event: { $in: ["appointmentBooked", "appointmentReminder"] } }).pretty()

// Expected output:
{
  _id: ObjectId(...),
  event: "appointmentBooked",
  to: "+91...",
  payload: {
    tenantId: "...",
    to: "+91...",
    messageType: "appointmentBooked",
    contentType: "text",
    content: { text: "Hi John Doe, your appointment with Dr. Smith..." }
  },
  status: "sent",
  sentAt: ISODate(...)
}
{
  _id: ObjectId(...),
  event: "appointmentReminder",
  to: "+91...",
  payload: { ... },
  status: "sent",
  scheduledAt: ISODate("2026-04-28T10:00:00Z"), // appointment time - 24 hours
  sentAt: ISODate(...)
}
```

### Connection Stability Test
- [ ] Leave the server idle for 30+ minutes
- [ ] Make another appointment booking
- [ ] Verify WhatsApp messages are still queued correctly (no "disconnected" errors in logs)
- [ ] Expected: Connection should auto-reconnect silently with no user action needed

---

## Test Scenario 2: Appointment Rescheduled

### Setup
1. From Test 1, retrieve the booked appointment ID
2. Update the appointment with a new `start_time` via:
   - Frontend: Edit appointment and change date/time
   - API: `PUT /api/appointments/:id` with `{ start_time: "2026-04-29T15:00:00Z" }`

### Expected Behavior
1. **API Response**: Updated appointment with new `start_time`
2. **WhatsAppLog entries**:
   - New entry with `event: 'appointmentRescheduled'`, `status: 'sent'`
   - Payload contains resolved name, new date, new time, doctor name
   - No `scheduledAt` (sends immediately)

### Verification
```javascript
db.whatsapplogs.find({ event: "appointmentRescheduled" }).pretty()
// Should show one entry with new date/time in the content
```

---

## Test Scenario 3: Appointment Completed → Mutex Event

### Setup
1. Create another appointment for today or earlier
2. Change appointment status to `'Completed'` via:
   - Frontend: Appointments page → Status dropdown
   - API: `PATCH /api/appointments/:id/status` with `{ status: "Completed" }`

### Expected Behavior
1. **WhatsAppLog entry**:
   - One entry with `event: 'appointmentCompleted'`
   - Content resolved with patient name, doctor name, date, time

### Verification
```javascript
db.whatsapplogs.find({ event: "appointmentCompleted" }).pretty()
```

---

## Test Scenario 4: Invoice + Prescription → Document Message

### Setup
1. Create an invoice with:
   - Patient: test patient
   - Items: services or medicines
   - Payment recorded
2. Add a prescription to a visit for the same patient

### Expected Behavior
1. **WhatsAppLog entries** (if `invoiceAndPrescription` is enabled):
   - One entry for `event: 'invoiceAndPrescription'` OR two separate entries for `'invoiceGenerated'` + `'prescriptionIssued'`
   - Invoice message: text content with amount, invoice ID
   - Prescription message: document content with Cloudinary URL to PDF

### Verification
```javascript
db.whatsapplogs.find({ event: { $in: ["invoiceGenerated", "prescriptionIssued", "invoiceAndPrescription"] } }).pretty()

// Expected prescription entry:
{
  event: "prescriptionIssued",
  payload: {
    messageType: "prescriptionIssued",
    contentType: "document",
    content: {
      url: "https://res.cloudinary.com/...",
      mimetype: "application/pdf",
      fileName: "Prescription.pdf"
    }
  },
  status: "sent"
}
```

---

## Test Scenario 5: Post-Care Journey (Multi-Step)

### Setup
1. Create a `TreatmentJourney` with:
   - `treatmentName`: "Root Canal"
   - `enabled: true`
   - `messages`: 3 steps with different delays (e.g., 1 hour, 1 day, 3 days)
   - Each step has language variants with content

2. Create a visit with a treatment named "Root Canal"
3. Mark the treatment as `'Completed'`

### Expected Behavior
1. **WhatsAppLog entries** (3 total, one for each journey step):
   - All with `event: 'postCare'`
   - Each with different `scheduledAt` times
   - Content resolved with patient name, treatment name, teeth numbers

### Verification
```javascript
db.whatsapplogs.find({ event: "postCare" }).pretty()
// Should show 3 entries with increasing scheduledAt times
```

---

## Test Scenario 6: Language Resolution Chain

### Setup
1. Create WhatsApp templates for `appointmentBooked` in:
   - English: "Hi {{name}}, ..."
   - Spanish: "Hola {{name}}, ..."
   - French: "Bonjour {{name}}, ..."

2. Create two patients with different language preferences
3. Book appointments with different `whatsapp_language` values:
   - Patient A: `whatsapp_language: "es"` (Spanish)
   - Patient B: `whatsapp_language: "hi"` (Hindi, not configured)

### Expected Behavior
1. **Patient A**: Message sent in Spanish (explicitly matched)
2. **Patient B**: Message sent in English (fallback chain: hi → defaultLanguage → fallbackLanguage → 'en')

### Verification
```javascript
db.whatsapplogs.find({ event: "appointmentBooked" }).pretty()
// First entry: content in Spanish
// Second entry: content in English (fallback)
```

---

## Production Readiness Checklist

- [ ] **Database**: Connections persist for 24+ hours without manual restart
- [ ] **Endpoint**: WAAPI correctly receives all messages on `/messages/send`
- [ ] **Queuing**: All appointments queue both `appointmentBooked` + `appointmentReminder` (if enabled)
- [ ] **Timing**: Reminder is scheduled at `start_time − hoursBeforeAppointment`, not from `Date.now()`
- [ ] **Data Completeness**: No `{{...}}` tokens in logs — all variables resolved before sending
- [ ] **Error Handling**: Failed sends logged with `status: 'failed'` + `errorMessage` field
- [ ] **Idempotency**: WAAPI can handle duplicate payloads without creating duplicate messages
- [ ] **Logging**: Console shows all WhatsApp events: trigger, send attempt, success/failure
- [ ] **Scalability**: Connection pool handles 50 concurrent requests without exhaustion

---

## Debugging Commands

### Check MongoDB connection health
```javascript
db.adminCommand({ ping: 1 })
// Should return { ok: 1 }
```

### View WhatsApp event logs
```javascript
// Last 10 events
db.whatsapplogs.find({}).sort({ sentAt: -1 }).limit(10).pretty()

// Events for specific patient
db.whatsapplogs.find({ patientId: ObjectId("...") }).pretty()

// Failed sends only
db.whatsapplogs.find({ status: "failed" }).pretty()
```

### Check WAAPI connectivity
```bash
# From DMS backend:
curl -X POST http://localhost:3005/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "...",
    "to": "+919999999999",
    "messageType": "test",
    "contentType": "text",
    "content": { "text": "Test message" }
  }'

# Expected: 200/201 with message ID, or visible error
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Cannot POST /messages/send" | Wrong endpoint in code | Use `/messages/send`, not `/api/send` |
| WAAPI returns 404 | WAAPI not running or wrong port | Start WAAPI on `localhost:3005` |
| Messages queued but not appearing in log | Settings disabled or template not found | Check `whatsappsettings.events[eventType].enabled` and template exists |
| "MongoDB disconnected" after idle | Connection pool not configured | Ensure `minPoolSize: 5`, `heartbeatFrequencyMS: 10000` |
| `{{name}}` appears in sent message | Data object missing placeholder key | Verify `data` object contains all template variables |
| Reminder scheduled for past | Wrong timing logic | Confirm `scheduledAt = start_time − hoursBeforeAppointment * 3600000` |

