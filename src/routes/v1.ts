import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { deleteProduct, getProduct, listProductsGrouped, prepareProductWrite, saveProduct } from '../services/products';
import { deleteCertificate, deleteSeries, getCertificate, listCertificates, listSeries, saveCertificate, saveSeries } from '../services/lookups';
import { removeStoredFile, resolveStoredFile, saveUpload } from '../services/files';
import { deleteCatalogue, getCatalogue, listCatalogues, saveCatalogue } from '../services/catalogues';
import { randomUUID } from 'node:crypto';
import { jwtSecret } from '../config';

function fail(status: number, code: string, message: string, details?: unknown): never {
  throw Object.assign(new Error(message), { status, code, details });
}
function uuid(value: string, field = 'product_id') {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) fail(400, 'VALIDATION_ERROR', `${field} must be a UUID`, { field, message: 'Must be a UUID' });
  return value;
}
async function actor(request: Request, jwt: { verify: (token: string) => Promise<any> }) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const payload = token ? await jwt.verify(token) : false;
  if (!payload?.email) fail(401, 'UNAUTHORIZED', 'A valid admin bearer token is required');
  return String(payload.email);
}
function fileValue(value: unknown): File | undefined { return value instanceof File ? value : undefined; }
function statusError(error: any) {
  if (error?.code === 'VALIDATION') {
    const details = error.all?.map((issue: any) => ({ field: String(issue.path ?? '').replace(/^\//, ''), message: issue.message })) ?? error.message;
    return { status: 400, code: 'VALIDATION_ERROR', message: 'Request validation failed', details };
  }
  if (error?.code === '23505') return { status: 409, code: 'CONFLICT', message: 'A record with this key already exists' };
  if (error?.code === '23503') return { status: 409, code: 'CONFLICT', message: 'The record is referenced by another resource' };
  if (error?.code === '42P01' || error?.code === '42703') {
    console.error('[DATABASE SCHEMA]', error.code, error.message);
    return { status: 503, code: 'DATABASE_SCHEMA_NOT_READY', message: 'The product API database schema is missing or outdated. Run `bun run db:migrate`.' };
  }
  if (['EACCES', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', '08001', '08006', '3D000', '57P03'].includes(error?.code)) {
    console.error('[DATABASE CONNECTION]', error.code, error.message);
    return { status: 503, code: 'DATABASE_UNAVAILABLE', message: 'Cannot connect to PostgreSQL. Start the database and check DATABASE_URL.' };
  }
  if (error?.code === '28P01') {
    console.error('[DATABASE AUTH]', error.code, error.message);
    return { status: 503, code: 'DATABASE_AUTH_FAILED', message: 'PostgreSQL rejected the configured credentials. Check DATABASE_URL.' };
  }
  if (error?.status) return { status: error.status, code: error.code ?? 'REQUEST_ERROR', message: error.message, details: error.details };
  console.error('[API ERROR]', error?.code ?? 'UNKNOWN', error?.message ?? error);
  return { status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred' };
}
const jsonField = t.Union([t.String(), t.Array(t.Any()), t.Record(t.String(), t.Any())]);
const productFields = {
  sku: t.String({ minLength: 1 }), product_name: t.String({ minLength: 1 }), series: t.String({ minLength: 1 }),
  brand: t.Optional(t.Union([t.String(), t.Null()])), title: t.Optional(t.Union([t.String(), t.Null()])),
  main_image: t.Optional(t.Union([t.String(), t.Null()])), other_image: t.Optional(jsonField),
  specification: t.Optional(jsonField), specification_en: t.Optional(jsonField), size_weights: t.Optional(jsonField),
  datasheet_pdf: t.Optional(t.Union([t.String(), t.Null()])), certificate_pdf: t.Optional(t.Union([t.String(), t.Null()])),
  other: t.Optional(jsonField), certificate_codes: t.Optional(t.Union([t.String(), t.Array(t.String())])),
  main_image_file: t.Optional(t.File()), other_image_files: t.Optional(t.Files()),
  datasheet_pdf_file: t.Optional(t.File()), certificate_pdf_file: t.Optional(t.File())
};
const productCreateBody = t.Object(productFields);
const productUpdateBody = t.Object({ ...productFields, product_id: t.String({ format: 'uuid' }) });
const secured = { security: [{ BearerAuth: [] }] };

export const apiV1 = new Elysia({ prefix: '/api/v1' })
  .use(jwt({ name: 'jwt', secret: jwtSecret, exp: '12h' }))
  .onError(({ error, set }) => {
    const result = statusError(error);
    set.status = result.status;
    return { error: { code: result.code, message: result.message, ...(result.details ? { details: result.details } : {}) } };
  })
  .post('/product', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt);
      const product = await saveProduct(await prepareProductWrite(body as any), user);
      set.status = 201; return product;
    } catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { body: productCreateBody, detail: { ...secured, tags: ['Products'], summary: 'Create product', description: 'Accepts JSON or multipart form data. For files, use main_image_file, other_image_files, datasheet_pdf_file and certificate_pdf_file.' } })
  .put('/product', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt); const raw = body as any;
      const id = uuid(String(raw.product_id ?? ''));
      const old = await getProduct(id); if (!old) fail(404, 'NOT_FOUND', 'Product not found');
      const input = await prepareProductWrite(raw, old);
      const next = await saveProduct(input, user, id);
      const keep = new Set([input.main_image, input.datasheet_pdf, input.certificate_pdf, ...(input.other_image ?? [])]);
      for (const path of [old.main_image, old.datasheet_pdf, old.certificate_pdf, ...(old.other_image ?? [])]) if (path && !keep.has(path)) await removeStoredFile(String(path));
      return next;
    } catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { body: productUpdateBody, detail: { ...secured, tags: ['Products'], summary: 'Update product' } })
  .get('/product', async ({ request, jwt, set }) => {
    try { await actor(request, jwt); return await listProductsGrouped(); }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { detail: { ...secured, tags: ['Products'], summary: 'List products grouped by series' } })
  .get('/product/:id', async ({ params, request, jwt, set }) => {
    try { await actor(request, jwt); const product = await getProduct(uuid(params.id)); if (!product) fail(404, 'NOT_FOUND', 'Product not found'); return product; }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { detail: { ...secured, tags: ['Products'], summary: 'Get product by ID' } })
  .delete('/product', async ({ body, request, jwt, set }) => {
    try { await actor(request, jwt); const id = uuid(String((body as any)?.product_id ?? '')); const old: any = await getProduct(id); if (!old) fail(404, 'NOT_FOUND', 'Product not found'); await deleteProduct(id); for (const path of [old.main_image, old.datasheet_pdf, old.certificate_pdf, ...(old.other_image ?? [])]) await removeStoredFile(path); set.status = 204; return; }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { body: t.Object({ product_id: t.String({ format: 'uuid' }) }), detail: { ...secured, tags: ['Products'], summary: 'Delete product' } })
  .get('/product/:id/datasheet', async ({ params, request, jwt, set }) => {
    try { await actor(request, jwt); const p: any = await getProduct(uuid(params.id)); if (!p) fail(404, 'NOT_FOUND', 'Product not found'); if (!p.datasheet_pdf) fail(404, 'NOT_FOUND', 'Datasheet is not available'); const filename = p.datasheet_pdf.split('/').pop()!; const path = resolveStoredFile('documents', filename); if (!path || !(await Bun.file(path).exists())) fail(404, 'NOT_FOUND', 'Datasheet file not found'); set.headers['content-type'] = 'application/pdf'; set.headers['content-disposition'] = `inline; filename="${filename}"`; return Bun.file(path); }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { detail: { ...secured, tags: ['Products'], summary: 'Download product datasheet PDF' } })
  .get('/product/:id/certificate', async ({ params, request, jwt, set }) => {
    try { await actor(request, jwt); const p: any = await getProduct(uuid(params.id)); if (!p) fail(404, 'NOT_FOUND', 'Product not found'); if (!p.certificate_pdf) fail(404, 'NOT_FOUND', 'Certificate PDF is not available'); const filename = p.certificate_pdf.split('/').pop()!; const path = resolveStoredFile('documents', filename); if (!path || !(await Bun.file(path).exists())) fail(404, 'NOT_FOUND', 'Certificate file not found'); set.headers['content-type'] = 'application/pdf'; set.headers['content-disposition'] = `inline; filename="${filename}"`; return Bun.file(path); }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { detail: { ...secured, tags: ['Products'], summary: 'Download product certificate PDF' } })
  .post('/series', async ({ body, request, jwt, set }) => {
    try { const user = await actor(request, jwt); const b = body as any; if (!b.series_code?.trim() || !b.series_name?.trim()) fail(400, 'VALIDATION_ERROR', 'series_code and series_name are required', [{ field: 'series_code', message: 'Required' }, { field: 'series_name', message: 'Required' }].filter((item) => !b[item.field]?.trim())); set.status = 201; return await saveSeries({ series_code: b.series_code.trim(), series_name: b.series_name.trim() }, user); }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { body: t.Object({ series_code: t.String({ minLength: 1 }), series_name: t.String({ minLength: 1 }) }), detail: { ...secured, tags: ['Series'], summary: 'Create series' } })
  .put('/series', async ({ body, request, jwt, set }) => {
    try { const user = await actor(request, jwt); const b = body as any; if (!b.series_code?.trim() || !b.series_name?.trim()) fail(400, 'VALIDATION_ERROR', 'series_code and series_name are required', [{ field: 'series_code', message: 'Required' }, { field: 'series_name', message: 'Required' }].filter((item) => !b[item.field]?.trim())); const row = await saveSeries(b, user, true); if (!row) fail(404, 'NOT_FOUND', 'Series not found'); return row; }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { body: t.Object({ series_code: t.String({ minLength: 1 }), series_name: t.String({ minLength: 1 }) }), detail: { ...secured, tags: ['Series'], summary: 'Update series' } })
  .get('/series', async ({ request, jwt, set }) => { try { await actor(request, jwt); return await listSeries(); } catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; } }, { detail: { ...secured, tags: ['Series'], summary: 'List series' } })
  .delete('/series', async ({ body, request, jwt, set }) => { try { await actor(request, jwt); const code = String((body as any)?.series_code ?? '').trim(); if (!code) fail(400, 'VALIDATION_ERROR', 'series_code is required', { field: 'series_code', message: 'Required' }); if (!(await deleteSeries(code))) fail(404, 'NOT_FOUND', 'Series not found'); set.status = 204; return; } catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; } }, { body: t.Object({ series_code: t.String({ minLength: 1 }) }), detail: { ...secured, tags: ['Series'], summary: 'Delete series' } })
  .post('/catalogue', async ({ body, request, jwt, set }) => {
    try { const user = await actor(request, jwt); const b = body as any; const name = String(b.catalogue_name ?? '').trim(); if (!name) fail(400, 'VALIDATION_ERROR', 'catalogue_name is required', { field: 'catalogue_name', message: 'Required' }); const pdf = await saveUpload(fileValue(b.catalogue_pdf_file), 'documents'); set.status = 201; return await saveCatalogue({ catalogue_id: randomUUID(), catalogue_name: name, catalogue_pdf: pdf ?? b.catalogue_pdf ?? null }, user); }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { body: t.Object({ catalogue_name: t.String({ minLength: 1 }), catalogue_pdf: t.Optional(t.Union([t.String(), t.Null()])), catalogue_pdf_file: t.Optional(t.File()) }), detail: { ...secured, tags: ['Catalogues'], summary: 'Create catalogue', description: 'Accepts JSON or multipart form data. Upload a PDF using catalogue_pdf_file.' } })
  .put('/catalogue', async ({ body, request, jwt, set }) => {
    try { const user = await actor(request, jwt); const b = body as any; const id = uuid(String(b.catalogue_id ?? ''), 'catalogue_id'); const old = await getCatalogue(id); if (!old) fail(404, 'NOT_FOUND', 'Catalogue not found'); const name = String(b.catalogue_name ?? '').trim(); if (!name) fail(400, 'VALIDATION_ERROR', 'catalogue_name is required', { field: 'catalogue_name', message: 'Required' }); const pdf = await saveUpload(fileValue(b.catalogue_pdf_file), 'documents'); const updated = await saveCatalogue({ catalogue_id: id, catalogue_name: name, catalogue_pdf: pdf ?? b.catalogue_pdf ?? old.catalogue_pdf }, user, true); if (pdf && old.catalogue_pdf && old.catalogue_pdf !== pdf) await removeStoredFile(old.catalogue_pdf); return updated; }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { body: t.Object({ catalogue_id: t.String({ format: 'uuid' }), catalogue_name: t.String({ minLength: 1 }), catalogue_pdf: t.Optional(t.Union([t.String(), t.Null()])), catalogue_pdf_file: t.Optional(t.File()) }), detail: { ...secured, tags: ['Catalogues'], summary: 'Update catalogue' } })
  .get('/catalogue', async ({ request, jwt, query, set }) => {
    try { await actor(request, jwt); const page = Math.max(1, Math.floor(Number(query.page) || 1)); const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit) || 20))); const order = String(query.order ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc'; return await listCatalogues({ page, limit, sort: String(query.sort ?? 'catalogue_name'), order, search: query.search ? String(query.search) : undefined }); }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { query: t.Object({ page: t.Optional(t.String()), limit: t.Optional(t.String()), sort: t.Optional(t.String()), order: t.Optional(t.String()), search: t.Optional(t.String()) }), detail: { ...secured, tags: ['Catalogues'], summary: 'List catalogues', description: 'Paginated, searchable and sorted catalogue list.' } })
  .delete('/catalogue', async ({ body, request, jwt, set }) => {
    try { await actor(request, jwt); const id = uuid(String((body as any)?.catalogue_id ?? ''), 'catalogue_id'); const old = await getCatalogue(id); if (!old) fail(404, 'NOT_FOUND', 'Catalogue not found'); await deleteCatalogue(id); await removeStoredFile(old.catalogue_pdf); set.status = 204; return; }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { body: t.Object({ catalogue_id: t.String({ format: 'uuid' }) }), detail: { ...secured, tags: ['Catalogues'], summary: 'Delete catalogue' } })
  .get('/catalogue/:id/pdf', async ({ params, request, jwt, set }) => {
    try { await actor(request, jwt); const catalogue = await getCatalogue(uuid(params.id, 'catalogue_id')); if (!catalogue) fail(404, 'NOT_FOUND', 'Catalogue not found'); if (!catalogue.catalogue_pdf) fail(404, 'NOT_FOUND', 'Catalogue PDF is not available'); const filename = catalogue.catalogue_pdf.split('/').pop()!; const path = resolveStoredFile('documents', filename); if (!path || !(await Bun.file(path).exists())) fail(404, 'NOT_FOUND', 'Catalogue PDF file not found'); set.headers['content-type'] = 'application/pdf'; set.headers['content-disposition'] = `inline; filename="${filename}"`; return Bun.file(path); }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { detail: { ...secured, tags: ['Catalogues'], summary: 'View catalogue PDF' } })
  .post('/certificate', async ({ body, request, jwt, set }) => {
    try { const user = await actor(request, jwt); const b = body as any; if (!b.certificate_code?.trim()) fail(400, 'VALIDATION_ERROR', 'certificate_code is required', { field: 'certificate_code', message: 'Required' }); const image = await saveUpload(fileValue(b.image_file), 'images'); set.status = 201; return await saveCertificate({ certificate_code: b.certificate_code.trim(), image: image ?? b.image ?? null }, user); }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { body: t.Object({ certificate_code: t.String({ minLength: 1 }), image: t.Optional(t.Union([t.String(), t.Null()])), image_file: t.Optional(t.File()) }), detail: { ...secured, tags: ['Certificates'], summary: 'Create certificate type', description: 'Accepts JSON or multipart form data; use image_file to upload an image.' } })
  .put('/certificate', async ({ body, request, jwt, set }) => {
    try { const user = await actor(request, jwt); const b = body as any; if (!b.certificate_code?.trim()) fail(400, 'VALIDATION_ERROR', 'certificate_code is required', { field: 'certificate_code', message: 'Required' }); const code = b.certificate_code.trim(); const old = await getCertificate(code); if (!old) fail(404, 'NOT_FOUND', 'Certificate type not found'); const image = await saveUpload(fileValue(b.image_file), 'images'); const updated = await saveCertificate({ certificate_code: code, image: image ?? b.image ?? old.image }, user, true); if (image && old.image && old.image !== image) await removeStoredFile(old.image); return updated; }
    catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; }
  }, { body: t.Object({ certificate_code: t.String({ minLength: 1 }), image: t.Optional(t.Union([t.String(), t.Null()])), image_file: t.Optional(t.File()) }), detail: { ...secured, tags: ['Certificates'], summary: 'Update certificate type' } })
  .get('/certificate', async ({ request, jwt, set }) => { try { await actor(request, jwt); return await listCertificates(); } catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; } }, { detail: { ...secured, tags: ['Certificates'], summary: 'List certificate types' } })
  .delete('/certificate', async ({ body, request, jwt, set }) => { try { await actor(request, jwt); const code = String((body as any)?.certificate_code ?? '').trim(); if (!code) fail(400, 'VALIDATION_ERROR', 'certificate_code is required', { field: 'certificate_code', message: 'Required' }); const old = await getCertificate(code); if (!old) fail(404, 'NOT_FOUND', 'Certificate not found'); if (!(await deleteCertificate(code))) fail(404, 'NOT_FOUND', 'Certificate not found'); await removeStoredFile(old.image); set.status = 204; return; } catch (error) { const err = statusError(error); set.status = err.status; return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }; } }, { body: t.Object({ certificate_code: t.String({ minLength: 1 }) }), detail: { ...secured, tags: ['Certificates'], summary: 'Delete certificate type' } });
