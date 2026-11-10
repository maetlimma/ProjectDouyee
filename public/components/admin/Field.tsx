import React from 'react';

function renderLabelWithRedAsterisk(label: React.ReactNode): React.ReactNode {
  if (typeof label !== 'string') return label;
  if (!label.includes('*')) return label;

  const parts = label.split('*');
  const result: React.ReactNode[] = [];
  parts.forEach((part, index) => {
    if (index > 0) {
      result.push(
        <span
          key={`asterisk-${index}`}
          className="ac-required-asterisk"
          style={{ color: '#dc2626', fontWeight: 700, margin: '0 2px' }}
        >
          *
        </span>
      );
    }
    if (part) {
      result.push(part);
    }
  });
  return result;
}

export function Field({
  label,
  hint,
  children,
  className = ''
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`ac-field ${className}`}>
      <span className="ac-field-label">{renderLabelWithRedAsterisk(label)}</span>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}
