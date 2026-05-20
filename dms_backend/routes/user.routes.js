import express from 'express';
import { authenticate, requireAdminSecret } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/resolveTenant.js';
import { forgotPwLimiter, resetPwLimiter, adminPatchLimiter } from '../middleware/rateLimit.js';
import {
  createUser,
  getDoctors,
  getAllUsers,
  loginUser,
  getUserProfile,
  forgotPassword,
  resetPassword,
  adminUpdateUserContact,
} from '../controllers/user.controller.js';

const router = express.Router();

// Public routes
router.post('/register',       createUser);
router.post('/login',          loginUser);
router.post('/forgot-password', forgotPwLimiter,   forgotPassword);
router.post('/reset-password',  resetPwLimiter,    resetPassword);

// Admin-only operational route (no tenant JWT — Postman/VS Code REST client use only)
router.patch('/admin/:userId/contact', adminPatchLimiter, requireAdminSecret, adminUpdateUserContact);

// Protected routes (require tenant context)
const tenantStack = [authenticate, resolveTenant];
router.get('/profile', tenantStack, getUserProfile);
router.get('/doctors', tenantStack, getDoctors);
router.get('/',        tenantStack, getAllUsers);

export default router;