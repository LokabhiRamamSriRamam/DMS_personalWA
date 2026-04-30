# Poll Message vs Response Message Storage - Complete Breakdown

## Quick Answer

### THE POLL MESSAGE (What patient sees first)
- **Stored in**: DMS MongoDB → Collection: `PollTemplate`
- **Document structure**: Single document per poll
- **Accessed from**: `PollTemplate.name` (question) + `PollTemplate.options` (1-5 options)
- **When accessed**: When appointment completes → triggers `triggerWhatsApp('feedbackPoll')`
- **How accessed**: Via backend service reading PollTemplate from DMS, building poll message, sending to patient via WAHA

### THE RESPONSE MESSAGES (What patient sees after voting)
- **Primary storage**: DMS MongoDB → Within `PollTemplate.feedbackResponses` object
  - `PollTemplate.feedbackResponses.rating1`
  - `PollTemplate.feedbackResponses.rating2`
  - `PollTemplate.feedbackResponses.rating3`
  - `PollTemplate.feedbackResponses.rating4`
  - `PollTemplate.feedbackResponses.rating5`
- **Secondary storage**: WAHA MongoDB → Collection: `FeedbackMapping` (5 separate documents)
- **Accessed from**: WAHA FeedbackMapping when patient votes
- **How accessed**: WAHA webhook extracts patient's rating, queries FeedbackMapping, retrieves matching response

---

## DETAILED: The Poll Message

### Storage Location
```
Database: MongoDB Atlas (DMS)
Connection: mongodb+srv://yashitforuppo_db_user:Yashit-dms@cluster1.w4rxwc0.mongodb.net/?appName=Cluster1
Database Name: test (tenant-specific)
Collection: PollTemplate
Document: One per poll template
```

### Document Structure
```javascript
{
  _id: ObjectId("60d5ec49c1234567890abcd1"),
  tenantId: "69df8bcbf951c03063572728",
  
  // ✅ THIS IS THE POLL MESSAGE
  name: "How satisfied were you with your treatment?",
  options: [
    "1 - Very Unhappy",
    "2 - Unhappy",
    "3 - Neutral",
    "4 - Happy",
    "5 - Very Happy"
  ],
  
  sendDelayMinutes: 30,
  feedbackResponses: { ... },  // Response messages (stored here too)
  isActive: true,
  createdAt: ISODate("2026-04-29T10:30:00Z"),
  updatedAt: ISODate("2026-04-29T10:30:00Z")
}
```

### Access Flow: How the Poll Message Gets to Patient

#### Step 1: Appointment Completion (Backend)
**File**: `dms_backend/controllers/appointment.controller.js` line ~165

```javascript
// When appointment marked as Completed:
await updateAppointmentStatus(appointmentId, 'Completed', ...);

// Triggers:
await triggerWhatsApp(
  req.tenantModels,
  req.user.tenantId,
  process.env.WAAPI_BASE_URL,
  'feedbackPoll',  // ← Specifies this is a poll, not a template
  {
    patientPhone: patient.contact.mobile,
    appointmentId: appointment._id,
  },
  null,  // no appointmentStartTime
  sendDelayMinutes  // delay from appointment
);
```

#### Step 2: Build Poll Message (WhatsApp Service)
**File**: `dms_backend/services/whatsapp.service.js` line ~156

```javascript
// In buildMessage() function:
if (eventType === 'feedbackPoll') {
  
  // Get the pollTemplateId from WhatsAppSettings
  const pollTemplateId = eventConfig.pollTemplateId;
  
  // ✅ QUERY DMS MONGODB FOR POLL TEMPLATE
  const pollTemplate = await PollTemplate.findById(pollTemplateId).lean();
  
  if (!pollTemplate || !pollTemplate.isActive) {
    return null;  // Poll not configured or inactive
  }
  
  // ✅ EXTRACT POLL MESSAGE FROM TEMPLATE
  content = buildContent('poll', {
    name: pollTemplate.name,           // "How satisfied were you?"
    values: pollTemplate.options,      // ["1 - Very Unhappy", ..., "5 - Very Happy"]
    selectableCount: 1,                // Single choice poll
  }, data);
  
  contentType = 'poll';
  
  console.log(`Using PollTemplate ${pollTemplateId} for feedbackPoll`);
}

// Returns payload with poll content
return {
  tenantId: "69df8bcbf951c03063572728",
  to: "+919876543210",
  messageType: 'feedbackPoll',
  contentType: 'poll',
  content: {
    name: "How satisfied were you with your treatment?",
    values: ["1 - Very Unhappy", "2 - Unhappy", "3 - Neutral", "4 - Happy", "5 - Very Happy"],
    selectableCount: 1
  },
  scheduledAt: "2026-04-29T10:45:00Z"  // 30 minutes from now
};
```

