/**
 * One-time Google OAuth2 setup to obtain a refresh token.
 *
 * Steps:
 *  1. Start the backend server
 *  2. Open http://localhost:5000/auth/google in your browser
 *  3. Sign in with the Google account that owns the Drive folder
 *  4. Copy the refresh_token printed in the browser
 *  5. Paste it into .env as GOOGLE_REFRESH_TOKEN=<token>
 *  6. Restart the server — Drive will work silently from now on
 */

import express from 'express';
import { google } from 'googleapis';

const router = express.Router();

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

// Step 1 — redirect browser to Google consent screen
router.get('/auth/google', (req, res) => {
  const url = getOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // forces Google to return a refresh_token every time
    scope: ['https://www.googleapis.com/auth/drive'],
  });
  res.redirect(url);
});

// Step 2 — Google redirects here with ?code=...
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await getOAuthClient().getToken(code);

    if (!tokens.refresh_token) {
      return res.send(`
        <h2>No refresh token returned.</h2>
        <p>This usually means the app was already authorized without <code>prompt=consent</code>.</p>
        <p>Go to <a href="https://myaccount.google.com/permissions">Google Account Permissions</a>,
        revoke access for this app, then visit
        <a href="/auth/google">/auth/google</a> again.</p>
      `);
    }

    res.send(`
      <h2>Authorization successful!</h2>
      <p>Copy the value below and add it to <code>dms_backend/.env</code>:</p>
      <pre style="background:#f4f4f4;padding:12px;border-radius:6px;word-break:break-all;">
GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}</pre>
      <p>Then restart the backend server. You will not need to do this again.</p>
    `);
  } catch (err) {
    res.status(500).send(`<h2>Error</h2><pre>${err.message}</pre>`);
  }
});

export default router;
