import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✓ Created uploads directory:', uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('[Upload] Created uploads directory:', uploadsDir);
    }
    console.log('[Upload] Destination directory:', uploadsDir, 'exists:', fs.existsSync(uploadsDir));
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${unique}${path.extname(file.originalname)}`;
    console.log('[Upload] Generated filename:', filename, 'from original:', file.originalname);
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    console.log('[FileFilter] ✓ Accepted file:', file.originalname, 'mime:', file.mimetype);
    cb(null, true);
  } else {
    console.log('[FileFilter] ✗ Rejected file:', file.originalname, 'mime:', file.mimetype, 'ext:', path.extname(file.originalname));
    cb(new Error('Only image files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});