#### Step 3: Send to WAHA
**File**: `dms_backend/services/whatsapp.service.js` line ~238

```javascript
// Send the built payload to WAHA
await sendToWAAPI(payload, waapiBaseUrl);

// WAHA receives and sends to patient on WhatsApp
```

#### Step 4: Patient Sees Poll
**WhatsApp Client**
```
Patient receives on WhatsApp:
"How satisfied were you with your treatment?"
[1 - Very Unhappy]
[2 - Unhappy]
[3 - Neutral]
[4 - Happy]
[5 - Very Happy]
```

---

## DETAILED: The Response Messages

### Primary Storage Location (DMS)
```
Database: MongoDB Atlas (DMS)
Connection: mongodb+srv://yashitforuppo_db_user:Yashit-dms@cluster1.w4rxwc0.mongodb.net/?appName=Cluster1
Database Name: test (tenant-specific)
Collection: PollTemplate (SAME document as poll message)
Field: feedbackResponses
```

### Secondary Storage Location (WAHA)
```
Database: WAHA's own MongoDB
Connection: (configured in WAHA environment)
Database Name: waha_db (or configured)
Collection: FeedbackMapping
Documents: 5 separate documents (one per rating)
```

### Document Structure - DMS
```javascript
{
  _id: ObjectId("60d5ec49c1234567890abcd1"),
  tenantId: "69df8bcbf951c03063572728",
  name: "How satisfied were you with your treatment?",
  options: [...],
  
  // ✅ THIS IS WHERE RESPONSE MESSAGES ARE STORED IN DMS
  feedbackResponses: {
    
    // Response for rating 1
    rating1: {
      contentType: "text",
      content: { text: "We're sorry to hear you had a poor experience. Please call us at 9999999999." },
      isEnabled: true
    },
    
    // Response for rating 2
    rating2: {
      contentType: "text",
      content: { text: "Thank you for your feedback. We appreciate the chance to improve." },
      isEnabled: true
    },
    
    // Response for rating 3
    rating3: {
      contentType: "text",
      content: { text: "Thank you for your neutral rating. We're always improving." },
      isEnabled: true
    },
    
    // Response for rating 4
    rating4: {
      contentType: "text",
      content: { text: "Thank you for rating us as good! We appreciate your support." },
      isEnabled: true
    },
    
    // Response for rating 5
    rating5: {
      contentType: "image",
      content: {
        url: "https://example.com/thank-you.jpg",
        caption: "Thank you for rating us excellent! 🎉"
      },
      isEnabled: true
    }
  },
  
  isActive: true,
  createdAt: ISODate("2026-04-29T10:30:00Z"),
  updatedAt: ISODate("2026-04-29T10:30:00Z")
}
```

### Document Structure - WAHA (5 separate docs)
```javascript
// FeedbackMapping Collection in WAHA

// Doc 1: Rating 1 Response
{
  _id: ObjectId("..."),
  tenantId: "69df8bcbf951c03063572728",
  rating: 1,
  contentType: "text",
  content: { text: "We're sorry to hear you had a poor experience. Please call us." },
  isEnabled: true
}

// Doc 2: Rating 2 Response
{
  _id: ObjectId("..."),
  tenantId: "69df8bcbf951c03063572728",
  rating: 2,
  contentType: "text",
  content: { text: "Thank you for your feedback. We appreciate the chance to improve." },
  isEnabled: true
}

// Doc 3: Rating 3 Response
{
  _id: ObjectId("..."),
  tenantId: "69df8bcbf951c03063572728",
  rating: 3,
  contentType: "text",
  content: { text: "Thank you for your neutral rating. We're always improving." },
  isEnabled: true
}

// Doc 4: Rating 4 Response
{
  _id: ObjectId("..."),
  tenantId: "69df8bcbf951c03063572728",
  rating: 4,
  contentType: "text",
  content: { text: "Thank you for rating us as good! We appreciate your support." },
  isEnabled: true
}

// Doc 5: Rating 5 Response
{
  _id: ObjectId("..."),
  tenantId: "69df8bcbf951c03063572728",
  rating: 5,
  contentType: "image",
  content: { url: "https://example.com/thank-you.jpg", caption: "Thank you for rating us excellent! 🎉" },
  isEnabled: true
}
```

