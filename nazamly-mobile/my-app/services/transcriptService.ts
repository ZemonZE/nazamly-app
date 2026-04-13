import { API_URL } from '@/firebase';
import { Platform } from 'react-native';

export interface ExtractedCourse {
  courseCode: string;
  courseName?: string;
  mark: number;
  gradePoints: number;
  creditHours: number;
  semester?: string;
}

export interface TranscriptResult {
  transcriptId: string;
  status: 'completed' | 'failed' | 'processing';
  extractedCourses: ExtractedCourse[];
  termGPA: number;
  totalCreditHours: number;
  ocrConfidence: number;
  errorMessage?: string;
}

export interface TranscriptHistoryItem {
  id: string;
  fileName: string;
  status: string;
  termGPA: number;
  totalCreditHours: number;
  createdAt: string;
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

export async function uploadTranscript(
  fileUri: string,
  mimeType: string,
  fileName: string,
  token: string,
  fileObj?: any
): Promise<TranscriptResult> {
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

  const result = await handleResponse<{ data: TranscriptResult }>(res);
  return result.data;
}

export async function getTranscriptHistory(token: string): Promise<TranscriptHistoryItem[]> {
  const res = await fetch(`${API_URL}/api/gpa/transcripts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await handleResponse<{ data: TranscriptHistoryItem[] }>(res);
  return result.data;
}

export async function getTranscriptById(id: string, token: string): Promise<TranscriptResult> {
  const res = await fetch(`${API_URL}/api/gpa/transcripts/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await handleResponse<{ data: TranscriptResult }>(res);
  return result.data;
}

export async function deleteTranscript(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/gpa/transcripts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await handleResponse<any>(res);
}

export async function updateTranscript(
  id: string,
  courses: Partial<ExtractedCourse>[],
  token: string
): Promise<any> {
  const res = await fetch(`${API_URL}/api/gpa/transcripts/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ courses }),
  });
  return handleResponse<any>(res);
}
