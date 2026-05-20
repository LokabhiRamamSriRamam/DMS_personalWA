// GET /api/suggested-treatments
export async function getSuggestedTreatments(req, res) {
  const { SuggestedTreatment } = req.tenantModels;
  try {
    const { search } = req.query;
    let query = { is_active: true };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const treatments = await SuggestedTreatment.find(query).sort({ name: 1 });
    res.json(treatments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/suggested-treatments
export async function createSuggestedTreatment(req, res) {
  const { SuggestedTreatment } = req.tenantModels;
  try {
    const newTreatment = new SuggestedTreatment(req.body);
    await newTreatment.save();
    res.status(201).json(newTreatment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/suggested-treatments/bulk
export async function bulkCreateSuggestedTreatments(req, res) {
  const { SuggestedTreatment } = req.tenantModels;
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const docs = items
      .map(i => ({
        name: String(i.name || '').trim(),
        category: String(i.category || '').trim(),
        cost: parseFloat(i.cost) || 0,
        description: String(i.description || '').trim(),
        is_active: true,
      }))
      .filter(i => i.name);

    if (docs.length === 0) {
      return res.status(400).json({ error: 'No valid rows (name is required)' });
    }

    const result = await SuggestedTreatment.insertMany(docs, { ordered: false });
    res.status(201).json({ inserted: result.length, skipped: items.length - result.length, errors: [] });
  } catch (err) {
    const inserted = err?.result?.result?.nInserted ?? err?.insertedDocs?.length ?? 0;
    const errors = (err?.writeErrors || []).map(e => e.errmsg || e.message);
    res.status(errors.length ? 207 : 400).json({ inserted, skipped: errors.length, errors });
  }
}

// PUT /api/suggested-treatments/:id
export async function updateSuggestedTreatment(req, res) {
  const { SuggestedTreatment } = req.tenantModels;
  try {
    const treatment = await SuggestedTreatment.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!treatment) return res.status(404).json({ error: 'Treatment not found' });
    res.json(treatment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/suggested-treatments/:id
export async function deleteSuggestedTreatment(req, res) {
  const { SuggestedTreatment } = req.tenantModels;
  try {
    const treatment = await SuggestedTreatment.findByIdAndDelete(req.params.id);
    if (!treatment) return res.status(404).json({ error: 'Treatment not found' });
    res.json({ msg: 'Treatment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
