import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';

export interface AdminUser { id: string; email: string; passwordHash: string }

export async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  const { rows } = await pool.query<AdminUser>(
    'SELECT admin_id AS id, email, password_hash AS "passwordHash" FROM admin_user WHERE lower(email) = lower($1)', [email]
  );
  return rows[0] ?? null;
}

export async function upsertAdmin(email: string, password: string) {
  if (password.length < 12) throw new Error('Admin password must be at least 12 characters.');
  const passwordHash = await Bun.password.hash(password);
  const { rows } = await pool.query<{ created: boolean }>(
    `INSERT INTO admin_user (admin_id, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT ((lower(email))) DO UPDATE SET password_hash = EXCLUDED.password_hash, update_ts = current_timestamp
     RETURNING (xmax = 0) AS created`,
    [randomUUID(), email, passwordHash]
  );
  return rows[0].created;
}

// Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists yet.
// Hosts without a shell (such as free Render services) use this instead of scripts/create-admin.ts.
export async function bootstrapAdminFromEnv() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const { rows } = await pool.query<{ count: string }>('SELECT count(*) FROM admin_user');
  if (Number(rows[0].count) > 0) return;
  await upsertAdmin(email, password);
  console.info(`Created initial admin ${email} from ADMIN_EMAIL.`);
}
