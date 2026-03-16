import express from 'express';
import multer from 'multer';
import { google } from 'googleapis';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// OAuth2 Client Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Store tokens securely (database, not memory, in production)
let tokens = {};

// Step 1: Generate Auth URL (do this once to get tokens)
router.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent' // Forces refresh token
  });
  res.redirect(url);
});

// Step 2: Save tokens from callback (run once, then store securely)
router.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  const { tokens: newTokens } = await oauth2Client.getToken(code);
  tokens = newTokens; // Store in DB, not memory!
  oauth2Client.setCredentials(newTokens);
  res.send('Authentication successful! You can close this.');
});

// Step 3: Upload using stored tokens
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!tokens.access_token) {
      return res.status(401).json({ error: 'Not authenticated. Visit /auth/google first' });
    }

    oauth2Client.setCredentials(tokens);
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const { name, category, patient_id } = req.body;
    
    const fileMetadata = {
      name: name,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // Your personal folder
      appProperties: {
        category: category,
        patient_id: patient_id
      }
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path)
    };

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink'
    });

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    // Save to MongoDB (your existing code)
    // const newFile = new FileModel({...});
    // await newFile.save();

    res.json({ success: true, fileId: driveRes.data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Upload failed' });
  }
});