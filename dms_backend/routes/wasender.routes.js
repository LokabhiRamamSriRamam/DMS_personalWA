import express from 'express';
import {
  getConfig,
  saveConfig,
  createSessionHandler,
  getSessionStatus,
  getQrCode,
  connectSession,
  disconnectSessionHandler,
  regenerateKeyHandler,
  sendMessageHandler,
  getInbox,
  getThread,
  getContactsList,
  getContactInfo,
  getContactPicture,
} from '../controllers/wasender.controller.js';

const router = express.Router();

router.get('/config',               getConfig);
router.put('/config',               saveConfig);
router.post('/session/create',      createSessionHandler);
router.get('/session/status',       getSessionStatus);
router.get('/session/qrcode',       getQrCode);
router.post('/session/connect',     connectSession);
router.post('/session/disconnect',  disconnectSessionHandler);
router.post('/session/regenerate-key', regenerateKeyHandler);
router.post('/send',                sendMessageHandler);
router.get('/inbox',                getInbox);
router.get('/inbox/:phone',         getThread);
router.get('/contacts',             getContactsList);
router.get('/contacts/:phone/picture', getContactPicture);
router.get('/contacts/:phone',      getContactInfo);

export default router;
