import { Router } from 'express';
const router = Router();
import {
  getOrders, createOrder, updateOrderStatus, updateOrderFull,
  getCatalog, createCatalogItem, updateCatalogItem,
} from '../controllers/lab.controller.js';

// Lab Orders
router.get('/orders', getOrders);
router.post('/orders', createOrder);
router.patch('/orders/:id', updateOrderStatus);  // status-only (inline)
router.put('/orders/:id', updateOrderFull);       // full edit (modal)

// Lab Catalog
router.get('/items', getCatalog);
router.post('/items', createCatalogItem);
router.put('/items/:id', updateCatalogItem);

export default router;
