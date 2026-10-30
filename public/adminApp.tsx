import React, { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Award, Box, LogOut, ShieldCheck, Layers3 } from 'lucide-react';
import { I18nProvider, LanguageDropdown } from './i18n';
import LoginView from './views/LoginView';
import { CertificatesManager, ProductEditor, ProductList, SeriesManager } from './views/AdminConsoleView';

function AdminShell() {
  const location = useLocation();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const token = localStorage.getItem('douyee_admin_token');
  const isLogin = location.pathname === '/login' || location.pathname === '/';

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

  return <div className={`ac-app ${isLogin ? 'ac-login-mode' : ''}`}>
    <header className="ac-topbar">
      <Link to="/dashboard" className="ac-brand"><span className="ac-brand-mark">DY</span><span><strong>DOUYEE</strong><small>PRODUCT ADMIN</small></span></Link>
      <div className="ac-topbar-tools"><span className="ac-workspace-label"><i /> ADMIN WORKSPACE</span><LanguageDropdown />{adminEmail && <div className="ac-user"><span className="ac-user-avatar">{adminEmail.slice(0, 1).toUpperCase()}</span><span className="ac-user-email">{adminEmail}</span><button onClick={logout} title="Sign out"><LogOut size={15} /></button></div>}</div>
    </header>
    {!isLogin && token && <aside className="ac-sidebar"><div className="ac-nav-label">CATALOG</div>
      <NavLink to="/dashboard" end className={({ isActive }) => `ac-nav-link ${isActive || location.pathname.startsWith('/products/') ? 'active' : ''}`}><Box size={17} /><span>Products</span></NavLink>
      <NavLink to="/series" className={({ isActive }) => `ac-nav-link ${isActive ? 'active' : ''}`}><Layers3 size={17} /><span>Series</span></NavLink>
      <NavLink to="/certificates" className={({ isActive }) => `ac-nav-link ${isActive ? 'active' : ''}`}><Award size={17} /><span>Certificates</span></NavLink>
      <div className="ac-sidebar-bottom"><ShieldCheck size={16} /><span>Product, series and certificate records follow the API model.</span></div>
    </aside>}
    <main className={`ac-main ${isLogin ? 'login-main' : ''}`}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/dashboard" element={token ? <ProductList /> : <Navigate to="/login" replace />} />
        <Route path="/products/new" element={token ? <ProductEditor /> : <Navigate to="/login" replace />} />
        <Route path="/products/:id/edit" element={token ? <ProductEditor /> : <Navigate to="/login" replace />} />
        <Route path="/series" element={token ? <SeriesManager /> : <Navigate to="/login" replace />} />
        <Route path="/certificates" element={token ? <CertificatesManager /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </main>
    {!isLogin && <footer className="ac-footer"><span>Dou Yee · Product API</span><span>API v1 · Audit tracked</span></footer>}
  </div>;
}

const AdminApp: React.FC = () => <I18nProvider><BrowserRouter basename="/admin"><AdminShell /></BrowserRouter></I18nProvider>;
export default AdminApp;
