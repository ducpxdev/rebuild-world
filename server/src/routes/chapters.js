import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database.js';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router({ mergeParams: true });

// GET /api/stories/:storyId/chapters/:number
router.get('/:number', optionalAuth, async (req, res) => {
  try {
    const chapterResult = await pool.query(`
      SELECT ch.*, s.type, s.author_id, s.title as story_title
      FROM chapters ch JOIN stories s ON ch.story_id = s.id
      WHERE ch.story_id = $1 AND ch.chapter_number = $2
    `, [req.params.storyId, Number(req.params.number)]);
    const chapter = chapterResult.rows[0];

    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    await pool.query('UPDATE chapters SET views = views + 1 WHERE id = $1', [chapter.id]);

    const prevResult = await pool.query('SELECT chapter_number FROM chapters WHERE story_id = $1 AND chapter_number < $2 ORDER BY chapter_number DESC LIMIT 1',
      [req.params.storyId, chapter.chapter_number]);
    const prev = prevResult.rows[0];
    
    const nextResult = await pool.query('SELECT chapter_number FROM chapters WHERE story_id = $1 AND chapter_number > $2 ORDER BY chapter_number ASC LIMIT 1',
      [req.params.storyId, chapter.chapter_number]);
    const next = nextResult.rows[0];

    const commentsResult = await pool.query(`
      SELECT c.*, u.username, u.avatar_url FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.chapter_id = $1 ORDER BY c.created_at ASC
    `, [chapter.id]);
    const comments = commentsResult.rows;

    res.json({ ...chapter, prev: prev?.chapter_number ?? null, next: next?.chapter_number ?? null, comments });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({ error: 'Failed to fetch chapter' });
  }
});

// POST /api/stories/:storyId/chapters — author or admin
router.post('/', authenticateToken, upload.array('images', 50), async (req, res) => {
  try {
    console.log('[Chapter Create] User:', req.user.id, 'Story:', req.params.storyId);
    console.log('[Chapter Create] Body:', { title: req.body.title, content: req.body.content?.substring(0, 50), volume_id: req.body.volume_id });
    console.log('[Chapter Create] Files:', req.files?.length || 0);

    const storyResult = await pool.query('SELECT * FROM stories WHERE id = $1', [req.params.storyId]);
    const story = storyResult.rows[0];
    if (!story) {
      console.log('[Chapter Create] Story not found');
      return res.status(404).json({ error: 'Story not found' });
    }

    // Check if user is author or admin
    if (story.author_id !== req.user.id && !req.user.is_admin) {
      console.log('[Chapter Create] Permission denied. Story author:', story.author_id, 'Req user:', req.user.id, 'Is admin:', req.user.is_admin);
      return res.status(403).json({ error: 'Only the story author or admin can create chapters' });
    }

    const { title, content, volume_id } = req.body;

    const lastResult = await pool.query('SELECT MAX(chapter_number) as max FROM chapters WHERE story_id = $1', [story.id]);
    const chapter_number = (lastResult.rows[0]?.max ?? 0) + 1;

    const images = req.files?.length
      ? JSON.stringify(req.files.map(f => `/uploads/${f.filename}`))
      : null;

    if (story.type === 'text' && !content) {
      console.log('[Chapter Create] Text chapter without content');
      return res.status(400).json({ error: 'Content is required for text chapters' });
    }
    if (story.type === 'comic' && !images) {
      console.log('[Chapter Create] Comic chapter without images');
      return res.status(400).json({ error: 'At least one image is required for comic chapters' });
    }

    const id = uuidv4();
    console.log('[Chapter Create] Inserting chapter:', { id, story_id: story.id, volume_id, chapter_number, title });
    
    await pool.query(`
      INSERT INTO chapters (id, story_id, volume_id, chapter_number, title, content, images)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, story.id, volume_id || null, chapter_number, title || `Chapter ${chapter_number}`, content || null, images]);

    await pool.query("UPDATE stories SET updated_at = EXTRACT(EPOCH FROM NOW()) WHERE id = $1", [story.id]);

    console.log('[Chapter Create] Success:', id);
    res.status(201).json({ id, chapter_number, message: 'Chapter created' });
  } catch (error) {
    console.error('[Chapter Create] Error:', error.message, error.detail || '');
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

// PUT /api/stories/:storyId/chapters/:number — admin only
router.put('/:number', authenticateToken, requireAdmin, upload.array('images', 50), async (req, res) => {
  try {
    const storyResult = await pool.query('SELECT * FROM stories WHERE id = $1', [req.params.storyId]);
    const story = storyResult.rows[0];
    if (!story) return res.status(403).json({ error: 'Forbidden' });

    const chapterResult = await pool.query('SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = $2',
      [story.id, Number(req.params.number)]);
    const chapter = chapterResult.rows[0];
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    const { title, content } = req.body;
    const images = req.files?.length
      ? JSON.stringify(req.files.map(f => `/uploads/${f.filename}`))
      : chapter.images;

    await pool.query('UPDATE chapters SET title = $1, content = $2, images = $3 WHERE id = $4',
      [title ?? chapter.title, content ?? chapter.content, images, chapter.id]);

    res.json({ message: 'Chapter updated' });
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// DELETE /api/stories/:storyId/chapters/:number — admin only
router.delete('/:number', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const storyResult = await pool.query('SELECT * FROM stories WHERE id = $1', [req.params.storyId]);
    const story = storyResult.rows[0];
    if (!story) return res.status(403).json({ error: 'Forbidden' });

    const chapterResult = await pool.query('SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = $2',
      [story.id, Number(req.params.number)]);
    const chapter = chapterResult.rows[0];
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    await pool.query('DELETE FROM chapters WHERE id = $1', [chapter.id]);
    res.json({ message: 'Chapter deleted' });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

// POST /api/stories/:storyId/chapters/:number/comments
router.post('/:number/comments', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

    const chapterResult = await pool.query('SELECT id FROM chapters WHERE story_id = $1 AND chapter_number = $2',
      [req.params.storyId, Number(req.params.number)]);
    const chapter = chapterResult.rows[0];
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    const id = uuidv4();
    await pool.query('INSERT INTO comments (id, chapter_id, user_id, content) VALUES ($1, $2, $3, $4)',
      [id, chapter.id, req.user.id, content.trim()]);

    const commentResult = await pool.query(`
      SELECT c.*, u.username, u.avatar_url FROM comments c
      JOIN users u ON c.user_id = u.id WHERE c.id = $1
    `, [id]);
    const comment = commentResult.rows[0];

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

export default router;
