import { Elysia } from 'elysia';
import { getPublicProduct, isPublicProductFile, listPublicProducts, listPublicSeries } from '../services/catalog';
import { fileResponse, readStoredFile } from '../services/files';
import { catalogueCover, coverResponse, getCatalogue, listPublicCatalogues } from '../services/catalogues';
import { listHomeSlideIds } from '../services/homeSlides';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const notFound = (set: { status?: number | string }, message: string) => {
  set.status = 404;
  return { error: { code: 'NOT_FOUND', message } };
};

// Unauthenticated, read-only endpoints used by the public site
export const publicRoutes = new Elysia({ prefix: '/api' })
  .get('/products', () => listPublicProducts(), {
    detail: { tags: ['Products'], summary: 'List products for the public site' }
  })
  .get('/products/:id', async ({ params, set }) => {
    if (!UUID.test(params.id)) return notFound(set, 'Product not found');
    return (await getPublicProduct(params.id)) ?? notFound(set, 'Product not found');
  }, {
    detail: { tags: ['Products'], summary: 'Get one product for the public site' }
  })
  .get('/taxonomy', () => listPublicSeries(), {
    detail: { tags: ['Series'], summary: 'List series for the public site' }
  })
  .get('/media/:folder/:filename', async ({ params, set }) => {
    const file = await readStoredFile(params.folder, params.filename);
    if (!file || !(await isPublicProductFile(params.folder, params.filename))) return notFound(set, 'File not found');
    const response = fileResponse(file, true);
    response.headers.set('cache-control', 'public, max-age=3600');
    return response;
  }, {
    detail: { tags: ['Products'], summary: 'Serve an image or PDF referenced by a product' }
  })
  .get('/home-slides', () => listHomeSlideIds(), {
    detail: { tags: ['Home slider'], summary: 'Product ids shown in the home slider, in order' }
  })
  .get('/catalogues', () => listPublicCatalogues(), {
    detail: { tags: ['Catalogues'], summary: 'List catalogues for the public site' }
  })
  .get('/catalogues/:id/cover', async ({ params, set }) => {
    const catalogue = UUID.test(params.id) ? await getCatalogue(params.id) : null;
    const jpeg = catalogue?.catalogue_pdf ? await catalogueCover(catalogue.catalogue_pdf) : null;
    return jpeg ? coverResponse(jpeg) : notFound(set, 'Catalogue not found');
  }, {
    detail: { tags: ['Catalogues'], summary: 'First page of a catalogue PDF as a JPEG' }
  })
  .get('/catalogues/:id/pdf', async ({ params, set }) => {
    const catalogue = UUID.test(params.id) ? await getCatalogue(params.id) : null;
    const file = catalogue?.catalogue_pdf ? await readStoredFile('documents', catalogue.catalogue_pdf.split('/').pop()!) : null;
    if (!file) return notFound(set, 'Catalogue not found');
    const response = fileResponse(file, true);
    response.headers.set('cache-control', 'public, max-age=3600');
    return response;
  }, {
    detail: { tags: ['Catalogues'], summary: 'Open a catalogue PDF' }
  });
