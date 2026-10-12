import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Save, Plus, Trash2, ArrowLeft, Layers, Search, Sparkles, FolderPlus, Globe2 } from 'lucide-react';

interface MultilingualText {
  en: string;
  zh: string;
  th: string;
}

interface TaxonomySubCategory {
  id: string;
  name: MultilingualText;
}

interface TaxonomySector {
  id: string;
  name: MultilingualText;
  subCategories: TaxonomySubCategory[];
}

const AdminSettingsView: React.FC = () => {
  const { lang, t } = useI18n();
  const navigate = useNavigate();

  // State
  const [sectors, setSectors] = useState<TaxonomySector[]>([]);
  const [activeSectorId, setActiveSectorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New subcategory inline input states
  const [newSubEn, setNewSubEn] = useState('');
  const [newSubZh, setNewSubZh] = useState('');
  const [newSubTh, setNewSubTh] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem('douyee_admin_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchTaxonomy = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/taxonomy');
      if (res.ok) {
        const data = await res.json();
        setSectors(data);
        if (data.length > 0) {
          setActiveSectorId(data[0].id);
        }
      } else {
        throw new Error('Failed to load taxonomy configurations');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('douyee_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchTaxonomy();
  }, [navigate]);

  // Create a brand new Primary Sector locally
  const handleCreateSector = () => {
    const newSector: TaxonomySector = {
      id: `sector-${Date.now()}`,
      name: { 
        en: 'New Sector Division', 
        zh: '新主板块', 
        th: 'หมวดหมู่หลักใหม่' 
      },
      subCategories: []
    };
    setSectors(prev => [...prev, newSector]);
    setActiveSectorId(newSector.id);
  };

  // Delete active Primary Sector locally
  const handleDeleteActiveSector = () => {
    if (!activeSectorId) return;
    const confirm = window.confirm(
      lang === 'en' 
        ? 'Are you sure you want to delete this sector and all its nested subcategories?' 
        : lang === 'zh' ? '确定要删除此板块及其所有子分类吗？' : 'คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้และหมวดหมู่ย่อยทั้งหมด?'
    );
    if (!confirm) return;
    
    const nextSectors = sectors.filter(s => s.id !== activeSectorId);
    setSectors(nextSectors);
    if (nextSectors.length > 0) {
      setActiveSectorId(nextSectors[0].id);
    } else {
      setActiveSectorId(null);
    }
  };

  // Add new Sub-Category locally to active sector
  const handleAddSubCategory = () => {
    if (!activeSectorId) return;
    if (!newSubEn.trim() || !newSubZh.trim() || !newSubTh.trim()) {
      alert(
        lang === 'en' 
          ? 'Please enter the sub-category name in English, Chinese, and Thai!' 
          : lang === 'zh' ? '请填写所有语言的子分类名称！' : 'กรุณากรอกชื่อหมวดหมู่ย่อยให้ครบทุกภาษา!'
      );
      return;
    }

    const newSub: TaxonomySubCategory = {
      id: `sub-${Date.now()}`,
      name: { 
        en: newSubEn.trim(), 
        zh: newSubZh.trim(), 
        th: newSubTh.trim() 
      }
    };

    setSectors(prev => prev.map(s => {
      if (s.id === activeSectorId) {
        return {
          ...s,
          subCategories: [...s.subCategories, newSub]
        };
      }
      return s;
    }));

    // Reset inputs
    setNewSubEn('');
    setNewSubZh('');
    setNewSubTh('');
  };

  // Remove a subcategory locally
  const handleRemoveSubCategory = (subId: string) => {
    if (!activeSectorId) return;
    setSectors(prev => prev.map(s => {
      if (s.id === activeSectorId) {
        return {
          ...s,
          subCategories: s.subCategories.filter(sub => sub.id !== subId)
        };
      }
      return s;
    }));
  };

  // Update Sector Name Translations locally
  const updateSectorName = (field: 'en' | 'zh' | 'th', value: string) => {
    if (!activeSectorId) return;
    setSectors(prev => prev.map(s => {
      if (s.id === activeSectorId) {
        return {
          ...s,
          name: { ...s.name, [field]: value }
        };
      }
      return s;
    }));
  };

  // Update existing subcategory translations locally
  const updateSubCategoryName = (subId: string, field: 'en' | 'zh' | 'th', value: string) => {
    if (!activeSectorId) return;
    setSectors(prev => prev.map(s => {
      if (s.id === activeSectorId) {
        return {
          ...s,
          subCategories: s.subCategories.map(sub => {
            if (sub.id === subId) {
              return {
                ...sub,
                name: { ...sub.name, [field]: value }
              };
            }
            return sub;
          })
        };
      }
      return s;
    }));
  };

  // Sync entire local draft configurations back to server database
  const handleSaveTaxonomy = async () => {
    try {
      const res = await fetch('/api/admin/taxonomy', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(sectors)
      });
      if (res.ok) {
        alert(
          lang === 'en' 
            ? 'Category configurations synchronized successfully!' 
            : lang === 'zh' ? '分类架构同步成功！' : 'บันทึกหมวดหมู่เรียบร้อยแล้ว!'
        );
      } else {
        alert('Failed to synchronize category settings.');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating categories taxonomy.');
    }
  };

  const activeSector = sectors.find(s => s.id === activeSectorId);

  // Filter sectors list by search query
  const filteredSectors = sectors.filter(s => 
    s.name.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.zh.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.th.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container" style={{ paddingBottom: '5rem' }}>
      {/* Top Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <div>
          <nav className="breadcrumbs-nav" style={{ paddingBottom: '0.5rem' }}>
            <Link to="/dashboard" className="breadcrumbs-link">
              {lang === 'en' ? 'Admin' : lang === 'zh' ? '\u7ba1\u7406\u540e\u53f0' : '\u0e41\u0e2d\u0e14\u0e21\u0e34\u0e19'}
            </Link>
            <span className="breadcrumbs-sep">&gt;</span>
            <span className="breadcrumbs-current">
              {lang === 'en' ? 'Category Settings' : lang === 'zh' ? '\u5206\u7c7b\u8bbe\u7f6e' : '\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e2b\u0e21\u0e27\u0e14\u0e2b\u0e21\u0e39\u0e48'}
            </span>
          </nav>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={24} style={{ color: 'var(--primary)' }} />
            {lang === 'en' ? 'Category Settings' : lang === 'zh' ? '产品分类设置' : 'ตั้งค่าหมวดหมู่และหมวดหมู่ย่อย'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {lang === 'en'
              ? 'Configure Primary Sectors and child Sub-Categories without tab-switching.'
              : lang === 'zh' ? '在此一页式配置主分类部门与子分类，无需反复切换语言标签。' : 'จัดการข้อมูลแปลหมวดหมู่และหมวดหมู่ย่อยได้ง่ายในที่เดียว'}
          </p>
        </div>

        {/* Global Save Action */}
        <button 
          onClick={handleSaveTaxonomy} 
          className="btn btn-primary"
          style={{ height: 'fit-content' }}
        >
          <Save size={16} />
          {lang === 'en' ? 'Save Configurations' : lang === 'zh' ? '保存分类配置' : 'บันทึกการตั้งค่าทั้งหมด'}
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>
          {lang === 'en' ? 'Loading categories...' : '加载分类中...'}
        </div>
      ) : (
        /* Redesigned 2-Column Split Settings Panel */
        <div className="split-settings-grid">
          
          {/* Left Column: Sectors List Sidebar */}
          <div className="workspace-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Sectors List
            </h3>
            
            {/* Search filter input */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                <Search size={14} />
              </span>
              <input 
                type="text" 
                placeholder="Filter sectors..." 
                className="form-input" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.2rem', paddingTop: '0.4rem', paddingBottom: '0.4rem', fontSize: '0.8rem' }}
              />
            </div>

            {/* List items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {filteredSectors.map(sector => (
                <button
                  key={sector.id}
                  onClick={() => setActiveSectorId(sector.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: sector.id === activeSectorId ? 'var(--primary)' : 'var(--border-color)',
                    backgroundColor: sector.id === activeSectorId ? 'var(--primary-light)' : 'white',
                    color: sector.id === activeSectorId ? 'var(--primary-dark)' : 'var(--text-main)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: sector.id === activeSectorId ? 700 : 500,
                    transition: 'all 0.1s ease'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                    {sector.name[lang] || sector.name.en}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    backgroundColor: sector.id === activeSectorId ? 'white' : '#f1f5f9',
                    color: sector.id === activeSectorId ? 'var(--primary-dark)' : 'var(--text-muted)',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '9999px',
                    fontWeight: 600
                  }}>
                    {sector.subCategories.length}
                  </span>
                </button>
              ))}

              {filteredSectors.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                  No matches found
                </div>
              )}
            </div>

            {/* Create Sector trigger */}
            <button
              onClick={handleCreateSector}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', borderStyle: 'dashed', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 700 }}
            >
              <Plus size={14} /> Add New Sector
            </button>
          </div>

          {/* Right Column: Editor Workspace */}
          {activeSector ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Card 1: Sector Translation Names */}
              <div className="workspace-panel">
                <h3 className="workspace-section-title" style={{ color: 'var(--primary)', borderBottomColor: 'var(--primary-light)' }}>
                  1. Primary Sector Translations
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Globe2 size={12} style={{ color: 'var(--text-muted)' }} /> English
                      </label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={activeSector.name.en} 
                        onChange={(e) => updateSectorName('en', e.target.value)}
                        placeholder="English sector name"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Globe2 size={12} style={{ color: 'var(--text-muted)' }} /> 中文 (Chinese)
                      </label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={activeSector.name.zh} 
                        onChange={(e) => updateSectorName('zh', e.target.value)}
                        placeholder="Chinese name"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Globe2 size={12} style={{ color: 'var(--text-muted)' }} /> ไทย (Thai)
                      </label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={activeSector.name.th} 
                        onChange={(e) => updateSectorName('th', e.target.value)}
                        placeholder="Thai name"
                      />
                    </div>
                  </div>
                  
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Sector ID: {activeSector.id}
                  </span>
                </div>
              </div>

              {/* Card 2: Nested Sub-Categories Grid Editor */}
              <div className="workspace-panel">
                <h3 className="workspace-section-title">
                  2. Sub-Category List & Translations
                </h3>

                {/* Categories Table/List */}
                {activeSector.subCategories.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'var(--light-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', margin: '1rem 0', color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                    No sub-categories defined under this sector yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.25rem 0' }}>
                    {activeSector.subCategories.map((sub, idx) => (
                      <div 
                        key={sub.id} 
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '25px repeat(3, 1fr) 40px',
                          gap: '0.75rem',
                          alignItems: 'center',
                          backgroundColor: '#f8fafc',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {/* Index Indicator */}
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {idx + 1}.
                        </span>

                        {/* English translation input */}
                        <div>
                          <input 
                            type="text" 
                            className="form-input"
                            value={sub.name.en}
                            onChange={(e) => updateSubCategoryName(sub.id, 'en', e.target.value)}
                            placeholder="Sub-Category (EN)"
                            style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                          />
                        </div>

                        {/* Chinese translation input */}
                        <div>
                          <input 
                            type="text" 
                            className="form-input"
                            value={sub.name.zh}
                            onChange={(e) => updateSubCategoryName(sub.id, 'zh', e.target.value)}
                            placeholder="子类别 (ZH)"
                            style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                          />
                        </div>

                        {/* Thai translation input */}
                        <div>
                          <input 
                            type="text" 
                            className="form-input"
                            value={sub.name.th}
                            onChange={(e) => updateSubCategoryName(sub.id, 'th', e.target.value)}
                            placeholder="หมวดหมู่ย่อย (TH)"
                            style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                          />
                        </div>

                        {/* Remove Action */}
                        <button
                          type="button"
                          onClick={() => handleRemoveSubCategory(sub.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.4rem', color: '#ef4444', height: '100%', borderColor: 'transparent', backgroundColor: 'transparent' }}
                          title="Delete Subcategory"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Card footer: Quick append sub-category row */}
                <div style={{ backgroundColor: 'var(--light-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FolderPlus size={14} style={{ color: 'var(--primary)' }} />
                    Add New Sub-Category Row
                  </span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) 100px', gap: '0.75rem', alignItems: 'end' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem' }}>English Name</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="e.g. Shielding Bags"
                        value={newSubEn}
                        onChange={(e) => setNewSubEn(e.target.value)}
                        style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem' }}>中文名称 (Chinese)</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="例如 防静电屏蔽袋"
                        value={newSubZh}
                        onChange={(e) => setNewSubZh(e.target.value)}
                        style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem' }}>ชื่อภาษาไทย (Thai)</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="เช่น ถุงป้องกันไฟฟ้าสถิต"
                        value={newSubTh}
                        onChange={(e) => setNewSubTh(e.target.value)}
                        style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}
                      />
                    </div>
                    <button 
                      onClick={handleAddSubCategory}
                      className="btn btn-primary"
                      style={{ height: '32px', fontSize: '0.75rem', width: '100%', fontWeight: 700 }}
                    >
                      <Plus size={12} /> Add Row
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: Danger Zone Sector Removal */}
              <div className="workspace-panel" style={{ borderColor: '#fecaca', backgroundColor: '#fff5f5' }}>
                <h3 className="workspace-section-title" style={{ color: '#dc2626', borderBottomColor: '#fee2e2' }}>
                  Danger Zone
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#991b1b', display: 'block' }}>
                      Delete Sector Division
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#c53030' }}>
                      This action will erase this sector and all its linked sub-categories. Ensure no products use this sector.
                    </span>
                  </div>
                  <button
                    onClick={handleDeleteActiveSector}
                    className="btn btn-danger"
                    style={{ fontWeight: 700 }}
                  >
                    <Trash2 size={16} /> Delete Sector
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* Blank state editor illustration */
            <div className="workspace-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', textAlign: 'center', gap: '1rem' }}>
              <Layers size={48} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                No active sector selected
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '300px' }}>
                Click on a Primary Sector in the left sidebar to manage translations and configure child product lines.
              </p>
              <button 
                onClick={handleCreateSector}
                className="btn btn-primary"
                style={{ marginTop: '0.5rem' }}
              >
                <Plus size={16} /> Create Sector Division
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default AdminSettingsView;
