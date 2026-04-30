import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router({ mergeParams: true });

// GET /api/stories/:storyId/chapters/:number
router.get('/:number', optionalAuth, (req, res) => {
  const chapter = db.prepare(`
    SELECT ch.*, s.type, s.author_id, s.title as story_title
    FROM chapters ch JOIN stories s ON ch.story_id = s.id
    WHERE ch.story_id = ? AND ch.chapter_number = ?
  `).get(req.params.storyId, Number(req.params.number));

  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

  db.prepare('UPDATE chapters SET views = views + 1 WHERE id = ?').run(chapter.id);

  const prev = db.prepare('SELECT chapter_number FROM chapters WHERE story_id = ? AND chapter_number < ? ORDER BY chapter_number DESC LIMIT 1')
    .get(req.params.storyId, chapter.chapter_number);
  const next = db.prepare('SELECT chapter_number FROM chapters WHERE story_id = ? AND chapter_number > ? ORDER BY chapter_number ASC LIMIT 1')
    .get(req.params.storyId, chapter.chapter_number);

  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar_url FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.chapter_id = ? ORDER BY c.created_at ASC
  `).all(chapter.id);

  res.json({ ...chapter, prev: prev?.chapter_number ?? null, next: next?.chapter_number ?? null, comments });
});

// POST /api/stories/:storyId/chapters — admin only
router.post('/', authenticateToken, requireAdmin, upload.array('images', 50), (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.storyId);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  const { title, content } = req.body;

  const last = db.prepare('SELECT MAX(chapter_number) as max FROM chapters WHERE story_id = ?').get(story.id);
  const chapter_number = (last?.max ?? 0) + 1;

  const images = req.files?.length
    ? JSON.stringify(req.files.map(f => `/uploads/${f.filename}`))
    : null;

  if (story.type === 'text' && !content) {
    return res.status(400).json({ error: 'Content is required for text chapters' });
  }
  if (story.type === 'comic' && !images) {
    return res.status(400).json({ error: 'At least one image is required for comic chapters' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO chapters (id, story_id, chapter_number, title, content, images)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, story.id, chapter_number, title || `Chapter ${chapter_number}`, content || null, images);

  db.prepare("UPDATE stories SET updated_at = strftime('%s','now') WHERE id = ?").run(story.id);

  res.status(201).json({ id, chapter_number, message: 'Chapter created' });
});

// PUT /api/stories/:storyId/chapters/:number — admin only
router.put('/:number', authenticateToken, requireAdmin, upload.array('images', 50), (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.storyId);
  if (!story) return res.status(403).json({ error: 'Forbidden' });

  const chapter = db.prepare('SELECT * FROM chapters WHERE story_id = ? AND chapter_number = ?')
    .get(story.id, Number(req.params.number));
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

  const { title, content } = req.body;
  const images = req.files?.length
    ? JSON.stringify(req.files.map(f => `/uploads/${f.filename}`))
    : chapter.images;

  db.prepare('UPDATE chapters SET title = ?, content = ?, images = ? WHERE id = ?')
    .run(title ?? chapter.title, content ?? chapter.content, images, chapter.id);

  res.json({ message: 'Chapter updated' });
});

// DELETE /api/stories/:storyId/chapters/:number — admin only
router.delete('/:number', authenticateToken, requireAdmin, (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.storyId);
  if (!story) return res.status(403).json({ error: 'Forbidden' });

  const chapter = db.prepare('SELECT * FROM chapters WHERE story_id = ? AND chapter_number = ?')
    .get(story.id, Number(req.params.number));
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

  db.prepare('DELETE FROM chapters WHERE id = ?').run(chapter.id);
  res.json({ message: 'Chapter deleted' });
});

// POST /api/stories/:storyId/chapters/:number/comments
router.post('/:number/comments', authenticateToken, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

  const chapter = db.prepare('SELECT id FROM chapters WHERE story_id = ? AND chapter_number = ?')
    .get(req.params.storyId, Number(req.params.number));
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

  const id = uuidv4();
  db.prepare('INSERT INTO comments (id, chapter_id, user_id, content) VALUES (?, ?, ?, ?)')
    .run(id, chapter.id, req.user.id, content.trim());

  const comment = db.prepare(`
    SELECT c.*, u.username, u.avatar_url FROM comments c
    JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(id);

  res.status(201).json(comment);
});

export default router;
