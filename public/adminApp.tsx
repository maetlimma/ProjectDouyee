import React, { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Award, Box, LogOut, ShieldCheck, Layers3, BookOpen, PanelLeftClose, PanelLeft, Terminal } from 'lucide-react';
import { I18nProvider } from './i18n';
import LoginView from './views/LoginView';
import { CataloguesManager, CertificatesManager, ProductEditor, ProductList, SeriesManager } from './views/AdminConsoleView';

function AdminShell() {
  const location = useLocation();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('douyee_cockpit_sidebar') === 'collapsed';
  });

  const token = localStorage.getItem('douyee_admin_token');
  const isLogin = location.pathname === '/login' || location.pathname === '/';
  const hideFooter = ['/series', '/certificates', '/catalogues'].some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));

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
    localStorage.removeItem('douyee_admin_token');
    setAdminEmail(null);
    window.location.href = '/admin/login';
  }

  return (
    <div className={`ac-app ${isLogin ? 'ac-login-mode' : ''} ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
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
          <Link to="/dashboard" className="ac-brand">
            <span className="ac-brand-mark">DY</span>
            <span>
              <strong>DOUYEE</strong>
              <small>MODULAR COCKPIT</small>
            </span>
          </Link>
        </div>

        <div className="ac-topbar-tools">
          {adminEmail && (
            <div className="ac-user">
              <span className="ac-user-avatar">{adminEmail.slice(0, 1).toUpperCase()}</span>
              <span className="ac-user-email">{adminEmail}</span>
              <button onClick={logout} title="Sign out"><LogOut size={15} /></button>
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

          <div className="ac-sidebar-bottom">
            <ShieldCheck size={16} />
            <span>{sidebarCollapsed ? 'API' : 'Modular Cockpit · Audit tracked.'}</span>
          </div>
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
