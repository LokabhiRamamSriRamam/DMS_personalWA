// ============================================================================
//                       INVENTORY SETTINGS (per-tenant)
// ============================================================================

// GET /api/inventory/settings — returns the singleton settings doc, creating
// it on first read with defaults (both inventory types enabled).
export async function getInventorySettings(req, res) {
  const { InventorySettings } = req.tenantModels;
  try {
    let settings = await InventorySettings.findOne({});
    if (!settings) {
      settings = await InventorySettings.create({});
    }
    res.json({
      medicineEnabled: settings.medicineEnabled,
      consumableEnabled: settings.consumableEnabled,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// PUT /api/inventory/settings — upsert the singleton settings doc.
export async function updateInventorySettings(req, res) {
  const { InventorySettings } = req.tenantModels;
  try {
    const update = {};
    if (req.body.medicineEnabled !== undefined) update.medicineEnabled = !!req.body.medicineEnabled;
    if (req.body.consumableEnabled !== undefined) update.consumableEnabled = !!req.body.consumableEnabled;

    const settings = await InventorySettings.findOneAndUpdate(
      {},
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({
      medicineEnabled: settings.medicineEnabled,
      consumableEnabled: settings.consumableEnabled,
    });
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// ============================================================================
//                BULK UPLOAD MEDICINES (via Google Sheets URL)
// ============================================================================

/**
 * Extract the spreadsheet ID from a Google Sheets URL or accept a bare ID.
 * Examples:
 *   https://docs.google.com/spreadsheets/d/<ID>/edit#gid=0
 *   https://docs.google.com/spreadsheets/d/<ID>
 *   <ID>
 */
function extractSheetId(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  // Bare ID — only allow safe chars
  if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Parse a CSV string into an array of objects keyed by header.
 * Handles quoted fields (including embedded commas and escaped quotes "").
 */
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

// POST /api/inventory/bulk-upload-medicines
export async function bulkUploadMedicines(req, res) {
  const { InventoryItem } = req.tenantModels;
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

    const existing = await InventoryItem.find({ type: 'Pharmacy' }, 'name').lean();
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
        type: 'Pharmacy',
        composition:   (row.composition    || '').trim(),
        manufacturer:  (row.manufacturer   || '').trim(),
        category:      (row.category       || '').trim(),
        cost_price:    Number((row['cost price']    || row.costprice    || row.cost    || '0').replace(/[^0-9.]/g, '')) || 0,
        selling_price: Number((row['selling price'] || row.sellingprice || row.selling || '0').replace(/[^0-9.]/g, '')) || 0,
      });
    }

    let inserted = 0;
    if (toInsert.length > 0) { const docs = await InventoryItem.insertMany(toInsert, { ordered: false }); inserted = docs.length; }
    res.json({ inserted, skipped: skipped.length, skippedDetails: skipped, total: rows.length });
  } catch (err) {
    console.error('bulkUploadMedicines error:', err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/inventory/bulk-upload-consumables
// Body: { sheetUrl: string }
// Sheet columns: Name, Category, Cost Price, Min Consumption
export async function bulkUploadConsumables(req, res) {
  const { InventoryItem } = req.tenantModels;
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

    const existing = await InventoryItem.find({ type: 'Consumable' }, 'name').lean();
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
        type: 'Consumable',
        category:          (row.category || '').trim(),
        cost_price:        Number((row['cost price']       || row.costprice || row.cost || '0').replace(/[^0-9.]/g, '')) || 0,
        consumption_unit:  Number((row['min consumption'] || row['consumption unit'] || row.consumption || row.unit || '0').replace(/[^0-9.]/g, '')) || 0,
        selling_price: 0,
      });
    }

    let inserted = 0;
    if (toInsert.length > 0) { const docs = await InventoryItem.insertMany(toInsert, { ordered: false }); inserted = docs.length; }
    res.json({ inserted, skipped: skipped.length, skippedDetails: skipped, total: rows.length });
  } catch (err) {
    console.error('bulkUploadConsumables error:', err);
    res.status(500).json({ error: err.message });
  }
}

// --- HELPER: CENTRALIZED STATUS LOGIC ---
const calculateStatus = (currentStock, minStock) => {
    const stock = Number(currentStock);
    const min = Number(minStock);

    if (stock <= 0) return 'Out of Stock';
    if (stock <= min) return 'Critical';
    if (stock <= min* 1.5) return 'Low';
    return 'Good';
};

// GET /api/inventory
export async function getItems(req, res) {
  const { InventoryItem } = req.tenantModels;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Note: Aggregate needs to be called on models bound to the connection
    const items = await InventoryItem.aggregate([
      {
        $lookup: {
          from: 'inventorylogs',
          localField: '_id',
          foreignField: 'item_id',
          as: 'logs'
        }
      },
      {
        $addFields: {
          usage_count: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$logs',
                    as: 'log',
                    cond: {
                      $and: [
                        { $eq: ['$$log.type', 'Stock Out'] },
                        { $gte: ['$$log.date', startOfMonth] }
                      ]
                    }
                  }
                },
                as: 'out_log',
                in: '$$out_log.quantity'
              }
            }
          }
        }
      },
      { $project: { logs: 0, __v: 0 } }
    ]);

    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/inventory
