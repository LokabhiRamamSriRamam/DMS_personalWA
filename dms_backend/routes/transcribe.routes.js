import express from 'express';
import { uploadMiddleware, transcribeAudio } from '../controllers/transcribe.controller.js';

const router = express.Router();

router.post('/', uploadMiddleware, transcribeAudio);

export default router;
