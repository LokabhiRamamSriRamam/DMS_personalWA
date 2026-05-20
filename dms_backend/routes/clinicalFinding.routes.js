import express from 'express';
import {
  getClinicalFindings,
  createClinicalFinding,
  bulkCreateClinicalFindings,
  updateClinicalFinding,
  deleteClinicalFinding,
} from '../controllers/clinicalFinding.controller.js';

const router = express.Router();

router.get('/', getClinicalFindings);
router.post('/', createClinicalFinding);
router.post('/bulk', bulkCreateClinicalFindings);
router.put('/:id', updateClinicalFinding);
router.delete('/:id', deleteClinicalFinding);

export default router;
