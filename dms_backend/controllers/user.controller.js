import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { getAnalyticsDb } from '../config/analyticsDb.js';
import { logEvent } from '../services/analyticsLogger.js';
import { sendPlatformEmail } from '../services/platformMailer.js';

const PASSWORD_DENYLIST = [
  'password', 'password1', 'password123', '12345678', '123456789',
  '1234567890', 'qwerty123', 'qwerty', 'iloveyou', 'letmein',
  'welcome1', 'monkey123', 'dragon123', 'sunshine1', 'princess1',
  'football', 'baseball1', 'abc123456', 'master123', 'shadow123',
];

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

function validatePasswordStrength(pwd, email) {
  if (!pwd || pwd.length < 8)        return { ok: false, reason: 'Password must be at least 8 characters.' };
  if (pwd.length > 128)              return { ok: false, reason: 'Password must not exceed 128 characters.' };
  if (!/[a-z]/.test(pwd))            return { ok: false, reason: 'Password must contain at least one lowercase letter.' };
  if (!/[A-Z]/.test(pwd))            return { ok: false, reason: 'Password must contain at least one uppercase letter.' };
  if (!/[0-9]/.test(pwd))            return { ok: false, reason: 'Password must contain at least one digit.' };
  if (!/[^a-zA-Z0-9]/.test(pwd))    return { ok: false, reason: 'Password must contain at least one symbol.' };
  if (pwd.toLowerCase() === (email || '').toLowerCase()) return { ok: false, reason: 'Password must not match your email address.' };
  if (PASSWORD_DENYLIST.includes(pwd.toLowerCase())) return { ok: false, reason: 'Password is too common. Please choose a stronger password.' };
  return { ok: true };
}

