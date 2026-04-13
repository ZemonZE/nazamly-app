import axios from 'axios';
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

export async function uploadTranscript(
  fileUri: string,
  mimeType: string,
  fileName: string,
  token: string,
  fileObj?: any
): Promise<TranscriptResult> {
  const formData = new FormData();

  if (Platform.OS === 'web' && fileObj) {
    // For Web: Append the raw browser File object directly
    formData.append('transcript', fileObj); 
  } else {
    // For Native: Append the React Native file descriptor object
    formData.append('transcript', {
      uri: fileUri,
      type: mimeType,
      name: fileName,
    } as any);
  }

  const response = await fetch(`${API_URL}/api/gpa/upload-transcript`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Upload failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.message) {
        errorMessage = errorData.error ? `${errorData.message} | ${errorData.error}` : errorData.message;
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // Ignore JSON parse errors for non-JSON responses
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result.data as TranscriptResult;
}

export async function getTranscriptHistory(token: string): Promise<TranscriptHistoryItem[]> {
  const response = await axios.get(`${API_URL}/api/gpa/transcripts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data as TranscriptHistoryItem[];
}

export async function getTranscriptById(id: string, token: string): Promise<TranscriptResult> {
  const response = await axios.get(`${API_URL}/api/gpa/transcripts/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data as TranscriptResult;
}

export async function deleteTranscript(id: string, token: string): Promise<void> {
  try {
    await axios.delete(`${API_URL}/api/gpa/transcripts/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err: any) {
    const message = err?.response?.data?.message || err?.message || 'Delete failed';
    throw new Error(message);
  }
}

export async function updateTranscript(
  id: string,
  courses: Partial<ExtractedCourse>[],
  token: string
): Promise<any> {
  const response = await axios.patch(
    `${API_URL}/api/gpa/transcripts/${id}`,
    { courses },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}
