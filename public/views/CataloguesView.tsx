import React from 'react';
import { CATALOGUE_COVERS } from '../catalog';

const CataloguesView: React.FC = () => {
  return (
    <div className="site-panel-padded">
      <div className="site-catalogues">
        {CATALOGUE_COVERS.map((c) => (
          <figure key={c.title} className="site-catalogue">
            <img src={c.cover} alt={c.title} loading="lazy" />
            <figcaption>{c.title}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
};

export default CataloguesView;
