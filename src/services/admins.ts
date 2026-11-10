import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';

export interface AdminUser {
  id: string;
  email: string;
  passwordHash: string;
}

export interface AdminUserSummary {
  adminId: string;
  email: string;
  createTs: string;
  updateTs: string;
}

export async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  const { rows } = await pool.query<AdminUser>(
    'SELECT admin_id AS id, email, password_hash AS "passwordHash" FROM admin_user WHERE lower(email) = lower($1)',
    [email]
  );
  return rows[0] ?? null;
}

export async function listAdmins(): Promise<AdminUserSummary[]> {
  const { rows } = await pool.query<AdminUserSummary>(
    'SELECT admin_id AS "adminId", email, create_ts AS "createTs", update_ts AS "updateTs" FROM admin_user ORDER BY create_ts ASC'
  );
  return rows;
}

export async function createAdmin(email: string, password: string): Promise<AdminUserSummary> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('A valid email address is required.');
  }
  if (!password || password.length < 8) {
    throw new Error('Admin password must be at least 8 characters long.');
  }

  const existing = await findAdminByEmail(cleanEmail);
  if (existing) {
    const error: any = new Error(`Admin with email "${cleanEmail}" already exists.`);
    error.status = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const passwordHash = await Bun.password.hash(password);
  const adminId = randomUUID();

  const { rows } = await pool.query<AdminUserSummary>(
    `INSERT INTO admin_user (admin_id, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING admin_id AS "adminId", email, create_ts AS "createTs", update_ts AS "updateTs"`,
    [adminId, cleanEmail, passwordHash]
  );
  return rows[0];
}

export async function updateAdminPassword(adminId: string, newPassword: string, actorEmail: string): Promise<AdminUserSummary> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Admin password must be at least 8 characters long.');
  }

  const target = await pool.query<{ admin_id: string; email: string }>(
    'SELECT admin_id, email FROM admin_user WHERE admin_id = $1',
    [adminId]
  );
  if (!target.rows[0]) {
    const error: any = new Error('Admin user not found.');
    error.status = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (target.rows[0].email.toLowerCase() !== actorEmail.trim().toLowerCase()) {
    const error: any = new Error('You can only change your own password.');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const passwordHash = await Bun.password.hash(newPassword);
  const { rows } = await pool.query<AdminUserSummary>(
    `UPDATE admin_user
     SET password_hash = $2, update_ts = current_timestamp
     WHERE admin_id = $1
     RETURNING admin_id AS "adminId", email, create_ts AS "createTs", update_ts AS "updateTs"`,
    [adminId, passwordHash]
  );
  return rows[0];
}

export async function deleteAdmin(adminId: string): Promise<boolean> {
  const countRes = await pool.query<{ count: number }>('SELECT count(*)::int AS count FROM admin_user');
  if (Number(countRes.rows[0].count) <= 1) {
    const error: any = new Error('Cannot delete the only remaining admin account.');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  const { rows } = await pool.query(
    'DELETE FROM admin_user WHERE admin_id = $1 RETURNING admin_id',
    [adminId]
  );

  if (!rows.length) {
    const error: any = new Error('Admin user not found.');
    error.status = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  return true;
}

export async function upsertAdmin(email: string, password: string) {
  if (password.length < 8) throw new Error('Admin password must be at least 8 characters.');
  const passwordHash = await Bun.password.hash(password);
  const { rows } = await pool.query<{ created: boolean }>(
    `INSERT INTO admin_user (admin_id, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT ((lower(email))) DO UPDATE SET password_hash = EXCLUDED.password_hash, update_ts = current_timestamp
     RETURNING (xmax = 0) AS created`,
    [randomUUID(), email.trim().toLowerCase(), passwordHash]
  );
  return rows[0].created;
}

// Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists yet.
export async function bootstrapAdminFromEnv() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const { rows } = await pool.query<{ count: string }>('SELECT count(*) FROM admin_user');
  if (Number(rows[0].count) > 0) return;
  await upsertAdmin(email, password);
  console.info(`Created initial admin ${email} from ADMIN_EMAIL.`);
}
