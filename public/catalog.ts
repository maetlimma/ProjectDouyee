import { useEffect, useState } from 'react';

export interface ML {
  en: string;
  th: string;
}

export interface CatalogProduct {
  id: string;
  title: ML;
  sku: string;
  department: string;
  subCategory: ML;
  imagePaths: string[];
  pdfPaths?: string[];
  downloads?: { url: string; title: ML; type: string }[];
  brand?: string;
  specs?: { key: ML; value: ML }[];
  sizeWeights?: { size: string; weight: string }[];
  certificates?: { code: string; name: string; image: string | null }[];
  conformity?: { en: string[]; th: string[] };
  // Products sharing a model are shown on one card, one column per variant
  model?: string;
  variant?: string | null;
  spec?: string[];
  parts?: string[];
}

export interface CatalogSector {
  id: string;
  name: ML;
  subCategories: { id: string; name: ML }[];
}

// Shared fetch so header, menu and pages load the catalog only once
let cache: Promise<{ products: CatalogProduct[]; sectors: CatalogSector[] }> | null = null;

function loadCatalog() {
  if (!cache) {
    cache = Promise.all([
      fetch('/api/products').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/taxonomy').then((r) => (r.ok ? r.json() : []))
    ])
      .then(([products, sectors]) => ({ products, sectors }))
      .catch(() => {
        cache = null;
        return { products: [], sectors: [] };
      });
  }
  return cache;
}

export function useCatalog() {
  const [data, setData] = useState<{ products: CatalogProduct[]; sectors: CatalogSector[] }>({ products: [], sectors: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadCatalog().then((d) => {
      if (alive) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return { ...data, loading };
}

// Products store the sector id, older records may store the English sector name
export function inSector(product: CatalogProduct, sector: CatalogSector) {
  const dept = (product.department || '').toLowerCase();
  return dept === sector.id.toLowerCase() || dept === sector.name.en.toLowerCase();
}

export function initials(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

// Catalogues uploaded in the admin portal; cover is page 1 of the PDF
export interface PublicCatalogue {
  id: string;
  name: string;
  cover: string;
  pdf: string;
}

let cataloguesCache: Promise<PublicCatalogue[]> | null = null;

export function useCatalogues() {
  const [catalogues, setCatalogues] = useState<PublicCatalogue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    cataloguesCache ??= fetch('/api/catalogues')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => {
        cataloguesCache = null;
        return [];
      });
    cataloguesCache.then((list) => {
      if (alive) {
        setCatalogues(list);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return { catalogues, loading };
}

// Series artwork matched by sector name; other sectors fall back to initials
export function badgeImage(sector: CatalogSector): string | null {
  const name = sector.name.en.toLowerCase();
  if (/\besd\b/.test(name)) return '/assets/badge-esd.png';
  if (/\be9\b/.test(name)) return '/assets/badge-e9.png';
  return null;
}

// Photos cropped from the safety-shoe booklet by scripts/build-product-seed.ts
export interface SeriesArt {
  background: string;
  // Fill gaps left in a grid row
  photos: string[];
  // Stacked in a right-hand column beside the first rows after the banner, one row each
  side?: string[];
}

export function seriesArt(sector: CatalogSector): SeriesArt | null {
  const name = sector.name.en.toLowerCase();
  if (/\besd\b/.test(name)) return { background: '/assets/series-esd-bg.jpg', photos: [], side: ['/assets/series-esd-side-1.jpg', '/assets/series-esd-side-2.jpg'] };
  if (/\be9\b/.test(name)) return { background: '/assets/series-e9-bg.jpg', photos: ['/assets/series-esd-bg.jpg'] };
  if (/\bbasic\b/.test(name)) return { background: '/assets/series-basic-bg.jpg', photos: ['/assets/series-e9-bg.jpg'] };
  return null;
}

export interface CardGroup {
  model: string;
  items: CatalogProduct[];
}

// Keeps the API order; a model's variants join the card of its first variant
export function groupByModel(products: CatalogProduct[]): CardGroup[] {
  const groups: CardGroup[] = [];
  const byModel = new Map<string, CardGroup>();
  for (const product of products) {
    const model = product.model || product.sku;
    let group = byModel.get(model);
    if (!group) {
      group = { model, items: [] };
      byModel.set(model, group);
      groups.push(group);
    }
    group.items.push(product);
  }
  return groups;
}

// Two variants take two columns, three or more take the whole row
export const cardSpan = (group: CardGroup) => Math.min(group.items.length, 3);

// Leading groups that fill the given number of 3-column rows without leaving a gap
export function takeRows(groups: CardGroup[], rows: number, columns = 3) {
  let used = 0;
  let row = 0;
  let count = 0;
  for (const group of groups) {
    const span = Math.min(cardSpan(group), columns);
    if (used + span > columns) break;
    used += span;
    count++;
    if (used === columns) {
      used = 0;
      if (++row === rows) break;
    }
  }
  // Drop a trailing part-filled row
  if (used > 0) {
    let back = used;
    while (back > 0) back -= Math.min(cardSpan(groups[--count]), columns);
  }
  return { side: groups.slice(0, count), rest: groups.slice(count) };
}

export type GridCell = { kind: 'card'; group: CardGroup } | { kind: 'photo'; src: string; span: number };

// Lays cards on a 3-column grid; a gap left by a wide card that does not fit is filled with a series photo
export function layoutGrid(groups: CardGroup[], photos: string[], columns = 3): GridCell[] {
  const cells: GridCell[] = [];
  let used = 0;
  let next = 0;
  const fill = () => {
    const span = columns - used;
    if (span > 0 && used > 0 && next < photos.length) cells.push({ kind: 'photo', src: photos[next++], span });
    used = 0;
  };
  for (const group of groups) {
    const span = Math.min(cardSpan(group), columns);
    if (used + span > columns) fill();
    cells.push({ kind: 'card', group });
    used += span;
    if (used === columns) used = 0;
  }
  fill();
  return cells;
}

// First cards whose combined width fits one row; they sit on the series banner photo
export function splitHero(groups: CardGroup[], columns = 3) {
  let used = 0;
  let count = 0;
  for (const group of groups) {
    if (used + cardSpan(group) > columns) break;
    used += cardSpan(group);
    count++;
  }
  return { hero: groups.slice(0, count), rest: groups.slice(count) };
}
