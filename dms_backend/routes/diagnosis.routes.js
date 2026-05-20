import express from 'express';
import {
  getDiagnoses,
  createDiagnosis,
  bulkCreateDiagnoses,
  updateDiagnosis,
  deleteDiagnosis,
} from '../controllers/diagnosis.controller.js';

const router = express.Router();

router.get('/', getDiagnoses);
router.post('/', createDiagnosis);
router.post('/bulk', bulkCreateDiagnoses);
router.put('/:id', updateDiagnosis);
router.delete('/:id', deleteDiagnosis);

export default router;
