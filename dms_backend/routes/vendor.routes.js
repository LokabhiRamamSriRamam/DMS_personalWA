import express from 'express';
const router = express.Router();
import { 
    getVendors, 
    createVendor, 
    updateVendor, // <--- Import this
    deleteVendor  // <--- Import this
} from '../controllers/vendor.controller.js';

router.get('/', getVendors);
router.post('/', createVendor);

// New Routes
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

export default router;