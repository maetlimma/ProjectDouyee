import React from 'react';
import { Eye, FileText, Trash2, X } from 'lucide-react';
import { Field } from './Field';

export function FileField({
  label,
  current,
  file,
  accept,
  onChange,
  onView,
  onClearFile,
  onRemove
}: {
  label: string;
  current?: string | null;
  file: File | null;
  accept: string;
  onChange: (file: File | null) => void;
  onView?: () => void;
  onClearFile?: () => void;
  onRemove?: () => void;
}) {
  const currentFileName = current ? current.split('/').pop() : '';

  return (
    <Field
      label={label}
      hint={
        file?.name
          ? `New file selected: ${file.name}`
          : current
          ? `Existing PDF stored on server: ${currentFileName}`
          : 'No file linked'
      }
    >
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
          <input
            hidden
            type="file"
            accept={accept}
            onChange={(e) => {
              onChange(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
        </label>
        {file && (
          <button
            type="button"
            className="ac-remove-button"
            onClick={onClearFile ? onClearFile : () => onChange(null)}
            title="Cancel new file selection"
          >
            <X size={14} />
            <span>Cancel</span>
          </button>
        )}
        {!file && current && onRemove && (
          <button
            type="button"
            className="ac-remove-button"
            onClick={onRemove}
            title="Remove existing PDF file"
          >
            <Trash2 size={14} />
            <span>Remove</span>
          </button>
        )}
      </div>
    </Field>
  );
}
