import React from 'react';
import { CatalogSector, badgeImage, initials } from './catalog';

// Round series emblem: artwork for known series, yellow initials otherwise
const SeriesBadge: React.FC<{ sector?: CatalogSector; label?: string; large?: boolean }> = ({ sector, label, large }) => {
  const img = sector ? badgeImage(sector) : null;
  const cls = `site-badge${large ? ' lg' : ''}${img ? ' has-img' : ''}`;
  if (img) {
    return (
      <span className={cls}>
        <img src={img} alt="" />
      </span>
    );
  }
  return <span className={cls}>{label ?? (sector ? initials(sector.name.en) : '')}</span>;
};

export default SeriesBadge;
