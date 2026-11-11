import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import {
  useCatalog,
  inSector,
  badgeImage,
  seriesArt,
  groupByModel,
  cardSpan,
  layoutGrid,
  splitHero,
  takeRows,
  CardGroup,
  CatalogProduct,
  CatalogSector
} from '../catalog';
import SeriesBadge from '../SeriesBadge';
import { ITEM_PARAM } from '../ProductSheet';

const SpecLines: React.FC<{ product: CatalogProduct }> = ({ product }) => {
  const { lang } = useI18n();
  const lines = product.spec && product.spec.length > 0 ? product.spec : [product.title[lang] || product.title.en];
  return (
    <p className="site-card-spec">
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </React.Fragment>
      ))}
    </p>
  );
};

const PartThumbs: React.FC<{ product: CatalogProduct }> = ({ product }) => {
  const parts = product.parts ?? product.imagePaths.slice(1);
  if (parts.length === 0) return null;
  return (
    <div className="site-card-thumbs">
      {parts.slice(0, 4).map((src) => (
        <img key={src} src={src} alt="" loading="lazy" />
      ))}
    </div>
  );
};

const ShoeImage: React.FC<{ product: CatalogProduct }> = ({ product }) => {
  const { lang } = useI18n();
  const main = product.imagePaths[0];
  return (
    <div className="site-card-img">
      {main ? (
        <img src={main} alt={product.title[lang] || product.title.en} loading="lazy" />
      ) : (
        <span className="site-card-placeholder">EUROSTAT</span>
      )}
    </div>
  );
};

// One card per model; variants (colour, height) share the card and each opens its own data sheet
const ProductCard: React.FC<{ group: CardGroup; onOpen: (p: CatalogProduct) => void }> = ({ group, onOpen }) => {
  const [first] = group.items;
  const span = cardSpan(group);

  if (group.items.length === 1) {
    return (
      <button type="button" className="site-card" onClick={() => onOpen(first)}>
        <span className="site-card-label">{group.model}</span>
        <ShoeImage product={first} />
        <SpecLines product={first} />
        <PartThumbs product={first} />
      </button>
    );
  }

  return (
    <div className={`site-card site-card-group span-${span}`}>
      <span className="site-card-label">{group.model}</span>
      <div className="site-card-variants">
        {group.items.map((item) => (
          <button key={item.id} type="button" className="site-card-variant" onClick={() => onOpen(item)}>
            <ShoeImage product={item} />
            {item.variant && <span className="site-card-variant-name">{item.variant}</span>}
          </button>
        ))}
      </div>
      <SpecLines product={first} />
      <PartThumbs product={first} />
    </div>
  );
};

const CardGrid: React.FC<{ groups: CardGroup[]; photos: string[]; onOpen: (p: CatalogProduct) => void; className?: string }> = ({
  groups,
  photos,
  onOpen,
  className = 'site-grid'
}) => (
  <div className={className}>
    {layoutGrid(groups, photos).map((cell) =>
      cell.kind === 'card' ? (
        <ProductCard key={cell.group.model} group={cell.group} onOpen={onOpen} />
      ) : (
        <div key={cell.src} className={`site-photo-tile span-${cell.span}`} style={{ backgroundImage: `url(${cell.src})` }} />
      )
    )}
  </div>
);

