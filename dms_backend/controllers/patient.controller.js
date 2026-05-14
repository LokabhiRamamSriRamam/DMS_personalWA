import { createPatientDriveFolders } from '../services/googleDrive.service.js';
import { logEvent } from '../services/analyticsLogger.js';


// GET /api/patients/stats
// Returns { [patientId]: { visit_count, due_amount } } for all patients
export async function getPatientStats(req, res) {
  const { Patient, Visit, Invoice, LabOrder } = req.tenantModels;
  try {
    const [visits, pendingInvoices, uninvoicedLabs] = await Promise.all([
      Visit.find({}, 'patient_id treatments').lean(),
      Invoice.find({ patient_id: { $ne: null }, pending_amount: { $gt: 0 } }, 'patient_id pending_amount').lean(),
      LabOrder.find({ patient_id: { $ne: null }, invoice_id: null }, 'patient_id cost_to_clinic').lean(),
    ]);

    const statsMap = {};

    const getOrCreate = (id) => {
      const key = String(id);
      if (!statsMap[key]) statsMap[key] = { visit_count: 0, due_amount: 0 };
      return statsMap[key];
    };

    for (const v of visits) {
      if (!v.patient_id) continue;
      const s = getOrCreate(v.patient_id);
      s.visit_count += 1;
      for (const t of (v.treatments || [])) {
        if (!t.invoice_id && t.treatment_name !== 'Missing') {
          s.due_amount += (Number(t.cost) || 0) * (Number(t.qty) || 1);
        }
      }
    }

    for (const inv of pendingInvoices) {
      if (!inv.patient_id) continue;
      getOrCreate(inv.patient_id).due_amount += Number(inv.pending_amount) || 0;
    }

    for (const lab of uninvoicedLabs) {
      if (!lab.patient_id) continue;
      getOrCreate(lab.patient_id).due_amount += Number(lab.cost_to_clinic) || 0;
    }

    res.json(statsMap);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// GET /api/patients
export async function getPatients(req, res) {
  const { Patient } = req.tenantModels;
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
  const { Patient } = req.tenantModels;
  const credentials = req.tenantConfig;
  try {
    // Patient ID format: PID-YYYY-NNNN (year-scoped, resets each calendar year)
    // - Doctor-readable: year tells when the patient was first registered
    // - 4-digit counter supports 9,999 patients per year per tenant
    // - Backwards compatible: legacy "PID-001" rows are ignored when computing next NNNN for the year
    const year      = new Date().getFullYear();
    const yearPrefix = `PID-${year}-`;
    const lastForYear = await Patient.findOne(
      { patientId: { $regex: `^${yearPrefix}` } },
      { patientId: 1 }
    ).sort({ patientId: -1 });

    let nextNum = 1;
    if (lastForYear && lastForYear.patientId) {
      const m = lastForYear.patientId.match(/^PID-\d{4}-(\d+)$/);
      if (m) nextNum = parseInt(m[1], 10) + 1;
    }
    const patientId = `${yearPrefix}${String(nextNum).padStart(4, '0')}`;

    const patientData = { ...req.body, patientId };

    const newPatient = new Patient(patientData);
    await newPatient.save();

    // Log to analytics
    logEvent(req.user.tenantId, 'patient_registered', { patientId: newPatient.patientId });

    // Create Google Drive folders (non-blocking — patient is created regardless)
    const fullName = `${newPatient.first_name} ${newPatient.last_name || ''}`.trim();
    createPatientDriveFolders(credentials, patientId, fullName)
      .then(async (folders) => {
        // We need to re-find the patient on the correct connection or use the same instance
        const p = await Patient.findById(newPatient._id);
        if (p) {
          p.drive_folders = folders;
          await p.save();
        }
      })
      .catch(err => {
        console.warn(`[Drive] Could not create folders for ${patientId}:`, err.message);
      });

    res.status(201).json(newPatient);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// GET /api/patients/:id
export async function getPatientById(req, res) {
  const { Patient } = req.tenantModels;
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ msg: 'Not found' });
    res.json(patient);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PUT /api/patients/:id
export async function updatePatient(req, res) {
  const { Patient } = req.tenantModels;
  try {
    const updateData = { ...req.body };

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    res.status(200).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/patients/:id
export async function deletePatient(req, res) {
  const { Patient } = req.tenantModels;
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) return res.status(404).json({ msg: 'Patient not found' });
    res.json({ msg: 'Patient deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
}