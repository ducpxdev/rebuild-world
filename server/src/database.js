import pkg from 'pg';
const { Pool } = pkg;

function getDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRESQL_URL,
  ].filter(Boolean);

  if (candidates.length === 0) {
    throw new Error(
      'Missing Postgres connection string. Set DATABASE_URL (or DATABASE_PRIVATE_URL on Railway).'
    );
  }

  return candidates[0];
}

const databaseUrl = getDatabaseUrl();

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX || 20),
  min: Number(process.env.PG_POOL_MIN || 2),
  connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
  statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS || 30000),
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function getDatabaseInfo() {
  const result = await pool.query(`
    SELECT
      current_database() AS database_name,
      current_user AS database_user,
      inet_server_addr()::text AS server_addr,
      inet_server_port() AS server_port
  `);

  return result.rows[0];
}

export async function initDb() {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        google_id TEXT UNIQUE,
        provider TEXT DEFAULT 'local' CHECK(provider IN ('local', 'google')),
        avatar_url TEXT,
        bio TEXT,
        is_admin INTEGER DEFAULT 0,
        is_verified INTEGER DEFAULT 1,
        verification_token TEXT,
        verification_expires BIGINT,
        reset_token TEXT,
        reset_expires BIGINT,
        created_at BIGINT DEFAULT EXTRACT(epoch FROM NOW())
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        cover_url TEXT,
        type TEXT NOT NULL CHECK(type IN ('text', 'comic')),
        genre TEXT,
        tags TEXT,
        status TEXT DEFAULT 'ongoing' CHECK(status IN ('ongoing', 'completed', 'hiatus')),
        views INTEGER DEFAULT 0,
        rating_avg REAL DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        is_published INTEGER DEFAULT 1,
        created_at BIGINT DEFAULT EXTRACT(epoch FROM NOW()),
        updated_at BIGINT DEFAULT EXTRACT(epoch FROM NOW())
      )
    `);

    // Volumes table - new structure for organizing chapters
    await pool.query(`
      CREATE TABLE IF NOT EXISTS volumes (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        volume_number INTEGER NOT NULL,
        title TEXT,
        cover_url TEXT,
        description TEXT,
        created_at BIGINT DEFAULT EXTRACT(epoch FROM NOW()),
        updated_at BIGINT DEFAULT EXTRACT(epoch FROM NOW()),
        UNIQUE(story_id, volume_number)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        volume_id TEXT REFERENCES volumes(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        title TEXT,
        content TEXT,
        images TEXT,
        views INTEGER DEFAULT 0,
        created_at BIGINT DEFAULT EXTRACT(epoch FROM NOW()),
        UNIQUE(story_id, chapter_number)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        created_at BIGINT DEFAULT EXTRACT(epoch FROM NOW()),
        UNIQUE(user_id, story_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS story_ratings (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        created_at BIGINT DEFAULT EXTRACT(epoch FROM NOW()),
        PRIMARY KEY (user_id, story_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS followers (
        follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        followed_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at BIGINT DEFAULT EXTRACT(epoch FROM NOW()),
        PRIMARY KEY (follower_id, followed_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at BIGINT DEFAULT EXTRACT(epoch FROM NOW())
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at BIGINT DEFAULT EXTRACT(epoch FROM NOW())
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS story_comments (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at BIGINT DEFAULT EXTRACT(epoch FROM NOW())
      )
    `);

    // Migration: Add volume_id column to chapters table if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE chapters ADD COLUMN volume_id TEXT REFERENCES volumes(id) ON DELETE CASCADE
      `);
      console.log('✓ Added volume_id column to chapters table');
    } catch (err) {
      // Column already exists, ignore error
      if (!err.message.includes('already exists')) {
        console.error('Error adding volume_id column:', err.message);
      }
    }

    console.log('Database initialized successfully');
    return pool;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Wrapper to match better-sqlite3-style API used by routes
const dbProxy = {
  prepare(sql) {
    return {
      async run(...params) {
        try {
          const result = await pool.query(sql, params);
          return result;
        } catch (error) {
          console.error('Database error:', error);
          throw error;
        }
      },
      async get(...params) {
        try {
          const result = await pool.query(sql, params);
          return result.rows[0] || undefined;
        } catch (error) {
          console.error('Database error:', error);
          throw error;
        }
      },
      async all(...params) {
        try {
          const result = await pool.query(sql, params);
          return result.rows;
        } catch (error) {
          console.error('Database error:', error);
          throw error;
        }
      },
    };
  },
};

export default dbProxy;
export { pool };