import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { useI18n } from './i18n';
import { CatalogProduct, useCatalog } from './catalog';

// The popup is driven by ?item=<product id>, so it opens over any page and the URL can be shared
export const ITEM_PARAM = 'item';

// Link target that keeps the current page and its query, adding ?item=<id>
export function useProductLink() {
  const location = useLocation();
  return (id: string) => {
    const params = new URLSearchParams(location.search);
    params.set(ITEM_PARAM, id);
    return { pathname: location.pathname, search: `?${params}` };
  };
}

// Renders the popup for the product named in ?item; closing removes the parameter
export const ProductSheetHost: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { products } = useCatalog();
  const id = new URLSearchParams(location.search).get(ITEM_PARAM);
  const product = id ? products.find((p) => p.id === id) : undefined;
  if (!product) return null;

  const close = () => {
    const params = new URLSearchParams(location.search);
    params.delete(ITEM_PARAM);
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
  };
  return <ProductSheet product={product} onClose={close} />;
};

// Old /products/:id links now open the popup on the products page
export const ProductRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/products?${ITEM_PARAM}=${encodeURIComponent(id)}` : '/products'} replace />;
};

// Section heading styled as a blue folder tab
const SheetSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="site-sheet-section">
    <h3 className="site-sheet-section-tab">{title}</h3>
    {children}
  </section>
);

// Popup with photo, model, document links, specifications, certificates and size weights
const ProductSheet: React.FC<{ product: CatalogProduct; onClose: () => void }> = ({ product, onClose }) => {
  const { lang } = useI18n();
  const [photo, setPhoto] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => setPhoto(0), [product.id]);

  const downloads = product.downloads || [];
  const datasheet = downloads.find((d) => d.type === 'datasheet')?.url || product.pdfPaths?.[0];
  const certificate = downloads.find((d) => d.type === 'certificate')?.url;
  const title = product.title[lang] || product.title.en;
  const images = product.imagePaths || [];
  const specs = product.specs || [];
  const certificates = product.certificates || [];
  const weights = product.sizeWeights || [];
  const conformity = product.conformity?.[lang] || product.conformity?.en || [];
  const th = lang === 'th';
  const label = {
    model: th ? 'รุ่น' : 'Model',
    datasheet: th ? 'ข้อมูลจำเพาะ' : 'Data Sheet',
    certificate: th ? 'ใบรับรอง' : 'Certificate',
    specs: th ? 'รายละเอียดสินค้า' : 'Product Specifications',
    conformity: th ? 'มาตรฐานและการรับรอง' : 'Certificate',
    weights: th ? 'ขนาด / น้ำหนักเฉลี่ยต่อคู่ (กรัม)' : 'Size / Average weight per pair (g)',
    size: th ? 'ขนาด' : 'Size',
    weight: th ? 'น้ำหนัก' : 'Weight',
    close: th ? 'ปิด' : 'Close'
  };

  const docLink = (url: string | undefined, className: string, children: React.ReactNode) =>
    url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    ) : (
      <span className={`${className} disabled`} aria-disabled="true">
        {children}
      </span>
    );

  return (
    <div className="site-sheet-backdrop" onClick={onClose}>
      <div className="site-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="site-sheet-bar">
          <button type="button" className="site-sheet-close" onClick={onClose} aria-label={label.close}>
            <X size={22} strokeWidth={3} />
          </button>
        </div>

        <div className="site-sheet-content">
          <div className="site-sheet-top">
            <div className="site-sheet-photo">
              {images.length > 0 ? <img src={images[photo]} alt={title} /> : <span className="site-sheet-noimg">EUROSTAT</span>}
              {images.length > 1 && (
                <div className="site-sheet-thumbs">
                  {images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      className={i === photo ? 'active' : ''}
                      onClick={() => setPhoto(i)}
                      aria-label={`${title} ${i + 1}`}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="site-sheet-info">
              <div className="site-sheet-brand">
                {product.brand || 'EUROSTAT'}
                <sup>®</sup>
              </div>
              <div className="site-sheet-model">
                <span className="site-sheet-model-label">{label.model}</span>
                <span className="site-sheet-model-sku">{product.sku}</span>
              </div>
              {certificates.length > 0 && (
                <div className="site-sheet-badges">
                  {certificates.map((c) =>
                    c.image ? (
                      <img key={c.code} src={c.image} alt={c.name} title={c.name} />
                    ) : (
                      <span key={c.code} className="site-sheet-badge-code" title={c.name}>
                        {c.code}
                      </span>
                    )
                  )}
                </div>
              )}
              <p className="site-sheet-title">{title}</p>
              <div className="site-sheet-actions">
                {docLink(datasheet, 'site-sheet-btn site-sheet-btn-datasheet', label.datasheet)}
                {docLink(
                  certificate,
                  'site-sheet-btn site-sheet-btn-cert',
                  <>
                    <span className="site-sheet-ce" aria-hidden="true">CE</span>
                    {label.certificate}
                  </>
                )}
              </div>
            </div>
          </div>

          {specs.length > 0 && (
            <SheetSection title={label.specs}>
              <table className="site-sheet-specs">
                <tbody>
                  {specs.map((row) => (
                    <tr key={row.key.en}>
                      <th scope="row">{row.key[lang] || row.key.en}</th>
                      <td>{row.value[lang] || row.value.en}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SheetSection>
          )}

          {conformity.length > 0 && (
            <SheetSection title={label.conformity}>
              <ol className="site-sheet-conformity">
                {conformity.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </SheetSection>
          )}

          {weights.length > 0 && (
            <div className="site-sheet-weights">
              <h4>{label.weights}</h4>
              <div className="site-sheet-weights-scroll">
                <table>
                  <tbody>
                    <tr>
                      <th scope="row">{label.size}</th>
                      {weights.map((w) => (
                        <td key={w.size}>{w.size}</td>
                      ))}
                    </tr>
                    <tr>
                      <th scope="row">{label.weight}</th>
                      {weights.map((w) => (
                        <td key={w.size}>{w.weight}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSheet;
