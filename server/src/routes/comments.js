import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * CHAPTER COMMENT ENDPOINTS
 */

// POST /api/comments/:commentId/like - Like a chapter comment
router.post('/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists
    const commentResult = await pool.query(
      'SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = $1',
      [commentId]
    );
    const comment = commentResult.rows[0];
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if already liked
    const likeExists = await pool.query(
      'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (likeExists.rows.length > 0) {
      return res.status(400).json({ error: 'Already liked this comment' });
    }

    // Add like
    const likeId = uuidv4();
    await pool.query(
      'INSERT INTO comment_likes (id, comment_id, user_id) VALUES ($1, $2, $3)',
      [likeId, commentId, userId]
    );

    // Get updated like count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = $1',
      [commentId]
    );
    const likeCount = parseInt(countResult.rows[0].count, 10);

    res.json({ likeCount, liked: true });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
});

// DELETE /api/comments/:commentId/like - Unlike a chapter comment
router.delete('/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Remove like
    await pool.query(
      'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, userId]
    );

    // Get updated like count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = $1',
      [commentId]
    );
    const likeCount = parseInt(countResult.rows[0].count, 10);

    res.json({ likeCount, liked: false });
  } catch (error) {
    console.error('Error unliking comment:', error);
    res.status(500).json({ error: 'Failed to unlike comment' });
  }
});

// GET /api/comments/:commentId/likes-count - Get like count for a comment
router.get('/:commentId/likes-count', async (req, res) => {
  try {
    const { commentId } = req.params;

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = $1',
      [commentId]
    );
    const likeCount = parseInt(result.rows[0].count, 10);

    res.json({ likeCount });
  } catch (error) {
    console.error('Error getting like count:', error);
    res.status(500).json({ error: 'Failed to get like count' });
  }
});

