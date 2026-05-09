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

const DENTISTRY_NOTE_STRUCTURE = `Chief Complaint:
 - [Detail the chief complaint or primary reason for presentation along with duration.] (Only include chief complaint if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)

 History of Presenting Complaints:
 - [Provide a detailed description of all complaints one-by-one, including onset, progression, aggravating or alleviating factors, associated symptoms, duration, intensity, nature, frequency of symptoms, etc.] (Only include detailed description of complaint(s) if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)
 - [Include description of any cosmetic concerns.] (Only include cosmetic concerns if explicitly mentioned in the transcript, contextual notes, or clinical note; otherwise, omit completely.)

 Past Dental History:
 - [Mention any previous dental treatments, surgeries, significant dental diseases, or injuries, including dates and outcomes.] (Only include previous dental treatments, surgeries, significant diseases, or injuries if explicitly mentioned in the transcript, contextual notes, or clinical note; otherwise, omit completely.)

 Past Medical History:
 - [List any known medical conditions, previous surgeries, hospitalizations, ongoing treatments, allergies, and medications being taken.] (Only include medical conditions, surgeries, hospitalizations, ongoing treatments, allergies, or medications if explicitly mentioned in the transcript, contextual notes, or clinical note; otherwise omit completely.)

 Personal History:
 - [Mention patient's past oral hygiene practices.] (Only include oral hygiene practices if explicitly mentioned in the transcript, contextual notes, or clinical note; otherwise omit completely.)
 - [Mention any habits with a focus on dentition such as clenching, grinding, biting, tobacco chewing, smoking, or alcohol intake.] (Only include habit history if explicitly mentioned in the transcript, contextual notes, or clinical note; otherwise omit completely.)

 Family History:
 - [Mention family history including any relevant genetic or familial diseases, especially those related to dental or systemic health.] (Only include family history if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)

 Extra Oral Examination:
 - [Mention/describe any extra-oral examination findings such as lymph node examination, facial symmetry, TMJ examination (e.g., 3-finger mouth opening test), lips, etc.] (Only include extra-oral examination findings if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)

 Intra Oral Examination:
 - [Mention/describe any soft tissue examination findings, including findings on buccal mucosa, tongue, palate, floor of the mouth, vestibule, etc.] (Only include soft tissue findings if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)
 - [Mention/describe any gingival examination findings, including color, contour, size, consistency, surface texture, position, bleeding position, exudation, amount of attached gingiva, gingival tension test, etc.] (Only include gingival findings if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)
 - [Mention/describe any hard tissue examination findings, including number of teeth present, missing teeth, dental caries, restored teeth, periapical problems, pathologic migration, overhanging restorations, impacted teeth, supernumerary teeth, wasting diseases (attrition/abrasion/erosion/abfraction), mobility grading, shade analysis, stains/deposits, etc.] (Only include hard tissue findings if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)
 - [Mention any findings on oral hygiene status, e.g., good/fair/poor based on OHI index, etc.] (Only include oral hygiene findings if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)
 - [Mention/describe any occlusion analysis findings, such as type of occlusion (Angles classification, etc.), overbite, overjet, crossbite, open contacts, crowding, facets, supra contacts, trauma from occlusion, Fremitus test, etc.] (Only include occlusion analysis findings if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)
 - [Mention/describe any other intra-oral examination findings.] (Only include other intra-oral findings if explicitly mentioned in the transcript, contextual notes, or clinical note; otherwise omit completely.)

 Radiographic Findings:
 - [Describe radiographic findings from dental radiographs, noting any pathologies like caries, cysts, tumors, tooth positions, bone levels, etc., and mention comparisons with previous radiographs.] (Only include radiographic findings if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)

 Laboratory Investigations:
 - [Mention/list any investigations, along with results, such as blood counts, hemoglobin, platelet count, bleeding time, clotting time, ESR, blood sugar, etc., including dates where possible] (Only include investigation results and dates if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)
 - [Mention any biopsy findings.] (Only include biopsy findings if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)

 Diagnoses:
 - [List/mention diagnoses one-by-one.] (Only include diagnoses if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely.)

 Prognosis:
 - [Describe any overall prognosis.] (Only include overall prognosis if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely. Never come up with your own prognosis or evaluation.)
 - [Describe any individual prognosis for teeth at risk.] (Only include individual prognosis for teeth at risk if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely. Never come up with your own prognosis or evaluation.)

 Treatment:
 - [List and describe treatment plans/recommendations one-by-one.] (Only include treatment plans/recommendations if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely. Never come up with your own treatment plans.)
 - [List and describe preventative plans such as oral hygiene recommendations, etc., one-by-one.] (Only include preventative plans if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely. Never come up with your own preventative plans.)
 - [Mention review date or follow-up plans.] (Only include review date or follow-up plans if explicitly mentioned in the transcript, contextual notes, or clinical note, otherwise omit completely. Never come up with your own review or follow-up plans.)

 (Never come up with your own patient details, assessment, plan, interventions, evaluation, and plan for continuing care - use only the transcript, contextual notes or clinical note as a reference for the information included in your note. If any information related to a placeholder has not been explicitly mentioned in the transcript, contextual notes or clinical note, you must not state the information has not been explicitly mentioned in your output, just leave the relevant placeholder or omit the placeholder completely. Use as many lines, paragraphs or bullet points, depending on the format, as needed to capture all the relevant information from the transcript.)`;

