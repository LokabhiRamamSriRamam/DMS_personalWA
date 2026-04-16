import express from 'express';
import { uploadMiddleware, generateReport } from '../controllers/report.controller.js';

const router = express.Router();

router.post('/generate', uploadMiddleware, generateReport);

export default router;
