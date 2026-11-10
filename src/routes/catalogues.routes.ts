import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { randomUUID } from 'node:crypto';
import { deleteCatalogue, getCatalogue, listCatalogues, saveCatalogue } from '../services/catalogues';
import { fileResponse, readStoredFile, removeStoredFile, saveUpload } from '../services/files';
import { actor, fileValue, secured, uuid } from '../middlewares/auth';
import { fail, statusError } from '../middlewares/errors';
import { jwtSecret } from '../config';

const coverCache = new Map<string, Buffer>();

export const catalogueRoutes = new Elysia({ prefix: '/catalogue' })
  .use(jwt({ name: 'jwt', secret: jwtSecret, exp: '12h' }))
  .post('/', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt);
      const b = body as any;
      const name = String(b.catalogue_name ?? '').trim();
      if (!name) fail(400, 'VALIDATION_ERROR', 'catalogue_name is required', { field: 'catalogue_name', message: 'Required' });
      const pdf = await saveUpload(fileValue(b.catalogue_pdf_file), 'documents');
      set.status = 201;
      return await saveCatalogue({ catalogue_id: randomUUID(), catalogue_name: name, catalogue_pdf: pdf ?? b.catalogue_pdf ?? null }, user);
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({
      catalogue_name: t.String({ minLength: 1 }),
      catalogue_pdf: t.Optional(t.Union([t.String(), t.Null()])),
      catalogue_pdf_file: t.Optional(t.File())
    }),
    detail: { ...secured, tags: ['Catalogues'], summary: 'Create catalogue', description: 'Accepts JSON or multipart form data. Upload a PDF using catalogue_pdf_file.' }
  })
  .put('/', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt);
      const b = body as any;
      const id = uuid(String(b.catalogue_id ?? ''), 'catalogue_id');
      const old = await getCatalogue(id);
      if (!old) fail(404, 'NOT_FOUND', 'Catalogue not found');
      const name = String(b.catalogue_name ?? '').trim();
      if (!name) fail(400, 'VALIDATION_ERROR', 'catalogue_name is required', { field: 'catalogue_name', message: 'Required' });
      const pdf = await saveUpload(fileValue(b.catalogue_pdf_file), 'documents');
      const updated = await saveCatalogue({ catalogue_id: id, catalogue_name: name, catalogue_pdf: pdf ?? b.catalogue_pdf ?? old.catalogue_pdf }, user, true);
      if (old.catalogue_pdf) coverCache.delete(old.catalogue_pdf.split('/').pop()!);
      if (pdf && old.catalogue_pdf && old.catalogue_pdf !== pdf) await removeStoredFile(old.catalogue_pdf);
      return updated;
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({
      catalogue_id: t.String({ format: 'uuid' }),
      catalogue_name: t.String({ minLength: 1 }),
      catalogue_pdf: t.Optional(t.Union([t.String(), t.Null()])),
      catalogue_pdf_file: t.Optional(t.File())
    }),
    detail: { ...secured, tags: ['Catalogues'], summary: 'Update catalogue' }
  })
  .get('/', async ({ query, set }) => {
    try {
      const page = Math.max(1, Math.floor(Number(query.page) || 1));
      const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit) || 20)));
      const order = String(query.order ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
      return await listCatalogues({ page, limit, sort: String(query.sort ?? 'catalogue_name'), order, search: query.search ? String(query.search) : undefined });
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      sort: t.Optional(t.String()),
      order: t.Optional(t.String()),
      search: t.Optional(t.String())
    }),
    detail: { tags: ['Catalogues'], summary: 'List catalogues', description: 'Paginated, searchable and sorted catalogue list.' }
  })
  .delete('/', async ({ body, request, jwt, set }) => {
    try {
      await actor(request, jwt);
      const id = uuid(String((body as any)?.catalogue_id ?? ''), 'catalogue_id');
      const old = await getCatalogue(id);
      if (!old) fail(404, 'NOT_FOUND', 'Catalogue not found');
      await deleteCatalogue(id);
      if (old.catalogue_pdf) coverCache.delete(old.catalogue_pdf.split('/').pop()!);
      await removeStoredFile(old.catalogue_pdf);
      set.status = 204;
      return;
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({ catalogue_id: t.String({ format: 'uuid' }) }),
    detail: { ...secured, tags: ['Catalogues'], summary: 'Delete catalogue' }
  })
  .get('/:id/pdf', async ({ params, request, jwt, set }) => {
    try {
      await actor(request, jwt);
      const catalogue = await getCatalogue(uuid(params.id, 'catalogue_id'));
      if (!catalogue) fail(404, 'NOT_FOUND', 'Catalogue not found');
      if (!catalogue.catalogue_pdf) fail(404, 'NOT_FOUND', 'Catalogue PDF is not available');
      const file = await readStoredFile('documents', catalogue.catalogue_pdf.split('/').pop()!);
      if (!file) fail(404, 'NOT_FOUND', 'Catalogue PDF file not found');
      return fileResponse(file, true);
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    detail: { ...secured, tags: ['Catalogues'], summary: 'View catalogue PDF' }
  })
  .get('/:id/cover', async ({ params, request, jwt, query, set }) => {
    try {
      const qToken = (query as any)?.token;
      if (qToken) {
        const payload = await jwt.verify(qToken);
        if (!payload) fail(401, 'UNAUTHORIZED', 'Invalid token');
      } else {
        await actor(request, jwt);
      }

      const catalogue = await getCatalogue(uuid(params.id, 'catalogue_id'));
      if (!catalogue) fail(404, 'NOT_FOUND', 'Catalogue not found');
      if (!catalogue.catalogue_pdf) fail(404, 'NOT_FOUND', 'Catalogue PDF is not available');

      const filename = catalogue.catalogue_pdf.split('/').pop()!;
      const cached = coverCache.get(filename);
      if (cached) {
        return new Response(new Uint8Array(cached), {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
            'Content-Length': String(cached.length)
          }
        });
      }

      const file = await readStoredFile('documents', filename);
      if (!file) fail(404, 'NOT_FOUND', 'Catalogue PDF file not found');

      const mupdf = await import('mupdf');
      const buf = new mupdf.Buffer(file.data);
      const doc = mupdf.Document.openDocument(buf, 'application/pdf');
      const page = doc.loadPage(0);
      const [, y0, , y1] = page.getBounds();
      const targetHeight = 800;
      const scale = targetHeight / Math.max(1, y1 - y0);
      const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false, true);
      const jpeg = Buffer.from(pixmap.asJPEG(85));
      coverCache.set(filename, jpeg);

      return new Response(new Uint8Array(jpeg), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
          'Content-Length': String(jpeg.length)
        }
      });
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    query: t.Object({
      token: t.Optional(t.String())
    }),
    detail: { ...secured, tags: ['Catalogues'], summary: 'View catalogue first page cover as JPEG image' }
  });
