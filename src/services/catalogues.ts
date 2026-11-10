import { pool } from '../db/pool';
import { readStoredFile } from './files';

// Rendered first-page covers, keyed by stored PDF filename
const coverCache = new Map<string, Buffer>();

export const forgetCover = (pdfPath: string | null | undefined) => {
  if (pdfPath) coverCache.delete(pdfPath.split('/').pop()!);
};

// JPEG of the PDF's first page, 800px tall; null when the file is missing
export async function catalogueCover(pdfPath: string) {
  const filename = pdfPath.split('/').pop()!;
  const cached = coverCache.get(filename);
  if (cached) return cached;
  const file = await readStoredFile('documents', filename);
  if (!file) return null;
  const mupdf = await import('mupdf');
  const doc = mupdf.Document.openDocument(new mupdf.Buffer(file.data), 'application/pdf');
  const page = doc.loadPage(0);
  const [, y0, , y1] = page.getBounds();
  const scale = 800 / Math.max(1, y1 - y0);
  const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
  const jpeg = Buffer.from(pixmap.asJPEG(85));
  coverCache.set(filename, jpeg);
  return jpeg;
}

export const coverResponse = (jpeg: Buffer) =>
  new Response(new Uint8Array(jpeg), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', 'Content-Length': String(jpeg.length) }
  });

// Catalogues with a PDF, newest first, for the public site
export async function listPublicCatalogues() {
  const { rows } = await pool.query(
    `SELECT catalogue_id, catalogue_name FROM catalogue WHERE catalogue_pdf IS NOT NULL ORDER BY create_ts DESC, catalogue_name`
  );
  return rows.map((row) => ({
    id: row.catalogue_id as string,
    name: row.catalogue_name as string,
    cover: `/api/catalogues/${row.catalogue_id}/cover`,
    pdf: `/api/catalogues/${row.catalogue_id}/pdf`
  }));
}

const columns = `catalogue_id, catalogue_name, catalogue_pdf,
  create_ts AS "createTs", update_ts AS "updateTs", create_by AS "createBy", update_by AS "updateBy"`;
const sortColumns: Record<string, string> = {
  catalogue_id: 'catalogue_id', catalogue_name: 'catalogue_name', createTs: 'create_ts', updateTs: 'update_ts'
};

export async function listCatalogues(options: { page: number; limit: number; sort: string; order: 'asc' | 'desc'; search?: string }) {
  const sort = sortColumns[options.sort] ?? sortColumns.catalogue_name;
  const order = options.order === 'asc' ? 'ASC' : 'DESC';
  const search = options.search?.trim();
  const values: unknown[] = search ? [`%${search}%`] : [];
  const where = search ? 'WHERE catalogue_name ILIKE $1' : '';
  const count = await pool.query(`SELECT count(*)::int AS total FROM catalogue ${where}`, values);
  const offset = (options.page - 1) * options.limit;
  const rows = await pool.query(`SELECT ${columns} FROM catalogue ${where} ORDER BY ${sort} ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, options.limit, offset]);
  const total = count.rows[0].total as number;
  return { data: rows.rows, page: options.page, limit: options.limit, total, totalPages: Math.ceil(total / options.limit), sort: options.sort in sortColumns ? options.sort : 'catalogue_name', order: options.order };
}

export async function getCatalogue(id: string) {
  return (await pool.query(`SELECT ${columns} FROM catalogue WHERE catalogue_id=$1`, [id])).rows[0] ?? null;
}

export async function saveCatalogue(data: { catalogue_id?: string; catalogue_name: string; catalogue_pdf?: string | null }, actor: string, update = false) {
  const sql = update
    ? `UPDATE catalogue SET catalogue_name=$2,catalogue_pdf=$3,update_by=$4,update_ts=now() WHERE catalogue_id=$1 RETURNING ${columns}`
    : `INSERT INTO catalogue (catalogue_id,catalogue_name,catalogue_pdf,create_by,update_by) VALUES ($1,$2,$3,$4,$4) RETURNING ${columns}`;
  return (await pool.query(sql, update
    ? [data.catalogue_id, data.catalogue_name.trim(), data.catalogue_pdf ?? null, actor]
    : [data.catalogue_id, data.catalogue_name.trim(), data.catalogue_pdf ?? null, actor])).rows[0] ?? null;
}

export async function deleteCatalogue(id: string) {
  return (await pool.query('DELETE FROM catalogue WHERE catalogue_id=$1 RETURNING catalogue_id', [id])).rows.length > 0;
}
