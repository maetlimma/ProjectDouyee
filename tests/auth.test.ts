import { describe, expect, it } from 'bun:test';
import { app } from '../src/index';

describe('Authentication API Endpoint Tests', () => {
  let challengeToken = '';

  it('fails login with invalid credentials', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@douyee.com',
          password: 'wrongpassword'
        })
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });

  it('initiates login successfully and returns a challenge token', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@douyee.com',
          password: 'password123'
        })
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.challengeToken).toBeDefined();
    challengeToken = body.challengeToken;
  });

  it('fails verification with incorrect OTP code', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken,
          otpCode: '000000'
        })
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
