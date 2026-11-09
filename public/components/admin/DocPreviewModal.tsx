import React, { useEffect } from 'react';
import { ArrowDownToLine, ExternalLink, FileText, X } from 'lucide-react';

export function DocPreviewModal({
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
