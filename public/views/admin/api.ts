export const token = () => localStorage.getItem('douyee_admin_token') ?? '';

export async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token()}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...init, headers });
  if (response.status === 401) {
    localStorage.removeItem('douyee_admin_token');
    window.location.href = '/admin/login';
    throw new Error('Your admin session has expired. Please sign in again.');
  }
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected JSON from ${path}; received ${contentType || 'an unknown content type'}.`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? `Request failed (${response.status})`);
  return data as T;
}

export const dateLabel = (value?: string) =>
  value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const initials = (value: string) => value.trim().slice(0, 2).toUpperCase() || 'DY';
