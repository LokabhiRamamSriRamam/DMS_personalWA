// GET /api/vendors
export async function getVendors(req, res) {
  const { Vendor } = req.tenantModels;
  try {
    const { type } = req.query;
    const query = type ? { type } : { type: { $in: ['Lab', 'General', 'Consumable'] } };
    const vendors = await Vendor.find(query);
    res.json(vendors);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/vendors
export async function createVendor(req, res) {
  const { Vendor } = req.tenantModels;
  try {
    const newVendor = new Vendor(req.body);
    await newVendor.save();
    res.status(201).json(newVendor);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// PUT /api/vendors/:id
export async function updateVendor(req, res) {
  const { Vendor } = req.tenantModels;
  try {
    const updatedVendor = await Vendor.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } // Return the updated document
    );
    if (!updatedVendor) return res.status(404).json({ error: "Vendor not found" });
    res.json(updatedVendor);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// DELETE /api/vendors/:id
export async function deleteVendor(req, res) {
  const { Vendor } = req.tenantModels;
  try {
    const deletedVendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!deletedVendor) return res.status(404).json({ error: "Vendor not found" });
    res.json({ message: "Vendor deleted successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
}