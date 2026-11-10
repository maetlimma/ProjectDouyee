import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// Uploaded files are stored strictly on local disk in the storage directory and exposed as /files/<folder>/<filename>.
export type Folder = 'images' | 'documents';
const root = resolve(process.env.FILE_STORAGE_DIR ?? 'storage');

// Ensure distinct storage directories exist
mkdirSync(join(root, 'images'), { recursive: true });
mkdirSync(join(root, 'documents'), { recursive: true });

const contentTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf'
};

const allowed: Record<Folder, Set<string>> = {
  images: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  documents: new Set(['application/pdf'])
};

const extensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'application/pdf': '.pdf'
};

const FILENAME = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/;
const PUBLIC_PATH = /^\/files\/(images|documents)\/([a-zA-Z0-9-]+\.[a-zA-Z0-9]+)$/;

export function resolveStoredFile(folder: string, filename: string) {
  if (!['images', 'documents'].includes(folder) || !FILENAME.test(filename)) return null;
  return join(root, folder, filename);
}

export async function saveUpload(file: File | undefined, folder: Folder) {
  if (!file || !file.size) return null;
  if (!allowed[folder].has(file.type)) {
    throw Object.assign(new Error(`Unsupported ${folder} file type`), { status: 400, code: 'VALIDATION_ERROR' });
  }
  const limit = folder === 'images' ? 12 * 1024 * 1024 : 30 * 1024 * 1024;
  if (file.size > limit) {
    throw Object.assign(new Error(`${folder} file is too large`), { status: 400, code: 'VALIDATION_ERROR' });
  }

  const filename = `${randomUUID()}${extensions[file.type]}`;
  const dir = join(root, folder);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = join(dir, filename);
  await Bun.write(filePath, buffer);

  return `/files/${folder}/${filename}`;
}

export async function removeStoredFile(publicPath: string | null | undefined) {
  if (!publicPath) return;
  const match = PUBLIC_PATH.exec(publicPath);
  if (!match) return;

  const folder = match[1];
  const filename = match[2];
  const filePath = join(root, folder, filename);
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch {
    // Ignore error if file is already deleted or locked
  }
}

export async function readStoredFile(folder: string, filename: string) {
  if (!['images', 'documents'].includes(folder) || !FILENAME.test(filename)) return null;

  const filePath = join(root, folder, filename);
  if (!existsSync(filePath)) return null;

  try {
    const data = readFileSync(filePath);
    const ext = extname(filename).toLowerCase();
    const contentType = contentTypes[ext] ?? (folder === 'images' ? 'image/jpeg' : 'application/pdf');
    return { filename, contentType, data, path: filePath };
  } catch {
    return null;
  }
}

export function fileResponse(file: { filename: string; contentType: string; data: Buffer }, inline = false) {
  const headers: Record<string, string> = {
    'content-type': file.contentType,
    'x-content-type-options': 'nosniff'
  };
  if (inline) {
    headers['content-disposition'] = `inline; filename="${file.filename}"`;
  }
  return new Response(new Uint8Array(file.data), { headers });
}
