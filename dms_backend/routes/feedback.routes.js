import express from 'express';
import {

  getPollResponses,
  getFeedbackStats,
  getPollTemplates,
  getPollTemplate,
  createPollTemplate,
  updatePollTemplate,
  deletePollTemplate,
} from '../controllers/feedback.controller.js';

const router = express.Router();



// Poll templates (for feedback questions)
router.get('/poll-templates', getPollTemplates);
router.post('/poll-templates', createPollTemplate);
router.get('/poll-templates/:id', getPollTemplate);
router.put('/poll-templates/:id', updatePollTemplate);
router.delete('/poll-templates/:id', deletePollTemplate);

// Poll responses (tracking what patients responded)
router.get('/responses', getPollResponses);
router.get('/stats', getFeedbackStats);

export default router;
