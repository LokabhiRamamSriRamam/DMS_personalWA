// GET /api/services
export async function getServices(req, res) {
  const { Service } = req.tenantModels;
  try {
    const services = await Service.find({ isActive: true });
    res.json(services);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/services (To add new services one-time)
export async function createService(req, res) {
  const { Service } = req.tenantModels;
  try {
    const service = new Service(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// PUT /api/services/:id (To update existing service details)
export async function updateService(req, res) {
  const { Service } = req.tenantModels;
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });
    Object.assign(service, req.body);
    await service.save();
    res.json(service);
  } catch (err) { res.status(400).json({ error: err.message }); }
}