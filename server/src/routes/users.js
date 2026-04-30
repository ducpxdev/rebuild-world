import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// GET /api/users/:username/profile
router.get('/:username/profile', optionalAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, avatar_url, bio, is_admin, created_at FROM users WHERE username = ?'
  ).get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const stories = db.prepare(`
    SELECT id, title, cover_url, type, genre, status, views, rating_avg, rating_count, updated_at,
      (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count
    FROM stories s WHERE author_id = ? AND is_published = 1
    ORDER BY updated_at DESC
  `).all(user.id);

  const follower_count = db.prepare('SELECT COUNT(*) as count FROM followers WHERE followed_id = ?').get(user.id);

  let is_following = false;
  if (req.user) {
    is_following = !!db.prepare('SELECT 1 FROM followers WHERE follower_id = ? AND followed_id = ?')
      .get(req.user.id, user.id);
  }

  res.json({ ...user, stories, follower_count: follower_count.count, is_following });
});

// PUT /api/users/me — update own profile
router.put('/me', authenticateToken, upload.single('avatar'), (req, res) => {
  const { bio } = req.body;
  const avatar_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!current) return res.status(404).json({ error: 'User not found' });

  db.prepare('UPDATE users SET bio = ?, avatar_url = ? WHERE id = ?')
    .run(bio ?? current.bio, avatar_url ?? current.avatar_url, req.user.id);

  res.json({ message: 'Profile updated' });
});

// GET /api/users/me/bookmarks
router.get('/me/bookmarks', authenticateToken, (req, res) => {
  const bookmarks = db.prepare(`
    SELECT s.id, s.title, s.cover_url, s.type, s.genre, s.status, s.views, s.rating_avg, s.rating_count,
      u.username as author_name,
      (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count,
      b.created_at as bookmarked_at
    FROM bookmarks b
    JOIN stories s ON b.story_id = s.id
    JOIN users u ON s.author_id = u.id
    WHERE b.user_id = ? ORDER BY b.created_at DESC
  `).all(req.user.id);
  res.json(bookmarks);
});

// GET /api/users/me/stories — admin only (used in dashboard)
router.get('/me/stories', authenticateToken, (req, res) => {
  const stories = db.prepare(`
    SELECT id, title, cover_url, type, genre, status, views, rating_avg, rating_count, is_published, created_at, updated_at,
      (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count
    FROM stories s WHERE author_id = ? ORDER BY updated_at DESC
  `).all(req.user.id);
  res.json(stories);
});

// POST /api/users/:username/follow
router.post('/:username/follow', authenticateToken, (req, res) => {
  const target = db.prepare('SELECT id, username FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

  const existing = db.prepare('SELECT 1 FROM followers WHERE follower_id = ? AND followed_id = ?')
    .get(req.user.id, target.id);

  if (existing) {
    db.prepare('DELETE FROM followers WHERE follower_id = ? AND followed_id = ?').run(req.user.id, target.id);
    return res.json({ following: false });
  } else {
    db.prepare('INSERT INTO followers (follower_id, followed_id) VALUES (?, ?)').run(req.user.id, target.id);
    return res.json({ following: true });
  }
});

// GET /api/users/me/notifications
router.get('/me/notifications', authenticateToken, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.user.id);
  res.json({ notifications, unread_count: unread.count });
});

// POST /api/users/me/notifications/read
router.post('/me/notifications/read', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'All notifications marked as read' });
});

export default router;
