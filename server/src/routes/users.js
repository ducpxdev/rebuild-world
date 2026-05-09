import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// GET /api/users/:username/profile
router.get('/:username/profile', optionalAuth, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, username, avatar_url, bio, is_admin, created_at FROM users WHERE username = $1',
      [req.params.username]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const storiesResult = await pool.query(`
      SELECT id, title, cover_url, type, genre, status, views, rating_avg, rating_count, updated_at,
        (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count
      FROM stories s WHERE author_id = $1 AND is_published = 1
      ORDER BY updated_at DESC
    `, [user.id]);
    const stories = storiesResult.rows;

    const follower_count_result = await pool.query('SELECT COUNT(*) as count FROM followers WHERE followed_id = $1', [user.id]);
    const follower_count = follower_count_result.rows[0].count;

    let is_following = false;
    if (req.user) {
      const followResult = await pool.query('SELECT 1 FROM followers WHERE follower_id = $1 AND followed_id = $2',
        [req.user.id, user.id]);
      is_following = followResult.rows.length > 0;
    }

    res.json({ ...user, stories, follower_count, is_following });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/users/me — update own profile
router.put('/me', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const { bio } = req.body;
    const avatar_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    const currentResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'User not found' });

    await pool.query('UPDATE users SET bio = $1, avatar_url = $2 WHERE id = $3',
      [bio ?? current.bio, avatar_url ?? current.avatar_url, req.user.id]);

    res.json({ message: 'Profile updated' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/me/bookmarks
router.get('/me/bookmarks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.title, s.cover_url, s.type, s.genre, s.status, s.views, s.rating_avg, s.rating_count,
        u.username as author_name,
        (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count,
        b.created_at as bookmarked_at
      FROM bookmarks b
      JOIN stories s ON b.story_id = s.id
      JOIN users u ON s.author_id = u.id
      WHERE b.user_id = $1 ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// GET /api/users/me/stories — admin only (used in dashboard)
router.get('/me/stories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, cover_url, type, genre, status, views, rating_avg, rating_count, is_published, created_at, updated_at,
        (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count
      FROM stories s WHERE author_id = $1 ORDER BY updated_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// POST /api/users/:username/follow
router.post('/:username/follow', authenticateToken, async (req, res) => {
  try {
    const targetResult = await pool.query('SELECT id, username FROM users WHERE username = $1', [req.params.username]);
    const target = targetResult.rows[0];
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

    const existingResult = await pool.query('SELECT 1 FROM followers WHERE follower_id = $1 AND followed_id = $2',
      [req.user.id, target.id]);
    const existing = existingResult.rows.length > 0;

    if (existing) {
      await pool.query('DELETE FROM followers WHERE follower_id = $1 AND followed_id = $2', [req.user.id, target.id]);
      return res.json({ following: false });
    } else {
      await pool.query('INSERT INTO followers (follower_id, followed_id) VALUES ($1, $2)', [req.user.id, target.id]);
      return res.json({ following: true });
    }
  } catch (error) {
    console.error('Error updating follow status:', error);
    res.status(500).json({ error: 'Failed to update follow status' });
  }
});

// GET /api/users/me/notifications
router.get('/me/notifications', authenticateToken, async (req, res) => {
  try {
    const notificationsResult = await pool.query(`
      SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
    `, [req.user.id]);
    const notifications = notificationsResult.rows;
    
    const unreadResult = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0',
      [req.user.id]);
    const unread_count = unreadResult.rows[0].count;
    
    res.json({ notifications, unread_count });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/users/me/notifications/read
router.post('/me/notifications/read', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

export default router;
