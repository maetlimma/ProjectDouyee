import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { join } from 'path';

const PUBLIC_DIR = join(import.meta.dir, 'public');

const app = new Elysia()
  .use(await staticPlugin({
    assets: PUBLIC_DIR,
    prefix: '/',
    noCache: true,
    bunFullstack: true
  }))
  .get('/products', () => 'exact products')
  .get('/', () => 'root homepage')
  .get('/*', () => 'wildcard SPA fallback')
  .listen(3006);

console.log('Test static server running on port 3006');

const res1 = await fetch('http://localhost:3006/index.tsx');
console.log('Request to /index.tsx ->', res1.status, res1.headers.get('Content-Type'), await res1.text().then(t => t.substring(0, 200)));

process.exit(0);