export async function createItem(req, res) {
  const { InventoryItem } = req.tenantModels;
  try {
    const newItem = new InventoryItem(req.body);
    // Calculate initial status
    newItem.status = calculateStatus(newItem.stock_on_hand, newItem.min_stock_level);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// PUT /api/inventory/:id
export async function updateItem(req, res) {
  const { InventoryItem } = req.tenantModels;
  try {
    const updates = req.body;
    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    // Determine new values
    const newStock = (updates.stock_on_hand !== undefined) ? Number(updates.stock_on_hand) : item.stock_on_hand;
    const newMin = (updates.min_stock_level !== undefined) ? Number(updates.min_stock_level) : item.min_stock_level;

    // Recalculate Status
    const newStatus = calculateStatus(newStock, newMin);

    const updatedItem = await InventoryItem.findByIdAndUpdate(
      req.params.id, 
      { ...updates, status: newStatus }, 
      { new: true }
    );
    res.json(updatedItem);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// DELETE /api/inventory/:id
export async function deleteItem(req, res) {
  const { InventoryItem } = req.tenantModels;
  try {
    await InventoryItem.findByIdAndDelete(req.params.id);
    res.json({ message: "Item deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// POST /api/inventory/adjust (For Manual Usage / Stock In / Correction)
export async function adjustStock(req, res) {
  const { InventoryItem, InventoryLog } = req.tenantModels;
  const { item_id, type, qty, reason, notes } = req.body;
  
  try {
    const item = await InventoryItem.findById(item_id);
    if (!item) return res.status(404).json({ msg: 'Item not found' });

    // 1. Update Stock
    if (type === 'Stock In') {
        item.stock_on_hand += Number(qty);
    } else {
        item.stock_on_hand -= Number(qty);
    }
    
    // 2. ✅ Recalculate Status
    item.status = calculateStatus(item.stock_on_hand, item.min_stock_level);
    await item.save();

    // 3. Create Log
    const log = new InventoryLog({
      item_id, 
      type, 
      reason, 
      quantity: qty, 
      notes,
      date: new Date()
    });
    await log.save();

    res.json({ item, log });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// GET /api/inventory/logs
export async function getLogs(req, res) {
  const { InventoryLog } = req.tenantModels;
  try {
    const logs = await InventoryLog.find()
      .populate('item_id', 'name type') 
      .sort({ date: -1 });
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// GET /api/inventory/orders
export async function getOrders(req, res) {
  const { Order } = req.tenantModels;
  try {
    const orders = await Order.find().sort({ order_date: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// GET /api/inventory/orders/:id
export async function getOrderById(req, res) {
  const { Order } = req.tenantModels;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// POST /api/inventory/orders
export async function createOrder(req, res) {
  const { Order } = req.tenantModels;
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

// PUT /api/inventory/orders/:id (Updates Status & Inventory on Receipt)
export async function updateOrder(req, res) {
  const { Order, InventoryItem, InventoryLog } = req.tenantModels;
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Handle Stock In on Receipt
    if (status === 'Received' && order.status !== 'Received') {
        for (const item of order.items) {
            if (item.item_id) {
                const inventoryItem = await InventoryItem.findById(item.item_id);
                
                if (inventoryItem) {
                    // 1. Update Stock
                    inventoryItem.stock_on_hand += Number(item.qty);

                    // 2. ✅ Recalculate Status
                    inventoryItem.status = calculateStatus(
                        inventoryItem.stock_on_hand, 
                        inventoryItem.min_stock_level
                    );
                    
                    await inventoryItem.save();

                    // 3. Create Log
                    await InventoryLog.create({
                        item_id: item.item_id,
                        type: 'Stock In',
                        quantity: Number(item.qty),
                        reason: 'Purchase Order',
                        notes: `Vendor: ${order.vendor}`,
                        date: new Date()
                    });
                }
            }
        }
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedOrder);

  } catch (err) { res.status(400).json({ error: err.message }); }
}