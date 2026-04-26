import { API_URL } from '@/firebase';

export interface AIQuestion {
  _id?: string;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  type: 'mcq' | 'tf';
  difficulty?: number;
  derivedFromConcept?: string;
  explanation?: string;
  isCorrect?: boolean;
  studentAnswer?: string;
  aiConfidenceScore?: number;
}

export interface QuizHistoryItem {
  _id: string;
  courseId?: { courseName: string; courseCode: string };
  score: number;
  totalQuestions: number;
  createdAt: string;
  questionsSnapshot: AIQuestion[];
}

export interface QuizHistoryResponse {
  success: boolean;
  data?: QuizHistoryItem[];
  message?: string;
}

export interface GenerateExamRequest {
  courseId: string;
  examType: 'Quiz' | 'Midterm' | 'Final';
  questionCount: number;
  materialFileIds: string[];
}

export interface GenerateExamResponse {
  success: boolean;
  questions?: AIQuestion[];
  message?: string;
}

export interface SubmitQuizRequest {
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

export interface SubmitQuizResponse {
  success: boolean;
  attempt?: {
    questionsSnapshot: AIQuestion[];
  };
  message?: string;
}

export interface AnalyzeStyleRequest {
  courseId: string;
}

export interface AnalyzeStyleResponse {
  success: boolean;
  data?: {
    professorStyle: any;
    analysis: string;
  };
  message?: string;
}

export interface GetArchivedQuestionsResponse {
  success: boolean;
  data?: any[];
  message?: string;
}

// ── Shared response handler (consistent with other services) ──
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
 * Get quiz history
 */
export async function getQuizHistory(token: string): Promise<QuizHistoryResponse> {
  const res = await fetch(`${API_URL}/api/student/quizzes/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<QuizHistoryResponse>(res);
}

/**
 * Generate exam questions (streaming)
 */
export async function generateExamStream(
  params: GenerateExamRequest,
  token: string,
  onProgress?: (status: string) => void
): Promise<AIQuestion[]> {
  const url = `${API_URL}/api/questions/generate-stream?courseId=${params.courseId}&examType=${params.examType}&questionCount=${params.questionCount}&materialFileIds=${params.materialFileIds.join(',')}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await handleResponse<never>(res).catch((e: Error) => { throw e; });
  }

  // Handle SSE streaming
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let questions: AIQuestion[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.status === 'generating' && onProgress) {
            onProgress(data.message || 'Generating questions...');
          } else if (data.status === 'ready') {
            questions = data.questions || [];
          } else if (data.status === 'error') {
            throw new Error(data.message || 'Generation failed');
          }
        } catch (parseErr) {
          // Ignore JSON parse errors from partial SSE chunks
        }
      }
    }
  }

  if (questions.length === 0) {
    // Try parsing the entire buffer as JSON (fallback)
    try {
      const fallback = JSON.parse(buffer);
      if (fallback.questions) {
        questions = fallback.questions;
      } else {
        throw new Error('No questions in response');
      }
    } catch {
      throw new Error('Failed to parse exam questions from the server.');
    }
  }

  return questions;
}

/**
 * Submit quiz answers
 */
export async function submitQuiz(
  data: SubmitQuizRequest,
  token: string
): Promise<SubmitQuizResponse> {
  const res = await fetch(`${API_URL}/api/student/quizzes/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<SubmitQuizResponse>(res);
}

/**
 * Analyze professor's style from historical exam questions
 */
export async function analyzeStyle(
  params: AnalyzeStyleRequest,
  token: string
): Promise<AnalyzeStyleResponse> {
  const res = await fetch(`${API_URL}/api/questions/analyze-style`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const result = await handleResponse<{ data: AnalyzeStyleResponse['data'] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Get archived past exams
 */
export async function getArchivedQuestions(token: string): Promise<GetArchivedQuestionsResponse> {
  const res = await fetch(`${API_URL}/api/questions/archive`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: any[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}