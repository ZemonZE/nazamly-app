import { API_URL } from '@/firebase';
import { Platform } from 'react-native';

export interface TermCourse {
  id: string;
  courseCode: string;
  courseName: string;
  creditHours: number;
  targetGrade?: number;
}

export interface GpaProfileData {
  cgpa: number;
  totalCreditHours: number;
}

export interface CalculateTermRequest {
  courses: Array<{
    courseCode: string;
    creditHours: number;
    grade: number;
  }>;
  currentCGPA: number;
  currentCreditHours: number;
}

export interface CalculateTermResponse {
  success: boolean;
  data?: {
    termGPA: number;
    newCGPA: number;
    totalCreditHours: number;
  };
  message?: string;
}

export interface TargetStrategyRequest {
  targetCGPA: number;
  courses: Array<{
    courseCode: string;
    creditHours: number;
  }>;
  currentCGPA: number;
  currentCreditHours: number;
}

export interface TargetStrategyResponse {
  success: boolean;
  data?: {
    possible: boolean;
    requiredTermAverageGPA?: number;
    maxCGPA: number;
    plan?: TermCourse[];
    note?: string;
  };
  message?: string;
}

export interface GetTermCoursesResponse {
  success: boolean;
  data?: TermCourse[];
  message?: string;
}

export interface AddTermCourseRequest {
  courseName: string;
  courseCode: string;
  creditHours: number;
}

export interface AddTermCourseResponse {
  success: boolean;
  data?: TermCourse;
  message?: string;
}

export interface RemoveTermCourseResponse {
  success: boolean;
  message?: string;
}

export interface TranscriptUploadResponse {
  success: boolean;
  data?: {
    transcriptId: string;
    status: 'completed' | 'failed' | 'processing';
    extractedCourses?: any[];
    termGPA?: number;
    totalCreditHours?: number;
    ocrConfidence?: number;
    errorMessage?: string;
  };
  message?: string;
}

export interface GetTranscriptsResponse {
  success: boolean;
  data?: any[];
  message?: string;
}

export interface GetTranscriptResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export interface UpdateTranscriptRequest {
  courses: any[];
}

export interface UpdateTranscriptResponse {
  success: boolean;
  message?: string;
}

export interface DeleteTranscriptResponse {
  success: boolean;
  message?: string;
}

export interface GetGPAHistoryResponse {
  success: boolean;
  data?: any[];
  message?: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch (_) {}
    throw new Error(message);
  }
  return res.json();
}

/**
 * Calculate current term GPA and new CGPA
 */
export async function calculateCurrentTerm(
  calculationData: CalculateTermRequest,
  token: string
): Promise<CalculateTermResponse> {
  const res = await fetch(`${API_URL}/api/gpa/calculate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(calculationData),
  });

  const result = await handleResponse<{ data: CalculateTermResponse['data'] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Generate target strategy to reach desired CGPA
 */
export async function generateTargetPlan(
  strategyData: TargetStrategyRequest,
  token: string
): Promise<TargetStrategyResponse> {
  const res = await fetch(`${API_URL}/api/gpa/target-strategy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(strategyData),
  });

  const result = await handleResponse<{ data: TargetStrategyResponse['data'] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Get user's current term courses
 */
export async function getTermCourses(token: string): Promise<GetTermCoursesResponse> {
  const res = await fetch(`${API_URL}/api/gpa/my-courses`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: TermCourse[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Add a course to user's current term
 */
export async function addTermCourse(
  courseData: AddTermCourseRequest,
  token: string
): Promise<AddTermCourseResponse> {
  const res = await fetch(`${API_URL}/api/gpa/my-courses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(courseData),
  });

  const result = await handleResponse<{ data: TermCourse }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Remove a course from user's current term
 */
export async function removeTermCourse(
  courseId: string,
  token: string
): Promise<RemoveTermCourseResponse> {
  const res = await fetch(`${API_URL}/api/gpa/my-courses/${courseId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Course removed successfully',
  };
}

/**
 * Upload transcript for GPA calculation
 */
export async function uploadTranscript(
  fileUri: string,
  mimeType: string,
  fileName: string,
  token: string,
  fileObj?: any
): Promise<TranscriptUploadResponse> {
  const formData = new FormData();

  if (Platform.OS === 'web' && fileObj) {
    formData.append('transcript', fileObj);
  } else {
    formData.append('transcript', { uri: fileUri, type: mimeType, name: fileName } as any);
  }

  const res = await fetch(`${API_URL}/api/gpa/upload-transcript`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await handleResponse<{ data: TranscriptUploadResponse['data'] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Get all user's transcripts
 */
export async function getAllTranscripts(token: string): Promise<GetTranscriptsResponse> {
  const res = await fetch(`${API_URL}/api/gpa/transcripts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: any[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Get a specific transcript by ID
 */
export async function getTranscriptById(
  transcriptId: string,
  token: string
): Promise<GetTranscriptResponse> {
  const res = await fetch(`${API_URL}/api/gpa/transcripts/${transcriptId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: any }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Update transcript with corrected data
 */
export async function updateTranscript(
  transcriptId: string,
  updateData: UpdateTranscriptRequest,
  token: string
): Promise<UpdateTranscriptResponse> {
  const res = await fetch(`${API_URL}/api/gpa/transcripts/${transcriptId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Transcript updated successfully',
  };
}

/**
 * Delete a transcript
 */
export async function deleteTranscript(
  transcriptId: string,
  token: string
): Promise<DeleteTranscriptResponse> {
  const res = await fetch(`${API_URL}/api/gpa/transcripts/${transcriptId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Transcript deleted successfully',
  };
}

/**
 * Get user's GPA history
 */
export async function getGPAHistory(token: string): Promise<GetGPAHistoryResponse> {
  const res = await fetch(`${API_URL}/api/gpa/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: any[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}