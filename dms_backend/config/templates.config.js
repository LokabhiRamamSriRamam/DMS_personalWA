const PATIENT_LETTER_STRUCTURE = `Dear [Patient's Name], (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.)

"It was a pleasure to see you today and review your health concerns. I appreciate the time you took to share details about your health and personal life." [Insert small talk relevant to the visit] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.) "I've summarised our discussion below to help you remember what we covered."

Topic/Issue #1: [Description of topic or issue 1] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.)
During our discussion, we talked about [describe the first topic/issue in simple terms] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.). This means [explain the condition, symptom, or topic in layperson's terms] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.). It is important to [describe any actions, reasons for concern, or key details to remember] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.). [If applicable, mention treatments, lifestyle adjustments, or monitoring required.] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.)

Topic/Issue #2: [Description of topic or issue 2] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.)
Another key point we covered was [describe the second topic/issue] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.). This relates to [explain in simple language] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.). You may notice [describe symptoms or improvements to monitor] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.) and should consider [mention treatments, advice, or follow-ups if relevant] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.).

Topic/Issue #3: [Description of topic or issue 3] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.)
We also discussed [describe the third topic/issue, if applicable] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.). To address this, [lay out the plan or approach discussed, with clear explanations] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.). [Include any specific recommendations for actions or observations.] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.)
(If more topics are discussed, continue numbering using the same format.)

Next Steps:
[Summarise the specific next actions for the patient] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.)

"Thank you for trusting me with your care. If you have any questions or concerns about anything we discussed, please do not hesitate to reach out."

"Warm regards,"
[Clinician's Name and Title] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.)
[Contact Information, if necessary] (Only include if explicitly mentioned in transcript, contextual or clinical note, else omit section entirely.)`;

const PATIENT_LETTER_EXAMPLE = `Dear Mr. Kumar,

It was a pleasure to see you today and review your health concerns. I appreciate the time you took to share details about your health and personal life. I've summarised our discussion below to help you remember what we covered.

Topic/Issue #1: Throbbing Tooth Pain (Lower Left Molar)
During our discussion, we talked about the severe throbbing pain you have been experiencing in your lower left back tooth. This pain started about three weeks ago as a sharp twinge when you had cold or sweet foods, but since yesterday it has become constant and severe. The pain is now rated 8 out of 10 at rest and shoots up to 10 out of 10 when you try to bite down. It is also radiating towards your ear. Heat makes the pain worse, and Paracetamol only provided temporary relief for about an hour.

After examining the tooth and taking an X-ray, we found that the decay under the old silver filling has reached the nerve of the tooth. The infection has also spread into the bone around the roots, forming an abscess. This explains the constant throbbing and the swelling you may have noticed under your jaw on the left side.

Today, we opened the tooth to drain the pressure and infection, which should provide immediate relief from the throbbing. We have placed a temporary dressing. You have been prescribed antibiotics (Amoxicillin 500mg three times daily and Metronidazole 400mg three times daily for seven days) to control the infection, along with Paracetamol 650mg as needed for pain. Please complete the full course of antibiotics even if the pain goes away.

Topic/Issue #2: Diabetes and Dental Treatment
We also discussed how your diabetes affects your dental treatment. Because your blood sugar has been elevated (HbA1c 8.1 three months ago and fasting glucose 198 mg/dL this morning), we need to be extra careful with any infection or invasive procedure. Before we can proceed with the full root canal treatment to save the tooth, we need better control of your blood sugar.

Please contact your physician and obtain a recent fasting blood sugar reading and ideally a new HbA1c. We are aiming for a fasting glucose below 150 mg/dL before starting the full root canal procedure. A referral note has been provided for your physician regarding the pre-operative diabetic control required.

Topic/Issue #3: Root Canal Treatment Plan
We discussed the two main options for this tooth: extraction or root canal treatment to save it. Given that this is a critical molar for chewing, I strongly recommend trying to save it with a root canal treatment.

Once the infection is controlled and your blood sugar is stable, we will perform the full three-visit root canal treatment on tooth 36. After the root canal is complete, the tooth will need a core build-up and a full coverage crown (likely a PFM or Zirconia crown) to prevent fracture, as molars become brittle after root canal treatment.

Next Steps:
- Start the antibiotics immediately and complete the full seven-day course
- Continue Paracetamol 650mg every 6 hours as needed for pain, but do not exceed four doses in 24 hours
- Contact your physician regarding diabetic control and obtain a recent fasting blood sugar reading and HbA1c
- Avoid chewing on the left side entirely
- Maintain gentle oral hygiene around the affected area
- Return in three days (Friday) for re-evaluation to check the infection status

Thank you for trusting me with your care. If you have any questions or concerns about anything we discussed, please do not hesitate to reach out.

Warm regards,
Dr. Avtansh Giri
Dentist`;

const PATIENT_LETTER_SYSTEM_INSTRUCTION = `Never come up with your own patient details, assessment, plan, interventions, evaluation, and plan for continuing care - use only the transcript, contextual notes or clinical note as a reference for the information included in your note. If any information related to a placeholder has not been explicitly mentioned in the transcript, contextual notes or clinical note, you must not state the information has not been explicitly mentioned in your output, just leave the relevant placeholder or omit the placeholder completely. This letter is to be sent to the patient; use patient-friendly, clear and empathetic language, avoid medical jargon or explain it briefly in simple terms, and keep instructions concise and actionable.`;

export const TEMPLATES = [
  {
    id:                'patient_letter_v1',
    name:              'Patient Letter',
    description:       'A patient-friendly summary letter covering all topics discussed during the visit, written in empathetic language for the patient to take home.',
    type:              'Document',
    category:          'Patient Comms',
    specialty:         'General Dentistry',
    systemInstruction: PATIENT_LETTER_SYSTEM_INSTRUCTION,
    structure:         PATIENT_LETTER_STRUCTURE,
    example:           PATIENT_LETTER_EXAMPLE,
  },
];

export function getTemplateById(id) {
  return TEMPLATES.find(t => t.id === id) ?? null;
}
