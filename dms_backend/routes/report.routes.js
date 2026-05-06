import express from 'express';
import { uploadMiddleware, generateReport, listTemplates, transcribeAudio, getJobStatus } from '../controllers/report.controller.js';

const router = express.Router();

router.get('/templates',   listTemplates);
router.post('/transcribe', uploadMiddleware, transcribeAudio);
router.get('/jobs/:jobId', getJobStatus);

// /generate accepts multipart (legacy) OR JSON (jobId path)
// multer is applied only when Content-Type is multipart
function maybeUpload(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    uploadMiddleware(req, res, next);
  } else {
    next();
  }
}
router.post('/generate', maybeUpload, generateReport);

export default router;
