/**
 * Maps Firebase Auth error codes and backend sync errors
 * to user-friendly messages for display in the auth UI.
 *
 * Always checks `error.code` first (Firebase errors carry this property).
 * Falls back to a generic message for unknown errors.
 *
 * @param {Error} error - The caught error object
 * @returns {string} A human-readable error message
 */

const FIREBASE_ERROR_MAP = {
  "auth/invalid-credential":
    "Invalid email or password. Please try again.",
  "auth/user-not-found":
    "Invalid email or password. Please try again.",
  "auth/wrong-password":
    "Invalid email or password. Please try again.",
  "auth/email-already-in-use":
    "An account with this email already exists.",
  "auth/weak-password":
    "Your password is too weak. Please use at least 6 characters.",
  "auth/network-request-failed":
    "Network error. Please check your internet connection.",
  "auth/too-many-requests":
    "Too many failed attempts. Please wait a moment and try again.",
  "auth/popup-closed-by-user":
    "Sign-in popup was closed. Please try again.",
  "auth/invalid-email":
    "Please enter a valid email address.",
};

const SYNC_ERROR_HINT = "Server sync failed";

export function getFriendlyAuthError(error) {
  // 1. Firebase errors always have an `error.code` property
  if (error?.code && FIREBASE_ERROR_MAP[error.code]) {
    return FIREBASE_ERROR_MAP[error.code];
  }

  // 2. Backend sync errors (thrown from our syncWithBackend function)
  if (error?.message?.includes(SYNC_ERROR_HINT)) {
    return "Unable to connect to the server. Please try again later.";
  }

  // 3. Generic network / fetch failures
  if (error?.message?.toLowerCase().includes("failed to fetch")) {
    return "Unable to connect to the server. Please try again later.";
  }

  // 4. Fallback
  return "An unexpected error occurred. Please try again.";
}
