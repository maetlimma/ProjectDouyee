import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Award, ArrowLeft, ArrowDownToLine, Box, Check, ChevronDown, ChevronRight, CircleAlert,
  FileText, Image as ImageIcon, Layers3, LoaderCircle, PackagePlus, Pencil, Plus,
  RefreshCw, Search, ShieldCheck, Trash2, UploadCloud, X
} from 'lucide-react';

type Product = {
  product_id: string; sku: string; product_name: string; series: string; brand: string | null;
  title: string | null; main_image: string | null; other_image: string[];
  specification: Record<string, unknown>; specification_en: Record<string, unknown>; size_weights: Record<string, unknown>;
  datasheet_pdf: string | null; certificate_pdf: string | null; other: Record<string, unknown>;
  certificate_codes: string[]; create_ts: string; update_ts: string; create_by: string; update_by: string;
};
type Series = { series_code: string; series_name: string; create_ts: string; update_ts: string; create_by: string; update_by: string };
type Certificate = { certificate_code: string; image: string | null; create_ts: string; update_ts: string; create_by: string; update_by: string };
type Catalogue = { catalogue_id: string; catalogue_name: string; catalogue_pdf: string | null; createTs: string; updateTs: string; createBy: string; updateBy: string };
type Group = { series: string; products: Product[] };

const specificationRows = [
  { key: 'Upper / ส่วนบน', label: 'Upper / ส่วนบน', placeholder: 'เช่น หนัง Split Barton สีดำ' },
  { key: 'Toe cap / หัวรองเท้า', label: 'Toe cap / หัวรองเท้า', placeholder: 'เช่น เหล็ก' },
  { key: 'Midplate / แผ่นกันทะลุ', label: 'Midplate / แผ่นกันทะลุ', placeholder: 'เช่น เหล็ก' },
  { key: 'Footwear only Resistance / ความต้านทานไฟฟ้าสถิต', label: 'Footwear only Resistance / ความต้านทานไฟฟ้าสถิต', placeholder: 'เช่น <10×10³ โอห์ม' },
  { key: 'Color / สี', label: 'Color / สี', placeholder: 'เช่น ส่วนบนสีดำ / พื้นสีดำ' },
];
const productSizes = Array.from({ length: 12 }, (_, index) => String(index + 36));
const superscriptDigits = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

const token = () => localStorage.getItem('douyee_admin_token') ?? '';

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token()}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...init, headers });
  if (response.status === 401) {
    localStorage.removeItem('douyee_admin_token');
    window.location.href = '/admin/login';
    throw new Error('Your admin session has expired. Please sign in again.');
  }
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) throw new Error(`Expected JSON from ${path}; received ${contentType || 'an unknown content type'}.`);
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? `Request failed (${response.status})`);
  return data as T;
}

const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const initials = (value: string) => value.trim().slice(0, 2).toUpperCase() || 'DY';

