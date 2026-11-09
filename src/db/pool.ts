import pg from 'pg';

const { Pool } = pg;
const useSsl = process.env.DATABASE_SSL === 'true' || process.env.DATABASE_URL?.includes('sslmode=require');
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://douyee:douyee@localhost:5432/douyee',
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
});
pool.on('error', (error) => console.error('Unexpected PostgreSQL pool error', error));
