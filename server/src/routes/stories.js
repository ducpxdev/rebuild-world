import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database.js';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth.js';
import { uploadDb, saveUploadedFiles } from '../middleware/uploadDb.js';

const router = Router();

// GET /api/stories — browse/search
router.get('/', optionalAuth, async (req, res) => {
  const { q, genre, type, sort = 'latest', page = 1 } = req.query;
  const limit = 20;
  const offset = (Number(page) - 1) * limit;

  let where = ['s.is_published = 1'];
  const params = [];
  let paramIndex = 1;

  if (q) {
    where.push(`(s.title ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex + 1})`);
    params.push(`%${q}%`, `%${q}%`);
    paramIndex += 2;
  }
  if (genre) { where.push(`s.genre = $${paramIndex}`); params.push(genre); paramIndex++; }
  if (type) { where.push(`s.type = $${paramIndex}`); params.push(type); paramIndex++; }

  const orderMap = {
    latest: 's.updated_at DESC',
    popular: 's.views DESC',
    rated: 's.rating_avg DESC',
    oldest: 's.created_at ASC',
  };
  const order = orderMap[sort] || orderMap.latest;

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const storiesResult = await pool.query(`
      SELECT s.*, u.username as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count
      FROM stories s
      JOIN users u ON s.author_id = u.id
      ${whereClause}
      ORDER BY ${order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);
    const stories = storiesResult.rows;

    const totalResult = await pool.query(`
      SELECT COUNT(*) as count FROM stories s ${whereClause}
    `, params);
    const total = totalResult.rows[0].count;

    res.json({ stories, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error browsing stories:', error);
    res.status(500).json({ error: 'Failed to browse stories' });
  }
});

// GET /api/stories/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const storyResult = await pool.query(`
      SELECT s.*, u.username as author_name, u.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count,
        (SELECT COUNT(*) FROM bookmarks b WHERE b.story_id = s.id) as bookmark_count,
        (
          SELECT COUNT(*) FROM comments cm 
          JOIN chapters ch ON cm.chapter_id = ch.id 
          WHERE ch.story_id = s.id
        ) + (
          SELECT COUNT(*) FROM story_comments sc 
          WHERE sc.story_id = s.id
        ) as comment_count,
        COALESCE(
          SUM(
            CASE 
              WHEN c.content IS NOT NULL AND c.content != '' 
              THEN array_length(string_to_array(c.content, ' '), 1)
              ELSE 0
            END
          ), 0
        ) as total_word_count
      FROM stories s 
      LEFT JOIN users u ON s.author_id = u.id
      LEFT JOIN chapters c ON c.story_id = s.id
      WHERE s.id = $1
      GROUP BY s.id, u.id
    `, [req.params.id]);
    const story = storyResult.rows[0];

    if (!story) return res.status(404).json({ error: 'Story not found' });

    // Increment views
    await pool.query('UPDATE stories SET views = views + 1 WHERE id = $1', [story.id]);

    let user_rating = 0;
    let bookmarked = false;
    if (req.user) {
      const rResult = await pool.query('SELECT rating FROM story_ratings WHERE user_id = $1 AND story_id = $2',
        [req.user.id, story.id]);
      if (rResult.rows.length > 0) user_rating = rResult.rows[0].rating;
      
      const bmResult = await pool.query('SELECT id FROM bookmarks WHERE user_id = $1 AND story_id = $2',
        [req.user.id, story.id]);
      if (bmResult.rows.length > 0) bookmarked = true;
    }

    const chaptersResult = await pool.query(`
      SELECT id, chapter_number, title, views, created_at, volume_id FROM chapters
      WHERE story_id = $1 ORDER BY chapter_number ASC
    `, [story.id]);
    const chapters = chaptersResult.rows;

    res.json({ ...story, user_rating, bookmarked, chapters });
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

// POST /api/stories — admin only
router.post('/', authenticateToken, requireAdmin, uploadDb.single('cover'), saveUploadedFiles, async (req, res) => {
  try {
    const { title, description, type, genre, tags, status } = req.body;
    if (!title || !type) return res.status(400).json({ error: 'Title and type are required' });
    if (!['text', 'comic'].includes(type)) return res.status(400).json({ error: 'Type must be text or comic' });

    const id = uuidv4();
    const cover_url = req.file ? req.file.url : null;

    await pool.query(`
      INSERT INTO stories (id, author_id, title, description, cover_url, type, genre, tags, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, req.user.id, title, description || null, cover_url, type, genre || null, tags || null, status || 'ongoing']);

    // Notify followers
    const followersResult = await pool.query('SELECT follower_id FROM followers WHERE followed_id = $1', [req.user.id]);
    for (const f of followersResult.rows) {
      await pool.query('INSERT INTO notifications (id, user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5, $6)',
        [uuidv4(), f.follower_id, 'new_story', `New story: ${title}`, `${req.user.username} published a new story!`, `/story/${id}`]);
    }

    res.status(201).json({ id, message: 'Story created' });
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// PUT /api/stories/:id — admin only
router.put('/:id', authenticateToken, requireAdmin, uploadDb.single('cover'), saveUploadedFiles, async (req, res) => {
  try {
    const storyResult = await pool.query('SELECT * FROM stories WHERE id = $1', [req.params.id]);
    const story = storyResult.rows[0];
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const { title, description, genre, tags, status, is_published } = req.body;
    const cover_url = req.file ? req.file.url : story.cover_url;

    await pool.query(`
      UPDATE stories SET title = $1, description = $2, cover_url = $3, genre = $4, tags = $5,
      status = $6, is_published = $7, updated_at = EXTRACT(EPOCH FROM NOW()) WHERE id = $8
    `, [
      title ?? story.title,
      description ?? story.description,
      cover_url,
      genre ?? story.genre,
      tags ?? story.tags,
      status ?? story.status,
      is_published !== undefined ? Number(is_published) : story.is_published,
      story.id
    ]);

    res.json({ message: 'Story updated' });
  } catch (error) {
    console.error('Error updating story:', error);
    res.status(500).json({ error: 'Failed to update story' });
  }
});

// DELETE /api/stories/:id — admin only
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const storyResult = await pool.query('SELECT * FROM stories WHERE id = $1', [req.params.id]);
    const story = storyResult.rows[0];
    if (!story) return res.status(404).json({ error: 'Story not found' });

    await pool.query('DELETE FROM stories WHERE id = $1', [story.id]);
    res.json({ message: 'Story deleted' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// POST /api/stories/:id/rate — any authenticated user
router.post('/:id/rate', authenticateToken, async (req, res) => {
  try {
    const { rating, review_text } = req.body;
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // If review_text is provided, validate it's longer than 8 characters
    if (review_text !== undefined && review_text !== null && review_text !== '') {
      if (review_text.trim().length < 9) {
        return res.status(400).json({ error: 'Review must be longer than 8 characters' });
      }
    }

    const storyResult = await pool.query('SELECT id FROM stories WHERE id = $1', [req.params.id]);
    const story = storyResult.rows[0];
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const existingResult = await pool.query('SELECT rating FROM story_ratings WHERE user_id = $1 AND story_id = $2',
      [req.user.id, story.id]);
    const existing = existingResult.rows[0];

    if (existing) {
      await pool.query('UPDATE story_ratings SET rating = $1, review_text = $2 WHERE user_id = $3 AND story_id = $4',
        [rating, review_text || '', req.user.id, story.id]);
    } else {
      await pool.query('INSERT INTO story_ratings (user_id, story_id, rating, review_text) VALUES ($1, $2, $3, $4)',
        [req.user.id, story.id, rating, review_text || '']);
    }

    // Recalculate average
    const statsResult = await pool.query('SELECT AVG(rating) as avg, COUNT(*) as count FROM story_ratings WHERE story_id = $1', [story.id]);
    const stats = statsResult.rows[0];
    await pool.query('UPDATE stories SET rating_avg = $1, rating_count = $2 WHERE id = $3',
      [Math.round(stats.avg * 10) / 10, stats.count, story.id]);

    res.json({ rating_avg: Math.round(stats.avg * 10) / 10, rating_count: stats.count, user_rating: rating });
  } catch (error) {
    console.error('Error rating story:', error);
    res.status(500).json({ error: 'Failed to rate story' });
  }
});

// POST /api/stories/:id/bookmark
router.post('/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const storyResult = await pool.query('SELECT id FROM stories WHERE id = $1', [req.params.id]);
    const story = storyResult.rows[0];
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const existingResult = await pool.query('SELECT id FROM bookmarks WHERE user_id = $1 AND story_id = $2',
      [req.user.id, story.id]);
    const existing = existingResult.rows[0];

    if (existing) {
      await pool.query('DELETE FROM bookmarks WHERE user_id = $1 AND story_id = $2', [req.user.id, story.id]);
      return res.json({ bookmarked: false });
    } else {
      await pool.query('INSERT INTO bookmarks (id, user_id, story_id) VALUES ($1, $2, $3)',
        [uuidv4(), req.user.id, story.id]);
      return res.json({ bookmarked: true });
    }
  } catch (error) {
    console.error('Error updating bookmark:', error);
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

// GET /api/stories/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sc.*, u.username, u.avatar_url
      FROM story_comments sc
      JOIN users u ON sc.user_id = u.id
      WHERE sc.story_id = $1
      ORDER BY sc.created_at DESC
    `, [req.params.id]);

    res.json({ comments: result.rows });
  } catch (error) {
    console.error('Error fetching story comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/stories/:id/comments
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    // Verify story exists
    const storyResult = await pool.query('SELECT id FROM stories WHERE id = $1', [id]);
    if (storyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const commentId = uuidv4();
    await pool.query(
      'INSERT INTO story_comments (id, story_id, user_id, content) VALUES ($1, $2, $3, $4)',
      [commentId, id, req.user.id, content.trim()]
    );

    const commentResult = await pool.query(`
      SELECT sc.*, u.username, u.avatar_url
      FROM story_comments sc
      JOIN users u ON sc.user_id = u.id
      WHERE sc.id = $1
    `, [commentId]);

    res.status(201).json(commentResult.rows[0]);
  } catch (error) {
    console.error('Error creating story comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// GET /api/stories/:id/reviews — get all reviews for a story
router.get('/:id/reviews', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sr.rating, sr.review_text, sr.created_at, u.username, u.avatar_url
      FROM story_ratings sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.story_id = $1 AND sr.review_text != ''
      ORDER BY sr.created_at DESC
    `, [req.params.id]);

    res.json({ reviews: result.rows });
  } catch (error) {
    console.error('Error fetching story reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// PATCH /api/stories/:id/notes — update additional notes (author/admin only)
router.patch('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { additional_notes } = req.body;

    // Verify story exists and user is author or admin
    const storyResult = await pool.query('SELECT author_id FROM stories WHERE id = $1', [id]);
    const story = storyResult.rows[0];
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (story.author_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Only the author or admin can update notes' });
    }

    await pool.query(
      'UPDATE stories SET additional_notes = $1 WHERE id = $2',
      [additional_notes || '', id]
    );

    res.json({ message: 'Notes updated', additional_notes: additional_notes || '' });
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

export default router;
