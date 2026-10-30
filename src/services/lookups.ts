import { pool } from '../db/pool';

export async function listSeries() { return (await pool.query('SELECT * FROM series_type ORDER BY series_name')).rows; }
export async function saveSeries(data: { series_code: string; series_name: string }, actor: string, update = false) {
  const sql = update
    ? 'UPDATE series_type SET series_name=$2, update_by=$3, update_ts=now() WHERE series_code=$1 RETURNING *'
    : 'INSERT INTO series_type (series_code,series_name,create_by,update_by) VALUES ($1,$2,$3,$3) RETURNING *';
  return (await pool.query(sql, [data.series_code.trim(), data.series_name.trim(), actor])).rows[0] ?? null;
}
export async function deleteSeries(code: string) { return Boolean((await pool.query('DELETE FROM series_type WHERE series_code=$1 RETURNING series_code', [code])).rows.length); }

export async function listCertificates() { return (await pool.query('SELECT * FROM certificate_type ORDER BY certificate_code')).rows; }
export async function getCertificate(code: string) { return (await pool.query('SELECT * FROM certificate_type WHERE certificate_code=$1', [code])).rows[0] ?? null; }
export async function saveCertificate(data: { certificate_code: string; image?: string | null }, actor: string, update = false) {
  const sql = update
    ? 'UPDATE certificate_type SET image=$2, update_by=$3, update_ts=now() WHERE certificate_code=$1 RETURNING *'
    : 'INSERT INTO certificate_type (certificate_code,image,create_by,update_by) VALUES ($1,$2,$3,$3) RETURNING *';
  return (await pool.query(sql, [data.certificate_code, data.image ?? null, actor])).rows[0] ?? null;
}
export async function deleteCertificate(code: string) { return Boolean((await pool.query('DELETE FROM certificate_type WHERE certificate_code=$1 RETURNING certificate_code')).rows.length); }
