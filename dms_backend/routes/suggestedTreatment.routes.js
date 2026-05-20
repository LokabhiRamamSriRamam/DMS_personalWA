import express from 'express';
import {
  getSuggestedTreatments,
  createSuggestedTreatment,
  bulkCreateSuggestedTreatments,
  updateSuggestedTreatment,
  deleteSuggestedTreatment,
} from '../controllers/suggestedTreatment.controller.js';

const router = express.Router();

router.get('/', getSuggestedTreatments);
router.post('/', createSuggestedTreatment);
router.post('/bulk', bulkCreateSuggestedTreatments);
router.put('/:id', updateSuggestedTreatment);
router.delete('/:id', deleteSuggestedTreatment);

export default router;
