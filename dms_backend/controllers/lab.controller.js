import LabOrder from '../models/LabOrder.model.js';

import LabCatalogItem from '../models/LabCatalogItem.model.js';
import Patient from '../models/Patient.model.js';

// =======================
// 1. LAB ORDERS
// =======================

export async function getOrders(req, res) {
  try {
    const orders = await LabOrder.find()
      .populate('patient_id', 'first_name last_name patientId')
      .populate('vendor_id', 'name')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error fetching orders' });
  }
}

export async function createOrder(req, res) {
  try {
    const { 
      patient_id, 
      vendor_id, 
      item, 
      amount, 
      orderDate,
      expectedDate,
      notes 
    } = req.body;

    const patientExists = await Patient.findById(patient_id);
    if (!patientExists) return res.status(404).json({ error: 'Patient not found' });

    const vendorExists = await Vendor.findById(vendor_id);
    if (!vendorExists) return res.status(404).json({ error: 'Vendor not found' });

    const newOrder = new LabOrder({
      patient_id,
      vendor_id,
      order_date: orderDate || new Date(),
      expected_delivery: expectedDate,
      items: [{
        item_name: item, 
        cost: amount,
        instructions: notes || ''
      }],
      cost_to_clinic: amount,
      status: 'Sent'
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateOrder(req, res) {
  try {
    const { status } = req.body;
    const updatedOrder = await LabOrder.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );
    if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// =======================
// 2. LAB CATALOG
// =======================

export async function getCatalog(req, res) {
  try {
    const items = await LabCatalogItem.find().populate('preferred_vendor_id', 'name');
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
}

export async function createCatalogItem(req, res) {
  try {
    const newItem = new LabCatalogItem(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) { res.status(400).json({ error: err.message }); }
}

