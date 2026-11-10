import { pool } from '../db/pool';

// Read-only view of products and series for the public site (public/catalog.ts)
interface ML { en: string; th: string }

const ml = (text: string): ML => ({ en: text, th: text });

// Series shown first, in the order of the Products menu; any other series follow by name
const SERIES_ORDER = ['ESD Series', 'e9 Series', 'Basic Series'];

const STORED_PATH = /^\/files\/(images|documents)\/([a-zA-Z0-9-]+\.[a-zA-Z0-9]+)$/;

// Stored files are private; the public site reads product files through /api/media
export function publicFileUrl(path: unknown): string | null {
  if (typeof path !== 'string' || !path.trim()) return null;
  const match = STORED_PATH.exec(path);
  return match ? `/api/media/${match[1]}/${match[2]}` : path;
}

// JSONB does not keep key order; follow specificationRows and productSizes in public/views/admin/constants.ts
const SPEC_ROWS = [
  { en: 'Upper', th: 'ส่วนบน' },
  { en: 'Toe cap', th: 'หัวรองเท้า' },
  { en: 'Midplate', th: 'แผ่นกันทะลุ' },
  { en: 'Footwear only Resistance', th: 'ความต้านทานไฟฟ้าสถิต' },
  { en: 'Color', th: 'สี' }
];
const SPEC_ORDER = SPEC_ROWS.map((row) => row.en);
const SIZES = Array.from({ length: 12 }, (_, i) => String(i + 36));
const specRank = (key: string) => {
  const i = SPEC_ORDER.indexOf(key);
  return i === -1 ? SPEC_ORDER.length : i;
};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const list = (value: unknown): string[] =>
  (Array.isArray(value) ? value : value ? [value] : []).filter((v): v is string => typeof v === 'string' && Boolean(v));

// Each language falls back to the other when only one value was entered
function specRows(th: Record<string, unknown>, en: Record<string, unknown>) {
  return SPEC_ROWS.flatMap((row) => {
    const valueEn = text(en[row.en]);
    const valueTh = text(th[row.th]);
    if (!valueEn && !valueTh) return [];
    return [{ key: { en: row.en, th: row.th }, value: { en: valueEn || valueTh, th: valueTh || valueEn } }];
  });
}

// Certificate box lines from product.other.conformity; each language falls back to the other
function conformity(value: unknown): { en: string[]; th: string[] } {
  const source = (value ?? {}) as { en?: unknown; th?: unknown };
  const en = list(source.en).map((s) => s.trim()).filter(Boolean);
  const th = list(source.th).map((s) => s.trim()).filter(Boolean);
  return { en: en.length ? en : th, th: th.length ? th : en };
}

function sizeWeights(value: unknown) {
  const weights = (value ?? {}) as Record<string, unknown>;
  return SIZES.flatMap((size) => {
    const weight = String(weights[size] ?? '').trim();
    return weight ? [{ size, weight }] : [];
  });
}

function toPublicProduct(row: Record<string, any>) {
  const other = (row.other ?? {}) as Record<string, any>;
  const model = typeof other.model === 'string' && other.model ? other.model : row.product_name;
  const main = list(row.main_image).map(publicFileUrl).filter(Boolean) as string[];
  const parts = list(row.other_image).map(publicFileUrl).filter(Boolean) as string[];
  const datasheet = publicFileUrl(row.datasheet_pdf);
  const certificate = publicFileUrl(row.certificate_pdf);
  const specEn = (row.specification_en ?? {}) as Record<string, unknown>;

  return {
    id: row.product_id,
    sku: row.sku,
    status: 'enabled',
    brand: row.brand ?? undefined,
    title: ml(row.title || row.product_name),
    department: row.series,
    subCategory: ml(model),
    model,
    variant: typeof other.variant === 'string' && other.variant ? other.variant : null,
    spec: Array.isArray(other.spec) ? other.spec.filter((s: unknown) => typeof s === 'string') : [],
    sort: Number.isFinite(Number(other.sort)) ? Number(other.sort) : null,
    imagePaths: [...main, ...parts],
    parts,
    pdfPaths: datasheet ? [datasheet] : [],
    downloads: [
      ...(datasheet ? [{ url: datasheet, title: { en: 'Data Sheet', th: 'ข้อมูลจำเพาะ' }, type: 'datasheet' }] : []),
      ...(certificate ? [{ url: certificate, title: { en: 'Certificate', th: 'ใบรับรอง' }, type: 'certificate' }] : [])
    ],
    certifications: row.certificate_codes ?? [],
    certificates: ((row.certificates ?? []) as Array<{ code: string; name: string | null; image: string | null }>).map((c) => ({
      code: c.code,
      name: c.name || c.code,
      image: publicFileUrl(c.image)
    })),
    specs: specRows((row.specification ?? {}) as Record<string, unknown>, specEn),
    sizeWeights: sizeWeights(row.size_weights),
    conformity: conformity(other.conformity),
    contentBlocks: [],
    technicalMatrix: Object.entries(specEn)
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .sort(([a], [b]) => specRank(a) - specRank(b))
      .map(([key, value]) => ({ type: 'standard', key: ml(key), value: ml(String(value)) }))
  };
}

