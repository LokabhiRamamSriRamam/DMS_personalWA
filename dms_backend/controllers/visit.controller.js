import Visit from '../models/Visit.model.js';
import Patient from '../models/Patient.model.js';

// POST /api/visits
export async function createVisit(req, res) {
  try {
    // Note: ensure req.body includes patient_id
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

// GET /api/visits (Generic getter if needed)
export async function getVisits(req, res) {
    try {
        const visits = await Visit.find().populate('patient_id').populate('doctor_id');
        res.json(visits);
    } catch(err) { res.status(500).json({ error: err.message }); }
}

// GET /api/visits/:id 
export async function getVisitById(req, res) {
    try {
        const visit = await Visit.findById(req.params.id).populate('patient_id').populate('doctor_id');
        if(!visit) return res.status(404).json({error: "Visit not found"});
        res.json(visit);
    } catch(err) { res.status(500).json({ error: err.message }); }
}

// GET /api/visits/patient/:id
export async function getPatientHistory(req, res) {
  try {
    const visits = await Visit.find({ patient_id: req.params.id })
      .populate('appointment_id')
      .sort({ date: -1 });
    res.json(visits);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PATCH /api/visits/:visitId/treatments/:treatmentId/status
export async function updateTreatmentStatus(req, res) {
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