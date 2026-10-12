import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
import { I18nProvider, useI18n, LanguageDropdown } from './i18n';
import LoginView from './views/LoginView';
import AdminDashboardView from './views/AdminDashboardView';
import AdminWorkspaceView from './views/AdminWorkspaceView';
import AdminSettingsView from './views/AdminSettingsView';
import { ShieldCheck, LogOut, Settings, ListCollapse } from 'lucide-react';

const AdminHeader: React.FC = () => {
  const { lang, toggleLanguage } = useI18n();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('douyee_admin_token');
      if (!token) {
        setAdminEmail(null);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAdminEmail(data.email);
        } else {
          localStorage.removeItem('douyee_admin_token');
          setAdminEmail(null);
        }
      } catch (e) {
        setAdminEmail(null);
      }
    };
    checkUser();
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('douyee_admin_token');
    window.location.href = '/admin/login';
  };

  return (
    <header className="header-bar" style={{ borderBottom: '2px solid var(--primary)' }}>
      <Link to="/dashboard" className="header-brand">
        <div className="logo-badge" style={{ backgroundColor: '#10b981' }}>ADM</div>
        <div className="brand-text">
          <h1>{lang === 'en' ? 'Dou Yee Admin' : lang === 'zh' ? '都宜管理后台' : 'การจัดการ Dou Yee'}</h1>
          <p>{lang === 'en' ? 'Secured Portal' : lang === 'zh' ? '安全受保护的控制台' : 'พอร์ทัลที่ปลอดภัย'}</p>
        </div>
      </Link>

      {adminEmail && (
        <nav className="header-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <ListCollapse size={14} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            {lang === 'en' ? 'Products' : lang === 'zh' ? '产品' : 'สินค้า'}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Settings size={14} style={{ display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
            {lang === 'en' ? 'Categories' : lang === 'zh' ? '分类' : 'หมวดหมู่'}
          </NavLink>
        </nav>
      )}

      <div className="header-actions">
        <LanguageDropdown />

        {adminEmail ? (
          <div className="admin-mode-badge" style={{ border: '1px solid #10b981' }}>
            <ShieldCheck size={14} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{adminEmail}</span>
            <button 
              onClick={handleLogout} 
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', marginLeft: '0.25rem' }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="admin-mode-badge">
            <span style={{ fontSize: '0.75rem' }}>Login Required</span>
          </div>
        )}
      </div>
    </header>
  );
};

const AdminApp: React.FC = () => {
  return (
    <I18nProvider>
      <BrowserRouter basename="/admin">
        <AdminHeader />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<LoginView />} />
            <Route path="/login" element={<LoginView />} />
            <Route path="/dashboard" element={<AdminDashboardView />} />
            <Route path="/workspace" element={<AdminWorkspaceView />} />
            <Route path="/settings" element={<AdminSettingsView />} />
          </Routes>
        </main>
        <footer className="footer" style={{ borderTop: '1px solid var(--dark-border)' }}>
          <div>
            <span>Dou Yee Administrative Systems • Port 3000 • Secured Session</span>
          </div>
        </footer>
      </BrowserRouter>
    </I18nProvider>
  );
};

export default AdminApp;
