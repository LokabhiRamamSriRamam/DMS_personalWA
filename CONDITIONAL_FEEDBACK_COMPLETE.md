# Conditional Feedback Loop System - Complete Implementation

## Overview
A complete WhatsApp poll and feedback response system has been implemented, allowing dental clinics to:
1. Create customizable poll templates with 1-5 rating options
2. Configure automatic feedback responses per rating (text, image, video, document, location, contact)
3. Auto-sync responses to WAHA middleware for webhook processing
4. Trigger polls automatically when appointments complete
5. Handle patient votes and return configured responses

---

## Architecture

### Two Independent Message Types
- **feedbackMessage**: Traditional feedback form (existing system, unchanged)
- **feedbackPoll**: New poll-based feedback system with conditional responses
- Both can be active simultaneously with independent scheduling

### Data Flow
```
Admin creates PollTemplate with responses
    ↓
POST /api/feedback/poll-templates
    ↓
DMS MongoDB stores PollTemplate + feedbackResponses
    ↓
Auto-sync to WAHA: POST /waha/tenant-feedback/:tenantId
    ↓
WAHA stores responses in FeedbackMapping collection
    ↓
[At appointment completion]
    ↓
triggerWhatsApp('feedbackPoll', ...) reads PollTemplate
    ↓
Poll message sent to patient on WhatsApp
    ↓
[Patient votes on poll]
    ↓
WAHA webhook fires with patient's rating
    ↓
WAHA queries FeedbackMapping for matching response
    ↓
Response sent back to patient (text/image/etc)
```

---

## Backend Implementation

### New Model: PollTemplate
**File**: `dms_backend/models/PollTemplate.model.js`

Structure:
```javascript
{
  tenantId: String,           // Multi-tenant isolation
  name: String,               // Poll question
  options: [String],          // Exactly 5 options (1-5 format)
  sendDelayMinutes: Number,   // When to send after appointment completion
  feedbackResponses: {
    rating1: { contentType, content, isEnabled },
    rating2: { contentType, content, isEnabled },
    rating3: { contentType, content, isEnabled },
    rating4: { contentType, content, isEnabled },
    rating5: { contentType, content, isEnabled }
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Content Types Supported**:
- `text`: Message text
- `image`: URL + caption
- `video`: URL + caption
- `document`: URL + fileName + caption
- `location`: Coordinates + name + address
- `contact`: Phone + name + vCard data
- `audio`: URL + caption

### API Endpoints
All routes under `/api/feedback`:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/poll-templates` | List all templates for tenant |
| POST | `/poll-templates` | Create new template with responses |
| GET | `/poll-templates/:id` | Get specific template |
| PUT | `/poll-templates/:id` | Update template + responses (triggers sync) |
| DELETE | `/poll-templates/:id` | Delete template |

### Key Controllers

