import { resolve } from 'node:path';
import { migrate } from './migrate';

const projectRoot = resolve(import.meta.dir, '..');
const docker = Bun.spawn(['docker', 'compose', 'up', '-d', '--wait'], {
  cwd: projectRoot,
  stdout: 'inherit',
  stderr: 'inherit'
});
const dockerExit = await docker.exited;
if (dockerExit !== 0) process.exit(dockerExit);

await migrate('up');

const { seedProducts } = await import('./seed-products');
const { pool } = await import('../src/db/pool');
const seeded = await seedProducts();
console.info(`Product seed: ${seeded.inserted} inserted, ${seeded.refreshed} refreshed, ${seeded.copied} files restored`);
const { seedCatalogues } = await import('./seed-catalogues');
const catalogues = await seedCatalogues();
console.info(`Catalogue seed: ${catalogues.inserted} inserted, ${catalogues.copied} files restored`);
await pool.end();