function Notice({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <div className={`ac-notice ${error ? 'is-error' : 'is-success'}`} role="status">
    {error ? <CircleAlert size={16} /> : <Check size={16} />}{error || success}
  </div>;
}

function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return <label className={`ac-field ${className}`}><span className="ac-field-label">{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function AuthImage({ path, alt, className = '' }: { path?: string | null; alt: string; className?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let objectUrl = '';
    let active = true;
    if (!path) { setSrc(''); return; }
    if (!path.startsWith('/files/')) { setSrc(path); return; }
    fetch(path, { headers: { Authorization: `Bearer ${token()}` } })
      .then((response) => response.ok ? response.blob() : Promise.reject())
      .then((blob) => { objectUrl = URL.createObjectURL(blob); if (active) setSrc(objectUrl); })
      .catch(() => { if (active) setSrc(''); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);
  return src ? <img className={className} src={src} alt={alt} /> : <span className={`ac-image-placeholder ${className}`}><ImageIcon size={18} /></span>;
}

function ProductList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [query, setQuery] = useState('');
  const [series, setSeries] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');
  const [success] = useState((location.state as { notice?: string } | null)?.notice ?? '');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setGroups(await request<Group[]>('/api/v1/product')); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const seriesOptions = useMemo(() => groups.map((group) => group.series), [groups]);
  const filtered = useMemo(() => groups
    .filter((group) => series === 'all' || group.series === series)
    .map((group) => ({ ...group, products: group.products.filter((product) => {
      const q = query.trim().toLowerCase();
      return !q || [product.product_name, product.sku, product.brand ?? '', product.title ?? ''].some((v) => v.toLowerCase().includes(q));
    }) }))
    .filter((group) => group.products.length > 0), [groups, query, series]);
  const productCount = groups.reduce((sum, group) => sum + group.products.length, 0);

  async function removeProduct(product: Product) {
    if (!window.confirm(`Delete ${product.product_name} (${product.sku})? This cannot be undone.`)) return;
    setDeleting(product.product_id); setError('');
    try { await request('/api/v1/product', { method: 'DELETE', body: JSON.stringify({ product_id: product.product_id }) }); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setDeleting(''); }
  }

  return <div className="ac-page">
    <div className="ac-page-heading">
      <div><div className="ac-eyebrow">CATALOG MANAGEMENT</div><h1>Products</h1><p>Maintain product records, series assignment, specifications and documents.</p></div>
      <button className="ac-button ac-button-primary" onClick={() => navigate('/products/new')}><Plus size={16} />Add product</button>
    </div>
    <Notice success={success} />
    <div className="ac-stat-row">
      <div className="ac-stat-card"><span className="ac-stat-icon"><Box size={17} /></span><span><small>Total products</small><strong>{productCount}</strong></span></div>
      <div className="ac-stat-card"><span className="ac-stat-icon green"><Layers3 size={17} /></span><span><small>Product series</small><strong>{groups.length}</strong></span></div>
      <div className="ac-stat-card"><span className="ac-stat-icon amber"><Award size={17} /></span><span><small>Linked certificates</small><strong>{groups.reduce((sum, group) => sum + group.products.reduce((n, p) => n + p.certificate_codes.length, 0), 0)}</strong></span></div>
    </div>
    <Notice error={error} />
    <div className="ac-toolbar">
      <div className="ac-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, SKU or brand" /></div>
      <label className="ac-select-wrap"><span>Series</span><select value={series} onChange={(e) => setSeries(e.target.value)}><option value="all">All series</option>{seriesOptions.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={15} /></label>
      <button className="ac-button ac-button-quiet" onClick={() => void load()} title="Refresh"><RefreshCw size={15} /></button>
    </div>
    {loading ? <div className="ac-loading"><LoaderCircle className="ac-spin" size={22} />Loading products…</div> : filtered.length === 0 ? <div className="ac-empty"><Box size={25} /><strong>{query ? 'No matching products' : 'No products yet'}</strong><span>{query ? 'Try another search or series.' : 'Create a product to start building your catalog.'}</span>{!query && <button className="ac-button ac-button-primary" onClick={() => navigate('/products/new')}><Plus size={15} />Add first product</button>}</div> : filtered.map((group) => <section className="ac-series-group" key={group.series}>
      <div className="ac-series-heading"><div className="ac-series-symbol">{initials(group.series)}</div><div><h2>{group.series}</h2><span>{group.products.length} {group.products.length === 1 ? 'product' : 'products'}</span></div></div>
      <div className="ac-table-card"><div className="ac-table-scroll"><table className="ac-table"><thead><tr><th>Product</th><th>SKU</th><th>Brand</th><th>Certificates</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{group.products.map((product) => <tr key={product.product_id}>
        <td><div className="ac-product-cell"><AuthImage path={product.main_image} alt="" className="ac-product-thumb" /><span><strong>{product.product_name}</strong><small>{product.title || product.series}</small></span></div></td>
        <td><code>{product.sku}</code></td><td>{product.brand || <span className="ac-muted">—</span>}</td>
        <td>{product.certificate_codes.length ? <div className="ac-pills">{product.certificate_codes.map((code) => <span className="ac-pill" key={code}>{code}</span>)}</div> : <span className="ac-muted">None</span>}</td>
        <td><span className="ac-date">{dateLabel(product.update_ts)}</span><small className="ac-audit">by {product.update_by}</small></td>
        <td><div className="ac-row-actions"><button className="ac-icon-button" title="Edit product" onClick={() => navigate(`/products/${product.product_id}/edit`)}><Pencil size={15} /></button><button className="ac-icon-button danger" title="Delete product" disabled={deleting === product.product_id} onClick={() => void removeProduct(product)}>{deleting === product.product_id ? <LoaderCircle size={15} className="ac-spin" /> : <Trash2 size={15} />}</button></div></td>
      </tr>)}</tbody></table></div></div>
    </section>)}
  </div>;
}

function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ sku: '', product_name: '', series: '', brand: '', title: '', specification: {} as Record<string, string>, specification_en: {} as Record<string, string>, size_weights: {} as Record<string, string>, certificate_codes: [] as string[] });
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [otherImagePaths, setOtherImagePaths] = useState<string[]>([]);
  const [otherImages, setOtherImages] = useState<File[]>([]);
  const [datasheet, setDatasheet] = useState<File | null>(null);
  const [certificatePdf, setCertificatePdf] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([request<Series[]>('/api/v1/series'), request<Certificate[]>('/api/v1/certificate'), id ? request<Product>(`/api/v1/product/${id}`) : Promise.resolve(null)])
      .then(([seriesData, certificateData, current]) => {
        if (!active) return;
        setSeriesList(seriesData); setCertificates(certificateData); setProduct(current);
        if (current) setForm({ sku: current.sku, product_name: current.product_name, series: current.series, brand: current.brand ?? '', title: current.title ?? '', specification: Object.fromEntries(Object.entries(current.specification ?? {}).map(([key, value]) => [key, String(value ?? '')])), specification_en: Object.fromEntries(Object.entries(current.specification_en ?? {}).map(([key, value]) => [key, String(value ?? '')])), size_weights: Object.fromEntries(Object.entries(current.size_weights ?? {}).map(([key, value]) => [key, String(value ?? '')])), certificate_codes: current.certificate_codes ?? [] });
        if (current) setOtherImagePaths(current.other_image ?? []);
        else if (seriesData.length) setForm((old) => ({ ...old, series: seriesData[0].series_code }));
      })
      .catch((e) => { if (active) setError((e as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function toggleCertificate(code: string) { update('certificate_codes', form.certificate_codes.includes(code) ? form.certificate_codes.filter((entry) => entry !== code) : [...form.certificate_codes, code]); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const body = new FormData();
      body.append('sku', form.sku.trim()); body.append('product_name', form.product_name.trim()); body.append('series', form.series);
      body.append('brand', form.brand.trim()); body.append('title', form.title.trim());
      body.append('specification', JSON.stringify(Object.fromEntries(specificationRows.map(({ key }) => [key, form.specification[key] ?? ''])))); body.append('specification_en', JSON.stringify(Object.fromEntries(specificationRows.map(({ key }) => [key, form.specification_en[key] ?? ''])))); body.append('size_weights', JSON.stringify(Object.fromEntries(productSizes.map((size) => [size, form.size_weights[size] ?? ''])))); body.append('other', JSON.stringify(product?.other ?? {}));
      body.append('certificate_codes', JSON.stringify(form.certificate_codes));
      body.append('other_image', JSON.stringify(otherImagePaths));
      if (product?.main_image) body.append('main_image', product.main_image);
      if (product?.datasheet_pdf) body.append('datasheet_pdf', product.datasheet_pdf);
      if (product?.certificate_pdf) body.append('certificate_pdf', product.certificate_pdf);
      if (mainImage) body.append('main_image_file', mainImage);
      for (const file of otherImages) body.append('other_image_files', file);
      if (datasheet) body.append('datasheet_pdf_file', datasheet);
      if (certificatePdf) body.append('certificate_pdf_file', certificatePdf);
      if (id) body.append('product_id', id);
      const saved = await request<Product>('/api/v1/product', { method: id ? 'PUT' : 'POST', body });
      navigate('/dashboard', { replace: true, state: { notice: `${saved.product_name} saved successfully.` } });
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function downloadDocument(kind: 'datasheet' | 'certificate') {
    if (!id) return;
    try {
      const response = await fetch(`/api/v1/product/${id}/${kind}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!response.ok) throw new Error('The document could not be downloaded.');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${form.sku || 'product'}-${kind}.pdf`; anchor.click(); URL.revokeObjectURL(url);
    } catch (e) { setError((e as Error).message); }
  }

  if (loading) return <div className="ac-page"><div className="ac-loading"><LoaderCircle className="ac-spin" size={22} />Loading product…</div></div>;
  return <div className="ac-page ac-editor-page">
    <Link className="ac-back-link" to="/dashboard"><ArrowLeft size={15} />Back to products</Link>
    <div className="ac-page-heading"><div><div className="ac-eyebrow">PRODUCT RECORD</div><h1>{editing ? 'Edit product' : 'New product'}</h1><p>Product fields follow the Product API model. A series is required for every product.</p></div><div className="ac-editor-status"><span className="ac-status-dot" />{editing ? 'Editing record' : 'Draft'}</div></div>
    <Notice error={error} />
    <form onSubmit={submit} className="ac-editor-layout">
      <div className="ac-editor-main">
        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon"><Box size={17} /></div><div><h2>Product details</h2><p>Core identity and series assignment</p></div></div>
          <div className="ac-form-grid"><Field label="Product name *"><input className="ac-input" required value={form.product_name} onChange={(e) => update('product_name', e.target.value)} placeholder="Product name" /></Field>
            <Field label="SKU *"><input className="ac-input" required value={form.sku} onChange={(e) => update('sku', e.target.value)} placeholder="e.g. ES-2401" /></Field>
            <Field label="Series *"><select className="ac-input" required value={form.series} onChange={(e) => update('series', e.target.value)}><option value="" disabled>Select a series</option>{seriesList.map((entry) => <option key={entry.series_code} value={entry.series_code}>{entry.series_name} · {entry.series_code}</option>)}</select></Field>
            <Field label="Brand"><input className="ac-input" value={form.brand} onChange={(e) => update('brand', e.target.value)} placeholder="Brand name" /></Field>
            <Field label="Title" className="ac-field-span"><input className="ac-input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Optional display title" /></Field>
          </div>
        </section>

        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon purple"><FileText size={17} /></div><div><h2>Product Specifications / รายละเอียดสินค้า</h2><p>กรอกข้อมูลทั้งภาษาไทย (TH) และภาษาอังกฤษ (EN)</p></div></div>
          <div className="ac-spec-table">{specificationRows.map(({ key, label, placeholder }) => <div className="ac-spec-row" key={key}><div className="ac-spec-label">{label}</div><div className="ac-spec-value ac-spec-bilingual"><label className="ac-spec-language"><span>TH</span><input className="ac-input" value={form.specification[key] ?? ''} onChange={(e) => update('specification', { ...form.specification, [key]: e.target.value })} placeholder={placeholder} /></label><label className="ac-spec-language"><span>EN</span><input className="ac-input" value={form.specification_en[key] ?? ''} onChange={(e) => update('specification_en', { ...form.specification_en, [key]: e.target.value })} placeholder="Enter in English" />{key.startsWith('Footwear only Resistance') && <div className="ac-superscript-picker"><button type="button" className="ac-superscript-trigger" aria-label="Show superscript digits" title="Superscript digits">xⁿ</button><div className="ac-superscript-tools" aria-label="Choose superscript digit">{superscriptDigits.map((digit, index) => <button key={digit} type="button" className="ac-superscript-button" title={`Insert superscript ${index}`} onClick={() => update('specification_en', { ...form.specification_en, [key]: `${form.specification_en[key] ?? ''}${digit}` })}>{digit}</button>)}</div></div>}</label></div></div>)}</div>
          <section className="ac-size-section"><div className="ac-size-heading"><strong>ขนาด / น้ำหนักเฉลี่ยต่อคู่ (กรัม)</strong><span>กรอกน้ำหนักแยกตามไซซ์ · 36–47</span></div><div className="ac-size-table-wrap"><table className="ac-size-table"><tbody><tr><th>Size</th>{productSizes.map((size) => <th key={size}>{size}</th>)}</tr><tr><th>Weight</th>{productSizes.map((size) => <td key={size}><input aria-label={`Weight for size ${size}`} inputMode="decimal" value={form.size_weights[size] ?? ''} onChange={(e) => update('size_weights', { ...form.size_weights, [size]: e.target.value })} placeholder="—" /></td>)}</tr></tbody></table></div></section>
        </section>

        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon amber"><Award size={17} /></div><div><h2>Certificates</h2><p>Product to certificate relationships</p></div></div>
          {certificates.length ? <div className="ac-cert-picker">{certificates.map((certificate) => <label className={`ac-cert-option ${form.certificate_codes.includes(certificate.certificate_code) ? 'checked' : ''}`} key={certificate.certificate_code}>
            <input type="checkbox" checked={form.certificate_codes.includes(certificate.certificate_code)} onChange={() => toggleCertificate(certificate.certificate_code)} />
            <span className="ac-check-box">{form.certificate_codes.includes(certificate.certificate_code) && <Check size={12} />}</span>
            <AuthImage path={certificate.image} alt="" className="ac-cert-thumb" />
            <span><strong>{certificate.certificate_code}</strong><small>Certificate type</small></span>
          </label>)}</div> : <div className="ac-inline-empty">No certificate types yet. <Link to="/certificates">Add a certificate type</Link></div>}
        </section>
      </div>
      <aside className="ac-editor-side">
        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon green"><ImageIcon size={17} /></div><div><h2>Product media</h2><p>Images are saved to host storage</p></div></div>
          <Field label="Main image" hint={product?.main_image || 'JPG, PNG, WebP or AVIF · max 12 MiB'}><div className="ac-image-preview"><AuthImage path={product?.main_image} alt="Current product image" /><label className="ac-upload-button"><UploadCloud size={15} />{mainImage ? mainImage.name : product?.main_image ? 'Replace image' : 'Choose image'}<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setMainImage(e.target.files?.[0] ?? null)} /></label></div></Field>
          <Field label="Additional images" hint={otherImagePaths.length ? `${otherImagePaths.length} linked image(s)` : 'Add one or more product images'}>
            {otherImagePaths.length > 0 && <div className="ac-existing-images">{otherImagePaths.map((path) => <div className="ac-existing-image" key={path}><AuthImage path={path} alt="Product image" /><button type="button" title="Remove image from product" onClick={() => setOtherImagePaths((current) => current.filter((entry) => entry !== path))}><X size={12} /></button></div>)}</div>}
            <label className="ac-upload-drop"><UploadCloud size={17} /><span>{otherImages.length ? `${otherImages.length} new file(s) selected` : 'Choose image files'}</span><input hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setOtherImages(Array.from(e.target.files ?? []))} /></label>
          </Field>
        </section>
        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon red"><FileText size={17} /></div><div><h2>Documents</h2><p>PDF files · max 30 MiB</p></div></div>
          <FileField label="Datasheet PDF" current={product?.datasheet_pdf} file={datasheet} accept="application/pdf" onChange={setDatasheet} onDownload={() => void downloadDocument('datasheet')} />
          <FileField label="Certificate PDF" current={product?.certificate_pdf} file={certificatePdf} accept="application/pdf" onChange={setCertificatePdf} onDownload={() => void downloadDocument('certificate')} />
        </section>
        {product && <section className="ac-audit-card"><div><ShieldCheck size={15} />AUDIT HISTORY</div><p>Created <strong>{dateLabel(product.create_ts)}</strong></p><small>by {product.create_by}</small><p>Last updated <strong>{dateLabel(product.update_ts)}</strong></p><small>by {product.update_by}</small></section>}
        {seriesList.length === 0 && <div className="ac-inline-empty">Create a series before saving products. <Link to="/series">Manage series</Link></div>}
      </aside>
      <div className="ac-form-actions"><button type="button" className="ac-button ac-button-quiet" onClick={() => navigate('/dashboard')}>Cancel</button><button type="submit" className="ac-button ac-button-primary" disabled={saving || !seriesList.length}>{saving ? <LoaderCircle className="ac-spin" size={15} /> : <Check size={15} />}{saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button></div>
    </form>
  </div>;
}

function FileField({ label, current, file, accept, onChange, onDownload }: { label: string; current?: string | null; file: File | null; accept: string; onChange: (file: File | null) => void; onDownload: () => void }) {
  return <Field label={label} hint={file?.name || (current ? 'Existing PDF stored on server' : 'No file linked')}><div className="ac-document-actions">{current && <button type="button" className="ac-download-button" onClick={onDownload}><ArrowDownToLine size={14} />Download</button>}<label className="ac-file-pick"><FileText size={16} /><span>{file?.name || (current ? 'Replace PDF' : 'Choose PDF')}</span><input hidden type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} /></label></div></Field>;
}

function SeriesManager() {
  const [items, setItems] = useState<Series[]>([]);
  const [code, setCode] = useState(''); const [name, setName] = useState(''); const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setItems(await request<Series[]>('/api/v1/series')); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  function reset() { setCode(''); setName(''); setEditing(false); }
  function edit(item: Series) { setCode(item.series_code); setName(item.series_name); setEditing(true); setError(''); setSuccess(''); }
  async function submit(e: FormEvent) { e.preventDefault(); setSaving(true); setError(''); setSuccess(''); try { await request('/api/v1/series', { method: editing ? 'PUT' : 'POST', body: JSON.stringify({ series_code: code.trim(), series_name: name.trim() }) }); setSuccess(editing ? 'Series updated.' : 'Series created.'); reset(); await load(); } catch (err) { setError((err as Error).message); } finally { setSaving(false); } }
  async function remove(item: Series) { if (!window.confirm(`Delete series “${item.series_name}”? Series used by products cannot be deleted.`)) return; setError(''); try { await request('/api/v1/series', { method: 'DELETE', body: JSON.stringify({ series_code: item.series_code }) }); setSuccess('Series deleted.'); await load(); } catch (e) { setError((e as Error).message); } }

  return <div className="ac-page"><div className="ac-page-heading"><div><div className="ac-eyebrow">REFERENCE DATA</div><h1>Series</h1><p>Manage SeriesType records used to group and classify products.</p></div><div className="ac-heading-count"><Layers3 size={16} />{items.length} series</div></div>
    <Notice error={error} success={success} />
    <div className="ac-resource-layout"><form className="ac-form-card ac-resource-form" onSubmit={submit}><div className="ac-card-heading"><div className="ac-card-icon green"><Layers3 size={17} /></div><div><h2>{editing ? 'Edit series' : 'Add a series'}</h2><p>Series code is the product foreign key.</p></div></div>
      <Field label="Series code *" hint={editing ? 'The key cannot be changed while editing.' : 'Use the API code, for example “ESD Series”.'}><input className="ac-input" required disabled={editing} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ESD Series" /></Field>
      <Field label="Series name *"><input className="ac-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" /></Field>
      <div className="ac-resource-actions">{editing && <button type="button" className="ac-button ac-button-quiet" onClick={reset}>Cancel</button>}<button className="ac-button ac-button-primary" disabled={saving}>{saving ? <LoaderCircle className="ac-spin" size={15} /> : editing ? <Check size={15} /> : <Plus size={15} />}{editing ? 'Save series' : 'Create series'}</button></div>
    </form>
    <section className="ac-table-card ac-resource-table"><div className="ac-table-title"><div><h2>All series</h2><p>Products reference the series code shown here.</p></div><button className="ac-button ac-button-quiet" onClick={() => void load()}><RefreshCw size={15} /></button></div>
      {loading ? <div className="ac-loading"><LoaderCircle className="ac-spin" size={20} />Loading series…</div> : items.length ? <div className="ac-table-scroll"><table className="ac-table"><thead><tr><th>Series</th><th>Code</th><th>Updated</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.series_code}><td><div className="ac-product-cell"><span className="ac-series-symbol">{initials(item.series_name)}</span><span><strong>{item.series_name}</strong><small>Product grouping</small></span></div></td><td><code>{item.series_code}</code></td><td><span className="ac-date">{dateLabel(item.update_ts)}</span><small className="ac-audit">by {item.update_by}</small></td><td><div className="ac-row-actions"><button className="ac-icon-button" title="Edit series" onClick={() => edit(item)}><Pencil size={15} /></button><button className="ac-icon-button danger" title="Delete series" onClick={() => void remove(item)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <div className="ac-empty compact"><Layers3 size={23} /><strong>No series available</strong><span>Add a series before creating products.</span></div>}
    </section></div>
  </div>;
}

function CertificatesManager() {
  const [items, setItems] = useState<Certificate[]>([]); const [code, setCode] = useState(''); const [image, setImage] = useState<File | null>(null); const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setItems(await request<Certificate[]>('/api/v1/certificate')); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  function reset() { setCode(''); setImage(null); setEditing(false); }
  function edit(item: Certificate) { setCode(item.certificate_code); setImage(null); setEditing(true); setError(''); setSuccess(''); }
  async function submit(e: FormEvent) { e.preventDefault(); setSaving(true); setError(''); setSuccess(''); try { const body = new FormData(); body.append('certificate_code', code.trim()); if (image) body.append('image_file', image); await request('/api/v1/certificate', { method: editing ? 'PUT' : 'POST', body }); setSuccess(editing ? 'Certificate type updated.' : 'Certificate type created.'); reset(); await load(); } catch (err) { setError((err as Error).message); } finally { setSaving(false); } }
  async function remove(item: Certificate) { if (!window.confirm(`Delete certificate type “${item.certificate_code}”? Linked products must be unassigned first.`)) return; setError(''); try { await request('/api/v1/certificate', { method: 'DELETE', body: JSON.stringify({ certificate_code: item.certificate_code }) }); setSuccess('Certificate type deleted.'); await load(); } catch (e) { setError((e as Error).message); } }

  return <div className="ac-page"><div className="ac-page-heading"><div><div className="ac-eyebrow">REFERENCE DATA</div><h1>Certificates</h1><p>Manage CertificateType records and link them to products.</p></div><div className="ac-heading-count"><Award size={16} />{items.length} types</div></div>
    <Notice error={error} success={success} />
    <div className="ac-resource-layout"><form className="ac-form-card ac-resource-form" onSubmit={submit}><div className="ac-card-heading"><div className="ac-card-icon amber"><Award size={17} /></div><div><h2>{editing ? 'Edit certificate type' : 'Add a certificate type'}</h2><p>Certificate code is used in product links.</p></div></div>
      <Field label="Certificate code *" hint={editing ? 'The key cannot be changed while editing.' : 'For example CE or MS.'}><input className="ac-input" required disabled={editing} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CE" /></Field>
      <Field label="Certificate image" hint={image?.name || (editing ? 'Leave blank to keep the current image.' : 'PNG, JPG, WebP or AVIF · max 12 MiB')}><label className="ac-upload-drop"><UploadCloud size={17} /><span>{image?.name || 'Choose an image file'}</span><input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setImage(e.target.files?.[0] ?? null)} /></label></Field>
      <div className="ac-resource-actions">{editing && <button type="button" className="ac-button ac-button-quiet" onClick={reset}>Cancel</button>}<button className="ac-button ac-button-primary" disabled={saving}>{saving ? <LoaderCircle className="ac-spin" size={15} /> : editing ? <Check size={15} /> : <Plus size={15} />}{editing ? 'Save certificate' : 'Create certificate'}</button></div>
    </form>
    <section className="ac-certificate-grid-wrap"><div className="ac-table-title"><div><h2>Certificate types</h2><p>Linked to products through CertificateProduct.</p></div><button className="ac-button ac-button-quiet" onClick={() => void load()}><RefreshCw size={15} /></button></div>
      {loading ? <div className="ac-loading"><LoaderCircle className="ac-spin" size={20} />Loading certificates…</div> : items.length ? <div className="ac-certificate-grid">{items.map((item) => <article className="ac-certificate-card" key={item.certificate_code}><div className="ac-certificate-image"><AuthImage path={item.image} alt={`${item.certificate_code} certificate`} /></div><div className="ac-certificate-info"><span className="ac-eyebrow">CERTIFICATE CODE</span><h3>{item.certificate_code}</h3><small>Updated {dateLabel(item.update_ts)} · {item.update_by}</small><div className="ac-row-actions"><button className="ac-icon-button" title="Edit certificate" onClick={() => edit(item)}><Pencil size={15} /></button><button className="ac-icon-button danger" title="Delete certificate" onClick={() => void remove(item)}><Trash2 size={15} /></button></div></div></article>)}</div> : <div className="ac-empty compact"><Award size={23} /><strong>No certificate types</strong><span>Add a certificate type for product records.</span></div>}
    </section></div>
  </div>;
}

function CataloguesManager() {
  const [items, setItems] = useState<Catalogue[]>([]); const [name, setName] = useState(''); const [pdf, setPdf] = useState<File | null>(null); const [editing, setEditing] = useState<Catalogue | null>(null);
  const [page, setPage] = useState(1); const [limit] = useState(10); const [total, setTotal] = useState(0); const [totalPages, setTotalPages] = useState(0); const [sort, setSort] = useState('catalogue_name'); const [order, setOrder] = useState<'asc' | 'desc'>('asc'); const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const params = new URLSearchParams({ page: String(page), limit: String(limit), sort, order, ...(search.trim() ? { search: search.trim() } : {}) }); const result = await request<{ data: Catalogue[]; total: number; totalPages: number }>(`/api/v1/catalogue?${params}`); setItems(result.data); setTotal(result.total); setTotalPages(result.totalPages); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } }, [page, limit, sort, order, search]);
  useEffect(() => { void load(); }, [load]);
  function reset() { setName(''); setPdf(null); setEditing(null); }
  function edit(item: Catalogue) { setEditing(item); setName(item.catalogue_name); setPdf(null); setError(''); setSuccess(''); }
  async function submit(e: FormEvent) { e.preventDefault(); setSaving(true); setError(''); setSuccess(''); try { const body = new FormData(); body.append('catalogue_name', name.trim()); if (editing) body.append('catalogue_id', editing.catalogue_id); if (pdf) body.append('catalogue_pdf_file', pdf); await request('/api/v1/catalogue', { method: editing ? 'PUT' : 'POST', body }); setSuccess(editing ? 'Catalogue updated.' : 'Catalogue created.'); reset(); await load(); } catch (e) { setError((e as Error).message); } finally { setSaving(false); } }
  async function remove(item: Catalogue) { if (!window.confirm(`Delete catalogue “${item.catalogue_name}”?`)) return; setError(''); try { await request('/api/v1/catalogue', { method: 'DELETE', body: JSON.stringify({ catalogue_id: item.catalogue_id }) }); setSuccess('Catalogue deleted.'); if (items.length === 1 && page > 1) setPage(page - 1); else await load(); } catch (e) { setError((e as Error).message); } }
  async function openPdf(item: Catalogue) { try { const response = await fetch(`/api/v1/catalogue/${item.catalogue_id}/pdf`, { headers: { Authorization: `Bearer ${token()}` } }); if (!response.ok) throw new Error('The catalogue PDF could not be opened.'); const url = URL.createObjectURL(await response.blob()); window.open(url, '_blank', 'noopener'); window.setTimeout(() => URL.revokeObjectURL(url), 60_000); } catch (e) { setError((e as Error).message); } }

  return <div className="ac-page"><div className="ac-page-heading"><div><div className="ac-eyebrow">CATALOG MANAGEMENT</div><h1>Catalogues</h1><p>Upload and manage catalogue PDF files.</p></div><div className="ac-heading-count"><FileText size={16} />{total} catalogues</div></div>
    <Notice error={error} success={success} />
    <div className="ac-resource-layout"><form className="ac-form-card ac-resource-form" onSubmit={submit}><div className="ac-card-heading"><div className="ac-card-icon red"><FileText size={17} /></div><div><h2>{editing ? 'Edit catalogue' : 'Add a catalogue'}</h2><p>{editing ? 'Update its name or replace the PDF.' : 'Add a catalogue and its PDF document.'}</p></div></div>
      <Field label="Catalogue name *"><input className="ac-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Safety Footwear Catalogue" /></Field>
      <Field label="Catalogue PDF" hint={pdf?.name || (editing?.catalogue_pdf ? 'Leave blank to keep the current PDF.' : 'PDF · max 30 MiB')}><label className="ac-upload-drop"><UploadCloud size={17} /><span>{pdf?.name || (editing?.catalogue_pdf ? 'Replace PDF' : 'Choose PDF file')}</span><input hidden type="file" accept="application/pdf,.pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></label></Field>
      <div className="ac-resource-actions">{editing && <button type="button" className="ac-button ac-button-quiet" onClick={reset}>Cancel</button>}<button className="ac-button ac-button-primary" disabled={saving}>{saving ? <LoaderCircle className="ac-spin" size={15} /> : editing ? <Check size={15} /> : <Plus size={15} />}{editing ? 'Save catalogue' : 'Create catalogue'}</button></div>
    </form>
    <section className="ac-table-card ac-resource-table"><div className="ac-table-title"><div><h2>All catalogues</h2><p>Sorted and paginated catalogue records.</p></div><button className="ac-button ac-button-quiet" onClick={() => void load()} title="Refresh"><RefreshCw size={15} /></button></div>
      <div className="ac-catalogue-toolbar"><div className="ac-search"><Search size={16} /><input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search catalogue name" /></div><label className="ac-catalogue-sort"><span>Sort</span><select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}><option value="catalogue_name">Name</option><option value="createTs">Created</option><option value="updateTs">Updated</option><option value="catalogue_id">ID</option></select></label><button className="ac-button ac-button-quiet" onClick={() => setOrder((value) => value === 'asc' ? 'desc' : 'asc')}>{order === 'asc' ? 'A–Z ↑' : 'Z–A ↓'}</button></div>
      {loading ? <div className="ac-loading"><LoaderCircle className="ac-spin" size={20} />Loading catalogues…</div> : items.length ? <><div className="ac-table-scroll"><table className="ac-table"><thead><tr><th>Catalogue</th><th>PDF</th><th>Updated</th><th>Created by</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.catalogue_id}><td><div className="ac-product-cell"><span className="ac-series-symbol"><FileText size={16} /></span><span><strong>{item.catalogue_name}</strong><small><code>{item.catalogue_id}</code></small></span></div></td><td>{item.catalogue_pdf ? <button className="ac-download-button" onClick={() => void openPdf(item)}><ArrowDownToLine size={14} />View PDF</button> : <span className="ac-muted">No PDF</span>}</td><td><span className="ac-date">{dateLabel(item.updateTs)}</span><small className="ac-audit">by {item.updateBy}</small></td><td>{item.createBy}</td><td><div className="ac-row-actions"><button className="ac-icon-button" title="Edit catalogue" onClick={() => edit(item)}><Pencil size={15} /></button><button className="ac-icon-button danger" title="Delete catalogue" onClick={() => void remove(item)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div><div className="ac-pagination"><span>Showing {total ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total}</span><div><button className="ac-button ac-button-quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page} of {Math.max(1, totalPages)}</span><button className="ac-button ac-button-quiet" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button></div></div></> : <div className="ac-empty compact"><FileText size={23} /><strong>{search ? 'No matching catalogues' : 'No catalogues yet'}</strong><span>{search ? 'Try another search.' : 'Add a catalogue and upload its PDF.'}</span></div>}
    </section></div>
  </div>;
}

export { ProductList, ProductEditor, SeriesManager, CertificatesManager, CataloguesManager };
