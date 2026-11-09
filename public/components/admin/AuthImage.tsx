import React, { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { token } from '../../views/admin/api';

export function AuthImage({
  path,
  alt,
  className = ''
}: {
  path?: string | null;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let objectUrl = '';
    let active = true;
    if (!path) { setSrc(''); return; }
    if (!path.startsWith('/files/')) { setSrc(path); return; }
    fetch(path, { headers: { Authorization: `Bearer ${token()}` } })
      .then((response) => response.ok ? response.blob() : Promise.reject())
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setSrc(objectUrl);
      })
      .catch(() => {
        if (active) setSrc('');
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  return src ? (
    <img className={className} src={src} alt={alt} />
  ) : (
    <span className={`ac-image-placeholder ${className}`}>
      <ImageIcon size={18} />
    </span>
  );
}
