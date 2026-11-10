import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Award, Box, LogOut, ShieldCheck, Layers3, BookOpen, PanelLeftClose, PanelLeft, Users, ChevronDown, Shield, GalleryHorizontal } from 'lucide-react';
import { I18nProvider } from './i18n';
import LoginView from './views/LoginView';
import { AdminUsersManager, CataloguesManager, CertificatesManager, HomeSliderManager, ProductEditor, ProductList, SeriesManager } from './views/admin';

function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('douyee_cockpit_sidebar') === 'collapsed';
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('douyee_admin_token');
  const isLogin = location.pathname === '/login' || location.pathname === '/';
  const hideFooter = ['/series', '/certificates', '/catalogues', '/users'].some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('douyee_cockpit_sidebar', next ? 'collapsed' : 'expanded');
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close user dropdown on route change
  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const checkUser = async () => {
      const savedToken = localStorage.getItem('douyee_admin_token');
      if (!savedToken) { setAdminEmail(null); return; }
      try {
        const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } });
        if (!response.ok || !(response.headers.get('content-type') ?? '').includes('application/json')) throw new Error('Invalid session');
        const data = await response.json();
        setAdminEmail(data.email);
      } catch {
        localStorage.removeItem('douyee_admin_token');
        setAdminEmail(null);
      }
    };
    void checkUser();
  }, [location.pathname]);

  function logout() {
    setUserMenuOpen(false);
    localStorage.removeItem('douyee_admin_token');
    setAdminEmail(null);
    window.location.href = '/admin/login';
  }

  return (
    <div
      className={`ac-app ${isLogin ? 'ac-login-mode' : ''} ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}
      style={isLogin ? { backgroundImage: "url('/assets/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center top' } : undefined}
    >
      <header className="ac-topbar ac-cockpit-topbar">
        <div className="ac-topbar-left">
          {!isLogin && token && (
            <button
              type="button"
              className="ac-sidebar-toggle-btn"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            >
              {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
          <Link to="/dashboard" className="ac-brand" title="Dou Yee Enterprises - Cockpit">
            <img src="/assets/douyee-logo.png" alt="Dou Yee Enterprises" className="ac-brand-logo-img" />
          </Link>
        </div>

        <div className="ac-topbar-tools">
          {adminEmail && (
            <div className="ac-user-dropdown-wrap" ref={userMenuRef}>
              <button
                type="button"
                className={`ac-user-trigger-btn ${userMenuOpen ? 'active' : ''}`}
                onClick={() => setUserMenuOpen((prev) => !prev)}
                title="Admin profile & settings"
              >
                <span className="ac-user-avatar">{adminEmail.slice(0, 1).toUpperCase()}</span>
                <span className="ac-user-email">{adminEmail}</span>
                <ChevronDown size={14} className={`ac-user-chevron ${userMenuOpen ? 'open' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="ac-user-dropdown-menu" role="menu">
                  <div className="ac-user-dropdown-header">
                    <div className="ac-dropdown-email">{adminEmail}</div>
                    <div className="ac-dropdown-badge">
                      <Shield size={11} />
                      <span>Operator Admin</span>
                    </div>
                  </div>

                  <div className="ac-dropdown-divider" />

                  <button
                    type="button"
                    className="ac-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/users');
                    }}
                  >
                    <Users size={15} />
                    <span>Manage Admins</span>
                  </button>

                  <div className="ac-dropdown-divider" />

                  <button
                    type="button"
                    className="ac-dropdown-item text-danger"
                    role="menuitem"
                    onClick={logout}
                  >
                    <LogOut size={15} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {!isLogin && token && (
        <aside className={`ac-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
          <div className="ac-nav-label">{sidebarCollapsed ? '—' : 'CATALOG'}</div>
          <NavLink
            to="/dashboard"
            end
            title="Products"
            className={({ isActive }) => `ac-nav-link ${isActive || location.pathname.startsWith('/products/') ? 'active' : ''}`}
          >
            <Box size={17} />
            <span>Products</span>
          </NavLink>
          <NavLink
            to="/series"
            title="Series"
            className={({ isActive }) => `ac-nav-link ${isActive ? 'active' : ''}`}
          >
            <Layers3 size={17} />
            <span>Series</span>
          </NavLink>
          <NavLink
            to="/certificates"
            title="Certificates"
            className={({ isActive }) => `ac-nav-link ${isActive ? 'active' : ''}`}
          >
            <Award size={17} />
            <span>Certificates</span>
          </NavLink>
          <NavLink
            to="/catalogues"
            title="Catalogues"
            className={({ isActive }) => `ac-nav-link ${isActive ? 'active' : ''}`}
          >
            <BookOpen size={17} />
            <span>Catalogues</span>
          </NavLink>
          <NavLink
            to="/home-slider"
            title="Home Slider"
            className={({ isActive }) => `ac-nav-link ${isActive ? 'active' : ''}`}
          >
            <GalleryHorizontal size={17} />
            <span>Home Slider</span>
          </NavLink>
        </aside>
      )}

      <main className={`ac-main ${isLogin ? 'login-main' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginView />} />
          <Route path="/dashboard" element={token ? <ProductList /> : <Navigate to="/login" replace />} />
          <Route path="/products/new" element={token ? <ProductEditor /> : <Navigate to="/login" replace />} />
          <Route path="/products/:id/edit" element={token ? <ProductEditor /> : <Navigate to="/login" replace />} />
          <Route path="/series" element={token ? <SeriesManager /> : <Navigate to="/login" replace />} />
          <Route path="/certificates" element={token ? <CertificatesManager /> : <Navigate to="/login" replace />} />
          <Route path="/catalogues" element={token ? <CataloguesManager /> : <Navigate to="/login" replace />} />
          <Route path="/home-slider" element={token ? <HomeSliderManager /> : <Navigate to="/login" replace />} />
          <Route path="/users" element={token ? <AdminUsersManager /> : <Navigate to="/login" replace />} />
          <Route path="/admins" element={<Navigate to="/users" replace />} />
          <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </main>

      {!isLogin && !hideFooter && (
        <footer className="ac-footer">
          <span>Dou Yee · Modular Operator Cockpit</span>
          <span>API v1 · Fast-action workbench</span>
        </footer>
      )}
    </div>
  );
}

const AdminApp: React.FC = () => (
  <I18nProvider>
    <BrowserRouter basename="/admin">
      <AdminShell />
    </BrowserRouter>
  </I18nProvider>
);

export default AdminApp;
