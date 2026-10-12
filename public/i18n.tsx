import React, { createContext, useContext, useState, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';

export type Language = 'en' | 'zh' | 'th';

// Translation database for UI elements
const translations = {
  // Navigation
  home: { en: 'Home', zh: '首页', th: 'หน้าแรก' },
  products: { en: 'Products', zh: '产品中心', th: 'ผลิตภัณฑ์' },
  aboutUs: { en: 'About Us', zh: '关于我们', th: 'เกี่ยวกับเรา' },
  contactUs: { en: 'Contact Us', zh: '联系我们', th: 'ติดต่อเรา' },
  adminPortal: { en: 'Admin Portal', zh: '管理后台', th: 'พอร์ทัลผู้ดูแลระบบ' },
  login: { en: 'Login', zh: '登录', th: 'เข้าสู่ระบบ' },
  logout: { en: 'Logout', zh: '退出登录', th: 'ออกจากระบบ' },
  
  // Footer
  copyright: { en: '© 2026 Dou Yee Enterprises. All rights reserved.', zh: '© 2026 都宜企业。版权所有。', th: '© 2026 Dou Yee Enterprises. สงวนลิขสิทธิ์ทั้งหมด' },
  
  // Home View
  heroTitle: { en: 'Total Industrial Solutions Provider', zh: '全方位工业解决方案提供商', th: 'ผู้ให้บริการโซลูชั่นอุตสาหกรรมแบบครบวงจร' },
  heroSubtitle: { en: 'Serving Semiconductor, Electronics, Data Storage, and Biomedical fields since 1982.', zh: '自 1982 年起，为半导体、电子、数据存储 and 生物医药领域服务。', th: 'ให้บริการในสาขาเซมิคอนดักเตอร์, อิเล็กทรอนิกส์, การจัดเก็บข้อมูล และชีวการแพทย์ ตั้งแต่ปี 1982' },
  viewCatalog: { en: 'Browse Product Catalog', zh: '浏览产品目录', th: 'เรียกดูรายการผลิตภัณฑ์' },
  coreBusiness: { en: 'Our Core Sectors', zh: '我们的核心板块', th: 'กลุ่มธุรกิจหลักของเรา' },
  smtTitle: { en: 'SMT Equipment & Robotics', zh: 'SMT设备与机械手臂', th: 'อุปกรณ์ SMT และหุ่นยนต์ตั้งโต๊ะ' },
  smtDesc: { en: 'High-precision dispensers, tabletop robots, and automation tools by Musashi Engineering.', zh: '武藏工程的高精度点胶机、桌面型机器人和自动化工具。', th: 'เครื่องหยอดกาวความแม่นยำสูง หุ่นยนต์ตั้งโต๊ะ และเครื่องมืออัตโนมัติ โดย Musashi Engineering' },
  esdTitle: { en: 'Static Control (ESD) Solutions', zh: '静电防护 (ESD) 解决方案', th: 'โซลูชันการควบคุมไฟฟ้าสถิต (ESD)' },
  esdDesc: { en: 'Ionizing blowers, shielding bags, grounding systems, apparel, and mats.', zh: '离子风机、防静电屏蔽袋、接地系统、防静电服与防静电台垫。', th: 'เครื่องเป่าลมไอออน ถุงป้องกันไฟฟ้าสถิต ระบบสายดิน เสื้อผ้า และแผ่นปูโต๊ะ' },
  cleanroomTitle: { en: 'Cleanroom Contamination Control', zh: '洁净室微污染控制', th: 'การควบคุมการปนเปื้อนในห้องคลีนรูม' },
  cleanroomDesc: { en: 'Premium wipers, gloves, face masks, sticky mats, and protective apparel.', zh: '高品质洁净无尘擦拭纸、手套、口罩、粘尘垫及防静电洁净服。', th: 'กระดาษเช็ด ถุงมือ หน้ากากอนามัย แผ่นกาวดักฝุ่น และเสื้อผ้าคลีนรูมคุณภาพสูง' },
  packTitle: { en: 'Semiconductor Packaging Materials', zh: '半导体包装材料', th: 'วัสดุบรรจุภัณฑ์สารกึ่งตัวนำ' },
  packDesc: { en: 'Carrier tapes, cover tapes, and reels engineered for components safety.', zh: '专为元器件安全设计的载带、盖带和卷盘。', th: 'เทปนำพา (Carrier Tapes) เทปปิด (Cover Tapes) และม้วนเทปที่ออกแบบเพื่อความปลอดภัยของอุปกรณ์' },
  
  // Products listing
  allCategories: { en: 'All Departments', zh: '所有部门', th: 'แผนกผลิตภัณฑ์ทั้งหมด' },
  searchPlaceholder: { en: 'Search products by SKU or Title...', zh: '通过型号或名称搜索产品...', th: 'ค้นหาผลิตภัณฑ์ด้วยรหัส SKU หรือชื่อผลิตภัณฑ์...' },
  noProducts: { en: 'No active products found matching criteria.', zh: '没有找到符合条件的产品。', th: 'ไม่พบผลิตภัณฑ์ที่ใช้งานอยู่ตรงตามเงื่อนไข' },
  sku: { en: 'SKU', zh: '型号', th: 'รหัสรุ่น (SKU)' },
  viewDetails: { en: 'View Details', zh: '查看详情', th: 'ดูรายละเอียด' },
  
  // Product Detail
  backToProducts: { en: '← Back to Catalog', zh: '← 返回产品目录', th: '← กลับสู่รายการผลิตภัณฑ์' },
  downloads: { en: 'Technical PDF Sheets', zh: '技术PDF文档', th: 'เอกสารข้อมูลทางเทคนิค PDF' },
  downloadPdf: { en: 'Download Datasheet', zh: '下载数据单', th: 'ดาวน์โหลดเอกสารข้อมูล' },
  specifications: { en: 'Technical Specification Matrix', zh: '技术参数规格表', th: 'ตารางข้อมูลจำเพาะทางเทคนิค' },
  matrixProperty: { en: 'Technical Property Name', zh: '技术属性名称', th: 'ชื่อคุณสมบัติทางเทคนิค' },
  matrixValue: { en: 'Data Value / Spectrum', zh: '数据数值 / 范围', th: 'ค่าข้อมูล / ข้อมูลสเปก' },
  
  // Contact Us
  getInTouch: { en: 'Get In Touch', zh: '联系เรา', th: 'ติดต่อเรา' },
  contactSubtitle: { en: 'Have inquiries? Drop us a message and our team will get back to you.', zh: '有任何疑问？请给我们留言，我们的团队会尽快与您联系。', th: 'หากมีข้อสงสัย ส่งข้อความหาเรา และทีมงานของเราจะติดต่อกลับหาคุณ' },
  fullName: { en: 'Full Name', zh: '姓名', th: 'ชื่อ-นามสกุล' },
  emailAddress: { en: 'Email Address', zh: '电子邮件', th: 'ที่อยู่อีเมล' },
  message: { en: 'Message Content', zh: '留言内容', th: 'ข้อความ' },
  submitMessage: { en: 'Send Inquiry Message', zh: '发送咨询留言', th: 'ส่งข้อความติดต่อ' },
  messageSuccess: { en: 'Thank you! Your message has been sent successfully.', zh: '谢谢！您的留言已成功发送。', th: 'ขอบคุณ! ข้อความของคุณถูกส่งเรียบร้อยแล้ว' }
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
    return (saved === 'zh' ? 'zh' : saved === 'th' ? 'th' : 'en') as Language;
  });

  const toggleLanguage = () => {
    setLang((prev) => {
      const next = prev === 'en' ? 'zh' : prev === 'zh' ? 'th' : 'en';
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

// Dropdown selector component mapping all three languages (robust desktop-hover + mobile-click helper)
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
            onClick={() => { changeLanguage('zh'); setIsOpen(false); }}
            className={`lang-dropdown-item ${lang === 'zh' ? 'active' : ''}`}
          >
            <span>中文</span>
            {lang === 'zh' && <Check size={12} />}
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
