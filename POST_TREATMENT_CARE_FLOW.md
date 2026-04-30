# Post-Treatment Care Message Flow

## Overview

When a treatment is marked as **Completed**, the system triggers:
1. **Immediate message**: `treatmentScheduled` (sent right away)
2. **Post-care journey**: Multiple scheduled messages based on treatment type

---

## Complete Flow Diagram

```
[Treatment Status Updated to "Completed"]
           ↓
[updateTreatmentStatus() in visit.controller.js]
           ↓
   ┌───────┴───────┐
   ↓               ↓
Message 1:      Message 2+:
"Treatment      "Post-Care
Completed"      Journey"
(Immediate)     (Scheduled)
   ↓               ↓
triggerWhatsApp  triggerJourney
   ↓               ↓
WAAPI            Multiple WAAPI
(sent now)       calls (scheduled
                 at future times)
```

---

## Step-by-Step Flow

### 1. Treatment Completion (visit.controller.js, line 347-416)

**Endpoint**: `PATCH /api/visits/:visitId/treatments/:treatmentId/status`

**Trigger**: When treatment status = "Completed"

```javascript
const treatment = visit.treatments.find(t => t._id.toString() === treatmentId);
const completedAt = new Date();

// Build data object with ONLY available backend fields
const data = {
  name: fullName,           // "John Doe"
  firstName,                // "John"
  patientId: patient.patientId,  // "PID-001"
  mobile: phone,            // "918104489957"
  date: completedAt.toLocaleDateString('en-IN'),  // "27/4/2026"
  treatment: treatment?.treatment_name ?? '',     // "Root Canal"
  teethNumbers: treatment?.teeth_numbers?.join(', ') ?? '',  // "11, 12"
  doctorName: doctor?.name || '',  // "Dr. Sharma"
};
```

**Available Variables in data object**:
- `{{name}}` — Full patient name
- `{{firstName}}` — Patient first name
- `{{date}}` — Completion date (formatted as en-IN)
- `{{treatment}}` — Treatment name (e.g., "Root Canal", "Cleaning")
- `{{teethNumbers}}` — Comma-separated tooth numbers
- `{{doctorName}}` — Doctor's name
- `{{patientId}}` — Patient ID
- `{{mobile}}` — Patient phone

### 2. Immediate Treatment Completed Message

**Function**: `triggerWhatsApp()` in whatsapp.service.js

```javascript
triggerWhatsApp(
  req.tenantModels, 
  req.user.tenantId, 
  process.env.WAAPI_BASE_URL,
  'treatmentScheduled',  // ← Event type
  phone, 
  data,  // ← All available variables
  patientId
);
```

**Message Type**: `treatmentScheduled`

**When**: Immediately (no delay)

**Template Variables Available**: name, firstName, date, treatment, teethNumbers, doctorName

**Example Template**:
```
English: "Hi {{name}}, your {{treatment}} treatment has been completed successfully!"
Hindi: "नमस्ते {{name}}, आपकी {{treatment}} का उपचार सफलतापूर्वक पूरा हो गया है!"
```

---

### 3. Post-Care Journey

**Function**: `triggerJourney()` in whatsapp.service.js (line 246)

```javascript
triggerJourney(
  req.tenantModels,
  req.user.tenantId,
  process.env.WAAPI_BASE_URL,
  phone,
  treatment.treatment_name,  // ← Match against TreatmentJourney
  completedAt,
  data,                      // ← Same data object
  patientId
);
```

#### What triggerJourney Does:

1. **Finds the TreatmentJourney** by `treatmentName` (case-insensitive match)
   ```javascript
   const journey = await TreatmentJourney.findOne({
     treatmentName: { $regex: new RegExp(`^${treatmentName}$`, 'i') },
     enabled: true,
   });
   ```

2. **For each message in the journey**:
   - Calculates `scheduledAt` = completedAt + delay
   - Selects best language variant (en → hi → fallback)
   - Replaces placeholders in template with `data` values
   - Creates a WAAPI scheduled message payload
   - Logs the message

3. **Example Journey for "Root Canal"**:
   ```
   Message 1: "Post-care instructions" → Scheduled 2 hours after completion
   Message 2: "Pain management tips" → Scheduled 24 hours after completion
   Message 3: "Follow-up reminder" → Scheduled 7 days after completion
   ```

#### Journey Message Structure (TreatmentJourney.model.js):

