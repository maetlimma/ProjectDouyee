import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useCatalog, inSector, CatalogProduct, CatalogSector } from '../catalog';
import SeriesBadge from '../SeriesBadge';
import ProductSheet from '../ProductSheet';

const ProductCard: React.FC<{ product: CatalogProduct; onOpen: () => void }> = ({ product, onOpen }) => {
  const { lang } = useI18n();
  const [main, ...extra] = product.imagePaths || [];

  return (
    <button type="button" className="site-card" onClick={onOpen}>
      <span className="site-card-label">{product.sku}</span>
      <div className="site-card-img">
        {main ? (
          <img src={main} alt={product.title[lang] || product.title.en} loading="lazy" />
        ) : (
          <span className="site-card-placeholder">EUROSTAT</span>
        )}
      </div>
      <p className="site-card-spec">{product.title[lang] || product.title.en}</p>
      {extra.length > 0 && (
        <div className="site-card-thumbs">
          {extra.slice(0, 4).map((src) => (
            <img key={src} src={src} alt="" loading="lazy" />
          ))}
        </div>
      )}
    </button>
  );
};

const SeriesSection: React.FC<{
  title: string;
  sector?: CatalogSector;
  badge?: string;
  products: CatalogProduct[];
  onOpen: (p: CatalogProduct) => void;
}> = ({ title, sector, badge, products, onOpen }) => {
  const { lang } = useI18n();
  return (
    <section className="site-series">
      <div className="site-series-head">
        <SeriesBadge sector={sector} label={badge} large />
        <h2>{title}</h2>
        <span className="site-series-bar" />
      </div>
      {products.length > 0 ? (
        <div className="site-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={() => onOpen(p)} />
          ))}
        </div>
      ) : (
        <div className="site-empty">
          {lang === 'th' ? 'ยังไม่มีสินค้าในกลุ่มนี้' : lang === 'zh' ? '该系列暂无产品' : 'No products in this series yet.'}
        </div>
      )}
    </section>
  );
};

const ProductsView: React.FC = () => {
  const { lang } = useI18n();
  const [searchParams] = useSearchParams();
  const { products, sectors, loading } = useCatalog();
  const [openProduct, setOpenProduct] = useState<CatalogProduct | null>(null);

  const category = searchParams.get('category');
  const search = (searchParams.get('search') || '').trim().toLowerCase();

  if (loading) {
    return <div className="site-empty">{lang === 'th' ? 'กำลังโหลด...' : lang === 'zh' ? '加载中...' : 'Loading...'}</div>;
  }

  let content: React.ReactNode;

  if (search) {
    const matches = products.filter(
      (p) => p.sku.toLowerCase().includes(search) || Object.values(p.title).some((v) => v && v.toLowerCase().includes(search))
    );
    const label = lang === 'th' ? 'ผลการค้นหา' : lang === 'zh' ? '搜索结果' : 'Search results';
    content = <SeriesSection title={`${label}: "${searchParams.get('search')}"`} badge="?" products={matches} onOpen={setOpenProduct} />;
  } else {
    const selected = category
      ? sectors.filter((s) => s.id === category || s.name.en.toLowerCase() === category.toLowerCase())
      : sectors;
    const others = category ? [] : products.filter((p) => !sectors.some((s) => inSector(p, s)));

    content = (
      <>
        {selected.map((sector) => (
          <SeriesSection
            key={sector.id}
            title={sector.name[lang] || sector.name.en}
            sector={sector}
            products={products.filter((p) => inSector(p, sector))}
            onOpen={setOpenProduct}
          />
        ))}
        {others.length > 0 && (
          <SeriesSection title={lang === 'th' ? 'อื่นๆ' : lang === 'zh' ? '其他' : 'Other'} badge="+" products={others} onOpen={setOpenProduct} />
        )}
        {selected.length === 0 && <div className="site-empty">Series not found.</div>}
      </>
    );
  }

  return (
    <div className="site-panel-padded">
      {content}
      {openProduct && <ProductSheet product={openProduct} onClose={() => setOpenProduct(null)} />}
    </div>
  );
};

export default ProductsView;
