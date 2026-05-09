import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import session from 'express-session';
import { getDatabaseInfo, initDb, pool } from './database.js';
import passport from './oauth.js';

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
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/stories/:storyId/chapters', chapterRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend build in production / tunnel mode
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Request error:', {
    method: req.method,
    url: req.url,
    status: err.status || 500,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// Global error handlers for unhandled rejections and exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function start() {
  try {
    await initDb();
    console.log('✓ Database initialized');

    try {
      const dbInfo = await getDatabaseInfo();
      console.log(
        `✓ Database connected: db=${dbInfo.database_name} user=${dbInfo.database_user} host=${dbInfo.server_addr}:${dbInfo.server_port}`
      );
    } catch (error) {
      console.error('Warning: Unable to read database identity:', error.message);
    }

    // Create default admin user if it doesn't exist
    try {
      const adminExists = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
      if (adminExists.rows.length === 0) {
        const adminId = uuidv4();
        const adminPassword = 'Pxd11112002@';
        const adminEmail = 'ducphamxuan1st@gmail.com';
        const passwordHash = await bcrypt.hash(adminPassword, 12);

        try {
          await pool.query(
            'INSERT INTO users (id, username, email, password_hash, is_admin, is_verified) VALUES ($1, $2, $3, $4, $5, $6)',
            [adminId, 'admin', adminEmail, passwordHash, 1, 1]
          );
          console.log('✓ Default admin user created: username=admin, password=Pxd11112002@');
        } catch (insertError) {
          // If email already exists, that's okay - just log it
          if (insertError.code === '23505') {
            console.log('ℹ Admin user not created (email or username already exists)');
          } else {
            throw insertError;
          }
        }
      }
    } catch (error) {
      console.error('Warning: Error creating default admin:', error.message);
    }

    const server = app.listen(PORT, () => {
      console.log(`✓ Rebuild World server running on http://localhost:${PORT}`);
    });

    // Graceful shutdown handlers
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      server.close(async () => {
        await pool.end();
        console.log('Database pool closed');
        process.exit(0);
      });

      // Force exit after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Fatal error during startup:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

start();
