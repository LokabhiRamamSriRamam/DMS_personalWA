import express from 'express';
const router = express.Router();
import {
    getVendors,
    createVendor,
    updateVendor,
    deleteVendor,
    bulkUploadVendors
} from '../controllers/vendor.controller.js';

router.get('/', getVendors);
router.post('/', createVendor);
router.post('/bulk-upload', bulkUploadVendors);

router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

export default router;