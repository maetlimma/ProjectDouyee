import { describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import {
  BROCHURE_FILE_PATTERN,
  brochureIsLastView,
  brochurePageFilename,
  brochurePageLabel,
  brochurePageUrls
} from '../public/brochure.logic';
import { BROCHURE_PAGES } from '../public/brochure.pages';

describe('brochure page naming', () => {
  it('builds flat, zero-padded asset filenames from a zero-based index', () => {
    expect(brochurePageFilename(0)).toBe('brochure-001.jpg');
    expect(brochurePageFilename(11)).toBe('brochure-012.jpg');
    expect(brochurePageFilename(122)).toBe('brochure-123.jpg');
  });

  it('builds /assets URLs for every page in order', () => {
    expect(brochurePageUrls(3)).toEqual(['/assets/brochure-001.jpg', '/assets/brochure-002.jpg', '/assets/brochure-003.jpg']);
    expect(brochurePageUrls(0)).toEqual([]);
  });

  it('matches generated filenames and captures the page number', () => {
    expect(BROCHURE_FILE_PATTERN.exec('brochure-012.jpg')?.[1]).toBe('012');
    expect(BROCHURE_FILE_PATTERN.test('brochure-12.jpg')).toBe(false);
    expect(BROCHURE_FILE_PATTERN.test('about-poster.jpg')).toBe(false);
  });
});

describe('brochure page label', () => {
  it('shows a single page in portrait mode', () => {
    expect(brochurePageLabel(4, 12, true)).toBe('5 / 12');
  });

  it('shows the cover alone and then two-page spreads in landscape mode', () => {
    expect(brochurePageLabel(0, 12, false)).toBe('1 / 12');
    expect(brochurePageLabel(1, 12, false)).toBe('2-3 / 12');
    expect(brochurePageLabel(2, 12, false)).toBe('2-3 / 12');
    expect(brochurePageLabel(9, 12, false)).toBe('10-11 / 12');
  });

  it('shows a lone back cover when the page count is even', () => {
    expect(brochurePageLabel(11, 12, false)).toBe('12 / 12');
  });

  it('clamps out-of-range indexes and handles an empty brochure', () => {
    expect(brochurePageLabel(99, 12, true)).toBe('12 / 12');
    expect(brochurePageLabel(-1, 12, true)).toBe('1 / 12');
    expect(brochurePageLabel(0, 0, false)).toBe('');
  });
});

describe('brochure last view', () => {
  it('is false before the last page and true on it in portrait mode', () => {
    expect(brochureIsLastView(10, 12, true)).toBe(false);
    expect(brochureIsLastView(11, 12, true)).toBe(true);
  });

  it('treats the spread holding the last page as the last view in landscape mode', () => {
    expect(brochureIsLastView(0, 12, false)).toBe(false);
    expect(brochureIsLastView(9, 12, false)).toBe(false);
    expect(brochureIsLastView(11, 12, false)).toBe(true);
    expect(brochureIsLastView(9, 11, false)).toBe(true);
    expect(brochureIsLastView(10, 11, false)).toBe(true);
  });

  it('is true for an empty brochure', () => {
    expect(brochureIsLastView(0, 0, false)).toBe(true);
  });
});

describe('brochure generated assets', () => {
  it('has a JPG in public/assets for every page in the manifest', async () => {
    expect(BROCHURE_PAGES.count).toBeGreaterThan(0);
    const assetsDir = join(import.meta.dir, '../public/assets');
    for (let i = 0; i < BROCHURE_PAGES.count; i++) {
      expect(await Bun.file(join(assetsDir, brochurePageFilename(i))).exists()).toBe(true);
    }
  });
});
