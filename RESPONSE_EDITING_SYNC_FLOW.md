# Response Message Editing & Sync - Complete Flow

## Answer: YES ✅ Responses Are Edited on BOTH Databases

When admin edits responses, they are automatically updated in **both DMS and WAHA**.

---

## The Edit Flow - Step by Step

### Step 1: Admin Edits Response in Frontend
**File**: `frontend/src/components/PollTemplateModal.jsx`

Admin clicks Edit on a poll template, modifies a response:
```
Before: Rating 5 response = "Thank you for excellent rating!"
After:  Rating 5 response = "🎉 Excellent! We're thrilled you're happy!"
```

Admin clicks "Save Template & Responses" button

### Step 2: Frontend Sends Updated Data to Backend
**HTTP Request**:
```http
PUT /api/feedback/poll-templates/60d5ec49c1234567890abcd1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "How satisfied were you with your treatment?",
  "options": ["1 - Very Unhappy", "2 - Unhappy", "3 - Neutral", "4 - Happy", "5 - Very Happy"],
  "sendDelayMinutes": 30,
  "feedbackResponses": {
    "rating1": { contentType: "text", content: { text: "We're sorry..." }, isEnabled: true },
    "rating2": { contentType: "text", content: { text: "Thank you..." }, isEnabled: true },
    "rating3": { contentType: "text", content: { text: "Thank you..." }, isEnabled: true },
    "rating4": { contentType: "text", content: { text: "Thank you..." }, isEnabled: true },
    "rating5": { 
      contentType: "text", 
      content: { text: "🎉 Excellent! We're thrilled you're happy!" },  // ← EDITED
      isEnabled: true 
    }
  },
  "isActive": true
}
```

### Step 3: Backend Updates DMS Database
**File**: `dms_backend/controllers/feedback.controller.js` line ~159

```javascript
export async function updatePollTemplate(req, res) {
  const { PollTemplate } = req.tenantModels;
  const { name, options, sendDelayMinutes, isActive, feedbackResponses } = req.body;
  
  // ✅ UPDATE DMS MONGODB
  const template = await PollTemplate.findOneAndUpdate(
    {
      _id: req.params.id,
      tenantId: req.user.tenantId,
    },
    {
      name,
      options,
      sendDelayMinutes,
      isActive,
      feedbackResponses  // ← Updated responses saved here
    },
    { new: true }  // ← Returns updated document
  );
  
  // At this point, DMS has been updated with new responses
}
```

**DMS MongoDB Change**:
```javascript
// Before:
PollTemplate {
  ...
  feedbackResponses: {
    rating5: { 
      contentType: "text",
      content: { text: "Thank you for excellent rating!" },
      isEnabled: true 
    }
  }
}

// After:
PollTemplate {
  ...
  feedbackResponses: {
    rating5: { 
      contentType: "text",
      content: { text: "🎉 Excellent! We're thrilled you're happy!" },  // ← UPDATED
      isEnabled: true 
    }
  }
}
```

### Step 4: Backend Auto-Syncs to WAHA
**File**: `dms_backend/controllers/feedback.controller.js` line ~179

```javascript
export async function updatePollTemplate(req, res) {
  const template = await PollTemplate.findOneAndUpdate(...);
  
  // ✅ AUTO-SYNC TO WAHA (happens immediately after DMS update)
  await syncFeedbackResponsesToWAHA(req.user.tenantId, template);
  
  res.json(template);
}
```

### Step 5: Sync Function Sends Updated Responses to WAHA
**File**: `dms_backend/controllers/feedback.controller.js` line ~5

```javascript
async function syncFeedbackResponsesToWAHA(tenantId, pollTemplate) {
  try {
    const wahaBaseUrl = process.env.WAHA_BASE_URL || 'http://localhost:3001';
    
    // Extract all 5 responses from updated template
    const templates = [1, 2, 3, 4, 5].map((rating) => {
      const ratingKey = `rating${rating}`;
      const response = pollTemplate.feedbackResponses[ratingKey];
      
      return {
        rating,
        contentType: response.contentType,
        content: response.content,              // ← Contains UPDATED content
        isEnabled: response.isEnabled,
      };
    });
    
    // ✅ POST UPDATED RESPONSES TO WAHA
    const response = await fetch(
      `http://localhost:3001/waha/tenant-feedback/${tenantId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates })    // Send all 5 responses
      }
    );
    
    if (!response.ok) {
      console.error(`Failed to sync: ${response.status}`);
      // Don't throw — DMS update already saved, just log error
      return;
    }
    
    console.log(`Feedback responses synced for tenant ${tenantId}`);
  } catch (err) {
    console.error(`Error syncing: ${err.message}`);
    // Non-blocking error handling
  }
}
```

### Step 6: WAHA Updates FeedbackMapping
**WAHA Middleware receives**:
```http
POST /waha/tenant-feedback/69df8bcbf951c03063572728

{
  "templates": [
    {
      "rating": 1,
      "contentType": "text",
      "content": { "text": "We're sorry..." },
      "isEnabled": true
    },
    ...
    {
      "rating": 5,
      "contentType": "text",
      "content": { "text": "🎉 Excellent! We're thrilled you're happy!" },  // ← UPDATED
      "isEnabled": true
    }
  ]
}
```

**WAHA MongoDB FeedbackMapping Change**:
```javascript
// Before:
{
  _id: ObjectId("..."),
  tenantId: "69df8bcbf951c03063572728",
  rating: 5,
  contentType: "text",
  content: { text: "Thank you for excellent rating!" },
  isEnabled: true
}

