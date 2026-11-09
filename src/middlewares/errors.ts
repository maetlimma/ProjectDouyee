export function fail(status: number, code: string, message: string, details?: unknown): never {
  throw Object.assign(new Error(message), { status, code, details });
}

export function statusError(error: any) {
  if (error?.code === 'VALIDATION') {
    const details = error.all?.map((issue: any) => ({
      field: String(issue.path ?? '').replace(/^\//, ''),
      message: issue.message
    })) ?? error.message;
    return { status: 400, code: 'VALIDATION_ERROR', message: 'Request validation failed', details };
  }
  if (error?.code === '23505') {
    return { status: 409, code: 'CONFLICT', message: 'A record with this key already exists' };
  }
  if (error?.code === '23503') {
    return {
      status: 409,
      code: 'CONFLICT',
      message: 'Cannot delete: this record is currently used by existing products. Please unassign or delete linked products first.'
    };
  }
  if (error?.code === '42P01' || error?.code === '42703') {
    console.error('[DATABASE SCHEMA]', error.code, error.message);
    return {
      status: 503,
      code: 'DATABASE_SCHEMA_NOT_READY',
      message: 'The product API database schema is missing or outdated. Run `bun run db:migrate`.'
    };
  }
  if (['EACCES', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', '08001', '08006', '3D000', '57P03'].includes(error?.code)) {
    console.error('[DATABASE CONNECTION]', error.code, error.message);
    return {
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Cannot connect to PostgreSQL. Start the database and check DATABASE_URL.'
    };
  }
  if (error?.code === '28P01') {
    console.error('[DATABASE AUTH]', error.code, error.message);
    return {
      status: 503,
      code: 'DATABASE_AUTH_FAILED',
      message: 'PostgreSQL rejected the configured credentials. Check DATABASE_URL.'
    };
  }
  if (error?.status) {
    return { status: error.status, code: error.code ?? 'REQUEST_ERROR', message: error.message, details: error.details };
  }
  console.error('[API ERROR]', error?.code ?? 'UNKNOWN', error?.message ?? error);
  return { status: 500, code: 'INTERNAL_ERROR', message: error?.message || 'An unexpected server error occurred' };
}
