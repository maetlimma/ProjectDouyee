import { runner } from 'node-pg-migrate';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dir, '..');

export function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const user = process.env.POSTGRES_USER ?? 'douyee';
  const password = process.env.POSTGRES_PASSWORD ?? 'douyee';
  const database = process.env.POSTGRES_DB ?? 'douyee';
  const host = process.env.PGHOST ?? 'localhost';
  const port = process.env.PGPORT ?? process.env.POSTGRES_PORT ?? '5432';
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

export async function migrate(direction: 'up' | 'down' = 'up') {
  await runner({
    databaseUrl: databaseUrl(),
    dir: resolve(projectRoot, 'src/migrations'),
    direction,
    migrationsTable: 'pgmigrations'
  });
}

if (import.meta.main) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  await migrate(direction);
}
