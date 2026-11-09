import { pool } from '../src/db/pool';
import { upsertAdmin } from '../src/services/admins';

// Usage: bun run scripts/create-admin.ts <email> <password>
// Creates the admin in PostgreSQL (DATABASE_URL), or resets the password of an existing one.
const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: bun run scripts/create-admin.ts <email> <password>');
  process.exit(1);
}

try {
  const created = await upsertAdmin(email, password);
  console.info(`${created ? 'Created' : 'Updated'} admin ${email}`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
