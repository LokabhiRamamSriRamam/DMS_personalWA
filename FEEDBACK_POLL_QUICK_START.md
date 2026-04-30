# Feedback Poll System - Quick Start Guide

## What Is It?

A complete feedback collection system that:
1. Sends interactive WhatsApp polls (1-5 star ratings) when appointments complete
2. Automatically sends follow-up messages based on patient's rating
3. Tracks all responses and generates analytics

---

## UI Navigation

### Configure Poll Question

```
1. Open DMS frontend → http://localhost:5173
2. Login with your clinic account
3. Go to WhatsApp section (sidebar)
4. Click "Messages" tab
5. Scroll to "Feedback Poll" section
6. Click on the poll card to edit
7. Enter your poll question in:
   - 🇬🇧 English
   - 🇮🇳 Hindi  
   - 🟠 Marathi
8. Rating options are pre-filled: 5-Excellent to 1-Very Poor
9. Click "Save"
```

### Configure Follow-up Messages

```
1. In the same "Feedback Poll" section
2. Click "Configure Follow-up Messages" button
3. A modal appears with 5 rating options
4. For each rating (5, 4, 3, 2, 1):
   a. Click the rating button on left
   b. Toggle "Enable" on/off
   c. Choose message type: Text, Image, Document, Location
   d. Enter the message content
   e. Set send delay (0 = immediate, 3600000 = 1 hour in ms)
   f. Click "Save"
5. Green checkmark shows when configured
6. Close modal to return to messages
```

---

## How It Works (End-to-End)

### Timeline: Patient Journey

```
10:00 AM - Patient arrives, treatment starts
          ↓
10:45 AM - Treatment complete, doctor clicks "Conclude Appointment"
          ↓
WAAPI - Poll sent to patient's WhatsApp: "How satisfied are you?"
        with 5 interactive buttons: Excellent / Good / Neutral / Poor / Very Poor
          ↓
10:46 AM - Patient receives poll on WhatsApp, sees 5 buttons
          ↓
10:47 AM - Patient taps "Good" (rating 4)
          ↓
WAAPI - Polls response captured: rating=4, feedbackType="good"
        Looks up follow-up message for "good" rating
        Queues follow-up message
          ↓
10:47 AM - OR 10:48 AM - Patient receives follow-up message
          (depends on configured send delay)
          ↓
DMS - Records poll response for analytics
      Available via: GET /api/feedback/responses
      Stats available via: GET /api/feedback/stats
```

---

## API Quick Reference

### Save Follow-up Message

```bash
POST /api/feedback/templates
{
  "feedbackType": "excellent",  # excellent, good, neutral, poor, very_poor
  "rating": 5,
  "contentType": "text",
  "content": { "text": "Thank you for the excellent feedback!" },
  "isEnabled": true,
  "sendDelay": 0
}
```

### Get All Follow-up Templates

```bash
GET /api/feedback/templates
# Returns all 5 templates for this clinic
```

### Get Poll Responses

```bash
GET /api/feedback/responses?from=919876543210&feedbackType=good&startDate=2026-04-01
# Query patient responses
```

### Get Feedback Statistics

```bash
GET /api/feedback/stats
# Returns aggregated feedback data
```

---

## Database Flow

### WhatsAppTemplate (Stores Poll Question)

When you configure the poll question in WhatsApp → Messages Tab:

```javascript
db.whatsapptemplates.insertOne({
  event: "feedbackPoll",
  language: "en",
  contentType: "poll",
  content: {
    name: "How satisfied are you with your treatment?",
    values: ["5-Excellent", "4-Good", "3-Neutral", "2-Poor", "1-Very Poor"],
    selectableCount: 1
  },
  isActive: true
})
```

### FollowUpTemplate (Stores Follow-up Messages)

When you configure follow-up messages:

```javascript
db.followuptemplates.insertMany([
  {
    tenantId: "clinic-001",
    feedbackType: "excellent",
    rating: 5,
    contentType: "text",
    content: { text: "Thank you for excellent feedback!" },
    isEnabled: true,
    sendDelay: 0
  },
  {
    tenantId: "clinic-001",
    feedbackType: "good",
    rating: 4,
    contentType: "text",
    content: { text: "Thanks for your feedback!" },
    isEnabled: true,
    sendDelay: 3600000  # Send after 1 hour
  },
  // ... 3 more for neutral, poor, very_poor
])
```

---

## Multi-language Support