const DENTISTRY_NOTE_EXAMPLE = `Chief Complaint:
 - Severe pain in lower left back tooth for 3 days.

 History of Presenting Complaints:
 - Lower left molar pain: Dull, throbbing ache at rest. Sharp, shooting pain with cold and hot stimuli. Pain lingers approximately 30 seconds after stimulus removed. Pain severity 6-7/10 at rest, 9/10 with cold stimuli. Spontaneous nocturnal pain. Pain on biting. Onset 3 days ago following consumption of cold beverage.

 Past Dental History:
 - Amalgam restoration on tooth #36 placed approximately 5-6 years ago.

 Past Medical History:
 - Mild hypertension, well controlled. BP 130/85 recorded two weeks ago. No diabetes. No cardiac conditions.

 Personal History:
 - Oral hygiene practices: Regular brushing twice daily, occasional flossing.
 - Habits: Denies tobacco, alcohol, and betel nut chewing. Occasional teeth grinding at night.

 Family History:
 - No significant family history of dental disease.

 Extra Oral Examination:
 - No palpable submandibular or cervical lymphadenopathy. Facial symmetry normal. No external swelling. TMJ normal, no pain on opening or closing. 3-finger mouth opening test normal (approximately 40mm).

 Intra Oral Examination:
 - Soft tissue findings: Mild gingivitis in lower posterior region.
 - Gingival findings: Mild erythema and edema in lower posterior region, particularly around tooth #36. Bleeding on probing in affected area.
 - Hard tissue findings: Tooth #36 has large old amalgam restoration on occlusal surface with recurrent caries around margin, specifically on mesial aspect. Deep decay extending close to pulp chamber. Tender to percussion. Prolonged, lingering response to cold test (approximately 15 seconds indicating pulpal involvement). Teeth #35 and #37 NAD on percussion and cold testing.
 - Oral hygiene status: Generally good.
 - Occlusion analysis: Bilateral even occlusion. No crossbite. Normal overbite and overjet. No signs of trauma from occlusion.

 Radiographic Findings:
 - Periapical radiograph of tooth #36 taken today: Deep decay visible under old filling extending close to pulp chamber. Slight widening of periodontal ligament space around apex of mesial root indicating inflammation and early periapical infection.

 Diagnoses:
 - Tooth #36: Symptomatic Irreversible Pulpitis with Acute Apical Periodontitis.
 - Recurrent Caries associated with existing Amalgam Restoration.

 Prognosis:
 - Overall prognosis: Good if treated promptly with root canal therapy. Guarded if extraction pursued.
 - Tooth #36: Restorable with endodontic treatment and subsequent crown restoration.

 Treatment:
 - Phase 1: Emergency & Pain Management
   - Immediate initiation of RCT on Tooth 36: access opening and initial cleaning today.
   - Amoxicillin 500mg + Clavulanic Acid 125mg (Augmentin 625mg equivalent), one tablet BD for 5 days.
   - Aceclofenac 100mg + Paracetamol 325mg (Zerodol-P), one tablet TDS PRN for pain.
   - Second RCT appointment in 3 days for canal shaping and cleaning.
 - Phase 2: Definitive Restoration
   - Permanent core buildup following successful RCT completion (3-4 sittings).
   - Full coverage crown (PFM or Zirconia) on Tooth 36.
 - Phase 3: Maintenance & Periodontal Health
   - Full mouth scaling and root planing at separate appointment.
   - OHI: Bass brushing technique, dental floss, interdental brushes.
   - Dietary counselling: reduced sugar intake, especially sticky sweets.
   - Advised to continue Metformin and monitor blood sugar closely given diabetic status.
   - Avoid chewing hard or sticky foods on treated side until permanent crown placed.
 - Review: Thursday 10 AM for second RCT appointment. Scaling appointment to be scheduled for following Tuesday.`;

