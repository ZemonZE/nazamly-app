import { auth, API_URL } from '../firebase';

/**
 * Centralized fetch wrapper that attaches a fresh Firebase ID token
 * to every request and handles error responses uniformly.
 *
 * @param {string} endpoint - e.g. '/api/gpa/calculate'
 * @param {object} options  - standard fetch options
 * @returns {Promise<any>}  - parsed JSON or null for empty responses
 */
export async function fetchWithAuth(endpoint, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // Force refresh to always get a valid, non-expired token
  const token = await user.getIdToken(true);

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  // Auto-set Content-Type for JSON bodies (skip for FormData)
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (_) { /* non-JSON error body */ }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}
