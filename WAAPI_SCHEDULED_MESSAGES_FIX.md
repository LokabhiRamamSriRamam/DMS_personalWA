# WhatsApp WAAPI: Displaying Scheduled Send Time for Queued Messages

## Problem

Your Connect Desk shows messages with `status: "queued"` but **does NOT display when they are scheduled to be sent** (`scheduledAt`).

Example from your screenshot:
```
Status: queued
Created: 27/4/2026, 01:51:26
Updated: 27/4/2026, 01:51:26
Message: {...}

❌ MISSING: When will this message actually be sent?
```

The DMS backend IS sending `scheduledAt` to WAAPI, but:
1. WAAPI may not be storing it in the database
2. Or the UI isn't displaying it

## Root Cause Analysis

### DMS Backend (✅ Correct)
The code correctly calculates and sends `scheduledAt`:

```javascript
// File: dms_backend/services/whatsapp.service.js (line 166-172)

if (eventType === 'appointmentReminder' && appointmentStartTime) {
  // Calculate: send 24 hours (or configured) before appointment
  const hoursBeforeMs = (eventConfig.hoursBeforeAppointment ?? 24) * 3_600_000;
  const fireAt = new Date(new Date(appointmentStartTime).getTime() - hoursBeforeMs);
  payload.scheduledAt = fireAt.toISOString();  // ← Sent to WAAPI
}
```

Example payload sent to WAAPI:
```json
{
  "tenantId": "clinic123",
  "to": "918104489957",
  "messageType": "appointmentReminder",
  "message": "...",
  "scheduledAt": "2026-04-27T02:58:00.000Z"  // ← When message should send
}
```

### WAAPI Backend (❌ Problem)
The WAAPI service either:
1. **Not storing `scheduledAt`** in the message document
2. **Storing it but not exposing** it in the API response
3. **Not displaying it** in the UI

## Solution: Update WAAPI Schema & Display

### For WAAPI Backend Developer

#### 1. Update Message Schema
The message document should include `scheduledAt`:

```javascript
// waapi/models/Message.js

const MessageSchema = new mongoose.Schema({
  messageId: String,
  tenantId: String,
  to: String,
  from: String,
  account: String,
  type: String,  // "appointmentReminder", "appointmentBooked", etc.
  status: { 
    type: String, 
    enum: ['queued', 'sent', 'failed', 'delivered'],
    default: 'queued'
  },
  
  // ← ADD THESE FIELDS:
  scheduledAt: Date,           // When message should be sent
  scheduledFor: String,        // Formatted version for UI: "27/4/2026 at 02:58 AM"
  
  // Existing fields:
  message: mongoose.Schema.Types.Mixed,
  attempts: { type: Number, default: 0 },
  sentAt: Date,
  deliveredAt: Date,
  failureReason: String,
  
  timestamps: true
});
```

#### 2. Save `scheduledAt` When Creating Message
```javascript
// waapi/controllers/message.controller.js

export async function createMessage(req, res) {
  const { tenantId, to, messageType, message, scheduledAt } = req.body;
  
  // Format for display
  const scheduledFor = scheduledAt 
    ? new Date(scheduledAt).toLocaleString('en-IN', { 
        dateStyle: 'short', 
        timeStyle: 'short' 
      })
    : null;
  
  const msg = await Message.create({
    tenantId,
    to,
    type: messageType,
    message,
    status: 'queued',
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    scheduledFor,  // ← Store formatted version too
    createdAt: new Date(),
  });
  
  res.json(msg);
}
```

#### 3. Update Message Details API Response
```javascript
// waapi/controllers/message.controller.js

export async function getMessageDetails(req, res) {
  const msg = await Message.findById(req.params.messageId);
  
  res.json({
    messageId: msg._id,
    status: msg.status,
    to: msg.to,
    from: msg.from,
    type: msg.type,
    message: msg.message,
    
    // ← ADD THESE:
    scheduledAt: msg.scheduledAt,
    scheduledFor: msg.scheduledFor,
    
    attempts: msg.attempts,
    timeline: {
      created: msg.createdAt,
      updated: msg.updatedAt,
      sent: msg.sentAt,
      delivered: msg.deliveredAt,
    },
  });
}
```