```javascript
{
  treatmentName: "Root Canal",
  enabled: true,
  messages: [
    {
      id: "step-1",
      delay: { value: 2, unit: "hours" },
      languages: {
        en: {
          contentType: "text",
          content: { text: "Hi {{name}}, here are post-care tips for your {{treatment}}..." }
        },
        hi: {
          contentType: "text",
          content: { text: "नमस्ते {{name}}, आपके {{treatment}} के लिए यहां देखभाल के सुझाव हैं..." }
        }
      }
    },
    {
      id: "step-2",
      delay: { value: 24, unit: "hours" },
      languages: { ... }
    }
  ]
}
```

---

## Data Flow Summary

### Variables Available at Treatment Completion:

| Variable | Source | Example |
|----------|--------|---------|
| `{{name}}` | Patient.first_name + Patient.last_name | "John Doe" |
| `{{firstName}}` | Patient.first_name | "John" |
| `{{date}}` | completedAt (formatted) | "27/4/2026" |
| `{{treatment}}` | treatment.treatment_name | "Root Canal" |
| `{{teethNumbers}}` | treatment.teeth_numbers joined | "11, 12" |
| `{{doctorName}}` | Doctor.name | "Dr. Sharma" |
| ~~`{{patientId}}`~~ | Patient.patientId | "PID-001" (internal, not for UI) |
| ~~`{{mobile}}`~~ | Patient.contact.mobile | (API only, not in template) |

### Variables NOT Available:
- ~~`{{doctorSpecialization}}`~~ — Not fetched from backend
- ~~`{{appointmentType}}`~~ — Not available for treatment completion
- ~~`{{roomNumber}}`~~ — Not relevant for post-care
- ~~`{{tokenNumber}}`~~ — Not relevant for post-care

---

## Frontend UI (WhatsAppPage.jsx)

The **Post-Care Journey** section shows:
- List of treatments configured with journeys
- Message steps with delays (e.g., "2 hours after treatment")
- Language variants (English, Hindi, Marathi)
- Content types (text, image, video, document, poll, etc.)

**Frontend Variables List** (line 21):
```javascript
{ 
  key: 'postCare', 
  label: 'Post-Care Journey',
  variables: ['name', 'firstName', 'treatment', 'teethNumbers', 'date', 'doctorName'],
  isJourney: true 
}
```

This should match the actual backend data object passed to `triggerJourney()`.

---

## Duplicate Prevention

To prevent sending the same journey twice (if treatment status is toggled):

```javascript
if (treatment && !treatment.journey_started) {
  // Mark as started to prevent re-triggering
  await req.tenantModels.Visit.updateOne(
    { _id: visitId, 'treatments._id': treatmentId },
    { $set: { 'treatments.$.journey_started': true } }
  );
  
  triggerJourney(...);
}
```

**Note**: The `journey_started` flag is added to the treatment subdocument to track if the journey has been triggered.

---

## Testing

### Test Post-Care Message:

1. Create a treatment journey for a treatment type (e.g., "Root Canal")
2. Add 2-3 message steps with different delays
3. Mark a treatment as "Completed" in the UI
4. Check WhatsApp logs to verify:
   - Immediate `treatmentScheduled` message sent
   - Journey messages scheduled with correct delays

### Test Endpoint:

```bash
curl -X POST http://localhost:5000/api/whatsapp/test-send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientPhone": "918104489957",
    "eventType": "postCare",
    "data": {
      "name": "John Doe",
      "firstName": "John",
      "date": "27/4/2026",
      "treatment": "Root Canal",
      "teethNumbers": "11, 12",
      "doctorName": "Dr. Sharma"
    }
  }'
```

---

## Known Limitations

1. **Language Resolution**: Uses fallback chain (explicit → default → fallback → 'en')
   - If no language variant has content, the message step is skipped
   
2. **Scheduling Accuracy**: 
   - WAAPI is responsible for delivering at scheduled time
   - Messages are queued, not guaranteed to send at exact time

3. **No Re-Scheduling**:
   - Once journey messages are queued, there's no way to modify delays
   - To change journey, delete and recreate from the UI

---

## Summary

✅ **CORRECT**: Backend correctly triggers both immediate and scheduled post-care messages on treatment completion

✅ **CORRECT**: All variables (name, firstName, date, treatment, teethNumbers, doctorName) are passed from backend

✅ **CORRECT**: Journey messages are scheduled based on TreatmentJourney configuration

❌ **FIXED**: Frontend variables list was showing outdated fields (doctorSpecialization, roomNumber, tokenNumber, patientId, mobile)

---

## Last Updated
2026-04-27

Backend flow verified and documented. Frontend variables list updated to match actual backend fields.
