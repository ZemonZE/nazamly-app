import { API_URL } from '@/firebase';
import { Platform } from 'react-native';

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

export interface Doctor {
  _id: string;
  name: string;
  email: string;
  department?: string;
  specialization?: string;
  isActive?: boolean;
}

export interface CourseInstance {
  _id: string;
  courseId: Course;
  semesterId: string;
  doctorId: Doctor;
  schedule?: any[];
  isActive?: boolean;
}

export interface MaterialFolder {
  _id: string;
  courseInstanceId: string;
  name: string;
  type: 'lectures' | 'assignments' | 'resources' | 'other';
  createdAt: string;
  updatedAt: string;
}

export interface MaterialFile {
  _id: string;
  folderId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  createdAt: string;
}

export interface CourseMaterial {
  courseCode: string;
  courseName: string;
  driveFolderId?: string;
  initialized: boolean;
  lastSync?: string;
}

// ── Response Types ──

export interface GetCoursesResponse {
  success: boolean;
  data?: Course[];
  message?: string;
}

export interface CreateCourseRequest {
  courseCode: string;
  courseName: string;
  department?: string;
  creditHours: number;
  description?: string;
  prerequisites?: string[];
}

export interface CreateCourseResponse {
  success: boolean;
  data?: Course;
  message?: string;
}

export interface UpdateCourseResponse {
  success: boolean;
  data?: Course;
  message?: string;
}

export interface DeleteCourseResponse {
  success: boolean;
  message?: string;
}

export interface GetDoctorsResponse {
  success: boolean;
  data?: Doctor[];
  message?: string;
}

export interface CreateDoctorRequest {
  name: string;
  email: string;
  department?: string;
  specialization?: string;
}

export interface CreateDoctorResponse {
  success: boolean;
  data?: Doctor;
  message?: string;
}

export interface DeleteDoctorResponse {
  success: boolean;
  message?: string;
}

export interface GetCourseInstancesResponse {
  success: boolean;
  data?: CourseInstance[];
  message?: string;
}

export interface CreateCourseInstanceRequest {
  courseId: string;
  semesterId: string;
  doctorId: string;
  schedule?: any[];
}

export interface CreateCourseInstanceResponse {
  success: boolean;
  data?: CourseInstance;
  message?: string;
}

export interface UpdateCourseInstanceResponse {
  success: boolean;
  data?: CourseInstance;
  message?: string;
}

export interface DeleteCourseInstanceResponse {
  success: boolean;
  message?: string;
}

export interface CreateFolderRequest {
  courseInstanceId: string;
  name: string;
  type: 'lectures' | 'assignments' | 'resources' | 'other';
}

export interface CreateFolderResponse {
  success: boolean;
  data?: MaterialFolder;
  message?: string;
}

export interface GetFoldersResponse {
  success: boolean;
  data?: MaterialFolder[];
  message?: string;
}

export interface DeleteFolderResponse {
  success: boolean;
  message?: string;
}

export interface UploadFileRequest {
  folderId: string;
  file: { uri: string; name: string; mimeType: string; file?: any };
}

export interface UploadFileResponse {
  success: boolean;
  data?: MaterialFile;
  message?: string;
}

export interface GetFilesResponse {
  success: boolean;
  data?: MaterialFile[];
  message?: string;
}

export interface DeleteFileResponse {
  success: boolean;
  message?: string;
}

