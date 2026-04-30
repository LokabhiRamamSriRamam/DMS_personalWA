# WhatsApp Template Variables Reference

## Available Data Fields by Event Type

All events pass these variables to templates. Only use variables that are listed here.

### appointmentBooked
Triggered immediately when an appointment is created.

**Available Variables:**
- `{{name}}` — Full patient name (firstName + lastName)
- `{{firstName}}` — Patient first name only
- `{{date}}` — Appointment date (formatted as en-IN locale, e.g., "27/4/2026")
- `{{time}}` — Appointment time (formatted as en-IN locale, e.g., "02:58 am")
- `{{doctorName}}` — Doctor's name (or "Doctor" if not found)
- `{{appointmentType}}` — Type of appointment (e.g., "Consultation")

**Example English Template:**
```
Hi {{name}}, your appointment with {{doctorName}} has been confirmed for {{date}} at {{time}}.
```

**Example Hindi Template:**
```
नमस्ते {{name}},
आपकी नियुक्ति {{doctorName}} के साथ {{date}} को {{time}} पर पुष्टि की गई है।
```

---

### appointmentReminder
Triggered 24 hours before the appointment (configurable via WhatsApp settings).

**Available Variables:**
- `{{name}}` — Full patient name
- `{{firstName}}` — Patient first name only
- `{{date}}` — Appointment date
- `{{time}}` — Appointment time
- `{{doctorName}}` — Doctor's name

**Example English Template:**
```
Hi {{name}}, reminder: your appointment with {{doctorName}} is coming up on {{date}} at {{time}}. Please arrive 5 minutes early.
```

**Example Hindi Template:**
```
नमस्ते {{name}},
आपकी {{doctorName}} के साथ नियुक्ति {{date}} को {{time}} पर है। कृपया 5 मिनट पहले आएं।
```

---

### appointmentRescheduled
Triggered when an appointment's `start_time` is updated (rescheduled).

**Available Variables:**
- `{{name}}` — Full patient name
- `{{firstName}}` — Patient first name only
- `{{date}}` — **NEW** appointment date
- `{{time}}` — **NEW** appointment time
- `{{doctorName}}` — Doctor's name
- `{{appointmentType}}` — Type of appointment

**Example English Template:**
```
Hi {{name}}, your appointment with {{doctorName}} has been rescheduled to {{date}} at {{time}}. Please confirm your availability.
```

**Example Hindi Template:**
```
नमस्ते {{name}},
आपकी {{doctorName}} के साथ नियुक्ति {{date}} को {{time}} पर स्थगित कर दी गई है। कृपया अपनी उपलब्धता की पुष्टि करें।
```

---

### appointmentCompleted
Triggered when an appointment status is changed to "Completed".

**Available Variables:**
- `{{name}}` — Full patient name
- `{{firstName}}` — Patient first name only
- `{{date}}` — Appointment date
- `{{time}}` — Appointment time
- `{{doctorName}}` — Doctor's name

---

## Important Notes

### Variables NOT Available (Removed as Redundant)
- ~~`{{doctor}}`~~ → Use `{{doctorName}}` instead
- ~~`{{doctorSpecialization}}`~~ → Not passed from backend
- ~~`{{roomNumber}}`~~ → Not passed from backend
- ~~`{{tokenNumber}}`~~ → Not passed from backend
- ~~`{{patientId}}`~~ → Internal field, not needed in messages
- ~~`{{mobile}}`~~ → Patient phone is in API, not needed in template

### Why Variables Were Removed
1. **doctorSpecialization** — Not useful in SMS/WhatsApp messages; doctor name is sufficient
2. **roomNumber, tokenNumber** — Clutters the message; only use if critical
3. **patientId, mobile** — Internal backend fields; not relevant to patients

### Adding New Variables
If you need a new variable in templates:
1. Add it to the `data` object in `appointment.controller.js`
2. Update the fetch queries to select the required field from the database
3. Document it in this file

---

## Backend Data Building (appointment.controller.js)

### For appointmentBooked & appointmentReminder:
```javascript
const data = {
  name,              // "John Doe"
  firstName,         // "John"
  patientId,         // Patient ID (not in template)
  mobile,            // Phone (not in template)
  date,              // "27/4/2026"
  time,              // "02:58 am"
  doctorName,        // "Dr. Smith" or "Doctor"
  appointmentType,   // "Consultation"
};
```

### For appointmentRescheduled & appointmentCompleted:
Same structure as above (all three appointment events use identical data).

---

## Testing Templates

Use the `/api/whatsapp/test-send` endpoint to test templates:

```bash
curl -X POST http://localhost:5000/api/whatsapp/test-send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientPhone": "918104489957",
    "eventType": "appointmentBooked",
    "language": "hi",
    "data": {
      "name": "Avtansh Giri",
      "firstName": "Avtansh",
      "date": "27/4/2026",
      "time": "02:58 am",
      "doctorName": "DD Sharma",
      "appointmentType": "Consultation"
    }
  }'
```

---

## Last Updated
2026-04-27

Variables aligned with backend data in `appointment.controller.js`
