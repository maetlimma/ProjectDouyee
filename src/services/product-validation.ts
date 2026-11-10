import type { ProductInput } from './products';

function invalid(field: string, message: string): never {
  throw Object.assign(new Error(message), { status: 400, code: 'VALIDATION_ERROR', details: { field, message } });
}

export function parseProductInput(body: Record<string, unknown>): ProductInput {
  for (const name of ['sku', 'product_name', 'series']) {
    if (typeof body[name] !== 'string' || !String(body[name]).trim()) invalid(name, `${name} is required`);
  }
  const decode = (field: string, fallback: unknown) => {
    const value = body[field];
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch {
      if ((field === 'main_image' || field === 'other_image') && !value.startsWith('{') && !value.startsWith('[')) {
        return [value];
      }
      invalid(field, `${field} must contain valid JSON`);
    }
  };
  let mainImage = decode('main_image', []);
  if (typeof mainImage === 'string') mainImage = mainImage.trim() ? [mainImage.trim()] : [];
  let otherImage = decode('other_image', []);
  if (typeof otherImage === 'string') otherImage = otherImage.trim() ? [otherImage.trim()] : [];
  const specification = decode('specification', {});
  const specificationEn = decode('specification_en', {});
  const sizeWeights = decode('size_weights', {});
  const other = decode('other', {});
  const certs = decode('certificate_codes', []);
  if (!Array.isArray(mainImage)) invalid('main_image', 'main_image must be a JSON array');
  if (!Array.isArray(otherImage)) invalid('other_image', 'other_image must be a JSON array');
  if (!Array.isArray(certs) || certs.some((code) => typeof code !== 'string')) invalid('certificate_codes', 'certificate_codes must be a string array');
  for (const [field, value] of Object.entries({ specification, specification_en: specificationEn, size_weights: sizeWeights, other })) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(field, `${field} must be a JSON object`);
  }
  return {
    sku: String(body.sku).trim(), product_name: String(body.product_name).trim(), series: String(body.series).trim(),
    brand: typeof body.brand === 'string' ? body.brand : null, title: typeof body.title === 'string' ? body.title : null,
    main_image: mainImage as unknown[], other_image: otherImage as unknown[],
    specification: specification as Record<string, unknown>, specification_en: specificationEn as Record<string, unknown>, size_weights: sizeWeights as Record<string, unknown>,
    datasheet_pdf: typeof body.datasheet_pdf === 'string' ? body.datasheet_pdf : null,
    certificate_pdf: typeof body.certificate_pdf === 'string' ? body.certificate_pdf : null,
    other: other as Record<string, unknown>, certificate_codes: certs as string[],
    version: body.version !== undefined && body.version !== null && body.version !== '' ? Number(body.version) : undefined,
    expected_version: body.expected_version !== undefined && body.expected_version !== null && body.expected_version !== '' ? Number(body.expected_version) : undefined
  };
}
