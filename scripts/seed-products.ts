// Loads the committed product seed (seed/products) into storage and PostgreSQL.
// Safe to run on every start: files are copied when missing, and each sku is inserted only once.
// Usage: bun run db:seed
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pool } from '../src/db/pool';
import { saveProduct, type ProductInput } from '../src/services/products';

const seedDir = join(import.meta.dir, '../seed/products');
const storageRoot = resolve(process.env.FILE_STORAGE_DIR ?? 'storage');
const SEED_ACTOR = 'seed';

// Storage is not persistent on the host, so seed files are restored on every start (also when a rebuild changed them)
export async function restoreSeedFiles() {
  let copied = 0;
  for (const folder of ['images', 'documents']) {
    const source = join(seedDir, 'files', folder);
    const target = join(storageRoot, folder);
    await mkdir(target, { recursive: true });
    for (const name of await readdir(source)) {
      const dest = join(target, name);
      if (existsSync(dest) && statSync(dest).size === statSync(join(source, name)).size) continue;
      await copyFile(join(source, name), dest);
      copied++;
    }
  }
  return copied;
}

export async function seedProducts() {
  const manifest = (await Bun.file(join(seedDir, 'manifest.json')).json()) as { products: ProductInput[] };
  const copied = await restoreSeedFiles();
  let inserted = 0;
  let refreshed = 0;
  for (const product of manifest.products) {
    const seeded = await pool.query('SELECT 1 FROM product_seed WHERE sku = $1', [product.sku]);
    if (seeded.rowCount) {
      // Rows no admin has saved since seeding follow the current manifest
      const untouched = await pool.query(
        `SELECT product_id, version, product_name, series, brand, title, specification, specification_en,
                main_image, other_image, datasheet_pdf, certificate_pdf, other
         FROM product WHERE sku = $1 AND update_by = $2`,
        [product.sku, SEED_ACTOR]
      );
      const row = untouched.rows[0];
      if (row && !sameSeedContent(row, product)) {
        await saveProduct(product, SEED_ACTOR, row.product_id, row.version);
        refreshed++;
      }
      continue;
    }
    // A product with this sku may already have been created by hand; never overwrite it
    const existing = await pool.query('SELECT 1 FROM product WHERE sku = $1', [product.sku]);
    if (!existing.rowCount) {
      await saveProduct(product, SEED_ACTOR);
      inserted++;
    }
    await pool.query('INSERT INTO product_seed (sku) VALUES ($1) ON CONFLICT DO NOTHING', [product.sku]);
  }
  return { total: manifest.products.length, inserted, refreshed, copied };
}

// JSONB does not keep key order, so compare with sorted keys
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical((value as Record<string, unknown>)[k])]));
  }
  return value ?? null;
}

function sameSeedContent(row: Record<string, unknown>, product: ProductInput) {
  const pick = (p: Record<string, unknown>) =>
    JSON.stringify(canonical([
      p.product_name, p.series, p.brand, p.title, p.specification, p.specification_en,
      p.main_image, p.other_image, p.datasheet_pdf, p.certificate_pdf, p.other
    ]));
  return pick(row) === pick(product as unknown as Record<string, unknown>);
}

if (import.meta.main) {
  try {
    const result = await seedProducts();
    console.info(`Product seed: ${result.inserted} inserted, ${result.refreshed} refreshed, ${result.copied} files restored (${result.total} in manifest)`);
  } finally {
    await pool.end();
  }
}
