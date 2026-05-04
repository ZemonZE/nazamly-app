import { API_URL } from '@/firebase';
import { Platform } from 'react-native';

export interface AIScheduleEntry {
  courseCode: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: string;
  group: string;
  location: string;
}

export interface AIScheduleResult {
  success: boolean;
  schedule: AIScheduleEntry[];
  conflictWarnings?: string[];
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

export interface ImportFromImageResponse {
  success: boolean;
  data?: {
    entries: any[];
  };
  error?: string;
}

export interface TimeTableEntry {
  _id?: string;
  courseCode: string;
  courseName?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: string;
  group?: string;
  location?: string;
  professor?: string;
  isActive?: boolean;
}

export interface TimeTable {
  _id: string;
  userId: string;
  title: string;
  entries: TimeTableEntry[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MyTimetableResponse {
  success: boolean;
  data?: {
    activeTimetable?: TimeTable;
    timetables: TimeTable[];
  };
  message?: string;
}

export interface AddTimeTableEntryRequest {
  courseCode: string;
  courseName?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: string;
  group?: string;
  location?: string;
  professor?: string;
}

export interface AddTimeTableEntryResponse {
  success: boolean;
  data?: TimeTableEntry;
  message?: string;
}

export interface GetTimeTableResponse {
  success: boolean;
  data?: TimeTable;
  message?: string;
}

export interface AddOrUpdateScheduleRequest {
  entries: TimeTableEntry[];
  title?: string;
}

export interface AddOrUpdateScheduleResponse {
  success: boolean;
  data?: TimeTable;
  message?: string;
}

export interface GetMyScheduleResponse {
  success: boolean;
  data?: TimeTableEntry[];
  message?: string;
}

export interface DeleteSessionResponse {
  success: boolean;
  message?: string;
}

/**
 * Generate an AI schedule from uploaded course materials/images
 */
export async function generateSchedule(
  files: Array<{ uri: string; mimeType: string; name: string; file?: any }>,
  targetCourses: string[],
  token: string
): Promise<AIScheduleResult> {
  const formData = new FormData();

  // Add files to FormData
  files.forEach((file, index) => {
    if (Platform.OS === 'web' && file.file) {
      formData.append(`scheduleFiles`, file.file);
    } else {
      formData.append(`scheduleFiles`, { uri: file.uri, type: file.mimeType, name: file.name } as any);
    }
  });

  // Add target courses
  formData.append('targetCourses', JSON.stringify(targetCourses));

  const res = await fetch(`${API_URL}/api/ai/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await handleResponse<{ data: AIScheduleResult }>(res);
  return result.data || { success: false, schedule: [] };
}

/**
 * Save an AI-generated schedule to user's account
 */
export async function saveAISchedule(
  schedule: AIScheduleEntry[],
  token: string
): Promise<{ success: boolean; scheduleId?: string }> {
  const res = await fetch(`${API_URL}/api/schedule/save-ai`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ schedule }),
  });

  const result = await handleResponse<{ data: { success: boolean; scheduleId?: string } }>(res);
  return result.data || { success: false };
}

/**
 * Import a schedule from an image using OCR
 */
export async function importScheduleFromImage(
  fileUri: string,
  mimeType: string,
  fileName: string,
  token: string,
  fileObj?: any
): Promise<ImportFromImageResponse> {
  const formData = new FormData();

  if (Platform.OS === 'web' && fileObj) {
    formData.append('file', fileObj);
  } else {
    formData.append('file', { uri: fileUri, type: mimeType, name: fileName } as any);
  }

  const res = await fetch(`${API_URL}/api/schedule/import-from-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const result = await handleResponse<{ data: ImportFromImageResponse }>(res);
  return result.data || { success: false };
}

/**
 * Get user's complete timetable including AI-generated schedules
 */
export async function getMyTimetable(token: string): Promise<MyTimetableResponse> {
  const res = await fetch(`${API_URL}/api/schedule/my-timetable`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: MyTimetableResponse['data'] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Add a new entry to the timetable manually
 */
export async function addTimeTableEntry(
  entry: AddTimeTableEntryRequest,
  token: string
): Promise<AddTimeTableEntryResponse> {
  const res = await fetch(`${API_URL}/api/schedule/add-entry`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  });

  const result = await handleResponse<{ data: TimeTableEntry }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Get a specific timetable by ID
 */
export async function getTimeTable(
  timeTableId: string,
  token: string
): Promise<GetTimeTableResponse> {
  const res = await fetch(`${API_URL}/api/schedule/timetable/${timeTableId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: TimeTable }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Add or update user's schedule (legacy endpoint)
 */
export async function addOrUpdateSchedule(
  scheduleData: AddOrUpdateScheduleRequest,
  token: string
): Promise<AddOrUpdateScheduleResponse> {
  const res = await fetch(`${API_URL}/api/schedule/AddOrUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scheduleData),
  });

  const result = await handleResponse<{ data: TimeTable }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Get user's active schedule (legacy endpoint)
 */
export async function getMySchedule(token: string): Promise<GetMyScheduleResponse> {
  const res = await fetch(`${API_URL}/api/schedule/my-schedule`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleResponse<{ data: TimeTableEntry[] }>(res);
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Delete a specific session from schedule
 */
export async function deleteSession(
  sessionId: string,
  token: string
): Promise<DeleteSessionResponse> {
  const res = await fetch(`${API_URL}/api/schedule/session/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<any>(res);
  return {
    success: true,
    message: 'Session deleted successfully',
  };
}