// ─── POST /api/users/register ────────────────────────────────────────────────
// Public endpoint. Creates a pending dms_user in the analytics MongoDB.
export async function createUser(req, res) {
  try {
    const { firstName, lastName, email, password, role, phone } = req.body;

    if (!firstName || !email || !password) {
      return res.status(400).json({ message: 'firstName, email, and password are required.' });
    }

    const analyticsDb = getAnalyticsDb();

    const existing = await analyticsDb.collection('dms_users').findOne({ email, product: 'dms' });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await analyticsDb.collection('dms_users').insertOne({
      firstName,
      lastName:  lastName || '',
      email,
      password:  hashedPassword,
      role:      role || 'Doctor',     // Doctor | Receptionist | Assistant
      phone:     phone || '',
      status:    'pending',            // Awaits dashboard admin approval
      product:   'dms',
      tenantId:  null,                 // Assigned by admin on approval
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Registration submitted. Your account is pending approval by an administrator.',
      userId:  result.insertedId,
    });
  } catch (err) {
    console.error('[createUser]', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── POST /api/users/login ────────────────────────────────────────────────────
// Public endpoint. Verifies credentials against analytics MongoDB dms_users.
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const analyticsDb = getAnalyticsDb();

    const user = await analyticsDb.collection('dms_users').findOne({ email, product: 'dms' });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Status checks
    if (user.status === 'pending') {
      return res.status(403).json({
        message: 'Your account is pending approval. Please wait for an administrator to approve your registration.',
        status: 'pending',
      });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({
        message: 'Your account registration was rejected. Please contact your administrator.',
        status: 'rejected',
      });
    }
    if (user.status === 'inactive') {
      return res.status(403).json({
        message: 'Your account is inactive. Please contact your administrator.',
        status: 'inactive',
      });
    }

    const payload = {
      id:       user._id.toString(),
      role:     user.role,
      name:     `${user.firstName} ${user.lastName}`.trim(),
      tenantId: user.tenantId ? user.tenantId.toString() : null,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    // Log login event to analytics (fire-and-forget)
    if (user.tenantId) {
      logEvent(user.tenantId.toString(), 'user_login', { userId: user._id, role: user.role });
    }

    const { password: _pwd, ...userData } = user;
    res.json({ token, user: userData });
  } catch (err) {
    console.error('[loginUser]', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── GET /api/users/profile ───────────────────────────────────────────────────
// Protected. Returns current user + tenant info for sidebar/header display.
export async function getUserProfile(req, res) {
  try {
    const { id: userId, tenantId, name, role } = req.user;

    if (!tenantId) {
      return res.status(403).json({ message: 'User not assigned to a clinic.' });
    }

    const analyticsDb = getAnalyticsDb();

    // Fetch tenant info
    const tenant = await analyticsDb.collection('tenants').findOne({
      _id: new mongoose.Types.ObjectId(tenantId)
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Clinic not found.' });
    }

    // Fetch full user info (excluding password)
    const user = await analyticsDb.collection('dms_users').findOne({
      _id: new mongoose.Types.ObjectId(userId)
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    console.log('[getUserProfile] Raw tenant data:', tenant);
    console.log('[getUserProfile] Raw user data:', user);

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      tenant: {
        id: tenant._id,
        name: tenant.name || 'Clinic',
        slug: tenant.slug || '',
        status: tenant.status || 'active',
        address: tenant.address || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        website: tenant.website || '',
        city: tenant.city || '',
        state: tenant.state || '',
        zipCode: tenant.zipCode || '',
        country: tenant.country || '',
        currency: tenant.currency || 'INR',
        timezone: tenant.timezone || 'Asia/Kolkata',
        googleDriveFolderId: tenant.googleDriveFolderId || '',
      },
    });
  } catch (err) {
    console.error('[getUserProfile]', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── GET /api/users/doctors ───────────────────────────────────────────────────
// Alias for /api/doctors for backward compatibility. Delegates to Doctor model.
// This endpoint is kept for clients that expect /users/doctors.
export async function getDoctors(req, res) {
  try {
    if (!req.tenantModels || !req.tenantModels.Doctor) {
      return res.status(500).json({ error: 'Doctor model not available' });
    }

    const { Doctor } = req.tenantModels;
    const doctors = await Doctor.find({ is_active: true }).sort({ name: 1 });
    res.json(doctors);
  } catch (err) {
    console.error('[getDoctors]', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Protected (authenticate only). Returns all staff for this tenant.
export async function getAllUsers(req, res) {
  try {
    const { tenantId } = req.user;
    if (!tenantId) return res.status(403).json({ message: 'No tenant assigned.' });

    const analyticsDb = getAnalyticsDb();

    const users = await analyticsDb.collection('dms_users').find({
      product:  'dms',
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }).toArray();

    const sanitized = users.map(({ password, ...rest }) => rest);
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── POST /api/users/forgot-password ─────────────────────────────────────────
// Public. Generates a reset token and emails a link. Always 200 (no enumeration).
export async function forgotPassword(req, res) {
  // Always respond generically first, then do the work — prevents timing enumeration
  res.status(200).json({ message: 'If an account with that email exists, a reset link has been sent.' });

  try {
    const { email } = req.body;
    if (!email) return;

    const analyticsDb = getAnalyticsDb();
    const user = await analyticsDb.collection('dms_users').findOne({ email, product: 'dms' });

    if (!user || user.status !== 'active') return;

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await analyticsDb.collection('dms_users').updateOne(
      { _id: user._id },
      { $set: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt } },
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;

    try {
      await sendPlatformEmail({
        to:      user.email,
        subject: 'Reset your DMS password',
        html: `
          <p>Hi ${user.firstName},</p>
          <p>We received a request to reset your DMS account password. Click the link below to set a new password. This link expires in <strong>1 hour</strong> and can only be used once.</p>
          <p><a href="${resetUrl}" style="background:#137fec;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Reset Password</a></p>
          <p>Or copy this URL into your browser:<br/><code>${resetUrl}</code></p>
          <p>If you did not request a password reset, you can ignore this email — your password will not change.</p>
        `,
        text: `Hi ${user.firstName},\n\nReset your DMS password by visiting:\n${resetUrl}\n\nThis link expires in 1 hour and can only be used once.\n\nIf you did not request this, ignore this email.`,
      });
    } catch (mailErr) {
      console.error('[forgotPassword] Failed to send reset email:', mailErr.message);
    }

    // Audit log — fire-and-forget
    logEvent(user.tenantId?.toString() || null, 'password_reset_requested', {
      userId:    user._id.toString(),
      email:     maskEmail(user.email),
      requestIp: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
  } catch (err) {
    console.error('[forgotPassword]', err.message);
  }
}

// ─── POST /api/users/reset-password ──────────────────────────────────────────
// Public. Verifies the token and sets a new password.
export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'token and newPassword are required.' });
    }

    const analyticsDb = getAnalyticsDb();
    const tokenHash   = crypto.createHash('sha256').update(token).digest('hex');

    const user = await analyticsDb.collection('dms_users').findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
      product: 'dms',
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    const strength = validatePasswordStrength(newPassword, user.email);
    if (!strength.ok) {
      return res.status(400).json({ message: strength.reason, code: 'WEAK_PASSWORD' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    await analyticsDb.collection('dms_users').updateOne(
      { _id: user._id },
      {
        $set:   { password: hashedPassword, updatedAt: now },
        $unset: { passwordResetTokenHash: '', passwordResetExpiresAt: '' },
      },
    );

    // Confirmation email — fire-and-forget
    try {
      await sendPlatformEmail({
        to:      user.email,
        subject: 'Your DMS password was just changed',
        html: `<p>Hi ${user.firstName},</p><p>Your DMS account password was changed at <strong>${now.toISOString()}</strong> from IP <code>${req.ip}</code>.</p><p>If this wasn't you, contact your clinic administrator immediately.</p>`,
        text:    `Hi ${user.firstName},\n\nYour DMS account password was changed at ${now.toISOString()} from IP ${req.ip}.\n\nIf this wasn't you, contact your clinic administrator immediately.`,
      });
    } catch (mailErr) {
      console.error('[resetPassword] Failed to send confirmation email:', mailErr.message);
    }

    // Audit log
    const tokenAgeSeconds = Math.round((now - user.passwordResetExpiresAt + 60 * 60 * 1000) / 1000);
    logEvent(user.tenantId?.toString() || null, 'password_reset_completed', {
      userId:           user._id.toString(),
      email:            maskEmail(user.email),
      requestIp:        req.ip,
      userAgent:        req.headers['user-agent'] || '',
      tokenAgeSeconds:  Math.max(0, tokenAgeSeconds),
    });

    res.status(200).json({ message: 'Password updated. You can now log in.' });
  } catch (err) {
    console.error('[resetPassword]', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── PATCH /api/users/admin/:userId/contact ───────────────────────────────────
// Admin-only (X-Admin-Secret header). Updates email and/or phone on dms_users.
export async function adminUpdateUserContact(req, res) {
  try {
    const { userId }        = req.params;
    const { email, phone }  = req.body;

    if (!email && !phone) {
      return res.status(400).json({ message: 'At least one of email or phone must be provided.' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId.' });
    }

    const analyticsDb = getAnalyticsDb();
    const user = await analyticsDb.collection('dms_users').findOne({
      _id: new mongoose.Types.ObjectId(userId),
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Dedupe email
    if (email && email !== user.email) {
      const conflict = await analyticsDb.collection('dms_users').findOne({
        email,
        product: 'dms',
        _id: { $ne: user._id },
      });
      if (conflict) {
        return res.status(409).json({ message: 'That email is already used by another account.' });
      }
    }

    // Build changes object for audit log
    const changes = {};
    const updates = { updatedAt: new Date() };

    if (email && email !== user.email) {
      changes.email = { before: user.email, after: email };
      updates.email = email;
    }
    if (phone && phone !== user.phone) {
      changes.phone = { before: user.phone || '', after: phone };
      updates.phone = phone;
    }

    if (Object.keys(changes).length === 0) {
      return res.status(200).json({ message: 'No changes — values are identical to current.', user: (({ password, ...r }) => r)(user) });
    }

    // Clear any stale reset tokens so they can't be used against the new email
    await analyticsDb.collection('dms_users').updateOne(
      { _id: user._id },
      {
        $set:   updates,
        $unset: { passwordResetTokenHash: '', passwordResetExpiresAt: '' },
      },
    );

    logEvent(user.tenantId?.toString() || null, 'admin_user_contact_updated', {
      userId:    user._id.toString(),
      changes,
      requestIp: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    const updated = await analyticsDb.collection('dms_users').findOne({ _id: user._id });
    const { password: _pwd, ...sanitized } = updated;

    res.status(200).json({ message: 'Contact details updated.', user: sanitized });
  } catch (err) {
    console.error('[adminUpdateUserContact]', err.message);
    res.status(500).json({ error: err.message });
  }
}
