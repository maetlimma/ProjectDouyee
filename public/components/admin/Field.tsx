import React from 'react';

export function Field({
  label,
  hint,
  children,
  className = ''
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`ac-field ${className}`}>
      <span className="ac-field-label">{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}
