import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// Usage: bun run scripts/create-admin.ts <email> <password>
// Writes database/users.json, which is gitignored. Re-running for an existing email resets its password.
const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: bun run scripts/create-admin.ts <email> <password>');
  process.exit(1);
}
if (password.length < 12) {
  console.error('Password must be at least 12 characters.');
  process.exit(1);
}

const usersPath = resolve(import.meta.dir, '../database/users.json');
let users: { id: string; email: string; passwordHash: string }[] = [];
try { users = JSON.parse(await readFile(usersPath, 'utf8')); } catch { /* first admin */ }

const passwordHash = await Bun.password.hash(password);
const existing = users.find((user) => user.email.toLowerCase() === email.toLowerCase());
if (existing) existing.passwordHash = passwordHash;
else users.push({ id: randomUUID(), email, passwordHash });

await mkdir(dirname(usersPath), { recursive: true });
await writeFile(usersPath, JSON.stringify(users, null, 2));
console.info(`${existing ? 'Updated' : 'Created'} admin ${email} in database/users.json`);
