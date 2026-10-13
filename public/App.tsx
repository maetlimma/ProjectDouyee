import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { I18nProvider, useI18n, Language } from './i18n';
import HomeView from './views/HomeView';
import ProductsView from './views/ProductsView';
import ProductDetailView from './views/ProductDetailView';
import ContactView from './views/ContactView';
import AboutView from './views/AboutView';
import CataloguesView from './views/CataloguesView';
import { useCatalog, inSector, CATALOGUES } from './catalog';
import SeriesBadge from './SeriesBadge';
import { Search, Key } from 'lucide-react';

// Inline search pill with live SKU/title suggestions
const HeaderSearch: React.FC = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const { products } = useCatalog();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? products
        .filter((p) => p.sku.toLowerCase().includes(q) || Object.values(p.title).some((v) => v && v.toLowerCase().includes(q)))
        .slice(0, 6)
    : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q) return;
    setOpen(false);
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form className="site-search" onSubmit={submit} ref={boxRef} role="search">
      <input
        type="text"
        value={query}
        placeholder={lang === 'th' ? 'ค้นหา...' : lang === 'zh' ? '搜索...' : 'Search...'}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Search products"
      />
      <button type="submit" aria-label="Search">
        <Search size={15} />
      </button>
      {open && results.length > 0 && (
        <div className="site-search-results">
          {results.map((p) => (
            <Link
              key={p.id}
              to={`/products/${p.id}`}
              className="site-search-result"
              onClick={() => {
                setOpen(false);
                setQuery('');
              }}
            >
              <strong>{p.sku}</strong>
              {p.title[lang] || p.title.en}
            </Link>
          ))}
        </div>
      )}
    </form>
  );
};

