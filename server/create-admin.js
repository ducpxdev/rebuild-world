import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function createAdmin() {
  try {
    const username = process.argv[2] || 'admin';
    const email = process.argv[3] || 'admin@example.com';
    const password = process.argv[4] || 'admin123';

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existingUser.rows.length > 0) {
      console.log(`User "${username}" or email "${email}" already exists`);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user
    await pool.query(
      'INSERT INTO users (id, username, email, password_hash, is_admin, is_verified) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, username, email, passwordHash, 1, 1]
    );

    console.log(`✓ Admin user "${username}" created successfully!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();