import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { deleteSeries, listSeries, saveSeries } from '../services/lookups';
import { actor, secured } from '../middlewares/auth';
import { fail, statusError } from '../middlewares/errors';
import { jwtSecret } from '../config';

export const seriesRoutes = new Elysia({ prefix: '/series' })
  .use(jwt({ name: 'jwt', secret: jwtSecret, exp: '12h' }))
  .post('/', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt);
      const b = body as any;
      if (!b.series_code?.trim() || !b.series_name?.trim()) {
        fail(400, 'VALIDATION_ERROR', 'series_code and series_name are required', [
          { field: 'series_code', message: 'Required' },
          { field: 'series_name', message: 'Required' }
        ].filter((item) => !b[item.field]?.trim()));
      }
      set.status = 201;
      return await saveSeries({ series_code: b.series_code.trim(), series_name: b.series_name.trim() }, user);
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({ series_code: t.String({ minLength: 1 }), series_name: t.String({ minLength: 1 }) }),
    detail: { ...secured, tags: ['Series'], summary: 'Create series' }
  })
  .put('/', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt);
      const b = body as any;
      if (!b.series_code?.trim() || !b.series_name?.trim()) {
        fail(400, 'VALIDATION_ERROR', 'series_code and series_name are required', [
          { field: 'series_code', message: 'Required' },
          { field: 'series_name', message: 'Required' }
        ].filter((item) => !b[item.field]?.trim()));
      }
      const row = await saveSeries(b, user, true);
      if (!row) fail(404, 'NOT_FOUND', 'Series not found');
      return row;
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({ series_code: t.String({ minLength: 1 }), series_name: t.String({ minLength: 1 }) }),
    detail: { ...secured, tags: ['Series'], summary: 'Update series' }
  })
  .get('/', async ({ set }) => {
    try {
      return await listSeries();
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    detail: { tags: ['Series'], summary: 'List series' }
  })
  .delete('/', async ({ body, request, jwt, set }) => {
    try {
      await actor(request, jwt);
      const code = String((body as any)?.series_code ?? '').trim();
      if (!code) fail(400, 'VALIDATION_ERROR', 'series_code is required', { field: 'series_code', message: 'Required' });
      if (!(await deleteSeries(code))) fail(404, 'NOT_FOUND', 'Series not found');
      set.status = 204;
      return;
    } catch (error) {
      const err = statusError(error);
      set.status = err.status;
      return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    }
  }, {
    body: t.Object({ series_code: t.String({ minLength: 1 }) }),
    detail: { ...secured, tags: ['Series'], summary: 'Delete series' }
  });
