import { API_URL } from '@/firebase';

export interface QuizSubmissionRequest {
  courseId: string;
  totalQuestions: number;
  questionsSnapshot: {
    questionText: string;
    options?: string[];
    correctAnswer: string;
    studentAnswer: string;
    isCorrect: boolean;
    explanation: string;
    difficulty?: number;
    derivedFromConcept?: string;
  }[];
}

export interface QuizSubmissionResponse {
  success: boolean;
  attempt?: {
    questionsSnapshot: any[];
  };
  message?: string;
}

export interface QuizHistoryResponse {
  success: boolean;
  history?: any[];
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
 * Submit quiz answers
 */
export async function submitQuiz(
  data: QuizSubmissionRequest,
  token: string
): Promise<QuizSubmissionResponse> {
  const res = await fetch(`${API_URL}/api/student/quizzes/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await handleResponse<{ attempt?: { questionsSnapshot: any[] } }>(res);
  return {
    success: true,
    attempt: result.attempt,
  };
}

/**
 * Get quiz history
 */
export async function getQuizHistory(token: string): Promise<QuizHistoryResponse> {
  const res = await fetch(`${API_URL}/api/student/quizzes/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ history?: any[] }>(res);
  return {
    success: true,
    history: result.history,
  };
}