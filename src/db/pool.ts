import pg from 'pg';

const { Pool } = pg;
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://douyee:douyee@localhost:5432/douyee',
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});
pool.on('error', (error) => console.error('Unexpected PostgreSQL pool error', error));
