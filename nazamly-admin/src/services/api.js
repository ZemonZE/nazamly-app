import { API_URL, getAdminToken } from '../firebase';

/**
 * Custom error class that carries HTTP status codes.
 * Allows callers to switch on err.status for granular error handling.
 */
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Authenticated fetch wrapper.
 *
 * - Uses API_URL from firebase.js as the base URL (consistent with the rest of the app).
 * - Retrieves the auth token via getAdminToken() (Firebase ID token with localStorage fallback).
 * - Attaches it as a Bearer token in the Authorization header.
 * - Parses JSON responses and throws an ApiError on non-OK status codes.
 *
 * @param {string} endpoint - The API path (e.g. '/api/admin/users').
 * @param {RequestInit} options - Optional fetch options (method, body, headers, etc.).
 * @returns {Promise<any>} Parsed JSON response data.
 * @throws {ApiError} When the response status is not OK.
 */
export async function fetchWithAuth(endpoint, options = {}) {
  // Get a fresh Firebase ID token (auto-refreshes if expired)
  const token = await getAdminToken();

  // Build headers — merge caller-provided headers with auth & content-type defaults
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Construct the full URL using the shared API_URL base
  // Prevent double slashes when API_URL ends with '/' and endpoint starts with '/'
  const base = API_URL.replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError) {
    // Network-level failure (DNS, CORS, offline, etc.)
    throw new ApiError(
      'Network error, please check your connection',
      0,
    );
  }

  // Handle 401 Unauthorized — clear stale tokens and redirect to login
  if (response.status === 401) {
    localStorage.removeItem('adminUserData');
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  // Handle 204 No Content — nothing to parse
  if (response.status === 204) {
    return null;
  }

  // Attempt to parse JSON body (even error responses may carry JSON details)
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  // Throw on any non-OK status so callers can switch on err.status
  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data;
}
