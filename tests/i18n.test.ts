import { describe, expect, it } from 'bun:test';

// Simple mock translation database for tests
const translations = {
  home: { en: 'Home', zh: '首页', th: 'หน้าแรก' },
  products: { en: 'Products', zh: '产品中心', th: 'ผลิตภัณฑ์' }
};

function translate(key: keyof typeof translations, lang: 'en' | 'zh' | 'th'): string {
  return translations[key]?.[lang] || String(key);
}

describe('Frontend i18n Translations Utility Tests', () => {
  it('translates menu items to English correctly', () => {
    expect(translate('home', 'en')).toBe('Home');
    expect(translate('products', 'en')).toBe('Products');
  });

  it('translates menu items to Chinese correctly', () => {
    expect(translate('home', 'zh')).toBe('首页');
    expect(translate('products', 'zh')).toBe('产品中心');
  });

  it('translates menu items to Thai correctly', () => {
    expect(translate('home', 'th')).toBe('หน้าแรก');
    expect(translate('products', 'th')).toBe('ผลิตภัณฑ์');
  });

  it('gracefully handles missing keys by returning the key name', () => {
    // @ts-ignore
    expect(translate('missing_key', 'en')).toBe('missing_key');
  });
});
