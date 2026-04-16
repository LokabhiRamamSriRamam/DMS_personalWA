import express from 'express';
import multer from 'multer';
import {
  uploadFile,
  getPatientFiles,
  deleteFile,
  setupPatientFolder,
} from '../controllers/files.controller.js';

const router = express.Router();

// Store uploads in temp dir; originalname preserved by controller
const upload = multer({ dest: 'uploads/' });

// Upload a file to a patient's Drive subfolder
// POST /api/files/upload  (multipart: file, patient_id, category, visit_id?)
router.post('/upload', upload.single('file'), uploadFile);

// List all files for a patient, grouped by category
// GET /api/files/patient/:patientId
router.get('/patient/:patientId', getPatientFiles);

// Delete a file from Drive + patient record
// DELETE /api/files/:fileRecordId  (body: { patient_id })
router.delete('/:fileRecordId', deleteFile);

// Manually create Drive folders for an existing patient (backfill)
// POST /api/files/setup-folder/:patientId
router.post('/setup-folder/:patientId', setupPatientFolder);

export default router;
