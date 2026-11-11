import { describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cardSpan, groupByModel, layoutGrid, splitHero, takeRows, type CatalogProduct } from '../public/catalog';

const seedDir = join(import.meta.dir, '../seed/products');
const manifest = (await Bun.file(join(seedDir, 'manifest.json')).json()) as { products: Record<string, any>[] };

// Must match FILENAME in src/services/files.ts, or the stored file cannot be served
const STORED_PATH = /^\/files\/(images|documents)\/([a-zA-Z0-9-]+\.[a-zA-Z0-9]+)$/;

describe('product seed manifest', () => {
  it('holds every Product_List row once, in the expected series', () => {
    const skus = manifest.products.map((p) => p.sku);
    expect(skus.length).toBe(27);
    expect(new Set(skus).size).toBe(27);
    const counts: Record<string, number> = {};
    for (const p of manifest.products) counts[p.series] = (counts[p.series] ?? 0) + 1;
    expect(counts).toEqual({ 'Basic Series': 3, 'e9 Series': 6, 'ESD Series': 18 });
  });

  it('references only files that exist in the seed folder under servable names', () => {
    for (const p of manifest.products) {
      const paths = [...p.main_image, ...p.other_image, p.datasheet_pdf, p.certificate_pdf].filter(Boolean);
      expect(p.main_image.length).toBe(1);
      expect(p.datasheet_pdf).toBeTruthy();
      for (const path of paths) {
        const match = STORED_PATH.exec(path);
        expect(match).not.toBeNull();
        expect(existsSync(join(seedDir, 'files', match![1], match![2]))).toBe(true);
      }
    }
  });

  it('gives every product a card model and spec lines', () => {
    for (const p of manifest.products) {
      expect(typeof p.other.model).toBe('string');
      expect(p.other.spec.length).toBeGreaterThan(0);
    }
  });
});

const product = (model: string, sku = model): CatalogProduct => ({
  id: sku,
  sku,
  model,
  title: { en: sku, th: sku },
  department: 'ESD Series',
  subCategory: { en: model, th: model },
  imagePaths: []
});

describe('series card layout', () => {
  it('groups variants of one model onto a single card in API order', () => {
    const groups = groupByModel([product('A'), product('B', 'B-1'), product('C'), product('B', 'B-2')]);
    expect(groups.map((g) => g.model)).toEqual(['A', 'B', 'C']);
    expect(groups[1].items.map((p) => p.sku)).toEqual(['B-1', 'B-2']);
  });

  it('puts the first row of cards on the banner without exceeding three columns', () => {
    const groups = groupByModel([product('A'), product('B', 'B-1'), product('B', 'B-2'), product('C')]);
    const { hero, rest } = splitHero(groups);
    expect(hero.map((g) => g.model)).toEqual(['A', 'B']);
    expect(rest.map((g) => g.model)).toEqual(['C']);
  });

  it('fills the gap left by a wide card that does not fit with a photo', () => {
    const groups = groupByModel([product('A'), product('B'), product('W', 'W-1'), product('W', 'W-2')]);
    const cells = layoutGrid(groups, ['/assets/photo.jpg']);
    expect(cells.map((c) => (c.kind === 'card' ? c.group.model : `photo:${c.span}`))).toEqual(['A', 'B', 'photo:1', 'W']);
  });

  it('leaves the gap empty when no photo is left', () => {
    const groups = groupByModel([product('A'), product('B'), product('W', 'W-1'), product('W', 'W-2')]);
    expect(layoutGrid(groups, []).every((c) => c.kind === 'card')).toBe(true);
  });
});

describe('series side photos', () => {
  const groups = () =>
    groupByModel([
      product('T', 'T-1'), product('T', 'T-2'), product('T', 'T-3'),
      product('S'), product('W', 'W-1'), product('W', 'W-2'),
      product('X')
    ]);

  it('gives a model with three variants the whole row', () => {
    expect(cardSpan(groups()[0])).toBe(3);
  });

  it('takes the cards of whole rows beside the photos and leaves the rest', () => {
    const { side, rest } = takeRows(groups(), 2);
    expect(side.map((g) => g.model)).toEqual(['T', 'S', 'W']);
    expect(rest.map((g) => g.model)).toEqual(['X']);
  });

  it('does not take a part-filled row', () => {
    const { side, rest } = takeRows(groups().slice(0, 2), 2);
    expect(side.map((g) => g.model)).toEqual(['T']);
    expect(rest.map((g) => g.model)).toEqual(['S']);
  });
});

const catalogueDir = join(import.meta.dir, '../seed/catalogues');
const catalogues = (await Bun.file(join(catalogueDir, 'manifest.json')).json()) as { catalogues: Record<string, string>[] };

describe('catalogue seed manifest', () => {
  it('references PDFs that exist in the seed folder under servable names', () => {
    expect(catalogues.catalogues.length).toBeGreaterThan(0);
    for (const c of catalogues.catalogues) {
      const match = STORED_PATH.exec(c.catalogue_pdf);
      expect(match?.[1]).toBe('documents');
      expect(existsSync(join(catalogueDir, 'files', match![2]))).toBe(true);
      expect(c.catalogue_id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});
