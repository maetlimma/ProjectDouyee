import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { deleteProduct, getProduct, listProductsGrouped, prepareProductWrite, saveProduct } from '../services/products';
import { fileResponse, readStoredFile, removeStoredFile } from '../services/files';
import { actor, secured, uuid } from '../middlewares/auth';
import { fail, statusError } from '../middlewares/errors';
import { jwtSecret } from '../config';

const jsonField = t.Union([t.String(), t.Array(t.Any()), t.Record(t.String(), t.Any())]);

const productFields = {
  sku: t.String({ minLength: 1 }),
  product_name: t.String({ minLength: 1 }),
  series: t.String({ minLength: 1 }),
  brand: t.Optional(t.Union([t.String(), t.Null()])),
  title: t.Optional(t.Union([t.String(), t.Null()])),
  main_image: t.Optional(jsonField),
  other_image: t.Optional(jsonField),
  specification: t.Optional(jsonField),
  specification_en: t.Optional(jsonField),
  size_weights: t.Optional(jsonField),
  datasheet_pdf: t.Optional(t.Union([t.String(), t.Null()])),
  certificate_pdf: t.Optional(t.Union([t.String(), t.Null()])),
  other: t.Optional(jsonField),
  certificate_codes: t.Optional(t.Union([t.String(), t.Array(t.String())])),
  version: t.Optional(t.Union([t.Numeric(), t.String(), t.Null()])),
  expected_version: t.Optional(t.Union([t.Numeric(), t.String(), t.Null()])),
  main_image_file: t.Optional(t.File()),
  main_image_files: t.Optional(t.Files()),
  other_image_files: t.Optional(t.Files()),
  datasheet_pdf_file: t.Optional(t.File()),
  certificate_pdf_file: t.Optional(t.File())
};

const productCreateBody = t.Object(productFields);
const productUpdateBody = t.Object({ ...productFields, product_id: t.String({ format: 'uuid' }) });

export const productRoutes = new Elysia({ prefix: '/product' })
  .use(jwt({ name: 'jwt', secret: jwtSecret, exp: '12h' }))
  .post('/', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt);
      const product = await saveProduct(await prepareProductWrite(body as any), user);
      set.status = 201;
      return product;
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: productCreateBody,
    detail: { ...secured, tags: ['Products'], summary: 'Create product', description: 'Accepts JSON or multipart form data. For files, use main_image_files, other_image_files, datasheet_pdf_file and certificate_pdf_file.' }
  })
  .put('/', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt);
      const raw = body as any;
      const id = uuid(String(raw.product_id ?? ''));
      const old = await getProduct(id);
      if (!old) fail(404, 'NOT_FOUND', 'Product not found');

      const rawExpected = raw.expected_version ?? raw.version;
      const expectedVersion = rawExpected !== undefined && rawExpected !== null && rawExpected !== ''
        ? Number(rawExpected)
        : undefined;

      if (expectedVersion !== undefined && !isNaN(expectedVersion) && old.version !== undefined && old.version !== expectedVersion) {
        fail(409, 'CONFLICT', 'Product was modified by another user. Please refresh and try again.', {
          field: 'version',
          expected_version: expectedVersion,
          current_version: old.version,
          updated_by: old.update_by,
          updated_at: old.update_ts
        });
      }

      const input = await prepareProductWrite(raw, old);
      const next = await saveProduct(input, user, id, expectedVersion);
      const inputMain = Array.isArray(input.main_image) ? input.main_image : (input.main_image ? [input.main_image] : []);
      const inputOther = Array.isArray(input.other_image) ? input.other_image : (input.other_image ? [input.other_image] : []);
      const keep = new Set([...inputMain, input.datasheet_pdf, input.certificate_pdf, ...inputOther]);
      const oldMain = Array.isArray(old.main_image) ? old.main_image : (old.main_image ? [old.main_image] : []);
      const oldOther = Array.isArray(old.other_image) ? old.other_image : (old.other_image ? [old.other_image] : []);
      for (const path of [...oldMain, old.datasheet_pdf, old.certificate_pdf, ...oldOther]) {
        if (path && !keep.has(path)) await removeStoredFile(String(path));
      }
      return next;
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: productUpdateBody,
    detail: { ...secured, tags: ['Products'], summary: 'Update product' }
  })
  .get('/', async ({ request, jwt, set }) => {
    try {
      await actor(request, jwt);
      return await listProductsGrouped();
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    detail: { ...secured, tags: ['Products'], summary: 'List products grouped by series' }
  })
  .get('/:id', async ({ params, request, jwt, set }) => {
    try {
      await actor(request, jwt);
      const product = await getProduct(uuid(params.id));
      if (!product) fail(404, 'NOT_FOUND', 'Product not found');
      return product;
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    detail: { ...secured, tags: ['Products'], summary: 'Get product by ID' }
  })
  .delete('/', async ({ body, request, jwt, set }) => {
    try {
      await actor(request, jwt);
      const id = uuid(String((body as any)?.product_id ?? ''));
      const old: any = await getProduct(id);
      if (!old) fail(404, 'NOT_FOUND', 'Product not found');
      await deleteProduct(id);
      const oldMain = Array.isArray(old.main_image) ? old.main_image : (old.main_image ? [old.main_image] : []);
      const oldOther = Array.isArray(old.other_image) ? old.other_image : (old.other_image ? [old.other_image] : []);
      for (const path of [...oldMain, old.datasheet_pdf, old.certificate_pdf, ...oldOther]) {
        await removeStoredFile(path);
      }
      set.status = 204;
      return;
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({ product_id: t.String({ format: 'uuid' }) }),
    detail: { ...secured, tags: ['Products'], summary: 'Delete product' }
  })
  .get('/:id/datasheet', async ({ params, request, jwt, set }) => {
    try {
      await actor(request, jwt);
      const p: any = await getProduct(uuid(params.id));
      if (!p) fail(404, 'NOT_FOUND', 'Product not found');
      if (!p.datasheet_pdf) fail(404, 'NOT_FOUND', 'Datasheet is not available');
      const file = await readStoredFile('documents', p.datasheet_pdf.split('/').pop()!);
      if (!file) fail(404, 'NOT_FOUND', 'Datasheet file not found');
      return fileResponse(file, true);
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    detail: { ...secured, tags: ['Products'], summary: 'Download product datasheet PDF' }
  })
  .get('/:id/certificate', async ({ params, request, jwt, set }) => {
    try {
      await actor(request, jwt);
      const p: any = await getProduct(uuid(params.id));
      if (!p) fail(404, 'NOT_FOUND', 'Product not found');
      if (!p.certificate_pdf) fail(404, 'NOT_FOUND', 'Certificate PDF is not available');
      const file = await readStoredFile('documents', p.certificate_pdf.split('/').pop()!);
      if (!file) fail(404, 'NOT_FOUND', 'Certificate file not found');
      return fileResponse(file, true);
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    detail: { ...secured, tags: ['Products'], summary: 'Download product certificate PDF' }
  });
