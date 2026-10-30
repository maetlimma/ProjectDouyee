import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface AdminUser { id: string; email: string; passwordHash: string }
const usersPath = resolve(import.meta.dir, '../database/users.json');

export async function getUsers(): Promise<AdminUser[]> {
  try { return JSON.parse(await readFile(usersPath, 'utf8')) as AdminUser[]; }
  catch { return []; }
}
