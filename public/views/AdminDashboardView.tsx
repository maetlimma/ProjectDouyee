import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { ShieldCheck, Plus, FileEdit, Trash2, Search, Power, Calendar } from 'lucide-react';

interface Product {
  id: string;
  title: { en: string; zh: string };
  sku: string;
  department: 'Static Control' | 'Cleanroom Consumables' | 'SMT Equipment' | 'Packaging';
  subCategory: { en: string; zh: string };
  status: 'enabled' | 'disabled';
  publishAt?: string;
  expireAt?: string;
  createdAt: string;
}

const AdminDashboardView: React.FC = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = () => {
    const token = localStorage.getItem('douyee_admin_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products', {
        headers: getHeaders()
      });
      if (res.status === 401) {
        // Redirect to login on invalid session
        localStorage.removeItem('douyee_admin_token');
        navigate('/login');
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to load corporate catalog products ledger.');
      }
      const data = await res.json();
      setProducts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [navigate]);

  useEffect(() => {
    let result = products;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p => p.sku.toLowerCase().includes(q) ||
             p.title.en.toLowerCase().includes(q) ||
             p.title.zh.toLowerCase().includes(q)
      );
    }
    setFilteredProducts(result);
  }, [products, searchQuery]);

  // Handle quick visibility status toggle
  const handleToggleStatus = async (product: Product) => {
    const nextStatus = product.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          title: product.title,
          sku: product.sku,
          department: product.department,
          subCategory: product.subCategory,
          status: nextStatus,
          publishAt: product.publishAt || null,
          expireAt: product.expireAt || null,
          imagePaths: [], // Handled by backend PUT logic merging parameters or keeping existing if empty
          pdfPaths: [],
          contentBlocks: [], // backend matches existing blocks if empty arrays are supplied or keeps details
          technicalMatrix: []
        })
      });
      if (res.ok) {
        fetchProducts(); // reload product list
      } else {
        console.error('Failed to toggle visibility status');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async (id: string) => {
    const confirm = window.confirm(
      lang === 'en' 
        ? 'Are you absolutely sure you want to delete this product? This action is permanent!' 
        : '您确定要删除此产品吗？此操作不可逆！'
    );
    if (!confirm) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        alert('Failed to delete product.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Check visibility timing of a product
  const getProductStatusType = (product: Product): 'active' | 'disabled' | 'scheduled' => {
    if (product.status === 'disabled') {
      return 'disabled';
    }
    const now = new Date();
    if (product.publishAt && new Date(product.publishAt) > now) {
      return 'scheduled';
    }
    if (product.expireAt && new Date(product.expireAt) < now) {
      return 'scheduled';
    }
    return 'active';
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <nav className="breadcrumbs-nav">
        <Link to="/dashboard" className="breadcrumbs-link">
          {lang === 'en' ? 'Admin' : lang === 'zh' ? '\u7ba1\u7406\u540e\u53f0' : '\u0e41\u0e2d\u0e14\u0e21\u0e34\u0e19'}
        </Link>
        <span className="breadcrumbs-sep">&gt;</span>
        <span className="breadcrumbs-current">
          {lang === 'en' ? 'Products' : lang === 'zh' ? '产品' : 'สินค้า'}
        </span>
      </nav>
      <div className="admin-header">
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={28} style={{ color: 'var(--primary)' }} />
            {lang === 'en' ? 'Products Management' : '产品管理'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {lang === 'en' 
              ? 'Manage products catalog visibility, timing schedules, descriptions, and dynamic data matrices.'
              : '管理产品目录的可见性、定时排程、描述以及动态数据矩阵。'}
          </p>
        </div>

        <button 
          onClick={() => navigate('/workspace')}
          className="btn btn-primary"
        >
          <Plus size={16} />
          {lang === 'en' ? 'Add New Product' : '添加新产品'}
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Products Table search and details layout */}
      <div className="admin-layout" style={{ marginTop: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder={lang === 'en' ? 'Filter products by SKU, English, or Chinese titles...' : '通过型号、英文或中文名称过滤产品...'}
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            {lang === 'en' ? 'Fetching products...' : '调取产品中...'}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            {lang === 'en' ? 'No products registered.' : '未登记任何产品。'}
          </div>
        ) : (
          <div className="ledger-table-wrapper">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>{lang === 'en' ? 'Product Detail' : '产品详情'}</th>
                  <th style={{ width: '15%' }}>{lang === 'en' ? 'SKU Code' : '型号'}</th>
                  <th style={{ width: '20%' }}>{lang === 'en' ? 'Sector Department' : '所属部门'}</th>
                  <th style={{ width: '15%' }}>{lang === 'en' ? 'Visibility Status' : '状态'}</th>
                  <th style={{ width: '15%' }}>{lang === 'en' ? 'Actions' : '操作'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const statusType = getProductStatusType(p);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-main)' }}>{p.title[lang]}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.subCategory[lang]}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem' }}>{p.sku}</td>
                      <td>
                        <span style={{ fontSize: '0.825rem' }}>{p.department}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {statusType === 'active' && (
                            <span className="status-badge status-active">Active</span>
                          )}
                          {statusType === 'disabled' && (
                            <span className="status-badge status-disabled">Disabled</span>
                          )}
                          {statusType === 'scheduled' && (
                            <span className="status-badge status-scheduled">Scheduled</span>
                          )}
                          {(p.publishAt || p.expireAt) && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                              <Calendar size={10} /> Timer Set
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="ledger-actions">
                          <button 
                            onClick={() => handleToggleStatus(p)}
                            className="btn btn-secondary btn-sm"
                            title={p.status === 'enabled' ? 'Disable catalog item' : 'Enable catalog item'}
                            style={{ padding: '0.35rem 0.5rem' }}
                          >
                            <Power size={12} style={{ color: p.status === 'enabled' ? '#ef4444' : '#10b981' }} />
                          </button>
                          
                          <button 
                            onClick={() => navigate(`/workspace?id=${p.id}`)}
                            className="btn btn-secondary btn-sm"
                            title="Edit workspace"
                            style={{ padding: '0.35rem 0.5rem' }}
                          >
                            <FileEdit size={12} style={{ color: 'var(--primary)' }} />
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteProduct(p.id)}
                            className="btn btn-secondary btn-sm"
                            title="Delete permanently"
                            style={{ padding: '0.35rem 0.5rem' }}
                          >
                            <Trash2 size={12} style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardView;
