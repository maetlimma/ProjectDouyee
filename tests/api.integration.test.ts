import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { app } from '../src/index';
import { pool } from '../src/db/pool';

const email = 'admin@douyee.com';
let token = '';
const prefix = `/api/v1`;

async function api(path: string, method = 'GET', data?: unknown) {
  return app.handle(new Request(`http://localhost${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(data ? { 'content-type': 'application/json' } : {}) },
    body: data ? JSON.stringify(data) : undefined
  }));
}

beforeAll(async () => {
  await pool.query('SELECT 1');
  const login = await app.handle(new Request('http://localhost/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: process.env.TEST_ADMIN_PASSWORD ?? 'password123' })
  }));
  const challenge = await login.json();
  const verification = await app.handle(new Request('http://localhost/api/auth/verify-otp', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ challengeToken: challenge.challengeToken, otpCode: challenge.testOtp })
  }));
  token = (await verification.json()).token;
});

afterAll(async () => { await pool.end(); });

describe('API integration', () => {
  it('creates, lists, updates, and deletes a series through HTTP handlers', async () => {
    const code = `TEST-${crypto.randomUUID()}`;
    let response = await api(`${prefix}/series`, 'POST', { series_code: code, series_name: 'Test series' });
    expect(response.status).toBe(201);
    response = await api(`${prefix}/series`);
    expect((await response.json()).some((row: any) => row.series_code === code)).toBe(true);
    response = await api(`${prefix}/series`, 'PUT', { series_code: code, series_name: 'Updated series' });
    expect((await response.json()).series_name).toBe('Updated series');
    response = await api(`${prefix}/series`, 'DELETE', { series_code: code });
    expect(response.status).toBe(204);
  });

  it('creates, lists, and deletes a certificate type through HTTP handlers', async () => {
    const code = `TEST-${crypto.randomUUID()}`;
    let response = await api(`${prefix}/certificate`, 'POST', { certificate_code: code, image: null });
    expect(response.status).toBe(201);
    response = await api(`${prefix}/certificate`);
    expect((await response.json()).some((row: any) => row.certificate_code === code)).toBe(true);
    response = await api(`${prefix}/certificate`, 'DELETE', { certificate_code: code });
    expect(response.status).toBe(204);
  });

  it('creates, groups, reads, updates, and deletes a product through HTTP handlers', async () => {
    const sku = `TEST-${crypto.randomUUID()}`;
    const data = { sku, product_name: 'Integration test item', series: 'e9 Series', main_image: ['/files/images/test.png'], specification: { voltage: '24V' }, size_weights: {}, other: {}, certificate_codes: ['CE'] };
    let response = await api(`${prefix}/product`, 'POST', data);
    expect(response.status).toBe(201);
    const created = await response.json();
    response = await api(`${prefix}/product`);
    expect((await response.json()).find((group: any) => group.series === 'e9 Series')?.products.some((p: any) => p.product_id === created.product_id)).toBe(true);
    response = await api(`${prefix}/product/${created.product_id}`);
    expect((await response.json()).certificate_codes).toContain('CE');
    response = await api(`${prefix}/product`, 'PUT', { ...data, product_id: created.product_id, title: 'Updated title' });
    expect((await response.json()).title).toBe('Updated title');
    response = await api(`${prefix}/product`, 'DELETE', { product_id: created.product_id });
    expect(response.status).toBe(204);
  });
});
