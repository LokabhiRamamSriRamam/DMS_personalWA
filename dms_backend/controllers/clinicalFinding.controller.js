// GET /api/clinical-findings
export async function getClinicalFindings(req, res) {
  const { ClinicalFinding } = req.tenantModels;
  try {
    const { search } = req.query;
    let query = { is_active: true };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const findings = await ClinicalFinding.find(query).sort({ name: 1 });
    res.json(findings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/clinical-findings
export async function createClinicalFinding(req, res) {
  const { ClinicalFinding } = req.tenantModels;
  try {
    const newFinding = new ClinicalFinding(req.body);
    await newFinding.save();
    res.status(201).json(newFinding);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/clinical-findings/:id
export async function updateClinicalFinding(req, res) {
  const { ClinicalFinding } = req.tenantModels;
  try {
    const finding = await ClinicalFinding.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    res.json(finding);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/clinical-findings/:id
export async function deleteClinicalFinding(req, res) {
  const { ClinicalFinding } = req.tenantModels;
  try {
    const finding = await ClinicalFinding.findByIdAndDelete(req.params.id);
    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    res.json({ msg: 'Finding deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
