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

// --- BULK UPLOAD VENDORS ---
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
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
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
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
      return obj;
    });
}

// POST /api/vendors/bulk-upload
export async function bulkUploadVendors(req, res) {
  const { Vendor } = req.tenantModels;
  try {
    const sheetId = extractSheetId(req.body?.sheetUrl);
    if (!sheetId) return res.status(400).json({ error: 'Invalid Google Sheets URL or ID.' });

    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const response = await fetch(exportUrl, { redirect: 'follow' });
    if (!response.ok)
      return res.status(400).json({ error: `Could not read sheet. Make sure it's shared as "Anyone with the link can view". (HTTP ${response.status})` });

    const rows = parseCsv(await response.text());
    if (rows.length === 0) return res.status(400).json({ error: 'Sheet is empty.' });
    if (!('name' in rows[0]))
      return res.status(400).json({ error: 'Sheet must include a "name" column.' });

    const existing = await Vendor.find({}, 'name').lean();
    const existingNames = new Set(existing.map(v => String(v.name).trim().toLowerCase()));

    const toInsert = [], skipped = [], seenInBatch = new Set();
    for (const row of rows) {
      const name = (row.name || '').trim();
      if (!name) { skipped.push({ name: '', reason: 'Missing name' }); continue; }
      const key = name.toLowerCase();
      if (existingNames.has(key) || seenInBatch.has(key)) { skipped.push({ name, reason: 'Duplicate (already exists)' }); continue; }
      seenInBatch.add(key);

      const vendorType = (row.type || 'General').trim();
      const validTypes = ['Pharmacy', 'Consumable', 'Lab', 'General'];

      toInsert.push({
        name,
        type: validTypes.includes(vendorType) ? vendorType : 'General',
        contact_person: (row['contact person'] || row.contactperson || '').trim(),
        phone: (row.phone || '').trim(),
        email: (row.email || '').trim(),
        address: (row.address || '').trim(),
        gst_number: (row['gst number'] || row.gstnumber || row.gst || '').trim()
      });
    }

    let inserted = 0;
    if (toInsert.length > 0) { const docs = await Vendor.insertMany(toInsert, { ordered: false }); inserted = docs.length; }
    res.json({ inserted, skipped: skipped.length, skippedDetails: skipped, total: rows.length });
  } catch (err) {
    console.error('bulkUploadVendors error:', err);
    res.status(500).json({ error: err.message });
  }
}