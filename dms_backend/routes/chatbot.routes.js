import express from 'express';
import {
  listFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  toggleFlow,
  listTemplates,
  duplicateFlow,
  validateFlowEndpoint,
  testFireFlow,
  clearSessions,
  getFlowLogs,
  listAllLogs,
  getLogStats,
} from '../controllers/chatbot.controller.js';

const router = express.Router();

// Static log routes — must come BEFORE /flows/:id catches
router.get('/logs',                   listAllLogs);
router.get('/logs/stats',             getLogStats);

router.get('/templates',              listTemplates);
router.get('/flows',                  listFlows);
router.get('/flows/:id',              getFlow);
router.post('/flows',                 createFlow);
router.put('/flows/:id',              updateFlow);
router.delete('/flows/:id',           deleteFlow);
router.patch('/flows/:id/toggle',     toggleFlow);
router.post('/flows/:id/duplicate',   duplicateFlow);
router.get('/flows/:id/validate',     validateFlowEndpoint);
router.post('/flows/:id/test-fire',   testFireFlow);
router.post('/sessions/clear',        clearSessions);
router.get('/flows/:id/logs',         getFlowLogs);

export default router;
