
import express from 'express';
import { getItems, createItem, updateItem, adjustStock, getLogs, createOrder, getOrders, getOrderById, deleteItem, updateOrder} from '../controllers/inventory.controller.js';

const router = express.Router();
router.get('/', getItems);
router.post('/', createItem);
router.put('/:id', updateItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);
router.post('/adjust', adjustStock);
router.get('/logs', getLogs);
router.post('/orders', createOrder);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id', updateOrder);

export default router;