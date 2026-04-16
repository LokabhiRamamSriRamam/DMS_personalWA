import express from 'express';
const router = express.Router();

import {
  createVisit,
  getVisits,
  getVisitById,
  getPatientHistory,
  updateTreatmentStatus,
  markInvoiced,
  addConsultationNote,
  addAdvice,
  updateNote,
  updateAdvice,
  deleteNote,
  deleteAdvice,
  deleteTreatment,
  addPrescription,
  deletePrescription,
  addTreatments,
} from '../controllers/visit.controller.js';

router.post('/', createVisit);
router.get('/', getVisits);
router.get('/:id', getVisitById);
router.get('/patient/:id', getPatientHistory);
router.patch('/:visitId/treatments/:treatmentId/status', updateTreatmentStatus);
router.post('/mark-invoiced', markInvoiced);

// Notes & Advices — find or create today's visit, then push entry
router.post('/patient/:patientId/note',   addConsultationNote);
router.post('/patient/:patientId/advice', addAdvice);

// Edit existing note / advice
router.patch('/:visitId/notes/:noteId',     updateNote);
router.patch('/:visitId/advices/:adviceId', updateAdvice);

// Delete note / advice / treatment
router.delete('/:visitId/notes/:noteId',         deleteNote);
router.delete('/:visitId/advices/:adviceId',     deleteAdvice);
router.delete('/:visitId/treatments/:treatmentId', deleteTreatment);

// Prescriptions
router.post('/patient/:patientId/prescription', addPrescription);

// AI autofill — bulk add treatments to today's visit
router.post('/patient/:patientId/treatments', addTreatments);
router.delete('/:visitId/prescriptions/:prescriptionId', deletePrescription);

export default router;