### Access Flow: How Response Messages Get to Patient

#### Step 1: Patient Votes on Poll
**WhatsApp Client**
```
Patient clicks: "5 - Very Happy"
WAHA receives webhook with patient's vote
```

#### Step 2: WAHA Webhook Handler
**DMS Backend File**: `dms_backend/controllers/whatsapp.controller.js`

```javascript
// WAHA sends webhook:
POST /api/whatsapp/feedback/webhook
{
  tenantId: "69df8bcbf951c03063572728",
  from: "+919876543210",
  rating: 5,  // ← Patient voted "5"
  pollId: "60d5ec49c1234567890abcd1",
  timestamp: "2026-04-29T10:45:30Z"
}

// DMS handler processes webhook
export async function handlePollResponse(req, res) {
  const { tenantId, from, rating } = req.body;
  
  // Save poll response to database
  // Then trigger response sending
}
```

#### Step 3: WAHA Queries FeedbackMapping
**Inside WAHA Middleware** (not DMS code, but WAHA's code):

```javascript
// When patient votes with rating 5
// WAHA queries its own FeedbackMapping collection:

db.feedbackmappings.findOne({
  tenantId: "69df8bcbf951c03063572728",
  rating: 5,
  isEnabled: true
})

// Returns:
{
  _id: ObjectId("..."),
  tenantId: "69df8bcbf951c03063572728",
  rating: 5,
  contentType: "image",
  content: { 
    url: "https://example.com/thank-you.jpg",
    caption: "Thank you for rating us excellent! 🎉"
  },
  isEnabled: true
}
```

#### Step 4: WAHA Sends Response to Patient
**WAHA Middleware** (sends back to patient):

```
Patient receives on WhatsApp:
[Image] https://example.com/thank-you.jpg
Caption: "Thank you for rating us excellent! 🎉"
```

---

## The Sync Mechanism: DMS → WAHA

### When Admin Saves Poll Template
**File**: `dms_backend/controllers/feedback.controller.js` line ~119

```javascript
// When admin saves template via PUT /api/feedback/poll-templates/:id

export async function updatePollTemplate(req, res) {
  const { PollTemplate } = req.tenantModels;
  
  // 1. Save to DMS MongoDB
  const template = await PollTemplate.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    { name, options, sendDelayMinutes, isActive, feedbackResponses },
    { new: true }
  );
  
  // 2. ✅ SYNC RESPONSES TO WAHA (auto-triggered)
  await syncFeedbackResponsesToWAHA(req.user.tenantId, template);
  
  res.json(template);
}
```

### The Sync Function
**File**: `dms_backend/controllers/feedback.controller.js` line ~5

```javascript
async function syncFeedbackResponsesToWAHA(tenantId, pollTemplate) {
  try {
    const wahaBaseUrl = process.env.WAHA_BASE_URL || 'http://localhost:3001';
    
    // Extract 5 responses from PollTemplate
    const templates = [1, 2, 3, 4, 5].map((rating) => {
      const ratingKey = `rating${rating}`;
      const response = pollTemplate.feedbackResponses[ratingKey];
      
      return {
        rating: rating,
        contentType: response.contentType,      // "text", "image", etc
        content: response.content,              // { text: "..." } or { url: "...", caption: "..." }
        isEnabled: response.isEnabled           // true/false
      };
    });
    
    // ✅ SEND TO WAHA ENDPOINT
    const response = await fetch(
      `${wahaBaseUrl}/waha/tenant-feedback/${tenantId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates })  // Send all 5 responses
      }
    );
    
    // WAHA receives and stores in FeedbackMapping collection
    console.log(`Feedback responses synced for tenant ${tenantId}`);
  } catch (err) {
    console.error(`Error syncing: ${err.message}`);
    // Non-blocking — doesn't prevent template save
  }
}
```

### Sync Payload Sent to WAHA
```javascript
POST http://localhost:3001/waha/tenant-feedback/69df8bcbf951c03063572728

