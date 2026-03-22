import { fetchWithAuth } from './api';

export async function getMyCoursesMaterials() {
  const json = await fetchWithAuth('/api/course-materials/my-courses');
  return json.courses;
}

export async function getSubFolderFiles(courseCode, subFolderType) {
  return fetchWithAuth(
    `/api/course-materials/${encodeURIComponent(courseCode)}/files/${subFolderType}`
  );
}

export async function uploadToSubFolder(courseCode, subFolderType, file, title) {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);

  return fetchWithAuth(
    `/api/course-materials/${encodeURIComponent(courseCode)}/upload/${subFolderType}`,
    { method: 'POST', body: formData }
  );
}

export async function initCourseFolders(courseCode, courseName) {
  const json = await fetchWithAuth('/api/course-materials/init', {
    method: 'POST',
    body: JSON.stringify({ courseCode, courseName }),
  });
  return json.course;
}
