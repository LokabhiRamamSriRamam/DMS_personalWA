# Quick Reference - Where Data Is Stored

## TL;DR

### **Poll Templates (ADMIN CONFIGURES)**
- **Saved in:** DMS Backend MongoDB
- **Connection:** `mongodb+srv://yashitforuppo_db_user:Yashit-dms@cluster1.w4rxwc0.mongodb.net/?appName=Cluster1`
- **Database:** `test` (per-tenant)
- **Collection:** `PollTemplate`
- **What's stored:** Poll question + 5 rating options + 5 feedback responses
- **Indexes:** `{ tenantId: 1, isActive: 1 }`

### **Feedback Responses (AUTO-SYNCED TO WAHA)**
- **Primary storage:** DMS MongoDB (inside PollTemplate document)
- **Secondary storage:** WAHA Middleware MongoDB (FeedbackMapping collection)
- **Sync trigger:** When admin saves template
- **Sync mechanism:** `POST http://localhost:3001/waha/tenant-feedback/:tenantId`

---

## Example Document in DMS

```javascript
// Collection: PollTemplate
// Database: test
// Tenant: Smile Dental Care (69df8bcbf951c03063572728)

{
  "_id": ObjectId("60d5ec49c1234567890abcd1"),
  "tenantId": "69df8bcbf951c03063572728",
  
  // Poll Question
  "name": "How satisfied were you with your treatment?",
  
  // Poll Options (1-5, MANDATORY)
  "options": [
    "1 - Very Unhappy",
    "2 - Unhappy",
    "3 - Neutral",
    "4 - Happy",
    "5 - Very Happy"
  ],
  
  // When to send poll (in minutes after appointment completion)
  "sendDelayMinutes": 30,
  
  // ✅ FEEDBACK RESPONSES (stored here, synced to WAHA)
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
  
  // Metadata
  "messageType": "feedbackMessage",
  "contentType": "poll",
  "isActive": true,
  "createdAt": ISODate("2026-04-29T10:30:00Z"),
  "updatedAt": ISODate("2026-04-29T10:30:00Z")
}
```

---

## Example Documents in WAHA

When the above template is saved, WAHA receives and stores:

```javascript
// Collection: FeedbackMapping
// Database: waha_db (WAHA's database)
// Tenant: 69df8bcbf951c03063572728

// Document 1: Rating 1 Response
{
  "_id": ObjectId("..."),
  "tenantId": "69df8bcbf951c03063572728",
  "rating": 1,
  "contentType": "text",
  "content": { "text": "We're sorry to hear you had a poor experience..." },
  "isEnabled": true
}

// Document 2: Rating 2 Response
{
  "_id": ObjectId("..."),
  "tenantId": "69df8bcbf951c03063572728",
  "rating": 2,
  "contentType": "text",
  "content": { "text": "Thank you for your feedback..." },
  "isEnabled": true
}

// Document 3: Rating 3 Response
{
  "_id": ObjectId("..."),
  "tenantId": "69df8bcbf951c03063572728",
  "rating": 3,
  "contentType": "text",
  "content": { "text": "Thank you for your rating..." },
  "isEnabled": true
}

// Document 4: Rating 4 Response
{
  "_id": ObjectId("..."),
  "tenantId": "69df8bcbf951c03063572728",
  "rating": 4,
  "contentType": "text",
  "content": { "text": "Thank you for rating us as good..." },
  "isEnabled": true
}

// Document 5: Rating 5 Response
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

---

## Code Location References

### DMS Backend - Poll Template Saving

```javascript
// File: dms_backend/controllers/feedback.controller.js

// CREATE
export async function createPollTemplate(req, res) {
  const { PollTemplate } = req.tenantModels;  // ← Gets connection to tenant DB
  const template = new PollTemplate({...});
  const saved = await template.save();        // ← Saves to DMS MongoDB
  await syncFeedbackResponsesToWAHA(...);     // ← Syncs to WAHA
}

// UPDATE
export async function updatePollTemplate(req, res) {
  const template = await PollTemplate.findOneAndUpdate({...});
  const saved = template;
  await syncFeedbackResponsesToWAHA(...);     // ← Syncs to WAHA
}
```

### WAHA Sync Function

```javascript
// File: dms_backend/controllers/feedback.controller.js

