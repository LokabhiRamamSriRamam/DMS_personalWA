import { getAppointments, createAppointment, updateStatus } from '../controllers/appointment.controller.js';
import express from 'express';

const router = express.Router();

router.get('/', getAppointments);
router.post('/', createAppointment);
router.patch('/:id/status', updateStatus);

export default router;