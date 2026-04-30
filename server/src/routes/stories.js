import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// GET /api/stories — browse/search
router.get('/', optionalAuth, (req, res) => {
  const { q, genre, type, sort = 'latest', page = 1 } = req.query;
  const limit = 20;
  const offset = (Number(page) - 1) * limit;

  let where = ['s.is_published = 1'];
  const params = [];

  if (q) {
    where.push('(s.title LIKE ? OR s.description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (genre) { where.push('s.genre = ?'); params.push(genre); }
  if (type) { where.push('s.type = ?'); params.push(type); }

  const orderMap = {
    latest: 's.updated_at DESC',
    popular: 's.views DESC',
    rated: 's.rating_avg DESC',
    oldest: 's.created_at ASC',
  };
  const order = orderMap[sort] || orderMap.latest;

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const stories = db.prepare(`
    SELECT s.*, u.username as author_name, u.avatar_url as author_avatar,
      (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count
    FROM stories s
    JOIN users u ON s.author_id = u.id
    ${whereClause}
    ORDER BY ${order}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM stories s ${whereClause}
  `).get(...params);

  res.json({ stories, total: total.count, page: Number(page), pages: Math.ceil(total.count / limit) });
});

// GET /api/stories/:id
router.get('/:id', optionalAuth, (req, res) => {
  const story = db.prepare(`
    SELECT s.*, u.username as author_name, u.avatar_url as author_avatar,
      (SELECT COUNT(*) FROM chapters c WHERE c.story_id = s.id) as chapter_count,
      (SELECT COUNT(*) FROM bookmarks b WHERE b.story_id = s.id) as bookmark_count,
      (SELECT COUNT(*) FROM comments cm JOIN chapters ch ON cm.chapter_id = ch.id WHERE ch.story_id = s.id) as comment_count
    FROM stories s JOIN users u ON s.author_id = u.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!story) return res.status(404).json({ error: 'Story not found' });

  // Increment views
  db.prepare('UPDATE stories SET views = views + 1 WHERE id = ?').run(story.id);

  let user_rating = 0;
  let bookmarked = false;
  if (req.user) {
    const r = db.prepare('SELECT rating FROM story_ratings WHERE user_id = ? AND story_id = ?')
      .get(req.user.id, story.id);
    if (r) user_rating = r.rating;
    const bm = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND story_id = ?')
      .get(req.user.id, story.id);
    if (bm) bookmarked = true;
  }

  const chapters = db.prepare(`
    SELECT id, chapter_number, title, views, created_at FROM chapters
    WHERE story_id = ? ORDER BY chapter_number ASC
  `).all(story.id);

  res.json({ ...story, user_rating, bookmarked, chapters });
});

// POST /api/stories — admin only
router.post('/', authenticateToken, requireAdmin, upload.single('cover'), (req, res) => {
  const { title, description, type, genre, tags, status } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'Title and type are required' });
  if (!['text', 'comic'].includes(type)) return res.status(400).json({ error: 'Type must be text or comic' });

  const id = uuidv4();
  const cover_url = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO stories (id, author_id, title, description, cover_url, type, genre, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, title, description || null, cover_url, type, genre || null, tags || null, status || 'ongoing');

  // Notify followers
  const followers = db.prepare('SELECT follower_id FROM followers WHERE followed_id = ?').all(req.user.id);
  for (const f of followers) {
    db.prepare('INSERT INTO notifications (id, user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), f.follower_id, 'new_story', `New story: ${title}`, `${req.user.username} published a new story!`, `/story/${id}`);
  }

  res.status(201).json({ id, message: 'Story created' });
});

// PUT /api/stories/:id — admin only
router.put('/:id', authenticateToken, requireAdmin, upload.single('cover'), (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  const { title, description, genre, tags, status, is_published } = req.body;
  const cover_url = req.file ? `/uploads/${req.file.filename}` : story.cover_url;

  db.prepare(`
    UPDATE stories SET title = ?, description = ?, cover_url = ?, genre = ?, tags = ?,
    status = ?, is_published = ?, updated_at = strftime('%s','now') WHERE id = ?
  `).run(
    title ?? story.title,
    description ?? story.description,
    cover_url,
    genre ?? story.genre,
    tags ?? story.tags,
    status ?? story.status,
    is_published !== undefined ? Number(is_published) : story.is_published,
    story.id
  );

  res.json({ message: 'Story updated' });
});

// DELETE /api/stories/:id — admin only
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  db.prepare('DELETE FROM stories WHERE id = ?').run(story.id);
  res.json({ message: 'Story deleted' });
});

// POST /api/stories/:id/rate — any authenticated user
router.post('/:id/rate', authenticateToken, (req, res) => {
  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
  }

  const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  const existing = db.prepare('SELECT rating FROM story_ratings WHERE user_id = ? AND story_id = ?')
    .get(req.user.id, story.id);

  if (existing) {
    db.prepare('UPDATE story_ratings SET rating = ? WHERE user_id = ? AND story_id = ?')
      .run(rating, req.user.id, story.id);
  } else {
    db.prepare('INSERT INTO story_ratings (user_id, story_id, rating) VALUES (?, ?, ?)')
      .run(req.user.id, story.id, rating);
  }

  // Recalculate average
  const stats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM story_ratings WHERE story_id = ?').get(story.id);
  db.prepare('UPDATE stories SET rating_avg = ?, rating_count = ? WHERE id = ?')
    .run(Math.round(stats.avg * 10) / 10, stats.count, story.id);

  res.json({ rating_avg: Math.round(stats.avg * 10) / 10, rating_count: stats.count, user_rating: rating });
});

// POST /api/stories/:id/bookmark
router.post('/:id/bookmark', authenticateToken, (req, res) => {
  const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  const existing = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? AND story_id = ?')
    .get(req.user.id, story.id);

  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND story_id = ?').run(req.user.id, story.id);
    return res.json({ bookmarked: false });
  } else {
    db.prepare('INSERT INTO bookmarks (id, user_id, story_id) VALUES (?, ?, ?)')
      .run(uuidv4(), req.user.id, story.id);
    return res.json({ bookmarked: true });
  }
});

export default router;