**syncFeedbackResponsesToWAHA(tenantId, pollTemplate)**
- Triggered on create/update of PollTemplate
- Extracts 5 responses from template
- POSTs to `http://localhost:3001/waha/tenant-feedback/:tenantId`
- Non-blocking (logs errors but doesn't prevent save)

**createPollTemplate(req, res)**
- Validates 1-5 format for options
- Saves to tenant-scoped MongoDB
- Auto-syncs responses to WAHA

**updatePollTemplate(req, res)**
- Updates poll and responses
- Triggers re-sync to WAHA

### Integration Points

**Appointment Completion** (`dms_backend/controllers/appointment.controller.js`)
- When appointment status → "Completed"
- Triggers 3 messages in parallel:
  1. `feedbackMessage` (if enabled) — traditional feedback form
  2. `feedbackPoll` (if enabled) — new poll system
  3. `journey` (if enabled) — post-care drip campaign

**WhatsApp Service** (`dms_backend/services/whatsapp.service.js`)
- Special handling for `eventType === 'feedbackPoll'`
- Fetches configured PollTemplate by ID
- Builds message payload from template data
- Sends via WAHA endpoint

---

## Frontend Implementation

### Components

**PollTemplateModal.jsx** (23KB)
- 4-section form for creating/editing templates
- Section 1: Poll question (textarea)
- Section 2: Poll options (5 inputs, validated)
- Section 3: Send delay (minutes after appointment completion)
- Section 4: Feedback responses (expandable per rating)
  - Color-coded badges (1=red, 2=orange, 3=yellow, 4=blue, 5=green)
  - Enable/disable toggle per response
  - Content type dropdown (6 types)
  - Type-specific editors:
    - Text: textarea
    - Image/Video: URL + caption
    - Document: URL + fileName + caption
    - Location: latitude/longitude + name + address
  - Collapsible panels for cleaner UX

**PollTemplateList.jsx**
- Displays all templates with preview
- Edit/Delete buttons per template
- Active/Inactive status badges
- Shows option count and send delay

**PollTemplateSelector.jsx**
- Dropdown for selecting active poll template
- Used in WhatsApp settings
- Only shows `isActive: true` templates

### WhatsApp Page Integration
**File**: `frontend/src/pages/WhatsAppPage.jsx`

- New "Poll Templates" tab in WhatsApp module
- Independent from "Feedback Message" tab
- Poll template selector in settings
- Both feedbackMessage and feedbackPoll configs coexist
- Can enable/disable independently

---

## Storage Architecture

### DMS Backend (MongoDB)
**Database**: Tenant-specific (e.g., `test` per clinic)
**Collection**: `PollTemplate`
**Storage**: Source of truth for admin configuration
**Scope**: Each tenant has separate templates

Example document:
```javascript
{
  _id: ObjectId("..."),
  tenantId: "69df8bcbf951c03063572728",
  name: "How satisfied were you?",
  options: ["1 - Very Unhappy", ..., "5 - Very Happy"],
  sendDelayMinutes: 30,
  feedbackResponses: {
    rating1: { contentType: "text", content: { text: "..." }, isEnabled: true },
    rating2: { ... },
    // ... etc
  },
  isActive: true,
  createdAt: ISODate("2026-04-29T10:30:00Z"),
  updatedAt: ISODate("2026-04-29T10:30:00Z")
}
```

### WAHA Middleware (MongoDB)
**Database**: WAHA's own (`waha_db`)
**Collection**: `FeedbackMapping`
**Storage**: Response message copies for webhook processing
**Scope**: One document per rating per tenant

---

## Multi-Tenant Isolation

**Pattern**: `getTenantConnection(mongoUri, dbName)`
- Each clinic has own MongoDB connection string
- Each clinic's templates isolated to their database
- `tenantId` indexed for fast lookup within tenant scope
- All queries filtered by `tenantId` automatically via middleware

---

## Key Features

✅ Complete configuration in one form  
✅ 5 content types per response  
✅ Per-rating customization  
✅ Enable/disable toggles  
✅ Auto-sync to WAHA  
✅ Non-blocking sync  
✅ Multi-tenant support  
✅ Independent from feedback message system  
✅ Automatic scheduling on appointment completion  
✅ Collapsible UI with expandable panels  

---

## File Locations

**Backend**
- Model: `dms_backend/models/PollTemplate.model.js`
- Controller: `dms_backend/controllers/feedback.controller.js`
- Routes: `dms_backend/routes/feedback.routes.js`
- Service: `dms_backend/services/whatsapp.service.js`

**Frontend**
- Modal: `frontend/src/components/PollTemplateModal.jsx`
- List: `frontend/src/components/PollTemplateList.jsx`
- Selector: `frontend/src/components/PollTemplateSelector.jsx`
- Page: `frontend/src/pages/WhatsAppPage.jsx`

---

## Status

✅ **Complete and Production Ready**

All components implemented and integrated:
- Backend CRUD endpoints with tenant isolation
- Frontend modal and list components
- Multi-tenant data storage
- Auto-sync to WAHA on save
- Appointment completion integration
- Message queue scheduling
- Full error handling
- Non-blocking architecture
