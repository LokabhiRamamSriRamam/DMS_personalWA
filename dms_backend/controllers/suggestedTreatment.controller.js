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
