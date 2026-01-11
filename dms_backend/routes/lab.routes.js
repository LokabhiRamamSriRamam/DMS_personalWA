import { Router } from 'express';
const router = Router();
import { getOrders, createOrder, updateOrder, getCatalog, createCatalogItem} from '../controllers/lab.controller.js';

// ==========================================
// 1. LAB ORDERS ROUTES
// ==========================================
// GET /api/labs/orders -> Fetch all orders
router.get('/orders', getOrders);

// POST /api/labs/orders -> Create a new order
router.post('/orders', createOrder);

// PATCH /api/labs/orders/:id -> Update status (e.g. "Received")
router.patch('/orders/:id', updateOrder);


// ==========================================
// 2. LAB CATALOG ROUTES (Items List)
// ==========================================
// GET /api/labs/items -> List available lab items (Zirconia, etc.)
router.get('/items', getCatalog);

// POST /api/labs/items -> Add new item to catalog
router.post('/items', createCatalogItem);

export default router;