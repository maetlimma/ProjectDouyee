import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Award, ArrowLeft, ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpDown, Box, Check, CheckSquare, ChevronDown, ChevronRight, CircleAlert,
  Copy, ExternalLink, Eye, FileText, Filter, Image as ImageIcon, Layers3, LayoutGrid, List, LoaderCircle,
  PackagePlus, Pencil, Plus, RefreshCw, Search, ShieldCheck, Square, Trash2, UploadCloud, X
} from 'lucide-react';

type Product = {
  product_id: string; sku: string; product_name: string; series: string; brand: string | null;
  title: string | null; main_image: string[] | string | null; other_image: string[];
  specification: Record<string, unknown>; specification_en: Record<string, unknown>; size_weights: Record<string, unknown>;
  datasheet_pdf: string | null; certificate_pdf: string | null; other: Record<string, unknown>;
  certificate_codes: string[]; create_ts: string; update_ts: string; create_by: string; update_by: string;
};
type Series = { series_code: string; series_name: string; create_ts: string; update_ts: string; create_by: string; update_by: string };
type Certificate = { certificate_code: string; image: string | null; create_ts: string; update_ts: string; create_by: string; update_by: string };
type Catalogue = { catalogue_id: string; catalogue_name: string; catalogue_pdf: string | null; createTs: string; updateTs: string; createBy: string; updateBy: string };
type Group = { series: string; products: Product[] };

