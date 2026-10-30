import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { swagger } from '@elysiajs/swagger';
import { randomUUID } from 'node:crypto';
import { basename, join } from 'node:path';
import { staticPlugin } from '@elysiajs/static';
import { getUsers } from './legacy-auth-store';
import { apiV1 } from './routes/v1';
import { resolveStoredFile } from './services/files';

const port = Number(process.env.PORT ?? 3000);
const jwtSecret = process.env.JWT_SECRET ?? 'local-development-secret-change-me';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 characters in production.');
}
const challenges = new Map<string, { email: string; code: string; expiresAt: number }>();
const assetsDir = join(import.meta.dir, '../public/assets');

async function serveAsset(filename: string, set: { status?: number | string; headers: Record<string, string | number> }) {
  if (!filename || filename !== basename(filename) || filename.startsWith('.')) {
    set.status = 404;
    return { error: { code: 'NOT_FOUND', message: 'Asset not found' } };
  }
  const file = Bun.file(join(assetsDir, filename));
  if (!(await file.exists())) {
    set.status = 404;
    return { error: { code: 'NOT_FOUND', message: 'Asset not found' } };
  }
  set.headers['cache-control'] = 'public, max-age=86400';
  return file;
}

export const app = new Elysia()
  .use(cors())
  .use(jwt({ name: 'jwt', secret: jwtSecret, exp: '12h' }))
  .use(swagger({ documentation: { info: { title: 'Dou Yee Product API', version: '1.0.0', description: 'Product, series and certificate management API.' }, tags: [{ name: 'Auth' }, { name: 'Products' }, { name: 'Series' }, { name: 'Certificates' }], components: { securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } } } }))
  .onError(({ code, error, request, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      const details = (error as any).all?.map((issue: any) => ({ field: String(issue.path ?? '').replace(/^\//, ''), message: issue.message })) ?? error.message;
      return { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details } };
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      const path = new URL(request.url).pathname;
      return { error: { code: 'NOT_FOUND', message: path.startsWith('/api/') ? `API route not found: ${request.method} ${path}` : 'Route not found' } };
    }
    console.error(error);
    set.status = 500;
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred' } };
  })
  .get('/health', () => ({ status: 'ok' }))
  // Kept for the existing admin login UI: OTP is logged to the server console in local development.
  .post('/api/auth/login', async ({ body, set }) => {
    const users = await getUsers();
    const user = users.find((entry) => entry.email.toLowerCase() === body.email.toLowerCase());
    if (!user || !(await Bun.password.verify(body.password, user.passwordHash))) {
      set.status = 401;
      return { success: false, error: 'Invalid email or password' };
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const challengeToken = randomUUID();
    challenges.set(challengeToken, { email: user.email, code, expiresAt: Date.now() + 5 * 60_000 });
    console.info(`[ADMIN AUTH] OTP for ${user.email}: ${code}`);
    return { success: true, challengeToken, message: 'OTP code generated. Check server console.', ...(process.env.NODE_ENV === 'test' ? { testOtp: code } : {}) };
  }, { body: t.Object({ email: t.String({ format: 'email' }), password: t.String({ minLength: 1 }) }), detail: { tags: ['Auth'] } })
  .post('/api/auth/verify-otp', async ({ body, jwt, set }) => {
    const challenge = challenges.get(body.challengeToken);
    if (!challenge || challenge.expiresAt < Date.now()) {
      challenges.delete(body.challengeToken);
      set.status = 400;
      return { success: false, error: 'Invalid or expired login challenge' };
    }
    if (challenge.code !== body.otpCode) {
      set.status = 401;
      return { success: false, error: 'Incorrect OTP code entered' };
    }
    challenges.delete(body.challengeToken);
    return { success: true, token: await jwt.sign({ userId: challenge.email, email: challenge.email }), email: challenge.email };
  }, { body: t.Object({ challengeToken: t.String(), otpCode: t.String({ minLength: 6, maxLength: 6 }) }), detail: { tags: ['Auth'] } })
  .get('/api/auth/me', async ({ request, jwt, set }) => {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const user = token ? await jwt.verify(token) : false;
    if (!user || !user.email) { set.status = 401; return { success: false, error: 'Unauthorized session' }; }
    return { success: true, email: user.email };
  }, { detail: { tags: ['Auth'] } })
  .use(apiV1)
  .all('/api/*', ({ request, set }) => {
    set.status = 404;
    return { error: { code: 'NOT_FOUND', message: `API route not found: ${request.method} ${new URL(request.url).pathname}` } };
  })
  .get('/files/:folder/:filename', async ({ params, request, jwt, set }) => {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token || !(await jwt.verify(token))) { set.status = 401; return { error: { code: 'UNAUTHORIZED', message: 'A valid admin bearer token is required' } }; }
    const path = resolveStoredFile(params.folder, params.filename);
    if (!path || !(await Bun.file(path).exists())) { set.status = 404; return { error: { code: 'NOT_FOUND', message: 'File not found' } }; }
    const ext = params.filename.split('.').pop()?.toLowerCase();
    set.headers['content-type'] = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    return Bun.file(path);
  })
  // Serve artwork directly from disk; the static SPA fallback must not turn asset requests into HTML.
  .get('/assets/:filename', ({ params, set }) => serveAsset(params.filename, set))
  .use(await staticPlugin({ assets: join(import.meta.dir, '../public'), prefix: '/', alwaysStatic: false }))
  .get('/admin', await import(join(import.meta.dir, '../public/admin.html')).then((module) => module.default))
  .get('/admin/*', await import(join(import.meta.dir, '../public/admin.html')).then((module) => module.default))
  .get('/', await import(join(import.meta.dir, '../public/index.html')).then((module) => module.default))
  .get('/*', await import(join(import.meta.dir, '../public/index.html')).then((module) => module.default));

if (import.meta.main) {
  app.listen(port);
  console.info(`Dou Yee API listening at http://localhost:${port}`);
  console.info(`API docs: http://localhost:${port}/swagger`);
}
export type App = typeof app;
