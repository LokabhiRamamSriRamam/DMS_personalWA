import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { getAnalyticsDb } from '../config/analyticsDb.js';
import { logEvent } from '../services/analyticsLogger.js';

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

// ─── GET /api/users/doctors ───────────────────────────────────────────────────
// Protected (authenticate only). Returns active doctors for this tenant.
// Used by appointment creation dropdowns. Does NOT need resolveTenant.
export async function getDoctors(req, res) {
  try {
    const { tenantId } = req.user;
    if (!tenantId) return res.status(403).json({ message: 'No tenant assigned.' });

    const analyticsDb = getAnalyticsDb();

    const doctors = await analyticsDb.collection('dms_users').find({
      product:  'dms',
      tenantId: new mongoose.Types.ObjectId(tenantId),
      role:     'Doctor',
      status:   'active',
    }).toArray();

    const sanitized = doctors.map(({ password, ...rest }) => rest);
    res.json(sanitized);
  } catch (err) {
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
