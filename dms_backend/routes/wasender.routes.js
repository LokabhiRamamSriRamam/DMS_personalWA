import express from 'express';
import {
  getConfig,
  saveConfig,
  getSessionStatus,
  getQrCode,
  connectSession,
  sendMessageHandler,
  getInbox,
  getThread,
} from '../controllers/wasender.controller.js';

const router = express.Router();

router.get('/config',          getConfig);
router.put('/config',          saveConfig);
router.get('/session/status',  getSessionStatus);
router.get('/session/qrcode',  getQrCode);
router.post('/session/connect', connectSession);
router.post('/send',           sendMessageHandler);
router.get('/inbox',           getInbox);
router.get('/inbox/:phone',    getThread);

export default router;
