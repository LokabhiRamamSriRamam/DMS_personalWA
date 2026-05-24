import express from 'express';
import {
  getSettings,
  updateSettings,
  testSend,
  getTemplateVariables,
  sendReportEmail,
  getPatientEmailStatus,
  sendTreatmentSummary,
  sendWhatsAppDocuments,
  getLogs,
} from '../controllers/email.controller.js';

const router = express.Router();

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/test', testSend);

// Template variable catalog (used by compose panels)
router.get('/template-variables', getTemplateVariables);

// Send (must register specific paths before /:id wildcards)
router.get('/patient-status/:patientId', getPatientEmailStatus);
router.post('/send-report', sendReportEmail);
router.post('/send-treatment-summary', sendTreatmentSummary);
router.post('/send-whatsapp-documents', sendWhatsAppDocuments);

// Logs
router.get('/logs', getLogs);

export default router;
