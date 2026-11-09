import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { FileText, Layers } from 'lucide-react';
import Breadcrumbs from '../Breadcrumbs';
import { sanitizeHtml } from '../sanitizeHtml';

interface MultilingualText {
  en: string;
  zh: string;
  th: string;
}

interface ContentBlock {
  type: 'paragraph' | 'specTable' | 'bulletList';
  content?: MultilingualText;
  items?: MultilingualText[];
  headers?: { en: string[]; zh: string[]; th: string[] };
  rows?: Array<{ en: string[]; zh: string[]; th: string[] }>;
}

interface MatrixItem {
  type: 'group' | 'standard' | 'nested';
  title?: MultilingualText;
  key?: MultilingualText;
  value?: MultilingualText;
  parentKey?: MultilingualText;
  subProperties?: Array<{
    key: MultilingualText;
    value: MultilingualText;
  }>;
}

interface Product {
  id: string;
  title: MultilingualText;
  sku: string;
  department: string;
  subCategory: MultilingualText;
  imagePaths: string[];
  pdfPaths: string[];
  contentBlocks: ContentBlock[];
  technicalMatrix: MatrixItem[];
  brand?: string;
  variants?: Array<{ sku: string; name: MultilingualText; specs: string }>;
  downloads?: Array<{ url: string; title: MultilingualText; type: string }>;
  videoUrls?: string[];
  certifications?: string[];
}

interface TaxonomySector {
  id: string;
  name: { en: string; zh: string; th: string };
}

const ProductDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { lang, t } = useI18n();
  const [product, setProduct] = useState<Product | null>(null);
  const [sectors, setSectors] = useState<TaxonomySector[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'downloads'>('overview');
  const [showLightbox, setShowLightbox] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductAndTaxonomy = async () => {
      try {
        const prodRes = await fetch(`/api/products/${id}`);
        if (!prodRes.ok) {
          const errData = await prodRes.json();
          throw new Error(errData.error || 'Failed to fetch product');
        }
        const data = await prodRes.json();
        setProduct(data);

        const taxRes = await fetch('/api/taxonomy');
        if (taxRes.ok) {
          const taxData = await taxRes.json();
          setSectors(taxData);
        }

        const listRes = await fetch('/api/products');
        if (listRes.ok) {
          const list = await listRes.json();
          const filtered = list.filter((p: any) => 
            p.id !== id && 
            p.status === 'enabled' && 
            p.subCategory?.en === data.subCategory?.en
          ).slice(0, 4);
          setRelatedProducts(filtered);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProductAndTaxonomy();
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
        {lang === 'en' ? 'Loading product details...' : lang === 'zh' ? '加载商品详情中...' : 'กำลังโหลดรายละเอียดผลิตภัณฑ์...'}
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container" style={{ padding: '3rem' }}>
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
            {lang === 'en' ? 'Access Denied or Product Not Found' : lang === 'zh' ? '访问拒绝或商品未找到' : 'ปฏิเสธการเข้าถึงหรือระบุไม่พบผลิตภัณฑ์'}
          </h4>
          <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>{error || 'The product does not exist or has been disabled.'}</p>
          <Link to="/products" className="btn btn-secondary btn-sm">{t('backToProducts')}</Link>
        </div>
      </div>
    );
  }

  // Translate sector names dynamically
  const getSectorDisplayName = (dept: string): string => {
    const matched = sectors.find(s => s.name.en.toLowerCase() === dept.toLowerCase());
    if (matched) {
      return matched.name[lang] || matched.name.en;
    }
    return dept;
  };

  const hasSpecs = product.technicalMatrix && product.technicalMatrix.length > 0;
  const hasDownloads = (product.pdfPaths && product.pdfPaths.length > 0) || (product.downloads && product.downloads.length > 0);

  return (
    <div className="container" style={{ paddingBottom: '5rem' }}>
      <Breadcrumbs items={[
        { label: lang === 'en' ? 'Products' : lang === 'zh' ? '\u4ea7\u54c1' : '\u0e1c\u0e25\u0e34\u0e15\u0e20\u0e31\u0e13\u0e11\u0e4c', to: '/products' },
        { label: getSectorDisplayName(product.department), to: `/products?category=${encodeURIComponent(product.department)}` },
        { label: product.subCategory[lang] || product.subCategory.en }
      ]} />

      {/* Main product header block */}
      <div className="detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <span className="product-card-tag" style={{ marginBottom: 0 }}>
            {getSectorDisplayName(product.department)}
          </span>
          {product.certifications && product.certifications.map((cert, idx) => (
            <span key={idx} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em' }}>
              {cert}
            </span>
          ))}
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{product.title[lang] || product.title.en}</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <span>{t('sku')}: <strong style={{ fontFamily: 'var(--font-mono)' }}>{product.sku}</strong></span>
          <span>•</span>
          <span>{product.subCategory[lang] || product.subCategory.en}</span>
        </div>
      </div>

      {/* Layout Split: Media gallery and Metadata */}
      <div className="detail-layout">
        {/* Left Column: Image gallery */}
        <div className="image-gallery">
          <div 
            className="main-image-wrapper" 
            onClick={() => setShowLightbox(true)}
            style={{ cursor: 'zoom-in' }}
          >
            {product.imagePaths && product.imagePaths.length > 0 ? (
              <img 
                src={product.imagePaths[activeImageIdx]} 
                alt={product.title[lang] || product.title.en} 
                className="main-image"
              />
            ) : (
              <div className="product-placeholder-img" style={{ fontSize: '4rem' }}>DY</div>
            )}
          </div>
          
          {product.imagePaths && product.imagePaths.length > 1 && (
            <div className="thumbnails-grid">
              {product.imagePaths.map((path, idx) => (
                <div 
                  key={idx} 
                  className={`thumbnail-wrapper ${idx === activeImageIdx ? 'active' : ''}`}
                  onClick={() => setActiveImageIdx(idx)}
                >
                  <img src={path} alt="Thumbnail" className="thumbnail-img" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Key info and CTA */}
        <div className="info-content" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              {lang === 'en' ? 'Product Information' : lang === 'zh' ? '产品详细信息' : 'ข้อมูลผลิตภัณฑ์'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <p><strong>{lang === 'en' ? 'Corporate Sector:' : lang === 'zh' ? '所属板块:' : 'หมวดหมู่หลัก:'}</strong> {getSectorDisplayName(product.department)}</p>
              <p><strong>{lang === 'en' ? 'Sub-Category Line:' : lang === 'zh' ? '子类别系列:' : 'หมวดหมู่ย่อย:'}</strong> {product.subCategory[lang] || product.subCategory.en}</p>
              <p><strong>{lang === 'en' ? 'SKU Code:' : lang === 'zh' ? '商品型号:' : 'รหัสรุ่น SKU:'}</strong> {product.sku}</p>
              {product.brand && (
                <p><strong>{lang === 'en' ? 'Brand / Partner:' : lang === 'zh' ? '品牌/生产商:' : 'แบรนด์ผู้ผลิต:'}</strong> {product.brand}</p>
              )}
            </div>
          </div>

          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <Link 
              to={`/contact?sku=${encodeURIComponent(product.sku)}&product=${encodeURIComponent(product.title[lang] || product.title.en)}`}
              className="btn btn-primary"
              style={{ display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.85rem' }}
            >
              <FileText size={16} />
              {lang === 'en' ? 'Inquire About This Product' : lang === 'zh' ? '咨询该款产品' : 'สอบถามข้อมูลผลิตภัณฑ์นี้'}
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Tabs Menu */}
      <div className="tabs-nav-wrapper" style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '2rem', marginTop: '3rem', gap: '2rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('overview')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: '1rem 0', 
            fontSize: '1rem', 
            fontWeight: 700, 
            color: activeTab === 'overview' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'overview' ? '3px solid var(--primary)' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            marginBottom: '-2px'
          }}
        >
          {lang === 'en' ? 'Overview' : lang === 'zh' ? '产品概览' : 'ข้อมูลทั่วไป'}
        </button>

        {hasSpecs && (
          <button 
            onClick={() => setActiveTab('specs')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: '1rem 0', 
              fontSize: '1rem', 
              fontWeight: 700, 
              color: activeTab === 'specs' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'specs' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              marginBottom: '-2px'
            }}
          >
            {lang === 'en' ? 'Specifications' : lang === 'zh' ? '技术指标' : 'ข้อมูลทางเทคนิค'}
          </button>
        )}

        {hasDownloads && (
          <button 
            onClick={() => setActiveTab('downloads')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: '1rem 0', 
              fontSize: '1rem', 
              fontWeight: 700, 
              color: activeTab === 'downloads' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'downloads' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              marginBottom: '-2px'
            }}
          >
            {lang === 'en' ? 'Downloads & Support' : lang === 'zh' ? '下载与文档' : 'ดาวน์โหลดและเอกสาร'}
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="tab-panels-content">
        {activeTab === 'overview' && (
          <div>
            {product.contentBlocks && product.contentBlocks.length > 0 ? (
              <div className="detail-content-blocks">
                {product.contentBlocks.map((block, idx) => {
                  if (block.type === 'paragraph' && block.content) {
                    return (
                      <div 
                        key={idx} 
                        className="rich-paragraph-block"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content[lang] || block.content.en) }}
                      />
                    );
                  } else if (block.type === 'bulletList' && block.items) {
                    return (
                      <ul key={idx} className="bullet-list-block" style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
                        {block.items.map((item, iIdx) => (
                          <li key={iIdx} style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                            {item[lang] || item.en}
                          </li>
                        ))}
                      </ul>
                    );
                  } else if (block.type === 'specTable' && block.headers && block.rows) {
                    const headers = block.headers[lang] || block.headers.en || [];
                    const rows = block.rows || [];
                    return (
                      <div key={idx} style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                        <table className="spec-table-block">
                          <thead>
                            <tr>
                              {headers.map((h, hIdx) => (
                                <th key={hIdx}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, rIdx) => {
                              const columns = row[lang] || row.en || [];
                              return (
                                <tr key={rIdx}>
                                  {columns.map((col, cIdx) => (
                                    <td key={cIdx}>{col}</td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {lang === 'en' ? 'No overview descriptions available.' : '暂无产品概览。'}
              </p>
            )}

            {/* Video URLs Render */}
            {product.videoUrls && product.videoUrls.length > 0 && (
              <div style={{ marginTop: '3rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                  {lang === 'en' ? 'Product Demonstration' : '产品演示'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {product.videoUrls.map((url, idx) => {
                    // Simple Youtube embed transformation (handles watch?v= format)
                    let embedUrl = url;
                    if (url.includes('youtube.com/watch?v=')) {
                      embedUrl = url.replace('watch?v=', 'embed/');
                    }
                    return (
                      <div key={idx} style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <iframe 
                          src={embedUrl} 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variants Render */}
            {product.variants && product.variants.length > 0 && (
              <div style={{ marginTop: '3rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                  {lang === 'en' ? 'Ordering Information' : '订购选项'}
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="spec-table-block" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-muted)' }}>{lang === 'en' ? 'SKU' : '型号'}</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-muted)' }}>{lang === 'en' ? 'Description' : '说明'}</th>
                        <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-muted)' }}>{lang === 'en' ? 'Specifications' : '规格'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.variants.map((v, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: 600 }}>{v.sku}</td>
                          <td style={{ padding: '0.75rem' }}>{v.name[lang] || v.name.en}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{v.specs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'specs' && hasSpecs && (
          <div className="matrix-section" style={{ marginTop: 0 }}>
            <div className="matrix-table-wrapper">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th style={{ width: '42%' }}>{t('matrixProperty')}</th>
                    <th style={{ width: '58%' }}>{t('matrixValue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {product.technicalMatrix.map((item, idx) => {
                    if (item.type === 'group' && item.title) {
                      return (
                        <tr key={idx} className="matrix-group-row">
                          <td colSpan={2}>
                            <span className="matrix-group-badge">Group</span>
                            {item.title[lang] || item.title.en}
                          </td>
                        </tr>
                      );
                    } else if (item.type === 'standard' && item.key && item.value) {
                      return (
                        <tr key={idx} className="matrix-standard-row">
                          <td style={{ fontWeight: 600, paddingLeft: '1.5rem' }}>
                            {item.key[lang] || item.key.en}
                          </td>
                          <td>
                            {item.value[lang] || item.value.en}
                          </td>
                        </tr>
                      );
                    } else if (item.type === 'nested' && item.parentKey && item.subProperties) {
                      return (
                        <tr key={idx} className="matrix-nested-row">
                          <td style={{ verticalAlign: 'top', paddingLeft: '1.5rem' }}>
                            <span className="matrix-nested-parent-key">{item.parentKey[lang] || item.parentKey.en}</span>
                            <div className="matrix-nested-child-list">
                              {item.subProperties.map((sub, sIdx) => (
                                <div key={sIdx} className="matrix-nested-child-item">
                                  {sub.key[lang] || sub.key.en}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td style={{ verticalAlign: 'top' }}>
                            <div className="matrix-nested-value-list">
                              {item.subProperties.map((sub, sIdx) => (
                                <div key={sIdx} className="matrix-nested-value-item">
                                  <span className="matrix-nested-badge">Spec</span>
                                  {sub.value[lang] || sub.value.en}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'downloads' && hasDownloads && (
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {t('downloads')}
            </h3>
            <div className="manuals-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {product.pdfPaths && product.pdfPaths.map((path, idx) => {
                const filename = path.substring(path.lastIndexOf('/') + 1);
                const cleanFilename = filename.substring(filename.indexOf('-') + 1);
                return (
                  <a 
                    key={`pdf-${idx}`} 
                    href={path} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="pdf-link"
                    style={{ margin: 0 }}
                  >
                    <FileText size={16} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cleanFilename || t('downloadPdf')}
                    </span>
                  </a>
                );
              })}
              
              {product.downloads && product.downloads.map((d, idx) => (
                <a 
                  key={`dl-${idx}`} 
                  href={d.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="pdf-link"
                  style={{ margin: 0 }}
                >
                  <Layers size={16} color="var(--primary)" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column' }}>
                    <span>{d.title[lang] || d.title.en}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d.type}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Products Showcase */}
      {relatedProducts.length > 0 && (
        <div style={{ marginTop: '5rem', borderTop: '1px solid var(--border-color)', paddingTop: '3rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem' }}>
            {lang === 'en' ? 'Related Products' : lang === 'zh' ? '相关推荐产品' : 'ผลิตภัณฑ์ที่เกี่ยวข้อง'}
          </h3>
          <div className="products-grid">
            {relatedProducts.map((relProd) => (
              <Link 
                key={relProd.id} 
                to={`/products/item/${relProd.id}/${relProd.title.en.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} 
                className="product-card" 
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={() => {
                  // Scroll to top when routing to related product detail
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="product-img-wrapper" style={{ height: '180px' }}>
                  {relProd.imagePaths && relProd.imagePaths.length > 0 ? (
                    <img src={relProd.imagePaths[0]} alt={relProd.title[lang] || relProd.title.en} className="product-img" />
                  ) : (
                    <div className="product-placeholder-img">DY</div>
                  )}
                </div>
                <div className="product-card-body" style={{ padding: '1rem' }}>
                  <span className="product-card-tag">{getSectorDisplayName(relProd.department)}</span>
                  <h4 className="product-card-title" style={{ fontSize: '0.925rem', margin: '0.5rem 0', minHeight: '2.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {relProd.title[lang] || relProd.title.en}
                  </h4>
                  <p className="product-card-sku" style={{ fontSize: '0.75rem' }}>{t('sku')}: {relProd.sku}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {showLightbox && product.imagePaths && product.imagePaths.length > 0 && (
        <div 
          onClick={() => setShowLightbox(false)} 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.85)', 
            zIndex: 9999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '2rem',
            cursor: 'zoom-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
            <img 
              src={product.imagePaths[activeImageIdx]} 
              alt={product.title[lang] || product.title.en} 
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 'var(--radius-lg)', objectFit: 'contain', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} 
            />
            <button 
              onClick={() => setShowLightbox(false)}
              style={{ 
                position: 'absolute', 
                top: '-2.5rem', 
                right: 0, 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                fontSize: '2rem', 
                cursor: 'pointer',
                fontWeight: 300
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailView;
export type { MatrixItem, ContentBlock };
export type { Product };
