import { pool } from './database.js';

/** Cosmetic display roles (username colour). Keep in sync with client/src/lib/roles.ts. */
export const DISPLAY_ROLES = ['alpha', 'sheryl', 'viola', 'elena', 'sara', 'shizuka', 'carol', 'yumina', 'airi'];

/**
 * Read permissions straight from the database rather than the JWT, so a
 * revoked mod/admin loses access immediately instead of when their token expires.
 */
export async function getPermissions(userId) {
  const result = await pool.query('SELECT is_admin, is_mod FROM users WHERE id = $1', [userId]);
  const row = result.rows[0];
  const isAdmin = !!row?.is_admin;
  return { isAdmin, isMod: isAdmin || !!row?.is_mod };
}
