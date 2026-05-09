import { Router } from 'express';
import { pool } from '../database.js';

const router = Router();

// GET /api/images/:imageId - Serve image from database
router.get('/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    const result = await pool.query(
      'SELECT mimetype, data FROM images WHERE id = $1',
      [imageId]
    );
    
    if (!result.rows.length) {
      console.log('[Images GET] Image not found:', imageId);
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const image = result.rows[0];
    
    // Set appropriate content type
    res.setHeader('Content-Type', image.mimetype);
    // Cache images for 1 year (they're immutable by ID)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // Allow CORS access
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    console.log('[Images GET] Serving image:', imageId);
    res.send(image.data);
  } catch (error) {
    console.error('[Images GET] Error:', error);
    res.status(500).json({ error: 'Failed to retrieve image' });
  }
});

export default router;
