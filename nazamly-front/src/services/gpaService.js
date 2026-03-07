import { auth, API_URL } from "../firebase";

/**
 * Helper — returns an Authorization header with a fresh Firebase ID token.
 */
async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * POST /api/gpa/calculate
 *
 * Body: { courses: [{ courseCode, creditHours, mark (0-100), isRetake? }] }
 * Returns: { success, data: { termGPA, termHoursCalculated, oldCGPA, newCGPA } }
 */
export async function calculateTermGPA(courses) {
  const res = await fetch(`${API_URL}/api/gpa/calculate`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ courses }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Calculation failed");
  return json.data;
}

/**
 * POST /api/gpa/target-strategy
 *
 * Body: { targetCGPA, courses: [{ courseCode, creditHours }] }
 * Returns: { success, data: { targetCGPA, requiredTermAverageGPA, plan } }
 */
export async function generateTargetPlan(targetCGPA, courses) {
  const res = await fetch(`${API_URL}/api/gpa/target-strategy`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ targetCGPA, courses }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Strategy generation failed");
  return json.data;
}

/**
 * Update the student's cumulative GPA profile on the server.
 */
export async function updateGpaProfile(cgpa, completedHours) {
  const res = await fetch(`${API_URL}/api/auth/profile`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ cgpa, completedHours }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Profile update failed");
  return json;
}

/* ═══════════════════════════════════════
   Term Courses CRUD
═══════════════════════════════════════ */

/**
 * GET /api/gpa/my-courses
 * Returns the user's saved term courses array.
 */
export async function getTermCourses() {
  const res = await fetch(`${API_URL}/api/gpa/my-courses`, {
    headers: await authHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to load courses");
  return json.data; // [{ _id, name, courseCode, creditHours }]
}

/**
 * POST /api/gpa/my-courses
 * Body: { name, courseCode, creditHours }
 * Returns the updated courses array.
 */
export async function addTermCourse(name, courseCode, creditHours) {
  const res = await fetch(`${API_URL}/api/gpa/my-courses`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ name, courseCode, creditHours }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to add course");
  return json.data;
}

/**
 * DELETE /api/gpa/my-courses/:courseId
 * Returns the updated courses array.
 */
export async function removeTermCourse(courseId) {
  const res = await fetch(`${API_URL}/api/gpa/my-courses/${courseId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to remove course");
  return json.data;
}
