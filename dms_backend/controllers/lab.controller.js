// =======================
// 1. LAB ORDERS
// =======================

export async function getOrders(req, res) {
  const { LabOrder } = req.tenantModels;
  try {
    const orders = await LabOrder.find()
      .populate('patient_id', 'first_name last_name patientId')
      .populate('vendor_id', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createOrder(req, res) {
  const { LabOrder } = req.tenantModels;
  try {
    const { patient_id, vendor_id, item_name, shade, cost_to_clinic, order_date, expected_delivery, notes } = req.body;

    const newOrder = new LabOrder({
      patient_id,
      vendor_id: vendor_id || undefined,
      order_date: order_date || new Date(),
      expected_delivery: expected_delivery || undefined,
      items: [{ item_name, shade, instructions: notes, cost: cost_to_clinic }],
      cost_to_clinic,
      status: 'Sent',
    });

    const saved = await newOrder.save();
    const populated = await LabOrder.findById(saved._id)
      .populate('patient_id', 'first_name last_name patientId')
      .populate('vendor_id', 'name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PATCH /api/labs/orders/:id — status-only update (inline table)
export async function updateOrderStatus(req, res) {
  const { LabOrder } = req.tenantModels;
  try {
    const { status } = req.body;
    const updated = await LabOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate('patient_id', 'first_name last_name patientId')
      .populate('vendor_id', 'name');
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/labs/orders/:id — full update (from edit modal)
export async function updateOrderFull(req, res) {
  const { LabOrder } = req.tenantModels;
  try {
    const { patient_id, vendor_id, item_name, shade, cost_to_clinic, order_date, expected_delivery, notes, status } = req.body;

    const updated = await LabOrder.findByIdAndUpdate(
      req.params.id,
      {
        patient_id,
        vendor_id: vendor_id || undefined,
        order_date,
        expected_delivery: expected_delivery || undefined,
        items: [{ item_name, shade, instructions: notes, cost: cost_to_clinic }],
        cost_to_clinic,
        status,
      },
      { new: true }
    )
      .populate('patient_id', 'first_name last_name patientId')
      .populate('vendor_id', 'name');

    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// =======================
// 2. LAB CATALOG
// =======================

export async function getCatalog(req, res) {
  const { LabCatalogItem } = req.tenantModels;
  try {
    const items = await LabCatalogItem.find().populate('preferred_vendor_id', 'name');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createCatalogItem(req, res) {
  const { LabCatalogItem } = req.tenantModels;
  try {
    const payload = {
      ...req.body,
      preferred_vendor_id: req.body.preferred_vendor_id || undefined,
    };
    const newItem = new LabCatalogItem(payload);
    await newItem.save();
    const populated = await LabCatalogItem.findById(newItem._id).populate('preferred_vendor_id', 'name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateCatalogItem(req, res) {
  const { LabCatalogItem } = req.tenantModels;
  try {
    const payload = {
      ...req.body,
      preferred_vendor_id: req.body.preferred_vendor_id || undefined,
    };
    const updated = await LabCatalogItem.findByIdAndUpdate(req.params.id, payload, { new: true })
      .populate('preferred_vendor_id', 'name');
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
