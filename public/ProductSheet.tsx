import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useI18n } from './i18n';
import { CatalogProduct } from './catalog';

type Tab = 'datasheet' | 'certificate';

const isImage = (url: string) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);

// Uploaded documents render inline (images as <img>, PDFs in a frame); external links open in a new tab
const DocView: React.FC<{ url: string; title: string }> = ({ url, title }) => {
  if (!url.startsWith('/')) {
    return (
      <p className="site-sheet-empty">
        <a href={url} target="_blank" rel="noopener noreferrer" className="site-sheet-open">
          {title} &#8599;
        </a>
      </p>
    );
  }
  return isImage(url) ? <img src={url} alt={title} /> : <iframe src={url} title={title} />;
};

// Popup with Data Sheet / Certificate tabs, opened from a series card
const ProductSheet: React.FC<{ product: CatalogProduct; onClose: () => void }> = ({ product, onClose }) => {
  const { lang } = useI18n();
  const [tab, setTab] = useState<Tab>('datasheet');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const downloads = product.downloads || [];
  const datasheet = downloads.find((d) => d.type === 'datasheet')?.url || product.pdfPaths?.[0];
  const certificate = downloads.find((d) => d.type === 'certificate')?.url;
  const title = product.title[lang] || product.title.en;

  const label = {
    datasheet: lang === 'th' ? 'ข้อมูลจำเพาะ' : lang === 'zh' ? '数据表' : 'Data Sheet',
    certificate: lang === 'th' ? 'ใบรับรอง' : lang === 'zh' ? '证书' : 'Certificate',
    none: lang === 'th' ? 'ยังไม่มีเอกสาร' : lang === 'zh' ? '暂无文件' : 'No document uploaded yet.',
    more: lang === 'th' ? 'ดูรายละเอียดสินค้าทั้งหมด' : lang === 'zh' ? '查看完整产品详情' : 'View full product details'
  };

  const body = () => {
    if (tab === 'certificate') {
      return certificate ? <DocView url={certificate} title={label.certificate} /> : <p className="site-sheet-empty">{label.none}</p>;
    }
    if (datasheet) return <DocView url={datasheet} title={label.datasheet} />;
    // No datasheet file: fall back to the product photos
    return product.imagePaths.length > 0 ? (
      <div className="site-sheet-gallery">
        {product.imagePaths.map((src) => (
          <img key={src} src={src} alt={title} />
        ))}
      </div>
    ) : (
      <p className="site-sheet-empty">{label.none}</p>
    );
  };

  return (
    <div className="site-sheet-backdrop" onClick={onClose}>
      <div className="site-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="site-sheet-close" onClick={onClose} aria-label="Close">
          <X size={22} strokeWidth={3} />
        </button>
        <header className="site-sheet-head">
          <div>
            <div className="site-sheet-brand">EUROSTAT<sup>®</sup></div>
            <h2>{product.sku}</h2>
            <p>{title}</p>
          </div>
          <div className="site-sheet-tabs">
            <button type="button" className={tab === 'datasheet' ? 'active' : ''} onClick={() => setTab('datasheet')}>
              {label.datasheet}
            </button>
            <button type="button" className={tab === 'certificate' ? 'active' : ''} onClick={() => setTab('certificate')}>
              {label.certificate}
            </button>
          </div>
        </header>
        <div className="site-sheet-body">{body()}</div>
        <Link to={`/products/${product.id}`} className="site-sheet-more" onClick={onClose}>
          {label.more} &rarr;
        </Link>
      </div>
    </div>
  );
};

export default ProductSheet;
