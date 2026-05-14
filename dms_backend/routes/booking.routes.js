import { Router } from 'express';
import { resolvePublicTenant } from '../middleware/resolvePublicTenant.js';
import { getBookingConfig, getAvailableSlots, submitBooking } from '../controllers/booking.controller.js';

const router = Router({ mergeParams: true });

router.use(resolvePublicTenant);

router.get('/config',  getBookingConfig);
router.get('/slots',   getAvailableSlots);
router.post('/',       submitBooking);

export default router;
