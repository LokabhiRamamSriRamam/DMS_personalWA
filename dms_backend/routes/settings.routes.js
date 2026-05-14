import { Router } from 'express';
import {
  getBookingSettings, saveBookingSettings,
  getDoctorSchedule, saveDoctorSchedule,
} from '../controllers/settings.controller.js';

const router = Router();

router.get('/booking',                 getBookingSettings);
router.put('/booking',                 saveBookingSettings);
router.get('/doctors/:id/schedule',    getDoctorSchedule);
router.put('/doctors/:id/schedule',    saveDoctorSchedule);

export default router;
