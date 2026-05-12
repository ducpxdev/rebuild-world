import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database.js';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth.js';
import { uploadDb, saveUploadedFiles } from '../middleware/uploadDb.js';
import { sendChapterUpdateEmail } from '../mailer.js';

const router = Router({ mergeParams: true });

// GET /api/stories/:storyId/chapters/:number
router.get('/:number', optionalAuth, async (req, res) => {
  try {
    const chapterNumber = parseInt(req.params.number, 10);
    
    if (isNaN(chapterNumber)) {
      return res.status(400).json({ error: 'Invalid chapter number' });
    }

    const chapterResult = await pool.query(`
      SELECT ch.*, s.type, s.author_id, s.title as story_title
      FROM chapters ch JOIN stories s ON ch.story_id = s.id
      WHERE ch.story_id = $1 AND ch.chapter_number = $2
    `, [req.params.storyId, chapterNumber]);
    const chapter = chapterResult.rows[0];

    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    // Increment views
    await pool.query('UPDATE chapters SET views = views + 1 WHERE id = $1', [chapter.id]);

    // Get previous chapter (based on chapter_number sequence)
    const prevResult = await pool.query(`
      SELECT chapter_number FROM chapters 
      WHERE story_id = $1 AND chapter_number < $2 
      ORDER BY chapter_number DESC LIMIT 1
    `, [req.params.storyId, chapter.chapter_number]);
    
    // Get next chapter (based on chapter_number sequence)
    const nextResult = await pool.query(`
      SELECT chapter_number FROM chapters 
      WHERE story_id = $1 AND chapter_number > $2 
      ORDER BY chapter_number ASC LIMIT 1
    `, [req.params.storyId, chapter.chapter_number]);

    // Fetch comments
    const commentsResult = await pool.query(`
      SELECT c.*, u.username, u.avatar_url FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.chapter_id = $1 ORDER BY c.created_at ASC
    `, [chapter.id]);
    const comments = commentsResult.rows;
    const commentCount = comments.length;

    // Extract chapter numbers safely
    const prevChapterNumber = prevResult.rows.length > 0 ? prevResult.rows[0].chapter_number : null;
    const nextChapterNumber = nextResult.rows.length > 0 ? nextResult.rows[0].chapter_number : null;

    console.log('[Chapter GET] Chapter:', chapter.chapter_number, 'Prev:', prevChapterNumber, 'Next:', nextChapterNumber);

    res.json({ 
      ...chapter, 
      prev: prevChapterNumber, 
      next: nextChapterNumber, 
      comments, 
      commentCount 
    });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({ error: 'Failed to fetch chapter' });
  }
});

