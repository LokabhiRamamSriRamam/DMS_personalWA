// GET /api/doctors
export async function getDoctors(req, res) {
  const { Doctor } = req.tenantModels;
  try {
    const doctors = await Doctor.find({ is_active: true }).sort({ name: 1 });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/doctors/:id
export async function getDoctorById(req, res) {
  const { Doctor } = req.tenantModels;
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/doctors
export async function createDoctor(req, res) {
  const { Doctor } = req.tenantModels;
  try {
    const newDoctor = new Doctor(req.body);
    await newDoctor.save();
    res.status(201).json(newDoctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/doctors/:id
export async function updateDoctor(req, res) {
  const { Doctor } = req.tenantModels;
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/doctors/:id
export async function deleteDoctor(req, res) {
  const { Doctor } = req.tenantModels;
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ msg: 'Doctor deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
