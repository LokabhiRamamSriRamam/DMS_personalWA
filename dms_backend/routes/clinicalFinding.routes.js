import express from 'express';
import {
  getClinicalFindings,
  createClinicalFinding,
  updateClinicalFinding,
  deleteClinicalFinding,
} from '../controllers/clinicalFinding.controller.js';

const router = express.Router();

router.get('/', getClinicalFindings);
router.post('/', createClinicalFinding);
router.put('/:id', updateClinicalFinding);
router.delete('/:id', deleteClinicalFinding);

export default router;
