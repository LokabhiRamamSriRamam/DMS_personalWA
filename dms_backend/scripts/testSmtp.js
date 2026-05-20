import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env from dms_backend root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

console.log('SMTP config:', { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_FROM });

const transporter = nodemailer.createTransport({
  host:   SMTP_HOST,
  port:   parseInt(SMTP_PORT || '587', 10),
  secure: SMTP_SECURE === 'true',
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

try {
  await transporter.verify();
  console.log('✅ SMTP connection verified');

  const info = await transporter.sendMail({
    from:    SMTP_FROM || SMTP_USER,
    to:      SMTP_USER,
    subject: '[DMS] SMTP Test — Password Reset Email',
    text:    'This is a test email sent from the DMS platform mailer.\n\nIf you received this, the SMTP credentials are correctly configured and the forgot-password flow will work.',
    html:    `
      <p>Hi,</p>
      <p>This is a <strong>test email</strong> sent from the DMS platform mailer to verify SMTP credentials.</p>
      <p>If you received this, the credentials in <code>.env</code> are correct and the forgot-password flow will work.</p>
      <hr/>
      <p style="color:#888;font-size:12px;">Sent at ${new Date().toISOString()} · DMS Platform Mailer</p>
    `,
  });

  console.log('✅ Test email sent! Message ID:', info.messageId);
} catch (err) {
  console.error('❌ SMTP test failed:', err.message);
  process.exit(1);
}
