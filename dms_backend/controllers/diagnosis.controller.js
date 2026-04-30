// GET /api/diagnoses
export async function getDiagnoses(req, res) {
  const { Diagnosis } = req.tenantModels;
  try {
    const { search } = req.query;
    let query = { is_active: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const diagnoses = await Diagnosis.find(query).sort({ name: 1 });
    res.json(diagnoses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/diagnoses
export async function createDiagnosis(req, res) {
  const { Diagnosis } = req.tenantModels;
  try {
    const newDiagnosis = new Diagnosis(req.body);
    await newDiagnosis.save();
    res.status(201).json(newDiagnosis);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/diagnoses/:id
export async function updateDiagnosis(req, res) {
  const { Diagnosis } = req.tenantModels;
  try {
    const diagnosis = await Diagnosis.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!diagnosis) return res.status(404).json({ error: 'Diagnosis not found' });
    res.json(diagnosis);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/diagnoses/:id
export async function deleteDiagnosis(req, res) {
  const { Diagnosis } = req.tenantModels;
  try {
    const diagnosis = await Diagnosis.findByIdAndDelete(req.params.id);
    if (!diagnosis) return res.status(404).json({ error: 'Diagnosis not found' });
    res.json({ msg: 'Diagnosis deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
