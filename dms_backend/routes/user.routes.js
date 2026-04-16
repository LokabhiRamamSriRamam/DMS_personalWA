import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createUser,
  getDoctors,
  getAllUsers,
  loginUser,
} from '../controllers/user.controller.js';

const router = express.Router();

// Public routes
router.post('/register', createUser);
router.post('/login',    loginUser);

// Protected routes (authenticate applied here, not in index.js)
router.get('/doctors', authenticate, getDoctors);
router.get('/',        authenticate, getAllUsers);

export default router;