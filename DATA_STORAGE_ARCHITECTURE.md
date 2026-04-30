# Data Storage Architecture - Poll Templates & Responses

## Overview

**Poll Templates + Feedback Responses are saved in TWO places:**

1. **DMS Backend (Multi-Tenant MongoDB)** — Source of truth for admin
2. **WAHA Middleware (Separate MongoDB)** — For webhook processing

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADMIN SAVES TEMPLATE                        │
│                                                                   │
│ Frontend: Click "Save Template & Responses"                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              POST /api/feedback/poll-templates                   │
│                                                                   │
│ Payload:                                                         │
│ {                                                                │
│   "name": "How satisfied?",                                     │
│   "options": ["1 - ...", "2 - ...", ..., "5 - ..."],           │
│   "sendDelayMinutes": 30,                                       │
│   "feedbackResponses": {                                        │
│     "rating1": { contentType: "text", content: {...}, ... },    │
│     "rating2": { contentType: "text", content: {...}, ... },    │
│     "rating3": { contentType: "text", content: {...}, ... },    │
│     "rating4": { contentType: "text", content: {...}, ... },    │
│     "rating5": { contentType: "image", content: {...}, ... }    │
│   },                                                             │
│   "isActive": true                                              │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│          DMS Backend - Saves to Tenant MongoDB                  │
│                                                                   │
│ Collection: PollTemplate                                        │
│ Database: test (tenant-specific)                                │
│ Connection: TenantConnection (getTenantConnection)              │
│                                                                   │
│ Saved Document:                                                 │
│ {                                                                │
│   "_id": ObjectId("..."),                                       │
│   "tenantId": "69df8bcbf951c03063572728",                       │
│   "name": "How satisfied?",                                     │
│   "options": [...],                                             │
│   "sendDelayMinutes": 30,                                       │
│   "feedbackResponses": {                                        │
│     "rating1": {...},                                           │
│     "rating2": {...},                                           │
│     "rating3": {...},                                           │
│     "rating4": {...},                                           │
│     "rating5": {...}                                            │
│   },                                                             │
│   "isActive": true,                                             │
│   "createdAt": "2026-04-29T10:30:00Z",                          │
│   "updatedAt": "2026-04-29T10:30:00Z"                           │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│    Backend Triggers: syncFeedbackResponsesToWAHA()              │
│                                                                   │
│ (feedback.controller.js line ~45)                               │
│                                                                   │
│ Extracts ratings 1-5 from feedbackResponses                     │
│ Formats for WAHA endpoint                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│     WAHA Middleware - Saves Feedback Responses                  │
│                                                                   │
│ Endpoint: POST http://localhost:3001/waha/tenant-feedback/...   │
│                                                                   │
│ Payload to WAHA:                                                │
│ {                                                                │
│   "templates": [                                                │
│     {                                                            │
│       "rating": 1,                                              │
│       "contentType": "text",                                    │
│       "content": { "text": "We're sorry to hear..." },          │
│       "isEnabled": true                                         │
│     },                                                           │
│     {                                                            │
│       "rating": 2,                                              │
│       "contentType": "text",                                    │
│       "content": { "text": "Thank you for feedback..." },       │
│       "isEnabled": true                                         │
│     },                                                           │
│     ...                                                          │
│     {                                                            │
│       "rating": 5,                                              │
│       "contentType": "image",                                   │
│       "content": { "url": "https://...", "caption": "..." },    │
│       "isEnabled": true                                         │
│     }                                                            │
│   ]                                                              │
│ }                                                                │
│                                                                   │
│ WAHA Stores in:                                                 │
│ Collection: FeedbackMapping                                     │
│ Database: waha_db (WAHA's own database)                         │
│ Documents (one per rating):                                     │
│ {                                                                │
│   "_id": ObjectId("..."),                                       │
│   "tenantId": "69df8bcbf951c03063572728",                       │
│   "rating": 1,                                                  │
│   "contentType": "text",                                        │
│   "content": { "text": "..." },                                 │
│   "isEnabled": true                                             │
│ }                                                                │
│ (repeated for ratings 2, 3, 4, 5)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Storage Locations

### **1. DMS Backend (Multi-Tenant MongoDB Atlas)**

**Connection Details:**
- **URL:** From `tenantData.mongoUri`
  - Example: `mongodb+srv://user:pass@cluster.mongodb.net/?appName=Cluster1`
- **Database:** From `tenantData.mongoDbName`
  - Example: `test`
- **Connection:** Via `getTenantConnection(mongoUri, dbName)` in `config/tenantDb.js`
- **Pool:** Connections cached in `Map` for reuse

**Collection: `PollTemplate`**

```javascript
// Example document
{
  "_id": ObjectId("60d5ec49c1234567890abcd1"),
  "tenantId": "69df8bcbf951c03063572728",
  "name": "How satisfied were you?",
  "options": [
    "1 - Very Unhappy",
    "2 - Unhappy",
    "3 - Neutral",
    "4 - Happy",
    "5 - Very Happy"
  ],
  "sendDelayMinutes": 30,
  "feedbackResponses": {
    "rating1": {
      "contentType": "text",
      "content": { "text": "We're sorry to hear you had a poor experience..." },
      "isEnabled": true
    },
    "rating2": {
      "contentType": "text",
      "content": { "text": "Thank you for your feedback..." },
      "isEnabled": true
    },
    "rating3": {
      "contentType": "text",
      "content": { "text": "Thank you for your rating..." },
      "isEnabled": true
    },
    "rating4": {
      "contentType": "text",
      "content": { "text": "Thank you for rating us as good..." },
      "isEnabled": true
    },
    "rating5": {
      "contentType": "image",
      "content": {
        "url": "https://example.com/thank-you.jpg",
        "caption": "Thank you for excellent rating! 🎉"
      },
      "isEnabled": true
    }
  },
  "messageType": "feedbackMessage",
  "contentType": "poll",
  "isActive": true,
  "createdAt": ISODate("2026-04-29T10:30:00.000Z"),
  "updatedAt": ISODate("2026-04-29T10:30:00.000Z")
}
```

**Indexes:**
- `{ tenantId: 1, isActive: 1 }`

---

### **2. WAHA Middleware (Separate MongoDB)**

**Connection Details:**
- **URL:** WAHA's own MongoDB (configured in WAHA)
- **Database:** `waha_db` (or configured in WAHA)
- **Endpoint:** `POST http://localhost:3001/waha/tenant-feedback/:tenantId`

**Collection: `FeedbackMapping`**

```javascript
// WAHA stores 5 separate documents (one per rating)

// Rating 1 Response
{
  "_id": ObjectId("..."),
  "tenantId": "69df8bcbf951c03063572728",
  "rating": 1,
  "contentType": "text",
  "content": { "text": "We're sorry to hear..." },
  "isEnabled": true
}

// Rating 2 Response
{
  "_id": ObjectId("..."),
  "tenantId": "69df8bcbf951c03063572728",
  "rating": 2,
  "contentType": "text",
  "content": { "text": "Thank you for feedback..." },
  "isEnabled": true
}

// ... ratings 3, 4 ...

// Rating 5 Response
{
  "_id": ObjectId("..."),
  "tenantId": "69df8bcbf951c03063572728",
  "rating": 5,
  "contentType": "image",
  "content": {
    "url": "https://example.com/thank-you.jpg",
    "caption": "Thank you for excellent rating! 🎉"
  },
  "isEnabled": true
}
```

**Lookup:** When poll vote webhook arrives, WAHA queries:
```javascript
// WAHA Middleware (internal)
FeedbackMapping.findOne({
  tenantId: "69df8bcbf951c03063572728",
  rating: 5,  // Extracted from patient's vote
  isEnabled: true
})
// Returns the rating5 response document
// Sends it back to patient via WhatsApp
```

---

## Complete Save Flow

### Step 1: Admin Saves Template (Frontend)

```javascript
// frontend/src/components/PollTemplateModal.jsx
const handleSubmit = async (e) => {
  // formData contains poll question + responses
  const response = await api.put(
    `/api/feedback/poll-templates/${template.id}`,
    formData
  );
}
```

### Step 2: Backend Receives (Controller)

```javascript
// dms_backend/controllers/feedback.controller.js
export async function updatePollTemplate(req, res) {
  const { PollTemplate } = req.tenantModels;
  const { name, options, sendDelayMinutes, isActive, feedbackResponses } = req.body;
  
  // Validate 1-5 format
  // ...
  
  // Save to DMS
  const template = await PollTemplate.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    { name, options, sendDelayMinutes, isActive, feedbackResponses },
    { new: true }
  );
  
  // ✅ Template now saved in DMS MongoDB
}
```

### Step 3: Sync to WAHA (Automatic)

```javascript
// dms_backend/controllers/feedback.controller.js
await syncFeedbackResponsesToWAHA(req.user.tenantId, template);

async function syncFeedbackResponsesToWAHA(tenantId, pollTemplate) {
  const feedbackResponses = pollTemplate.feedbackResponses;
  
  // Extract each rating
  const templates = [1, 2, 3, 4, 5].map((rating) => {
    const ratingKey = `rating${rating}`;
    return {
      rating,
      contentType: feedbackResponses[ratingKey].contentType,
      content: feedbackResponses[ratingKey].content,
      isEnabled: feedbackResponses[ratingKey].isEnabled
    };
  });
  
  // Send to WAHA
  const response = await fetch(
    `http://localhost:3001/waha/tenant-feedback/${tenantId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates })
    }
  );
  
  // ✅ Responses now saved in WAHA MongoDB
}
```

---

## Query Examples

### Query 1: Get Poll Template from DMS

```javascript
// From DMS backend
const pollTemplate = await PollTemplate.findById(templateId);

