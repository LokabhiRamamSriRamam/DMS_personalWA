import express from 'express';
const router = express.Router();

// Import 'createVisit' (matching your controller), NOT 'saveVisit'
import { 
    createVisit, 
    getVisits, 
    getVisitById, 
    getPatientHistory 
} from '../controllers/visit.controller.js';

router.post('/', createVisit);         // Changed from saveVisit
router.get('/', getVisits);
router.get('/:id', getVisitById);
router.get('/patient/:id', getPatientHistory);

export default router;