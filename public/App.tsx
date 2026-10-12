import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
import { I18nProvider, useI18n, LanguageDropdown } from './i18n';
import HomeView from './views/HomeView';
import ProductsView from './views/ProductsView';
import ProductDetailView from './views/ProductDetailView';
import ContactView from './views/ContactView';
import { Key, Search, Menu, X, ChevronDown, ChevronUp } from 'lucide-react';

interface TaxonomySector {
  id: string;
  name: { en: string; zh: string; th: string };
}



// Global Command-Palette Search Modal Overlay
const SearchModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const products = await res.json();
          const q = query.toLowerCase();
          const filtered = products.filter((p: any) => 
            p.sku.toLowerCase().includes(q) ||
            (p.title.en && p.title.en.toLowerCase().includes(q)) ||
            (p.title.zh && p.title.zh.toLowerCase().includes(q)) ||
            (p.title.th && p.title.th.toLowerCase().includes(q))
          );
          setResults(filtered.slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Handle keybindings for ESC key closing
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-input-wrapper">
          <Search size={18} className="search-modal-input-icon" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder={lang === 'en' ? 'Type to search products...' : lang === 'zh' ? '输入以搜索产品...' : 'พิมพ์เพื่อค้นหาผลิตภัณฑ์...'} 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-modal-input"
          />
          <button onClick={onClose} className="search-modal-close-btn" type="button">ESC</button>
        </div>

        <div className="search-modal-results">
          {loading && (
            <div className="search-modal-status">Searching...</div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div className="search-modal-status">No products found matching "{query}"</div>
          )}
          {!loading && !query.trim() && (
            <div className="search-modal-status">Type to search for SKUs or titles...</div>
          )}
          {results.map((p) => (
            <div 
              key={p.id} 
              className="search-modal-result-item"
              onClick={() => {
                navigate(`/products/${p.id}`);
                onClose();
              }}
            >
              <div>
                <strong className="result-title">{p.title[lang] || p.title.en}</strong>
                <span className="result-sku">SKU: {p.sku}</span>
              </div>
              <span className="result-dept">{p.department}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AppHeader: React.FC = () => {
  const { lang, t, changeLanguage } = useI18n();
  const [sectors, setSectors] = useState<TaxonomySector[]>([]);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);

  // Load sectors for products dropdown list
  useEffect(() => {
    const fetchTaxonomy = async () => {
      try {
        const res = await fetch('/api/taxonomy');
        if (res.ok) {
          const data = await res.json();
          setSectors(data);
        }
      } catch (e) {
        console.error('Error fetching taxonomy for header:', e);
      }
    };
    fetchTaxonomy();
  }, []);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="header-bar">
        {/* Left Side: Brand Logo */}
        <Link to="/" className="header-brand" onClick={() => setMobileMenuOpen(false)}>
          <div className="logo-badge">DY</div>
          <div className="brand-text">
            <h1>{lang === 'en' ? 'Dou Yee Enterprises' : lang === 'zh' ? '都宜企业' : 'บริษัท ดู ยี เอ็นเตอร์ไพรส์'}</h1>
            <p>{lang === 'en' ? 'Unified Catalog Engine v2.0' : lang === 'zh' ? '统一目录引擎 v2.0' : 'ระบบแค็ตตาล็อกอุตสาหกรรม v2.0'}</p>
          </div>
        </Link>



        {/* Desktop Navigation Links */}
        <nav className="header-nav desktop-only">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            {t('home')}
          </NavLink>
          
          <div className="nav-dropdown-container">
            <NavLink to="/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {t('products')}
            </NavLink>
            <div className="nav-dropdown-menu">
              {sectors.map(sector => (
                <Link 
                  key={sector.id} 
                  to={`/products?category=${encodeURIComponent(sector.name.en)}`}
                  className="nav-dropdown-item"
                >
                  {sector.name[lang] || sector.name.en}
                </Link>
              ))}
            </div>
          </div>

          <NavLink to="/contact" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            {t('contactUs')}
          </NavLink>
        </nav>

        {/* Right Actions: Desktop language selection & Mobile Hamburger trigger */}
        <div className="header-actions">
          {/* Search button (icon only) - visible on both desktop and mobile */}
          <button 
            onClick={() => setSearchModalOpen(true)} 
            className="header-search-icon-btn" 
            title="Search"
            type="button"
          >
            <Search size={18} />
          </button>

          <div className="desktop-only">
            <LanguageDropdown />
          </div>

          {/* Hamburger toggle button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="mobile-menu-toggle-btn mobile-only"
            title="Menu"
            type="button"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay Drawer (Atmeta responsive style) */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <span style={{ fontWeight: 800, color: 'var(--primary)' }}>Navigation Menu</span>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="mobile-drawer-nav">
              <Link to="/" className="mobile-drawer-nav-item" onClick={() => setMobileMenuOpen(false)}>
                {t('home')}
              </Link>

              {/* Products nested collapse */}
              <div>
                <button 
                  onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
                  className="mobile-drawer-nav-item"
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none' }}
                  type="button"
                >
                  <span>{t('products')}</span>
                  {mobileProductsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {mobileProductsOpen && (
                  <div className="mobile-drawer-nested-list">
                    <Link to="/products" className="mobile-drawer-nested-item" onClick={() => setMobileMenuOpen(false)}>
                      {lang === 'en' ? 'All Sectors' : lang === 'zh' ? '查看全部' : 'หมวดหมู่ทั้งหมด'}
                    </Link>
                    {sectors.map(sector => (
                      <Link 
                        key={sector.id} 
                        to={`/products?category=${encodeURIComponent(sector.name.en)}`} 
                        className="mobile-drawer-nested-item" 
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {sector.name[lang] || sector.name.en}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link to="/contact" className="mobile-drawer-nav-item" onClick={() => setMobileMenuOpen(false)}>
                {t('contactUs')}
              </Link>
            </nav>

            {/* Mobile Inline language toggle options */}
            <div className="mobile-drawer-footer">
              <span className="mobile-drawer-label">Language / 语言:</span>
              <div className="mobile-drawer-lang-row">
                <button 
                  onClick={() => { changeLanguage('en'); setMobileMenuOpen(false); }}
                  className={`mobile-lang-btn ${lang === 'en' ? 'active' : ''}`}
                  type="button"
                >
                  English
                </button>
                <button 
                  onClick={() => { changeLanguage('zh'); setMobileMenuOpen(false); }}
                  className={`mobile-lang-btn ${lang === 'zh' ? 'active' : ''}`}
                  type="button"
                >
                  中文
                </button>
                <button 
                  onClick={() => { changeLanguage('th'); setMobileMenuOpen(false); }}
                  className={`mobile-lang-btn ${lang === 'th' ? 'active' : ''}`}
                  type="button"
                >
                  ไทย
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Command Search Overlay */}
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </>
  );
};

const AppFooter: React.FC = () => {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div>
        <span>{t('copyright')}</span>
        <a href="/admin/login" className="footer-key-link" title="Admin Portal">
          <Key size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </a>
      </div>
    </footer>
  );
};

const App: React.FC = () => {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AppHeader />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/products" element={<ProductsView />} />
            <Route path="/products/:id" element={<ProductDetailView />} />
            <Route path="/contact" element={<ContactView />} />
          </Routes>
        </main>
        <AppFooter />
      </BrowserRouter>
    </I18nProvider>
  );
};

export default App;
