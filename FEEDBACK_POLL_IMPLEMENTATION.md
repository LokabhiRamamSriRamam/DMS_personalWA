# Feedback Poll System Implementation

## Architecture Overview

This is a multi-stage feedback system where:
1. **Appointment completed** → Poll question sent via WhatsApp
2. **Patient responds** → WAAPI receives response via webhook
3. **DMS processes response** → Auto-sends rating-based follow-up message

## Database Models

### FollowUpTemplate (DMS Tenant DB)
Stores the follow-up message for each rating level.

```javascript
{
  tenantId: "clinic-a-id",
  feedbackType: "excellent" | "good" | "neutral" | "poor" | "very_poor",
  rating: 5 | 4 | 3 | 2 | 1,
  messageType: "feedback",
  contentType: "text" | "image" | "document" | "location",
  content: { /* varies by contentType */ },
  isEnabled: true,
  sendDelay: 0,    // milliseconds
  createdAt: "...",
  updatedAt: "..."
}
```

### PollResponse (DMS Tenant DB)
Tracks what patient responded to the poll.

```javascript
{
  tenantId: "clinic-a-id",
  messageId: "msg-123",        // Original poll message ID from WAAPI
  from: "918104489957",        // Patient phone
  rating: 5,                   // Calculated from selectedIndex
  feedbackType: "excellent",   // Mapped from rating
  selectedOption: "5-Excellent",
  pollQuestion: "How satisfied are you?",
  respondedAt: "...",
  createdAt: "...",
  updatedAt: "..."
}
```

## Frontend Implementation

### WhatsAppPage - Messages Tab (feedbackPoll configuration)
- Configure the poll question text
- contentType is locked to 'poll'
- Rating options are fixed: ["5-Excellent", "4-Good", "3-Neutral", "2-Poor", "1-Very Poor"]
- Saves as WhatsAppTemplate with contentType: 'poll'

### FeedbackPage (Follow-up message configuration)
- 5 rating sections (excellent, good, neutral, poor, very_poor)
- Each section has:
  - Enable toggle
  - Message type selector (text, image, document, location)
  - Message content editor
  - Send delay configuration
- Saves as FollowUpTemplate per rating

## API Endpoints (DMS Backend)

### Feedback Template Management
```
GET    /api/feedback/templates
POST   /api/feedback/templates
GET    /api/feedback/templates/:feedbackType
PUT    /api/feedback/templates/:feedbackType
DELETE /api/feedback/templates/:feedbackType
```

### Poll Response Tracking
```
GET /api/feedback/responses       # Query with filters
GET /api/feedback/stats           # Aggregated stats
```

### WAAPI Webhook (Public)
```
POST /api/whatsapp/feedback/webhook
Body: { tenantId, from, messageId, selectedOption, selectedIndex, pollQuestion, timestamp }
```

## Message Flow

### 1. Poll Sent (On Appointment Completion)
```
Appointment.updateStatus('Completed')
  → triggerWhatsApp('feedbackPoll', ...)
  → buildMessage() queries WhatsAppTemplate
  → contentType: 'poll', content.values: ["5-Excellent", ...]
  → sendToWAAPI() with correct poll format
```

### 2. Patient Responds
```
WAAPI receives poll response via Baileys
  → calculates rating from selectedIndex
  → calls POST /api/whatsapp/feedback/webhook
```

### 3. Follow-Up Sent
```
handlePollResponse() receives webhook
  → creates PollResponse document
  → queries FollowUpTemplate by feedbackType
  → builds content with template values
  → sendToWAAPI() with follow-up message
```

## Key Technical Details

### Poll Template (WhatsAppTemplate)
```javascript
{
  event: "feedbackPoll",
  language: "en",
  contentType: "poll",
  content: {
    name: "How satisfied are you with your treatment?",
    values: ["5-Excellent", "4-Good", "3-Neutral", "2-Poor", "1-Very Poor"],
    selectableCount: 1
  },
  isActive: true
}
```

### Follow-Up Template (FollowUpTemplate)
```javascript
{
  tenantId: "clinic-id",
  feedbackType: "excellent",
  rating: 5,
  contentType: "text",
  content: { text: "Thank you for excellent feedback!" },
  isEnabled: true,
  sendDelay: 0
}
```

### Rating Mapping
```
selectedIndex 0 → rating 5 → feedbackType "excellent"
selectedIndex 1 → rating 4 → feedbackType "good"
selectedIndex 2 → rating 3 → feedbackType "neutral"
selectedIndex 3 → rating 2 → feedbackType "poor"
selectedIndex 4 → rating 1 → feedbackType "very_poor"
```

## Testing

1. Open WhatsAppPage → Messages tab
2. Click feedbackPoll card to configure
3. Set poll question in each language
4. Save (should create WhatsAppTemplate with contentType: 'poll')

5. Open FeedbackPage
6. For each rating (excellent, good, neutral, poor, very_poor):
   - Enable the template
   - Select message type
   - Enter follow-up message
   - Save (creates FollowUpTemplate)

7. Complete an appointment
8. Verify poll is sent with correct format

9. Simulate webhook:
```bash
curl -X POST http://localhost:5000/api/whatsapp/feedback/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "from": "918104489957",
    "messageId": "msg-123",
    "selectedOption": "5-Excellent",
    "selectedIndex": 0,
    "pollQuestion": "How satisfied?",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

10. Verify follow-up message is queued to WAAPI
