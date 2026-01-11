import Patient from '../models/Patient.model.js';

// GET /api/patients
export async function getPatients(req, res) {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      query = {
        $or: [
          { first_name: { $regex: search, $options: 'i' } },
          { 'contact.mobile': { $regex: search, $options: 'i' } },
          { patientId: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const patients = await Patient.find(query).sort({ updatedAt: -1 });
    res.json(patients);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/patients
export async function createPatient(req, res) {
  try {
    const count = await Patient.countDocuments();
    const patientId = `PID-${String(count + 1).padStart(3, '0')}`;
    
    const newPatient = new Patient({ ...req.body, patientId });
    await newPatient.save();
    res.status(201).json(newPatient);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// GET /api/patients/:id
export async function getPatientById(req, res) {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ msg: 'Not found' });
    res.json(patient);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

export async function deletePatient(req, res) {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) return res.status(404).json({ msg: 'Patient not found' });
    res.json({ msg: 'Patient deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
}