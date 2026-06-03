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
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const existing = await Diagnosis.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
    if (existing) return res.status(409).json({ error: `A diagnosis named "${existing.name}" already exists.` });
    const newDiagnosis = new Diagnosis({ ...req.body, name });
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

    const seen = new Set();
    const unique = docs.filter(d => {
      const key = d.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const existing = await Diagnosis.find({ name: { $in: unique.map(d => new RegExp(`^${d.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } }).select('name');
    const existingNames = new Set(existing.map(e => e.name.toLowerCase()));
    const toInsert = unique.filter(d => !existingNames.has(d.name.toLowerCase()));
    const skipped = items.length - toInsert.length;

    if (toInsert.length === 0) {
      return res.status(207).json({ inserted: 0, skipped, errors: ['All entries already exist or were duplicates.'] });
    }

    const result = await Diagnosis.insertMany(toInsert, { ordered: false });
    res.status(201).json({ inserted: result.length, skipped, errors: [] });
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
    if (req.body.name) {
      const name = String(req.body.name).trim();
      const exists = await Diagnosis.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, _id: { $ne: req.params.id } });
      if (exists) return res.status(409).json({ error: `A diagnosis named "${exists.name}" already exists.` });
      req.body.name = name;
    }
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
