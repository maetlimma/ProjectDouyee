import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { randomInt, randomUUID } from 'node:crypto';
import { findAdminByEmail } from '../services/admins';
import { jwtSecret } from '../config';

const challenges = new Map<string, { email: string; code: string; expiresAt: number }>();

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(jwt({ name: 'jwt', secret: jwtSecret, exp: '12h' }))
  .post('/login', async ({ body, set }) => {
    const user = await findAdminByEmail(body.email);
    if (!user || !(await Bun.password.verify(body.password, user.passwordHash))) {
      set.status = 401;
      return { success: false, error: 'Invalid email or password' };
    }
    const code = String(randomInt(100000, 1000000));
    const challengeToken = randomUUID();
    challenges.set(challengeToken, { email: user.email, code, expiresAt: Date.now() + 5 * 60_000 });
    console.info(`[ADMIN AUTH] OTP for ${user.email}: ${code}`);
    return {
      success: true,
      challengeToken,
      message: 'OTP code generated. Check server console.',
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: code } : {}),
      ...(process.env.NODE_ENV === 'test' ? { testOtp: code } : {})
    };
  }, {
    body: t.Object({ email: t.String({ format: 'email' }), password: t.String({ minLength: 1 }) }),
    detail: { tags: ['Auth'], summary: 'Admin login challenge' }
  })
  .post('/verify-otp', async ({ body, jwt, set }) => {
    const challenge = challenges.get(body.challengeToken);
    if (!challenge || challenge.expiresAt < Date.now()) {
      challenges.delete(body.challengeToken);
      set.status = 400;
      return { success: false, error: 'Invalid or expired login challenge' };
    }
    if (challenge.code !== body.otpCode) {
      set.status = 401;
      return { success: false, error: 'Incorrect OTP code entered' };
    }
    challenges.delete(body.challengeToken);
    return {
      success: true,
      token: await jwt.sign({ userId: challenge.email, email: challenge.email }),
      email: challenge.email
    };
  }, {
    body: t.Object({ challengeToken: t.String(), otpCode: t.String({ minLength: 6, maxLength: 6 }) }),
    detail: { tags: ['Auth'], summary: 'Verify OTP code and issue JWT token' }
  })
  .get('/me', async ({ request, jwt, set }) => {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const user = token ? await jwt.verify(token) : false;
    if (!user || !user.email) {
      set.status = 401;
      return { success: false, error: 'Unauthorized session' };
    }
    return { success: true, email: user.email };
  }, {
    detail: { tags: ['Auth'], summary: 'Current session user info' }
  });
