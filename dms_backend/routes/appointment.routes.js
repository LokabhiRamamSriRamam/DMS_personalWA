import { getAppointments, getPatientAppointments, createAppointment, updateStatus, updateAppointment, getDashboardStats } from '../controllers/appointment.controller.js';
import express from 'express';

const router = express.Router();

router.get('/dashboard-stats', getDashboardStats); // must be before '/:id' style routes
router.get('/patient/:patientId', getPatientAppointments);
router.get('/', getAppointments);
router.post('/', createAppointment);
router.patch('/:id/status', updateStatus);
router.put('/:id', updateAppointment);

export default router;
