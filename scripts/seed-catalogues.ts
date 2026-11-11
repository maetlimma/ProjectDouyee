// Loads the committed catalogue seed (seed/catalogues) into storage and PostgreSQL.
// Safe to run on every start: the PDF is restored when missing, and each catalogue is inserted only once.
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pool } from '../src/db/pool';

const seedDir = join(import.meta.dir, '../seed/catalogues');
const storageRoot = resolve(process.env.FILE_STORAGE_DIR ?? 'storage');

interface SeedCatalogue {
  catalogue_id: string;
  catalogue_name: string;
  catalogue_pdf: string;
}

export async function seedCatalogues() {
  const manifest = (await Bun.file(join(seedDir, 'manifest.json')).json()) as { catalogues: SeedCatalogue[] };

  // Storage is not persistent on the host, so the PDFs are restored on every start
  const target = join(storageRoot, 'documents');
  await mkdir(target, { recursive: true });
  let copied = 0;
  for (const name of await readdir(join(seedDir, 'files'))) {
    const source = join(seedDir, 'files', name);
    const dest = join(target, name);
    if (existsSync(dest) && statSync(dest).size === statSync(source).size) continue;
    await copyFile(source, dest);
    copied++;
  }

  let inserted = 0;
  for (const c of manifest.catalogues) {
    const seeded = await pool.query('SELECT 1 FROM catalogue_seed WHERE catalogue_id = $1', [c.catalogue_id]);
    if (seeded.rowCount) continue;
    const result = await pool.query(
      `INSERT INTO catalogue (catalogue_id, catalogue_name, catalogue_pdf, create_by, update_by)
       VALUES ($1, $2, $3, 'seed', 'seed') ON CONFLICT (catalogue_id) DO NOTHING`,
      [c.catalogue_id, c.catalogue_name, c.catalogue_pdf]
    );
    inserted += result.rowCount ?? 0;
    await pool.query('INSERT INTO catalogue_seed (catalogue_id) VALUES ($1) ON CONFLICT DO NOTHING', [c.catalogue_id]);
  }
  return { total: manifest.catalogues.length, inserted, copied };
}

if (import.meta.main) {
  try {
    const result = await seedCatalogues();
    console.info(`Catalogue seed: ${result.inserted} inserted, ${result.copied} files restored (${result.total} in manifest)`);
  } finally {
    await pool.end();
  }
}
