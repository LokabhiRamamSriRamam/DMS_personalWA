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