export interface GetCourseMaterialsResponse {
  success: boolean;
  data?: CourseMaterial[];
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

// ── Courses ──

/**
 * Get all courses
 */
export async function getCourses(token: string): Promise<GetCoursesResponse> {
  const res = await fetch(`${API_URL}/api/admin/courses`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: Course[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Create a new course
 */
export async function createCourse(
  courseData: CreateCourseRequest,
  token: string
): Promise<CreateCourseResponse> {
  const res = await fetch(`${API_URL}/api/admin/courses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(courseData),
  });

  const result = await handleResponse<{ data: Course }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Update an existing course
 */
export async function updateCourse(
  courseId: string,
  courseData: Partial<CreateCourseRequest>,
  token: string
): Promise<UpdateCourseResponse> {
  const res = await fetch(`${API_URL}/api/admin/courses/${courseId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(courseData),
  });

  const result = await handleResponse<{ data: Course }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Delete a course
 */
export async function deleteCourse(
  courseId: string,
  token: string
): Promise<DeleteCourseResponse> {
  const res = await fetch(`${API_URL}/api/admin/courses/${courseId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Course deleted successfully',
  };
}

// ── Doctors ──

/**
 * Get all doctors
 */
export async function getDoctors(token: string): Promise<GetDoctorsResponse> {
  const res = await fetch(`${API_URL}/api/admin/doctors`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: Doctor[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Create a new doctor profile
 */
export async function createDoctor(
  doctorData: CreateDoctorRequest,
  token: string
): Promise<CreateDoctorResponse> {
  const res = await fetch(`${API_URL}/api/admin/doctors`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(doctorData),
  });

  const result = await handleResponse<{ data: Doctor }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Delete a doctor profile
 */
export async function deleteDoctor(
  doctorId: string,
  token: string
): Promise<DeleteDoctorResponse> {
  const res = await fetch(`${API_URL}/api/admin/doctors/${doctorId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Doctor deleted successfully',
  };
}

// ── Course Instances ──

/**
 * Get course instances for a semester
 */
export async function getCourseInstances(
  semesterId?: string,
  token: string
): Promise<GetCourseInstancesResponse> {
  const url = semesterId
    ? `${API_URL}/api/admin/course-instances?semesterId=${semesterId}`
    : `${API_URL}/api/admin/course-instances`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: CourseInstance[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Create a new course instance
 */
export async function createCourseInstance(
  instanceData: CreateCourseInstanceRequest,
  token: string
): Promise<CreateCourseInstanceResponse> {
  const res = await fetch(`${API_URL}/api/admin/course-instances`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(instanceData),
  });

  const result = await handleResponse<{ data: CourseInstance }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Update a course instance
 */
export async function updateCourseInstance(
  instanceId: string,
  instanceData: Partial<CreateCourseInstanceRequest>,
  token: string
): Promise<UpdateCourseInstanceResponse> {
  const res = await fetch(`${API_URL}/api/admin/course-instances/${instanceId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(instanceData),
  });

  const result = await handleResponse<{ data: CourseInstance }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Delete a course instance
 */
export async function deleteCourseInstance(
  instanceId: string,
  token: string
): Promise<DeleteCourseInstanceResponse> {
  const res = await fetch(`${API_URL}/api/admin/course-instances/${instanceId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Course instance deleted successfully',
  };
}

// ── Materials Folders ──

/**
 * Create a new materials folder
 */
export async function createMaterialsFolder(
  folderData: CreateFolderRequest,
  token: string
): Promise<CreateFolderResponse> {
  const res = await fetch(`${API_URL}/api/admin/materials/folders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(folderData),
  });

  const result = await handleResponse<{ data: MaterialFolder }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Get folders for a specific course instance
 */
export async function getMaterialsFolders(
  courseInstanceId: string,
  token: string
): Promise<GetFoldersResponse> {
  const res = await fetch(`${API_URL}/api/admin/materials/folders/${courseInstanceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: MaterialFolder[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Delete a materials folder
 */
export async function deleteMaterialsFolder(
  folderId: string,
  token: string
): Promise<DeleteFolderResponse> {
  const res = await fetch(`${API_URL}/api/admin/materials/folders/${folderId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Folder deleted successfully',
  };
}

// ── Materials Files ──

/**
 * Upload a material file
 */
export async function uploadMaterialsFile(
  fileData: UploadFileRequest,
  token: string
): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append('folderId', fileData.folderId);

  if (Platform.OS === 'web' && fileData.file.file) {
    formData.append('file', fileData.file.file);
  } else {
    formData.append('file', {
      uri: fileData.file.uri,
      type: fileData.file.mimeType,
      name: fileData.file.name
    } as any);
  }

  const res = await fetch(`${API_URL}/api/admin/materials/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await handleResponse<{ data: MaterialFile }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Get files inside a specific folder
 */
export async function getMaterialsFiles(
  folderId: string,
  token: string
): Promise<GetFilesResponse> {
  const res = await fetch(`${API_URL}/api/admin/materials/files/${folderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: MaterialFile[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Delete a material file
 */
export async function deleteMaterialsFile(
  fileId: string,
  token: string
): Promise<DeleteFileResponse> {
  const res = await fetch(`${API_URL}/api/admin/materials/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'File deleted successfully',
  };
}

// ── Course Materials ──

/**
 * Get all course materials overviews
 */
export async function getCourseMaterialsAdmin(token: string): Promise<GetCourseMaterialsResponse> {
  const res = await fetch(`${API_URL}/api/admin/course-materials`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: CourseMaterial[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}