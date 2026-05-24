import express from 'express';
import { uploadMiddleware, generateReport, listTemplates, transcribeAudio, getJobStatus, editTranscript, cancelGeneration, saveReportToDrive, getReportDeliverySettings, saveReportDeliverySettings } from '../controllers/report.controller.js';

const router = express.Router();

router.get('/templates',   listTemplates);
router.get('/delivery-settings',  getReportDeliverySettings);
router.put('/delivery-settings',  saveReportDeliverySettings);
router.post('/transcribe', uploadMiddleware, transcribeAudio);
router.get('/jobs/:jobId', getJobStatus);
router.patch('/jobs/:jobId/transcript', editTranscript);
router.patch('/jobs/:jobId/cancel', cancelGeneration);
router.post('/jobs/:jobId/save-to-drive', saveReportToDrive);

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
