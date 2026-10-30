import { mkdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = resolve(process.env.FILE_STORAGE_DIR ?? 'storage');
const allowed: Record<string, Set<string>> = {
  images: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  documents: new Set(['application/pdf'])
};
const extensions: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'application/pdf': '.pdf'
};

export async function saveUpload(file: File | undefined, folder: 'images' | 'documents') {
  if (!file || !file.size) return null;
  if (!allowed[folder].has(file.type)) throw Object.assign(new Error(`Unsupported ${folder} file type`), { status: 400, code: 'VALIDATION_ERROR' });
  const limit = folder === 'images' ? 12 * 1024 * 1024 : 30 * 1024 * 1024;
  if (file.size > limit) throw Object.assign(new Error(`${folder} file is too large`), { status: 400, code: 'VALIDATION_ERROR' });
  const extension = extensions[file.type];
  const filename = `${randomUUID()}${extension}`;
  const directory = join(root, folder);
  await mkdir(directory, { recursive: true });
  await Bun.write(join(directory, filename), file);
  return `/files/${folder}/${filename}`;
}

export async function removeStoredFile(publicPath: string | null | undefined) {
  if (!publicPath) return;
  const match = /^\/files\/(images|documents)\/([a-zA-Z0-9-]+\.[a-zA-Z0-9]+)$/.exec(publicPath);
  if (!match) return;
  try { await unlink(join(root, match[1], match[2])); } catch { /* already removed */ }
}

export function resolveStoredFile(folder: string, filename: string) {
  if (!['images', 'documents'].includes(folder) || !/^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(filename)) return null;
  return join(root, folder, filename);
}
