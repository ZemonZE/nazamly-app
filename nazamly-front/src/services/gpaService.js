import { fetchWithAuth } from './api';

export async function calculateTermGPA(courses) {
  const data = await fetchWithAuth('/api/gpa/calculate', {
    method: 'POST',
    body: JSON.stringify({ courses }),
  });
  return data.data;
}

export async function generateTargetPlan(targetCGPA, courses) {
  const data = await fetchWithAuth('/api/gpa/target-strategy', {
    method: 'POST',
    body: JSON.stringify({ targetCGPA, courses }),
  });
  return data.data;
}

export async function updateGpaProfile(cgpa, completedHours) {
  return fetchWithAuth('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ cgpa, completedHours }),
  });
}

export async function getTermCourses() {
  const data = await fetchWithAuth('/api/gpa/my-courses');
  return data.data;
}

export async function addTermCourse(name, courseCode, creditHours) {
  const data = await fetchWithAuth('/api/gpa/my-courses', {
    method: 'POST',
    body: JSON.stringify({ name, courseCode, creditHours }),
  });
  return data.data;
}

export async function removeTermCourse(courseId) {
  const data = await fetchWithAuth(`/api/gpa/my-courses/${courseId}`, {
    method: 'DELETE',
  });
  return data.data;
}
