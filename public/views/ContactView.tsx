import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Mail, Phone, MapPin } from 'lucide-react';
import Breadcrumbs from '../Breadcrumbs';

const ContactView: React.FC = () => {
  const { lang, t } = useI18n();
  const [searchParams] = useSearchParams();
  const skuQuery = searchParams.get('sku');
  const productQuery = searchParams.get('product');

  const [formData, setFormData] = useState(() => {
    let initMessage = '';
    if (skuQuery && productQuery) {
      initMessage = lang === 'en' 
        ? `Hello, I would like to inquire about: ${productQuery} (SKU: ${skuQuery}). Please send me more specifications and pricing.`
        : lang === 'zh'
        ? `您好，我想咨询该产品: ${productQuery} (SKU: ${skuQuery})。请向我发送更多规格和报价。`
        : `สวัสดีครับ ผมต้องการสอบถามข้อมูลสินค้า: ${productQuery} (รหัส SKU: ${skuQuery}) ขอรายละเอียดและใบเสนอราคาด้วยครับ`;
    }
    return { name: '', email: '', message: initMessage };
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.message) {
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <Breadcrumbs items={[
        { label: lang === 'en' ? 'Contact Us' : lang === 'zh' ? '联系我们' : 'ติดต่อเรา' }
      ]} />
      <div className="detail-header" style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t('getInTouch')}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {t('contactSubtitle')}
        </p>
      </div>

      <div className="workspace-grid" style={{ gap: '3rem' }}>
        {/* Contact Form */}
        <div className="card">
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ color: '#10b981', fontSize: '3rem', marginBottom: '1rem' }}>
                ✓
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {lang === 'en' ? 'Message Received!' : '留言已收到!'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('messageSuccess')}</p>
              <button 
                onClick={() => setSubmitted(false)} 
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '1.5rem' }}
              >
                {lang === 'en' ? 'Submit Another Message' : '提交另一个留言'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">{t('fullName')}</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('emailAddress')}</label>
                <input 
                  type="email" 
                  className="form-input" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('message')}</label>
                <textarea 
                  className="form-input" 
                  rows={5}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {t('submitMessage')}
              </button>
            </form>
          )}
        </div>

        {/* Corporate Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
              {lang === 'en' ? 'Headquarters' : '总部'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <MapPin size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span>
                  <strong>Dou Yee Enterprises (S) Pte Ltd</strong><br />
                  2304 Bedok Reservoir Road, Singapore 479223
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Phone size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span>+65 6444 2678</span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Mail size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span>s1@douyee.com.sg</span>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
              {lang === 'en' ? 'Global Offices' : '全球办事处'}
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {lang === 'en'
                ? 'We have manufacturing facilities and branches located across Singapore, Malaysia, China, France, and other key countries.'
                : '我们在新加坡、马来西亚、中国、法国和其他主要国家设有生产基地和分支机构。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactView;
