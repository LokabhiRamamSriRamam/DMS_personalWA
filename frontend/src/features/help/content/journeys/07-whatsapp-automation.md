---
title: WhatsApp Automation Setup
journey: Communication
order: 7
tags: [whatsapp, automation, chatbot, flow, reminder, template, message, QR code, WAHA]
keywords: scan QR to connect clinic number, flows trigger on events, test flow before activating, one active flow per trigger type
video:
---

## WhatsApp Automation Setup

Send automatic appointment reminders, payment receipts, and custom messages to patients — all triggered by events in the DMS, without manual effort.

---

### Step 1 — Connect the Clinic's WhatsApp Number

1. Go to **WhatsApp** → **Settings** in the sidebar.
2. Click **Connect Number**.
3. A QR code appears on screen.
4. On the clinic's phone, open WhatsApp → **Linked Devices** → **Link a Device** → scan the QR code.
5. Status changes to **Connected** (green). The clinic number is now ready to send automated messages.

> **Keep the phone online.** The clinic's WhatsApp session depends on the phone staying connected to the internet. If the phone goes offline, the session may drop.

---

### Step 2 — Build a Flow

Flows are the automated conversation sequences that fire when something happens in the DMS.

1. Go to **WhatsApp** → **Chatbot Builder**.
2. Click **+ New Flow** and give it a name (e.g. "Appointment Reminder").
3. In the visual builder, add nodes:
   - **Trigger Node** — choose the event that starts the flow (e.g. *Appointment Booked*, *Invoice Generated*, *Appointment 24h Before*).
   - **Message Node** — write the message to send. Use variables like `{{patient_name}}`, `{{appointment_date}}`, `{{amount_due}}` to personalise.
   - **Delay Node** — optional pause between messages (e.g. send a reminder 24 hours before, then a follow-up 1 hour before).
   - **Condition Node** — branch the flow based on patient response (e.g. if patient replies "1" = confirm, "2" = reschedule).
4. Connect nodes by dragging edges from one to the next.
5. Click **Save Flow**.

### Step 3 — Test the Flow

1. Click **Test Flow** on the saved flow.
2. Enter a test phone number (use your own or a dummy number).
3. Trigger the event manually to fire the flow.
4. Confirm the message arrives with the correct personalisation.

### Step 4 — Activate the Flow

1. On the flow card, toggle **Active**.
2. From this point, every time the trigger event fires in the DMS, the flow runs automatically.

---

### Things to Keep in Mind

> **Only one active flow per trigger type.** If you have two "Appointment Booked" flows both active, messages duplicate. Always deactivate the old one before activating a new version.

> **Variables only work if the data exists.** If `{{patient_email}}` is in the message but the patient has no email, the message will either fail or show a blank. Check patient records are complete.

> **Keep initial message templates short.** WhatsApp message templates for the first outbound message (to a patient who has not messaged you first in 24 hours) must be under 1024 characters and cannot contain promotional language. Use them only for service-related content.

> **Session drops require a re-scan.** If the clinic number shows as **Disconnected**, repeat the QR scan process. This usually happens after the phone restarted or lost internet overnight.

> **Test before going live.** A flow error sent to 100 patients at once is embarrassing and hard to retract. Always test with your own number first.

---

### Common Flows to Set Up

| Flow Name | Trigger | Message |
|-----------|---------|---------|
| Appointment Reminder | 24h before appointment | "Hi {{patient_name}}, reminder for your appointment at {{clinic_name}} tomorrow at {{time}}." |
| Booking Confirmation | Appointment Created | "Hi {{patient_name}}, your appointment at {{clinic_name}} is confirmed for {{date}} at {{time}}." |
| Payment Receipt | Invoice Paid | "Hi {{patient_name}}, payment of ₹{{amount}} received. Thank you! — {{clinic_name}}" |
| Outstanding Balance | Invoice Partially Paid | "Hi {{patient_name}}, a balance of ₹{{outstanding}} is pending. Please contact us to settle it." |
