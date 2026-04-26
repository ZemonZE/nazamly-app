import { API_URL } from '@/firebase';
import { Platform } from 'react-native';

export interface CodingProblem {
  _id: string;
  title: string;
  descriptionMd: string;
  testCases: TestCase[];
  supportedLanguages: string[];
  topic: string;
  tags: string[];
  courseId: string;
  estimatedMinutes: number;
  difficulty: number;
  acCount: number;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  _id: string;
  input: string;
  expectedOutput: string;
  visible: boolean;
}

export interface CodeSubmission {
  _id: string;
  studentId: string;
  problemId: string;
  language: string;
  code: string;
  verdict: 'AC' | 'WA' | 'ERROR';
  testResults: TestResult[];
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestResult {
  testCaseIndex: number;
  passed: boolean;
  stdout: string;
  stderr: string;
  signal?: string;
}

// ── Response Types ──

export interface ListProblemsAdminResponse {
  success: boolean;
  data?: CodingProblem[];
  message?: string;
}

export interface CreateProblemRequest {
  title: string;
  topic: string;
  courseId: string;
  estimatedMinutes: number;
  difficulty: number;
  supportedLanguages: string[];
  tags: string[];
  descriptionFile: { uri: string; name: string; mimeType: string; file?: any };
  testCasesFile: { uri: string; name: string; mimeType: string; file?: any };
}

export interface CreateProblemResponse {
  success: boolean;
  data?: CodingProblem;
  message?: string;
}

export interface UpdateProblemRequest {
  title?: string;
  topic?: string;
  courseId?: string;
  estimatedMinutes?: number;
  difficulty?: number;
  supportedLanguages?: string[];
  tags?: string[];
  descriptionFile?: { uri: string; name: string; mimeType: string; file?: any };
  testCasesFile?: { uri: string; name: string; mimeType: string; file?: any };
}

export interface UpdateProblemResponse {
  success: boolean;
  data?: CodingProblem;
  message?: string;
}

export interface DeleteProblemResponse {
  success: boolean;
  message?: string;
}

export interface GetAdminSubmissionsResponse {
  success: boolean;
  data?: CodeSubmission[];
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

// ── Problems ──

/**
 * Get all coding problems for a course (admin view)
 */
export async function listProblemsAdmin(
  courseId: string,
  sort?: string,
  dir?: string,
  token: string
): Promise<ListProblemsAdminResponse> {
  const params = new URLSearchParams({ courseId });
  if (sort) params.append('sort', sort);
  if (dir) params.append('dir', dir);

  const res = await fetch(`${API_URL}/api/admin/coding/problems?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: CodingProblem[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Create a new coding problem
 */
export async function createProblem(
  problemData: CreateProblemRequest,
  token: string
): Promise<CreateProblemResponse> {
  const formData = new FormData();

  // Add text fields
  formData.append('title', problemData.title);
  formData.append('topic', problemData.topic);
  formData.append('courseId', problemData.courseId);
  formData.append('estimatedMinutes', problemData.estimatedMinutes.toString());
  formData.append('difficulty', problemData.difficulty.toString());

  // Add array fields
  problemData.supportedLanguages.forEach(lang => {
    formData.append('supportedLanguages', lang);
  });
  problemData.tags.forEach(tag => {
    formData.append('tags', tag);
  });

  // Add file fields
  if (Platform.OS === 'web' && problemData.descriptionFile.file) {
    formData.append('descriptionFile', problemData.descriptionFile.file);
  } else {
    formData.append('descriptionFile', {
      uri: problemData.descriptionFile.uri,
      type: problemData.descriptionFile.mimeType,
      name: problemData.descriptionFile.name
    } as any);
  }

  if (Platform.OS === 'web' && problemData.testCasesFile.file) {
    formData.append('testCasesFile', problemData.testCasesFile.file);
  } else {
    formData.append('testCasesFile', {
      uri: problemData.testCasesFile.uri,
      type: problemData.testCasesFile.mimeType,
      name: problemData.testCasesFile.name
    } as any);
  }

  const res = await fetch(`${API_URL}/api/admin/coding/problems`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await handleResponse<{ data: CodingProblem }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Update an existing coding problem
 */
export async function updateProblem(
  problemId: string,
  problemData: UpdateProblemRequest,
  token: string
): Promise<UpdateProblemResponse> {
  const formData = new FormData();

  // Add text fields if provided
  if (problemData.title) formData.append('title', problemData.title);
  if (problemData.topic) formData.append('topic', problemData.topic);
  if (problemData.courseId) formData.append('courseId', problemData.courseId);
  if (problemData.estimatedMinutes) formData.append('estimatedMinutes', problemData.estimatedMinutes.toString());
  if (problemData.difficulty) formData.append('difficulty', problemData.difficulty.toString());

  // Add array fields if provided
  if (problemData.supportedLanguages) {
    problemData.supportedLanguages.forEach(lang => {
      formData.append('supportedLanguages', lang);
    });
  }
  if (problemData.tags) {
    problemData.tags.forEach(tag => {
      formData.append('tags', tag);
    });
  }

  // Add file fields if provided
  if (problemData.descriptionFile) {
    if (Platform.OS === 'web' && problemData.descriptionFile.file) {
      formData.append('descriptionFile', problemData.descriptionFile.file);
    } else {
      formData.append('descriptionFile', {
        uri: problemData.descriptionFile.uri,
        type: problemData.descriptionFile.mimeType,
        name: problemData.descriptionFile.name
      } as any);
    }
  }

  if (problemData.testCasesFile) {
    if (Platform.OS === 'web' && problemData.testCasesFile.file) {
      formData.append('testCasesFile', problemData.testCasesFile.file);
    } else {
      formData.append('testCasesFile', {
        uri: problemData.testCasesFile.uri,
        type: problemData.testCasesFile.mimeType,
        name: problemData.testCasesFile.name
      } as any);
    }
  }

  const res = await fetch(`${API_URL}/api/admin/coding/problems/${problemId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await handleResponse<{ data: CodingProblem }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Delete a coding problem
 */
export async function deleteProblem(
  problemId: string,
  token: string
): Promise<DeleteProblemResponse> {
  const res = await fetch(`${API_URL}/api/admin/coding/problems/${problemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Problem deleted successfully',
  };
}

// ── Submissions ──

/**
 * Get all submissions for a coding problem (admin view)
 */
export async function getAdminSubmissions(
  problemId: string,
  token: string
): Promise<GetAdminSubmissionsResponse> {
  const res = await fetch(`${API_URL}/api/admin/coding/problems/${problemId}/submissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: CodeSubmission[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}