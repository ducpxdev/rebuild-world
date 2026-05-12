import { Router } from 'express';
import { pool } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/notifications/unread-count — get unread notification count
// MUST be defined before /:id routes to avoid route param collision
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0',
      [req.user.id]
    );
    res.json({ unread_count: result.rows[0].count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// GET /api/notifications — get notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, 
        c.username as commenter_username, 
        c.avatar_url as commenter_avatar,
        s.title as story_title
      FROM notifications n
      LEFT JOIN users c ON n.commenter_id = c.id
      LEFT JOIN stories s ON n.story_id = s.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/read-all — mark all notifications as read
// MUST be defined before /:id routes to avoid route param collision
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// PUT /api/notifications/:id/read — mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify notification belongs to user
    const notifResult = await pool.query(
      'SELECT user_id FROM notifications WHERE id = $1',
      [id]
    );
    if (notifResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    if (notifResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = $1', [id]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

export default router;
