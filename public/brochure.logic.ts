// Brochure page naming and viewer helpers, shared by the build script and the About page.
// Files stay flat in public/assets because serveAsset() rejects path separators.

export const BROCHURE_FILE_PATTERN = /^brochure-(\d{3})\.jpg$/;

export function brochurePageFilename(index: number): string {
  return `brochure-${String(index + 1).padStart(3, '0')}.jpg`;
}

export function brochurePageUrls(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `/assets/${brochurePageFilename(i)}`);
}

// Page counter text: a single page in portrait mode, otherwise the visible spread.
// The cover (index 0) and a lone last page are shown alone.
export function brochurePageLabel(index: number, count: number, portrait: boolean): string {
  if (count <= 0) return '';
  const current = Math.min(Math.max(index, 0), count - 1);
  if (portrait || current === 0) return `${current + 1} / ${count}`;
  const left = current % 2 === 1 ? current : current - 1;
  const right = left + 1;
  if (right >= count) return `${left + 1} / ${count}`;
  return `${left + 1}-${right + 1} / ${count}`;
}

// True when the visible page or spread already shows the last page.
export function brochureIsLastView(index: number, count: number, portrait: boolean): boolean {
  if (count <= 0) return true;
  if (portrait || index <= 0) return index >= count - 1;
  const left = index % 2 === 1 ? index : index - 1;
  return left + 1 >= count - 1;
}
