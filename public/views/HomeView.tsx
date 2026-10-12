import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Shield, Zap, Sparkles, Cpu } from 'lucide-react';

const HomeView: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleCategoryClick = (category: string) => {
    navigate(`/products?category=${encodeURIComponent(category)}`);
  };

  return (
    <div className="container" style={{ paddingBottom: '3.5rem' }}>
      {/* Hero Section */}
      <section className="hero-slider">
        <h2>{t('heroTitle')}</h2>
        <p>{t('heroSubtitle')}</p>
        <button 
          onClick={() => navigate('/products')} 
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.75rem', fontSize: '1rem', borderRadius: '9999px' }}
        >
          {t('viewCatalog')}
        </button>
      </section>

      {/* Core Sectors */}
      <section style={{ marginTop: '3.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '2rem' }}>
          {t('coreBusiness')}
        </h3>
        
        <div className="category-grid">
          <div className="category-card" onClick={() => handleCategoryClick('SMT Equipment')}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
              <Cpu size={32} />
            </div>
            <h4 className="category-title">{t('smtTitle')}</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('smtDesc')}
            </p>
          </div>

          <div className="category-card" onClick={() => handleCategoryClick('Static Control')}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
              <Zap size={32} />
            </div>
            <h4 className="category-title">{t('esdTitle')}</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('esdDesc')}
            </p>
          </div>

          <div className="category-card" onClick={() => handleCategoryClick('Cleanroom Consumables')}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
              <Sparkles size={32} />
            </div>
            <h4 className="category-title">{t('cleanroomTitle')}</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('cleanroomDesc')}
            </p>
          </div>

          <div className="category-card" onClick={() => handleCategoryClick('Packaging')}>
            <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
              <Shield size={32} />
            </div>
            <h4 className="category-title">{t('packTitle')}</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {t('packDesc')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomeView;