const SeriesSection: React.FC<{
  title: string;
  sector?: CatalogSector;
  badge?: string;
  products: CatalogProduct[];
  onOpen: (p: CatalogProduct) => void;
}> = ({ title, sector, badge, products, onOpen }) => {
  const { lang } = useI18n();
  const groups = groupByModel(products);
  const art = sector ? seriesArt(sector) : null;
  // A known series without emblem artwork (Basic) shows no badge, as in the prototype
  const showBadge = !sector || badgeImage(sector) !== null || !art;
  const { hero, rest: afterHero } = art ? splitHero(groups) : { hero: [], rest: groups };
  const sidePhotos = art?.side ?? [];
  const { side, rest } = sidePhotos.length > 0 ? takeRows(afterHero, sidePhotos.length) : { side: [], rest: afterHero };

  return (
    <section className="site-series">
      <div className={`site-series-head${showBadge ? '' : ' no-badge'}`}>
        {showBadge && <SeriesBadge sector={sector} label={badge} large />}
        <h2>{title}</h2>
        <span className="site-series-bar" />
      </div>
      {groups.length === 0 ? (
        <div className="site-empty">
          {lang === 'th' ? 'ยังไม่มีสินค้าในกลุ่มนี้' : 'No products in this series yet.'}
        </div>
      ) : (
        <>
          {hero.length > 0 && art && (
            <div className="site-series-hero" style={{ backgroundImage: `url(${art.background})` }}>
              <CardGrid groups={hero} photos={[]} onOpen={onOpen} className="site-grid site-grid-hero" />
            </div>
          )}
          {side.length > 0 && (
            <div className="site-grid site-grid-side">
              {sidePhotos.slice(0, Math.ceil(side.reduce((n, g) => n + cardSpan(g), 0) / 3)).map((src, i) => (
                <div key={src} className="site-photo-tile" style={{ backgroundImage: `url(${src})`, gridRow: i + 1 }} />
              ))}
              {side.map((group) => (
                <ProductCard key={group.model} group={group} onOpen={onOpen} />
              ))}
            </div>
          )}
          {rest.length > 0 && <CardGrid groups={rest} photos={art?.photos ?? []} onOpen={onOpen} />}
        </>
      )}
    </section>
  );
};

const ProductsView: React.FC = () => {
  const { lang } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, sectors, loading } = useCatalog();
  // The popup itself is rendered by ProductSheetHost in App.tsx
  const openProduct = (p: CatalogProduct) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(ITEM_PARAM, p.id);
      return next;
    });

  const category = searchParams.get('category');
  const search = (searchParams.get('search') || '').trim().toLowerCase();

  // There is no all-series page: /products opens one series, the shared item's series or the first one
  const itemId = searchParams.get(ITEM_PARAM);
  const itemProduct = itemId ? products.find((p) => p.id === itemId) : undefined;
  const defaultSector =
    (itemProduct && sectors.find((s) => inSector(itemProduct, s))) || sectors[0];
  const needsRedirect = !loading && !category && !search && !!defaultSector;
  React.useEffect(() => {
    if (!needsRedirect) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('category', defaultSector.id);
        return next;
      },
      { replace: true }
    );
  }, [needsRedirect, defaultSector, setSearchParams]);

  if (loading || needsRedirect) {
    return <div className="site-empty">{lang === 'th' ? 'กำลังโหลด...' : 'Loading...'}</div>;
  }

  let content: React.ReactNode;

  if (search) {
    const matches = products.filter(
      (p) =>
        p.sku.toLowerCase().includes(search) ||
        (p.model || '').toLowerCase().includes(search) ||
        Object.values(p.title).some((v) => v && v.toLowerCase().includes(search))
    );
    const label = lang === 'th' ? 'ผลการค้นหา' : 'Search results';
    content = <SeriesSection title={`${label}: "${searchParams.get('search')}"`} badge="?" products={matches} onOpen={openProduct} />;
  } else {
    const selected = category
      ? sectors.filter((s) => s.id === category || s.name.en.toLowerCase() === category.toLowerCase())
      : [];
    // Only reached when no series exist; lists any products anyway
    const others = category ? [] : products;

    content = (
      <>
        {selected.map((sector) => (
          <SeriesSection
            key={sector.id}
            title={sector.name[lang] || sector.name.en}
            sector={sector}
            products={products.filter((p) => inSector(p, sector))}
            onOpen={openProduct}
          />
        ))}
        {others.length > 0 && (
          <SeriesSection title={lang === 'th' ? 'อื่นๆ' : 'Other'} badge="+" products={others} onOpen={openProduct} />
        )}
        {category && selected.length === 0 && <div className="site-empty">Series not found.</div>}
      </>
    );
  }

  return (
    <div className="site-panel-padded">
      {content}
    </div>
  );
};

export default ProductsView;
