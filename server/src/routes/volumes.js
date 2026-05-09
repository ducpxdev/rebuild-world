import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadDb, saveUploadedFiles } from '../middleware/uploadDb.js';

const router = Router();

// GET volumes for a story
router.get('/:storyId/volumes', async (req, res) => {
  try {
    const { storyId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM volumes WHERE story_id = $1 ORDER BY volume_number ASC',
      [storyId]
    );
    
    res.json({ volumes: result.rows });
  } catch (error) {
    console.error('Error fetching volumes:', error);
    res.status(500).json({ error: 'Failed to fetch volumes' });
  }
});

// GET single volume with its chapters
router.get('/:storyId/volumes/:volumeId', async (req, res) => {
  try {
    const { storyId, volumeId } = req.params;
    
    const volumeResult = await pool.query(
      'SELECT * FROM volumes WHERE id = $1 AND story_id = $2',
      [volumeId, storyId]
    );
    
    if (volumeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Volume not found' });
    }
    
    const volume = volumeResult.rows[0];
    
    const chaptersResult = await pool.query(
      'SELECT * FROM chapters WHERE volume_id = $1 ORDER BY chapter_number ASC',
      [volumeId]
    );
    
    res.json({ volume, chapters: chaptersResult.rows });
  } catch (error) {
    console.error('Error fetching volume:', error);
    res.status(500).json({ error: 'Failed to fetch volume' });
  }
});

// POST create volume
router.post('/:storyId/volumes', authenticateToken, uploadDb.single('cover'), saveUploadedFiles, async (req, res) => {
  try {
    const { storyId } = req.params;
    const { title, description, volume_number } = req.body;

    console.log('[Volume Create] User:', req.user.id, 'Story:', storyId);
    console.log('[Volume Create] File object:', req.file ? { fieldname: req.file.fieldname, filename: req.file.filename, path: req.file.path, size: req.file.size } : 'NO FILE');
    console.log('[Volume Create] Volume data:', { title, description, volume_number });

    // Verify user owns the story
    const storyResult = await pool.query('SELECT author_id FROM stories WHERE id = $1', [storyId]);
    if (storyResult.rows.length === 0 || storyResult.rows[0].author_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const volumeId = uuidv4();
    const cover_url = req.file ? req.file.url : null;
    
    console.log('[Volume Create] Generated cover_url:', cover_url);

    await pool.query(
      `INSERT INTO volumes (id, story_id, volume_number, title, description, cover_url) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [volumeId, storyId, volume_number, title, description, cover_url]
    );

    console.log('[Volume Create] ✓ Success - Volume:', volumeId, 'Cover URL:', cover_url);
    res.status(201).json({ id: volumeId, cover_url, message: 'Volume created successfully' });
  } catch (error) {
    console.error('[Volume Create] ✗ Error:', error.message);
    console.error('[Volume Create] Error details:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Volume number already exists for this story' });
    }
    res.status(500).json({ error: 'Failed to create volume' });
  }
});

// PUT update volume
router.put('/:storyId/volumes/:volumeId', authenticateToken, uploadDb.single('cover'), saveUploadedFiles, async (req, res) => {
  try {
    const { storyId, volumeId } = req.params;
    const { title, description } = req.body;

    console.log('[Volume Update] File uploaded:', req.file?.filename);
    console.log('[Volume Update] Volume data:', { title, description });

    // Verify user owns the story
    const storyResult = await pool.query('SELECT author_id FROM stories WHERE id = $1', [storyId]);
    if (storyResult.rows.length === 0 || storyResult.rows[0].author_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const cover_url = req.file ? req.file.url : undefined;
    
    console.log('[Volume Update] Cover URL:', cover_url);

    if (cover_url) {
      console.log('[Volume Update] Updating with new cover image');
      await pool.query(
        'UPDATE volumes SET title = $1, description = $2, cover_url = $3, updated_at = EXTRACT(epoch FROM NOW()) WHERE id = $4 AND story_id = $5',
        [title, description, cover_url, volumeId, storyId]
      );
    } else {
      console.log('[Volume Update] Updating without changing cover image');
      await pool.query(
        'UPDATE volumes SET title = $1, description = $2, updated_at = EXTRACT(epoch FROM NOW()) WHERE id = $3 AND story_id = $4',
        [title, description, volumeId, storyId]
      );
    }

    // Fetch updated volume to return cover_url
    const updatedVolume = await pool.query('SELECT * FROM volumes WHERE id = $1', [volumeId]);
    console.log('[Volume Update] Volume updated:', volumeId, 'cover_url:', updatedVolume.rows[0]?.cover_url);

    res.json({ ...updatedVolume.rows[0], message: 'Volume updated successfully' });
  } catch (error) {
    console.error('Error updating volume:', error);
    res.status(500).json({ error: 'Failed to update volume' });
  }
});

// DELETE volume
router.delete('/:storyId/volumes/:volumeId', authenticateToken, async (req, res) => {
  try {
    const { storyId, volumeId } = req.params;

    // Verify user owns the story
    const storyResult = await pool.query('SELECT author_id FROM stories WHERE id = $1', [storyId]);
    if (storyResult.rows.length === 0 || storyResult.rows[0].author_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query('DELETE FROM volumes WHERE id = $1 AND story_id = $2', [volumeId, storyId]);
    res.json({ message: 'Volume deleted successfully' });
  } catch (error) {
    console.error('Error deleting volume:', error);
    res.status(500).json({ error: 'Failed to delete volume' });
  }
});

export default router;
