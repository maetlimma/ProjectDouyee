// Builds the committed product seed from reference/Product/Web and the safety-shoe booklet.
// Writes seed/products/manifest.json, seed/products/files/{images,documents} and the series artwork in public/assets.
// Usage: bun run products:build
import * as mupdf from 'mupdf';
import { createHash } from 'node:crypto';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const webDir = join(root, 'reference/Product/Web');
const booklet = join(root, 'reference/250513_Safety_Shoes_Booklet_FAOL-45MB.pdf');
const seedDir = join(root, 'seed/products');
const imagesDir = join(seedDir, 'files/images');
const documentsDir = join(seedDir, 'files/documents');
const assetsDir = join(root, 'public/assets');

type Series = 'ESD Series' | 'e9 Series' | 'Basic Series';

interface Row {
  sku: string; // Part Number exactly as written in reference/Product_List.xlsx
  series: Series;
  model: string; // Card heading; rows sharing a model are shown on one card
  variant?: string;
  datasheet: string;
  certificate?: string;
  spec: string[];
  title?: string; // Overrides the PRODUCT line read from the datasheet
  noParts?: boolean; // Datasheet has no component photos along the bottom
}

const ESD: Series = 'ESD Series';
const E9: Series = 'e9 Series';
const BASIC: Series = 'Basic Series';

