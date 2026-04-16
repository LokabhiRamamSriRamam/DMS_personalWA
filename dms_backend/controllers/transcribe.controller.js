import multer from 'multer';

// Keep audio in memory — no disk I/O needed
const upload = multer({ storage: multer.memoryStorage() });

export const uploadMiddleware = upload.single('file');

/**
 * POST /api/transcribe
 * Uses the tenant's Sarvam API key for real-time translation (v2.5)
 */
export async function transcribeAudio(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const { buffer, mimetype, originalname } = req.file;
    const { sarvamApiKey } = req.tenantConfig;

    if (!sarvamApiKey) {
      return res.status(400).json({ error: 'Sarvam API key not configured for this clinic.' });
    }

    // Build multipart form for Sarvam.ai
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([buffer], { type: mimetype }),
      originalname || 'recording.webm'
    );
    formData.append('model', 'saaras:v2.5');

    const sarvamRes = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
      method: 'POST',
      headers: { 'api-subscription-key': sarvamApiKey },
      body: formData,
    });

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text();
      console.error('Sarvam API error:', sarvamRes.status, errText);
      return res.status(502).json({ error: `Sarvam API error: ${sarvamRes.status}`, detail: errText });
    }

    const data = await sarvamRes.json();
    res.json({ transcript: data.transcript, language_code: data.language_code });
  } catch (err) {
    console.error('Transcribe error:', err);
    res.status(500).json({ error: err.message });
  }
}
