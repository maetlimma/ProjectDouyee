import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { createAdmin, deleteAdmin, listAdmins, updateAdminPassword } from '../services/admins';
import { actor, secured, uuid } from '../middlewares/auth';
import { fail, statusError } from '../middlewares/errors';
import { jwtSecret } from '../config';

export const adminRoutes = new Elysia({ prefix: '/admins' })
  .use(jwt({ name: 'jwt', secret: jwtSecret, exp: '12h' }))
  .get('/', async ({ request, jwt, set }) => {
    try {
      await actor(request, jwt);
      return await listAdmins();
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    detail: { ...secured, tags: ['Admin Users'], summary: 'List all admin users' }
  })
  .post('/', async ({ body, request, jwt, set }) => {
    try {
      await actor(request, jwt);
      const b = body as { email: string; password: string };
      if (!b.email?.trim()) {
        fail(400, 'VALIDATION_ERROR', 'email is required', { field: 'email', message: 'Required' });
      }
      if (!b.password || b.password.length < 8) {
        fail(400, 'VALIDATION_ERROR', 'password must be at least 8 characters', {
          field: 'password',
          message: 'Must be at least 8 characters'
        });
      }
      set.status = 201;
      return await createAdmin(b.email, b.password);
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 8 })
    }),
    detail: { ...secured, tags: ['Admin Users'], summary: 'Create new admin user' }
  })
  .put('/', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt);
      const b = body as { admin_id: string; password: string };
      const adminId = uuid(String(b.admin_id ?? ''), 'admin_id');
      if (!b.password || b.password.length < 8) {
        fail(400, 'VALIDATION_ERROR', 'password must be at least 8 characters', {
          field: 'password',
          message: 'Must be at least 8 characters'
        });
      }
      return await updateAdminPassword(adminId, b.password, user);
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({
      admin_id: t.String({ format: 'uuid' }),
      password: t.String({ minLength: 8 })
    }),
    detail: { ...secured, tags: ['Admin Users'], summary: 'Update admin password' }
  })
  .delete('/', async ({ body, request, jwt, set }) => {
    try {
      await actor(request, jwt);
      const adminId = uuid(String((body as any)?.admin_id ?? ''), 'admin_id');
      await deleteAdmin(adminId);
      set.status = 204;
      return;
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({
      admin_id: t.String({ format: 'uuid' })
    }),
    detail: { ...secured, tags: ['Admin Users'], summary: 'Delete admin user' }
  });
