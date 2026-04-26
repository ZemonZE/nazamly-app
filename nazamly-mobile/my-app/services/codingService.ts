import { API_URL } from '@/firebase';

export interface CodingProblem {
  _id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  starterCode: { [language: string]: string };
  testCases: {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }[];
  timeLimit: number;
  memoryLimit: number;
}

export interface CodeSubmission {
  _id: string;
  problemId: string;
  code: string;
  language: string;
  status: 'pending' | 'running' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error' | 'compilation_error';
  executionTime?: number;
  memoryUsed?: number;
  submittedAt: string;
  testCasesPassed?: number;
  totalTestCases?: number;
}

export interface StudentProgress {
  totalProblemsAttempted: number;
  totalProblemsSolved: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  currentStreak: number;
  maxStreak: number;
  favoriteDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface ListProblemsResponse {
  success: boolean;
  problems?: CodingProblem[];
  message?: string;
}

export interface GetProblemResponse {
  success: boolean;
  problem?: CodingProblem;
  message?: string;
}

export interface SubmitCodeRequest {
  problemId: string;
  code: string;
  language: string;
}

export interface SubmitCodeResponse {
  success: boolean;
  submission?: CodeSubmission;
  message?: string;
}

export interface GetSubmissionsResponse {
  success: boolean;
  submissions?: CodeSubmission[];
  message?: string;
}

export interface GetProgressResponse {
  success: boolean;
  progress?: StudentProgress;
  message?: string;
}

export interface ToggleDifficultyResponse {
  success: boolean;
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
 * List all coding problems
 */
export async function listProblems(token: string): Promise<ListProblemsResponse> {
  const res = await fetch(`${API_URL}/api/coding/problems`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ problems?: CodingProblem[] }>(res);
  return {
    success: true,
    problems: result.problems,
  };
}

/**
 * Get a specific coding problem
 */
export async function getProblem(
  problemId: string,
  token: string
): Promise<GetProblemResponse> {
  const res = await fetch(`${API_URL}/api/coding/problems/${problemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ problem?: CodingProblem }>(res);
  return {
    success: true,
    problem: result.problem,
  };
}

/**
 * Submit code for a problem
 */
export async function submitCode(
  submissionData: SubmitCodeRequest,
  token: string
): Promise<SubmitCodeResponse> {
  const res = await fetch(`${API_URL}/api/coding/submissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(submissionData),
  });

  const result = await handleResponse<{ submission?: CodeSubmission }>(res);
  return {
    success: true,
    submission: result.submission,
  };
}

/**
 * Get user's code submissions
 */
export async function getSubmissions(token: string): Promise<GetSubmissionsResponse> {
  const res = await fetch(`${API_URL}/api/coding/submissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ submissions?: CodeSubmission[] }>(res);
  return {
    success: true,
    submissions: result.submissions,
  };
}

/**
 * Get user's coding progress
 */
export async function getProgress(token: string): Promise<GetProgressResponse> {
  const res = await fetch(`${API_URL}/api/coding/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ progress?: StudentProgress }>(res);
  return {
    success: true,
    progress: result.progress,
  };
}

/**
 * Toggle difficulty preference for a problem
 */
export async function toggleDifficulty(
  problemId: string,
  token: string
): Promise<ToggleDifficultyResponse> {
  const res = await fetch(`${API_URL}/api/coding/problems/${problemId}/difficulty-preference`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Difficulty preference updated',
  };
}