const DENTISTRY_NOTE_SYSTEM_INSTRUCTION = `You are a dental clinician documenting a comprehensive patient history and treatment plan from a consultation. Extract only information explicitly mentioned in the transcript, contextual notes, or clinical note. Use professional clinical language appropriate for clinical record-keeping. Include tooth numbers using FDI notation when referring to specific teeth. Organize findings systematically by anatomical region and complaint. Be concise but thorough. Never come up with your own patient details, assessment, plans, interventions, or prognosis - use only what was explicitly discussed. If information is not provided, omit the section entirely rather than stating it was not mentioned.`;

const COMPREHENSIVE_DENTAL_EXAM_STRUCTURE = `Practitioner Details:
[Enter full name include prefix and role of clinician] (Only include if explicitly mentioned in the transcript, contextual notes or clinical note; otherwise omit completely)

Type of Examination Conducted:
[Describe the type of examination conducted and specify if consent was obtained] (Only include if explicitly mentioned in the transcript, contextual notes or clinical note; otherwise omit completely. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Presenting Complaint:
[Describe presenting complaint in the patient's own words] (only include presenting complaint if explicitly mentioned in the transcript, contextual notes or clinical note, If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Dental History:
[Describe relevant dental history, including previous treatments, last dental review and dental habits] (Only include if explicitly mentioned in the transcript, contextual notes or clinical note; otherwise omit completely. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Medical History:
[Describe relevant medical history and surgical history] (only include if explicitly mentioned in the transcript, contextual notes or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Social History:
[Describe relevant social history including smoking status, drug and alcohol use, work or study details] (Only include if explicitly mentioned in the transcript, contextual notes or clinical note; otherwise omit completely. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Medications:
[List any medications patient is taking, including over the counter and herbal supplements] (Only include medication history if explicitly stated in the transcript, contextual notes or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Allergies:
[List any allergies to medications, latex, food or other]. (Only include if explicitly mentioned in the transcript, contextual notes or clinical note; otherwise omit completely. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Clinical Findings and Observations:

E/O Examination:
[Mention/describe any extra-oral examination findings such as lymph node examination, facial symmetry, TMJ examination (e.g., 3-finger mouth opening test), lips, etc.] (E/O stands for extra-oral in this section. Only include if explicitly mentioned in the transcript, contextual notes or clinical note; otherwise omit completely. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

I/O Examination:

Soft-tissue examination:
[Mention/describe any soft tissue examination findings, including soft tissue examination findings on buccal mucosa, tongue, palate, floor of the mouth, vestibule, etc.] (I/O stands for intra-oral in this section. Only include soft tissue examination findings if explicitly mentioned in the transcript, contextual notes, or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Oral cancer screen (FoM, palate, pharynx, soft tissues):
[Mention/describe any findings suspicious for oral cancer, if none specify 'NAD'](Only include oral cancer screen if explicitly mentioned in the transcript, contextual notes, or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Gingiva:
[Mention/describe any gingival examination findings, including colour, contour, size, consistency, surface texture, position, bleeding position, exudation, amount of attached gingiva, gingival tension test, etc.] (Only include gingival findings if explicitly mentioned in the transcript, contextual notes, or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Hard tissue examination:
[Mention/describe any hard tissue examination findings, including number of teeth present, missing teeth, dental caries, restored teeth, periapical problems, pathologic migration, overhanging restorations, impacted teeth, supernumerary teeth, wasting diseases (attrition/abrasion/erosion/abfraction), mobility grading, shade analysis, stains/deposits, etc.] (Only include hard tissue findings if explicitly mentioned in the transcript, contextual notes, or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Oral Hygiene Status:
[Mention any findings on oral hygiene status, e.g., good/fair/poor based on OHI index, etc.] (Only include oral hygiene findings if explicitly mentioned in the transcript, contextual notes, or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Occlusion analysis:
[Mention/describe any occlusion analysis findings, such as type of occlusion (Angles classification, etc.), overbite, overjet, crossbite, open contacts, crowding, facets, supra contacts, trauma from occlusion, Fremitus test, etc.] (Only include occlusion analysis findings if explicitly mentioned in the transcript, contextual notes, or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Other I/O findings:
[Mention/describe any other intra-oral examination findings not captured in the previous sections.] (Only include other intra-oral findings if explicitly mentioned in the transcript, contextual notes, or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Radiographic Findings:
[Describe which radiographs have been taken, whether the patient was consented for them, whether they were taken today or from a previous consultation. Specify findings from dental radiographs, noting any pathologies like caries, cysts, tumors, tooth positions, bone levels, etc., and mention comparisons with previous radiographs.] (Only include radiographic findings if explicitly mentioned in the transcript, contextual notes, or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Laboratory Investigations:
[Mention/list any investigations, along with results, such as blood counts, hemoglobin, platelet count, bleeding time, clotting time, ESR, blood sugar, etc., include dates where possible] (Only include investigation results and dates if explicitly mentioned in the transcript, contextual notes, or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

[Mention any biopsy findings.] (Only include biopsy findings if explicitly mentioned in the transcript, contextual notes, or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Diagnosis:
[Provide the primary diagnosis and any differential diagnoses for the patient's condition] (only include diagnosis if explicitly mentioned in the transcript, contextual notes or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A. Never come up with your own diagnosis.)

Treatment Options discussion:
[Outline treatment options discussion including risks, benefits, and alternatives discussed with the patient. Including rough cost for each treatment discussed if available.] (only include treatment options discussed if explicitly mentioned in the transcript, contextual notes or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A Never come up with your own treatment options.)

[Include patient questions, concerns, and their decisions about the treatment plan] (only include patient questions if explicitly mentioned in the transcript, contextual notes or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Proposed Treatment Plan:
[Outline the proposed treatment plan, including any discussion on risks, benefits, alternatives and patient questions.] (only include proposed treatment plan if explicitly mentioned in the transcript, contextual notes or clinical note. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A. Never come up with your own treatment plan.)

Consent:
[Document patient consent for proposed treatment(s) and procedures] (only include if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Procedures Conducted:
[Detail the procedures performed during the visit, including steps and instruments used in detail] (only include procedural information if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Instrument Tracking:
[Enter instrument batch control identification numbers] (only include instrument tracking if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

[Coding of the dental service/s provided](only include coding details if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Medications/Therapeutics:
[List any medicines or therapeutic agents prescribed, administered, or supplied during the consultation, including name, quantity, dose, and instructions] (only include medications and therapeutics if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Advice Provided:
[Summarise advice given to the patient, including oral hygiene instructions and follow-up care. Include fee estimates or signed quotations if applicable.] (only include advice given to the patient if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Follow-Up and Referrals:
[Detail any referrals made or received, including follow-up instructions and communications. Include fee estimates or signed quotations if applicable to follow up appointments.] (only include follow up and referrals iformation if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Unusual Events:
[Document unusual sequelae of treatment, significant events, or adverse outcomes.] (only include unusual events if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Additional Digital and Laboratory Information:
[Include any additional digital information including CAD/CAM records, instructions to laboratories, and communications] (only include additional digital and lab information if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Final Notes:
[Include a summary of the treatment provided and discussions about future treatments or advice. Include any final observations or clinician's notes about the session.] (only include if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

Other Details:
[Enter details of substitute decision-makers or changes to consent arrangements, if applicable] (only include other details if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

[Document patient failure to attend and follow-up actions taken] (Only include this information if explicitly mentioned in the transcript or contextual notes provided. If normal or no abnormalities are detected, write NAD. If not mentioned write N/A.)

(Never come up with your own patient details, assessment, plan, interventions, evaluation, and plan for continuing care - use only the transcript, contextual notes, or clinical note as a reference for the information included in your note. If any information related to a placeholder has not been explicitly mentioned in the transcript, contextual notes, or clinical note, you must not state the information has not been explicitly mentioned in your output, just leave the relevant placeholder or omit the placeholder completely.) (Use as many lines, paragraphs, or bullet points, depending on the format, as needed to capture all the relevant information from the transcript.)`;

