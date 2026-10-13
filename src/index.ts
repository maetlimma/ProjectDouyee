import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { staticPlugin } from '@elysiajs/static';
import { join, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { initDb, getUsers, getProducts, saveProducts, Product, getTaxonomy, saveTaxonomy } from './db';

// Initialize Database on startup
await initDb();

// Port configuration
const PORT = process.env.PORT || 3000;

// Uploads and Public directory configuration
const PUBLIC_DIR = join(import.meta.dir, '../public');
const UPLOADS_DIR = join(PUBLIC_DIR, 'uploads');
const htmlPath = join(PUBLIC_DIR, 'index.html');
const htmlBundle = await import(htmlPath);
const adminHtmlPath = join(PUBLIC_DIR, 'admin.html');
const adminHtmlBundle = await import(adminHtmlPath);

// Ensure upload directory exists
if (!existsSync(PUBLIC_DIR)) {
  mkdirSync(PUBLIC_DIR, { recursive: true });
}
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Memory cache for OTP challenges (OTP: { email, code, expiresAt })
interface OtpChallenge {
  email: string;
  code: string;
  expiresAt: number;
}
const otpStore = new Map<string, OtpChallenge>();

const ASSETS_DIR = join(PUBLIC_DIR, 'assets');

// Serve a single file from a folder; names with path separators are rejected to block traversal
function serveFile(dir: string, filename: string, set: { status?: number | string }) {
  if (!filename || filename !== basename(filename) || filename.includes('\\') || filename.startsWith('.')) {
    set.status = 404;
    return 'File not found';
  }
  const file = Bun.file(join(dir, filename));
  if (file.size === 0) {
    set.status = 404;
    return 'File not found';
  }
  return file;
}

// Elysia Application Setup
const app = new Elysia()
  .use(cors())
  .use(
    jwt({
      name: 'jwt',
      secret: 'douyee-super-secret-key-2026'
    })
  )
  // Serve Dynamic Uploads bypassing static cache
  .get('/uploads/:filename', ({ params: { filename }, set }) => serveFile(UPLOADS_DIR, filename, set))
  // Serve public site artwork
  .get('/assets/:filename', ({ params: { filename }, set }) => serveFile(ASSETS_DIR, filename, set))
  .use(
    await staticPlugin({
      assets: PUBLIC_DIR,
      prefix: '/',
      noCache: true,
      alwaysStatic: false
    })
  )
  // Error handling middleware
  .onError(({ code, error, set }) => {
    console.error(`[SERVER ERROR] Code: ${code}, Message: ${error.message}`);
    set.status = 500;
    return { success: false, error: error.message };
  })
  // Helper derived method to authenticate requests
  .derive(({ jwt, request }) => {
    return {
      getAdminUser: async () => {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return null;
        }
        const token = authHeader.substring(7);
        const payload = await jwt.verify(token);
        if (!payload || !payload.userId) {
          return null;
        }
        return payload;
      }
    };
  })
  // Public Endpoint: Retrieve the active category taxonomy
  .get('/api/taxonomy', async () => {
    return await getTaxonomy();
  })
  // Administrative Endpoint: Sync categories taxonomy
  .post('/api/admin/taxonomy', async ({ body, getAdminUser, set }) => {
    const admin = await getAdminUser();
    if (!admin) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }
    await saveTaxonomy(body as any);
    return { success: true };
  })
  // Public Endpoint: Retrieve all visible products
  .get('/api/products', async () => {
    const products = await getProducts();
    const now = new Date();
    // Return only active products matching timing constraints
    return products.filter((product) => {
      if (product.status !== 'enabled') {
        return false;
      }
      if (product.publishAt && new Date(product.publishAt) > now) {
        return false;
      }
      if (product.expireAt && new Date(product.expireAt) < now) {
        return false;
      }
      return true;
    });
  })
  // Public Endpoint: Retrieve a single visible product by ID
  .get('/api/products/:id', async ({ params: { id }, set }) => {
    const products = await getProducts();
    const product = products.find((p) => p.id === id);
    if (!product) {
      set.status = 404;
      return { success: false, error: 'Product not found' };
    }
    const now = new Date();
    const isActive =
      product.status === 'enabled' &&
      (!product.publishAt || new Date(product.publishAt) <= now) &&
      (!product.expireAt || new Date(product.expireAt) >= now);

    if (!isActive) {
      set.status = 403;
      return { success: false, error: 'Product is currently not visible' };
    }
    return product;
  })
  // Auth: Email/Password login challenge
  .post(
    '/api/auth/login',
    async ({ body: { email, password }, set }) => {
      const users = await getUsers();
      const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        set.status = 401;
        return { success: false, error: 'Invalid email or password' };
      }

      const match = await Bun.password.verify(password, user.passwordHash);
      if (!match) {
        set.status = 401;
        return { success: false, error: 'Invalid email or password' };
      }

      // Generate a 6-digit random OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const challengeToken = crypto.randomUUID();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

      otpStore.set(challengeToken, {
        email: user.email,
        code: otpCode,
        expiresAt
      });

      // Console logging for local authentication
      console.log(`\n======================================================`);
      console.log(`[ADMIN AUTH] OTP for ${user.email}: ${otpCode}`);
      console.log(`[ADMIN AUTH] Challenge Token: ${challengeToken}`);
      console.log(`[ADMIN AUTH] Expires in: 5 minutes`);
      console.log(`======================================================\n`);

      return {
        success: true,
        challengeToken,
        message: 'OTP code generated. Check server console for log output.',
        ...(process.env.NODE_ENV === 'test' ? { testOtp: otpCode } : {})
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String()
      })
    }
  )
  // Auth: OTP code verification to issue JWT session token
  .post(
    '/api/auth/verify-otp',
    async ({ body: { challengeToken, otpCode }, jwt, set }) => {
      const challenge = otpStore.get(challengeToken);
      if (!challenge) {
        set.status = 400;
        return { success: false, error: 'Invalid or expired login challenge' };
      }

      if (Date.now() > challenge.expiresAt) {
        otpStore.delete(challengeToken);
        set.status = 400;
        return { success: false, error: 'Login challenge has expired' };
      }

      if (challenge.code !== otpCode) {
        set.status = 401;
        return { success: false, error: 'Incorrect OTP code entered' };
      }

      // Successful verification - clear OTP and issue JWT
      otpStore.delete(challengeToken);
      const token = await jwt.sign({
        userId: challenge.email,
        email: challenge.email
      });

      return {
        success: true,
        token,
        email: challenge.email
      };
    },
    {
      body: t.Object({
        challengeToken: t.String(),
        otpCode: t.String()
      })
    }
  )
  // Protected Endpoint: Verify authentication state
  .get('/api/auth/me', async ({ getAdminUser, set }) => {
    const admin = await getAdminUser();
    if (!admin) {
      set.status = 401;
      return { success: false, error: 'Unauthorized session' };
    }
    return { success: true, email: admin.email };
  })
  // Protected Admin Endpoint: Retrieve all products in ledger
  .get('/api/admin/products', async ({ getAdminUser, set }) => {
    const admin = await getAdminUser();
    if (!admin) {
      set.status = 401;
      return { success: false, error: 'Unauthorized session' };
    }
    const products = await getProducts();
    return products;
  })
  // Protected Admin Endpoint: Retrieve single product for edit form
  .get('/api/admin/products/:id', async ({ params: { id }, getAdminUser, set }) => {
    const admin = await getAdminUser();
    if (!admin) {
      set.status = 401;
      return { success: false, error: 'Unauthorized session' };
    }
    const products = await getProducts();
    const product = products.find((p) => p.id === id);
    if (!product) {
      set.status = 404;
      return { success: false, error: 'Product not found' };
    }
    return product;
  })
  // Protected Admin Endpoint: Create new product listing
  .post(
    '/api/products',
    async ({ body, getAdminUser, set }) => {
      const admin = await getAdminUser();
      if (!admin) {
        set.status = 401;
        return { success: false, error: 'Unauthorized session' };
      }

      const products = await getProducts();
      const newProduct: Product = {
        ...body,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };

      products.push(newProduct);
      await saveProducts(products);

      return { success: true, product: newProduct };
    },
    {
      body: t.Object({
        title: t.Object({ en: t.String(), zh: t.String(), th: t.Optional(t.String()) }),
        sku: t.String(),
        department: t.String(),
        subCategory: t.Object({ en: t.String(), zh: t.String(), th: t.Optional(t.String()) }),
        status: t.Union([t.Literal('enabled'), t.Literal('disabled')]),
        publishAt: t.Optional(t.Union([t.String(), t.Null()])),
        expireAt: t.Optional(t.Union([t.String(), t.Null()])),
        imagePaths: t.Array(t.String()),
        pdfPaths: t.Array(t.String()),
        contentBlocks: t.Array(t.Any()),
        technicalMatrix: t.Array(t.Any()),
        brand: t.Optional(t.String())
      })
    }
  )
  // Protected Admin Endpoint: Update existing product listing
  .put(
    '/api/products/:id',
    async ({ params: { id }, body, getAdminUser, set }) => {
      const admin = await getAdminUser();
      if (!admin) {
        set.status = 401;
        return { success: false, error: 'Unauthorized session' };
      }

      const products = await getProducts();
      const idx = products.findIndex((p) => p.id === id);
      if (idx === -1) {
        set.status = 404;
        return { success: false, error: 'Product not found' };
      }

      const updatedProduct: Product = {
        ...products[idx],
        ...body,
        id // Keep original ID
      };

      products[idx] = updatedProduct;
      await saveProducts(products);

      return { success: true, product: updatedProduct };
    },
    {
      body: t.Object({
        title: t.Object({ en: t.String(), zh: t.String(), th: t.Optional(t.String()) }),
        sku: t.String(),
        department: t.String(),
        subCategory: t.Object({ en: t.String(), zh: t.String(), th: t.Optional(t.String()) }),
        status: t.Union([t.Literal('enabled'), t.Literal('disabled')]),
        publishAt: t.Optional(t.Union([t.String(), t.Null()])),
        expireAt: t.Optional(t.Union([t.String(), t.Null()])),
        imagePaths: t.Array(t.String()),
        pdfPaths: t.Array(t.String()),
        contentBlocks: t.Array(t.Any()),
        technicalMatrix: t.Array(t.Any()),
        brand: t.Optional(t.String())
      })
    }
  )
  // Protected Admin Endpoint: Remove product listing from catalog
  .delete('/api/products/:id', async ({ params: { id }, getAdminUser, set }) => {
    const admin = await getAdminUser();
    if (!admin) {
      set.status = 401;
      return { success: false, error: 'Unauthorized session' };
    }

    const products = await getProducts();
    const filtered = products.filter((p) => p.id !== id);
    if (filtered.length === products.length) {
      set.status = 404;
      return { success: false, error: 'Product not found' };
    }

    await saveProducts(filtered);
    return { success: true, message: 'Product deleted' };
  })
  // Protected Admin Endpoint: Handle multiple file uploads
  .post(
    '/api/upload',
    async ({ body, getAdminUser, set }) => {
      const admin = await getAdminUser();
      if (!admin) {
        set.status = 401;
        return { success: false, error: 'Unauthorized session' };
      }

      try {
        const files = body && (body as any).files;
        if (!files) {
          set.status = 400;
          return { success: false, error: 'No files provided for upload' };
        }

        const fileList = Array.isArray(files) ? files : [files];
        const savedPaths: string[] = [];

        for (const file of fileList) {
          if (!file || !file.name) continue;
          // Generate unique name and preserve safe characters
          const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const uniqueName = `${Date.now()}-${cleanName}`;
          const destPath = join(UPLOADS_DIR, uniqueName);

          // Write file binary using Bun's native fast writer
          await Bun.write(destPath, file);
          savedPaths.push(`/uploads/${uniqueName}`);
        }

        return { success: true, paths: savedPaths };
      } catch (e: any) {
        set.status = 500;
        return { success: false, error: e.message };
      }
    },
    {
      body: t.Object({
        files: t.Any()
      })
    }
  )
  // Catch-All Route for Admin and Client SPAs (Fallback for browser navigation routing)
  .get('/admin', adminHtmlBundle.default)
  .get('/admin/*', adminHtmlBundle.default)
  .get('/', htmlBundle.default)
  .get('/*', htmlBundle.default)
  .listen(PORT);

console.log(`[FULLSTACK SERVER] Elysia runs on http://localhost:${PORT}`);
export { app };