{
  "templates": [
    {
      "rating": 1,
      "contentType": "text",
      "content": { "text": "We're sorry to hear you had a poor experience..." },
      "isEnabled": true
    },
    {
      "rating": 2,
      "contentType": "text",
      "content": { "text": "Thank you for your feedback..." },
      "isEnabled": true
    },
    {
      "rating": 3,
      "contentType": "text",
      "content": { "text": "Thank you for your neutral rating..." },
      "isEnabled": true
    },
    {
      "rating": 4,
      "contentType": "text",
      "content": { "text": "Thank you for rating us as good..." },
      "isEnabled": true
    },
    {
      "rating": 5,
      "contentType": "image",
      "content": { "url": "https://example.com/thank-you.jpg", "caption": "Thank you! 🎉" },
      "isEnabled": true
    }
  ]
}
```

---

## Summary: Storage and Access

| Component | Storage Location | Database | Collection | Accessed From | How |
|-----------|------------------|----------|-----------|---|---|
| **Poll Message** | DMS MongoDB | test (tenant DB) | PollTemplate | `PollTemplate.name` + `PollTemplate.options` | When appointment completes → service reads PollTemplate → builds message → sends to WAHA |
| **Response 1** | DMS MongoDB + WAHA MongoDB | test / waha_db | PollTemplate / FeedbackMapping | DMS: `PollTemplate.feedbackResponses.rating1` / WAHA: FeedbackMapping where rating=1 | Auto-synced to WAHA when template saved. On patient vote, WAHA queries FeedbackMapping where rating=1 |
| **Response 2** | DMS MongoDB + WAHA MongoDB | test / waha_db | PollTemplate / FeedbackMapping | DMS: `PollTemplate.feedbackResponses.rating2` / WAHA: FeedbackMapping where rating=2 | Auto-synced to WAHA when template saved. On patient vote, WAHA queries FeedbackMapping where rating=2 |
| **Response 3** | DMS MongoDB + WAHA MongoDB | test / waha_db | PollTemplate / FeedbackMapping | DMS: `PollTemplate.feedbackResponses.rating3` / WAHA: FeedbackMapping where rating=3 | Auto-synced to WAHA when template saved. On patient vote, WAHA queries FeedbackMapping where rating=3 |
| **Response 4** | DMS MongoDB + WAHA MongoDB | test / waha_db | PollTemplate / FeedbackMapping | DMS: `PollTemplate.feedbackResponses.rating4` / WAHA: FeedbackMapping where rating=4 | Auto-synced to WAHA when template saved. On patient vote, WAHA queries FeedbackMapping where rating=4 |
| **Response 5** | DMS MongoDB + WAHA MongoDB | test / waha_db | PollTemplate / FeedbackMapping | DMS: `PollTemplate.feedbackResponses.rating5` / WAHA: FeedbackMapping where rating=5 | Auto-synced to WAHA when template saved. On patient vote, WAHA queries FeedbackMapping where rating=5 |

---

## Key Points

✅ **Poll Message (question + 1-5 options)**: Stored in DMS `PollTemplate.name` and `PollTemplate.options`  
✅ **Response Messages (1-5)**: Stored in DMS `PollTemplate.feedbackResponses` (primary) and WAHA `FeedbackMapping` (secondary)  
✅ **Dual Storage**: DMS is admin source of truth, WAHA is webhook lookup  
✅ **Auto-Sync**: When admin saves template, responses auto-sync to WAHA  
✅ **Non-Blocking**: If WAHA sync fails, template still saves in DMS  
✅ **Multi-Tenant**: Each clinic has separate DMS database and separate WAHA entries (scoped by tenantId)
