import express from 'express';
import {
  getSettings,
  updateSettings,
  testSend,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  sendReportEmail,
  getPatientEmailStatus,
  sendTreatmentSummary,
  getLogs,
} from '../controllers/email.controller.js';

const router = express.Router();

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/test', testSend);

// Templates
router.get('/templates', getTemplates);
router.post('/templates', createTemplate);
router.put('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);

// Send (must register specific paths before /:id wildcards)
router.get('/patient-status/:patientId', getPatientEmailStatus);
router.post('/send-report', sendReportEmail);
router.post('/send-treatment-summary', sendTreatmentSummary);

// Logs
router.get('/logs', getLogs);

export default router;
