import React from 'react';
import { Check, CircleAlert, X } from 'lucide-react';

export function Notice({
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
