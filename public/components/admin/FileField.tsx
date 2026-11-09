import React from 'react';
import { Eye, FileText, X } from 'lucide-react';
import { Field } from './Field';

export function FileField({
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