#### 4. Update UI to Display Scheduled Time
In your wa-backend frontend (Connect Desk or wherever you're viewing messages):

```jsx
// Show scheduled send time in message details

function MessageDetails({ message }) {
  return (
    <div>
      <p><strong>Status:</strong> {message.status}</p>
      <p><strong>To:</strong> {message.to}</p>
      <p><strong>Type:</strong> {message.type}</p>
      
      {/* ← ADD THIS SECTION: */}
      {message.status === 'queued' && message.scheduledFor && (
        <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
          <p className="text-sm font-semibold text-yellow-800">⏱️ Scheduled Send Time</p>
          <p className="text-base text-yellow-900">{message.scheduledFor}</p>
          <p className="text-xs text-yellow-700 mt-1">
            {new Date(message.scheduledAt) > new Date() 
              ? `In ${getTimeDifference(message.scheduledAt)}`
              : 'Should have been sent already - check status'}
          </p>
        </div>
      )}
      
      <p><strong>Message:</strong> {JSON.stringify(message.message)}</p>
      <p><strong>Attempts:</strong> {message.attempts}</p>
      <p><strong>Created:</strong> {new Date(message.createdAt).toLocaleString()}</p>
    </div>
  );
}
```

## Current State of DMS Backend

✅ **Already Fixed:**
- `buildMessage()` calculates `scheduledAt` correctly
- `sendToWAAPI()` includes `scheduledAt` in payload
- For appointmentReminder: schedules 24 hours (or config) before appointment

✅ **Example Calculation:**
```
Appointment start_time: 27/4/2026 02:58 AM
hoursBeforeAppointment: 24 (default)
  ↓
Calculated scheduledAt: 26/4/2026 02:58 AM
  ↓
WAAPI receives: "scheduledAt": "2026-04-26T02:58:00.000Z"
```

## What Needs to Happen

### For DMS Team (✅ DONE)
- [x] Calculate `scheduledAt` in buildMessage()
- [x] Send `scheduledAt` to WAAPI in payload
- [x] Log all messages with status tracking

### For WAAPI Team (❌ TODO)
- [ ] Accept `scheduledAt` in POST /messages/send
- [ ] Store `scheduledAt` in message document
- [ ] Return `scheduledAt` in GET /messages/:id response
- [ ] Display `scheduledAt` in UI
- [ ] Show formatted time like "27/4/2026 at 02:58 AM"
- [ ] Add indicator: "Scheduled to send in X hours"

## Immediate Workaround

**Until WAAPI is updated**, you can calculate the scheduled time manually:

For appointment reminders:
```
Scheduled Send Time = appointment.start_time - 24 hours
                    = 27/4/2026 02:58 AM - 24h
                    = 26/4/2026 02:58 AM
```

Check the appointment details to see when the reminder will send.

## Test Query

To verify DMS is sending `scheduledAt` correctly:

```bash
# Check backend logs
tail -f dms_backend.log | grep "WAAPI payload"

# You should see:
[WhatsApp] WAAPI payload:
{
  "tenantId": "...",
  "to": "918104489957",
  "messageType": "appointmentReminder",
  "message": "Hey Avtansh...",
  "scheduledAt": "2026-04-26T02:58:00.000Z"  ← This is being sent!
}
```

## Summary

| Component | Sends `scheduledAt` | Stores `scheduledAt` | Displays `scheduledAt` |
|-----------|--------|---------|---------|
| **DMS Backend** | ✅ YES | N/A | N/A |
| **WAAPI** | ← receives | ❓ UNKNOWN | ❌ NO |
| **Connect Desk UI** | - | - | ❌ NO |

**Next step:** WAAPI team needs to store and expose `scheduledAt` in message details.

