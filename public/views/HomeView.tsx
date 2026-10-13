import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useCatalog } from '../catalog';

const INDUSTRIES = [
  { en: 'Logistic', th: 'โลจิสติกส์', zh: '物流' },
  { en: 'Heavy Industry', th: 'อุตสาหกรรมหนัก', zh: '重工业' },
  { en: 'Automotive', th: 'ยานยนต์', zh: '汽车' },
  { en: 'Aviation', th: 'การบิน', zh: '航空' }
];

interface Slide {
  key: string;
  image: string;
  caption?: string;
  to?: string;
}

const HomeView: React.FC = () => {
  const { lang } = useI18n();
  const { products } = useCatalog();
  const [active, setActive] = useState(0);

  // Brand shoe slide first, then one slide per product that has an image
  const slides: Slide[] = [
    { key: 'brand', image: '/assets/hero-shoe.jpg' },
    ...products
      .filter((p) => p.imagePaths && p.imagePaths.length > 0)
      .slice(0, 5)
      .map((p) => ({ key: p.id, image: p.imagePaths[0], caption: p.sku, to: `/products/${p.id}` }))
  ];

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const current = active < slides.length ? active : 0;

  return (
    <div>
      <section className="site-banner">
        <img src="/assets/hero-banner.jpg" alt="Eurostat, a member of Dou Yee" />
        <div className="site-banner-industries">
          {INDUSTRIES.map((ind, i) => (
            <Link key={ind.en} to="/products" className={i === 0 ? 'first' : ''}>
              {ind[lang] || ind.en}
            </Link>
          ))}
        </div>
      </section>

      <section className="site-slider">
        {slides.map((s, i) => {
          const body = (
            <>
              <img src={s.image} alt={s.caption || 'Eurostat safety footwear'} />
              {s.caption && <span className="site-hero-caption">{s.caption}</span>}
            </>
          );
          const cls = `site-slide ${i === 0 ? 'brand' : ''} ${i === current ? 'active' : ''}`;
          return s.to ? (
            <Link key={s.key} to={s.to} className={cls}>{body}</Link>
          ) : (
            <div key={s.key} className={cls}>{body}</div>
          );
        })}
      </section>

      {slides.length > 1 && (
        <div className="site-dots">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              className={i === current ? 'active' : ''}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeView;
