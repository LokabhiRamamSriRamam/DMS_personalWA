# Feedback Poll UI Integration — WhatsApp Messages Tab

## Overview
Added complete feedback poll configuration UI to the WhatsApp Messages tab, allowing clinic administrators to enable/disable feedback polls and view how the system works with conditional follow-up messages per rating.

---

## Changes Made

### 1. Updated EVENTS Array (WhatsAppPage.jsx, line 12)

Added feedback poll event definition:
```javascript
{ key: 'feedbackPoll', label: 'Feedback Poll', description: 'Send rating poll (1-5) with conditional follow-ups', icon: 'poll', color: 'teal', variables: ['name', 'firstName'], isFeedback: true }
```

**Fields:**
- `key: 'feedbackPoll'` — Unique identifier
- `isFeedback: true` — Flag to route to FeedbackPollEditor instead of standard TemplateEditor
- `variables` — Available placeholders (patient name)
- `color: 'teal'` — Color scheme for UI

### 2. Added Teal Color to COLOR_MAP (line 28)

```javascript
teal: { card: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800', icon: 'text-teal-600 dark:text-teal-400', iconBg: 'bg-teal-100 dark:bg-teal-900/40' }
```

### 3. Created FeedbackPollEditor Component (line 1500)

**Purpose:** Dedicated UI for feedback poll configuration in the Messages tab

**Features:**
- Back button + event badge header
- Enable/disable toggle with description
- Three info boxes explaining:
  1. **What is feedback polling** — 5-rating scale with conditional follow-ups
  2. **How it works** — 4-step numbered workflow
  3. **Smart follow-ups** — How ratings trigger different messages

**Visual Structure:**

```
┌─ Back Button + Feedback Poll Badge
├─ Enable/Disable Toggle
│  └─ "Allow doctors to send 1-5 rating polls to patients"
├─ Info Box (Teal)
│  └─ Details about feedback poll + follow-up options per rating
├─ How It Works Section
│  ├─ Step 1: Doctor sends poll from Treatment page
│  ├─ Step 2: Doctor configures follow-ups for each rating
│  ├─ Step 3: Patient responds via WhatsApp
│  └─ Step 4: Auto follow-up sent based on rating
└─ Smart Follow-ups Info Box (Blue)
   └─ Explanation of conditional message logic
```

**Key Information Displayed:**

The UI explains to clinic admins:
- 5 rating levels (1⭐ Very Dissatisfied → 5⭐ Very Satisfied)
- Each rating can have custom follow-up message
- System automatically sends correct message based on patient's rating
- Enables differentiated responses:
  - Happy patients: Request reviews/referrals
  - Neutral/Satisfied: Gather improvement feedback
  - Unhappy: Immediate resolution & apology

### 4. Updated MessagesTab Component (line 1611)

Modified to include feedback polls section:

```javascript
{/* ── Feedback Poll ── */}
{feedbackEvent && (
  <section className="space-y-2">
    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Feedback Poll</p>

    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
      <span className="material-symbols-outlined text-teal-500 dark:text-teal-400 flex-shrink-0 mt-0.5" style={{ fontSize: 16 }}>info</span>
      <p className="text-xs text-teal-700 dark:text-teal-300 leading-relaxed">
        Configure a <strong>5-rating poll</strong> (1-5 stars). Patients receive the poll question, and you can set different <strong>conditional follow-up messages</strong> for each rating level.
        Enable this to allow doctors to send feedback polls after appointments.
      </p>
    </div>

    <EventCard event={feedbackEvent}
      evConfig={settings.events?.[feedbackEvent.key]}
      byLang={templatesByLangFor(feedbackEvent.key)}
      isMutex={false} mutexActiveLabel={null}
      onToggle={onToggle} onConfigure={onConfigure} />
  </section>
)}
```

**Position in Tab:** Between "Appointment" section and "Post-Visit Message" section

### 5. Updated Editor Routing (line 1945)

Added conditional routing to use FeedbackPollEditor for feedback events:

```javascript
{activeTab === 'messages' && activeEditor && activeEvent && (
  activeEvent.isFeedback
    ? <FeedbackPollEditor ... />
    : activeEvent.isJourney
    ? <JourneyEditor ... />
    : <TemplateEditor ... />
)}
```

---

## User Workflow

### Clinic Admin View (WhatsApp Messages Tab)

1. **Enable Feedback Polls:**
   - Go to WhatsApp → Messages tab
   - Find "Feedback Poll" section
   - Click toggle to enable
   - Info boxes explain what will happen

