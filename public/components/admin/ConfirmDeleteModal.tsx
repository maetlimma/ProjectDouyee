import React, { useEffect } from 'react';
import { LoaderCircle, Trash2, X } from 'lucide-react';
import { Notice } from './Notice';

export function ConfirmDeleteModal({
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
