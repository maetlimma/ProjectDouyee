import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';

// Uploaded files are stored in PostgreSQL (table stored_file) and exposed as /files/<folder>/<filename>.
type Folder = 'images' | 'documents';
const allowed: Record<Folder, Set<string>> = {
  images: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  documents: new Set(['application/pdf'])
};
const extensions: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'application/pdf': '.pdf'
};
const FILENAME = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/;
const PUBLIC_PATH = /^\/files\/(images|documents)\/([a-zA-Z0-9-]+\.[a-zA-Z0-9]+)$/;

export async function saveUpload(file: File | undefined, folder: Folder) {
  if (!file || !file.size) return null;
  if (!allowed[folder].has(file.type)) throw Object.assign(new Error(`Unsupported ${folder} file type`), { status: 400, code: 'VALIDATION_ERROR' });
  const limit = folder === 'images' ? 12 * 1024 * 1024 : 30 * 1024 * 1024;
  if (file.size > limit) throw Object.assign(new Error(`${folder} file is too large`), { status: 400, code: 'VALIDATION_ERROR' });
  const filename = `${randomUUID()}${extensions[file.type]}`;
  const data = Buffer.from(await file.arrayBuffer());
  await pool.query(
    'INSERT INTO stored_file (folder, filename, content_type, size_bytes, data) VALUES ($1, $2, $3, $4, $5)',
    [folder, filename, file.type, data.length, data]
  );
  return `/files/${folder}/${filename}`;
}

export async function removeStoredFile(publicPath: string | null | undefined) {
  if (!publicPath) return;
  const match = PUBLIC_PATH.exec(publicPath);
  if (!match) return;
  await pool.query('DELETE FROM stored_file WHERE folder = $1 AND filename = $2', [match[1], match[2]]);
}

export async function readStoredFile(folder: string, filename: string) {
  if (!['images', 'documents'].includes(folder) || !FILENAME.test(filename)) return null;
  const { rows } = await pool.query<{ content_type: string; data: Buffer }>(
    'SELECT content_type, data FROM stored_file WHERE folder = $1 AND filename = $2', [folder, filename]
  );
  return rows[0] ? { filename, contentType: rows[0].content_type, data: rows[0].data } : null;
}

export function fileResponse(file: { filename: string; contentType: string; data: Buffer }, inline = false) {
  const headers: Record<string, string> = { 'content-type': file.contentType, 'x-content-type-options': 'nosniff' };
  if (inline) headers['content-disposition'] = `inline; filename="${file.filename}"`;
  return new Response(new Uint8Array(file.data), { headers });
}