// POST /api/stories/:storyId/chapters — author or admin
// Use uploadDb.any() to handle both 'images' and 'text_images' fields with database storage
router.post('/', authenticateToken, uploadDb.any(), saveUploadedFiles, async (req, res) => {
  try {
    console.log('[Chapter Create] User:', req.user.id, 'Story:', req.params.storyId);
    console.log('[Chapter Create] Content-Type:', req.headers['content-type']);
    console.log('[Chapter Create] req.body keys:', Object.keys(req.body));
    console.log('[Chapter Create] req.body:', req.body);
    console.log('[Chapter Create] req.files count:', req.files?.length || 0);
    console.log('[Chapter Create] Files:', req.files?.map(f => ({ fieldname: f.fieldname, filename: f.filename })) || []);

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

    let { title, content, volume_id } = req.body;
    
    // Ensure title is a string (trim whitespace)
    title = (title || '').trim();
    
    // Ensure content is a string if provided
    if (content) {
      content = (content || '').trim();
    }

    console.log('[Chapter Create] Parsed body:', { title, content: content?.substring(0, 30), volume_id });

    const lastResult = await pool.query('SELECT MAX(chapter_number) as max FROM chapters WHERE story_id = $1', [story.id]);
    const chapter_number = (lastResult.rows[0]?.max ?? 0) + 1;

    // Handle comic images (main content) - fieldname: 'images'
    const comicImages = req.files
      ?.filter(f => f.fieldname === 'images')
      .map(f => `/uploads/${f.filename}`);
    const images = comicImages?.length 
      ? JSON.stringify(comicImages)
      : null;

    // Handle text chapter embedded images - fieldname: 'text_images'
    let finalContent = content;
    const textImages = req.files?.filter(f => f.fieldname === 'text_images');
    if (textImages && textImages.length > 0 && story.type === 'text') {
      console.log('[Chapter Create] Processing', textImages.length, 'text images');
      // Create a map of database-backed image URLs
      const imageUrls = textImages.map(f => f.url);
      
      // Replace markdown image placeholders with actual database-backed URLs
      // The frontend inserts ![image-N](blob:...) syntax, we replace it with /api/images/{id} URLs
      let imageIndex = 0;
      finalContent = finalContent.replace(/!\[image-\d+]\([^)]*\)/g, () => {
        if (imageIndex < imageUrls.length) {
          return `![image-${imageIndex + 1}](${imageUrls[imageIndex++]})`;
        }
        return '';
      });
      
      // Strip any remaining external/non-database URLs from content
      // Only allow /api/images/ URLs for security and consistency
      finalContent = finalContent.replace(/!\[([^\]]*)]\((?!\/)([^)]+)\)/g, ''); // Remove external URLs
      
      console.log('[Chapter Create] Replaced image URLs in content, stripped external URLs');
    } else if (story.type === 'text' && content) {
      // Even without new uploads, strip any external URLs from content for security
      finalContent = content.replace(/!\[([^\]]*)]\((?!\/)([^)]+)\)/g, '');
      console.log('[Chapter Create] Stripped external URLs from content');
    }

    // Validation - title is always required
    if (!title || !title.trim()) {
      console.log('[Chapter Create] Missing title');
      return res.status(400).json({ error: 'Chapter title is required' });
    }

    if (story.type === 'text') {
      if (!finalContent) {
        console.log('[Chapter Create] Text chapter without content');
        return res.status(400).json({ error: 'Content is required for text chapters' });
      }
    }
    
    if (story.type === 'comic') {
      if (!images) {
        console.log('[Chapter Create] Comic chapter without images');
        return res.status(400).json({ error: 'At least one image is required for comic chapters' });
      }
    }

    const id = uuidv4();
    console.log('[Chapter Create] Inserting chapter:', { id, story_id: story.id, volume_id, chapter_number, title });
    
    await pool.query(`
      INSERT INTO chapters (id, story_id, volume_id, chapter_number, title, content, images)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, story.id, volume_id || null, chapter_number, title.trim(), finalContent || null, images]);

    await pool.query("UPDATE stories SET updated_at = EXTRACT(EPOCH FROM NOW()) WHERE id = $1", [story.id]);

    // Notify users who bookmarked this story
    try {
      const bookmarksResult = await pool.query(
        'SELECT DISTINCT b.user_id, u.email FROM bookmarks b JOIN users u ON b.user_id = u.id WHERE b.story_id = $1',
        [story.id]
      );
      
      for (const bookmark of bookmarksResult.rows) {
        // Create in-app notification
        await pool.query(
          'INSERT INTO notifications (id, user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5, $6)',
          [uuidv4(), bookmark.user_id, 'new_chapter', `New chapter in "${story.title}"`, 
            `The series '${story.title}' has been updated with chapter '${title.trim()}'`, `/story/${story.id}`]
        );
        
        // Send email notification (with error handling)
        try {
          await sendChapterUpdateEmail(bookmark.email, story.title, title.trim(), story.id);
        } catch (emailError) {
          console.error('[Chapter Create] Failed to send email to', bookmark.email, ':', emailError.message);
          // Continue with other notifications even if email fails
        }
      }
      
      console.log('[Chapter Create] Notifications sent to', bookmarksResult.rows.length, 'users');
    } catch (notificationError) {
      console.error('[Chapter Create] Error sending notifications:', notificationError);
      // Don't fail the chapter creation if notifications fail
    }

    console.log('[Chapter Create] Success:', id);
    res.status(201).json({ id, chapter_number, message: 'Chapter created' });
  } catch (error) {
    console.error('[Chapter Create] Database/Error:', error.code, error.message, error.detail || '');
    console.error('[Chapter Create] Full error:', error);
    
    // Return more specific error messages
    if (error.code === '23503') {
      // Foreign key violation
      return res.status(400).json({ error: 'Invalid story or volume reference' });
    }
    if (error.code === '23505') {
      // Unique constraint violation  
      return res.status(400).json({ error: 'This chapter already exists' });
    }
    
    res.status(500).json({ error: error.message || 'Failed to create chapter' });
  }
});

// PUT /api/stories/:storyId/chapters/:number — admin only
router.put('/:number', authenticateToken, requireAdmin, uploadDb.any(), saveUploadedFiles, async (req, res) => {
  try {
    const chapterNumber = parseInt(req.params.number, 10);
    
    if (isNaN(chapterNumber)) {
      return res.status(400).json({ error: 'Invalid chapter number' });
    }

    const storyResult = await pool.query('SELECT * FROM stories WHERE id = $1', [req.params.storyId]);
    const story = storyResult.rows[0];
    if (!story) return res.status(403).json({ error: 'Forbidden' });

    const chapterResult = await pool.query('SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = $2',
      [story.id, chapterNumber]);
    const chapter = chapterResult.rows[0];
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    let { title, content } = req.body;
    
    // Title is always required for updates
    if (!title || !title.toString().trim()) {
      console.log('[Chapter Update] Missing title');
      return res.status(400).json({ error: 'Chapter title is required' });
    }
    title = title.trim();
    
    // Content is optional (user might only update title)
    content = content ?? chapter.content;
    if (content) content = (content || '').trim();

    // Handle comic images (main content) - fieldname: 'images'
    const comicImages = req.files
      ?.filter(f => f.fieldname === 'images')
      .map(f => f.url);
    const images = comicImages?.length 
      ? JSON.stringify(comicImages)
      : chapter.images;

    // Handle text chapter embedded images - fieldname: 'text_images'
    let finalContent = content;
    const textImages = req.files?.filter(f => f.fieldname === 'text_images');
    if (textImages && textImages.length > 0 && story.type === 'text') {
      console.log('[Chapter Update] Processing', textImages.length, 'text images');
      // Create a map of database-backed image URLs
      const imageUrls = textImages.map(f => f.url);
      
      // Replace markdown image placeholders with actual database-backed URLs
      let imageIndex = 0;
      finalContent = finalContent.replace(/!\[image-\d+]\([^)]*\)/g, () => {
        if (imageIndex < imageUrls.length) {
          return `![image-${imageIndex + 1}](${imageUrls[imageIndex++]})`;
        }
        return '';
      });
      
      // Strip any remaining external/non-database URLs from content
      finalContent = finalContent.replace(/!\[([^\]]*)]\((?!\/)([^)]+)\)/g, '');
      
      console.log('[Chapter Update] Replaced image URLs in content, stripped external URLs');
    } else if (story.type === 'text' && content) {
      // Even without new uploads, strip any external URLs from content for security
      finalContent = content.replace(/!\[([^\]]*)]\((?!\/)([^)]+)\)/g, '');
      console.log('[Chapter Update] Stripped external URLs from content');
    }

    await pool.query(`UPDATE chapters SET title = $1, content = $2, images = $3, updated_at = EXTRACT(EPOCH FROM NOW()) WHERE id = $4`,
      [title, finalContent || chapter.content, images, chapter.id]);

    res.json({ message: 'Chapter updated' });
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// DELETE /api/stories/:storyId/chapters/:number — admin only
router.delete('/:number', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const chapterNumber = parseInt(req.params.number, 10);
    
    if (isNaN(chapterNumber)) {
      return res.status(400).json({ error: 'Invalid chapter number' });
    }

    const storyResult = await pool.query('SELECT * FROM stories WHERE id = $1', [req.params.storyId]);
    const story = storyResult.rows[0];
    if (!story) return res.status(403).json({ error: 'Forbidden' });

    const chapterResult = await pool.query('SELECT * FROM chapters WHERE story_id = $1 AND chapter_number = $2',
      [story.id, chapterNumber]);
    const chapter = chapterResult.rows[0];
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    await pool.query('DELETE FROM chapters WHERE id = $1', [chapter.id]);
    res.json({ message: 'Chapter deleted' });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

// GET /api/stories/:storyId/chapters/:number/latest-comments — Get 7 most recent comments for this chapter
router.get('/:number/latest-comments', async (req, res) => {
  try {
    const chapterNumber = parseInt(req.params.number, 10);
    
    if (isNaN(chapterNumber)) {
      return res.status(400).json({ error: 'Invalid chapter number' });
    }

    // Get the chapter ID first
    const chapterResult = await pool.query(`
      SELECT id FROM chapters WHERE story_id = $1 AND chapter_number = $2
    `, [req.params.storyId, chapterNumber]);
    
    if (chapterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const chapter = chapterResult.rows[0];

    // Fetch the 7 most recent comments for this chapter
    const commentsResult = await pool.query(`
      SELECT c.*, u.username, u.avatar_url, u.is_admin
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.chapter_id = $1
      ORDER BY c.created_at DESC
      LIMIT 7
    `, [chapter.id]);

    const latestComments = commentsResult.rows.map(c => ({
      ...c,
      type: 'chapter',
      chapter_number: chapterNumber
    }));

    res.json({ latestComments });
  } catch (error) {
    console.error('Error fetching latest chapter comments:', error);
    res.status(500).json({ error: 'Failed to fetch latest comments' });
  }
});

// POST /api/stories/:storyId/chapters/:number/comments
router.post('/:number/comments', authenticateToken, async (req, res) => {
  try {
    const chapterNumber = parseInt(req.params.number, 10);
    
    if (isNaN(chapterNumber)) {
      return res.status(400).json({ error: 'Invalid chapter number' });
    }

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

    // Check if user is banned from commenting
    const userResult = await pool.query('SELECT comments_banned FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length > 0 && userResult.rows[0].comments_banned) {
      return res.status(403).json({ error: 'You have been banned from commenting and reviewing' });
    }

    const chapterResult = await pool.query(`
      SELECT c.id, c.story_id, s.author_id, s.title as story_title
      FROM chapters c 
      JOIN stories s ON c.story_id = s.id
      WHERE c.story_id = $1 AND c.chapter_number = $2
    `, [req.params.storyId, chapterNumber]);
    const chapter = chapterResult.rows[0];
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });

    const id = uuidv4();
    await pool.query('INSERT INTO comments (id, chapter_id, user_id, content) VALUES ($1, $2, $3, $4)',
      [id, chapter.id, req.user.id, content.trim()]);

    // Create notification for story author if commenter is not the author
    if (req.user.id !== chapter.author_id) {
      const notificationId = uuidv4();
      const notificationTitle = `New comment on a chapter`;
      const notificationMessage = `${req.user.username} commented on Chapter ${chapterNumber} of "${chapter.story_title}"`;
      
      await pool.query(
        `INSERT INTO notifications 
          (id, user_id, commenter_id, story_id, comment_id, comment_type, chapter_number, type, title, message, link, is_read, created_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, EXTRACT(epoch FROM NOW()))`,
        [notificationId, chapter.author_id, req.user.id, chapter.story_id, id, 'chapter', chapterNumber, 'comment', notificationTitle, notificationMessage, `/story/${chapter.story_id}/chapter/${chapterNumber}#comment-${id}`]
      );
    }

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