const LangSwitch: React.FC = () => {
  const { lang, changeLanguage } = useI18n();
  const options: { code: Language; label: string }[] = [
    { code: 'th', label: 'TH' },
    { code: 'en', label: 'EN' },
    { code: 'zh', label: '中' }
  ];
  return (
    <div className="site-lang">
      {options.map((o, i) => (
        <React.Fragment key={o.code}>
          {i > 0 && <span>/</span>}
          <button type="button" className={lang === o.code ? 'active' : ''} onClick={() => changeLanguage(o.code)}>
            {o.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

// Products tab with hover mega menu: one column per sector listing its SKUs
const ProductsMenu: React.FC = () => {
  const { lang, t } = useI18n();
  const location = useLocation();
  const { products, sectors } = useCatalog();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location]);

  return (
    <div
      className={`site-nav-item ${open ? 'open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <NavLink to="/products" className={({ isActive }) => `site-nav-link ${isActive ? 'active' : ''}`}>
        {t('products')}
      </NavLink>
      {open && sectors.length > 0 && (
        <div className="site-mega" style={{ ['--mega-cols' as string]: Math.min(sectors.length, 4) } as React.CSSProperties}>
          {sectors.map((sector) => {
            const items = products.filter((p) => inSector(p, sector));
            return (
              <div key={sector.id} className="site-mega-col">
                <Link to={`/products?category=${encodeURIComponent(sector.id)}`} className="site-mega-head">
                  <SeriesBadge sector={sector} />
                  <span>{sector.name[lang] || sector.name.en}</span>
                </Link>
                <ul className="site-mega-list">
                  {items.map((p) => (
                    <li key={p.id}>
                      <Link to={`/products/${p.id}`}>{p.sku}</Link>
                    </li>
                  ))}
                  {items.length === 0 && <li className="site-mega-empty">-</li>}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AppHeader: React.FC = () => {
  const { lang, t } = useI18n();
  const navClass = ({ isActive }: { isActive: boolean }) => `site-nav-link ${isActive ? 'active' : ''}`;

  return (
    <header className="site-shell">
      <div className="site-header">
        <Link to="/" className="site-logo">
          <span className="site-logo-text">EUROSTAT<sup>®</sup></span>
        </Link>
        <div className="site-header-tools">
          <HeaderSearch />
          <LangSwitch />
        </div>
      </div>
      <nav className="site-nav">
        <div className="site-nav-item">
          <NavLink to="/" end className={navClass}>{t('home')}</NavLink>
        </div>
        <div className="site-nav-item">
          <NavLink to="/about" className={navClass}>
            {lang === 'th' ? 'เกี่ยวกับเรา' : lang === 'zh' ? '关于我们' : 'About us'}
          </NavLink>
        </div>
        <ProductsMenu />
        <div className="site-nav-item">
          <NavLink to="/catalogues" className={navClass}>
            {lang === 'th' ? 'แคตตาล็อก' : lang === 'zh' ? '产品目录' : 'Catalogues'}
          </NavLink>
        </div>
        <div className="site-nav-item">
          <NavLink to="/contact" className={navClass}>
            {lang === 'th' ? 'ติดต่อเรา' : lang === 'zh' ? '联系我们' : 'Contact'}
          </NavLink>
        </div>
      </nav>
    </header>
  );
};

const MAP_QUERY = '75/27 Moo 11 Phaholyothin Rd, Khlong Nueng, Khlong Luang, Pathum Thani 12120';

const AppFooter: React.FC = () => {
  const { lang } = useI18n();
  const { sectors } = useCatalog();

  return (
    <footer className="site-shell site-footer">
      <img className="site-footer-logo" src="/assets/douyee-logo.png" alt="Dou Yee Enterprises" />
      <div className="site-footer-grid">
        <div>
          <h4>Contact</h4>
          <p>
            DOU YEE ENTERPRISES (THAILAND) CO.,LTD<br />
            75/27 Moo 11, Phaholyothin Rd, T.Klongnueng,<br />
            A.Klongluang, Pathumthani 12120 , Thailand<br />
            Tel: +662 529 0979<br />
            E-mail : <a href="mailto:panjaruts@douyee.co.th">panjaruts@douyee.co.th</a>
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            บริษัท ดาวี เอ็นเตอร์ไพรส์ (ประเทศไทย) จำกัด<br />
            75/27 หมู่ที่ 11 ถนนพหลโยธิน ตำบลคลองหนึ่ง<br />
            อำเภอคลองหลวง จังหวัดปทุมธานี 12120<br />
            E-mail : <a href="mailto:panjaruts@douyee.co.th">panjaruts@douyee.co.th</a>
          </p>
        </div>
        <div>
          <h4><Link to="/about" style={{ fontSize: 'inherit', color: 'inherit' }}>About us</Link></h4>
          <iframe
            className="site-footer-map"
            title="Dou Yee Thailand location"
            loading="lazy"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&t=k&z=15&output=embed`}
          />
        </div>
        <div>
          <h4>Products</h4>
          <ul>
            {sectors.map((s) => (
              <li key={s.id}>
                <Link to={`/products?category=${encodeURIComponent(s.id)}`}>{s.name[lang] || s.name.en}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Catalogues</h4>
          <ul>
            {CATALOGUES.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            <Link to="/catalogues">&lt;more&gt;</Link>
          </p>
        </div>
      </div>
      <p className="site-copyright">
        Copyright DOU YEE ENTERPRISES (THAILAND) CO.,LTD. All rights reserved.
        <a href="/admin/login" title="Admin Portal">
          <Key size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </a>
      </p>
    </footer>
  );
};

const App: React.FC = () => {
  return (
    <I18nProvider>
      <BrowserRouter>
        <div className="site">
          <AppHeader />
          <main className="site-shell site-main">
            <div className="site-panel">
              <Routes>
                <Route path="/" element={<HomeView />} />
                <Route path="/about" element={<AboutView />} />
                <Route path="/products" element={<ProductsView />} />
                <Route path="/products/:id" element={<ProductDetailView />} />
                <Route path="/catalogues" element={<CataloguesView />} />
                <Route path="/contact" element={<ContactView />} />
              </Routes>
            </div>
          </main>
          <AppFooter />
        </div>
      </BrowserRouter>
    </I18nProvider>
  );
};

export default App;
