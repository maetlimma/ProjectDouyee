import React from 'react';
import { Award, CircleAlert, ExternalLink, FileText, Layers3, Pencil, ShieldCheck, Trash2, X } from 'lucide-react';
import { Product } from '../../views/admin/types';
import { dateLabel } from '../../views/admin/api';
import { specificationRows } from '../../views/admin/constants';
import { AuthImage } from './AuthImage';

export function InspectorModal({
  product,
  popupPos,
  onClose,
  onEdit,
  onDelete,
  onViewPdf
}: {
  product: Product | null;
  popupPos: { top: number; right: number; maxHeight: number } | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onViewPdf: (product: Product, kind: 'datasheet' | 'certificate', e: React.MouseEvent) => void;
}) {
  if (!product) return null;

  return (
    <>
      <div
        className="ac-inspector-backdrop"
        onClick={onClose}
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
            <h3>{product.product_name}</h3>
          </div>
          <button
            type="button"
            className="ac-inspector-close"
            onClick={onClose}
            title="Close inspector (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <div className="ac-inspector-body">
          <div className="ac-inspector-media">
            <AuthImage
              path={Array.isArray(product.main_image) ? product.main_image[0] : product.main_image}
              alt={product.product_name}
              className="ac-inspector-thumb"
            />
            <div className="ac-inspector-meta">
              <div className="ac-inspector-sku-box">
                <span className="ac-sku-label">MODEL</span>
                <code className="ac-sku-code">{product.sku}</code>
              </div>
              <div className="ac-inspector-series-badge">
                <Layers3 size={13} />
                <span>{product.series}</span>
              </div>
              {product.title && (
                <div className="ac-inspector-subtitle">{product.title}</div>
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
                const valTh = product.specification?.[row.key_th];
                const valEn = product.specification_en?.[row.key_en];
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
              <span>COMPLIANCE & STANDARDS ({product.certificate_codes.length})</span>
            </div>
            {product.certificate_codes.length > 0 ? (
              <div className="ac-inspector-certs">
                {product.certificate_codes.map((code) => (
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
              {product.datasheet_pdf ? (
                <button
                  type="button"
                  className="ac-doc-action-btn"
                  onClick={(e) => void onViewPdf(product, 'datasheet', e)}
                >
                  <FileText size={15} />
                  <span>View Datasheet PDF</span>
                  <ExternalLink size={13} style={{ marginLeft: 'auto' }} />
                </button>
              ) : (
                <div className="ac-inspector-empty-doc">No datasheet PDF uploaded</div>
              )}

              {product.certificate_pdf ? (
                <button
                  type="button"
                  className="ac-doc-action-btn ac-doc-action-cert"
                  onClick={(e) => void onViewPdf(product, 'certificate', e)}
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
            <div><span>Created:</span> {dateLabel(product.create_ts)} by {product.create_by}</div>
            <div><span>Last Updated:</span> {dateLabel(product.update_ts)} · {product.update_by}</div>
          </div>
        </div>

        <div className="ac-inspector-footer">
          <button
            type="button"
            className="ac-button ac-button-quiet"
            onClick={() => onDelete(product)}
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            type="button"
            className="ac-button ac-button-primary"
            onClick={() => onEdit(product)}
          >
            <Pencil size={14} />
            Edit Full Details
          </button>
        </div>
      </aside>
    </>
  );
}