// POST /api/comments/:commentId/replies - Reply to a chapter comment
router.post('/:commentId/replies', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Reply cannot be empty' });
    }

    // Check if comment exists and get original commenter info
    const commentResult = await pool.query(`
      SELECT c.*, u.id as original_user_id, u.username as original_username, ch.story_id, s.title as story_title, s.author_id as story_author_id
      FROM comments c 
      JOIN users u ON c.user_id = u.id
      JOIN chapters ch ON c.chapter_id = ch.id
      JOIN stories s ON ch.story_id = s.id
      WHERE c.id = $1
    `, [commentId]);
    const comment = commentResult.rows[0];
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is banned from commenting
    const userResult = await pool.query('SELECT comments_banned FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length > 0 && userResult.rows[0].comments_banned) {
      return res.status(403).json({ error: 'You have been banned from commenting' });
    }

    // Create reply
    const replyId = uuidv4();
    await pool.query(
      'INSERT INTO comment_replies (id, comment_id, user_id, content) VALUES ($1, $2, $3, $4)',
      [replyId, commentId, userId, content.trim()]
    );

    // Send notification to original commenter (only if different user)
    if (userId !== comment.original_user_id) {
      const notificationId = uuidv4();
      const username = (await pool.query('SELECT username FROM users WHERE id = $1', [userId])).rows[0].username;
      
      await pool.query(`
        INSERT INTO notifications 
        (id, user_id, commenter_id, story_id, comment_id, type, title, message, is_read, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, EXTRACT(epoch FROM NOW()))
      `, [
        notificationId,
        comment.original_user_id,
        userId,
        comment.story_id,
        commentId,
        'reply',
        'New reply to your comment',
        `${username} replied to your comment on "${comment.story_title}"`
      ]);
    }

    // Get reply with user info
    const replyResult = await pool.query(`
      SELECT cr.*, u.username, u.avatar_url 
      FROM comment_replies cr
      JOIN users u ON cr.user_id = u.id 
      WHERE cr.id = $1
    `, [replyId]);
    const reply = replyResult.rows[0];

    res.status(201).json(reply);
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// GET /api/comments/:commentId/replies - Get replies to a chapter comment
router.get('/:commentId/replies', async (req, res) => {
  try {
    const { commentId } = req.params;

    const result = await pool.query(`
      SELECT cr.*, u.username, u.avatar_url, u.is_admin
      FROM comment_replies cr
      JOIN users u ON cr.user_id = u.id
      WHERE cr.comment_id = $1
      ORDER BY cr.created_at ASC
    `, [commentId]);

    res.json({ replies: result.rows });
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// DELETE /api/comments/:commentId/replies/:replyId - Delete a reply (own reply or admin)
router.delete('/:commentId/replies/:replyId', authenticateToken, async (req, res) => {
  try {
    const { replyId } = req.params;
    const userId = req.user.id;

    // Check if reply exists
    const replyResult = await pool.query(
      'SELECT user_id FROM comment_replies WHERE id = $1',
      [replyId]
    );
    const reply = replyResult.rows[0];
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    // Check authorization (own reply or admin)
    if (userId !== reply.user_id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete reply
    await pool.query('DELETE FROM comment_replies WHERE id = $1', [replyId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({ error: 'Failed to delete reply' });
  }
});

/**
 * STORY COMMENT ENDPOINTS
 */

// POST /api/story-comments/:storyCommentId/like - Like a story comment
router.post('/story/:storyCommentId/like', authenticateToken, async (req, res) => {
  try {
    const { storyCommentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists
    const commentResult = await pool.query(
      'SELECT id FROM story_comments WHERE id = $1',
      [storyCommentId]
    );
    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if already liked
    const likeExists = await pool.query(
      'SELECT id FROM story_comment_likes WHERE story_comment_id = $1 AND user_id = $2',
      [storyCommentId, userId]
    );

    if (likeExists.rows.length > 0) {
      return res.status(400).json({ error: 'Already liked this comment' });
    }

    // Add like
    const likeId = uuidv4();
    await pool.query(
      'INSERT INTO story_comment_likes (id, story_comment_id, user_id) VALUES ($1, $2, $3)',
      [likeId, storyCommentId, userId]
    );

    // Get updated like count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM story_comment_likes WHERE story_comment_id = $1',
      [storyCommentId]
    );
    const likeCount = parseInt(countResult.rows[0].count, 10);

    res.json({ likeCount, liked: true });
  } catch (error) {
    console.error('Error liking story comment:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
});

// DELETE /api/story-comments/:storyCommentId/like - Unlike a story comment
router.delete('/story/:storyCommentId/like', authenticateToken, async (req, res) => {
  try {
    const { storyCommentId } = req.params;
    const userId = req.user.id;

    // Remove like
    await pool.query(
      'DELETE FROM story_comment_likes WHERE story_comment_id = $1 AND user_id = $2',
      [storyCommentId, userId]
    );

    // Get updated like count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM story_comment_likes WHERE story_comment_id = $1',
      [storyCommentId]
    );
    const likeCount = parseInt(countResult.rows[0].count, 10);

    res.json({ likeCount, liked: false });
  } catch (error) {
    console.error('Error unliking story comment:', error);
    res.status(500).json({ error: 'Failed to unlike comment' });
  }
});

// POST /api/story-comments/:storyCommentId/replies - Reply to a story comment
router.post('/story/:storyCommentId/replies', authenticateToken, async (req, res) => {
  try {
    const { storyCommentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Reply cannot be empty' });
    }

    // Check if comment exists and get original commenter info
    const commentResult = await pool.query(`
      SELECT sc.*, u.id as original_user_id, u.username as original_username, 
             s.id as story_id, s.title as story_title, s.author_id as story_author_id
      FROM story_comments sc 
      JOIN users u ON sc.user_id = u.id
      JOIN stories s ON sc.story_id = s.id
      WHERE sc.id = $1
    `, [storyCommentId]);
    const comment = commentResult.rows[0];
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is banned from commenting
    const userResult = await pool.query('SELECT comments_banned FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length > 0 && userResult.rows[0].comments_banned) {
      return res.status(403).json({ error: 'You have been banned from commenting' });
    }

    // Create reply
    const replyId = uuidv4();
    await pool.query(
      'INSERT INTO story_comment_replies (id, story_comment_id, user_id, content) VALUES ($1, $2, $3, $4)',
      [replyId, storyCommentId, userId, content.trim()]
    );

    // Send notification to original commenter (only if different user)
    if (userId !== comment.original_user_id) {
      const notificationId = uuidv4();
      const username = (await pool.query('SELECT username FROM users WHERE id = $1', [userId])).rows[0].username;
      
      await pool.query(`
        INSERT INTO notifications 
        (id, user_id, commenter_id, story_id, comment_id, type, title, message, is_read, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, EXTRACT(epoch FROM NOW()))
      `, [
        notificationId,
        comment.original_user_id,
        userId,
        comment.story_id,
        storyCommentId,
        'reply',
        'New reply to your comment',
        `${username} replied to your comment on "${comment.story_title}"`
      ]);
    }

    // Get reply with user info
    const replyResult = await pool.query(`
      SELECT scr.*, u.username, u.avatar_url 
      FROM story_comment_replies scr
      JOIN users u ON scr.user_id = u.id 
      WHERE scr.id = $1
    `, [replyId]);
    const reply = replyResult.rows[0];

    res.status(201).json(reply);
  } catch (error) {
    console.error('Error creating story comment reply:', error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// GET /api/story-comments/:storyCommentId/replies - Get replies to a story comment
router.get('/story/:storyCommentId/replies', async (req, res) => {
  try {
    const { storyCommentId } = req.params;

    const result = await pool.query(`
      SELECT scr.*, u.username, u.avatar_url, u.is_admin
      FROM story_comment_replies scr
      JOIN users u ON scr.user_id = u.id
      WHERE scr.story_comment_id = $1
      ORDER BY scr.created_at ASC
    `, [storyCommentId]);

    res.json({ replies: result.rows });
  } catch (error) {
    console.error('Error fetching story comment replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// DELETE /api/story-comments/:storyCommentId/replies/:replyId - Delete a story comment reply
router.delete('/story/:storyCommentId/replies/:replyId', authenticateToken, async (req, res) => {
  try {
    const { replyId } = req.params;
    const userId = req.user.id;

    // Check if reply exists
    const replyResult = await pool.query(
      'SELECT user_id FROM story_comment_replies WHERE id = $1',
      [replyId]
    );
    const reply = replyResult.rows[0];
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    // Check authorization (own reply or admin)
    if (userId !== reply.user_id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete reply
    await pool.query('DELETE FROM story_comment_replies WHERE id = $1', [replyId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting story comment reply:', error);
    res.status(500).json({ error: 'Failed to delete reply' });
  }
});

/**
 * COMMENT PINNING ENDPOINTS
 */

// POST /api/comments/:commentId/pin - Pin a chapter comment (story author only)
router.post('/:commentId/pin', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists and get chapter/story info
    const commentResult = await pool.query(`
      SELECT c.id, c.chapter_id, ch.story_id
      FROM comments c
      JOIN chapters ch ON c.chapter_id = ch.id
      WHERE c.id = $1
    `, [commentId]);

    const comment = commentResult.rows[0];
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is the story author
    const storyResult = await pool.query('SELECT author_id FROM stories WHERE id = $1', [comment.story_id]);
    const story = storyResult.rows[0];

    if (!story || story.author_id !== userId) {
      return res.status(403).json({ error: 'Only story author can pin comments' });
    }

    // Pin the comment
    const pinTime = Math.floor(Date.now() / 1000);
    await pool.query(
      'UPDATE comments SET pinned = TRUE, pinned_at = $1 WHERE id = $2',
      [pinTime, commentId]
    );

    res.json({ success: true, pinned: true });
  } catch (error) {
    console.error('Error pinning comment:', error);
    res.status(500).json({ error: 'Failed to pin comment' });
  }
});

// POST /api/comments/:commentId/unpin - Unpin a chapter comment (story author only)
router.post('/:commentId/unpin', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists and get chapter/story info
    const commentResult = await pool.query(`
      SELECT c.id, c.chapter_id, ch.story_id
      FROM comments c
      JOIN chapters ch ON c.chapter_id = ch.id
      WHERE c.id = $1
    `, [commentId]);

    const comment = commentResult.rows[0];
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is the story author
    const storyResult = await pool.query('SELECT author_id FROM stories WHERE id = $1', [comment.story_id]);
    const story = storyResult.rows[0];

    if (!story || story.author_id !== userId) {
      return res.status(403).json({ error: 'Only story author can unpin comments' });
    }

    // Unpin the comment
    await pool.query(
      'UPDATE comments SET pinned = FALSE, pinned_at = NULL WHERE id = $1',
      [commentId]
    );

    res.json({ success: true, pinned: false });
  } catch (error) {
    console.error('Error unpinning comment:', error);
    res.status(500).json({ error: 'Failed to unpin comment' });
  }
});

// POST /api/story-comments/:storyCommentId/pin - Pin a story comment (story author only)
router.post('/story/:storyCommentId/pin', authenticateToken, async (req, res) => {
  try {
    const { storyCommentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists
    const commentResult = await pool.query(
      'SELECT id, story_id FROM story_comments WHERE id = $1',
      [storyCommentId]
    );

    const comment = commentResult.rows[0];
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is the story author
    const storyResult = await pool.query('SELECT author_id FROM stories WHERE id = $1', [comment.story_id]);
    const story = storyResult.rows[0];

    if (!story || story.author_id !== userId) {
      return res.status(403).json({ error: 'Only story author can pin comments' });
    }

    // Pin the comment
    const pinTime = Math.floor(Date.now() / 1000);
    await pool.query(
      'UPDATE story_comments SET pinned = TRUE, pinned_at = $1 WHERE id = $2',
      [pinTime, storyCommentId]
    );

    res.json({ success: true, pinned: true });
  } catch (error) {
    console.error('Error pinning story comment:', error);
    res.status(500).json({ error: 'Failed to pin comment' });
  }
});

// POST /api/story-comments/:storyCommentId/unpin - Unpin a story comment (story author only)
router.post('/story/:storyCommentId/unpin', authenticateToken, async (req, res) => {
  try {
    const { storyCommentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists
    const commentResult = await pool.query(
      'SELECT id, story_id FROM story_comments WHERE id = $1',
      [storyCommentId]
    );

    const comment = commentResult.rows[0];
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is the story author
    const storyResult = await pool.query('SELECT author_id FROM stories WHERE id = $1', [comment.story_id]);
    const story = storyResult.rows[0];

    if (!story || story.author_id !== userId) {
      return res.status(403).json({ error: 'Only story author can unpin comments' });
    }

    // Unpin the comment
    await pool.query(
      'UPDATE story_comments SET pinned = FALSE, pinned_at = NULL WHERE id = $1',
      [storyCommentId]
    );

    res.json({ success: true, pinned: false });
  } catch (error) {
    console.error('Error unpinning story comment:', error);
    res.status(500).json({ error: 'Failed to unpin comment' });
  }
});

export default router;
