import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../mailer.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-30 alphanumeric characters or underscores' });
  }

  const existing = await db.prepare('SELECT id FROM users WHERE email = $1 OR username = $2').get(email, username);
  if (existing) {
    return res.status(409).json({ error: 'Email or username already in use' });
  }

  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 12);

  await db.prepare(`
    INSERT INTO users (id, username, email, password_hash, is_verified)
    VALUES ($1, $2, $3, $4, 1)
  `).run(id, username, email, password_hash);

  res.status(201).json({ message: 'Account created. You can now log in.' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await db.prepare('SELECT * FROM users WHERE email = $1').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email, is_admin: !!user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url, bio: user.bio, is_admin: !!user.is_admin },
  });
});

// GET /api/auth/verify-email?token=...
router.get('/verify-email', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });
  if (user.verification_expires < Date.now()) {
    return res.status(400).json({ error: 'Verification token has expired' });
  }

  db.prepare(`
    UPDATE users SET is_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?
  `).run(user.id);

  res.json({ message: 'Email verified successfully. You can now log in.' });
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || user.is_verified) {
    return res.status(400).json({ error: 'User not found or already verified' });
  }

  const verification_token = uuidv4();
  const verification_expires = Date.now() + 24 * 60 * 60 * 1000;
  db.prepare('UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?')
    .run(verification_token, verification_expires, user.id);

  await sendVerificationEmail(email, verification_token);
  res.json({ message: 'Verification email resent' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Always respond the same to prevent email enumeration
  if (user) {
    const reset_token = uuidv4();
    const reset_expires = Date.now() + 60 * 60 * 1000;
    db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?')
      .run(reset_token, reset_expires, user.id);
    try {
      await sendPasswordResetEmail(email, reset_token);
    } catch {
      console.error('Failed to send reset email');
    }
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || user.reset_expires < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const password_hash = await bcrypt.hash(password, 12);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?')
    .run(password_hash, user.id);

  res.json({ message: 'Password reset successful. You can now log in.' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, avatar_url, bio, is_admin, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
