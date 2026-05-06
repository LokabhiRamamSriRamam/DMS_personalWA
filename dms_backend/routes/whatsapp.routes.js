import express from 'express';
import multer from 'multer';
import {
  getSettings,    upsertSettings,
  getTemplates,   createTemplate,  updateTemplate,  deleteTemplate,
  getMedia,       uploadMedia,     deleteMedia,
  getLogs,        getScheduledLogs, getLogsSummary,
  testSend,
  getTreatmentNames,
  getJourneys,    createJourney,   updateJourney,   deleteJourney,
  getFeedback, sendFeedbackPoll,
  sendReportWhatsApp,
} from '../controllers/whatsapp.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Settings
router.get('/settings', getSettings);
router.put('/settings', upsertSettings);

// Templates
router.get('/templates',         getTemplates);
router.post('/templates',        createTemplate);
router.put('/templates/:id',     updateTemplate);
router.delete('/templates/:id',  deleteTemplate);

// Media
router.get('/media',         getMedia);
router.post('/media',        upload.single('file'), uploadMedia);
router.delete('/media/:id',  deleteMedia);

// Treatment Journeys (post-care)
// NOTE: /journeys/treatments must be registered BEFORE /journeys/:id
router.get('/journeys/treatments', getTreatmentNames);
router.get('/journeys',            getJourneys);
router.post('/journeys',           createJourney);
router.put('/journeys/:id',        updateJourney);
router.delete('/journeys/:id',     deleteJourney);

// Logs
// NOTE: /logs/scheduled and /logs/summary must be registered BEFORE /logs/:something
router.get('/logs/scheduled', getScheduledLogs);
router.get('/logs/summary',   getLogsSummary);
router.get('/logs',           getLogs);

// Test send
router.post('/test-send', testSend);

// AI Report document send
router.post('/send-report', sendReportWhatsApp);

// Feedback / Poll Responses (protected)
router.post('/feedback/send', sendFeedbackPoll);
router.get('/feedback', getFeedback);

export default router;
