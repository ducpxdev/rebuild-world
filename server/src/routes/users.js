import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { uploadDb, saveUploadedFiles } from '../middleware/uploadDb.js';

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

// PATCH /api/users/me/username — change own username (30-day cooldown)
router.patch('/me/username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return res.status(400).json({ error: 'Username may only contain letters, numbers, and underscores' });
    }

    const currentResult = await pool.query(
      'SELECT username, username_changed_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'User not found' });

    if (current.username.toLowerCase() !== trimmed.toLowerCase()) {
      // Enforce 30-day cooldown
      if (current.username_changed_at) {
        const cooldownMs = 30 * 24 * 60 * 60 * 1000;
        const lastChanged = Number(current.username_changed_at) * 1000;
        const elapsed = Date.now() - lastChanged;
        if (elapsed < cooldownMs) {
          const remainingMs = cooldownMs - elapsed;
          const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
          return res.status(429).json({
            error: `You must wait ${remainingDays} more day(s) before changing your username again`,
            remaining_days: remainingDays,
          });
        }
      }

      // Check uniqueness
      const takenResult = await pool.query(
        'SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [trimmed, req.user.id]
      );
      if (takenResult.rows.length > 0) {
        return res.status(409).json({ error: 'Username is already taken' });
      }

      const nowEpoch = Math.floor(Date.now() / 1000);
      await pool.query(
        'UPDATE users SET username = $1, username_changed_at = $2 WHERE id = $3',
        [trimmed, nowEpoch, req.user.id]
      );
    }

    res.json({ message: 'Username updated', username: trimmed });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: 'Failed to update username' });
  }
});

// PUT /api/users/me — update own profile
router.put('/me', authenticateToken, uploadDb.single('avatar'), saveUploadedFiles, async (req, res) => {
  try {
    const { bio } = req.body;
    // Store the API image URL instead of disk path
    const avatar_url = req.file && req.uploadedToDb ? `/api/images/${req.file.imageId}` : undefined;

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

// GET /api/users/me/analytics/:storyId — author analytics for a specific story
router.get('/me/analytics/:storyId', authenticateToken, async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    // Verify the requesting user owns this story
    const ownerCheck = await pool.query(
      'SELECT id, title, views, rating_avg, author_id FROM stories WHERE id = $1',
      [storyId]
    );
    const story = ownerCheck.rows[0];
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.author_id !== userId && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [
      viewsRes,
      chaptersRes,
      ratingRes,
      followersRes,
      commentersRes,
      chapterCountRes,
    ] = await Promise.all([
      // 1. Views over time — last 30 days (fills zeros for days with no data)
      pool.query(`
        SELECT
          to_char(d::date, 'YYYY-MM-DD') AS view_date,
          COALESCE(vl.views, 0) AS views
        FROM generate_series(
          (CURRENT_DATE - INTERVAL '29 days')::timestamp,
          CURRENT_DATE::timestamp,
          INTERVAL '1 day'
        ) AS d
        LEFT JOIN view_logs vl
          ON vl.story_id = $1 AND vl.view_date = d::date
        ORDER BY d ASC
      `, [storyId]),

      // 2. Top chapters by views
      pool.query(`
        SELECT chapter_number, title, views
        FROM chapters
        WHERE story_id = $1
        ORDER BY views DESC
        LIMIT 10
      `, [storyId]),

      // 3. Rating trend — average rating per week for the last 12 weeks
      pool.query(`
        SELECT
          to_char(date_trunc('week', to_timestamp(created_at)), 'YYYY-MM-DD') AS week_start,
          ROUND(AVG(rating)::numeric, 2) AS avg_rating,
          COUNT(*) AS count
        FROM story_ratings
        WHERE story_id = $1
          AND created_at >= EXTRACT(epoch FROM NOW() - INTERVAL '84 days')
        GROUP BY date_trunc('week', to_timestamp(created_at))
        ORDER BY week_start ASC
      `, [storyId]),

      // 4. New followers per week for this story's author — last 12 weeks
      pool.query(`
        SELECT
          to_char(date_trunc('week', to_timestamp(f.created_at)), 'YYYY-MM-DD') AS week_start,
          COUNT(*) AS count
        FROM followers f
        WHERE f.followed_id = $1
          AND f.created_at >= EXTRACT(epoch FROM NOW() - INTERVAL '84 days')
        GROUP BY date_trunc('week', to_timestamp(f.created_at))
        ORDER BY week_start ASC
      `, [userId]),

      // 5. Most active commenters across all chapters + story-level comments
      pool.query(`
        WITH all_comments AS (
          SELECT c.user_id
          FROM comments c
          JOIN chapters ch ON c.chapter_id = ch.id
          WHERE ch.story_id = $1
          UNION ALL
          SELECT sc.user_id
          FROM story_comments sc
          WHERE sc.story_id = $1
        )
        SELECT u.username, u.avatar_url, COUNT(*) AS comment_count
        FROM all_comments ac
        JOIN users u ON u.id = ac.user_id
        GROUP BY u.id, u.username, u.avatar_url
        ORDER BY comment_count DESC
        LIMIT 10
      `, [storyId]),

      // Chapter count for summary
      pool.query(
        'SELECT COUNT(*) AS count FROM chapters WHERE story_id = $1',
        [storyId]
      ),
    ]);

    res.json({
      story: {
        id: story.id,
        title: story.title,
        views: story.views,
        rating_avg: story.rating_avg,
        chapter_count: parseInt(chapterCountRes.rows[0].count, 10),
      },
      viewsOverTime: viewsRes.rows,
      topChapters: chaptersRes.rows,
      ratingTrend: ratingRes.rows,
      followersPerWeek: followersRes.rows,
      topCommenters: commentersRes.rows,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
