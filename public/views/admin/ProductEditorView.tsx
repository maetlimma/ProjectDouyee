import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDownToLine, ArrowLeft, Award, Box, Check, CircleAlert, ExternalLink, Eye, FileText, Image as ImageIcon,
  LoaderCircle, Plus, ShieldCheck, UploadCloud, X
} from 'lucide-react';
import { Certificate, Product, Series } from './types';
import { dateLabel, request, token } from './api';
import { productSizes, specificationRows, superscriptDigits } from './constants';
import { Notice } from '../../components/admin/Notice';
import { Field } from '../../components/admin/Field';
import { FileField } from '../../components/admin/FileField';
import { AuthImage } from '../../components/admin/AuthImage';
import { DocPreviewModal } from '../../components/admin/DocPreviewModal';

// Certificate box text is stored as product.other.conformity = { th: string[], en: string[] }
function conformityText(other: Record<string, unknown> | undefined, lang: 'th' | 'en') {
  const lines = (other?.conformity as Record<string, unknown> | undefined)?.[lang];
  return Array.isArray(lines) ? lines.filter((l) => typeof l === 'string').join('\n') : '';
}

const conformityLines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

function FileImageThumb({ file, alt }: { file: File; alt: string }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!url) return null;
  return <img src={url} alt={alt} />;
}

function PreviewModalImg({ file, path, title }: { file?: File; path?: string; title: string }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (file) {
    return url ? <img src={url} alt={title} className="ac-image-preview-modal-img" /> : null;
  }
  return <AuthImage path={path} alt={title} className="ac-image-preview-modal-img" />;
}

