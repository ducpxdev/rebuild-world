import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDb, pool } from './database.js';

import authRoutes from './routes/auth.js';
import storyRoutes from './routes/stories.js';
import chapterRoutes from './routes/chapters.js';
import userRoutes from './routes/users.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/stories/:storyId/chapters', chapterRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend build in production / tunnel mode
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

async function start() {
  await initDb();

  // Create default admin user if it doesn't exist
  try {
    const adminExists = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      const adminId = uuidv4();
      const adminPassword = 'Pxd11112002@';
      const adminEmail = 'ducphamxuan1st@gmail.com';
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      await pool.query(
        'INSERT INTO users (id, username, email, password_hash, is_admin, is_verified) VALUES ($1, $2, $3, $4, $5, $6)',
        [adminId, 'admin', adminEmail, passwordHash, 1, 1]
      );
      console.log('✓ Default admin user created: username=admin, password=Pxd11112002@');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }

  app.listen(PORT, () => {
    console.log(`Rebuild World server running on http://localhost:${PORT}`);
  });
}

start();
