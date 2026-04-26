import { API_URL } from '@/firebase';

export interface CourseMaterial {
  courseCode: string;
  courseName: string;
  driveFolderId?: string;
  initialized: boolean;
  lastSync?: string;
}

export interface CourseFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  downloadUrl?: string;
}

export interface GetMyCoursesMaterialsResponse {
  success: boolean;
  data?: CourseMaterial[];
  message?: string;
}

export interface GetSubFolderFilesResponse {
  success: boolean;
  data?: CourseFile[];
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
 * Get courses with initialized Drive folders
 */
export async function getMyCoursesMaterials(token: string): Promise<GetMyCoursesMaterialsResponse> {
  const res = await fetch(`${API_URL}/api/course-materials/my-courses`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: CourseMaterial[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * List files in a specific sub-folder of a course
 */
export async function getSubFolderFiles(
  courseCode: string,
  subFolderType: string,
  token: string
): Promise<GetSubFolderFilesResponse> {
  const res = await fetch(`${API_URL}/api/course-materials/${courseCode}/files/${subFolderType}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: CourseFile[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}