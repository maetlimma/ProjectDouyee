import React, { createContext, useContext, useState, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';

export type Language = 'en' | 'th';

// Translation database for UI elements
const translations = {
  // Navigation
  home: { en: 'Home', th: 'หน้าแรก' },
  products: { en: 'Products', th: 'ผลิตภัณฑ์' },
  aboutUs: { en: 'About Us', th: 'เกี่ยวกับเรา' },
  contactUs: { en: 'Contact Us', th: 'ติดต่อเรา' },
  adminPortal: { en: 'Admin Portal', th: 'พอร์ทัลผู้ดูแลระบบ' },
  login: { en: 'Login', th: 'เข้าสู่ระบบ' },
  logout: { en: 'Logout', th: 'ออกจากระบบ' },
  
  // Footer
  copyright: { en: '© 2026 Dou Yee Enterprises. All rights reserved.', th: '© 2026 Dou Yee Enterprises. สงวนลิขสิทธิ์ทั้งหมด' },
  
  // Home View
  heroTitle: { en: 'Total Industrial Solutions Provider', th: 'ผู้ให้บริการโซลูชั่นอุตสาหกรรมแบบครบวงจร' },
  heroSubtitle: { en: 'Serving Semiconductor, Electronics, Data Storage, and Biomedical fields since 1982.', th: 'ให้บริการในสาขาเซมิคอนดักเตอร์, อิเล็กทรอนิกส์, การจัดเก็บข้อมูล และชีวการแพทย์ ตั้งแต่ปี 1982' },
  viewCatalog: { en: 'Browse Product Catalog', th: 'เรียกดูรายการผลิตภัณฑ์' },
  coreBusiness: { en: 'Our Core Sectors', th: 'กลุ่มธุรกิจหลักของเรา' },
  smtTitle: { en: 'SMT Equipment & Robotics', th: 'อุปกรณ์ SMT และหุ่นยนต์ตั้งโต๊ะ' },
  smtDesc: { en: 'High-precision dispensers, tabletop robots, and automation tools by Musashi Engineering.', th: 'เครื่องหยอดกาวความแม่นยำสูง หุ่นยนต์ตั้งโต๊ะ และเครื่องมืออัตโนมัติ โดย Musashi Engineering' },
  esdTitle: { en: 'Static Control (ESD) Solutions', th: 'โซลูชันการควบคุมไฟฟ้าสถิต (ESD)' },
  esdDesc: { en: 'Ionizing blowers, shielding bags, grounding systems, apparel, and mats.', th: 'เครื่องเป่าลมไอออน ถุงป้องกันไฟฟ้าสถิต ระบบสายดิน เสื้อผ้า และแผ่นปูโต๊ะ' },
  cleanroomTitle: { en: 'Cleanroom Contamination Control', th: 'การควบคุมการปนเปื้อนในห้องคลีนรูม' },
  cleanroomDesc: { en: 'Premium wipers, gloves, face masks, sticky mats, and protective apparel.', th: 'กระดาษเช็ด ถุงมือ หน้ากากอนามัย แผ่นกาวดักฝุ่น และเสื้อผ้าคลีนรูมคุณภาพสูง' },
  packTitle: { en: 'Semiconductor Packaging Materials', th: 'วัสดุบรรจุภัณฑ์สารกึ่งตัวนำ' },
  packDesc: { en: 'Carrier tapes, cover tapes, and reels engineered for components safety.', th: 'เทปนำพา (Carrier Tapes) เทปปิด (Cover Tapes) และม้วนเทปที่ออกแบบเพื่อความปลอดภัยของอุปกรณ์' },
  
  // Products listing
  allCategories: { en: 'All Departments', th: 'แผนกผลิตภัณฑ์ทั้งหมด' },
  searchPlaceholder: { en: 'Search products by Model or Title...', th: 'ค้นหาผลิตภัณฑ์ด้วยรหัส Model หรือชื่อผลิตภัณฑ์...' },
  noProducts: { en: 'No active products found matching criteria.', th: 'ไม่พบผลิตภัณฑ์ที่ใช้งานอยู่ตรงตามเงื่อนไข' },
  sku: { en: 'Model', th: 'รุ่น (Model)' },
  viewDetails: { en: 'View Details', th: 'ดูรายละเอียด' },
  
  // Product Detail
  backToProducts: { en: '← Back to Catalog', th: '← กลับสู่รายการผลิตภัณฑ์' },
  downloads: { en: 'Technical PDF Sheets', th: 'เอกสารข้อมูลทางเทคนิค PDF' },
  downloadPdf: { en: 'Download Datasheet', th: 'ดาวน์โหลดเอกสารข้อมูล' },
  specifications: { en: 'Technical Specification Matrix', th: 'ตารางข้อมูลจำเพาะทางเทคนิค' },
  matrixProperty: { en: 'Technical Property Name', th: 'ชื่อคุณสมบัติทางเทคนิค' },
  matrixValue: { en: 'Data Value / Spectrum', th: 'ค่าข้อมูล / ข้อมูลสเปก' },
  
  // Contact Us
  getInTouch: { en: 'Get In Touch', th: 'ติดต่อเรา' },
  contactSubtitle: { en: 'Have inquiries? Drop us a message and our team will get back to you.', th: 'หากมีข้อสงสัย ส่งข้อความหาเรา และทีมงานของเราจะติดต่อกลับหาคุณ' },
  fullName: { en: 'Full Name', th: 'ชื่อ-นามสกุล' },
  emailAddress: { en: 'Email Address', th: 'ที่อยู่อีเมล' },
  message: { en: 'Message Content', th: 'ข้อความ' },
  submitMessage: { en: 'Send Inquiry Message', th: 'ส่งข้อความติดต่อ' },
  messageSuccess: { en: 'Thank you! Your message has been sent successfully.', th: 'ขอบคุณ! ข้อความของคุณถูกส่งเรียบร้อยแล้ว' }
};

interface I18nContextType {
  lang: Language;
  toggleLanguage: () => void;
  changeLanguage: (l: Language) => void;
  t: (key: keyof typeof translations) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('douyee_lang');
    return saved === 'th' ? 'th' : 'en';
  });

  const toggleLanguage = () => {
    setLang((prev) => {
      const next: Language = prev === 'en' ? 'th' : 'en';
      localStorage.setItem('douyee_lang', next);
      return next;
    });
  };

  const changeLanguage = (next: Language) => {
    setLang(next);
    localStorage.setItem('douyee_lang', next);
  };

  const t = (key: keyof typeof translations): string => {
    const translation = translations[key];
    if (!translation) return String(key);
    return translation[lang];
  };

  return (
    <I18nContext.Provider value={{ lang, toggleLanguage, changeLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Dropdown selector component mapping both languages (robust desktop-hover + mobile-click helper)
export const LanguageDropdown: React.FC = () => {
  const { lang, changeLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="lang-dropdown-container"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="lang-dropdown-trigger"
        title="Select Language"
      >
        <Globe size={18} />
      </button>

      {isOpen && (
        <div className="lang-dropdown-menu" style={{ display: 'flex' }}>
          <button 
            type="button" 
            onClick={() => { changeLanguage('en'); setIsOpen(false); }}
            className={`lang-dropdown-item ${lang === 'en' ? 'active' : ''}`}
          >
            <span>English</span>
            {lang === 'en' && <Check size={12} />}
          </button>
          <button 
            type="button" 
            onClick={() => { changeLanguage('th'); setIsOpen(false); }}
            className={`lang-dropdown-item ${lang === 'th' ? 'active' : ''}`}
          >
            <span>ไทย</span>
            {lang === 'th' && <Check size={12} />}
          </button>
        </div>
      )}
    </div>
  );
};