async function syncFeedbackResponsesToWAHA(tenantId, pollTemplate) {
  const wahaBaseUrl = process.env.WAHA_BASE_URL || 'http://localhost:3001';
  
  // Build 5 template objects (one per rating)
  const templates = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    contentType: pollTemplate.feedbackResponses[`rating${rating}`].contentType,
    content: pollTemplate.feedbackResponses[`rating${rating}`].content,
    isEnabled: pollTemplate.feedbackResponses[`rating${rating}`].isEnabled,
  }));
  
  // Send to WAHA
  const response = await fetch(
    `${wahaBaseUrl}/waha/tenant-feedback/${tenantId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates })  // ← Sends 5 templates to WAHA
    }
  );
  
  // WAHA stores each template in FeedbackMapping collection
}
```

### Tenant Connection (Multi-Tenant)

```javascript
// File: dms_backend/middleware/resolveTenant.js

import { getTenantConnection } from '../config/tenantDb.js';

export async function resolveTenant(req, res, next) {
  const tenant = await Tenant.findById(req.user.tenantId);
  
  // Get connection to THAT CLINIC'S database
  const tenantConn = await getTenantConnection(
    tenant.mongoUri,    // ← Each tenant has their own MongoDB URI
    tenant.mongoDbName  // ← Each tenant has their own database
  );
  
  // Register models on this connection
  req.tenantModels = getTenantModels(tenantConn);
  // Now req.tenantModels.PollTemplate reads/writes from THAT clinic's DB
}
```

---

## Data Journey

### 1. Admin Creates Template

```
Frontend Form
    ↓
POST /api/feedback/poll-templates
    ↓
feedback.controller.js → createPollTemplate()
    ↓
PollTemplate.save()
    ↓
Saved in: test db (DMS) → PollTemplate collection
    ↓
syncFeedbackResponsesToWAHA() triggered
    ↓
POST http://localhost:3001/waha/tenant-feedback/69df8bcbf951c03063572728
    ↓
WAHA Middleware receives
    ↓
Saved in: waha_db → FeedbackMapping collection (5 documents)
```

### 2. Patient Votes on Poll

```
Patient on WhatsApp votes "5 - Very Happy"
    ↓
WAHA webhook fires
    ↓
WAHA Middleware extracts rating: 5
    ↓
Query FeedbackMapping:
  { tenantId: "69df8bcbf951c03063572728", rating: 5 }
    ↓
Returns: { contentType: "image", content: { url: "...", caption: "..." } }
    ↓
WAHA sends response back to patient
    ↓
Patient receives image on WhatsApp
```

---

## Connection Strings

| System | URL |
|--------|-----|
| **DMS Backend (Multi-Tenant)** | `mongodb+srv://yashitforuppo_db_user:Yashit-dms@cluster1.w4rxwc0.mongodb.net/?appName=Cluster1` |
| **WAHA Middleware** | Configured in WAHA environment (check WAHA docs) |

---

## Collections Summary

### DMS MongoDB (test database)

```
Collections:
├── PollTemplate          ← Poll questions + responses stored here
├── WhatsAppSettings
├── Appointment
├── Patient
├── Visit
├── Invoice
├── InventoryItem
└── ... (14+ other collections)
```

### WAHA MongoDB (waha_db database)

```
Collections:
├── FeedbackMapping       ← Responses synced here (5 docs per template)
├── Message
├── WhatsAppLog
└── ... (other WAHA collections)
```

---

## Verification

### Check what's in DMS

```javascript
// In MongoDB Atlas console for test database:
db.polltemplate.findOne({ tenantId: "69df8bcbf951c03063572728" })
```

### Check what's in WAHA

```javascript
// In WAHA's MongoDB console for waha_db database:
db.feedbackmappings.find({ tenantId: "69df8bcbf951c03063572728" })
// Should return 5 documents (ratings 1-5)
```

---

## Key Points

✅ **Poll Template**: ONE document in DMS with all responses embedded  
✅ **Feedback Responses**: SAME data, but also synced to WAHA as 5 separate docs  
✅ **DMS is Source of Truth**: Admin edits in DMS, syncs happen automatically  
✅ **WAHA is Action Store**: Middleware queries WAHA to send responses on webhook  
✅ **Multi-Tenant**: Each clinic has separate database, separate docs  
✅ **Non-Blocking Sync**: If WAHA fails, template still saves to DMS  
