import express from 'express';
import { getPatients, createPatient, getPatientById, updatePatient,deletePatient } from '../controllers/patient.controller.js';    

const router = express.Router();
router.get('/', getPatients);
router.post('/', createPatient);
router.get('/:id', getPatientById);
router.put('/:id', updatePatient);
router.delete('/:id', deletePatient);

export default router;