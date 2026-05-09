
import express from 'express';
import {
  getItems,
  createItem,
  updateItem,
  adjustStock,
  getLogs,
  createOrder,
  getOrders,
  getOrderById,
  deleteItem,
  updateOrder,
  getInventorySettings,
  updateInventorySettings,
  bulkUploadMedicines,
  bulkUploadConsumables,
} from '../controllers/inventory.controller.js';

const router = express.Router();

// Settings (must come before '/:id' to avoid being captured)
router.get('/settings', getInventorySettings);
router.put('/settings', updateInventorySettings);

// Bulk upload via Google Sheets URL
router.post('/bulk-upload-medicines', bulkUploadMedicines);
router.post('/bulk-upload-consumables', bulkUploadConsumables);

router.get('/', getItems);
router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);
router.post('/adjust', adjustStock);
router.get('/logs', getLogs);
router.post('/orders', createOrder);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id', updateOrder);

export default router;
