import React from 'react';
import { useCatalogues } from '../catalog';
import { useI18n } from '../i18n';

// Catalogues uploaded in the admin portal; each card opens the PDF in a new tab
const CataloguesView: React.FC = () => {
  const { lang } = useI18n();
  const { catalogues, loading } = useCatalogues();

  if (!loading && catalogues.length === 0) {
    return (
      <div className="site-panel-padded">
        <p className="site-catalogues-empty">{lang === 'th' ? 'ยังไม่มีแคตตาล็อก' : 'No catalogues yet.'}</p>
      </div>
    );
  }

  return (
    <div className="site-panel-padded">
      <div className="site-catalogues">
        {catalogues.map((c) => (
          <a key={c.id} href={c.pdf} target="_blank" rel="noopener noreferrer" className="site-catalogue">
            <img src={c.cover} alt={c.name} loading="lazy" />
            <span className="site-catalogue-name">{c.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default CataloguesView;
