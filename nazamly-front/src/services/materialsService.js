import { auth, API_URL } from "../firebase";

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function authHeadersMultipart() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * GET /api/course-materials/my-courses
 * Returns material folders for the user's term courses.
 */
export async function getMyCoursesMaterials() {
  const res = await fetch(`${API_URL}/api/course-materials/my-courses`, {
    headers: await authHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load course materials");
  return json.courses;
}

/**
 * GET /api/course-materials/:courseCode/files/:subFolderType
 * List files in a sub-folder (lectures, sections, etc.)
 */
export async function getSubFolderFiles(courseCode, subFolderType) {
  const res = await fetch(
    `${API_URL}/api/course-materials/${encodeURIComponent(courseCode)}/files/${subFolderType}`,
    { headers: await authHeaders() },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to list files");
  return json;
}

/**
 * POST /api/course-materials/:courseCode/upload/:subFolderType
 * Upload a file to a sub-folder.
 */
export async function uploadToSubFolder(courseCode, subFolderType, file, title) {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);

  const res = await fetch(
    `${API_URL}/api/course-materials/${encodeURIComponent(courseCode)}/upload/${subFolderType}`,
    {
      method: "POST",
      headers: await authHeadersMultipart(),
      body: formData,
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to upload file");
  return json;
}

/**
 * POST /api/course-materials/init
 * Initialize Drive folder structure for a course.
 */
export async function initCourseFolders(courseCode, courseName) {
  const res = await fetch(`${API_URL}/api/course-materials/init`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ courseCode, courseName }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to initialize course");
  return json.course;
}
