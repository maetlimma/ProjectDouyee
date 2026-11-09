import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { deleteCertificate, getCertificate, listCertificates, saveCertificate } from '../services/lookups';
import { removeStoredFile, saveUpload } from '../services/files';
import { actor, fileValue, secured } from '../middlewares/auth';
import { fail, statusError } from '../middlewares/errors';
import { jwtSecret } from '../config';

export const certificateRoutes = new Elysia({ prefix: '/certificate' })
  .use(jwt({ name: 'jwt', secret: jwtSecret, exp: '12h' }))
  .post('/', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt);
      const b = body as any;
      if (!b.certificate_code?.trim()) {
        fail(400, 'VALIDATION_ERROR', 'certificate_code is required', { field: 'certificate_code', message: 'Required' });
      }
      const image = await saveUpload(fileValue(b.image_file), 'images');
      set.status = 201;
      return await saveCertificate({ certificate_code: b.certificate_code.trim(), image: image ?? b.image ?? null }, user);
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({ certificate_code: t.String({ minLength: 1 }), image: t.Optional(t.Union([t.String(), t.Null()])), image_file: t.Optional(t.File()) }),
    detail: { ...secured, tags: ['Certificates'], summary: 'Create certificate type', description: 'Accepts JSON or multipart form data; use image_file to upload an image.' }
  })
  .put('/', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt);
      const b = body as any;
      if (!b.certificate_code?.trim()) {
        fail(400, 'VALIDATION_ERROR', 'certificate_code is required', { field: 'certificate_code', message: 'Required' });
      }
      const code = b.certificate_code.trim();
      const old = await getCertificate(code);
      if (!old) fail(404, 'NOT_FOUND', 'Certificate type not found');
      const image = await saveUpload(fileValue(b.image_file), 'images');
      const updated = await saveCertificate({ certificate_code: code, image: image ?? b.image ?? old.image }, user, true);
      if (image && old.image && old.image !== image) await removeStoredFile(old.image);
      return updated;
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({ certificate_code: t.String({ minLength: 1 }), image: t.Optional(t.Union([t.String(), t.Null()])), image_file: t.Optional(t.File()) }),
    detail: { ...secured, tags: ['Certificates'], summary: 'Update certificate type' }
  })
  .get('/', async ({ request, jwt, set }) => {
    try {
      await actor(request, jwt);
      return await listCertificates();
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    detail: { ...secured, tags: ['Certificates'], summary: 'List certificate types' }
  })
  .delete('/', async ({ body, request, jwt, set }) => {
    try {
      await actor(request, jwt);
      const code = String((body as any)?.certificate_code ?? '').trim();
      if (!code) fail(400, 'VALIDATION_ERROR', 'certificate_code is required', { field: 'certificate_code', message: 'Required' });
      const old = await getCertificate(code);
      if (!old) fail(404, 'NOT_FOUND', 'Certificate not found');
      if (!(await deleteCertificate(code))) fail(404, 'NOT_FOUND', 'Certificate not found');
      await removeStoredFile(old.image);
      set.status = 204;
      return;
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({ certificate_code: t.String({ minLength: 1 }) }),
    detail: { ...secured, tags: ['Certificates'], summary: 'Delete certificate type' }
  });