console.log(pollTemplate.name);                    // "How satisfied were you?"
console.log(pollTemplate.options);                 // ["1 - Very Unhappy", ...]
console.log(pollTemplate.feedbackResponses.rating5.content.url);
// "https://example.com/thank-you.jpg"
```

### Query 2: Get Response from WAHA (on webhook)

```javascript
// Inside WAHA Middleware (when patient votes)
const ratingKey = extractRatingFromVote(webhookPayload);  // e.g., 5

const response = await FeedbackMapping.findOne({
  tenantId: webhookPayload.tenantId,
  rating: ratingKey,
  isEnabled: true
});

// Returns:
// {
//   "contentType": "image",
//   "content": { "url": "...", "caption": "..." },
//   "isEnabled": true
// }

// Send this response to patient
```

---

## Key Points

✅ **Poll Template (DMS)** = Admin configures everything in one place  
✅ **Feedback Responses (DMS + WAHA)** = Stored in both for redundancy  
✅ **Auto-Sync** = When template saved, responses synced to WAHA  
✅ **Multi-Tenant** = Each clinic has separate MongoDB database  
✅ **Non-Blocking Sync** = WAHA sync errors don't prevent template save  

---

## Database URLs (from your setup)

**DMS Backend:**
```
MongoDB Atlas
URL: mongodb+srv://yashitforuppo_db_user:Yashit-dms@cluster1.w4rxwc0.mongodb.net/?appName=Cluster1
Database: test (per tenant)
Collections: PollTemplate, WhatsAppSettings, Appointment, Patient, etc
```

**WAHA Middleware:**
```
Separate MongoDB instance (configured in WAHA env)
Collections: FeedbackMapping, Message, etc
```

---

## Summary Table

| Item | Location | Database | Collection | Format |
|------|----------|----------|------------|--------|
| **Poll Template** | DMS | MongoDB Atlas (tenant-specific) | `PollTemplate` | Single doc with feedbackResponses subdocuments |
| **Feedback Responses** (copy) | DMS | MongoDB Atlas (tenant-specific) | `PollTemplate.feedbackResponses` | Nested in template doc |
| **Feedback Responses** (primary) | WAHA | WAHA MongoDB | `FeedbackMapping` | 5 separate docs (one per rating) |
| **Poll Question** | DMS | MongoDB Atlas | `PollTemplate` | Template.name |
| **1-5 Options** | DMS | MongoDB Atlas | `PollTemplate` | Template.options array |

---

## Sync Timing

- **Create:** Template saved → Immediately syncs to WAHA
- **Update:** Template updated → Immediately syncs to WAHA
- **Delete:** Template deleted → No sync needed (WAHA keeps old mappings)

If WAHA sync fails, template still saves (errors logged, no user impact).
