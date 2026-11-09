import { randomBytes } from 'node:crypto';

function resolveJwtSecret() {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Set JWT_SECRET to a random value of at least 32 characters in production.');
  }
  if (configured) console.warn('JWT_SECRET is shorter than 32 characters; using a random per-process secret instead.');
  // No known fallback: sessions are valid only until the process restarts.
  return randomBytes(48).toString('hex');
}

export const jwtSecret = resolveJwtSecret();
