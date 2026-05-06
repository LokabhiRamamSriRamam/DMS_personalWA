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

// Send Report
router.post('/send-report', sendReportEmail);

// Logs
router.get('/logs', getLogs);

export default router;
