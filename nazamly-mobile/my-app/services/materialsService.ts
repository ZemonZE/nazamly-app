import { API_URL } from '@/firebase';
import { Platform } from 'react-native';

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

export interface Chapter {
  _id: string;
  courseInstanceId: string;
  title: string;
  description?: string;
  order: number;
  createdAt: string;
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

export interface CreateChapterRequest {
  courseInstanceId: string;
  title: string;
  description?: string;
  order: number;
}

export interface CreateChapterResponse {
  success: boolean;
  data?: Chapter;
  message?: string;
}

export interface GetChaptersResponse {
  success: boolean;
  data?: Chapter[];
  message?: string;
}

export interface DeleteChapterResponse {
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

// ── Folders ──

/**
 * Create a new materials folder
 */
export async function createFolder(
  folderData: CreateFolderRequest,
  token: string
): Promise<CreateFolderResponse> {
  const res = await fetch(`${API_URL}/api/materials/folders`, {
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
 * Get all materials folders for a specific course instance
 */
export async function getFolders(
  courseInstanceId: string,
  token: string
): Promise<GetFoldersResponse> {
  const res = await fetch(`${API_URL}/api/materials/folders/${courseInstanceId}`, {
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
export async function deleteFolder(
  folderId: string,
  token: string
): Promise<DeleteFolderResponse> {
  const res = await fetch(`${API_URL}/api/materials/folders/${folderId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Folder deleted successfully',
  };
}

// ── Files ──

/**
 * Upload a material file
 */
export async function uploadFile(
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

  const res = await fetch(`${API_URL}/api/materials/files`, {
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
 * Get all files inside a specific folder
 */
export async function getFiles(
  folderId: string,
  token: string
): Promise<GetFilesResponse> {
  const res = await fetch(`${API_URL}/api/materials/files/${folderId}`, {
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
export async function deleteFile(
  fileId: string,
  token: string
): Promise<DeleteFileResponse> {
  const res = await fetch(`${API_URL}/api/materials/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'File deleted successfully',
  };
}

// ── Chapters ──

/**
 * Create a new chapter entry
 */
export async function createChapter(
  chapterData: CreateChapterRequest,
  token: string
): Promise<CreateChapterResponse> {
  const res = await fetch(`${API_URL}/api/materials/chapters`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(chapterData),
  });

  const result = await handleResponse<{ data: Chapter }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Get all chapters for a specific course instance
 */
export async function getChapters(
  courseInstanceId: string,
  token: string
): Promise<GetChaptersResponse> {
  const res = await fetch(`${API_URL}/api/materials/chapters/${courseInstanceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: Chapter[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Delete a chapter entry
 */
export async function deleteChapter(
  chapterId: string,
  token: string
): Promise<DeleteChapterResponse> {
  const res = await fetch(`${API_URL}/api/materials/chapters/${chapterId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Chapter deleted successfully',
  };
}