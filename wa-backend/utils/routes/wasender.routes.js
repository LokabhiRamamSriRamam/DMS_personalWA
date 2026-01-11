import express from "express";
import axios from "axios";

const router = express.Router();

const WASENDER_URL = "https://www.wasenderapi.com/api/send-message";

// ----------- Helper function for standard sends ----------- //
const sendMessage = async (payload) => {
  const key = process.env.WASENDER_API_KEY;

  if (!key) {
    throw new Error("WASENDER_API_KEY missing in .env");
  }

  console.log("➡️ Sending payload to Wasender:", JSON.stringify(payload, null, 2));

  const response = await axios.post(WASENDER_URL, payload, {
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });

  return response.data;
};

// ------------------ ROUTES ------------------ //

// 1️⃣ Send text message
router.post("/text", async (req, res) => {
  try {
    const { to, text } = req.body;
    if (!to || !text) {
      return res.status(400).json({ error: "'to' and 'text' are required" });
    }

    const data = await sendMessage({ to, text });
    res.json(data);
  } catch (err) {
    console.error("🔥 Wasender error:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
});

// 2️⃣ Send document message
router.post("/document", async (req, res) => {
  try {
    const { to, documentUrl, text, fileName } = req.body;
    if (!to || !documentUrl) {
      return res
        .status(400)
        .json({ error: "'to' and 'documentUrl' are required" });
    }

    const payload = { to, documentUrl };
    if (text) payload.text = text;
    if (fileName) payload.fileName = fileName;

    const data = await sendMessage(payload);
    res.json(data);
  } catch (err) {
    console.error("🔥 Wasender error:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
});

// 3️⃣ Send image message
router.post("/image", async (req, res) => {
  try {
    const { to, imageUrl, text } = req.body;
    if (!to || !imageUrl) {
      return res
        .status(400)
        .json({ error: "'to' and 'imageUrl' are required" });
    }

    const payload = { to, imageUrl };
    if (text) payload.text = text;

    const data = await sendMessage(payload);
    res.json(data);
  } catch (err) {
    console.error("🔥 Wasender error:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
});

// 4️⃣ Send video message
router.post("/video", async (req, res) => {
  try {
    const { to, videoUrl, text } = req.body;
    
    if (!to || !videoUrl) {
      return res.status(400).json({ error: "'to' and 'videoUrl' are required" });
    }

    const payload = { to, videoUrl };
    if (text) payload.text = text;

    const data = await sendMessage(payload);
    res.json(data);
  } catch (err) {
    console.error("🔥 Wasender error:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
});

// 5️⃣ Send location message
router.post("/location", async (req, res) => {
  try {
    const { to, latitude, longitude, address, name, text } = req.body;

    if (!to || !latitude || !longitude) {
      return res.status(400).json({ error: "'to', 'latitude', and 'longitude' are required" });
    }

    const payload = {
      to,
      text: text || "",
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        name: name || "",
        address: address || ""
      }
    };

    const data = await sendMessage(payload);
    res.json(data);
  } catch (err) {
    console.error("🔥 Wasender error:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
});

// 6️⃣ Resend failed message (NEW)
router.post("/resend/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: "Message ID is required" });
    }

    const key = process.env.WASENDER_API_KEY;
    // Constructing the specific URL for resending
    const resendUrl = `https://www.wasenderapi.com/api/messages/${id}/resend`;

    console.log(`➡️ Resending message ID: ${id}`);

    // Sending an empty object {} as body because it's a POST request
    const response = await axios.post(resendUrl, {}, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error("🔥 Wasender Resend error:", err.response?.data || err.message);
    res.status(500).json(err.response?.data || { error: err.message });
  }
});

export default router;