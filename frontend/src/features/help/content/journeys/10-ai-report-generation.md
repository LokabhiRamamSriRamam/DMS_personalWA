---
title: AI Clinical Report Generation
journey: Clinical
order: 10
tags: [ai, report, dictation, transcript, patient letter, soap, hp note, clinical note, generate, deliver, connect cloud]
keywords: generate ai report, dictate consultation, patient letter, clinical note, soap note, hp note, approve and send, send to patient, save report, transcription, voice dictation, ai report templates
video:
---

## AI Clinical Report Generation

Molaris AI listens to your consultation dictation and instantly writes a polished, structured clinical document — a patient letter, SOAP note, H&P note, or full dentistry note — ready to review, edit, and send directly to the patient.

---

## The Complete Process

### Step 1 — Open the AI Report modal

From any patient's treatment page, click **Generate Clinical Report** (bottom right). The three-step wizard opens: **Dictate → Review → Deliver**.

---

### Step 2 — Choose a template

Select the document type you need from the dropdown. Seven templates are available:

| Template | Best used for |
|---|---|
| **Patient Letter** | A warm, plain-language summary the patient takes home. Covers all topics discussed. |
| **Dentistry Note** | Full clinical note — chief complaint, history, examination findings, diagnoses, and treatment plan. |
| **Comprehensive Dental Exam** | Detailed exam record with practitioner details, extra-oral/intra-oral findings, radiographs, consent, and procedures conducted. |
| **SOAP Note** | Structured Subjective / Objective / Assessment / Plan format. |
| **SOAP Note (Issues Centric)** | Same SOAP format but organized issue-by-issue — ideal for multi-problem visits. |
| **H&P Note** | History & Physical format with History, Examination, Investigations, Impression, and Management Plan. |
| **H&P Note (Issues Centric)** | H&P with Assessment and Plan broken out per individual issue or condition. |

> **Choose the template before recording.** You cannot change it mid-session.

---

### Step 3 — Choose the detail level

| Level | Length | Use when |
|---|---|---|
| **Brief** | ~200 words | Quick follow-up, simple extraction |
| **Standard** | Normal | Most consultations |
| **Detailed** | 600+ words | Complex multi-problem visits, medico-legal cases |

---

### Step 4 — Configure options

**Save to Connect Cloud** — automatically saves the finished report as a text file in the patient's Connect Cloud folder (Clinical Notes → today's date). Tick this on by default.

**Auto-fill Treatment Page** — after generation, Molaris AI also extracts structured data from the dictation and fills in the patient's Chief Complaint, Consultation Notes, Advice, Treatment Plan, Medications, and schedules a Recall appointment automatically. Useful when you dictate a comprehensive consultation and want the treatment page populated without re-entering data.

---

### Step 5 — Dictate the consultation

Click the **blue microphone button** to start recording. Speak naturally — include:

- Patient's presenting complaint
- History (medical, dental, social)
- Examination findings
- Radiographic findings
- Diagnoses
- Treatment performed today
- Treatment plan going forward
- Medications prescribed
- Advice given
- Follow-up / recall date

Click the microphone again to **Stop**, or use **Pause** (shown during recording) to take a break without losing audio.

> **Tip:** You can preview your recording while paused using the playback bar — listen back and then Resume if you need to add more.

> **Bluetooth or wired headset mic?** Tap Pause on your headset button — DMS picks up the hardware Pause action.

---

### Step 6 — Review the transcript

After stopping, Molaris AI transcribes your voice. This takes 20–60 seconds depending on recording length.

When ready, the transcript appears in the **Review** step. Read it through — tap **Edit** to correct any mishearing (doctor names, drug names, or tooth numbers are common errors). Your edits are applied before generation.

---

### Step 7 — Generate the report

Click **Generate [Template Name]**. The AI streams the document in real time — you will see the text appear word by word.

If it takes too long, click **Cancel** to abort and go back to the transcript. The job resets immediately so you can try again.

If the result is wrong, click **Regenerate** (shown in the Report header) — this takes you back to the transcript where you can edit and try again.

---

### Step 8 — Review and edit the patient letter

Once generation is complete, the **Deliver** step shows the finished document. Click anywhere in the report text (or click **Edit**) to make manual corrections — names, specific tooth numbers, cost amounts. The document is editable plain text.

---

### Step 9 — Approve & Send

Choose where the report should go:

**Save to Connect Cloud** — stores the file in the patient's Drive folder under Clinical Notes. A link to open the file appears after saving.

**Email to patient** — sends the report as an attachment. Review the To address, Subject, and message body (pre-filled from your Settings → Report Delivery template). Edit before sending.

**WhatsApp to patient** — sends a text message with the report text and, if already saved to Connect Cloud, appends the file link. Review the phone number and message before sending.

Click **Approve & Send** to execute all ticked channels in one action. Green ticks confirm each channel.

---

### Step 10 — Done

Once all channels succeed, a confirmation screen appears. You can:
- **Open the saved file** directly from the confirmation screen
- **Record Again** — start a fresh report for the same or different patient
- **Done** — close the modal

---

## Troubleshooting

**Report is generating but nothing appears / spinner stuck**
The AI may be cold-starting. Wait up to 3–4 minutes — tokens usually start streaming shortly after. If nothing happens, click Cancel and try again.

**Transcript has the wrong words (tooth numbers, drug names)**
Always edit the transcript in Step 6 before generating. Dental terminology is harder to transcribe accurately. Typing corrections there takes 10 seconds and produces a much better output.

**"Generation is already in progress"**
Another window or tab submitted the same job. Wait 5 minutes — the system automatically reclaims stale jobs — then click Generate again.

**Email or WhatsApp failed in Approve & Send**
The report still exists — it is not lost. Fix the issue (check email address format, check WhatsApp connection in WhatsApp settings) and click Approve & Send again. Only the failed channels will retry.

**Report saved to Connect Cloud but I can't see it**
Open the patient's profile → Files tab → Clinical Notes folder. All AI-generated reports are saved there, organized by date.

---

## Settings — Customise email and WhatsApp templates

Go to **Settings → Report Delivery** to pre-configure:
- Default delivery channels (which are ticked by default when the Deliver step opens)
- Email subject and body template with variables: `{{patientName}}`, `{{doctorName}}`, `{{clinicName}}`, `{{date}}`, `{{templateName}}`
- WhatsApp message template with the same variables

Changes here apply to all future reports — you can still edit each message before sending.
