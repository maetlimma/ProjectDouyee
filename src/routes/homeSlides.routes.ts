import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { listHomeSlides, replaceHomeSlides } from '../services/homeSlides';
import { actor, secured, uuid } from '../middlewares/auth';
import { statusError } from '../middlewares/errors';
import { jwtSecret } from '../config';

const errorBody = (error: unknown, set: { status?: number | string }) => {
  const err = statusError(error);
  set.status = err.status;
  return { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
};

export const homeSlideRoutes = new Elysia({ prefix: '/home-slides' })
  .use(jwt({ name: 'jwt', secret: jwtSecret, exp: '12h' }))
  .get('/', async ({ request, jwt, set }) => {
    try {
      await actor(request, jwt);
      return await listHomeSlides();
    } catch (error) {
      return errorBody(error, set);
    }
  }, {
    detail: { ...secured, tags: ['Home slider'], summary: 'List home slider products in order' }
  })
  .put('/', async ({ body, request, jwt, set }) => {
    try {
      const user = await actor(request, jwt);
      const ids = body.product_ids.map((id) => uuid(id, 'product_ids'));
      return await replaceHomeSlides(ids, user);
    } catch (error) {
      return errorBody(error, set);
    }
  }, {
    body: t.Object({ product_ids: t.Array(t.String(), { maxItems: 50 }) }),
    detail: { ...secured, tags: ['Home slider'], summary: 'Replace the home slider', description: 'Send every product id in display order; an empty list returns the slider to automatic.' }
  });
