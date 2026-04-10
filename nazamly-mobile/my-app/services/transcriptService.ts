import { API_URL } from '@/firebase';

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

export async function uploadTranscript(
  fileUri: string,
  mimeType: string,
  fileName: string,
  token: string
): Promise<TranscriptResult> {
  const formData = new FormData();
  formData.append('transcript', {
    uri: fileUri,
    type: mimeType,
    name: fileName,
  } as any);

  const response = await fetch(`${API_URL}/api/gpa/upload-transcript`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.message || 'Upload failed');
  }

  return body.data as TranscriptResult;
}

export async function getTranscriptHistory(token: string): Promise<TranscriptHistoryItem[]> {
  const response = await fetch(`${API_URL}/api/gpa/transcripts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Failed to fetch history');
  return body.data as TranscriptHistoryItem[];
}

export async function getTranscriptById(id: string, token: string): Promise<TranscriptResult> {
  const response = await fetch(`${API_URL}/api/gpa/transcripts/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Not found');
  return body.data as TranscriptResult;
}

export async function deleteTranscript(id: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/gpa/transcripts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.message || 'Delete failed');
  }
}
