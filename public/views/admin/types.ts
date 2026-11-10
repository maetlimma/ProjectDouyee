export type Product = {
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
  version: number;
  create_ts: string;
  update_ts: string;
  create_by: string;
  update_by: string;
};

export type Series = {
  series_code: string;
  series_name: string;
  create_ts: string;
  update_ts: string;
  create_by: string;
  update_by: string;
};

export type Certificate = {
  certificate_code: string;
  certificate_name: string | null;
  image: string | null;
  create_ts: string;
  update_ts: string;
  create_by: string;
  update_by: string;
};

export type Catalogue = {
  catalogue_id: string;
  catalogue_name: string;
  catalogue_pdf: string | null;
  createTs: string;
  updateTs: string;
  createBy: string;
  updateBy: string;
};

export type Group = {
  series: string;
  products: Product[];
};

export type AdminAccount = {
  adminId: string;
  email: string;
  createTs: string;
  updateTs: string;
};

export type SortKey = 'sku' | 'name' | 'certs' | 'updated';
export type SortOrder = 'asc' | 'desc';

export type DocModalState = {
  open: boolean;
  title: string;
  url: string | null;
  loading: boolean;
  error: string | null;
};
