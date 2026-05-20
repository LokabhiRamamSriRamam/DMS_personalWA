import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, name }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAdminSecret(req, res, next) {
  const provided = req.header('X-Admin-Secret') || '';
  const expected = process.env.ADMIN_API_SECRET || '';

  if (!provided || provided.length !== expected.length) {
    console.warn('[adminSecret] denied from', req.ip);
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const match = crypto.timingSafeEqual(
    Buffer.from(provided, 'utf8'),
    Buffer.from(expected, 'utf8'),
  );

  if (!match) {
    console.warn('[adminSecret] denied from', req.ip);
    return res.status(401).json({ message: 'Unauthorized' });
  }

  next();
}