const COMPREHENSIVE_DENTAL_EXAM_EXAMPLE = `Practitioner Details:
Dr. Avtansh Giri, Dentist

Type of Examination Conducted:
N/A

Presenting Complaint:
Severe pain in lower left back tooth for 3 days. Dull, throbbing ache at rest. Sharp, shooting pain with cold and hot stimuli. Pain lingers approximately 30 seconds after stimulus removed. Pain severity 6-7/10 at rest, 9/10 with cold. Spontaneous nocturnal pain. Pain on biting.

Dental History:
Previous amalgam restoration on tooth #36 approximately 5-6 years ago.

Medical History:
Mild hypertension, well controlled. BP 130/85 two weeks ago. No diabetes. No cardiac conditions.

Social History:
N/A

Medications:
Amlodipine 5mg once daily. Paracetamol 500mg PRN. Ibuprofen 400mg PRN.

Allergies:
NKDA.

Clinical Findings and Observations:

E/O Examination:
No palpable submandibular or cervical lymphadenopathy. Facial symmetry normal. No external swelling. TMJ normal, no pain on opening or closing.

I/O Examination:

Soft-tissue examination:
Mild gingivitis in lower posterior region.

Oral cancer screen (FoM, palate, pharynx, soft tissues):
N/A

Gingiva:
Mild gingivitis in lower posterior region.

Hard tissue examination:
Tooth #36: Large old amalgam restoration on occlusal surface with recurrent caries around margin, specifically on mesial aspect. Deep decay extending close to pulp chamber. Tender to percussion. Prolonged, lingering response to cold test (approximately 15 seconds). Teeth #35 and #37: NAD on percussion and cold testing.

Oral Hygiene Status:
Generally good.

Occlusion analysis:
N/A

Other I/O findings:
N/A

Radiographic Findings:
Periapical radiograph of tooth #36 taken today. Deep decay visible under old filling extending close to pulp chamber. Slight widening of periodontal ligament space around apex of mesial root indicating inflammation and early periapical infection.

Laboratory Investigations:
N/A

Diagnosis:
1. Tooth #36: Symptomatic Irreversible Pulpitis with Acute Apical Periodontitis.
2. Recurrent Caries associated with existing Amalgam Restoration.

Treatment Options discussion:
RCT recommended to preserve tooth. Extraction discussed as alternative; however, as first molar, critical for mastication and maintaining adjacent tooth alignment. Extraction would lead to adjacent teeth shifting and opposing tooth supra-eruption. Mr. Sharma elected to proceed with RCT.

Proposed Treatment Plan:
RCT on tooth #36 initiated today. First appointment: access cavity, pulp extirpation, initial canal cleaning/shaping, intracanal dressing, temporary restoration. Second appointment in 3-5 days for continued cleaning and obturation. Post-endodontic restoration (core build-up) and full coverage crown (PFM or Zirconia) required upon completion of RCT.

Consent:
Mr. Sharma consented to proceed with RCT.

Procedures Conducted:
Local anaesthesia administered (2% Lidocaine with 1:100,000 Epinephrine). Rubber dam isolation. Access cavity preparation and removal of deep caries/old restoration. Pulp extirpation and initial cleaning/shaping of canals (working length determination). Intracanal dressing (Calcium Hydroxide). Temporary restoration placement (Cavit).

Medications/Therapeutics:
Tab. Aceclofenac 100mg + Paracetamol 325mg (e.g., Zerodol-P or similar combination) – one tablet BD after food for 3 days, or as needed for pain. No antibiotics indicated unless swelling develops.

Advice Provided:
Soft foods on right side for remainder of day while numbness wears off. Avoid chewing hard foods on left side until crown placed, as temporary filling is fragile. Contact immediately if swelling or fever develops.

Follow-Up and Referrals:
Second RCT appointment scheduled for Thursday at 10 AM.

Unusual Events:
N/A

Additional Digital and Laboratory Information:
N/A

Final Notes:
N/A

Other Details:
N/A`;

