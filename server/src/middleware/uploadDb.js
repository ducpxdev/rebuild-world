import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database.js';

// Use memory storage instead of disk - we'll save to database instead
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(file.originalname.split('.').pop().toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    console.log('[FileFilter DB] ✓ Accepted file:', file.originalname, 'mime:', file.mimetype);
    cb(null, true);
  } else {
    console.log('[FileFilter DB] ✗ Rejected file:', file.originalname, 'mime:', file.mimetype);
    cb(new Error('Only image files are allowed'));
  }
};

export const uploadDb = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Middleware to save uploaded files to database (handles both single and multiple files)
export async function saveUploadedFiles(req, res, next) {
  // Handle single file upload (from uploadDb.single())
  if (req.file) {
    try {
      const imageId = uuidv4();
      const filename = `${imageId}-${req.file.originalname}`;
      
      await pool.query(
        `INSERT INTO images (id, filename, mimetype, data, size) VALUES ($1, $2, $3, $4, $5)`,
        [imageId, filename, req.file.mimetype, req.file.buffer, req.file.size]
      );
      
      console.log('[Upload DB] Saved single image to database:', filename, 'size:', req.file.size);
      
      // Replace file with database info
      req.file = {
        fieldname: req.file.fieldname,
        filename: filename,
        imageId: imageId,
        url: `/api/images/${imageId}`
      };
      req.uploadedToDb = true;
      return next();
    } catch (error) {
      console.error('[Upload DB] Error saving single file:', error);
      return res.status(500).json({ error: 'Failed to upload file' });
    }
  }
  
  // Handle multiple file upload (from uploadDb.any())
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const savedFiles = [];
    
    for (const file of req.files) {
      const imageId = uuidv4();
      const filename = `${imageId}-${file.originalname}`;
      
      // Save to database
      await pool.query(
        `INSERT INTO images (id, filename, mimetype, data, size) VALUES ($1, $2, $3, $4, $5)`,
        [imageId, filename, file.mimetype, file.buffer, file.size]
      );
      
      console.log('[Upload DB] Saved image to database:', filename, 'size:', file.size);
      
      // Store the database image ID and generated filename for use in route handlers
      // Preserve fieldname for distinguishing between different file upload fields
      savedFiles.push({
        fieldname: file.fieldname, // Preserve original fieldname (images or text_images)
        filename: filename,
        imageId: imageId,
        url: `/api/images/${imageId}`
      });
    }
    
    // Replace files array with saved file info
    req.files = savedFiles;
    req.uploadedToDb = true;
    next();
  } catch (error) {
    console.error('[Upload DB] Error saving files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
}