// One entry per Product_List row, in display order within each series.
const ROWS: Row[] = [
  {
    sku: 'HS-452-BLACK-PU-SB SRC-SK', series: BASIC, model: 'HS-452',
    datasheet: 'BASIC/DY6008-HS-452/HS-452-SB/HS-452-BLACK-PU-SB SRC-SK.pdf',
    certificate: 'BASIC/DY6008-HS-452/HS-452-SB/CE Certificate for DY6008-HS-452-COLOR-PU-SB SRC (FEB 2027).pdf',
    spec: ['PU, SB SRC', 'Steel']
  },
  {
    sku: 'HS-693-6IN-BROWN-EH-PU/NBR-EUROSTAT-SB', series: BASIC, model: 'HS-693', variant: '6IN',
    datasheet: 'BASIC/HS-693/HS693-6IN-BROWN-EH-PU_NBR-EUROSTAT.pdf',
    certificate: 'BASIC/HS-693/CE Certificate for DY6008-HS693-6IN and 8IN-BROWN-EH- PU_NBR-EUROSTAT (AUG 2030).pdf',
    spec: ['PU/NBR, SBPL SR WR HRO', 'Composite / Composite', 'EN ISO 20345:2022', 'ASTM F2413-18 I/C EH']
  },
  {
    sku: 'HS-693-8IN-BROWN-EH-PU/NBR-EUROSTAT-SB', series: BASIC, model: 'HS-693', variant: '8IN',
    datasheet: 'BASIC/HS-693/HS693-8IN-BROWN-EH-PU_NBR-EUROSTAT.pdf',
    certificate: 'BASIC/HS-693/CE Certificate for DY6008-HS693-6IN and 8IN-BROWN-EH- PU_NBR-EUROSTAT (AUG 2030).pdf',
    spec: ['PU/NBR, SBPL SR WR HRO', 'Composite / Composite', 'EN ISO 20345:2022', 'ASTM F2413-18 I/C EH']
  },
  {
    sku: 'HS-618C-1G-PU/PU-S2SRFO-SK', series: E9, model: 'HS618C S2',
    datasheet: 'E9/DY6008-HS-618C/HS618C-1G-PUPU-PU-S2SRFO-SK.pdf',
    certificate: 'E9/DY6008-HS-618C/CE Certificate for DY6008-HS618C-1G-PU_PU-S2SRFO-SK (OCT2029).pdf',
    spec: ['PU/PU, S2SRFO', 'Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-1102E-1G-EVA/RUBBER-S3LSRFOHRO-SK', series: E9, model: 'HS-1102E S3',
    datasheet: 'E9/DY6008-HS-1102/HS-1102E/HS-1102E-1G-EVA_RUBBER-S3LSRFOHRO-SK.pdf',
    certificate: 'E9/DY6008-HS-1102/HS-1102E/Certificate HS1102E-1G-EVANBR-S3PLSRFOHRO-SK-SIZE.pdf',
    spec: ['EVA/NBR, S3LSRFOHRO', 'Steel / Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-1102-1G-PU/PU-S3 SRC', series: E9, model: 'HS-1102 S3',
    datasheet: 'E9/DY6008-HS-1102/HS-1102-S3/HS-1102-1G-PU_PU-S3 SRC.pdf',
    certificate: 'E9/DY6008-HS-1102/HS-1102-S3/CE Certificate for DY6008-HS-1102-1G-PU_PU-S3 SRC and DY6008-HS-003-1G-PU_PU-S3 SRC (FEB 2027).pdf',
    spec: ['PU/PU, S3 SRC', 'Steel / Steel']
  },
  {
    sku: 'HS-1102-PU/PU-SB SRC', series: E9, model: 'HS-1102 SB',
    datasheet: 'E9/DY6008-HS-1102/HS-1102-SB/HS-1102-PU_PU-SB SRC.pdf',
    certificate: 'E9/DY6008-HS-1102/HS-1102-SB/CE Certificate for DY6008-HS-1102-PU_PU-SB SRC (OCT 2030).pdf',
    spec: ['PU/PU, SB SRC', 'Steel']
  },
  {
    sku: 'SK-001-1G-PU-S1P SRC', series: E9, model: 'SK-001',
    datasheet: 'E9/DY6008-SK-001/SK-001-1G-PU-S1P SRC.pdf',
    certificate: 'E9/DY6008-SK-001/CE Certificate for DY6008-SK-001-1G-PU-S1P SRC (OCT 2029).pdf',
    spec: ['PU, S1P SRC', 'Steel / Steel', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-003-1G-PU/PU-S3 SRC', series: E9, model: 'HS-003',
    datasheet: 'E9/DY6008-HS-003/HS003_S3/HS-003-1G-PU_PU-S3 SRC-SIZE.pdf',
    certificate: 'E9/DY6008-HS-003/HS003_S3/CE Certificate for HS-003-1G-PU_PU-S3 SRC.pdf',
    spec: ['PU/PU, S3 SRC', 'Steel / Steel']
  },
  {
    sku: 'HS-635C-35M-PU/PU-S1PLSRFO-SK', series: ESD, model: 'HS635C',
    datasheet: 'ESD/HS-635C/HS635C-35M-PU_PU-S1PLSRFO-SK.pdf',
    certificate: 'ESD/HS-635C/CE Certificate for DY6008-HS635C-35M-PU_PU-S1PLSRFO-SK-SIZE (AUG2029).pdf',
    spec: ['PU/PU, S1PLSRFO', 'Composite / Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'SH-09P-SD-35MOHMS-MW', series: ESD, model: 'SH-09P-MW',
    datasheet: 'ESD/DY6008-SH-09P-SD-35MOHMS/SH-09P-SD-35MOHMS-MW.pdf',
    certificate: 'ESD/DY6008-SH-09P-SD-35MOHMS/CE Certificate for DY6002-SH-09P-35MOHMS-MW & 13P-35MOHMS-BK & MW (2027).pdf',
    spec: ['PU, S1 SRC', 'Steel']
  },
  {
    sku: 'SH-13P-SD-35MOHMS-BK', series: ESD, model: 'SH-13P-BK',
    datasheet: 'ESD/DY6008-SH-13P-SD-35MOHMS/SH-13P-SD-35MOHMS-BK.pdf',
    certificate: 'ESD/DY6008-SH-13P-SD-35MOHMS/CE Certificate for DY6002-SH-09P-35MOHMS-MW & 13P-35MOHMS-BK & MW (2027).pdf',
    spec: ['PU, S1 SRC', 'Steel']
  },
  {
    sku: 'HS-354C-BLACK-35M-PU/PU-S1 SRC', series: ESD, model: 'HS-354C', variant: 'BLACK',
    datasheet: 'ESD/DY6008-HS-354/HS-354C-PU/HS-354C-BLACK-35M-PU_PU-S1 SRC.pdf',
    certificate: 'ESD/DY6008-HS-354/HS-354C-PU/CE Certificate for DY6008-HS-354C-WHITE_NAVY BLUE_BLACK-35M-PU_PU-S1 SRC (AUG_2029).pdf',
    spec: ['PU/PU, S1 SRC', 'Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-354C-NAVY BLUE-35M-PU/PU-S1 SRC', series: ESD, model: 'HS-354C', variant: 'NAVY BLUE',
    datasheet: 'ESD/DY6008-HS-354/HS-354C-PU/HS-354C-NAVY BLUE-35M-PU_PU-S1 SRC.pdf',
    certificate: 'ESD/DY6008-HS-354/HS-354C-PU/CE Certificate for DY6008-HS-354C-WHITE_NAVY BLUE_BLACK-35M-PU_PU-S1 SRC (AUG_2029).pdf',
    spec: ['PU/PU, S1 SRC', 'Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-354C-WHITE-35M-PU/PU-S1 SRC', series: ESD, model: 'HS-354C', variant: 'WHITE',
    datasheet: 'ESD/DY6008-HS-354/HS-354C-PU/HS-354C-WHITE-35M-PU_PU-S1 SRC.pdf',
    certificate: 'ESD/DY6008-HS-354/HS-354C-PU/CE Certificate for DY6008-HS-354C-WHITE_NAVY BLUE_BLACK-35M-PU_PU-S1 SRC (AUG_2029).pdf',
    spec: ['PU/PU, S1 SRC', 'Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-015-35M-PU/PU-S3 SRC', series: ESD, model: 'HS-015',
    datasheet: 'ESD/DY6008-HS-015/DY6008-HS-015-35M-PU_PU-S3 SRC.pdf',
    certificate: 'ESD/DY6008-HS-015/CE Certificate for DY6008-HS-015-35M-PU_PU-S3 SRC (FEB 2027).pdf',
    spec: ['PU/PU, S3 SRC', 'Composite / Composite']
  },
  {
    sku: 'HS-354C-NAVY BLUE-35M-RUBBER-S1 SRC', series: ESD, model: 'HS-354C-NBR', variant: 'NAVY BLUE',
    datasheet: 'ESD/DY6008-HS-354/HS-354C-Rubber/HS-354C-NAVY BLUE-35M-RUBBER-S1.pdf',
    certificate: 'ESD/DY6008-HS-354/HS-354C-Rubber/CE Certificate for DY6008-HS-354C-WHITE_NAVY BLUE_BLACK-35M-RUBBER-S1 SRC_2023.pdf',
    spec: ['NBR, S1 SRC', 'Composite']
  },
  {
    sku: 'HS-354C-WHITE-35M-RUBBER-S1 SRC', series: ESD, model: 'HS-354C-NBR', variant: 'WHITE',
    datasheet: 'ESD/DY6008-HS-354/HS-354C-Rubber/HS-354C-WHITE-35M-RUBBER-S1.pdf',
    certificate: 'ESD/DY6008-HS-354/HS-354C-Rubber/CE Certificate for DY6008-HS-354C-WHITE_NAVY BLUE_BLACK-35M-RUBBER-S1 SRC_2023.pdf',
    spec: ['NBR, S1 SRC', 'Composite']
  },
  {
    sku: 'HS-431C-GREY-35M-EVA/RUBBER-S1P SRC-SK', series: ESD, model: 'HS431C', variant: 'GREY',
    datasheet: 'ESD/DY6008-HS-431C/HS-431C/HS431C-GREY-35M-EVA_RUBBER-S1PSRC-SK.pdf',
    certificate: 'ESD/DY6008-HS-431C/HS-431C/CE Certificate for DY6008-HS431C-GREY and BLUE-35M-EVA_RUBBER-S1PSRC-SK.pdf',
    spec: ['EVA/NBR, S1P SRC HRO', 'Composite / Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-431C-BLUE-35M-EVA/RUBBER-S1P SRC-SK', series: ESD, model: 'HS431C', variant: 'BLUE',
    datasheet: 'ESD/DY6008-HS-431C/HS-431C/HS431C-BLUE-35M-EVA_RUBBER-S1PSRC-SK.pdf',
    certificate: 'ESD/DY6008-HS-431C/HS-431C/CE Certificate for DY6008-HS431C-GREY and BLUE-35M-EVA_RUBBER-S1PSRC-SK.pdf',
    spec: ['EVA/NBR, S1P SRC HRO', 'Composite / Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-778C-35M-EVA/NBR-S1PLSRFOHRO-SK', series: ESD, model: 'HS778C',
    datasheet: 'ESD/HS-778C/HS778C-35M-EVA_NBR-S1PLSRFOHRO-SK.pdf',
    certificate: 'ESD/HS-778C/CE Certificate for DY6008-HS778C-35M-EVA_NBR-S1PLSRFOHRO-SK (JUN 2028).pdf',
    spec: ['EVA/NBR, S1PLSRFOHRO', 'Composite / Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-611CC-WHITE-35M-PU/NBR-S1P SRC', series: ESD, model: 'HS611CC', variant: 'WHITE',
    datasheet: 'ESD/HS-611CC/HS611CC-WHITE-35M-PU_NBR-S1PLSRFO.pdf',
    certificate: 'ESD/HS-611CC/CE Certificate for DY6003-HS611CC-BLACK_WHITE_NAVY BLUE-35M-PU_NBR (FEB 2029).pdf',
    spec: ['PU/NBR, S1PLSRFOHRO', 'Composite / Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-611CC-BLACK-35M-PU/NBR-S1P SRC', series: ESD, model: 'HS611CC', variant: 'BLACK',
    datasheet: 'ESD/HS-611CC/HS611CC-BLACK-35M-PU_NBR-S1PLSRFO.pdf',
    certificate: 'ESD/HS-611CC/CE Certificate for DY6003-HS611CC-BLACK_WHITE_NAVY BLUE-35M-PU_NBR (FEB 2029).pdf',
    spec: ['PU/NBR, S1PLSRFOHRO', 'Composite / Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-690-35M-PU/PU-S1PSSRFOLG-SK', series: ESD, model: 'HS-690',
    datasheet: 'ESD/HS-690/HS690-35M-PU_PU-S1PSSRFOLG-SK.pdf',
    certificate: 'ESD/HS-690/CE Certificate for DY6008-HS690-35M-PU_PU-S1PSSRFOLG-SK (OCT 2030).pdf',
    spec: ['PU/PU, S1PSSRFOLG', 'Composite / Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-138C-BLACK-1G-EVA/RUBBER-S3 SRC-SK', series: ESD, model: 'HS-138C',
    datasheet: 'ESD/DY6008-HS-138C/HS138C/DY6008-HS138C-BLACK-1G-EVA_RUBBER-S3 SRC-SK.pdf',
    certificate: 'ESD/DY6008-HS-138C/HS138C/CE Certificate for DY6008-HS138C-433C-BLACK-1G-EVA_RUBBER-S3 SRC HRO.pdf',
    spec: ['EVA/NBR, S3 SRC HRO', 'Composite / Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'HS-433C-BLACK-1G-EVA/RUBBER-S3 SRC-SK', series: ESD, model: 'HS-433C',
    datasheet: 'ESD/DY6008-HS-433C/HS433C/HS433C-BLACK-1G-EVA_RUBBER-S3 SRC-SK.pdf',
    certificate: 'ESD/DY6008-HS-433C/HS433C/CE Certificate for DY6008-HS138C-433C-BLACK-1G-EVA_RUBBER-S3 SRC HRO.pdf',
    spec: ['EVA/NBR, S3 SRC HRO', 'Composite / Composite', 'EN ISO 20345:2022']
  },
  {
    sku: 'EUROSTAT PU INSOLE', series: ESD, model: 'EUROSTAT PU INSOLE',
    datasheet: 'Insole/EUROSTAT PU INSOLE, SIZE.pdf', noParts: true,
    title: 'EUROSTAT® Static Dissipative PU Insole',
    spec: ['Static Dissipative PU Insole']
  }
];

// Series artwork cropped from the booklet: [page, x0, y0, x1, y1, output width]
const ARTWORK: Record<string, [number, number, number, number, number, number]> = {
  'series-esd-bg.jpg': [2, 1250, 1010, 2480, 1450, 1230],
  'series-e9-bg.jpg': [2, 1320, 1920, 2480, 2360, 1160],
  'series-basic-bg.jpg': [2, 0, 545, 1280, 985, 1280],
  'series-photo-1.jpg': [4, 1660, 0, 2480, 3280, 600],
  'series-photo-2.jpg': [5, 0, 0, 820, 3280, 600]
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

interface Placed { bbox: number[]; image: mupdf.Image }

// Draws only the photo (with its soft mask) onto white, so CMYK data and transparency come out as printed
// and icons placed over it on the datasheet are left out
async function writeImage(placed: Placed, base: string, maxWidth: number) {
  const image = placed.image;
  let pix = image.toPixmap();
  if (pix.getNumberOfComponents() - (pix.getAlpha() ? 1 : 0) !== 3 || !pix.getColorSpace()?.isRGB()) {
    pix = pix.convertToColorSpace(mupdf.ColorSpace.DeviceRGB, Boolean(pix.getAlpha()));
  }
  const w = pix.getWidth();
  const h = pix.getHeight();
  const n = pix.getNumberOfComponents();

  // Transparency comes from the separate soft mask, or from the pixmap's own alpha channel
  let maskPix: mupdf.Pixmap | null = null;
  const maskImage = image.getMask();
  if (maskImage) {
    maskPix = maskImage.toPixmap();
    const [mw, mh] = [maskPix.getWidth(), maskPix.getHeight()];
    if (mw !== w || mh !== h) maskPix = maskPix.warp([[0, 0], [mw, 0], [mw, mh], [0, mh]], w, h);
    if (maskPix.getNumberOfComponents() !== 1) maskPix = maskPix.convertToColorSpace(mupdf.ColorSpace.DeviceGray, false);
  }
  const out = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, w, h], false);

  // getPixels() views WASM memory, which any later allocation can detach; take the views after all allocations
  const src = pix.getPixels();
  const mask = maskPix ? maskPix.getPixels() : null;
  const dst = out.getPixels();
  if (src.length !== w * h * n || dst.length !== w * h * 3 || (mask && mask.length !== w * h)) {
    throw new Error(`Unexpected pixel buffer size for ${base}`);
  }
  for (let i = 0, j = 0, k = 0; k < w * h; k++, i += n, j += 3) {
    const a = mask ? mask[k] / 255 : n === 4 ? src[i + 3] / 255 : 1;
    // Pixmap colour with an alpha channel is premultiplied
    const premultiplied = n === 4 && !mask;
    for (let c = 0; c < 3; c++) {
      const colour = premultiplied ? src[i + c] : src[i + c] * a;
      dst[j + c] = colour + 255 * (1 - a);
    }
  }

  const outWidth = Math.min(w, maxWidth);
  const final = outWidth < w ? out.warp([[0, 0], [w, 0], [w, h], [0, h]], outWidth, Math.round((h * outWidth) / w)) : out;
  const name = `${base}.jpg`;
  await Bun.write(join(imagesDir, name), final.asJPEG(85));
  return `/files/images/${name}`;
}

function pageImages(doc: mupdf.Document): Placed[] {
  const placed: Placed[] = [];
  doc.loadPage(0).toStructuredText('preserve-images').walk({
    onImageBlock(bbox: number[], _matrix: unknown, image: mupdf.Image) {
      placed.push({ bbox, image });
    }
  });
  return placed;
}

const width = (p: Placed) => p.bbox[2] - p.bbox[0];
const area = (p: Placed) => width(p) * (p.bbox[3] - p.bbox[1]);

// Numbered items of the datasheet's Conformity section, shown in the popup's Certificate box
function readConformity(text: string): string[] {
  const start = text.search(/\bConformity\b/);
  if (start === -1) return [];
  const body = text.slice(start).replace(/^Conformity[^\n]*\n(?:[ \t]*\n)*/, '');
  const end = body.search(/\n[ \t]*\n/);
  return (end === -1 ? body : body.slice(0, end))
    .split(/(?:^|\n)\s*\d+\)\s*/)
    .map((item) => item.replace(/•/g, ' ').replace(/\s+/g, ' ').replace(/:\s*:/g, ':').trim())
    .filter(Boolean);
}

// Text fields read from the datasheet; keys follow specificationRows in public/views/admin/constants.ts
function readDatasheetText(doc: mupdf.Document) {
  const text = doc.loadPage(0).toStructuredText('').asText().replace(/\r/g, '');
  const grab = (re: RegExp) => (text.match(re)?.[1] ?? '').replace(/\s+/g, ' ').trim();
  // The PDF text layer drops the multiplication sign and superscript: "< 1.0  109 ohms" is 1.0 x 10^9
  const superscript = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const resistance = grab(/Footwear only Resistance\s*\n\s*([^\n]+)/)
    .replace(/([\d.]+)\s*[×x]?\s*10(\d+)\s*ohms/, (_m, base: string, exp: string) =>
      `${base} × 10${[...exp].map((d) => superscript[Number(d)]).join('')} ohms`);
  return {
    title: grab(/PRODUCT:\s*([^\n]+)/),
    specification_en: {
      Upper: grab(/Upper\s*\n?\s*:\s*\n?([^\n]+)/),
      'Toe cap': grab(/Toe Cap\s*\n?\s*:\s*\n?([^\n]+)/),
      Midplate: grab(/Midplate\s*\n?\s*:\s*\n?([^\n]+)/),
      'Footwear only Resistance': resistance,
      Color: grab(/Color\s*\n\s*Upper\s*\n?\s*:\s*\n?([^\n]+)/)
    },
    resistance,
    conformity: readConformity(text)
  };
}

// Datasheet layout: product photo top right, component photos (toe cap, midplate, outsole) along the bottom
async function extractPhotos(pdfPath: string, base: string, noParts = false) {
  const doc = mupdf.Document.openDocument(await Bun.file(pdfPath).arrayBuffer(), 'application/pdf');
  const info = readDatasheetText(doc);
  const images = pageImages(doc);
  const main = images.filter((p) => p.bbox[1] < 420 && width(p) > 120).sort((a, b) => area(b) - area(a))[0];
  if (!main) throw new Error(`No product photo found in ${pdfPath}`);
  const parts = images
    .filter((p) => !noParts && p !== main && p.bbox[1] >= 500 && width(p) >= 60)
    .sort((a, b) => a.bbox[0] - b.bbox[0]);
  const mainPath = await writeImage(main, `${base}-main`, 900);
  const partPaths: string[] = [];
  for (const [i, part] of parts.entries()) partPaths.push(await writeImage(part, `${base}-part-${i + 1}`, 320));
  return { mainPath, partPaths, info };
}

async function copyPdf(source: string, name: string) {
  await Bun.write(join(documentsDir, name), Bun.file(source));
  return `/files/documents/${name}`;
}

async function certificateName(source: string) {
  const hash = createHash('sha1').update(new Uint8Array(await Bun.file(source).arrayBuffer())).digest('hex');
  return `certificate-${hash.slice(0, 12)}.pdf`;
}

async function buildArtwork() {
  const doc = mupdf.Document.openDocument(await Bun.file(booklet).arrayBuffer(), 'application/pdf');
  const rasters = new Map<number, mupdf.Pixmap>();
  for (const [name, [page, x0, y0, x1, y1, outWidth]] of Object.entries(ARTWORK)) {
    if (!rasters.has(page)) {
      let found: mupdf.Image | undefined;
      doc.loadPage(page - 1).toStructuredText('preserve-images').walk({
        onImageBlock(_b: number[], _m: unknown, image: mupdf.Image) { found ??= image; }
      });
      if (!found) throw new Error(`No raster on booklet page ${page}`);
      // Booklet pages are CMYK; browsers render CMYK JPEGs with wrong colours
      rasters.set(page, found.toPixmap().convertToColorSpace(mupdf.ColorSpace.DeviceRGB, false));
    }
    const pix = rasters.get(page)!;
    const outHeight = Math.round((outWidth * (y1 - y0)) / (x1 - x0));
    const crop = pix.warp([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], outWidth, outHeight);
    await Bun.write(join(assetsDir, name), crop.asJPEG(80));
    console.info(`artwork ${name} ${outWidth}x${outHeight}`);
  }
}

await rm(join(seedDir, 'files'), { recursive: true, force: true });
await mkdir(imagesDir, { recursive: true });
await mkdir(documentsDir, { recursive: true });

const skus = new Set<string>();
const products = [];
for (const [index, row] of ROWS.entries()) {
  if (skus.has(row.sku)) throw new Error(`Duplicate sku ${row.sku}`);
  skus.add(row.sku);
  const base = slug(row.sku);
  const datasheetSource = join(webDir, row.datasheet);
  const { mainPath, partPaths, info } = await extractPhotos(datasheetSource, base, row.noParts);
  const datasheetPdf = await copyPdf(datasheetSource, `${base}-datasheet.pdf`);
  let certificatePdf: string | null = null;
  if (row.certificate) {
    const source = join(webDir, row.certificate);
    certificatePdf = await copyPdf(source, await certificateName(source));
  }
  products.push({
    sku: row.sku,
    product_name: row.sku,
    series: row.series,
    brand: 'EUROSTAT',
    title: row.title ?? (info.title || null),
    specification: info.resistance ? { 'ความต้านทานไฟฟ้าสถิต': info.resistance } : {},
    specification_en: Object.fromEntries(Object.entries(info.specification_en).filter(([, v]) => v)),
    main_image: [mainPath],
    other_image: partPaths,
    datasheet_pdf: datasheetPdf,
    certificate_pdf: certificatePdf,
    certificate_codes: certificatePdf ? ['CE'] : [],
    other: {
      model: row.model, variant: row.variant ?? null, spec: row.spec, sort: index + 1,
      conformity: { en: info.conformity, th: [] }
    }
  });
  console.info(`${String(index + 1).padStart(2)} ${row.series.padEnd(12)} ${row.sku} (${partPaths.length} parts)`);
}

await Bun.write(join(seedDir, 'manifest.json'), JSON.stringify({ products }, null, 2) + '\n');
await buildArtwork();

const count = async (dir: string) => (await readdir(dir)).length;
console.info(`Wrote ${products.length} products, ${await count(imagesDir)} images, ${await count(documentsDir)} documents`);
