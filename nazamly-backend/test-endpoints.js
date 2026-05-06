const endpoints = [
  { method: 'POST', path: '/api/auth/sync' },
  { method: 'GET', path: '/api/auth/get-profile' },
  { method: 'POST', path: '/api/auth/setup-profile' },
  { method: 'GET', path: '/api/auth/student-card' },
  { method: 'POST', path: '/api/auth/upload-student-card' },
  { method: 'POST', path: '/api/auth/upload-photo' },

  { method: 'POST', path: '/api/schedule/import-from-image' },
  { method: 'POST', path: '/api/ai/generate' },
  { method: 'POST', path: '/api/schedule/save-ai' },

  { method: 'GET', path: '/api/course-materials/my-courses' },
  { method: 'GET', path: '/api/materials/folders/test_id' },
  { method: 'GET', path: '/api/materials/files/test_id' },

  { method: 'GET', path: '/api/student/quizzes/history' },
  { method: 'GET', path: '/api/questions/generate-stream' },
  { method: 'POST', path: '/api/student/quizzes/submit' },

  { method: 'POST', path: '/api/gpa/upload-transcript' },
  { method: 'GET', path: '/api/gpa/transcripts' },
  { method: 'DELETE', path: '/api/gpa/transcripts/test_id' },
  { method: 'GET', path: '/api/gpa/my-courses' },
  { method: 'POST', path: '/api/gpa/my-courses' },
  { method: 'DELETE', path: '/api/gpa/my-courses/test_id' },
  { method: 'POST', path: '/api/gpa/target-strategy' },

  { method: 'GET', path: '/api/coding/problems' },
  { method: 'POST', path: '/api/coding/submissions' },
  { method: 'GET', path: '/api/coding/progress' }
];

const BASE_URL = 'http://localhost:5000';

async function testEndpoints() {
  console.log('Testing Endpoints...');
  const results = [];
  
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${ep.path}`, {
        method: ep.method,
        headers: {
          'Authorization': 'Bearer dummy_token',
          'Content-Type': 'application/json'
        }
      });
      results.push({ ...ep, status: res.status, statusText: res.statusText, works: res.status !== 404 });
    } catch (e) {
      results.push({ ...ep, error: e.message, works: false });
    }
  }

  const missing = results.filter(r => !r.works);
  const existing = results.filter(r => r.works);

  console.log('\n--- Endpoints that are MISSING or NOT WORKING (404 or connection error) ---');
  missing.forEach(m => {
    console.log(`[${m.method}] ${m.path} -> ${m.error ? 'Error: ' + m.error : m.status + ' ' + m.statusText}`);
  });

  console.log('\n--- Endpoints that EXIST (Return 401/403/200/500, etc) ---');
  existing.forEach(e => {
    console.log(`[${e.method}] ${e.path} -> ${e.status} ${e.statusText}`);
  });

  console.log(`\nSummary: ${existing.length} exist, ${missing.length} missing/broken.`);
}

testEndpoints();