const specificationRows = [
  { key_th: 'ส่วนบน', key_en: 'Upper', label: 'Upper / ส่วนบน', placeholder_th: 'กรอกเป็นภาษาไทย', placeholder_en: 'Enter in English', shared: false },
  { key_th: 'หัวรองเท้า', key_en: 'Toe cap', label: 'Toe cap / หัวรองเท้า', placeholder_th: 'กรอกเป็นภาษาไทย', placeholder_en: 'Enter in English', shared: false },
  { key_th: 'แผ่นกันทะลุ', key_en: 'Midplate', label: 'Midplate / แผ่นกันทะลุ', placeholder_th: 'กรอกเป็นภาษาไทย', placeholder_en: 'Enter in English', shared: false },
  { key_th: 'ความต้านทานไฟฟ้าสถิต', key_en: 'Footwear only Resistance', label: 'Footwear only Resistance / ความต้านทานไฟฟ้าสถิต', placeholder: 'เช่น <10×10³ โอห์ม / e.g. <10×10³ Ω', shared: true },
  { key_th: 'สี', key_en: 'Color', label: 'Color / สี', placeholder_th: 'กรอกเป็นภาษาไทย', placeholder_en: 'Enter in English', shared: false },
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

function Notice({
  error,
  success,
  inline = false,
  onDismiss
}: {
  error?: string;
  success?: string;
  inline?: boolean;
  onDismiss?: () => void;
}) {
  if (!error && !success) return null;
  const isErr = Boolean(error);
  const text = error || success;

  if (inline) {
    return (
      <div className={`ac-notice ${isErr ? 'is-error' : 'is-success'}`} role="status">
        {isErr ? <CircleAlert size={16} /> : <Check size={16} />}
        <span>{text}</span>
      </div>
    );
  }

  return (
    <div className={`ac-toast-popup ${isErr ? 'is-error' : 'is-success'}`} role="status" aria-live="polite">
      <div className="ac-toast-icon">
        {isErr ? <CircleAlert size={16} /> : <Check size={16} />}
      </div>
      <div className="ac-toast-body">
        <span className="ac-toast-title">{isErr ? 'Notice' : 'Success'}</span>
        <span className="ac-toast-msg">{text}</span>
      </div>
      {onDismiss && (
        <button type="button" className="ac-toast-close" onClick={onDismiss} aria-label="Dismiss">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return <div className={`ac-field ${className}`}><span className="ac-field-label">{label}</span>{children}{hint && <small>{hint}</small>}</div>;
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

function ConfirmDeleteModal({
  open,
  title = 'Confirm deletion',
  itemName,
  description,
  warningNote,
  confirmLabel = 'Delete',
  loading = false,
  error = '',
  onConfirm,
  onClose
}: {
  open: boolean;
  title?: string;
  itemName?: string;
  description?: string;
  warningNote?: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;
  return (
    <div className="ac-confirm-delete-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="ac-confirm-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title" onClick={(e) => e.stopPropagation()}>
        <div className="ac-confirm-delete-header">
          <div className="ac-confirm-delete-title">
            <span className="ac-card-icon" style={{ background: '#fdf2f1', color: '#c84439', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
              <Trash2 size={15} />
            </span>
            <h3 id="confirm-delete-title">{title}</h3>
          </div>
          <button
            type="button"
            className="ac-confirm-delete-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        <div className="ac-confirm-delete-body">
          {error && <Notice error={error} inline />}
          <p className="ac-confirm-delete-text">
            Are you sure you want to delete {itemName ? <strong>“{itemName}”</strong> : 'this item'}?
          </p>
          {description && <p className="ac-confirm-delete-desc">{description}</p>}
          {warningNote && <p className="ac-confirm-delete-desc" style={{ color: '#c84439' }}>{warningNote}</p>}
        </div>
        <div className="ac-confirm-delete-actions">
          <button
            type="button"
            className="ac-button ac-button-quiet"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ac-button ac-button-danger"
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? <LoaderCircle className="ac-spin" size={15} /> : <Trash2 size={15} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DocPreviewModal({
  modal,
  onClose
}: {
  modal: { url: string; title: string; downloadName: string } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal, onClose]);

  if (!modal) return null;
  return (
    <div className="ac-doc-preview-modal-backdrop" onClick={onClose}>
      <div className="ac-doc-preview-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ac-doc-preview-modal-header">
          <div className="ac-doc-preview-modal-title">
            <FileText size={17} />
            <span>{modal.title}</span>
          </div>
          <div className="ac-doc-preview-modal-actions">
            <button
              type="button"
              className="ac-button ac-button-quiet"
              onClick={() => window.open(modal.url, '_blank')}
              title="Open PDF in new tab"
            >
              <ExternalLink size={14} />
              <span>Open in new tab</span>
            </button>
            <a
              className="ac-button ac-button-quiet"
              href={modal.url}
              download={modal.downloadName}
              title="Download PDF"
            >
              <ArrowDownToLine size={14} />
              <span>Download</span>
            </a>
            <button
              type="button"
              className="ac-image-preview-modal-close"
              onClick={onClose}
              title="Close preview (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="ac-doc-preview-modal-body">
          <iframe
            src={modal.url}
            className="ac-doc-iframe"
            title={modal.title}
          />
        </div>
      </div>
    </div>
  );
}

function ProductList() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [query, setQuery] = useState('');
  const [series, setSeries] = useState('all');
  const [filterQuick, setFilterQuick] = useState<'all' | 'no-cert' | 'has-datasheet'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-series column sorting state
  const [seriesSorts, setSeriesSorts] = useState<Record<string, { key: 'sku' | 'name' | 'updated'; dir: 'asc' | 'desc' }>>({});

  const handleSortSeries = (seriesName: string, key: 'sku' | 'name' | 'updated') => {
    setSeriesSorts((prev) => {
      const current = prev[seriesName];
      if (current && current.key === key) {
        const nextDir: 'asc' | 'desc' = current.dir === 'asc' ? 'desc' : 'asc';
        return { ...prev, [seriesName]: { key, dir: nextDir } };
      }
      const initialDir: 'asc' | 'desc' = key === 'updated' ? 'desc' : 'asc';
      return { ...prev, [seriesName]: { key, dir: initialDir } };
    });
  };

  // Single inspect & delete
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; right: number; maxHeight: number } | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [success, setSuccess] = useState((location.state as { notice?: string } | null)?.notice ?? '');

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
        window.history.replaceState({}, document.title);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);
  const [docModal, setDocModal] = useState<{ url: string; title: string; downloadName: string } | null>(null);

  // Batch Selection (Style 3 Command Cockpit)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);
  const [batchDeleteError, setBatchDeleteError] = useState('');

  const closeDocModal = useCallback(() => {
    if (docModal?.url) {
      URL.revokeObjectURL(docModal.url);
    }
    setDocModal(null);
  }, [docModal]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request<Group[]>('/api/v1/product');
      setGroups(data);
      if (selectedProduct) {
        const found = data.flatMap((g) => g.products).find((p) => p.product_id === selectedProduct.product_id);
        setSelectedProduct(found ?? null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedProduct]);

  useEffect(() => {
    void load();
  }, []);

  const allProducts = useMemo(() => groups.flatMap((group) => group.products), [groups]);
  const productCount = allProducts.length;
  const seriesOptions = useMemo(() => groups.map((group) => group.series), [groups]);
  const totalCerts = useMemo(() => allProducts.reduce((sum, p) => sum + p.certificate_codes.length, 0), [allProducts]);
  const uncertifiedCount = useMemo(() => allProducts.filter((p) => p.certificate_codes.length === 0).length, [allProducts]);
  const hasDatasheetCount = useMemo(() => allProducts.filter((p) => Boolean(p.datasheet_pdf)).length, [allProducts]);

  const filtered = useMemo(() => groups
    .filter((group) => series === 'all' || group.series === series)
    .map((group) => ({
      ...group,
      products: group.products.filter((product) => {
        const q = query.trim().toLowerCase();
        const matchesQuery = !q || [product.product_name, product.sku, product.brand ?? '', product.title ?? ''].some((v) => v.toLowerCase().includes(q));
        if (!matchesQuery) return false;
        if (filterQuick === 'no-cert') return product.certificate_codes.length === 0;
        if (filterQuick === 'has-datasheet') return Boolean(product.datasheet_pdf);
        return true;
      })
    }))
    .filter((group) => group.products.length > 0), [groups, query, series, filterQuick]);

  const sortedGroups = useMemo(() => {
    return filtered.map((group) => {
      const sort = seriesSorts[group.series];
      if (!sort) {
        return group;
      }
      const products = [...group.products].sort((a, b) => {
        let cmp = 0;
        switch (sort.key) {
          case 'sku':
            cmp = a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' });
            break;
          case 'name':
            cmp = a.product_name.localeCompare(b.product_name, undefined, { numeric: true, sensitivity: 'base' });
            break;
          case 'updated': {
            const timeA = new Date(a.update_ts || 0).getTime();
            const timeB = new Date(b.update_ts || 0).getTime();
            cmp = timeA - timeB;
            break;
          }
        }
        return sort.dir === 'asc' ? cmp : -cmp;
      });
      return { ...group, products };
    });
  }, [filtered, seriesSorts]);

  function toggleSelectGroup(groupProducts: Product[]) {
    const ids = groupProducts.map((p) => p.product_id);
    const allSelectedInGroup = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedInGroup) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleSelectProduct(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleOpenInspector = useCallback((product: Product, e?: React.MouseEvent) => {
    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const winHeight = window.innerHeight;
      const winWidth = window.innerWidth;
      const targetHeight = 560;
      const minTop = 76;
      const bottomMargin = 20;

      // Position anchored around clicked button
      let top = Math.round(rect.top + (rect.height / 2) - 160);

      // Clamp so inspector never overflows viewport bounds
      if (top + targetHeight > winHeight - bottomMargin) {
        top = Math.max(minTop, winHeight - targetHeight - bottomMargin);
      }
      if (top < minTop) {
        top = minTop;
      }

      const maxHeight = Math.max(340, winHeight - top - bottomMargin);

      // Default right margin: 28px, or align close to right edge
      let right = 28;
      if (winWidth > 1300 && rect.right < winWidth - 460) {
        right = Math.max(28, winWidth - rect.right - 20);
      }

      setPopupPos({ top, right, maxHeight });
    } else {
      const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      setPopupPos({ top: 84, right: 28, maxHeight: winHeight - 104 });
    }
    setSelectedProduct(product);
  }, []);

  async function handleViewProductPdf(product: Product, kind: 'datasheet' | 'certificate', e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      setError('');
      const response = await fetch(`/api/v1/product/${product.product_id}/${kind}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!response.ok) throw new Error(`Could not open ${kind} PDF.`);
      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      setDocModal({
        url,
        title: `${product.sku} · ${kind === 'datasheet' ? 'Technical Datasheet' : 'Certificate PDF'}`,
        downloadName: `${product.sku}-${kind}.pdf`
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedIds.size > 0 && !batchDeleting) {
          setSelectedIds(new Set());
          return;
        }
        if (selectedProduct && !deletingProduct && !docModal) {
          setSelectedProduct(null);
          setPopupPos(null);
          return;
        }
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, batchDeleting, selectedProduct, deletingProduct, docModal]);

  async function handleConfirmDeleteProduct() {
    if (!deletingProduct) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await request('/api/v1/product', { method: 'DELETE', body: JSON.stringify({ product_id: deletingProduct.product_id }) });
      if (selectedProduct?.product_id === deletingProduct.product_id) {
        setSelectedProduct(null);
        setPopupPos(null);
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingProduct.product_id);
        return next;
      });
      setDeletingProduct(null);
      await load();
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    setBatchDeleteLoading(true);
    setBatchDeleteError('');
    try {
      const idsToDelete = Array.from(selectedIds);
      for (const productId of idsToDelete) {
        await request('/api/v1/product', {
          method: 'DELETE',
          body: JSON.stringify({ product_id: productId })
        });
      }
      setSelectedIds(new Set());
      setBatchDeleting(false);
      if (selectedProduct && selectedIds.has(selectedProduct.product_id)) {
        setSelectedProduct(null);
        setPopupPos(null);
      }
      await load();
    } catch (err) {
      setBatchDeleteError((err as Error).message);
    } finally {
      setBatchDeleteLoading(false);
    }
  }

  return (
    <div className="ac-page ac-cockpit-page">
      <div className="ac-cockpit-header">
        <div className="ac-cockpit-heading-left">
          <div className="ac-cockpit-eyebrow">CATALOG MANAGEMENT</div>
          <h1>Products</h1>
          <p>Maintain product records, series assignment, specifications and documents.</p>
        </div>

        <div className="ac-cockpit-top-actions">
          {/* View mode toggle (Table vs Matrix Grid) */}
          <div className="ac-view-mode-toggle" role="radiogroup" aria-label="View layout">
            <button
              type="button"
              className={`ac-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Compact Table View"
            >
              <List size={14} />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`ac-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Modular Matrix View"
            >
              <LayoutGrid size={14} />
              <span>Matrix</span>
            </button>
          </div>

          <button
            type="button"
            className="ac-button ac-button-primary"
            onClick={() => navigate('/products/new')}
          >
            <Plus size={15} />
            <span>New Product</span>
          </button>
        </div>
      </div>

      <Notice success={success} onDismiss={() => setSuccess('')} />
      <Notice error={error} onDismiss={() => setError('')} />

      {/* Cockpit Metric Matrix Strip */}
      <div className="ac-cockpit-metrics" role="region" aria-label="Product Stats">
        <div className="ac-cockpit-stat-cell">
          <span className="ac-cockpit-stat-label">TOTAL SKUs</span>
          <div className="ac-cockpit-stat-val">
            <strong>{productCount}</strong>
            <small>Active units</small>
          </div>
        </div>
        <div className="ac-cockpit-stat-cell">
          <span className="ac-cockpit-stat-label">SERIES CLUSTERS</span>
          <div className="ac-cockpit-stat-val">
            <strong>{groups.length}</strong>
            <small>Categories</small>
          </div>
        </div>
        <div className="ac-cockpit-stat-cell">
          <span className="ac-cockpit-stat-label">COMPLIANCE CERTS</span>
          <div className="ac-cockpit-stat-val">
            <strong>{totalCerts}</strong>
            <small>Verified standards</small>
          </div>
        </div>
        <div className={`ac-cockpit-stat-cell ${uncertifiedCount > 0 ? 'is-warning' : ''}`}>
          <span className="ac-cockpit-stat-label">UNCERTIFIED ITEMS</span>
          <div className="ac-cockpit-stat-val">
            <strong>{uncertifiedCount}</strong>
            <small>{uncertifiedCount === 0 ? 'Audit clear' : 'Attention needed'}</small>
          </div>
        </div>
      </div>

      {/* Global Command & Action Toolbar */}
      <div className="ac-cockpit-toolbar">
        <div className="ac-search ac-cockpit-search">
          <Search size={15} />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKU, name, or spec..."
          />
          {query && (
            <button type="button" className="ac-search-clear" onClick={() => setQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="ac-filter-chips">
          <button
            type="button"
            className={`ac-filter-chip ${filterQuick === 'all' ? 'active' : ''}`}
            onClick={() => setFilterQuick('all')}
          >
            All ({productCount})
          </button>
          <button
            type="button"
            className={`ac-filter-chip ${filterQuick === 'no-cert' ? 'active' : ''}`}
            onClick={() => setFilterQuick('no-cert')}
          >
            Uncertified ({uncertifiedCount})
          </button>
          <button
            type="button"
            className={`ac-filter-chip ${filterQuick === 'has-datasheet' ? 'active' : ''}`}
            onClick={() => setFilterQuick('has-datasheet')}
          >
            Has Datasheet ({hasDatasheetCount})
          </button>
        </div>

        <label className="ac-select-wrap ac-cockpit-select">
          <span>Series:</span>
          <select value={series} onChange={(e) => setSeries(e.target.value)}>
            <option value="all">All Series ({groups.length})</option>
            {seriesOptions.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      </div>

      {/* Modular Workbench Layout */}
      <div className="ac-ledger-workbench">
        <div className="ac-ledger-main-pane">
          {loading ? (
            <div className="ac-loading">
              <LoaderCircle className="ac-spin" size={20} />
              <span>Querying operator database…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ac-empty">
              <Box size={24} />
              <strong>{query || filterQuick !== 'all' || series !== 'all' ? 'No matching products' : 'No products found'}</strong>
              <span>
                {query || filterQuick !== 'all' || series !== 'all'
                  ? 'Try adjusting your search query or reset the filter chips.'
                  : 'Start by creating your first product record.'}
              </span>
              {query || filterQuick !== 'all' || series !== 'all' ? (
                <button
                  type="button"
                  className="ac-button ac-button-quiet"
                  onClick={() => { setQuery(''); setFilterQuick('all'); setSeries('all'); }}
                >
                  Reset all filters
                </button>
              ) : (
                <button className="ac-button ac-button-primary" onClick={() => navigate('/products/new')}>
                  <Plus size={15} />
                  Add first product
                </button>
              )}
            </div>
          ) : (
            sortedGroups.map((group) => {
              const groupProductIds = group.products.map((p) => p.product_id);
              const isGroupAllSelected = groupProductIds.length > 0 && groupProductIds.every((id) => selectedIds.has(id));
              const isGroupPartiallySelected = !isGroupAllSelected && groupProductIds.some((id) => selectedIds.has(id));
              const sort = seriesSorts[group.series];
              const sortKey = sort?.key;
              const sortDir = sort?.dir;

              return (
                <section className="ac-series-group" key={group.series}>
                  <div className="ac-series-heading">
                    <div className="ac-series-symbol">{initials(group.series)}</div>
                    <div>
                      <h2>{group.series}</h2>
                      <span>{group.products.length} {group.products.length === 1 ? 'record' : 'records'}</span>
                    </div>
                    {viewMode === 'grid' && (
                      <button
                        type="button"
                        className="ac-button ac-button-quiet"
                        style={{ marginLeft: 'auto', height: 26, fontSize: 11, padding: '0 8px' }}
                        onClick={() => toggleSelectGroup(group.products)}
                      >
                        {isGroupAllSelected ? 'Deselect series' : 'Select series'}
                      </button>
                    )}
                  </div>

                  {viewMode === 'table' ? (
                    <div className="ac-table-card">
                      <div className="ac-table-scroll">
                        <table className="ac-table ac-cockpit-table">
                          <thead>
                            <tr>
                              <th style={{ width: 38, textAlign: 'center' }}>
                                <label
                                  className="ac-checkbox-wrap"
                                  onClick={(e) => e.stopPropagation()}
                                  title={isGroupAllSelected ? `Deselect all in ${group.series}` : `Select all in ${group.series}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isGroupAllSelected}
                                    ref={(el) => { if (el) el.indeterminate = isGroupPartiallySelected; }}
                                    onChange={() => toggleSelectGroup(group.products)}
                                  />
                                  <span className="ac-checkbox-custom" />
                                </label>
                              </th>
                              <th style={{ width: 140 }}>
                                <button
                                  type="button"
                                  className={`ac-th-sort ${sortKey === 'sku' ? 'active' : ''}`}
                                  onClick={() => handleSortSeries(group.series, 'sku')}
                                  title={`Sort ${group.series} by SKU (${sortKey === 'sku' && sortDir === 'asc' ? 'Descending' : 'Ascending'})`}
                                >
                                  <span>SKU / CODE</span>
                                  {sortKey === 'sku' ? (
                                    sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                  ) : (
                                    <ArrowUpDown size={12} className="ac-sort-idle" />
                                  )}
                                </button>
                              </th>
                              <th>
                                <button
                                  type="button"
                                  className={`ac-th-sort ${sortKey === 'name' ? 'active' : ''}`}
                                  onClick={() => handleSortSeries(group.series, 'name')}
                                  title={`Sort ${group.series} by Product Name (${sortKey === 'name' && sortDir === 'asc' ? 'Descending' : 'Ascending'})`}
                                >
                                  <span>PRODUCT & TITLE</span>
                                  {sortKey === 'name' ? (
                                    sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                  ) : (
                                    <ArrowUpDown size={12} className="ac-sort-idle" />
                                  )}
                                </button>
                              </th>
                              <th style={{ width: 120 }}>SERIES</th>
                              <th>COMPLIANCE / CERTS</th>
                              <th style={{ width: 160 }}>DOCUMENTS</th>
                              <th style={{ width: 140 }}>
                                <button
                                  type="button"
                                  className={`ac-th-sort ${sortKey === 'updated' ? 'active' : ''}`}
                                  onClick={() => handleSortSeries(group.series, 'updated')}
                                  title={`Sort ${group.series} by Last Updated (${sortKey === 'updated' && sortDir === 'asc' ? 'Descending' : 'Ascending'})`}
                                >
                                  <span>Last Updated</span>
                                  {sortKey === 'updated' ? (
                                    sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                  ) : (
                                    <ArrowUpDown size={12} className="ac-sort-idle" />
                                  )}
                                </button>
                              </th>
                              <th style={{ width: 100, textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                          </thead>
                        <tbody>
                          {group.products.map((product) => {
                            const isChecked = selectedIds.has(product.product_id);
                            const isInspected = selectedProduct?.product_id === product.product_id;
                            return (
                              <tr
                                key={product.product_id}
                                className={`ac-table-row ${isChecked ? 'is-checked' : ''} ${isInspected ? 'is-selected' : ''}`}
                              >
                                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                  <label className="ac-checkbox-wrap">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleSelectProduct(product.product_id)}
                                    />
                                    <span className="ac-checkbox-custom" />
                                  </label>
                                </td>
                                <td>
                                  <code className="ac-sku-code">{product.sku}</code>
                                </td>
                                <td>
                                  <div className="ac-product-cell">
                                    <AuthImage
                                      path={Array.isArray(product.main_image) ? product.main_image[0] : product.main_image}
                                      alt=""
                                      className="ac-product-thumb"
                                    />
                                    <span>
                                      <strong>{product.product_name}</strong>
                                      {product.title && product.title !== product.series ? (
                                        <small>{product.title}</small>
                                      ) : null}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <span className="ac-series-tag">{product.series}</span>
                                </td>
                                <td>
                                  {product.certificate_codes.length > 0 ? (
                                    <div className="ac-pills">
                                      {product.certificate_codes.map((code) => (
                                        <span className="ac-pill-verified" key={code}>
                                          <ShieldCheck size={11} />
                                          {code}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="ac-pill-unverified">
                                      <CircleAlert size={11} />
                                      No certs
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className="ac-doc-badges">
                                    {product.datasheet_pdf ? (
                                      <button
                                        type="button"
                                        className="ac-badge-pdf"
                                        onClick={(e) => void handleViewProductPdf(product, 'datasheet', e)}
                                        title="Open Datasheet PDF"
                                      >
                                        <FileText size={11} />
                                        <span>Datasheet</span>
                                      </button>
                                    ) : null}
                                    {product.certificate_pdf ? (
                                      <button
                                        type="button"
                                        className="ac-badge-pdf ac-badge-cert-pdf"
                                        onClick={(e) => void handleViewProductPdf(product, 'certificate', e)}
                                        title="Open Certificate PDF"
                                      >
                                        <Award size={11} />
                                        <span>Cert PDF</span>
                                      </button>
                                    ) : null}
                                    {!product.datasheet_pdf && !product.certificate_pdf && (
                                      <span className="ac-muted">—</span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className="ac-date">{dateLabel(product.update_ts)}</span>
                                  <small className="ac-audit">{product.update_by}</small>
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                  <div className="ac-row-actions">
                                    <button
                                      type="button"
                                      className={`ac-icon-button ${isInspected ? 'active' : ''}`}
                                      title="Inspect specifications"
                                      onClick={(e) => {
                                        if (isInspected) {
                                          setSelectedProduct(null);
                                          setPopupPos(null);
                                        } else {
                                          handleOpenInspector(product, e);
                                        }
                                      }}
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="ac-icon-button"
                                      title="Edit product"
                                      onClick={() => navigate(`/products/${product.product_id}/edit`)}
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="ac-icon-button danger"
                                      title="Delete product"
                                      onClick={() => { setDeletingProduct(product); setDeleteError(''); }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Modular Matrix View (Grid of Operator Cards) */
                  <div className="ac-cockpit-grid">
                    {group.products.map((product) => {
                      const isChecked = selectedIds.has(product.product_id);
                      const isInspected = selectedProduct?.product_id === product.product_id;
                      return (
                        <div
                          key={product.product_id}
                          className={`ac-cockpit-card ${isChecked ? 'is-checked' : ''} ${isInspected ? 'is-inspected' : ''}`}
                        >
                          <div className="ac-card-cockpit-top" onClick={(e) => e.stopPropagation()}>
                            <label className="ac-checkbox-wrap">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectProduct(product.product_id)}
                              />
                              <span className="ac-checkbox-custom" />
                            </label>
                            <code className="ac-sku-code" title={product.sku}>{product.sku}</code>
                            <span className="ac-series-tag" title={product.series} style={{ marginLeft: 'auto' }}>{product.series}</span>
                          </div>

                          <div className="ac-card-cockpit-media">
                            <AuthImage
                              path={Array.isArray(product.main_image) ? product.main_image[0] : product.main_image}
                              alt=""
                              className="ac-cockpit-card-thumb"
                            />
                            <div className="ac-card-cockpit-info">
                              <strong title={product.product_name}>{product.product_name}</strong>
                              {product.title && product.title !== product.series ? (
                                <small title={product.title}>{product.title}</small>
                              ) : null}
                            </div>
                          </div>

                          <div className="ac-card-cockpit-compliance">
                            {product.certificate_codes.length > 0 ? (
                              <div className="ac-pills">
                                {product.certificate_codes.map((code) => (
                                  <span className="ac-pill-verified" key={code}>
                                    <ShieldCheck size={10} />
                                    {code}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="ac-pill-unverified">
                                <CircleAlert size={10} />
                                No certs
                              </span>
                            )}
                          </div>

                          <div className="ac-card-cockpit-footer" onClick={(e) => e.stopPropagation()}>
                            <div className="ac-doc-badges">
                              {product.datasheet_pdf ? (
                                <button
                                  type="button"
                                  className="ac-badge-pdf"
                                  onClick={(e) => void handleViewProductPdf(product, 'datasheet', e)}
                                  title="Open Datasheet PDF"
                                >
                                  <FileText size={11} />
                                  <span>Datasheet</span>
                                </button>
                              ) : null}
                              {product.certificate_pdf ? (
                                <button
                                  type="button"
                                  className="ac-badge-pdf ac-badge-cert-pdf"
                                  onClick={(e) => void handleViewProductPdf(product, 'certificate', e)}
                                  title="Open Certificate PDF"
                                >
                                  <Award size={11} />
                                  <span>Cert</span>
                                </button>
                              ) : null}
                              {!product.datasheet_pdf && !product.certificate_pdf && (
                                <span className="ac-muted" style={{ fontSize: 11 }}>No PDF</span>
                              )}
                            </div>

                            <div className="ac-row-actions" style={{ marginLeft: 'auto' }}>
                              <button
                                type="button"
                                className={`ac-icon-button ${isInspected ? 'active' : ''}`}
                                title="Inspect specifications"
                                onClick={(e) => {
                                  if (isInspected) {
                                    setSelectedProduct(null);
                                    setPopupPos(null);
                                  } else {
                                    handleOpenInspector(product, e);
                                  }
                                }}
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                type="button"
                                className="ac-icon-button"
                                title="Edit product"
                                onClick={() => navigate(`/products/${product.product_id}/edit`)}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                className="ac-icon-button danger"
                                title="Delete product"
                                onClick={() => { setDeletingProduct(product); setDeleteError(''); }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
          )}
        </div>

        {/* Master-Detail Inspector Panel (Floating Pop-up anchored near clicked row) */}
        {selectedProduct && (
          <>
            <div
              className="ac-inspector-backdrop"
              onClick={() => { setSelectedProduct(null); setPopupPos(null); }}
              aria-hidden="true"
            />
            <aside
              className="ac-inspector-pane ac-inspector-floating-popup"
              style={popupPos ? { top: popupPos.top, right: popupPos.right, maxHeight: popupPos.maxHeight } : undefined}
              aria-label="Product Specification Inspector"
            >
              <div className="ac-inspector-header">
                <div className="ac-inspector-title">
                  <span className="ac-inspector-tag">SPECIFICATION INSPECTOR</span>
                  <h3>{selectedProduct.product_name}</h3>
                </div>
                <button
                  type="button"
                  className="ac-inspector-close"
                  onClick={() => { setSelectedProduct(null); setPopupPos(null); }}
                  title="Close inspector (Esc)"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="ac-inspector-body">
                <div className="ac-inspector-media">
                  <AuthImage
                    path={Array.isArray(selectedProduct.main_image) ? selectedProduct.main_image[0] : selectedProduct.main_image}
                    alt={selectedProduct.product_name}
                    className="ac-inspector-thumb"
                  />
                  <div className="ac-inspector-meta">
                    <div className="ac-inspector-sku-box">
                      <span className="ac-sku-label">SKU</span>
                      <code className="ac-sku-code">{selectedProduct.sku}</code>
                    </div>
                    <div className="ac-inspector-series-badge">
                      <Layers3 size={13} />
                      <span>{selectedProduct.series}</span>
                    </div>
                    {selectedProduct.title && (
                      <div className="ac-inspector-subtitle">{selectedProduct.title}</div>
                    )}
                  </div>
                </div>

                {/* Technical Specifications */}
                <div className="ac-inspector-section">
                  <div className="ac-inspector-section-title">
                    <span>TECHNICAL SPECIFICATIONS</span>
                  </div>
                  <div className="ac-spec-table">
                    {specificationRows.map((row) => {
                      const valTh = selectedProduct.specification?.[row.key_th];
                      const valEn = selectedProduct.specification_en?.[row.key_en];
                      return (
                        <div className="ac-spec-row" key={row.key_th}>
                          <span className="ac-spec-key">{row.key_en} / {row.key_th}</span>
                          {row.shared ? (
                            <span className="ac-spec-val">{valEn || valTh ? String(valEn || valTh) : <em className="ac-muted">—</em>}</span>
                          ) : (
                            <div className="ac-spec-val-group">
                              <div className="ac-spec-lang-line">
                                <span className="ac-spec-lang-tag">EN</span>
                                <span className="ac-spec-val">{valEn ? String(valEn) : <em className="ac-muted">—</em>}</span>
                              </div>
                              <div className="ac-spec-lang-line">
                                <span className="ac-spec-lang-tag">TH</span>
                                <span className="ac-spec-val">{valTh ? String(valTh) : <em className="ac-muted">—</em>}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Compliance & Standards */}
                <div className="ac-inspector-section">
                  <div className="ac-inspector-section-title">
                    <span>COMPLIANCE & STANDARDS ({selectedProduct.certificate_codes.length})</span>
                  </div>
                  {selectedProduct.certificate_codes.length > 0 ? (
                    <div className="ac-inspector-certs">
                      {selectedProduct.certificate_codes.map((code) => (
                        <span className="ac-pill-verified" key={code}>
                          <ShieldCheck size={12} />
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="ac-pill-unverified">
                      <CircleAlert size={12} />
                      No compliance certificates linked
                    </div>
                  )}
                </div>

                {/* Documents (Datasheet & Certificate PDF) */}
                <div className="ac-inspector-section">
                  <div className="ac-inspector-section-title">
                    <span>TECHNICAL DOCUMENTS</span>
                  </div>
                  <div className="ac-inspector-docs-list">
                    {selectedProduct.datasheet_pdf ? (
                      <button
                        type="button"
                        className="ac-doc-action-btn"
                        onClick={(e) => void handleViewProductPdf(selectedProduct, 'datasheet', e)}
                      >
                        <FileText size={15} />
                        <span>View Datasheet PDF</span>
                        <ExternalLink size={13} style={{ marginLeft: 'auto' }} />
                      </button>
                    ) : (
                      <div className="ac-inspector-empty-doc">No datasheet PDF uploaded</div>
                    )}

                    {selectedProduct.certificate_pdf ? (
                      <button
                        type="button"
                        className="ac-doc-action-btn ac-doc-action-cert"
                        onClick={(e) => void handleViewProductPdf(selectedProduct, 'certificate', e)}
                      >
                        <Award size={15} />
                        <span>View Certificate PDF</span>
                        <ExternalLink size={13} style={{ marginLeft: 'auto' }} />
                      </button>
                    ) : (
                      <div className="ac-inspector-empty-doc">No certificate PDF uploaded</div>
                    )}
                  </div>
                </div>

                {/* Audit trail */}
                <div className="ac-inspector-audit">
                  <div><span>Created:</span> {dateLabel(selectedProduct.create_ts)} by {selectedProduct.create_by}</div>
                  <div><span>Last Updated:</span> {dateLabel(selectedProduct.update_ts)} · {selectedProduct.update_by}</div>
                </div>
              </div>

              <div className="ac-inspector-footer">
                <button
                  type="button"
                  className="ac-button ac-button-quiet"
                  onClick={() => { setDeletingProduct(selectedProduct); setDeleteError(''); }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <button
                  type="button"
                  className="ac-button ac-button-primary"
                  onClick={() => navigate(`/products/${selectedProduct.product_id}/edit`)}
                >
                  <Pencil size={14} />
                  Edit Full Details
                </button>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* Floating Bottom Batch Action Dock (Linear Style) */}
      {selectedIds.size > 0 && (
        <div className="ac-floating-dock" role="toolbar" aria-label="Batch operations">
          <div className="ac-dock-badge">
            <CheckSquare size={15} />
            <span>{selectedIds.size} {selectedIds.size === 1 ? 'product' : 'products'} selected</span>
          </div>
          <div className="ac-dock-actions">
            <button
              type="button"
              className="ac-dock-btn ac-dock-btn-danger"
              onClick={() => { setBatchDeleting(true); setBatchDeleteError(''); }}
              title="Delete all selected products"
            >
              <Trash2 size={13} />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              className="ac-dock-btn"
              onClick={() => setSelectedIds(new Set())}
              title="Clear selection (Esc)"
            >
              <X size={13} />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation */}
      <ConfirmDeleteModal
        open={Boolean(deletingProduct)}
        title="Delete product"
        itemName={deletingProduct ? `${deletingProduct.product_name} (${deletingProduct.sku})` : ''}
        description="This product will be permanently removed from the catalog. This action cannot be undone."
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmDeleteProduct}
        onClose={() => { if (!deleteLoading) setDeletingProduct(null); }}
      />

      {/* Batch Delete Confirmation */}
      <ConfirmDeleteModal
        open={batchDeleting}
        title="Delete multiple products"
        itemName={`${selectedIds.size} selected products`}
        description="All selected products will be permanently removed from the catalog. This action cannot be undone."
        warningNote="Bulk deletion is irreversible."
        confirmLabel={`Delete ${selectedIds.size} products`}
        loading={batchDeleteLoading}
        error={batchDeleteError}
        onConfirm={handleBatchDelete}
        onClose={() => { if (!batchDeleteLoading) setBatchDeleting(false); }}
      />

      <DocPreviewModal modal={docModal} onClose={closeDocModal} />
    </div>
  );
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
  const [mainImagePaths, setMainImagePaths] = useState<string[]>([]);
  const [mainImages, setMainImages] = useState<File[]>([]);
  const [otherImagePaths, setOtherImagePaths] = useState<string[]>([]);
  const [otherImages, setOtherImages] = useState<File[]>([]);
  const [datasheet, setDatasheet] = useState<File | null>(null);
  const [certificatePdf, setCertificatePdf] = useState<File | null>(null);
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

  useEffect(() => {
    let active = true;
    Promise.all([request<Series[]>('/api/v1/series'), request<Certificate[]>('/api/v1/certificate'), id ? request<Product>(`/api/v1/product/${id}`) : Promise.resolve(null)])
      .then(([seriesData, certificateData, current]) => {
        if (!active) return;
        setSeriesList(seriesData); setCertificates(certificateData); setProduct(current);
        if (current) {
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
            certificate_codes: current.certificate_codes ?? []
          });
          const mImages = Array.isArray(current.main_image)
            ? current.main_image
            : (current.main_image ? [current.main_image] : []);
          setMainImagePaths(mImages);
          setOtherImagePaths(current.other_image ?? []);
        } else if (seriesData.length) {
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
    event.preventDefault(); setSaving(true); setError('');
    try {
      const body = new FormData();
      body.append('sku', form.sku.trim()); body.append('product_name', form.product_name.trim()); body.append('series', form.series);
      body.append('brand', form.brand.trim()); body.append('title', form.title.trim());
      body.append('specification', JSON.stringify(Object.fromEntries(specificationRows.map(({ key_th }) => [key_th, form.specification[key_th] ?? ''])))); body.append('specification_en', JSON.stringify(Object.fromEntries(specificationRows.map(({ key_en }) => [key_en, form.specification_en[key_en] ?? ''])))); body.append('size_weights', JSON.stringify(Object.fromEntries(productSizes.map((size) => [size, form.size_weights[size] ?? ''])))); body.append('other', JSON.stringify(product?.other ?? {}));
      body.append('certificate_codes', JSON.stringify(form.certificate_codes));
      body.append('main_image', JSON.stringify(mainImagePaths));
      body.append('other_image', JSON.stringify(otherImagePaths));
      if (product?.datasheet_pdf) body.append('datasheet_pdf', product.datasheet_pdf);
      if (product?.certificate_pdf) body.append('certificate_pdf', product.certificate_pdf);
      for (const file of mainImages) body.append('main_image_files', file);
      for (const file of otherImages) body.append('other_image_files', file);
      if (datasheet) body.append('datasheet_pdf_file', datasheet);
      if (certificatePdf) body.append('certificate_pdf_file', certificatePdf);
      if (id) body.append('product_id', id);
      const saved = await request<Product>('/api/v1/product', { method: id ? 'PUT' : 'POST', body });
      navigate('/dashboard', { replace: true, state: { notice: `${saved.product_name} saved successfully.` } });
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
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
    <form onSubmit={submit} className="ac-editor-layout">
      <div className="ac-editor-main">
        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon"><Box size={17} /></div><div><h2>Product details</h2><p>Core identity and series assignment</p></div></div>
          <div className="ac-form-grid"><Field label="Product name *"><input className="ac-input" required value={form.product_name} onChange={(e) => update('product_name', e.target.value)} placeholder="Product name" /></Field>
            <Field label="SKU *"><input className="ac-input" required value={form.sku} onChange={(e) => update('sku', e.target.value)} placeholder="SKU" /></Field>
            <Field label="Series *"><select className="ac-input" required value={form.series} onChange={(e) => update('series', e.target.value)}><option value="" disabled>Select a series</option>{seriesList.map((entry) => <option key={entry.series_code} value={entry.series_code}>{entry.series_name} · {entry.series_code}</option>)}</select></Field>
            <Field label="Brand"><input className="ac-input" value={form.brand} onChange={(e) => update('brand', e.target.value)} placeholder="Brand name" /></Field>
            <Field label="Title" className="ac-field-span"><input className="ac-input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Optional display title" /></Field>
          </div>
        </section>

        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon purple"><FileText size={17} /></div><div><h2>Product Specifications / รายละเอียดสินค้า</h2><p>กรอกข้อมูลทั้งภาษาไทย (TH) และภาษาอังกฤษ (EN)</p></div></div>
          <div className="ac-spec-table">
            {specificationRows.map(({ key_th, key_en, label, placeholder_th, placeholder_en, placeholder, shared }) => {
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
                        placeholder={placeholder}
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
                              {digit}
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
                        placeholder={placeholder_th}
                      />
                    </label>
                    <label className="ac-spec-language">
                      <span>EN</span>
                      <input
                        className="ac-input"
                        value={form.specification_en[key_en] ?? ''}
                        onChange={(e) => update('specification_en', { ...form.specification_en, [key_en]: e.target.value })}
                        placeholder={placeholder_en}
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
            <span><strong>{certificate.certificate_code}</strong><small>Certificate type</small></span>
          </label>)}</div> : <div className="ac-inline-empty">No certificate types yet. <Link to="/certificates">Add a certificate type</Link></div>}
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
                  {mainImages.map((file, idx) => {
                    const objectUrl = URL.createObjectURL(file);
                    return (
                      <div className="ac-existing-image" key={`${file.name}-${idx}`}>
                        <button
                          type="button"
                          className="ac-existing-image-thumb"
                          onClick={() => setPreviewModal({ file, title: file.name })}
                          title="Click to preview new image"
                        >
                          <img src={objectUrl} alt={file.name} />
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
                    );
                  })}
                </div>
              </div>
            )}
            <label className="ac-upload-drop"><UploadCloud size={17} /><span>{mainImages.length ? `${mainImages.length} new main image(s) selected` : 'Upload main image'}</span><input hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setMainImages(Array.from(e.target.files ?? []))} /></label>
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
                  {otherImages.map((file, idx) => {
                    const objectUrl = URL.createObjectURL(file);
                    return (
                      <div className="ac-existing-image" key={`${file.name}-${idx}`}>
                        <button
                          type="button"
                          className="ac-existing-image-thumb"
                          onClick={() => setPreviewModal({ file, title: file.name })}
                          title="Click to preview new image"
                        >
                          <img src={objectUrl} alt={file.name} />
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
                    );
                  })}
                </div>
              </div>
            )}
            <label className="ac-upload-drop"><UploadCloud size={17} /><span>{otherImages.length ? `${otherImages.length} new file(s) selected` : 'Upload image'}</span><input hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setOtherImages(Array.from(e.target.files ?? []))} /></label>
          </Field>
        </section>
        <section className="ac-form-card"><div className="ac-card-heading"><div className="ac-card-icon red"><FileText size={17} /></div><div><h2>Documents</h2><p>PDF files · max 30 MiB</p></div></div>
          <FileField
            label="Datasheet PDF"
            current={product?.datasheet_pdf}
            file={datasheet}
            accept="application/pdf"
            onChange={setDatasheet}
            onView={() => {
              if (datasheet) viewLocalFile(datasheet, 'Datasheet PDF');
              else if (product?.datasheet_pdf) void viewDocument('datasheet');
            }}
            onClearFile={() => setDatasheet(null)}
          />
          <FileField
            label="Certificate PDF"
            current={product?.certificate_pdf}
            file={certificatePdf}
            accept="application/pdf"
            onChange={setCertificatePdf}
            onView={() => {
              if (certificatePdf) viewLocalFile(certificatePdf, 'Certificate PDF');
              else if (product?.certificate_pdf) void viewDocument('certificate');
            }}
            onClearFile={() => setCertificatePdf(null)}
          />
        </section>
        {product && <section className="ac-audit-card"><div><ShieldCheck size={15} />LAST UPDATED</div><p>Created <strong>{dateLabel(product.create_ts)}</strong></p><small>by {product.create_by}</small><p>Last updated <strong>{dateLabel(product.update_ts)}</strong></p><small>by {product.update_by}</small></section>}
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
              {previewModal.file ? (
                <img
                  src={URL.createObjectURL(previewModal.file)}
                  alt={previewModal.title}
                  className="ac-image-preview-modal-img"
                />
              ) : (
                <AuthImage
                  path={previewModal.path}
                  alt={previewModal.title}
                  className="ac-image-preview-modal-img"
                />
              )}
            </div>
          </div>
        </div>
      )}
      {docModal && (
        <div className="ac-doc-preview-modal-backdrop" onClick={closeDocModal}>
          <div className="ac-doc-preview-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ac-doc-preview-modal-header">
              <div className="ac-doc-preview-modal-title">
                <FileText size={17} />
                <span>{docModal.title}</span>
              </div>
              <div className="ac-doc-preview-modal-actions">
                <button
                  type="button"
                  className="ac-button ac-button-quiet"
                  onClick={() => window.open(docModal.url, '_blank')}
                  title="Open PDF in new tab"
                >
                  <ExternalLink size={14} />
                  <span>Open in new tab</span>
                </button>
                <a
                  className="ac-button ac-button-quiet"
                  href={docModal.url}
                  download={docModal.downloadName}
                  title="Download PDF"
                >
                  <ArrowDownToLine size={14} />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  className="ac-image-preview-modal-close"
                  onClick={closeDocModal}
                  title="Close preview (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="ac-doc-preview-modal-body">
              <iframe
                src={docModal.url}
                className="ac-doc-iframe"
                title={docModal.title}
              />
            </div>
          </div>
        </div>
      )}
    </form>
  </div>;
}

function FileField({
  label,
  current,
  file,
  accept,
  onChange,
  onView,
  onClearFile
}: {
  label: string;
  current?: string | null;
  file: File | null;
  accept: string;
  onChange: (file: File | null) => void;
  onView?: () => void;
  onClearFile?: () => void;
}) {
  return (
    <Field label={label} hint={file?.name ? `New file selected: ${file.name}` : (current ? 'Existing PDF stored on server' : 'No file linked')}>
      <div className="ac-document-actions">
        {onView && (current || file) && (
          <button type="button" className="ac-view-button" onClick={onView} title="View PDF document">
            <Eye size={15} />
            <span>View</span>
          </button>
        )}
        <label className="ac-file-pick">
          <FileText size={15} />
          <span>{file?.name || (current ? 'Replace PDF' : 'Upload PDF')}</span>
          <input hidden type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        </label>
        {file && onClearFile && (
          <button type="button" className="ac-icon-button danger" onClick={onClearFile} title="Cancel new file selection">
            <X size={14} />
          </button>
        )}
      </div>
    </Field>
  );
}

function SeriesManager() {
  const [items, setItems] = useState<Series[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [editName, setEditName] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [deletingSeries, setDeletingSeries] = useState<Series | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await request<Series[]>('/api/v1/series'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const closeEditModal = useCallback(() => {
    if (modalSaving) return;
    setEditingSeries(null);
    setEditName('');
    setModalError('');
  }, [modalSaving]);

  useEffect(() => {
    if (!editingSeries) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEditModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingSeries, closeEditModal]);

  function startEdit(item: Series) {
    setEditingSeries(item);
    setEditName(item.series_name);
    setModalError('');
    setError('');
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await request('/api/v1/series', {
        method: 'POST',
        body: JSON.stringify({ series_code: code.trim(), series_name: name.trim() })
      });
      setSuccess('Series created.');
      setCode('');
      setName('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingSeries) return;
    setModalSaving(true);
    setModalError('');
    try {
      await request('/api/v1/series', {
        method: 'PUT',
        body: JSON.stringify({ series_code: editingSeries.series_code, series_name: editName.trim() })
      });
      setSuccess(`Series “${editingSeries.series_code}” updated.`);
      closeEditModal();
      await load();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setModalSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingSeries) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await request('/api/v1/series', {
        method: 'DELETE',
        body: JSON.stringify({ series_code: deletingSeries.series_code })
      });
      setSuccess('Series deleted.');
      setDeletingSeries(null);
      await load();
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="ac-page">
      <div className="ac-page-heading">
        <div>
          <div className="ac-eyebrow">REFERENCE DATA</div>
          <h1>Series</h1>
          <p>Manage SeriesType records used to group and classify products.</p>
        </div>
        <div className="ac-heading-count">
          <Layers3 size={16} />{items.length} series
        </div>
      </div>
      <Notice error={error} success={success} onDismiss={() => { setError(''); setSuccess(''); }} />
      <div className="ac-resource-layout">
        <form className="ac-form-card ac-resource-form" onSubmit={submitCreate}>
          <div className="ac-card-heading">
            <div className="ac-card-icon green"><Layers3 size={17} /></div>
            <div>
              <h2>Add a series</h2>
              <p>Series code is the product foreign key.</p>
            </div>
          </div>
          <Field label="Series code *" hint="Use the API code, for example “ESD Series”.">
            <input className="ac-input" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ESD Series" />
          </Field>
          <Field label="Series name *">
            <input className="ac-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
          </Field>
          <div className="ac-resource-actions">
            <button className="ac-button ac-button-primary" disabled={saving}>
              {saving ? <LoaderCircle className="ac-spin" size={15} /> : <Plus size={15} />}Create series
            </button>
          </div>
        </form>
        <section className="ac-table-card ac-resource-table">
          <div className="ac-table-title">
            <div>
              <h2>All series</h2>
              <p>Products reference the series code shown here.</p>
            </div>
            <button className="ac-button ac-button-quiet" onClick={() => void load()}>
              <RefreshCw size={15} />
            </button>
          </div>
          {loading ? (
            <div className="ac-loading"><LoaderCircle className="ac-spin" size={20} />Loading series…</div>
          ) : items.length ? (
            <div className="ac-table-scroll">
              <table className="ac-table">
                <thead><tr><th>Series</th><th>Code</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.series_code}>
                      <td>
                        <div className="ac-product-cell">
                          <span className="ac-series-symbol">{initials(item.series_name)}</span>
                          <span><strong>{item.series_name}</strong><small>Product grouping</small></span>
                        </div>
                      </td>
                      <td><code>{item.series_code}</code></td>
                      <td><span className="ac-date">{dateLabel(item.update_ts)}</span><small className="ac-audit">{item.update_by}</small></td>
                      <td>
                        <div className="ac-row-actions">
                          <button className="ac-icon-button" title="Edit series" onClick={() => startEdit(item)}><Pencil size={15} /></button>
                          <button className="ac-icon-button danger" title="Delete series" onClick={() => { setDeletingSeries(item); setDeleteError(''); }}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ac-empty compact">
              <Layers3 size={23} />
              <strong>No series available</strong>
              <span>Add a series before creating products.</span>
            </div>
          )}
        </section>
      </div>

      {editingSeries && (
        <div className="ac-edit-modal-backdrop" onClick={closeEditModal}>
          <div className="ac-edit-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ac-edit-modal-header">
              <div className="ac-edit-modal-title">
                <div className="ac-card-icon green" style={{ width: 28, height: 28 }}>
                  <Layers3 size={15} />
                </div>
                <h3>Edit series</h3>
              </div>
              <button type="button" className="ac-edit-modal-close" onClick={closeEditModal} title="Close (Esc)">
                <X size={15} />
              </button>
            </div>
            <form className="ac-edit-modal-form" onSubmit={submitEdit}>
              <div className="ac-edit-modal-body">
                <Notice error={modalError} inline />
                <Field label="Series code" hint="Series code is the primary key and cannot be changed.">
                  <input className="ac-input" disabled value={editingSeries.series_code} />
                </Field>
                <Field label="Series name *">
                  <input className="ac-input" required value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                </Field>
              </div>
              <div className="ac-edit-modal-actions">
                <button type="button" className="ac-button ac-button-quiet" onClick={closeEditModal} disabled={modalSaving}>
                  Cancel
                </button>
                <button type="submit" className="ac-button ac-button-primary" disabled={modalSaving}>
                  {modalSaving ? <LoaderCircle className="ac-spin" size={15} /> : <Check size={15} />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deletingSeries)}
        title="Delete series"
        itemName={deletingSeries ? `${deletingSeries.series_name} (${deletingSeries.series_code})` : ''}
        description="Are you sure you want to delete this series? Series used by products cannot be deleted."
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => { if (!deleteLoading) setDeletingSeries(null); }}
      />
    </div>
  );
}

function CertificatesManager() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [code, setCode] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [deletingCert, setDeletingCert] = useState<Certificate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [previewModal, setPreviewModal] = useState<{ path?: string; file?: File; title: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await request<Certificate[]>('/api/v1/certificate'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const closeEditModal = useCallback(() => {
    if (modalSaving) return;
    setEditingCert(null);
    setEditImage(null);
    setModalError('');
  }, [modalSaving]);

  useEffect(() => {
    if (!previewModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewModal(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewModal]);

  useEffect(() => {
    if (!editingCert) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (previewModal) return;
      if (e.key === 'Escape') closeEditModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingCert, closeEditModal, previewModal]);

  function startEdit(item: Certificate) {
    setEditingCert(item);
    setEditImage(null);
    setModalError('');
    setError('');
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body = new FormData();
      body.append('certificate_code', code.trim());
      if (image) body.append('image_file', image);
      await request('/api/v1/certificate', { method: 'POST', body });
      setSuccess('Certificate type created.');
      setCode('');
      setImage(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingCert) return;
    setModalSaving(true);
    setModalError('');
    try {
      const body = new FormData();
      body.append('certificate_code', editingCert.certificate_code);
      if (editImage) body.append('image_file', editImage);
      await request('/api/v1/certificate', { method: 'PUT', body });
      setSuccess(`Certificate “${editingCert.certificate_code}” updated.`);
      closeEditModal();
      await load();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setModalSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingCert) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await request('/api/v1/certificate', {
        method: 'DELETE',
        body: JSON.stringify({ certificate_code: deletingCert.certificate_code })
      });
      setSuccess('Certificate type deleted.');
      setDeletingCert(null);
      await load();
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="ac-page">
      <div className="ac-page-heading">
        <div>
          <div className="ac-eyebrow">REFERENCE DATA</div>
          <h1>Certificates</h1>
          <p>Manage CertificateType records and link them to products.</p>
        </div>
        <div className="ac-heading-count">
          <Award size={16} />{items.length} types
        </div>
      </div>
      <Notice error={error} success={success} onDismiss={() => { setError(''); setSuccess(''); }} />
      <div className="ac-resource-layout">
        <form className="ac-form-card ac-resource-form" onSubmit={submitCreate}>
          <div className="ac-card-heading">
            <div className="ac-card-icon amber"><Award size={17} /></div>
            <div>
              <h2>Add a certificate type</h2>
              <p>Certificate code is used in product links.</p>
            </div>
          </div>
          <Field label="Certificate code *" hint="For example CE or MS.">
            <input className="ac-input" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CE" />
          </Field>
          <Field label="Certificate image" hint={image?.name || 'PNG, JPG, WebP or AVIF · max 12 MiB'}>
            <label className="ac-upload-drop">
              <UploadCloud size={17} />
              <span>{image?.name || 'Upload image'}</span>
              <input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            </label>
            {image && (
              <button type="button" className="ac-button ac-button-quiet" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setImage(null)}>
                <X size={13} /> Cancel selected image
              </button>
            )}
          </Field>
          <div className="ac-resource-actions">
            <button className="ac-button ac-button-primary" disabled={saving}>
              {saving ? <LoaderCircle className="ac-spin" size={15} /> : <Plus size={15} />}Create certificate
            </button>
          </div>
        </form>
        <section className="ac-certificate-grid-wrap">
          <div className="ac-table-title">
            <div>
              <h2>Certificate types</h2>
              <p>Linked to products through CertificateProduct.</p>
            </div>
            <button className="ac-button ac-button-quiet" onClick={() => void load()}>
              <RefreshCw size={15} />
            </button>
          </div>
          {loading ? (
            <div className="ac-loading"><LoaderCircle className="ac-spin" size={20} />Loading certificates…</div>
          ) : items.length ? (
            <div className="ac-certificate-grid">
              {items.map((item) => (
                <article className="ac-certificate-card" key={item.certificate_code}>
                  <div className="ac-certificate-image">
                    <AuthImage path={item.image} alt={`${item.certificate_code} certificate`} />
                  </div>
                  <div className="ac-certificate-info">
                    <span className="ac-eyebrow">CERTIFICATE CODE</span>
                    <h3>{item.certificate_code}</h3>
                    <small>Updated {dateLabel(item.update_ts)} · {item.update_by}</small>
                    <div className="ac-row-actions">
                      <button className="ac-icon-button" title="Edit certificate" onClick={() => startEdit(item)}><Pencil size={15} /></button>
                      <button className="ac-icon-button danger" title="Delete certificate" onClick={() => { setDeletingCert(item); setDeleteError(''); }}><Trash2 size={15} /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="ac-empty compact">
              <Award size={23} />
              <strong>No certificate types</strong>
              <span>Add a certificate type for product records.</span>
            </div>
          )}
        </section>
      </div>

      {editingCert && (
        <div className="ac-edit-modal-backdrop" onClick={closeEditModal}>
          <div className="ac-edit-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ac-edit-modal-header">
              <div className="ac-edit-modal-title">
                <div className="ac-card-icon amber" style={{ width: 28, height: 28 }}>
                  <Award size={15} />
                </div>
                <h3>Edit certificate type</h3>
              </div>
              <button type="button" className="ac-edit-modal-close" onClick={closeEditModal} title="Close (Esc)">
                <X size={15} />
              </button>
            </div>
            <form className="ac-edit-modal-form" onSubmit={submitEdit}>
              <div className="ac-edit-modal-body">
                <Notice error={modalError} inline />
                <Field label="Certificate code" hint="The certificate code cannot be changed.">
                  <input className="ac-input" disabled value={editingCert.certificate_code} />
                </Field>
                <Field label="Certificate image" hint={editImage?.name || (editingCert.image ? 'Leave blank to keep current image · max 12 MiB' : 'PNG, JPG, WebP or AVIF · max 12 MiB')}>
                  {editingCert.image && !editImage && (
                    <div className="ac-edit-modal-cert-current">
                      <button
                        type="button"
                        className="ac-edit-modal-cert-thumb"
                        onClick={() => setPreviewModal({ path: editingCert.image!, title: `${editingCert.certificate_code} Certificate` })}
                        title="Click to preview image"
                      >
                        <AuthImage path={editingCert.image} alt={editingCert.certificate_code} />
                        <span className="ac-thumb-zoom-icon"><Eye size={13} /></span>
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#2e4337' }}>Current certificate image</div>
                        <div style={{ fontSize: '10px', color: '#68786f', wordBreak: 'break-all' }}>{editingCert.image.split('/').pop()}</div>
                      </div>
                      <button
                        type="button"
                        className="ac-view-button"
                        onClick={() => setPreviewModal({ path: editingCert.image!, title: `${editingCert.certificate_code} Certificate` })}
                        title="View image"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                    </div>
                  )}
                  {editImage && (
                    <div className="ac-edit-modal-cert-current">
                      <button
                        type="button"
                        className="ac-edit-modal-cert-thumb"
                        onClick={() => setPreviewModal({ file: editImage, title: editImage.name })}
                        title="Click to preview new image"
                      >
                        <img src={URL.createObjectURL(editImage)} alt={editImage.name} />
                        <span className="ac-thumb-zoom-icon"><Eye size={13} /></span>
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#2e4337' }}>New image selected</div>
                        <div style={{ fontSize: '10px', color: '#68786f', wordBreak: 'break-all' }}>{editImage.name}</div>
                      </div>
                      <button
                        type="button"
                        className="ac-view-button"
                        onClick={() => setPreviewModal({ file: editImage, title: editImage.name })}
                        title="View new image"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="ac-icon-button danger"
                        onClick={() => setEditImage(null)}
                        title="Cancel new image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <label className="ac-upload-drop">
                    <UploadCloud size={17} />
                    <span>{editImage?.name || (editingCert.image ? 'Replace image' : 'Upload image')}</span>
                    <input hidden type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setEditImage(e.target.files?.[0] ?? null)} />
                  </label>
                </Field>
              </div>
              <div className="ac-edit-modal-actions">
                <button type="button" className="ac-button ac-button-quiet" onClick={closeEditModal} disabled={modalSaving}>
                  Cancel
                </button>
                <button type="submit" className="ac-button ac-button-primary" disabled={modalSaving}>
                  {modalSaving ? <LoaderCircle className="ac-spin" size={15} /> : <Check size={15} />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              {previewModal.file ? (
                <img
                  src={URL.createObjectURL(previewModal.file)}
                  alt={previewModal.title}
                  className="ac-image-preview-modal-img"
                />
              ) : (
                <AuthImage
                  path={previewModal.path}
                  alt={previewModal.title}
                  className="ac-image-preview-modal-img"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deletingCert)}
        title="Delete certificate type"
        itemName={deletingCert?.certificate_code || ''}
        description="Are you sure you want to delete this certificate type? Linked products must be unassigned first."
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => { if (!deleteLoading) setDeletingCert(null); }}
      />
    </div>
  );
}

function CataloguesManager() {
  const [items, setItems] = useState<Catalogue[]>([]);
  const [name, setName] = useState('');
  const [pdf, setPdf] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sort, setSort] = useState('catalogue_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const [editingCatalogue, setEditingCatalogue] = useState<Catalogue | null>(null);
  const [editName, setEditName] = useState('');
  const [editPdf, setEditPdf] = useState<File | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const [deletingCatalogue, setDeletingCatalogue] = useState<Catalogue | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
        order,
        ...(search.trim() ? { search: search.trim() } : {})
      });
      const result = await request<{ data: Catalogue[]; total: number; totalPages: number }>(`/api/v1/catalogue?${params}`);
      setItems(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sort, order, search]);

  useEffect(() => { void load(); }, [load]);

  const closeEditModal = useCallback(() => {
    if (modalSaving) return;
    setEditingCatalogue(null);
    setEditName('');
    setEditPdf(null);
    setModalError('');
  }, [modalSaving]);

  useEffect(() => {
    if (!editingCatalogue) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEditModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingCatalogue, closeEditModal]);

  function startEdit(item: Catalogue) {
    setEditingCatalogue(item);
    setEditName(item.catalogue_name);
    setEditPdf(null);
    setModalError('');
    setError('');
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body = new FormData();
      body.append('catalogue_name', name.trim());
      if (pdf) body.append('catalogue_pdf_file', pdf);
      await request('/api/v1/catalogue', { method: 'POST', body });
      setSuccess('Catalogue created.');
      setName('');
      setPdf(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingCatalogue) return;
    setModalSaving(true);
    setModalError('');
    try {
      const body = new FormData();
      body.append('catalogue_id', editingCatalogue.catalogue_id);
      body.append('catalogue_name', editName.trim());
      if (editPdf) body.append('catalogue_pdf_file', editPdf);
      await request('/api/v1/catalogue', { method: 'PUT', body });
      setSuccess(`Catalogue “${editName.trim()}” updated.`);
      closeEditModal();
      await load();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setModalSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingCatalogue) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await request('/api/v1/catalogue', {
        method: 'DELETE',
        body: JSON.stringify({ catalogue_id: deletingCatalogue.catalogue_id })
      });
      setSuccess('Catalogue deleted.');
      const isLastOnPage = items.length === 1 && page > 1;
      setDeletingCatalogue(null);
      if (isLastOnPage) setPage(page - 1);
      else await load();
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function openPdf(item: Catalogue) {
    try {
      const response = await fetch(`/api/v1/catalogue/${item.catalogue_id}/pdf`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (!response.ok) throw new Error('The catalogue PDF could not be opened.');
      const url = URL.createObjectURL(await response.blob());
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="ac-page">
      <div className="ac-page-heading">
        <div>
          <div className="ac-eyebrow">CATALOG MANAGEMENT</div>
          <h1>Catalogues</h1>
          <p>Upload and manage catalogue PDF files.</p>
        </div>
        <div className="ac-heading-count">
          <FileText size={16} />{total} catalogues
        </div>
      </div>
      <Notice error={error} success={success} onDismiss={() => { setError(''); setSuccess(''); }} />
      <div className="ac-resource-layout">
        <form className="ac-form-card ac-resource-form" onSubmit={submitCreate}>
          <div className="ac-card-heading">
            <div className="ac-card-icon red"><FileText size={17} /></div>
            <div>
              <h2>Add a catalogue</h2>
              <p>Add a catalogue and its PDF document.</p>
            </div>
          </div>
          <Field label="Catalogue name *">
            <input className="ac-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Safety Footwear Catalogue" />
          </Field>
          <Field label="Catalogue PDF" hint={pdf?.name || 'PDF · max 30 MiB'}>
            <label className="ac-upload-drop">
              <UploadCloud size={17} />
              <span>{pdf?.name || 'Upload PDF'}</span>
              <input hidden type="file" accept="application/pdf,.pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
            </label>
            {pdf && (
              <button type="button" className="ac-button ac-button-quiet" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setPdf(null)}>
                <X size={13} /> Cancel selected PDF
              </button>
            )}
          </Field>
          <div className="ac-resource-actions">
            <button className="ac-button ac-button-primary" disabled={saving}>
              {saving ? <LoaderCircle className="ac-spin" size={15} /> : <Plus size={15} />}Create catalogue
            </button>
          </div>
        </form>
        <section className="ac-table-card ac-resource-table">
          <div className="ac-table-title">
            <div>
              <h2>All catalogues</h2>
              <p>Sorted and paginated catalogue records.</p>
            </div>
            <button className="ac-button ac-button-quiet" onClick={() => void load()} title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="ac-catalogue-toolbar">
            <div className="ac-search">
              <Search size={16} />
              <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search catalogue name" />
            </div>
            <label className="ac-catalogue-sort">
              <span>Sort</span>
              <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
                <option value="catalogue_name">Name</option>
                <option value="createTs">Created</option>
                <option value="updateTs">Updated</option>
                <option value="catalogue_id">ID</option>
              </select>
            </label>
            <button className="ac-button ac-button-quiet" onClick={() => setOrder((value) => value === 'asc' ? 'desc' : 'asc')}>
              {order === 'asc' ? 'A–Z ↑' : 'Z–A ↓'}
            </button>
          </div>
          {loading ? (
            <div className="ac-loading"><LoaderCircle className="ac-spin" size={20} />Loading catalogues…</div>
          ) : items.length ? (
            <>
              <div className="ac-table-scroll">
                <table className="ac-table">
                  <thead><tr><th>Catalogue</th><th>PDF</th><th>Updated</th><th>Created by</th><th /></tr></thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.catalogue_id}>
                        <td>
                          <div className="ac-product-cell">
                            <span className="ac-series-symbol"><FileText size={16} /></span>
                            <span><strong>{item.catalogue_name}</strong><small><code>{item.catalogue_id}</code></small></span>
                          </div>
                        </td>
                        <td>
                          {item.catalogue_pdf ? (
                            <button className="ac-download-button" onClick={() => void openPdf(item)}>
                              <ArrowDownToLine size={14} />View PDF
                            </button>
                          ) : (
                            <span className="ac-muted">No PDF</span>
                          )}
                        </td>
                        <td><span className="ac-date">{dateLabel(item.updateTs)}</span><small className="ac-audit">{item.updateBy}</small></td>
                        <td>{item.createBy}</td>
                        <td>
                          <div className="ac-row-actions">
                            <button className="ac-icon-button" title="Edit catalogue" onClick={() => startEdit(item)}><Pencil size={15} /></button>
                            <button className="ac-icon-button danger" title="Delete catalogue" onClick={() => { setDeletingCatalogue(item); setDeleteError(''); }}><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ac-pagination">
                <span>Showing {total ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total}</span>
                <div>
                  <button className="ac-button ac-button-quiet" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span>Page {page} of {Math.max(1, totalPages)}</span>
                  <button className="ac-button ac-button-quiet" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            </>
          ) : (
            <div className="ac-empty compact">
              <FileText size={23} />
              <strong>{search ? 'No matching catalogues' : 'No catalogues yet'}</strong>
              <span>{search ? 'Try another search.' : 'Add a catalogue and upload its PDF.'}</span>
            </div>
          )}
        </section>
      </div>

      {editingCatalogue && (
        <div className="ac-edit-modal-backdrop" onClick={closeEditModal}>
          <div className="ac-edit-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ac-edit-modal-header">
              <div className="ac-edit-modal-title">
                <div className="ac-card-icon red" style={{ width: 28, height: 28 }}>
                  <FileText size={15} />
                </div>
                <h3>Edit catalogue</h3>
              </div>
              <button type="button" className="ac-edit-modal-close" onClick={closeEditModal} title="Close (Esc)">
                <X size={15} />
              </button>
            </div>
            <form className="ac-edit-modal-form" onSubmit={submitEdit}>
              <div className="ac-edit-modal-body">
                <Notice error={modalError} inline />
                <Field label="Catalogue name *">
                  <input className="ac-input" required value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Safety Footwear Catalogue" autoFocus />
                </Field>
                <Field label="Catalogue PDF" hint={editPdf?.name || (editingCatalogue.catalogue_pdf ? 'Leave blank to keep the current PDF · max 30 MiB' : 'PDF · max 30 MiB')}>
                  {editingCatalogue.catalogue_pdf && (
                    <div className="ac-edit-modal-cert-current">
                      <div className="ac-edit-modal-cert-thumb" style={{ color: '#236149' }}>
                        <FileText size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#2e4337' }}>Current PDF linked</div>
                        <div style={{ fontSize: '10px', color: '#68786f', wordBreak: 'break-all' }}>{editingCatalogue.catalogue_pdf.split('/').pop()}</div>
                      </div>
                    </div>
                  )}
                  <label className="ac-upload-drop">
                    <UploadCloud size={17} />
                    <span>{editPdf?.name || (editingCatalogue.catalogue_pdf ? 'Replace PDF' : 'Upload PDF')}</span>
                    <input hidden type="file" accept="application/pdf,.pdf" onChange={(e) => setEditPdf(e.target.files?.[0] ?? null)} />
                  </label>
                  {editPdf && (
                    <button type="button" className="ac-button ac-button-quiet" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setEditPdf(null)}>
                      <X size={13} /> Cancel new PDF
                    </button>
                  )}
                </Field>
              </div>
              <div className="ac-edit-modal-actions">
                <button type="button" className="ac-button ac-button-quiet" onClick={closeEditModal} disabled={modalSaving}>
                  Cancel
                </button>
                <button type="submit" className="ac-button ac-button-primary" disabled={modalSaving}>
                  {modalSaving ? <LoaderCircle className="ac-spin" size={15} /> : <Check size={15} />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deletingCatalogue)}
        title="Delete catalogue"
        itemName={deletingCatalogue?.catalogue_name || ''}
        description="Are you sure you want to delete this catalogue? This action cannot be undone."
        loading={deleteLoading}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => { if (!deleteLoading) setDeletingCatalogue(null); }}
      />
    </div>
  );
}

export { ProductList, ProductEditor, SeriesManager, CertificatesManager, CataloguesManager };
