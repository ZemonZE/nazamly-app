import { API_URL } from '@/firebase';
import { Platform } from 'react-native';

export interface BackendUser {
  _id: string;
  firebaseUid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: 'student' | 'admin';
  accessStatus?: 'active' | 'pending' | 'suspended';
  cgpa?: number;
  completedHours?: number;
  currentCGPA?: number;
  earnedCreditHours?: number;
  studentCardPhotoURL?: string;
  termCourses?: Array<{
    _id?: string;
    name: string;
    courseCode: string;
    creditHours: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export type SyncResponse = Record<string, any>;

export interface ProfileResponse {
  success: boolean;
  data: BackendUser;
}

export type SetupProfileRequest = Record<string, any>;

export interface SetupProfileResponse {
  success: boolean;
  data: BackendUser;
}

export interface StudentCardResponse {
  success: boolean;
  studentCardPhotoURL?: string;
}

export interface UploadPhotoResponse {
  success: boolean;
  photoURL?: string;
}

export interface UploadStudentCardResponse {
  success: boolean;
  data: {
    studentCardPhotoURL?: string;
  };
}

/**
 * Sync user data after Firebase login
 */
export async function syncUser(token: string): Promise<SyncResponse> {
  const res = await fetch(`${API_URL}/api/auth/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<SyncResponse>(res);
}

/**
 * Setup user profile after registration
 */
export async function setupProfile(
  profileData: SetupProfileRequest,
  token: string
): Promise<SetupProfileResponse> {
  const res = await fetch(`${API_URL}/api/auth/setup-profile`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  const result = await handleResponse<{ data: BackendUser }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Get user profile data
 */
export async function getProfile(token: string): Promise<ProfileResponse> {
  const res = await fetch(`${API_URL}/api/auth/get-profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: BackendUser }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Get user student card image URL
 */
export async function getStudentCard(token: string): Promise<StudentCardResponse> {
  const res = await fetch(`${API_URL}/api/auth/student-card`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ studentCardPhotoURL?: string }>(res);
  return {
    success: true,
    studentCardPhotoURL: result.studentCardPhotoURL,
  };
}

/**
 * Update user profile photo using URL
 */
export async function updatePhoto(photoURL: string, token: string): Promise<UploadPhotoResponse> {
  const res = await fetch(`${API_URL}/api/auth/update-photo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ photoURL }),
  });

  const result = await handleResponse<{ photoURL?: string }>(res);
  return {
    success: true,
    photoURL: result.photoURL,
  };
}

/**
 * Upload user profile photo file
 */
export async function uploadPhoto(
  fileUri: string,
  mimeType: string,
  fileName: string,
  token: string,
  fileObj?: any
): Promise<UploadPhotoResponse> {
  const formData = new FormData();

  if (Platform.OS === 'web' && fileObj) {
    formData.append('photo', fileObj);
  } else {
    formData.append('photo', { uri: fileUri, type: mimeType, name: fileName } as any);
  }

  const res = await fetch(`${API_URL}/api/auth/upload-photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await handleResponse<{ photoURL?: string }>(res);
  return {
    success: true,
    photoURL: result.photoURL,
  };
}

/**
 * Update user student card using URL
 */
export async function updateStudentCard(studentCardURL: string, token: string): Promise<UploadStudentCardResponse> {
  const res = await fetch(`${API_URL}/api/auth/update-student-card`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ studentCardURL }),
  });

  const result = await handleResponse<{ data: { studentCardPhotoURL?: string } }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Upload user student card file
 */
export async function uploadStudentCard(
  fileUri: string,
  mimeType: string,
  fileName: string,
  token: string,
  fileObj?: any
): Promise<UploadStudentCardResponse> {
  const formData = new FormData();

  if (Platform.OS === 'web' && fileObj) {
    formData.append('studentCard', fileObj);
  } else {
    formData.append('studentCard', { uri: fileUri, type: mimeType, name: fileName } as any);
  }

  const res = await fetch(`${API_URL}/api/auth/upload-student-card`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await handleResponse<{ data: { studentCardPhotoURL?: string } }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Verify if user is admin
 */
export async function verifyAdmin(token: string): Promise<{ isAdmin: boolean }> {
  const res = await fetch(`${API_URL}/api/auth/verify-admin`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<{ isAdmin: boolean }>(res);
}

/**
 * Shared response helper
 */
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
