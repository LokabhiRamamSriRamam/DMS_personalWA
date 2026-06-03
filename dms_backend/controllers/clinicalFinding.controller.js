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
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const existing = await ClinicalFinding.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
    if (existing) return res.status(409).json({ error: `A clinical finding named "${existing.name}" already exists.` });
    const newFinding = new ClinicalFinding({ ...req.body, name });
    await newFinding.save();
    res.status(201).json(newFinding);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/clinical-findings/bulk
export async function bulkCreateClinicalFindings(req, res) {
  const { ClinicalFinding } = req.tenantModels;
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const docs = items
      .map(i => ({
        name: String(i.name || '').trim(),
        category: String(i.category || '').trim(),
        description: String(i.description || '').trim(),
        is_active: true,
      }))
      .filter(i => i.name);

    if (docs.length === 0) {
      return res.status(400).json({ error: 'No valid rows (name is required)' });
    }

    // Deduplicate within the batch (case-insensitive), keep first occurrence
    const seen = new Set();
    const unique = docs.filter(d => {
      const key = d.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filter out names that already exist in the DB
    const existing = await ClinicalFinding.find({ name: { $in: unique.map(d => new RegExp(`^${d.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } }).select('name');
    const existingNames = new Set(existing.map(e => e.name.toLowerCase()));
    const toInsert = unique.filter(d => !existingNames.has(d.name.toLowerCase()));
    const skipped = items.length - toInsert.length;

    if (toInsert.length === 0) {
      return res.status(207).json({ inserted: 0, skipped, errors: ['All entries already exist or were duplicates.'] });
    }

    const result = await ClinicalFinding.insertMany(toInsert, { ordered: false });
    res.status(201).json({ inserted: result.length, skipped, errors: [] });
  } catch (err) {
    const inserted = err?.result?.result?.nInserted ?? err?.insertedDocs?.length ?? 0;
    const errors = (err?.writeErrors || []).map(e => e.errmsg || e.message);
    res.status(errors.length ? 207 : 400).json({ inserted, skipped: errors.length, errors });
  }
}

// PUT /api/clinical-findings/:id
export async function updateClinicalFinding(req, res) {
  const { ClinicalFinding } = req.tenantModels;
  try {
    if (req.body.name) {
      const name = String(req.body.name).trim();
      const exists = await ClinicalFinding.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, _id: { $ne: req.params.id } });
      if (exists) return res.status(409).json({ error: `A clinical finding named "${exists.name}" already exists.` });
      req.body.name = name;
    }
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
