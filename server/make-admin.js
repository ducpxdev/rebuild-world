// Usage: node make-admin.js <username>
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'storyforge.db');

const username = process.argv[2];
if (!username) {
  console.error('Usage: node make-admin.js <username>');
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.error('Database not found. Register an account first.');
  process.exit(1);
}

const SQL = await initSqlJs();
const buf = fs.readFileSync(DB_PATH);
const db = new SQL.Database(buf);

const user = db.exec(`SELECT id, username, is_admin FROM users WHERE username = '${username.replace(/'/g, "''")}'`);
if (!user.length || !user[0].values.length) {
  console.error(`User "${username}" not found.`);
  process.exit(1);
}

db.run(`UPDATE users SET is_admin = 1 WHERE username = '${username.replace(/'/g, "''")}'`);
fs.writeFileSync(DB_PATH, Buffer.from(db.export()));

console.log(`✓ User "${username}" is now an admin.`);
