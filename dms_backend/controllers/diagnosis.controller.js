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

// POST /api/diagnoses/bulk
export async function bulkCreateDiagnoses(req, res) {
  const { Diagnosis } = req.tenantModels;
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const docs = items
      .map(i => ({
        name: String(i.name || '').trim(),
        code: String(i.code || '').trim(),
        category: String(i.category || '').trim(),
        description: String(i.description || '').trim(),
        is_active: true,
      }))
      .filter(i => i.name);

    if (docs.length === 0) {
      return res.status(400).json({ error: 'No valid rows (name is required)' });
    }

    const result = await Diagnosis.insertMany(docs, { ordered: false });
    res.status(201).json({ inserted: result.length, skipped: items.length - result.length, errors: [] });
  } catch (err) {
    const inserted = err?.result?.result?.nInserted ?? err?.insertedDocs?.length ?? 0;
    const errors = (err?.writeErrors || []).map(e => e.errmsg || e.message);
    res.status(errors.length ? 207 : 400).json({ inserted, skipped: errors.length, errors });
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
