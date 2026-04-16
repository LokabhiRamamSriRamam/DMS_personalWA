/**
 * Helper: get today's visit for a patient, or create a stub if none exists
 * @param {object} models - req.tenantModels
 */
async function getOrCreateTodayVisit(models, patientId) {
  const { Visit, Patient } = models;
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(); endOfDay.setHours(23, 59, 59, 999);

  let visit = await Visit.findOne({
    patient_id: patientId,
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  if (!visit) {
    visit = await Visit.create({ patient_id: patientId, date: new Date() });
    await Patient.findByIdAndUpdate(patientId, { last_visit_date: new Date() });
  }

  return visit;
}

// POST /api/visits
export async function createVisit(req, res) {
  const { Visit, Patient } = req.tenantModels;
  try {
    const { patient_id } = req.body;

    const visit = new Visit(req.body);
    await visit.save();

    // Update Patient's last visit date
    if(patient_id) {
        await Patient.findByIdAndUpdate(patient_id, { 
          last_visit_date: new Date() 
        });
    }

    res.status(201).json(visit);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// GET /api/visits
export async function getVisits(req, res) {
  const { Visit } = req.tenantModels;
  try {
      const visits = await Visit.find().populate('patient_id');
      res.json(visits);
  } catch(err) { res.status(500).json({ error: err.message }); }
}

// GET /api/visits/:id 
export async function getVisitById(req, res) {
  const { Visit } = req.tenantModels;
  try {
      const visit = await Visit.findById(req.params.id).populate('patient_id');
      if(!visit) return res.status(404).json({error: "Visit not found"});
      res.json(visit);
  } catch(err) { res.status(500).json({ error: err.message }); }
}

// GET /api/visits/patient/:id
export async function getPatientHistory(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const visits = await Visit.find({ patient_id: req.params.id })
      .populate('appointment_id')
      .sort({ date: -1 });
    res.json(visits);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PATCH /api/visits/:visitId/notes/:noteId
export async function updateNote(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, noteId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const visit = await Visit.findOneAndUpdate(
      { _id: visitId, 'consultation_notes._id': noteId },
      { $set: { 'consultation_notes.$.content': content } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Note not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PATCH /api/visits/:visitId/advices/:adviceId
export async function updateAdvice(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, adviceId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const visit = await Visit.findOneAndUpdate(
      { _id: visitId, 'advices._id': adviceId },
      { $set: { 'advices.$.content': content } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Advice not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/visits/patient/:patientId/note
export async function addConsultationNote(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const visit = await getOrCreateTodayVisit(req.tenantModels, req.params.patientId);
    visit.consultation_notes.push({ content });
    await visit.save();

    res.status(201).json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/visits/patient/:patientId/advice
export async function addAdvice(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const visit = await getOrCreateTodayVisit(req.tenantModels, req.params.patientId);
    visit.advices.push({ content });
    await visit.save();

    res.status(201).json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/visits/patient/:patientId/prescription
export async function addPrescription(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { drug_name, dosage, duration, instructions } = req.body;
    if (!drug_name) return res.status(400).json({ error: 'drug_name is required' });

    const visit = await getOrCreateTodayVisit(req.tenantModels, req.params.patientId);
    visit.prescriptions.push({ drug_name, dosage, duration, instructions });
    await visit.save();

    res.status(201).json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/visits/patient/:patientId/treatments  (used by AI autofill)
export async function addTreatments(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { treatments } = req.body;
    if (!Array.isArray(treatments) || treatments.length === 0)
      return res.status(400).json({ error: 'treatments array is required' });

    const visit = await getOrCreateTodayVisit(req.tenantModels, req.params.patientId);
    treatments.forEach(t => {
      visit.treatments.push({
        treatment_name: t.treatment_name,
        teeth_numbers:  Array.isArray(t.teeth_numbers) ? t.teeth_numbers : [],
        cost:           t.cost   || 0,
        qty:            t.qty    || 1,
        status:         t.status || 'Planned',
      });
    });
    await visit.save();
    res.status(201).json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// DELETE /api/visits/:visitId/notes/:noteId
export async function deleteNote(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, noteId } = req.params;
    const visit = await Visit.findByIdAndUpdate(
      visitId,
      { $pull: { consultation_notes: { _id: noteId } } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// DELETE /api/visits/:visitId/advices/:adviceId
export async function deleteAdvice(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, adviceId } = req.params;
    const visit = await Visit.findByIdAndUpdate(
      visitId,
      { $pull: { advices: { _id: adviceId } } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// DELETE /api/visits/:visitId/treatments/:treatmentId
export async function deleteTreatment(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, treatmentId } = req.params;
    const visit = await Visit.findByIdAndUpdate(
      visitId,
      { $pull: { treatments: { _id: treatmentId } } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// DELETE /api/visits/:visitId/prescriptions/:prescriptionId
export async function deletePrescription(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, prescriptionId } = req.params;
    const visit = await Visit.findByIdAndUpdate(
      visitId,
      { $pull: { prescriptions: { _id: prescriptionId } } },
      { new: true }
    );
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/visits/mark-invoiced
export async function markInvoiced(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { invoice_id, treatment_refs = [], prescription_refs = [] } = req.body;

    for (const ref of treatment_refs) {
      await Visit.updateOne(
        { _id: ref.visitId, 'treatments._id': ref.treatmentId },
        { $set: { 'treatments.$.invoice_id': invoice_id } }
      );
    }

    for (const ref of prescription_refs) {
      await Visit.updateOne(
        { _id: ref.visitId, 'prescriptions._id': ref.prescriptionId },
        { $set: { 'prescriptions.$.invoice_id': invoice_id } }
      );
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PATCH /api/visits/:visitId/treatments/:treatmentId/status
export async function updateTreatmentStatus(req, res) {
  const { Visit } = req.tenantModels;
  try {
    const { visitId, treatmentId } = req.params;
    const { status } = req.body; // 'In Progress' or 'Completed'

    const visit = await Visit.findOneAndUpdate(
      { _id: visitId, "treatments._id": treatmentId },
      { 
        $set: { "treatments.$.status": status }
      },
      { new: true }
    );

    if (!visit) return res.status(404).json({ error: "Visit or Treatment not found" });

    res.json(visit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}