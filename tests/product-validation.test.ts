import { describe, expect, it } from 'bun:test';
import { parseProductInput } from '../src/services/product-validation';

describe('product input validation', () => {
  it('requires SKU, product name, and series', () => {
    expect(() => parseProductInput({})).toThrow('sku is required');
    expect(() => parseProductInput({ sku: 'A' })).toThrow('product_name is required');
    expect(() => parseProductInput({ sku: 'A', product_name: 'Product' })).toThrow('series is required');
  });

  it('accepts valid JSON fields and trims required text', () => {
    const product = parseProductInput({
      sku: ' SKU-1 ',
      product_name: ' Item ',
      series: ' e9 Series ',
      main_image: '["/files/images/main1.png","/files/images/main2.png"]',
      other_image: '["/files/images/a.png"]',
      specification: '{"ส่วนบน":"หนัง Split Barton สีดำ"}',
      specification_en: '{"Upper":"Black Split Barton leather"}'
    });
    expect(product.sku).toBe('SKU-1');
    expect(product.product_name).toBe('Item');
    expect(product.series).toBe('e9 Series');
    expect(product.main_image).toEqual(['/files/images/main1.png', '/files/images/main2.png']);
    expect(product.other_image).toEqual(['/files/images/a.png']);
    expect(product.specification).toEqual({ 'ส่วนบน': 'หนัง Split Barton สีดำ' });
    expect(product.specification_en).toEqual({ Upper: 'Black Split Barton leather' });
  });

  it('accepts single string path for main_image and other_image as backward compatibility', () => {
    const product = parseProductInput({
      sku: 'SKU-2',
      product_name: 'Item 2',
      series: 'e9 Series',
      main_image: '/files/images/single.png',
      other_image: '/files/images/other.png'
    });
    expect(product.main_image).toEqual(['/files/images/single.png']);
    expect(product.other_image).toEqual(['/files/images/other.png']);
  });

  it('returns field-specific errors for malformed JSON values', () => {
    expect(() => parseProductInput({ sku: 'A', product_name: 'Product', series: 'e9 Series', main_image: '{}' })).toThrow('main_image must be a JSON array');
    expect(() => parseProductInput({ sku: 'A', product_name: 'Product', series: 'e9 Series', other_image: '{}' })).toThrow('other_image must be a JSON array');
    expect(() => parseProductInput({ sku: 'A', product_name: 'Product', series: 'e9 Series', specification: '[]' })).toThrow('specification must be a JSON object');
    expect(() => parseProductInput({ sku: 'A', product_name: 'Product', series: 'e9 Series', specification_en: '[]' })).toThrow('specification_en must be a JSON object');
  });
});