// DELETE /api/stories/:storyId/chapters/:number/comments/:commentId — admin only
router.delete('/:number/comments/:commentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { number, commentId } = req.params;
    const chapterNumber = parseInt(number, 10);

    if (isNaN(chapterNumber)) {
      return res.status(400).json({ error: 'Invalid chapter number' });
    }

    // Verify comment exists and belongs to this chapter
    const commentResult = await pool.query(`
      SELECT c.user_id, c.id 
      FROM comments c
      JOIN chapters ch ON c.chapter_id = ch.id
      WHERE ch.story_id = $1 AND ch.chapter_number = $2 AND c.id = $3
    `, [req.params.storyId, chapterNumber, commentId]);

    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Delete the comment
    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting chapter comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// DEBUG: GET all chapters for a story with their numbers
// /api/stories/:storyId/chapters-debug
router.get('/debug/all', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, chapter_number, title, volume_id, created_at
      FROM chapters
      WHERE story_id = $1
      ORDER BY chapter_number ASC
    `, [req.params.storyId]);
    
    res.json({
      total: result.rows.length,
      chapters: result.rows,
      missing: detectMissingChapters(result.rows)
    });
  } catch (error) {
    console.error('Error fetching debug info:', error);
    res.status(500).json({ error: 'Failed to fetch debug info' });
  }
});

// Helper to detect gaps in chapter numbering
function detectMissingChapters(chapters) {
  if (chapters.length === 0) return [];
  
  const missing = [];
  const numbers = chapters.map(c => c.chapter_number).sort((a, b) => a - b);
  
  for (let i = numbers[0]; i <= numbers[numbers.length - 1]; i++) {
    if (!numbers.includes(i)) {
      missing.push(i);
    }
  }
  
  return missing;
}

// PATCH /api/stories/:storyId/chapters/reorder
// Body: { chapterIds: [id1, id2, id3, ...], volumeId: 'vol-id' } - array of chapter IDs in desired order
router.patch('/reorder', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { chapterIds, volumeId } = req.body;
    
    if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
      return res.status(400).json({ error: 'Invalid chapterIds array' });
    }

    // Verify all chapters belong to this story and volume
    const chaptersResult = await pool.query(`
      SELECT id, chapter_number, volume_id FROM chapters 
      WHERE story_id = $1 AND id = ANY($2) AND volume_id = $3
    `, [req.params.storyId, chapterIds, volumeId || null]);

    if (chaptersResult.rows.length !== chapterIds.length) {
      return res.status(400).json({ error: 'Some chapters not found or do not belong to this volume' });
    }

    // Get the minimum chapter number in this volume to start numbering from
    const minNumberResult = await pool.query(`
      SELECT MIN(chapter_number) as min_num FROM chapters 
      WHERE story_id = $1 AND volume_id = $2
    `, [req.params.storyId, volumeId || null]);
    
    const startingNumber = minNumberResult.rows[0]?.min_num || 1;

    // Update chapter_number based on new order within the volume
    // Use transaction to ensure atomicity
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Assign new chapter numbers starting from the volume's base number
      for (let i = 0; i < chapterIds.length; i++) {
        const newChapterNumber = startingNumber + i;
        await client.query(
          'UPDATE chapters SET chapter_number = $1, updated_at = EXTRACT(EPOCH FROM NOW()) WHERE id = $2',
          [newChapterNumber, chapterIds[i]]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Return all chapters for this story sorted by number
    const updatedResult = await pool.query(`
      SELECT id, chapter_number, title, volume_id FROM chapters 
      WHERE story_id = $1 
      ORDER BY chapter_number ASC
    `, [req.params.storyId]);

    res.json({ message: 'Chapters reordered successfully', chapters: updatedResult.rows });
  } catch (error) {
    console.error('Error reordering chapters:', error);
    res.status(500).json({ error: 'Failed to reorder chapters' });
  }
});

export default router;
