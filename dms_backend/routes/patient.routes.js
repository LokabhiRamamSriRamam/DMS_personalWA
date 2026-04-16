import express from 'express';
import { getPatients, getPatientStats, createPatient, getPatientById, updatePatient, deletePatient } from '../controllers/patient.controller.js';

const router = express.Router();
router.get('/stats', getPatientStats); // must be before /:id
router.get('/', getPatients);
router.post('/', createPatient);
router.get('/:id', getPatientById);
router.put('/:id', updatePatient);
router.delete('/:id', deletePatient);

export default router;