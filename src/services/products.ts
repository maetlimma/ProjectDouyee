import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';
import { saveUpload } from './files';
import { parseProductInput } from './product-validation';

export interface ProductInput {
  sku: string; product_name: string; series: string; brand?: string | null; title?: string | null;
  main_image?: string | null; other_image?: unknown[]; specification?: Record<string, unknown>; specification_en?: Record<string, unknown>;
  size_weights?: Record<string, unknown>; datasheet_pdf?: string | null; certificate_pdf?: string | null;
  other?: Record<string, unknown>; certificate_codes?: string[];
}
export { parseProductInput };
const columns = 'product_id, sku, product_name, series, brand, title, main_image, other_image, specification, specification_en, size_weights, datasheet_pdf, certificate_pdf, other, create_ts, update_ts, create_by, update_by';

export async function listProductsGrouped() {
  const { rows } = await pool.query(`SELECT ${columns} FROM product ORDER BY series, product_name`);
  const links = await pool.query('SELECT product_id, certificate_code FROM certificate_product ORDER BY certificate_code');
  const codes = new Map<string, string[]>();
  for (const link of links.rows) codes.set(link.product_id, [...(codes.get(link.product_id) ?? []), link.certificate_code]);
  const groups: Record<string, Record<string, unknown>[]> = {};
  for (const row of rows) (groups[row.series] ??= []).push({ ...row, certificate_codes: codes.get(row.product_id) ?? [] });
  return Object.entries(groups).map(([series, products]) => ({ series, products }));
}

export async function getProduct(id: string) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT ${columns} FROM product WHERE product_id = $1`, [id]);
    if (!rows[0]) return null;
    const certs = await client.query('SELECT certificate_code FROM certificate_product WHERE product_id = $1 ORDER BY certificate_code', [id]);
    return { ...rows[0], certificate_codes: certs.rows.map((r) => r.certificate_code) };
  } finally { client.release(); }
}

export async function saveProduct(input: ProductInput, actor: string, id?: string) {
  const client = await pool.connect();
  const productId = id ?? randomUUID();
  try {
    await client.query('BEGIN');
    const values = [productId, input.sku, input.product_name, input.series, input.brand ?? null, input.title ?? null, input.main_image ?? null, JSON.stringify(input.other_image ?? []), JSON.stringify(input.specification ?? {}), JSON.stringify(input.specification_en ?? {}), JSON.stringify(input.size_weights ?? {}), input.datasheet_pdf ?? null, input.certificate_pdf ?? null, JSON.stringify(input.other ?? {}), actor];
    const query = id
      ? `UPDATE product SET sku=$2, product_name=$3, series=$4, brand=$5, title=$6, main_image=$7, other_image=$8::jsonb, specification=$9::jsonb, specification_en=$10::jsonb, size_weights=$11::jsonb, datasheet_pdf=$12, certificate_pdf=$13, other=$14::jsonb, update_by=$15, update_ts=now() WHERE product_id=$1 RETURNING ${columns}`
      : `INSERT INTO product (product_id,sku,product_name,series,brand,title,main_image,other_image,specification,specification_en,size_weights,datasheet_pdf,certificate_pdf,other,create_by,update_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14::jsonb,$15,$15) RETURNING ${columns}`;
    const result = await client.query(query, values);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
    const certificates = [...new Set(input.certificate_codes ?? [])];
    await client.query('DELETE FROM certificate_product WHERE product_id=$1 AND NOT (certificate_code = ANY($2::text[]))', [productId, certificates]);
    for (const code of certificates) await client.query(`INSERT INTO certificate_product (product_id,certificate_code,create_by,update_by) VALUES ($1,$2,$3,$3) ON CONFLICT (product_id,certificate_code) DO UPDATE SET update_by=EXCLUDED.update_by, update_ts=now()`, [productId, code, actor]);
    await client.query('COMMIT');
    return { ...result.rows[0], certificate_codes: [...new Set(input.certificate_codes ?? [])] };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function deleteProduct(id: string) {
  const result = await pool.query('DELETE FROM product WHERE product_id=$1 RETURNING product_id', [id]);
  return result.rows.length > 0;
}

export async function prepareProductWrite(body: Record<string, unknown>, old?: Record<string, any>) {
  const input = parseProductInput(body);
  if (body.specification_en === undefined && old?.specification_en) input.specification_en = old.specification_en;
  if (!(await pool.query('SELECT 1 FROM series_type WHERE series_code=$1', [input.series])).rowCount) {
    throw Object.assign(new Error(`Unknown series: ${input.series}`), { status: 400, code: 'VALIDATION_ERROR', details: { field: 'series', message: 'Series does not exist' } });
  }
  const asFile = (value: unknown): File | undefined => value instanceof File ? value : undefined;
  const main = asFile(body.main_image_file);
  const dataSheet = asFile(body.datasheet_pdf_file);
  const certPdf = asFile(body.certificate_pdf_file);
  const extras = body.other_image_files ? (Array.isArray(body.other_image_files) ? body.other_image_files : [body.other_image_files]) : [];
  if (main) input.main_image = (await saveUpload(main, 'images')) ?? input.main_image ?? old?.main_image;
  else input.main_image ||= old?.main_image ?? null;
  if (dataSheet) input.datasheet_pdf = (await saveUpload(dataSheet, 'documents')) ?? input.datasheet_pdf ?? old?.datasheet_pdf;
  else input.datasheet_pdf ||= old?.datasheet_pdf ?? null;
  if (certPdf) input.certificate_pdf = (await saveUpload(certPdf, 'documents')) ?? input.certificate_pdf ?? old?.certificate_pdf;
  else input.certificate_pdf ||= old?.certificate_pdf ?? null;
  if (extras.length) input.other_image = [...(input.other_image ?? []), ...(await Promise.all(extras.map((file) => saveUpload(asFile(file), 'images')))).filter(Boolean)];
  return input;
}
