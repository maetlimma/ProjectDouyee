import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpDown, Award, Box, Check, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, CircleAlert,
  Copy, ExternalLink, Eye, FileText, Filter, Layers3, LayoutGrid, List, LoaderCircle,
  PackagePlus, Pencil, Plus, RefreshCw, Search, ShieldCheck, Square, Trash2, X
} from 'lucide-react';
import { Group, Product, SortKey, SortOrder } from './types';
import { dateLabel, initials, request, token } from './api';
import { specificationRows } from './constants';
import { Notice } from '../../components/admin/Notice';
import { AuthImage } from '../../components/admin/AuthImage';
import { ConfirmDeleteModal } from '../../components/admin/ConfirmDeleteModal';
import { DocPreviewModal } from '../../components/admin/DocPreviewModal';

const PAGE_SIZE = 20;

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function SeriesPagination({
  totalItems,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  className = ''
}: {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className={`ac-series-pagination ${className}`}>
      <div className="ac-series-pagination-info">
        Showing <strong>{startItem}–{endItem}</strong> of <strong>{totalItems}</strong> products
        {totalPages > 1 ? (
          <span className="ac-muted" style={{ marginLeft: 6, fontSize: 11.5 }}>
            (20 per page)
          </span>
        ) : null}
      </div>

      {totalPages > 1 && (
        <div className="ac-series-pagination-controls">
          <button
            type="button"
            className="ac-page-btn"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft size={14} />
          </button>

          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="ac-page-ellipsis">
                  …
                </span>
              );
            }
            const pageNum = p as number;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                className={`ac-page-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => onPageChange(pageNum)}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            className="ac-page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export function ProductList() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [totalSeriesCount, setTotalSeriesCount] = useState<number>(0);
  const [totalCertificatesCount, setTotalCertificatesCount] = useState<number>(0);
  const [totalCataloguesCount, setTotalCataloguesCount] = useState<number>(0);
  const [query, setQuery] = useState('');
  const [series, setSeries] = useState('all');
  const [filterQuick, setFilterQuick] = useState<'all' | 'no-cert' | 'has-datasheet'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-series column sorting state
  const [seriesSorts, setSeriesSorts] = useState<Record<string, { key: 'sku' | 'name' | 'updated'; dir: 'asc' | 'desc' }>>({});

  // Per-series pagination state: Record<seriesName, currentPage>
  const [seriesPages, setSeriesPages] = useState<Record<string, number>>({});

  // Reset pagination when search query or filter changes
  useEffect(() => {
    setSeriesPages({});
  }, [query, filterQuick, series]);

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
      const [productData, seriesData, certData, catData] = await Promise.all([
        request<Group[]>('/api/v1/product'),
        request<any[]>('/api/v1/series').catch((e) => { console.warn('series fetch:', e); return []; }),
        request<any[]>('/api/v1/certificate').catch((e) => { console.warn('cert fetch:', e); return []; }),
        request<{ total?: number; data?: any[]; items?: any[] }>('/api/v1/catalogue').catch((e) => { console.warn('cat fetch:', e); return { total: 0, data: [], items: [] }; })
      ]);
      setGroups(productData);
      setTotalSeriesCount(Array.isArray(seriesData) && seriesData.length > 0 ? seriesData.length : productData.length);
      setTotalCertificatesCount(Array.isArray(certData) ? certData.length : 0);
      setTotalCataloguesCount(
        typeof catData?.total === 'number'
          ? catData.total
          : (Array.isArray(catData?.data) ? catData.data.length : (Array.isArray(catData?.items) ? catData.items.length : 0))
      );

      if (selectedProduct) {
        const found = productData.flatMap((g) => g.products).find((p) => p.product_id === selectedProduct.product_id);
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
          <span className="ac-cockpit-stat-label">Series</span>
          <div className="ac-cockpit-stat-val">
            <strong>{totalSeriesCount || groups.length}</strong>
            <small>Categories</small>
          </div>
        </div>
        <div className="ac-cockpit-stat-cell">
          <span className="ac-cockpit-stat-label">Certificates</span>
          <div className="ac-cockpit-stat-val">
            <strong>{totalCertificatesCount}</strong>
            <small>Standard types</small>
          </div>
        </div>
        <div className="ac-cockpit-stat-cell">
          <span className="ac-cockpit-stat-label">Catalogues</span>
          <div className="ac-cockpit-stat-val">
            <strong>{totalCataloguesCount}</strong>
            <small>Documents</small>
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
              const totalInGroup = group.products.length;
              const totalPages = Math.max(1, Math.ceil(totalInGroup / PAGE_SIZE));
              const currentPage = Math.min(Math.max(1, seriesPages[group.series] || 1), totalPages);
              const pagedProducts = group.products.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

              const pagedProductIds = pagedProducts.map((p) => p.product_id);
              const isPageAllSelected = pagedProductIds.length > 0 && pagedProductIds.every((id) => selectedIds.has(id));
              const isPagePartiallySelected = !isPageAllSelected && pagedProductIds.some((id) => selectedIds.has(id));
              const sort = seriesSorts[group.series];
              const sortKey = sort?.key;
              const sortDir = sort?.dir;

              return (
                <section className="ac-series-group" key={group.series}>
                  <div className="ac-series-heading">
                    <div className="ac-series-symbol">{initials(group.series)}</div>
                    <div>
                      <h2>{group.series}</h2>
                      <span>
                        {totalInGroup} {totalInGroup === 1 ? 'record' : 'records'}
                        {totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ''}
                      </span>
                    </div>
                    {viewMode === 'grid' && (
                      <button
                        type="button"
                        className="ac-button ac-button-quiet"
                        style={{ marginLeft: 'auto', height: 26, fontSize: 11, padding: '0 8px' }}
                        onClick={() => toggleSelectGroup(pagedProducts)}
                      >
                        {isPageAllSelected ? 'Deselect page' : 'Select page'}
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
                                  title={isPageAllSelected ? `Deselect all on this page` : `Select all on this page`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isPageAllSelected}
                                    ref={(el) => { if (el) el.indeterminate = isPagePartiallySelected; }}
                                    onChange={() => toggleSelectGroup(pagedProducts)}
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
                          {pagedProducts.map((product) => {
                            const isChecked = selectedIds.has(product.product_id);
                            const isInspected = selectedProduct?.product_id === product.product_id;
                            return (
                              <tr
                                key={product.product_id}
                                className={`ac-table-row ${isChecked ? 'is-checked' : ''} ${isInspected ? 'is-selected' : ''}`}
                                onDoubleClick={() => navigate(`/products/${product.product_id}/edit`)}
                                title="Double-click to edit product"
                              >
                                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
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
                                  <div className="ac-doc-badges" onDoubleClick={(e) => e.stopPropagation()}>
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
                                <td onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
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
                    <SeriesPagination
                      totalItems={totalInGroup}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageSize={PAGE_SIZE}
                      onPageChange={(page) => setSeriesPages((prev) => ({ ...prev, [group.series]: page }))}
                    />
                  </div>
                ) : (
                  /* Modular Matrix View (Grid of Operator Cards) */
                  <>
                    <div className="ac-cockpit-grid">
                      {pagedProducts.map((product) => {
                        const isChecked = selectedIds.has(product.product_id);
                      const isInspected = selectedProduct?.product_id === product.product_id;
                      return (
                        <div
                          key={product.product_id}
                          className={`ac-cockpit-card ${isChecked ? 'is-checked' : ''} ${isInspected ? 'is-inspected' : ''}`}
                          onDoubleClick={() => navigate(`/products/${product.product_id}/edit`)}
                          title="Double-click to edit product"
                        >
                          <div className="ac-card-cockpit-top" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
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

                          <div className="ac-card-cockpit-footer" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
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
                  <SeriesPagination
                    className="ac-series-pagination-grid"
                    totalItems={totalInGroup}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => setSeriesPages((prev) => ({ ...prev, [group.series]: page }))}
                  />
                </>
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

export default ProductList;
