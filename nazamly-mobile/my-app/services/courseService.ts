import { API_URL } from '@/firebase';

export interface Course {
  _id: string;
  courseCode: string;
  courseName: string;
  department?: string;
  creditHours: number;
  description?: string;
  prerequisites?: string[];
  isActive?: boolean;
}

export interface GetAllCoursesResponse {
  success: boolean;
  data?: Course[];
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
 * Get all available courses
 */
export async function getAllCourses(token: string): Promise<GetAllCoursesResponse> {
  const res = await fetch(`${API_URL}/api/course/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: Course[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}