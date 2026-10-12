import { describe, expect, it, beforeAll } from 'bun:test';
import { app } from '../src/index';
import { Product } from '../src/db';

describe('Product Catalog CRUD & Visibility Filter Tests', () => {
  let adminToken = '';
  let testProductId = '';

  beforeAll(async () => {
    // Authenticate and get a JWT token
    // Set NODE_ENV to test to receive the testOtp code
    process.env.NODE_ENV = 'test';
    
    const loginRes = await app.handle(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@douyee.com',
          password: 'password123'
        })
      })
    );
    const loginBody = await loginRes.json();
    const challengeToken = loginBody.challengeToken;
    const otpCode = loginBody.testOtp;

    // Verify OTP to get token
    const verifyRes = await app.handle(
      new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken,
          otpCode
        })
      })
    );
    const verifyBody = await verifyRes.json();
    adminToken = verifyBody.token;
  });

  it('verifies public products listing works', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/products'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('protects admin products listing from anonymous access', async () => {
    const res = await app.handle(new Request('http://localhost:3000/api/admin/products'));
    expect(res.status).toBe(401);
  });

  it('allows authenticated admin to retrieve products list', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/admin/products', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('allows admin to create a new product', async () => {
    const newProductData = {
      title: { en: 'Test Ionizer Blower', zh: '测试离子风机' },
      sku: 'TEST-ION-100',
      department: 'Static Control' as const,
      subCategory: { en: 'Ionizers', zh: '离子消电器' },
      status: 'enabled' as const,
      imagePaths: [],
      pdfPaths: [],
      contentBlocks: [
        { type: 'paragraph', content: { en: 'This is an awesome test ionizer.', zh: '这是极好的测试离子风机。' } }
      ],
      technicalMatrix: [
        { type: 'group', title: { en: 'Electric Specs', zh: '电气规格' } },
        { type: 'standard', key: { en: 'Voltage', zh: '电压' }, value: { en: '220V', zh: '220伏' } }
      ]
    };

    const res = await app.handle(
      new Request('http://localhost:3000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(newProductData)
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.product.id).toBeDefined();
    testProductId = body.product.id;
  });

  it('renders the newly created product in public catalog', async () => {
    const res = await app.handle(new Request(`http://localhost:3000/api/products/${testProductId}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sku).toBe('TEST-ION-100');
  });

  it('filters out disabled products from the public catalog', async () => {
    // 1. Update status to disabled
    const updateRes = await app.handle(
      new Request(`http://localhost:3000/api/products/${testProductId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: { en: 'Test Ionizer Blower', zh: '测试离子风机' },
          sku: 'TEST-ION-100',
          department: 'Static Control' as const,
          subCategory: { en: 'Ionizers', zh: '离子消电器' },
          status: 'disabled' as const,
          imagePaths: [],
          pdfPaths: [],
          contentBlocks: [],
          technicalMatrix: []
        })
      })
    );
    expect(updateRes.status).toBe(200);

    // 2. Fetch via public single product endpoint -> should return 403 Forbidden
    const detailRes = await app.handle(new Request(`http://localhost:3000/api/products/${testProductId}`));
    expect(detailRes.status).toBe(403);

    // 3. Fetch via public catalog listing -> should not contain it
    const listRes = await app.handle(new Request('http://localhost:3000/api/products'));
    const listBody = await listRes.json() as Product[];
    expect(listBody.some(p => p.id === testProductId)).toBe(false);
  });

  it('handles scheduled future publishing correctly (hide if not reached yet)', async () => {
    // Set publishAt in the future
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes in future
    
    await app.handle(
      new Request(`http://localhost:3000/api/products/${testProductId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: { en: 'Test Ionizer Blower', zh: '测试离子风机' },
          sku: 'TEST-ION-100',
          department: 'Static Control' as const,
          subCategory: { en: 'Ionizers', zh: '离子消电器' },
          status: 'enabled' as const,
          publishAt: futureDate,
          imagePaths: [],
          pdfPaths: [],
          contentBlocks: [],
          technicalMatrix: []
        })
      })
    );

    // Should be hidden in public catalog
    const detailRes = await app.handle(new Request(`http://localhost:3000/api/products/${testProductId}`));
    expect(detailRes.status).toBe(403);
  });

  it('allows admin to delete the product and cleans database', async () => {
    const delRes = await app.handle(
      new Request(`http://localhost:3000/api/products/${testProductId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
    );
    expect(delRes.status).toBe(200);

    const checkRes = await app.handle(
      new Request(`http://localhost:3000/api/admin/products/${testProductId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
    );
    expect(checkRes.status).toBe(404);
  });
});
