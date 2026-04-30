import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/resolveTenant.js';
import {
  createUser,
  getDoctors,
  getAllUsers,
  loginUser,
  getUserProfile,
} from '../controllers/user.controller.js';

const router = express.Router();

// Public routes
router.post('/register', createUser);
router.post('/login',    loginUser);

// Protected routes (require tenant context)
const tenantStack = [authenticate, resolveTenant];
router.get('/profile', tenantStack, getUserProfile);
router.get('/doctors', tenantStack, getDoctors);
router.get('/',        tenantStack, getAllUsers);

export default router;