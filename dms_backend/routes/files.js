import express from 'express';
import multer from 'multer';
import {
  uploadFile,
  getPatientFiles,
  deleteFile,
  setupPatientFolder,
  getAllFiles,
  getStorageInfo,
  bulkDeleteFile,
} from '../controllers/files.controller.js';

const router = express.Router();

// Store uploads in memory; works on Vercel's ephemeral filesystem
const upload = multer({ storage: multer.memoryStorage() });

// Upload a file to a patient's Drive subfolder
// POST /api/files/upload  (multipart: file, patient_id, category, visit_id?)
router.post('/upload', upload.single('file'), uploadFile);

// List all files for a patient, grouped by category
// GET /api/files/patient/:patientId
router.get('/patient/:patientId', getPatientFiles);

// List all files across all patients
// GET /api/files/all
router.get('/all', getAllFiles);

// Get storage info
// GET /api/files/storage
router.get('/storage', getStorageInfo);

// Bulk delete files
// POST /api/files/bulk-delete
router.post('/bulk-delete', bulkDeleteFile);

// Delete a file from Drive + patient record
// DELETE /api/files/:fileRecordId  (body: { patient_id })
router.delete('/:fileRecordId', deleteFile);

// Manually create Drive folders for an existing patient (backfill)
// POST /api/files/setup-folder/:patientId
router.post('/setup-folder/:patientId', setupPatientFolder);

export default router;
