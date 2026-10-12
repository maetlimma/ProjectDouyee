import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Search, Eye } from 'lucide-react';
import Breadcrumbs from '../Breadcrumbs';

interface Product {
  id: string;
  title: { en: string; zh: string; th: string };
  sku: string;
  department: string;
  subCategory: { en: string; zh: string; th: string };
  imagePaths: string[];
}

interface TaxonomySector {
  id: string;
  name: { en: string; zh: string; th: string };
}

const ProductsView: React.FC = () => {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sectors, setSectors] = useState<TaxonomySector[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const selectedCategory = searchParams.get('category') || 'All';
  const urlSearch = searchParams.get('search') || '';

  // Synchronize URL search to state query
  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  // Load products & taxonomy from API
  useEffect(() => {
    const loadData = async () => {
      try {
        const prodRes = await fetch('/api/products');
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData);
        }
        
        const taxRes = await fetch('/api/taxonomy');
        if (taxRes.ok) {
          const taxData = await taxRes.json();
          setSectors(taxData);
        }
      } catch (e) {
        console.error('Error loading products list:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter products based on category and search query
  useEffect(() => {
    let result = products;

    if (selectedCategory !== 'All') {
      result = result.filter(
        p => p.department.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p => p.sku.toLowerCase().includes(q) ||
             (p.title.en && p.title.en.toLowerCase().includes(q)) ||
             (p.title.zh && p.title.zh.toLowerCase().includes(q)) ||
             (p.title.th && p.title.th.toLowerCase().includes(q))
      );
    }

    setFilteredProducts(result);
  }, [products, selectedCategory, searchQuery]);

  const handleCategorySelect = (category: string) => {
    if (category === 'All') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams);
  };

  // Helper to translate sector names in badge display
  const getSectorDisplayName = (dept: string): string => {
    const matched = sectors.find(s => s.name.en.toLowerCase() === dept.toLowerCase());
    if (matched) {
      return matched.name[lang] || matched.name.en;
    }
    return dept;
  };

  return (
    <div className="container">
      {selectedCategory !== 'All' ? (
        <Breadcrumbs items={[
          { label: lang === 'en' ? 'Products' : lang === 'zh' ? '产品' : 'ผลิตภัณฑ์', to: '/products' },
          { label: getSectorDisplayName(selectedCategory) }
        ]} />
      ) : (
        <Breadcrumbs items={[
          { label: lang === 'en' ? 'Products' : lang === 'zh' ? '产品' : 'ผลิตภัณฑ์' }
        ]} />
      )}
      <div className="detail-header" style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
          {lang === 'en' ? 'Product Catalog' : lang === 'zh' ? '产品目录中心' : 'แค็ตตาล็อกผลิตภัณฑ์'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {lang === 'en' 
            ? 'Browse our extensive range of high-precision materials and tools.' 
            : lang === 'zh' ? '浏览我们广泛的高精度材料和工具。' : 'เรียกดูรายการวัสดุและเครื่องมือที่มีความแม่นยำสูงของเรา'}
        </p>
      </div>

      <div className="products-layout">
        {/* Sidebar Filter Component */}
        <aside className="sidebar-filters">
          <h4 className="filter-title">{t('allCategories')}</h4>
          <ul className="filter-list">
            <li 
              className={`filter-item ${selectedCategory === 'All' ? 'active' : ''}`}
              onClick={() => handleCategorySelect('All')}
            >
              {lang === 'en' ? 'All Sectors' : lang === 'zh' ? '全部板块' : 'ทุกหมวดหมู่'}
            </li>
            {sectors.map(sector => (
              <li 
                key={sector.id}
                className={`filter-item ${selectedCategory.toLowerCase() === sector.name.en.toLowerCase() ? 'active' : ''}`}
                onClick={() => handleCategorySelect(sector.name.en)}
              >
                {sector.name[lang] || sector.name.en}
              </li>
            ))}
          </ul>
        </aside>

        {/* Main Content Component */}
        <div style={{ flex: 1 }}>
          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder={t('searchPlaceholder')}
              className="form-input"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim()) {
                  searchParams.set('search', val);
                } else {
                  searchParams.delete('search');
                }
                setSearchParams(searchParams);
              }}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              {lang === 'en' ? 'Loading products...' : '加载产品中...'}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              {t('noProducts')}
            </div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-img-wrapper">
                    {product.imagePaths && product.imagePaths.length > 0 ? (
                      <img 
                        src={product.imagePaths[0]} 
                        alt={product.title[lang] || product.title.en} 
                        className="product-img"
                      />
                    ) : (
                      <div className="product-placeholder-img">DY</div>
                    )}
                  </div>
                  
                  <div className="product-card-body">
                    <span className="product-card-tag">
                      {getSectorDisplayName(product.department)}
                    </span>
                    <h4 className="product-card-title">{product.title[lang] || product.title.en}</h4>
                    <p className="product-card-sku">{t('sku')}: {product.sku}</p>
                    
                    <div className="product-card-footer">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {product.subCategory[lang] || product.subCategory.en}
                      </span>
                      <button 
                        onClick={() => navigate(`/products/${product.id}`)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Eye size={12} /> {t('viewDetails')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsView;
