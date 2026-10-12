import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from './i18n';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

// Reusable breadcrumbs navigation trail
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const { lang } = useI18n();
  const homeLabel = lang === 'en' ? 'Home' : lang === 'zh' ? '首页' : 'หน้าหลัก';

  return (
    <nav className="breadcrumbs-nav">
      <Link to="/" className="breadcrumbs-link">{homeLabel}</Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <span className="breadcrumbs-sep">&gt;</span>
          {item.to ? (
            <Link to={item.to} className="breadcrumbs-link">{item.label}</Link>
          ) : (
            <span className="breadcrumbs-current">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