2. **View Configuration:**
   - EventCard shows "Feedback Poll" status (Active/Inactive)
   - Click to open FeedbackPollEditor for more details

3. **FeedbackPollEditor Screen Shows:**
   - Current enable/disable state
   - Detailed explanation of how the system works
   - 4-step workflow visualization
   - Information about smart conditional follow-ups

### Doctor View (Treatment Page)

1. Click **"📊 Send Feedback Poll"** button
2. **Step 1:** Configure poll question and schedule
3. **Step 2:** Set follow-up messages for each rating (1-5⭐)
4. Click **"Save & Complete"**
5. System queues poll via WhatsApp
6. When patient responds, auto-sends matching follow-up message

---

## Data Flow

```
Admin enables "feedbackPoll" event in WhatsApp Messages tab
│
├─ Setting stored in Settings.events.feedbackPoll.enabled = true
│
└─ Doctors can now use "Send Feedback Poll" in Treatment page
    │
    ├─ Patient receives poll with 5 rating options
    │
    ├─ Patient taps rating (e.g., 4-Satisfied)
    │
    ├─ WAAPI sends webhook to DMS
    │
    ├─ DMS stores PollResponse with tenantId, rating, feedbackType
    │
    └─ DMS auto-sends configured follow-up message for that rating
        │
        └─ Patient receives follow-up via WhatsApp
```

---

## Files Modified

1. **frontend/src/pages/WhatsAppPage.jsx**
   - Added `feedbackPoll` event to EVENTS array
   - Added `teal` color to COLOR_MAP
   - Created `FeedbackPollEditor` component (54 lines)
   - Updated `MessagesTab` to include feedback section
   - Updated editor routing to handle `isFeedback` events

---

## UI Features

### Feedback Poll Section in Messages Tab
- Teal-colored section header
- Teal info box explaining the concept
- EventCard showing enable/disable status
- Shows "Active" badge when enabled

### FeedbackPollEditor Screen
- Back button to return to Messages list
- Event badge showing "Feedback Poll"
- Large enable/disable toggle with description
- **Three info boxes:**
  1. **Teal box:** What is feedback polling and how it works
  2. **Numbered workflow box:** 4-step process visualization
  3. **Blue box:** Smart follow-ups explanation

### Visual Design
- Consistent with WhatsApp page design
- Teal color scheme (primary color for feedback polls)
- Dark mode support
- Material Design icons
- Clear hierarchy and spacing

---

## Integration Points

### With Other Systems

1. **Backend:**
   - `GET /whatsapp/settings` → fetches feedback poll enabled status
   - `PUT /whatsapp/settings` → saves feedback poll toggle

2. **Treatment Page:**
   - "📊 Send Feedback Poll" button calls `FeedbackPollModal`
   - Modal sends poll to backend API `/whatsapp/feedback/send`

3. **Webhook Handler:**
   - Receives poll response at `/whatsapp/feedback/webhook`
   - Auto-triggers follow-up message based on rating

---

## Testing Checklist

- [ ] WhatsApp page loads without errors
- [ ] "Messages" tab displays feedback poll section
- [ ] Feedback poll info boxes display correctly
- [ ] Enable/disable toggle saves setting to backend
- [ ] Clicking feedback poll event opens FeedbackPollEditor
- [ ] FeedbackPollEditor displays all 3 info boxes
- [ ] Back button returns to Messages list
- [ ] Dark mode colors apply correctly
- [ ] Responsive design works on mobile
- [ ] Teal color scheme consistent throughout

---

## Future Enhancements

1. **Custom Poll Questions:** Allow admins to create reusable poll templates
2. **Analytics Dashboard:** Show poll response distribution (1-5 ratings) per clinic
3. **A/B Testing:** Compare different poll questions or follow-up messages
4. **Rating Analytics:** Charts showing patient satisfaction trends over time
5. **Auto-Generated Follow-ups:** AI-suggested follow-up messages for each rating
6. **Timing Configuration:** Allow admins to set delay for auto follow-up messages
7. **Template Management:** Save and reuse follow-up message sets across patients

---

## Summary

The feedback poll configuration UI is now integrated into the WhatsApp Messages tab, providing:
- ✅ Clear enable/disable controls for clinic admins
- ✅ Detailed explanation of feedback polling workflow
- ✅ Visual representation of the 4-step process
- ✅ Information about smart conditional follow-ups
- ✅ Consistent UI/UX with rest of WhatsApp page
- ✅ Dark mode support
- ✅ Mobile responsive design

This UI educates admins about the feedback system capabilities while allowing simple one-click enablement of the feature for doctors to use in Treatment page.
