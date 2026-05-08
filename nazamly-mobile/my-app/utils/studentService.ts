import { apiPost } from './apiClient';

export interface StudentRegistrationData {
  fullName: string;
  studentCode: string;
  completedHours: number;
  cgpa: number;
  academicYear: number;
  department: string;
  registeredCourses: string[];
}

export interface StudentServiceResponse {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * Registers the student profile data on the backend.
 * @param data The student registration data from the onboarding form
 */
export async function registerStudentProfile(
  data: StudentRegistrationData
): Promise<StudentServiceResponse> {
  try {
    return await apiPost<StudentServiceResponse>('/students/register', data);
  } catch (error: any) {
    console.error('Error registering student profile:', error);
    throw error;
  }
}
