import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { app } from '../src/index';
import { pool } from '../src/db/pool';

const email = process.env.TEST_ADMIN_EMAIL ?? 'admin@douyee.com';
const password = process.env.TEST_ADMIN_PASSWORD;
if (!password) throw new Error('Set TEST_ADMIN_PASSWORD (and optionally TEST_ADMIN_EMAIL) to an admin created with scripts/create-admin.ts.');
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
  process.env.ENABLE_OTP = 'true';
  await pool.query('SELECT 1');
  const login = await app.handle(new Request('http://localhost/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
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
  it('serves generated brochure pages through the public assets route', async () => {
    const response = await app.handle(new Request('http://localhost/assets/brochure-001.jpg'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/jpeg');
  });

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

  it('creates, lists, updates, and deletes a certificate type through HTTP handlers', async () => {
    const code = `TEST-${crypto.randomUUID()}`;
    let response = await api(`${prefix}/certificate`, 'POST', { certificate_code: code, certificate_name: 'Test Cert Name', image: null });
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created.certificate_code).toBe(code);
    expect(created.certificate_name).toBe('Test Cert Name');

    // Update name
    response = await api(`${prefix}/certificate`, 'PUT', { certificate_code: code, certificate_name: 'Updated Cert Name' });
    expect(response.status).toBe(200);
    const updated = await response.json();
    expect(updated.certificate_name).toBe('Updated Cert Name');

    response = await api(`${prefix}/certificate`);
    expect((await response.json()).some((row: any) => row.certificate_code === code && row.certificate_name === 'Updated Cert Name')).toBe(true);

    response = await api(`${prefix}/certificate`, 'DELETE', { certificate_code: code });
    expect(response.status).toBe(204);
  });

  it('creates, groups, reads, updates, and deletes a product through HTTP handlers', async () => {
    const sku = `TEST-${crypto.randomUUID()}`;
    const data = { sku, product_name: 'Integration test item', series: 'e9 Series', main_image: ['/files/images/test.png'], datasheet_pdf: '/files/documents/test-ds.pdf', specification: { voltage: '24V' }, size_weights: {}, other: {}, certificate_codes: ['CE'] };
    let response = await api(`${prefix}/product`, 'POST', data);
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created.datasheet_pdf).toBe('/files/documents/test-ds.pdf');
    response = await api(`${prefix}/product`);
    expect((await response.json()).find((group: any) => group.series === 'e9 Series')?.products.some((p: any) => p.product_id === created.product_id)).toBe(true);
    response = await api(`${prefix}/product/${created.product_id}`);
    expect((await response.json()).certificate_codes).toContain('CE');
    const updateForm = new FormData();
    updateForm.append('product_id', created.product_id);
    updateForm.append('sku', sku);
    updateForm.append('product_name', 'Integration test item');
    updateForm.append('series', 'e9 Series');
    updateForm.append('main_image', JSON.stringify(['/files/images/test.png']));
    updateForm.append('main_image_files', new File(['test image data'], 'new-image.png', { type: 'image/png' }));
    updateForm.append('datasheet_pdf', ''); // Remove document
    updateForm.append('specification', JSON.stringify({ voltage: '24V' }));
    updateForm.append('size_weights', JSON.stringify({}));
    updateForm.append('other', JSON.stringify({}));
    updateForm.append('certificate_codes', JSON.stringify(['CE']));
    updateForm.append('title', 'Updated title');

    response = await app.handle(new Request(`http://localhost${prefix}/product`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: updateForm
    }));
    expect(response.status).toBe(200);
    const updated = await response.json();
    expect(updated.title).toBe('Updated title');
    expect(updated.datasheet_pdf).toBeNull(); // Verified document was removed
    expect(updated.main_image).toHaveLength(2);
    expect(updated.main_image[0]).toBe('/files/images/test.png');
    expect(updated.main_image[1]).toMatch(/^\/files\/images\/.+\.png$/);
    response = await api(`${prefix}/product`, 'DELETE', { product_id: created.product_id });
    expect(response.status).toBe(204);
  });

  it('enforces optimistic locking when updating a product with expected version', async () => {
    const sku = `TEST-LOCK-${Date.now()}`;
    const data = { sku, product_name: 'Optimistic lock test item', series: 'e9 Series', main_image: [], specification: {}, size_weights: {}, other: {}, certificate_codes: [] };
    let response = await api(`${prefix}/product`, 'POST', data);
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created.version).toBe(1);

    // Update 1: valid expected version (1) -> should succeed and bump to 2
    response = await api(`${prefix}/product`, 'PUT', {
      product_id: created.product_id,
      sku,
      product_name: 'Updated item v2',
      series: 'e9 Series',
      version: 1
    });
    expect(response.status).toBe(200);
    const v2 = await response.json();
    expect(v2.version).toBe(2);

    // Update 2: stale expected version (1) -> should fail with 409 CONFLICT
    response = await api(`${prefix}/product`, 'PUT', {
      product_id: created.product_id,
      sku,
      product_name: 'Stale concurrent update',
      series: 'e9 Series',
      version: 1
    });
    expect(response.status).toBe(409);
    const conflict = await response.json();
    expect(conflict.error.code).toBe('CONFLICT');
    expect(conflict.error.details.current_version).toBe(2);

    // Update 3: current expected version (2) -> should succeed and bump to 3
    response = await api(`${prefix}/product`, 'PUT', {
      product_id: created.product_id,
      sku,
      product_name: 'Updated item v3',
      series: 'e9 Series',
      version: 2
    });
    expect(response.status).toBe(200);
    const v3 = await response.json();
    expect(v3.version).toBe(3);

    // Clean up
    await api(`${prefix}/product`, 'DELETE', { product_id: created.product_id });
  });

  it('manages admin accounts through HTTP handlers (list, create, update password, delete)', async () => {
    // 1. List admins
    let response = await api(`${prefix}/admins`);
    expect(response.status).toBe(200);
    const initialList = await response.json();
    expect(Array.isArray(initialList)).toBe(true);
    expect(initialList.length).toBeGreaterThan(0);

    // 2. Create new admin
    const testAdminEmail = `test-admin-${crypto.randomUUID()}@douyee.com`;
    response = await api(`${prefix}/admins`, 'POST', {
      email: testAdminEmail,
      password: 'initialPassword123'
    });
    expect(response.status).toBe(201);
    const createdAdmin = await response.json();
    expect(createdAdmin.email).toBe(testAdminEmail);
    expect(createdAdmin.adminId).toBeDefined();

    // 3. Verify created admin can challenge login
    const loginRes = await app.handle(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: 'initialPassword123' })
    }));
    expect(loginRes.status).toBe(200);
    const challenge = await loginRes.json();
    expect(challenge.success).toBe(true);
    expect(challenge.challengeToken).toBeDefined();

    // 4. Another admin cannot update this admin's password (should be 403 FORBIDDEN)
    response = await api(`${prefix}/admins`, 'PUT', {
      admin_id: createdAdmin.adminId,
      password: 'newUpdatedPassword456'
    });
    expect(response.status).toBe(403);
    const forbidden = await response.json();
    expect(forbidden.error.code).toBe('FORBIDDEN');

    // 5. Log in as the new admin and verify they CAN update their own password
    const verifyNew = await app.handle(new Request('http://localhost/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ challengeToken: challenge.challengeToken, otpCode: challenge.testOtp || challenge.devOtp })
    }));
    expect(verifyNew.status).toBe(200);
    const newAdminToken = (await verifyNew.json()).token;

    // Self update with own token should succeed
    const selfUpdateRes = await app.handle(new Request(`http://localhost${prefix}/admins`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${newAdminToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        admin_id: createdAdmin.adminId,
        password: 'newUpdatedPassword456'
      })
    }));
    expect(selfUpdateRes.status).toBe(200);

    // Old password should now fail
    const oldLoginRes = await app.handle(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: 'initialPassword123' })
    }));
    expect(oldLoginRes.status).toBe(401);

    // New password should succeed
    const newLoginRes = await app.handle(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: 'newUpdatedPassword456' })
    }));
    expect(newLoginRes.status).toBe(200);

    // 6. Delete admin
    response = await api(`${prefix}/admins`, 'DELETE', {
      admin_id: createdAdmin.adminId
    });
    expect(response.status).toBe(204);

    // 7. Verify deleted
    response = await api(`${prefix}/admins`);
    const afterList = await response.json();
    expect(afterList.some((a: any) => a.adminId === createdAdmin.adminId)).toBe(false);
  });

  it('supports direct password sign-in without OTP when ENABLE_OTP is false', async () => {
    process.env.ENABLE_OTP = 'false';
    const configRes = await app.handle(new Request('http://localhost/api/auth/config'));
    expect(configRes.status).toBe(200);
    const config = await configRes.json();
    expect(config.otpEnabled).toBe(false);

    const loginRes = await app.handle(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password })
    }));
    expect(loginRes.status).toBe(200);
    const result = await loginRes.json();
    expect(result.success).toBe(true);
    expect(result.requireOtp).toBe(false);
    expect(result.token).toBeDefined();
    expect(result.challengeToken).toBeUndefined();

    // Restore for other tests
    process.env.ENABLE_OTP = 'true';
  });
});
