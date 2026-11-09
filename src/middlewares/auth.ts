import { fail } from './errors';

export async function actor(
  request: Request,
  jwt: { verify: (token: string) => Promise<any> }
): Promise<string> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const payload = token ? await jwt.verify(token) : false;
  if (!payload?.email) {
    fail(401, 'UNAUTHORIZED', 'A valid admin bearer token is required');
  }
  return String(payload.email);
}

export function uuid(value: string, field = 'product_id'): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    fail(400, 'VALIDATION_ERROR', `${field} must be a UUID`, { field, message: 'Must be a UUID' });
  }
  return value;
}

export function fileValue(value: unknown): File | undefined {
  return value instanceof File ? value : undefined;
}

export const secured = { security: [{ BearerAuth: [] }] };
