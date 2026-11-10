import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { CatalogProduct, useCatalog } from '../catalog';
import { useProductLink } from '../ProductSheet';

// Product ids chosen on the admin Home Slider page, in order; empty means automatic
function useHomeSlideIds() {
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/home-slides')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((list: string[]) => alive && setIds(list));
    return () => {
      alive = false;
    };
  }, []);
  return ids;
}

const INDUSTRIES = [
  { en: 'Logistic', th: 'โลจิสติกส์' },
  { en: 'Heavy Industry', th: 'อุตสาหกรรมหนัก' },
  { en: 'Automotive', th: 'ยานยนต์' },
  { en: 'Aviation', th: 'การบิน' }
];

interface Slide {
  key: string;
  image: string;
  caption?: string;
  to?: { pathname: string; search: string };
}

const HomeView: React.FC = () => {
  const { lang } = useI18n();
  const { products } = useCatalog();
  const slideIds = useHomeSlideIds();
  const productLink = useProductLink();
  const [active, setActive] = useState(0);

  const withImage = (p: CatalogProduct | undefined): p is CatalogProduct => Boolean(p && p.imagePaths && p.imagePaths.length > 0);
  const chosen = (slideIds ?? []).map((id) => products.find((p) => p.id === id)).filter(withImage);
  const showcase = chosen.length > 0 ? chosen : products.filter(withImage).slice(0, 5);

  // Brand shoe slide first, then the chosen products (or the first 5 with a photo); each opens the popup
  const slides: Slide[] = [
    { key: 'brand', image: '/assets/hero-shoe.jpg' },
    ...(slideIds === null ? [] : showcase).map((p) => ({ key: p.id, image: p.imagePaths[0], caption: p.sku, to: productLink(p.id) }))
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
