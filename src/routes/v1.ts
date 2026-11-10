import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { jwtSecret } from '../config';
import { statusError } from '../middlewares/errors';
import { productRoutes } from './products.routes';
import { seriesRoutes } from './series.routes';
import { certificateRoutes } from './certificates.routes';
import { catalogueRoutes } from './catalogues.routes';
import { adminRoutes } from './admins.routes';

export const apiV1 = new Elysia({ prefix: '/api/v1' })
  .use(jwt({ name: 'jwt', secret: jwtSecret, exp: '12h' }))
  .onError(({ error, set }) => {
    const result = statusError(error);
    set.status = result.status;
    return { error: { code: result.code, message: result.message, ...(result.details ? { details: result.details } : {}) } };
  })
  .use(productRoutes)
  .use(seriesRoutes)
  .use(certificateRoutes)
  .use(catalogueRoutes)
  .use(adminRoutes);
