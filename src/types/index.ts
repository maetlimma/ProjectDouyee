export interface ProductRecord {
  product_id: string;
  sku: string;
  product_name: string;
  series: string;
  brand: string | null;
  title: string | null;
  main_image: string[] | string | null;
  other_image: string[];
  specification: Record<string, unknown>;
  specification_en: Record<string, unknown>;
  size_weights: Record<string, unknown>;
  datasheet_pdf: string | null;
  certificate_pdf: string | null;
  other: Record<string, unknown>;
  certificate_codes: string[];
  create_ts: string;
  update_ts: string;
  create_by: string;
  update_by: string;
}

export interface SeriesRecord {
  series_code: string;
  series_name: string;
  create_ts: string;
  update_ts: string;
  create_by: string;
  update_by: string;
}

export interface CertificateRecord {
  certificate_code: string;
  image: string | null;
  create_ts: string;
  update_ts: string;
  create_by: string;
  update_by: string;
}

export interface CatalogueRecord {
  catalogue_id: string;
  catalogue_name: string;
  catalogue_pdf: string | null;
  createTs: string;
  updateTs: string;
  createBy: string;
  updateBy: string;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  passwordHash: string;
}
