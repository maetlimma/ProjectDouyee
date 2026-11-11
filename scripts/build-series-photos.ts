// Cuts the two ESD side photos of the prototype (face, shirt pocket) from the worker photo
// that the booklet splits over series-photo-1.jpg and series-photo-2.jpg.
// Usage: bun scripts/build-series-photos.ts (also run by build-product-seed.ts)
import * as mupdf from 'mupdf';
import { join } from 'node:path';

const assetsDir = join(import.meta.dir, '../public/assets');

// [x0, y0, x1, y1] in the joined 1200x2400 photo, output width
const CROPS: Record<string, [number, number, number, number, number]> = {
  'series-esd-side-1.jpg': [230, 430, 900, 1270, 520],
  'series-esd-side-2.jpg': [400, 1150, 1070, 1990, 520]
};

async function load(name: string) {
  const image = new mupdf.Image(new Uint8Array(await Bun.file(join(assetsDir, name)).arrayBuffer()));
  return image.toPixmap().convertToColorSpace(mupdf.ColorSpace.DeviceRGB, false);
}

export async function buildSeriesPhotos() {
  const left = await load('series-photo-1.jpg');
  const right = await load('series-photo-2.jpg');
  const h = Math.min(left.getHeight(), right.getHeight());
  const lw = left.getWidth();
  const rw = right.getWidth();
  const joined = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, lw + rw, h], false);

  // getPixels() views WASM memory that later allocations can detach; take the views after allocating
  const a = left.getPixels();
  const b = right.getPixels();
  const dst = joined.getPixels();
  for (let y = 0; y < h; y++) {
    dst.set(a.subarray(y * lw * 3, (y + 1) * lw * 3), y * (lw + rw) * 3);
    dst.set(b.subarray(y * rw * 3, (y + 1) * rw * 3), (y * (lw + rw) + lw) * 3);
  }

  for (const [name, [x0, y0, x1, y1, outWidth]] of Object.entries(CROPS)) {
    const outHeight = Math.round((outWidth * (y1 - y0)) / (x1 - x0));
    const crop = joined.warp([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], outWidth, outHeight);
    await Bun.write(join(assetsDir, name), crop.asJPEG(82));
    console.info(`artwork ${name} ${outWidth}x${outHeight}`);
  }
}

if (import.meta.main) await buildSeriesPhotos();
