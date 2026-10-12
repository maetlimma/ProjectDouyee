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
  .listen(3007);

console.log('Test fullstack server running on port 3007');

const res1 = await fetch('http://localhost:3007/');
console.log('Request to / status:', res1.status);
console.log('Request to / content-type:', res1.headers.get('Content-Type'));
const html = await res1.text();
console.log('HTML preview:', html.substring(0, 500));

// Find script tags in HTML
const match = html.match(/<script[^>]*src="([^"]*)"/);
if (match) {
  const scriptUrl = new URL(match[1], 'http://localhost:3007/').toString();
  console.log('Detected script URL:', scriptUrl);
  const res2 = await fetch(scriptUrl);
  console.log('Script status:', res2.status);
  console.log('Script content-type:', res2.headers.get('Content-Type'));
  console.log('Script body:', await res2.text().then(t => t.substring(0, 300)));
} else {
  console.log('No script src detected in HTML!');
}

process.exit(0);
