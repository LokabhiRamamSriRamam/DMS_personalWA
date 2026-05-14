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
} from '../controllers/chatbot.controller.js';

const router = express.Router();

router.get('/templates',        listTemplates);
router.get('/flows',            listFlows);
router.get('/flows/:id',        getFlow);
router.post('/flows',           createFlow);
router.put('/flows/:id',        updateFlow);
router.delete('/flows/:id',     deleteFlow);
router.patch('/flows/:id/toggle',    toggleFlow);
router.post('/flows/:id/duplicate',  duplicateFlow);

export default router;
