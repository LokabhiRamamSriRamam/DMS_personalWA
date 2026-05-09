// =======================
// 1. LAB ORDERS
// =======================

export async function getOrders(req, res) {
  const { LabOrder } = req.tenantModels;
  try {
    const orders = await LabOrder.find()
      .populate('patient_id', 'first_name last_name patientId')
      .populate('vendor_id', 'name')
      .populate('invoice_id', 'status paid_amount total_amount')
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

// =======================
// 3. BULK UPLOAD HELPERS
// =======================

function extractSheetId(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) return trimmed;
  return null;
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch === '\r') { /* skip */ }
      else field += ch;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1)
    .filter(r => r.some(c => String(c).trim() !== ''))
    .map(r => { const obj = {}; headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); }); return obj; });
}

// POST /api/labs/bulk-upload-items
// Sheet columns: Name, Category, Cost, Turnaround
export async function bulkUploadLabItems(req, res) {
  const { LabCatalogItem } = req.tenantModels;
  try {
    const sheetId = extractSheetId(req.body?.sheetUrl);
    if (!sheetId) return res.status(400).json({ error: 'Invalid Google Sheets URL or ID.' });

    const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`, { redirect: 'follow' });
    if (!response.ok)
      return res.status(400).json({ error: `Could not read sheet. Make sure it's shared as "Anyone with the link can view". (HTTP ${response.status})` });

    const rows = parseCsv(await response.text());
    if (rows.length === 0) return res.status(400).json({ error: 'Sheet is empty.' });
    if (!('name' in rows[0])) return res.status(400).json({ error: 'Sheet must include a "name" column.' });

    const existing = await LabCatalogItem.find({}, 'name').lean();
    const existingNames = new Set(existing.map(i => String(i.name).trim().toLowerCase()));

    const toInsert = [], skipped = [], seenInBatch = new Set();
    for (const row of rows) {
      const name = (row.name || '').trim();
      if (!name) { skipped.push({ name: '', reason: 'Missing name' }); continue; }
      const key = name.toLowerCase();
      if (existingNames.has(key) || seenInBatch.has(key)) { skipped.push({ name, reason: 'Duplicate (already exists)' }); continue; }
      seenInBatch.add(key);
      toInsert.push({
        name,
        category: (row.category || 'Other').trim(),
        price:    Number((row.cost || row.price || '0').replace(/[^0-9.]/g, '')) || 0,
        turnaround_time: (row.turnaround || row['turnaround time'] || row['turnaround_time'] || '').trim(),
      });
    }

    let inserted = 0;
    if (toInsert.length > 0) { const docs = await LabCatalogItem.insertMany(toInsert, { ordered: false }); inserted = docs.length; }
    res.json({ inserted, skipped: skipped.length, skippedDetails: skipped, total: rows.length });
  } catch (err) {
    console.error('bulkUploadLabItems error:', err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/labs/bulk-upload-vendors
// Sheet columns: Name, Contact Person, Phone, Email, Address
export async function bulkUploadLabVendors(req, res) {
  const { Vendor } = req.tenantModels;
  try {
    const sheetId = extractSheetId(req.body?.sheetUrl);
    if (!sheetId) return res.status(400).json({ error: 'Invalid Google Sheets URL or ID.' });

    const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`, { redirect: 'follow' });
    if (!response.ok)
      return res.status(400).json({ error: `Could not read sheet. Make sure it's shared as "Anyone with the link can view". (HTTP ${response.status})` });

    const rows = parseCsv(await response.text());
    if (rows.length === 0) return res.status(400).json({ error: 'Sheet is empty.' });
    if (!('name' in rows[0])) return res.status(400).json({ error: 'Sheet must include a "name" column.' });

    const existing = await Vendor.find({ type: 'Lab' }, 'name').lean();
    const existingNames = new Set(existing.map(v => String(v.name).trim().toLowerCase()));

    const toInsert = [], skipped = [], seenInBatch = new Set();
    for (const row of rows) {
      const name = (row.name || '').trim();
      if (!name) { skipped.push({ name: '', reason: 'Missing name' }); continue; }
      const key = name.toLowerCase();
      if (existingNames.has(key) || seenInBatch.has(key)) { skipped.push({ name, reason: 'Duplicate (already exists)' }); continue; }
      seenInBatch.add(key);
      toInsert.push({
        name,
        type: 'Lab',
        contact_person: (row['contact person'] || row.contact_person || row.contact || '').trim(),
        phone:          (row.phone || row.mobile || '').trim(),
        email:          (row.email || '').trim(),
        address:        (row.address || '').trim(),
      });
    }

    let inserted = 0;
    if (toInsert.length > 0) { const docs = await Vendor.insertMany(toInsert, { ordered: false }); inserted = docs.length; }
    res.json({ inserted, skipped: skipped.length, skippedDetails: skipped, total: rows.length });
  } catch (err) {
    console.error('bulkUploadLabVendors error:', err);
    res.status(500).json({ error: err.message });
  }
}