const PRODUCT_SQL = `
  SELECT p.product_id, p.sku, p.product_name, p.series, p.brand, p.title, p.main_image, p.other_image,
         p.specification, p.specification_en, p.size_weights, p.datasheet_pdf, p.certificate_pdf, p.other,
         COALESCE(array_agg(c.certificate_code ORDER BY c.certificate_code) FILTER (WHERE c.certificate_code IS NOT NULL), '{}') AS certificate_codes,
         COALESCE(json_agg(json_build_object('code', c.certificate_code, 'name', t.certificate_name, 'image', t.image)
           ORDER BY c.certificate_code) FILTER (WHERE c.certificate_code IS NOT NULL), '[]') AS certificates
  FROM product p
  LEFT JOIN certificate_product c ON c.product_id = p.product_id
  LEFT JOIN certificate_type t ON t.certificate_code = c.certificate_code`;

export async function listPublicProducts() {
  const { rows } = await pool.query(`${PRODUCT_SQL}
    GROUP BY p.product_id
    ORDER BY p.series,
      CASE WHEN p.other->>'sort' ~ '^[0-9]+(\\.[0-9]+)?$' THEN (p.other->>'sort')::numeric END NULLS LAST,
      p.product_name`);
  return rows.map(toPublicProduct);
}

export async function getPublicProduct(id: string) {
  const { rows } = await pool.query(`${PRODUCT_SQL} WHERE p.product_id = $1 GROUP BY p.product_id`, [id]);
  return rows[0] ? toPublicProduct(rows[0]) : null;
}

export async function listPublicSeries() {
  const { rows } = await pool.query('SELECT series_code, series_name FROM series_type');
  const rank = (code: string) => {
    const i = SERIES_ORDER.indexOf(code);
    return i === -1 ? SERIES_ORDER.length : i;
  };
  return rows
    .sort((a, b) => rank(a.series_code) - rank(b.series_code) || a.series_name.localeCompare(b.series_name))
    .map((row) => ({ id: row.series_code, name: ml(row.series_name), subCategories: [] }));
}

// A stored file is public only while a product, or a certificate linked to a product, references it
export async function isPublicProductFile(folder: string, filename: string) {
  const path = `/files/${folder}/${filename}`;
  if (await isReferencedByProduct(path)) return true;
  const { rowCount } = await pool.query(
    `SELECT 1 FROM certificate_type t
     JOIN certificate_product c ON c.certificate_code = t.certificate_code
     WHERE t.image = $1 LIMIT 1`,
    [path]
  );
  return Boolean(rowCount);
}

// Seed products share certificate files, so a file may only be removed once no product uses it
export async function isReferencedByProduct(path: string) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM product
     WHERE main_image @> $1::jsonb OR other_image @> $1::jsonb OR datasheet_pdf = $2 OR certificate_pdf = $2
     LIMIT 1`,
    [JSON.stringify([path]), path]
  );
  return Boolean(rowCount);
}
