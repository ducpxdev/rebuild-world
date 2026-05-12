import jwt from 'jsonwebtoken';
import { pool } from '../database.js';

export function authenticateToken(req, res, next) {
  // SECURITY: Read token from httpOnly cookie instead of Authorization header
  // This is more secure as the token is not accessible to JavaScript
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    // Token expired or invalid
    res.clearCookie('auth_token');
    return res.status(401).json({ error: 'Not authenticated' });
  }
}

export async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // ignore invalid tokens for optional auth
    }
  }
  next();
}