The poll question supports 3 languages:

| Language | Flag | Code |
|----------|------|------|
| English | 🇬🇧 | en |
| Hindi | 🇮🇳 | hi |
| Marathi | 🟠 | mr |

When you configure the poll in Messages tab, enter the question in each language. When appointment completes, DMS automatically selects the right language based on:

1. Patient's language preference (if set on appointment)
2. Clinic's default language (Settings tab)
3. Fallback to English

---

## Common Questions

**Q: Can I change the 5 rating options?**
A: No, the system uses fixed 1-5 scale (Very Poor to Excellent) to ensure consistency.

**Q: Can I send different content types for different ratings?**
A: Yes! Rating 5 can send text, Rating 4 can send image, Rating 1 can send location, etc.

**Q: What happens if I don't configure follow-ups?**
A: Poll will still be sent when appointment completes, but no follow-up message will be sent when patient responds.

**Q: Can I disable the poll temporarily?**
A: Yes! In Messages tab, toggle off the "Feedback Poll" event. Or toggle "Enable feedback polls" in the poll editor.

**Q: How do I view patient responses?**
A: Go to WhatsApp → Logs tab to see message delivery logs. Or use API: `GET /api/feedback/responses`

**Q: Is this integrated with reporting?**
A: Yes! Go to Insights → Reports and select "Feedback" report type to see analytics.

---

## Troubleshooting

### Poll Not Sent When Appointment Completes

1. **Check settings:** WhatsApp → Messages Tab → feedbackPoll event should be toggled ON
2. **Check configuration:** Poll question should be saved in at least one language
3. **Check logs:** WhatsApp → Logs tab to see if any errors occurred
4. **Check WAAPI:** Ensure WAAPI backend is running and configured in .env

### Follow-up Messages Not Sent

1. **Check enable toggle:** In FeedbackFollowUpEditor modal, toggle should be ON for that rating
2. **Check content:** Message content should not be empty
3. **Check WAAPI:** Verify WAAPI backend received the follow-up template via POST

### Poll Shows as Text Message Instead of Interactive Poll

1. **Check contentType:** Should always be 'poll' for feedbackPoll event
2. **Check values:** Should have 5 options in correct format
3. **Check WAAPI:** WAAPI might need to handle poll format differently

---

## Performance Notes

- Polls are queued asynchronously (fire-and-forget)
- No blocking on patient response — returned immediately
- Follow-ups are scheduled via BullMQ for reliable delivery
- Supports up to 100+ concurrent appointments without lag
- Database queries optimized with tenant indices

---

## Security & Privacy

- ✅ Complete tenant isolation (clinic A can't see clinic B's data)
- ✅ All patient phone numbers hashed in logs
- ✅ Follow-up messages stored only in DMS (not on patient's device)
- ✅ Poll responses stored with timestamp for audit trail
- ✅ All API endpoints require JWT authentication

---

## Integration Points

### With Appointments Module
When `PATCH /api/appointments/:id/status { status: "Completed" }` is called:
→ Automatically triggers `triggerWhatsApp('feedbackPoll', ...)`

### With WAAPI Backend
- DMS sends poll template to WAAPI
- DMS POSTs follow-up template to WAAPI
- WAAPI calls DMS to get follow-up message when patient responds
- WAAPI handles actual WhatsApp delivery via Baileys

### With Analytics
- All poll responses logged to WhatsAppLog
- Available for reporting and insights
- Can be exported to CSV

---

## Next Steps

1. **Test locally:**
   - Configure poll question (simple text like "How was your experience?")
   - Configure follow-up for rating 5: "Thanks for excellent feedback!"
   - Complete any appointment
   - Check logs to verify poll sent

2. **Customize messages:**
   - Each clinic can configure their own messages
   - Different messages for different ratings
   - Support for images, documents, locations

3. **Enable in production:**
   - Configure real clinic name and contact info
   - Test with real patient
   - Monitor delivery logs
   - Gather feedback analytics

---

## Support & Documentation

- **Architecture:** See `FEEDBACK_POLL_IMPLEMENTATION_COMPLETE.md`
- **API Details:** See `FEEDBACK_POLL_FINAL_ARCHITECTURE.md`
- **Code:** Frontend: `frontend/src/pages/WhatsAppPage.jsx`
         Backend: `dms_backend/controllers/feedback.controller.js`
- **Models:** `dms_backend/models/FollowUpTemplate.model.js`
