// Usage: node make-admin-postgres.js <username>
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

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  // Create tables if they don't exist
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
}

async function makeAdmin() {
  try {
    const username = process.argv[2];
    
    if (!username) {
      console.error('Usage: node make-admin-postgres.js <username>');
      process.exit(1);
    }

    // Initialize database tables
    await initDb();

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, username, is_admin FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      console.error(`User "${username}" not found.`);
      process.exit(1);
    }

    const user = userResult.rows[0];

    // Update user to admin
    await pool.query(
      'UPDATE users SET is_admin = 1 WHERE username = $1',
      [username]
    );

    console.log(`✓ User "${username}" is now an admin.`);

  } catch (error) {
    console.error('Error making user admin:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

makeAdmin();
