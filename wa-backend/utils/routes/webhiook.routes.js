import express from "express";

const router = express.Router();

// Route: POST /api/webhook/wasender
router.post("/wasender", async (req, res) => {
  // ⚠️ ALWAYS return 200 OK immediately to WhatsApp/Provider
  res.status(200).send("OK");

  try {
    const payload = req.body;

    // 1. Basic Validation
    if (payload.event !== "messages.received" || !payload.data?.messages) {
      return;
    }

    const msgData = payload.data.messages;
    const key = msgData.key || {};
    const rawMessage = msgData.message || {};

    // 2. Identify the Sender
    const senderNumber = key.cleanedParticipantPn || key.cleanedSenderPn;
    const chatId = key.remoteJid;
    const isGroup = !!key.cleanedParticipantPn;

    // 3. Get the Message Text
    const text = msgData.messageBody || "";

    // 4. Log the incoming message
    console.log(`\n📩 NEW WEBHOOK MESSAGE`);
    console.log(`-----------------------------------`);
    console.log(`From: ${senderNumber} ${isGroup ? '(Group)' : '(Private)'}`);
    console.log(`Chat ID: ${chatId}`);
    console.log(`Text: "${text}"`);
    
    // 5. Check Media Type
    if (rawMessage.imageMessage) console.log("📷 Type: Image");
    else if (rawMessage.videoMessage) console.log("🎥 Type: Video");
    else if (rawMessage.audioMessage) console.log("🎵 Type: Audio");
    
    console.log(`-----------------------------------\n`);

    // TODO: Add database saving logic here

  } catch (err) {
    console.error("🔥 Webhook Error:", err.message);
  }
});

export default router;