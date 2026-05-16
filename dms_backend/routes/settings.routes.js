import { Router } from 'express';
import {
  getBookingSettings, saveBookingSettings,
  getInvoiceSettings, saveInvoiceSettings,
  getDoctorSchedule, saveDoctorSchedule,
} from '../controllers/settings.controller.js';

const router = Router();

router.get('/booking',                 getBookingSettings);
router.put('/booking',                 saveBookingSettings);
router.get('/invoice',                 getInvoiceSettings);
router.put('/invoice',                 saveInvoiceSettings);
router.get('/doctors/:id/schedule',    getDoctorSchedule);
router.put('/doctors/:id/schedule',    saveDoctorSchedule);

export default router;
