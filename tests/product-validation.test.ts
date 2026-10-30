import { describe, expect, it } from 'bun:test';
import { parseProductInput } from '../src/services/product-validation';

describe('product input validation', () => {
  it('requires SKU, product name, and series', () => {
    expect(() => parseProductInput({})).toThrow('sku is required');
    expect(() => parseProductInput({ sku: 'A' })).toThrow('product_name is required');
    expect(() => parseProductInput({ sku: 'A', product_name: 'Product' })).toThrow('series is required');
  });

  it('accepts valid JSON fields and trims required text', () => {
    const product = parseProductInput({ sku: ' SKU-1 ', product_name: ' Item ', series: ' e9 Series ', other_image: '["/files/images/a.png"]', specification: '{"voltage":"24V"}' });
    expect(product.sku).toBe('SKU-1');
    expect(product.product_name).toBe('Item');
    expect(product.series).toBe('e9 Series');
    expect(product.other_image).toEqual(['/files/images/a.png']);
    expect(product.specification).toEqual({ voltage: '24V' });
  });

  it('returns field-specific errors for malformed JSON values', () => {
    expect(() => parseProductInput({ sku: 'A', product_name: 'Product', series: 'e9 Series', other_image: '{}' })).toThrow('other_image must be a JSON array');
    expect(() => parseProductInput({ sku: 'A', product_name: 'Product', series: 'e9 Series', specification: '[]' })).toThrow('specification must be a JSON object');
  });
});