const COMPREHENSIVE_DENTAL_EXAM_SYSTEM_INSTRUCTION = `You are a dental clinician documenting a comprehensive dental examination following a patient consultation. Extract only information explicitly mentioned in the transcript, contextual notes, or clinical note. Use professional clinical language appropriate for formal clinical record-keeping. Include tooth numbers using FDI notation. Be comprehensive but organized. When information is not provided in the transcript, write "N/A" for that section. Never come up with your own patient details, diagnoses, assessment, plans, or prognosis. If a finding is normal or no abnormalities detected, write "NAD" instead of omitting the section. Use as many lines, paragraphs, or bullet points as needed to capture all relevant information from the transcript.`;

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
  {
    id:                'dentistry_note_v1',
    name:              'Dentistry Note',
    description:       'Comprehensive clinical note documenting patient history, examination findings, diagnoses, and treatment plan from the dental consultation.',
    type:              'Document',
    category:          'Clinical',
    specialty:         'General Dentistry',
    systemInstruction: DENTISTRY_NOTE_SYSTEM_INSTRUCTION,
    structure:         DENTISTRY_NOTE_STRUCTURE,
    example:           DENTISTRY_NOTE_EXAMPLE,
  },
  {
    id:                'comprehensive_dental_exam_v1',
    name:              'Comprehensive Dental Exam',
    description:       'Detailed dental examination record including practitioner details, clinical findings, radiographic findings, diagnoses, treatment options discussion, and procedures conducted.',
    type:              'Document',
    category:          'Clinical',
    specialty:         'General Dentistry',
    systemInstruction: COMPREHENSIVE_DENTAL_EXAM_SYSTEM_INSTRUCTION,
    structure:         COMPREHENSIVE_DENTAL_EXAM_STRUCTURE,
    example:           COMPREHENSIVE_DENTAL_EXAM_EXAMPLE,
  },
];

export function getTemplateById(id) {
  return TEMPLATES.find(t => t.id === id) ?? null;
}
