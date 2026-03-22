import { auth, API_URL } from '../src/firebase';

/**
 * A centralized fetch wrapper that automatically handles Firebase ID tokens.
 * It ensures the token is fresh (refreshes if needed) and attaches it
 * to the Authorization header.
 *
 * @param {string} endpoint - The API endpoint (e.g., '/api/admin/courses')
 * @param {object} options - Standard fetch options (method, body, headers, etc.)
 * @returns {Promise<any>} - The JSON response from the backend
 */
export async function fetchWithAuth(endpoint, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    // If not logged in, try to see if we have a stored session as a fallback
    // (Wait a bit for Firebase to initialize if needed)
    throw new Error('User not authenticated');
  }

  // Force refresh to always get a valid token
  const token = await user.getIdToken(true);

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };

  // Automatically set Content-Type to JSON if body is an object (and not FormData)
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      // Fallback if response is not JSON
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  // Handle empty responses (like 204 No Content)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return null;
}