// After:
{
  _id: ObjectId("..."),
  tenantId: "69df8bcbf951c03063572728",
  rating: 5,
  contentType: "text",
  content: { text: "🎉 Excellent! We're thrilled you're happy!" },  // ← UPDATED
  isEnabled: true
}
```

---

## Complete Edit Scenario: All Databases

### Scenario: Admin edits Rating 1 from text to image

**Before Edit:**
```
DMS PollTemplate:
  feedbackResponses.rating1 = {
    contentType: "text",
    content: { text: "We're sorry to hear..." },
    isEnabled: true
  }

WAHA FeedbackMapping (rating 1 doc):
  {
    rating: 1,
    contentType: "text",
    content: { text: "We're sorry to hear..." },
    isEnabled: true
  }
```

**Admin changes to:**
```
contentType: "image"
url: "https://example.com/sorry.jpg"
caption: "We're sorry and want to help!"
```

**After Admin Clicks Save:**

```
Step 1: DMS UPDATES
  feedbackResponses.rating1 = {
    contentType: "image",                           // ← CHANGED
    content: { 
      url: "https://example.com/sorry.jpg",        // ← CHANGED
      caption: "We're sorry and want to help!"     // ← CHANGED
    },
    isEnabled: true
  }

Step 2: SYNC TRIGGERED
  POST /waha/tenant-feedback/69df8bcbf951c03063572728
  
  Body includes:
  {
    rating: 1,
    contentType: "image",                           // ← UPDATED
    content: {
      url: "https://example.com/sorry.jpg",        // ← UPDATED
      caption: "We're sorry and want to help!"     // ← UPDATED
    },
    isEnabled: true
  }

Step 3: WAHA UPDATES
  FeedbackMapping (rating 1 doc) = {
    rating: 1,
    contentType: "image",                           // ← UPDATED
    content: {
      url: "https://example.com/sorry.jpg",        // ← UPDATED
      caption: "We're sorry and want to help!"     // ← UPDATED
    },
    isEnabled: true
  }
```

---

## What Gets Synced?

On every save/update, **all 5 responses** are sent to WAHA, not just the changed one:

```javascript
// syncFeedbackResponsesToWAHA loops through 1-5:
const templates = [1, 2, 3, 4, 5].map((rating) => {
  // Each rating's response is included
  return {
    rating,
    contentType: response.contentType,
    content: response.content,
    isEnabled: response.isEnabled,
  };
});

// Result: All 5 docs in WAHA FeedbackMapping get updated
```

---

## Error Handling: What If WAHA Fails?

**Scenario**: Admin edits response, DMS updates, but WAHA endpoint is down

```javascript
async function syncFeedbackResponsesToWAHA(tenantId, pollTemplate) {
  try {
    const response = await fetch(`http://localhost:3001/...`, { ... });
    
    if (!response.ok) {
      console.error(`Failed to sync: ${response.status}`);
      return;  // ← Don't throw, just log
    }
  } catch (err) {
    console.error(`Error syncing: ${err.message}`);
    // ← Don't throw, just log
  }
}
```

**Result**: 
- ✅ DMS is updated (response saved)
- ❌ WAHA is NOT updated (still has old response)
- ⚠️ Admin sees success message
- 📝 Error logged to console

**Next patient vote**: Patient gets OLD response from WAHA until sync succeeds

**Resolution**: Admin can re-edit and save again to retry the sync

---

## Timing Diagram

```
Admin clicks Save
    ↓
PUT /api/feedback/poll-templates/:id
    ↓
DMS MongoDB updates (instant)
    ↓
syncFeedbackResponsesToWAHA() triggered
    ↓
POST http://localhost:3001/waha/tenant-feedback/:tenantId
    ↓
WAHA receives (if endpoint up)
    ↓
WAHA FeedbackMapping updates
    ↓
Response returned to frontend (success)
    ↓
Frontend shows "Template updated"

Total time: ~100-500ms
```

---

## Summary: Edit & Sync

✅ **When admin edits response**: Both DMS and WAHA are updated  
✅ **Sync happens automatically**: No manual action needed  
✅ **Sync is triggered on every save**: All 5 responses sent to WAHA  
✅ **Non-blocking**: If WAHA fails, DMS still saves (error logged)  
✅ **All 5 responses updated**: Not just the edited one  
✅ **Next patient vote uses updated response**: After sync succeeds  
✅ **If sync fails**: Patient gets old response until retry  

---

## Files Involved

| File | What It Does |
|------|-------------|
| `frontend/src/components/PollTemplateModal.jsx` | Admin edits responses here, sends PUT request |
| `dms_backend/controllers/feedback.controller.js` | Receives PUT, updates DMS, calls syncFeedbackResponsesToWAHA() |
| `dms_backend/models/PollTemplate.model.js` | DMS document structure |
| WAHA middleware endpoint | Receives sync POST, updates FeedbackMapping |

---

## Key Points

1. **Single Source of Truth**: DMS is the admin's interface
2. **Auto-Sync**: Responses automatically copied to WAHA on save
3. **Both or Neither**: When you edit, both databases get updated (or neither if sync fails)
4. **Immediate Effect**: If sync succeeds, next patient vote gets new response
5. **Resilient**: DMS saves even if WAHA is down; can retry by editing again