export function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflictData, setConflictData] = useState<{
    expected_version?: number;
    current_version?: number;
    updated_by?: string;
    updated_at?: string;
  } | null>(null);
  const [form, setForm] = useState({ sku: '', product_name: '', series: '', brand: '', title: '', specification: {} as Record<string, string>, specification_en: {} as Record<string, string>, size_weights: {} as Record<string, string>, certificate_codes: [] as string[], conformity_th: '', conformity_en: '' });
  const [mainImagePaths, setMainImagePaths] = useState<string[]>([]);
  const [mainImages, setMainImages] = useState<File[]>([]);
  const [otherImagePaths, setOtherImagePaths] = useState<string[]>([]);
  const [otherImages, setOtherImages] = useState<File[]>([]);
  const [datasheet, setDatasheet] = useState<File | null>(null);
  const [datasheetPath, setDatasheetPath] = useState<string | null>(null);
  const [certificatePdf, setCertificatePdf] = useState<File | null>(null);
  const [certificatePdfPath, setCertificatePdfPath] = useState<string | null>(null);
  const resistanceInputRef = useRef<HTMLInputElement>(null);
  const pendingCursorRef = useRef<number | null>(null);
  const resistanceHistoryRef = useRef<Array<{ value: string; cursor: number }>>([]);
  const resistanceHistoryIndexRef = useRef<number>(-1);
  const lastResistanceInputTimeRef = useRef<number>(0);
  const [previewModal, setPreviewModal] = useState<{ path?: string; file?: File; title: string } | null>(null);
  const [docModal, setDocModal] = useState<{ url: string; title: string; downloadName: string } | null>(null);

  const closeDocModal = () => {
    if (docModal?.url) {
      URL.revokeObjectURL(docModal.url);
    }
    setDocModal(null);
  };

  useEffect(() => {
    if (!previewModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewModal(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewModal]);

  useEffect(() => {
    if (!docModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDocModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [docModal]);

  useEffect(() => {
    if (pendingCursorRef.current !== null && resistanceInputRef.current) {
      const pos = pendingCursorRef.current;
      pendingCursorRef.current = null;
      resistanceInputRef.current.focus();
      resistanceInputRef.current.setSelectionRange(pos, pos);
    }
  });

  const recordResistanceHistory = (nextValue: string, nextCursor: number, forceNewStep = false, prevCursor?: number, currentVal = '') => {
    let history = resistanceHistoryRef.current;
    let idx = resistanceHistoryIndexRef.current;

    if (idx === -1 || history.length === 0) {
      const initialVal = currentVal;
      history = [
        { value: initialVal, cursor: prevCursor ?? initialVal.length },
        { value: nextValue, cursor: nextCursor }
      ];
      resistanceHistoryRef.current = history;
      resistanceHistoryIndexRef.current = 1;
      return;
    }

    if (history[idx] && history[idx].value === nextValue) {
      history[idx].cursor = nextCursor;
      return;
    }

    if (prevCursor !== undefined && history[idx]) {
      history[idx].cursor = prevCursor;
    }

    const now = Date.now();
    const isConsecutiveTyping = !forceNewStep &&
      Math.abs(nextValue.length - history[idx].value.length) === 1 &&
      (now - lastResistanceInputTimeRef.current) < 500 &&
      !nextValue.endsWith(' ');

    lastResistanceInputTimeRef.current = now;

    if (isConsecutiveTyping) {
      history[idx] = { value: nextValue, cursor: nextCursor };
    } else {
      const trimmed = history.slice(0, idx + 1);
      trimmed.push({ value: nextValue, cursor: nextCursor });
      if (trimmed.length > 80) trimmed.shift();
      resistanceHistoryRef.current = trimmed;
      resistanceHistoryIndexRef.current = trimmed.length - 1;
    }
  };

  const handleResistanceUndo = () => {
    const idx = resistanceHistoryIndexRef.current;
    if (idx > 0) {
      const prevIdx = idx - 1;
      const step = resistanceHistoryRef.current[prevIdx];
      resistanceHistoryIndexRef.current = prevIdx;
      pendingCursorRef.current = step.cursor;
      setForm((curr) => ({
        ...curr,
        specification: { ...curr.specification, ['ความต้านทานไฟฟ้าสถิต']: step.value },
        specification_en: { ...curr.specification_en, ['Footwear only Resistance']: step.value }
      }));
    }
  };

  const handleResistanceRedo = () => {
    const idx = resistanceHistoryIndexRef.current;
    if (idx < resistanceHistoryRef.current.length - 1) {
      const nextIdx = idx + 1;
      const step = resistanceHistoryRef.current[nextIdx];
      resistanceHistoryIndexRef.current = nextIdx;
      pendingCursorRef.current = step.cursor;
      setForm((curr) => ({
        ...curr,
        specification: { ...curr.specification, ['ความต้านทานไฟฟ้าสถิต']: step.value },
        specification_en: { ...curr.specification_en, ['Footwear only Resistance']: step.value }
      }));
    }
  };

  const handleResistanceKeyDown = (e: React.KeyboardEvent) => {
    const isKeyZ = e.code === 'KeyZ' || e.key.toLowerCase() === 'z' || e.key === 'ผ';
    const isKeyY = e.code === 'KeyY' || e.key.toLowerCase() === 'y' || e.key === 'ำ';
    const isUndo = (e.ctrlKey || e.metaKey) && isKeyZ && !e.shiftKey;
    const isRedo = ((e.ctrlKey || e.metaKey) && isKeyY) ||
                   ((e.ctrlKey || e.metaKey) && e.shiftKey && isKeyZ);
    if (isUndo) {
      e.preventDefault();
      handleResistanceUndo();
    } else if (isRedo) {
      e.preventDefault();
      handleResistanceRedo();
    }
  };

  const applyProductData = (current: Product) => {
    setProduct(current);
    const currentSpec = (current.specification ?? {}) as Record<string, unknown>;
    const currentSpecEn = (current.specification_en ?? {}) as Record<string, unknown>;
    const resistanceVal = String(
      currentSpec['ความต้านทานไฟฟ้าสถิต'] ||
      currentSpecEn['Footwear only Resistance'] ||
      currentSpec['Footwear only Resistance / ความต้านทานไฟฟ้าสถิต'] ||
      currentSpecEn['Footwear only Resistance / ความต้านทานไฟฟ้าสถิต'] ||
      ''
    );
    resistanceHistoryRef.current = [{ value: resistanceVal, cursor: resistanceVal.length }];
    resistanceHistoryIndexRef.current = 0;
    setForm({
      sku: current.sku,
      product_name: current.product_name,
      series: current.series,
      brand: current.brand ?? '',
      title: current.title ?? '',
      specification: Object.fromEntries(
        specificationRows.map((r) => [
          r.key_th,
          r.shared
            ? resistanceVal
            : String(currentSpec[r.key_th] ?? currentSpec[r.label] ?? currentSpec[r.key_en] ?? '')
        ])
      ),
      specification_en: Object.fromEntries(
        specificationRows.map((r) => [
          r.key_en,
          r.shared
            ? resistanceVal
            : String(currentSpecEn[r.key_en] ?? currentSpecEn[r.label] ?? currentSpecEn[r.key_th] ?? '')
        ])
      ),
      size_weights: Object.fromEntries(Object.entries(current.size_weights ?? {}).map(([key, value]) => [key, String(value ?? '')])),
      certificate_codes: current.certificate_codes ?? [],
      conformity_th: conformityText(current.other, 'th'),
      conformity_en: conformityText(current.other, 'en')
    });
    const mImages = Array.isArray(current.main_image)
      ? current.main_image
      : (current.main_image ? [current.main_image] : []);
    setMainImagePaths(mImages);
    const oImages = Array.isArray(current.other_image)
      ? current.other_image
      : (typeof current.other_image === 'string' && current.other_image
          ? (() => { try { const p = JSON.parse(current.other_image); return Array.isArray(p) ? p : [p]; } catch { return [current.other_image]; } })()
          : []);
    setOtherImagePaths(oImages);
    setDatasheetPath(current.datasheet_pdf ?? null);
    setCertificatePdfPath(current.certificate_pdf ?? null);
    setDatasheet(null);
    setCertificatePdf(null);
  };

  const reloadProduct = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    setConflictData(null);
    try {
      const current = await request<Product>(`/api/v1/product/${id}`);
      applyProductData(current);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([request<Series[]>('/api/v1/series'), request<Certificate[]>('/api/v1/certificate'), id ? request<Product>(`/api/v1/product/${id}`) : Promise.resolve(null)])
      .then(([seriesData, certificateData, current]) => {
        if (!active) return;
        setSeriesList(seriesData); setCertificates(certificateData);
        if (current) {
          applyProductData(current);
        } else if (seriesData.length) {
          setProduct(null);
          setDatasheetPath(null);
          setCertificatePdfPath(null);
          setDatasheet(null);
          setCertificatePdf(null);
          setForm((old) => ({ ...old, series: seriesData[0].series_code }));
        }
      })
      .catch((e) => { if (active) setError((e as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function toggleCertificate(code: string) { update('certificate_codes', form.certificate_codes.includes(code) ? form.certificate_codes.filter((entry) => entry !== code) : [...form.certificate_codes, code]); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setConflictData(null);
    try {
      const body = new FormData();
      body.append('sku', form.sku.trim());
      body.append('product_name', form.sku.trim());
      body.append('series', form.series);
      body.append('brand', form.brand.trim());
      body.append('title', form.title.trim());
      body.append('specification', JSON.stringify(Object.fromEntries(specificationRows.map(({ key_th }) => [key_th, form.specification[key_th] ?? ''])))); body.append('specification_en', JSON.stringify(Object.fromEntries(specificationRows.map(({ key_en }) => [key_en, form.specification_en[key_en] ?? ''])))); body.append('size_weights', JSON.stringify(Object.fromEntries(productSizes.map((size) => [size, form.size_weights[size] ?? ''])))); body.append('other', JSON.stringify({ ...(product?.other ?? {}), conformity: { th: conformityLines(form.conformity_th), en: conformityLines(form.conformity_en) } }));
      body.append('certificate_codes', JSON.stringify(form.certificate_codes));
      body.append('main_image', JSON.stringify(mainImagePaths));
      body.append('other_image', JSON.stringify(otherImagePaths));
      body.append('datasheet_pdf', datasheetPath ?? '');
      body.append('certificate_pdf', certificatePdfPath ?? '');
      for (const file of mainImages) body.append('main_image_files', file);
      for (const file of otherImages) body.append('other_image_files', file);
      if (datasheet) body.append('datasheet_pdf_file', datasheet);
      if (certificatePdf) body.append('certificate_pdf_file', certificatePdf);
      if (id) {
        body.append('product_id', id);
        if (product?.version !== undefined) {
          body.append('version', String(product.version));
        }
      }
      const saved = await request<Product>('/api/v1/product', { method: id ? 'PUT' : 'POST', body });
      navigate('/dashboard', { replace: true, state: { notice: `${saved.product_name} saved successfully.` } });
    } catch (e: any) {
      if (e?.status === 409 || e?.code === 'CONFLICT') {
        setConflictData({
          expected_version: e?.details?.expected_version,
          current_version: e?.details?.current_version,
          updated_by: e?.details?.updated_by,
          updated_at: e?.details?.updated_at
        });
        setError('สินค้านี้ถูกแก้ไขโดย Admin ท่านอื่นแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนทำการแก้ไขต่อ');
      } else {
        setError(e?.message || 'Failed to save product');
      }
    } finally { setSaving(false); }
  }

  async function viewDocument(kind: 'datasheet' | 'certificate') {
    if (!id) return;
    try {
      setError('');
      const response = await fetch(`/api/v1/product/${id}/${kind}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!response.ok) throw new Error('The document could not be loaded.');
      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      const title = `${form.sku || 'Product'} · ${kind === 'datasheet' ? 'Datasheet PDF' : 'Certificate PDF'}`;
      setDocModal({ url, title, downloadName: `${form.sku || 'product'}-${kind}.pdf` });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function viewLocalFile(file: File, kindLabel: string) {
    const url = URL.createObjectURL(file);
    setDocModal({ url, title: `${file.name} · (${kindLabel})`, downloadName: file.name });
  }

  if (loading) return <div className="ac-page"><div className="ac-loading"><LoaderCircle className="ac-spin" size={22} />Loading product…</div></div>;
  return <div className="ac-page ac-editor-page">
    <Link className="ac-back-link" to="/dashboard"><ArrowLeft size={15} />Back to products</Link>
    <div className="ac-page-heading"><div><div className="ac-eyebrow">PRODUCT RECORD</div><h1>{editing ? 'Edit product' : 'New product'}</h1><p>Product fields follow the Product API model. A series is required for every product.</p></div><div className="ac-editor-status"><span className="ac-status-dot" />{editing ? 'Editing record' : 'Draft'}</div></div>
    <Notice error={error} onDismiss={() => setError('')} />
    {conflictData && (
      <div className="ac-notice is-error" style={{ marginBottom: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CircleAlert size={20} style={{ flexShrink: 0, color: '#dc2626' }} />
          <div>
            <strong style={{ display: 'block', fontSize: '13.5px', color: '#991b1b' }}>สินค้านี้ถูกแก้ไขโดย Admin ท่านอื่นแล้ว (Version Conflict)</strong>
            <span style={{ display: 'block', fontSize: '12px', color: '#b91c1c', marginTop: 2 }}>
              {conflictData.updated_by ? `แก้ไขล่าสุดโดย: ${conflictData.updated_by} ` : ''}
              {conflictData.updated_at ? `(${new Date(conflictData.updated_at).toLocaleString('th-TH')}) ` : ''}
              — ข้อมูลที่ท่านกำลังแก้ไขอยู่ไม่ใช่เวอร์ชันล่าสุด กรุณาโหลดข้อมูลใหม่เพื่อป้องกันการบันทึกทับ
            </span>
          </div>
        </div>
        <button
          type="button"
          className="ac-button"
          onClick={reloadProduct}
          style={{ flexShrink: 0, height: 34, fontSize: 12, padding: '0 14px', background: '#ffffff', color: '#b91c1c', borderColor: '#fca5a5', fontWeight: 700 }}
        >
          โหลดข้อมูลล่าสุด
        </button>
      </div>
    )}
    <form onSubmit={submit} className="ac-editor-layout">
      <div className="ac-editor-main">
        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon"><Box size={17} /></div><div><h2>Product details</h2><p>Core identity and series assignment</p></div></div>
          <div className="ac-form-grid">
            <Field label="Model *"><input className="ac-input" required value={form.sku} onChange={(e) => update('sku', e.target.value)} /></Field>
            <Field label="Series *"><select className="ac-input" required value={form.series} onChange={(e) => update('series', e.target.value)}><option value="" disabled>Select a series</option>{seriesList.map((entry) => <option key={entry.series_code} value={entry.series_code}>{entry.series_name} · {entry.series_code}</option>)}</select></Field>
            <Field label="Brand"><input className="ac-input" value={form.brand} onChange={(e) => update('brand', e.target.value)} /></Field>
            <Field label="Title"><input className="ac-input" value={form.title} onChange={(e) => update('title', e.target.value)} /></Field>
          </div>
        </section>

        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon purple"><FileText size={17} /></div><div><h2>Product Specifications / รายละเอียดสินค้า</h2><p>กรอกข้อมูลทั้งภาษาไทย (TH) และภาษาอังกฤษ (EN)</p></div></div>
          <div className="ac-spec-table">
            {specificationRows.map(({ key_th, key_en, label, shared }) => {
              if (shared) {
                const val = form.specification[key_th] || form.specification_en[key_en] || '';
                const setShared = (v: string) => setForm((curr) => ({
                  ...curr,
                  specification: { ...curr.specification, [key_th]: v },
                  specification_en: { ...curr.specification_en, [key_en]: v }
                }));
                const insertSuperscript = (digit: string) => {
                  const input = resistanceInputRef.current;
                  const currentText = val;
                  if (!input) {
                    recordResistanceHistory(`${currentText}${digit}`, currentText.length + digit.length, true, currentText.length, currentText);
                    setShared(`${currentText}${digit}`);
                    return;
                  }
                  const isFocused = document.activeElement === input;
                  const start = isFocused && typeof input.selectionStart === 'number'
                    ? input.selectionStart
                    : currentText.length;
                  const end = isFocused && typeof input.selectionEnd === 'number'
                    ? input.selectionEnd
                    : start;

                  const nextVal = currentText.slice(0, start) + digit + currentText.slice(end);
                  const nextCursor = start + digit.length;
                  recordResistanceHistory(nextVal, nextCursor, true, start, currentText);
                  pendingCursorRef.current = nextCursor;
                  setShared(nextVal);
                };
                return (
                  <div className="ac-spec-row" key={key_en}>
                    <div className="ac-spec-label">{label}</div>
                    <div className="ac-spec-value">
                      <input
                        ref={resistanceInputRef}
                        className="ac-input"
                        value={val}
                        onChange={(e) => {
                          const nextVal = e.target.value;
                          const cursor = e.target.selectionStart ?? nextVal.length;
                          recordResistanceHistory(nextVal, cursor, false, undefined, val);
                          setShared(nextVal);
                        }}
                        onKeyDown={handleResistanceKeyDown}
                      />
                      <div className="ac-superscript-picker" onKeyDown={handleResistanceKeyDown}>
                        <button
                          type="button"
                          className="ac-superscript-trigger"
                          aria-label="Show superscript digits"
                          title="Superscript digits"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          xⁿ
                        </button>
                        <div className="ac-superscript-tools" aria-label="Choose superscript digit">
                          {superscriptDigits.map((digit, index) => (
                            <button
                              key={digit}
                              type="button"
                              className="ac-superscript-button"
                              title={`Insert superscript ${index}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => insertSuperscript(digit)}
                            >
                              {index}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div className="ac-spec-row" key={key_en}>
                  <div className="ac-spec-label">{label}</div>
                  <div className="ac-spec-value ac-spec-bilingual">
                    <label className="ac-spec-language">
                      <span>TH</span>
                      <input
                        className="ac-input"
                        value={form.specification[key_th] ?? ''}
                        onChange={(e) => update('specification', { ...form.specification, [key_th]: e.target.value })}
                      />
                    </label>
                    <label className="ac-spec-language">
                      <span>EN</span>
                      <input
                        className="ac-input"
                        value={form.specification_en[key_en] ?? ''}
                        onChange={(e) => update('specification_en', { ...form.specification_en, [key_en]: e.target.value })}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          <section className="ac-size-section"><div className="ac-size-heading"><strong>ขนาด / น้ำหนักเฉลี่ยต่อคู่ (กรัม)</strong><span>กรอกน้ำหนักแยกตามไซซ์ · 36–47</span></div><div className="ac-size-table-wrap"><table className="ac-size-table"><tbody><tr><th>Size</th>{productSizes.map((size) => <th key={size}>{size}</th>)}</tr><tr><th>Weight</th>{productSizes.map((size) => <td key={size}><input aria-label={`Weight for size ${size}`} inputMode="decimal" value={form.size_weights[size] ?? ''} onChange={(e) => update('size_weights', { ...form.size_weights, [size]: e.target.value })} placeholder="—" /></td>)}</tr></tbody></table></div></section>
        </section>

        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon amber"><Award size={17} /></div><div><h2>Certificates</h2><p>Product to certificate relationships</p></div></div>
          {certificates.length ? <div className="ac-cert-picker">{certificates.map((certificate) => <label className={`ac-cert-option ${form.certificate_codes.includes(certificate.certificate_code) ? 'checked' : ''}`} key={certificate.certificate_code}>
            <input type="checkbox" checked={form.certificate_codes.includes(certificate.certificate_code)} onChange={() => toggleCertificate(certificate.certificate_code)} />
            <span className="ac-check-box">{form.certificate_codes.includes(certificate.certificate_code) && <Check size={12} />}</span>
            <AuthImage path={certificate.image} alt="" className="ac-cert-thumb" />
            <span><strong>{certificate.certificate_code}</strong><small>{certificate.certificate_name}</small></span>
          </label>)}</div> : <div className="ac-inline-empty">No certificate types yet. <Link to="/certificates">Add a certificate type</Link></div>}
          <div className="ac-conformity">
            <Field label="Certificate details / มาตรฐานและการรับรอง (TH)" hint="One item per line; shown as a numbered list in the product popup">
              <textarea className="ac-input ac-conformity-input" rows={4} value={form.conformity_th} onChange={(e) => update('conformity_th', e.target.value)} />
            </Field>
            <Field label="Certificate details (EN)" hint="Used when the TH box is empty, and for English visitors">
              <textarea className="ac-input ac-conformity-input" rows={4} value={form.conformity_en} onChange={(e) => update('conformity_en', e.target.value)} />
            </Field>
          </div>
        </section>
      </div>
      <aside className="ac-editor-side">
        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon green"><ImageIcon size={17} /></div><div><h2>Product media</h2><p>Images are saved to host storage</p></div></div>
          <Field label="Main images" hint={mainImagePaths.length ? `${mainImagePaths.length} linked image(s)` : 'Add one or more main product images'}>
            {mainImagePaths.length > 0 && (
              <div className="ac-existing-images">
                {mainImagePaths.map((path, idx) => (
                  <div className="ac-existing-image" key={path}>
                    <button
                      type="button"
                      className="ac-existing-image-thumb"
                      onClick={() => setPreviewModal({ path, title: `Main image #${idx + 1}` })}
                      title="Click to preview image"
                    >
                      <AuthImage path={path} alt="Main product image" />
                      <span className="ac-thumb-zoom-icon"><Eye size={13} /></span>
                    </button>
                    <button
                      type="button"
                      className="ac-existing-image-remove"
                      title="Remove image from product"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMainImagePaths((current) => current.filter((entry) => entry !== path));
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {mainImages.length > 0 && (
              <div className="ac-new-images-wrap">
                <small className="ac-new-images-label">New main images to upload:</small>
                <div className="ac-existing-images">
                  {mainImages.map((file, idx) => (
                    <div className="ac-existing-image" key={`${file.name}-${idx}`}>
                      <button
                        type="button"
                        className="ac-existing-image-thumb"
                        onClick={() => setPreviewModal({ file, title: file.name })}
                        title="Click to preview new image"
                      >
                        <FileImageThumb file={file} alt={file.name} />
                        <span className="ac-thumb-zoom-icon"><Eye size={13} /></span>
                      </button>
                      <button
                        type="button"
                        className="ac-existing-image-remove"
                        title="Remove new image"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMainImages((current) => current.filter((_, i) => i !== idx));
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <label className="ac-upload-drop">
              <UploadCloud size={17} />
              <span>{mainImages.length ? `${mainImages.length} new main image(s) selected` : 'Upload main image'}</span>
              <input
                hidden
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) {
                    setMainImages((prev) => [...prev, ...files]);
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </Field>
          <Field label="Additional images" hint={otherImagePaths.length ? `${otherImagePaths.length} linked image(s)` : 'Add one or more product images'}>
            {otherImagePaths.length > 0 && (
              <div className="ac-existing-images">
                {otherImagePaths.map((path, idx) => (
                  <div className="ac-existing-image" key={path}>
                    <button
                      type="button"
                      className="ac-existing-image-thumb"
                      onClick={() => setPreviewModal({ path, title: `Additional image #${idx + 1}` })}
                      title="Click to preview image"
                    >
                      <AuthImage path={path} alt="Product image" />
                      <span className="ac-thumb-zoom-icon"><Eye size={13} /></span>
                    </button>
                    <button
                      type="button"
                      className="ac-existing-image-remove"
                      title="Remove image from product"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOtherImagePaths((current) => current.filter((entry) => entry !== path));
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {otherImages.length > 0 && (
              <div className="ac-new-images-wrap">
                <small className="ac-new-images-label">New additional images to upload:</small>
                <div className="ac-existing-images">
                  {otherImages.map((file, idx) => (
                    <div className="ac-existing-image" key={`${file.name}-${idx}`}>
                      <button
                        type="button"
                        className="ac-existing-image-thumb"
                        onClick={() => setPreviewModal({ file, title: file.name })}
                        title="Click to preview new image"
                      >
                        <FileImageThumb file={file} alt={file.name} />
                        <span className="ac-thumb-zoom-icon"><Eye size={13} /></span>
                      </button>
                      <button
                        type="button"
                        className="ac-existing-image-remove"
                        title="Remove new image"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOtherImages((current) => current.filter((_, i) => i !== idx));
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <label className="ac-upload-drop">
              <UploadCloud size={17} />
              <span>{otherImages.length ? `${otherImages.length} new file(s) selected` : 'Upload image'}</span>
              <input
                hidden
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) {
                    setOtherImages((prev) => [...prev, ...files]);
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </Field>
        </section>
        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon red"><FileText size={17} /></div><div><h2>Documents</h2><p>PDF files · max 60 MB</p></div></div>
          <FileField
            label="Datasheet PDF"
            current={datasheetPath}
            file={datasheet}
            accept="application/pdf"
            onChange={setDatasheet}
            onView={() => {
              if (datasheet) viewLocalFile(datasheet, 'Datasheet PDF');
              else if (datasheetPath) void viewDocument('datasheet');
            }}
            onClearFile={() => setDatasheet(null)}
            onRemove={() => {
              setDatasheetPath(null);
              setDatasheet(null);
            }}
          />
          <FileField
            label="Certificate PDF"
            current={certificatePdfPath}
            file={certificatePdf}
            accept="application/pdf"
            onChange={setCertificatePdf}
            onView={() => {
              if (certificatePdf) viewLocalFile(certificatePdf, 'Certificate PDF');
              else if (certificatePdfPath) void viewDocument('certificate');
            }}
            onClearFile={() => setCertificatePdf(null)}
            onRemove={() => {
              setCertificatePdfPath(null);
              setCertificatePdf(null);
            }}
          />
        </section>
        {product && <section className="ac-audit-card"><div><ShieldCheck size={15} />LAST UPDATED</div><p>Created <strong>{dateLabel(product.create_ts)}</strong></p><small>{product.create_by}</small><p>Last updated <strong>{dateLabel(product.update_ts)}</strong></p><small>{product.update_by}</small></section>}
        {seriesList.length === 0 && <div className="ac-inline-empty">Create a series before saving products. <Link to="/series">Manage series</Link></div>}
      </aside>
      <div className="ac-form-actions"><button type="button" className="ac-button ac-button-quiet" onClick={() => navigate('/dashboard')}>Cancel</button><button type="submit" className="ac-button ac-button-primary" disabled={saving || !seriesList.length}>{saving ? <LoaderCircle className="ac-spin" size={15} /> : <Check size={15} />}{saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button></div>
      {previewModal && (
        <div className="ac-image-preview-modal-backdrop" onClick={() => setPreviewModal(null)}>
          <div className="ac-image-preview-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ac-image-preview-modal-header">
              <div className="ac-image-preview-modal-title">
                <ImageIcon size={16} />
                <span>{previewModal.title}</span>
              </div>
              <button
                type="button"
                className="ac-image-preview-modal-close"
                onClick={() => setPreviewModal(null)}
                title="Close preview (Esc)"
              >
                <X size={18} />
              </button>
            </div>
            <div className="ac-image-preview-modal-body">
              <PreviewModalImg
                file={previewModal.file}
                path={previewModal.path}
                title={previewModal.title}
              />
            </div>
          </div>
        </div>
      )}
      <DocPreviewModal
        modal={docModal}
        onClose={closeDocModal}
      />
    </form>
  </div>;
}

export default ProductEditor;
