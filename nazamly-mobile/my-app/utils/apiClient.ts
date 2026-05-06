/**
 * apiClient — Centralized HTTP client with automatic auth token injection.
 * 
 * Usage:
 *   import { apiGet, apiPost, apiPatch, apiDelete } from '@/utils/apiClient';
 *   const data = await apiGet('/auth/get-profile');
 *   const result = await apiPost('/gpa/upload-transcript', formData);
 * 
 * Benefits:
 * - Automatically attaches Firebase Auth token to every request
 * - Centralized error handling with consistent error format
 * - No need to pass `token` to every service function
 */
import { auth, API_URL } from '@/firebase';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch (_) {
      // ignore parse failures
    }
    throw new Error(message);
  }
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api${path}`, { headers });
  return handleResponse<T>(res);
}

export async function apiPost<T>(
  path: string,
  body?: any,
  isFormData = false
): Promise<T> {
  const headers: Record<string, string> = await getAuthHeaders();
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}/api${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api${path}`, {
    method: 'DELETE',
    headers,
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}/api${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}
