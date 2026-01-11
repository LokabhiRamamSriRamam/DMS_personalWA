import express from 'express';
const router = express.Router();

import { 
  createUser, 
  getDoctors, 
  getAllUsers, 
  loginUser 
} from '../controllers/user.controller.js';

router.post('/register', createUser);
router.post('/login', loginUser);

router.get('/doctors', getDoctors); // For Appointment Dropdowns
router.get('/', getAllUsers);       // For Admin Dashboard

export default router;