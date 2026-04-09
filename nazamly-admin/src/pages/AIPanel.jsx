import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { API_URL, authHeaders, getAdminToken } from '../firebase';
import '../CSS/AIPanel.css';

function AIPanel() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseObj, setSelectedCourseObj] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [selectedLectures, setSelectedLectures] = useState([]);
  const [loadingLectures, setLoadingLectures] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [examType, setExamType] = useState('midterm');
  const [year, setYear] = useState(new Date().getFullYear());
  const [pdfFile, setPdfFile] = useState(null);

  const [ingestStatus, setIngestStatus] = useState(''); // '', 'loading', 'success', 'error'
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/courses`, { headers: await authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch courses');
      const data = await res.json();
      setCourses(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleCourseChange = async (e) => {
    const courseId = e.target.value;
    const course = courses.find((c) => c._id === courseId);
    
    setSelectedCourseObj(course || null);
    setSelectedLectures([]);
    setLectures([]);
    setIngestStatus('');
    setStatusMessage('');
    
    if (course) {
      setLoadingLectures(true);
      try {
        const res = await fetch(`${API_URL}/api/admin/course-materials/${course.courseCode}/files/lectures`, { headers: await authHeaders() });
        const data = await res.json();
        setLectures(data.files || []);
      } catch (err) {
        console.error("Failed to fetch lectures", err);
      } finally {
        setLoadingLectures(false);
      }
    }
  };

  const toggleLecture = (lectureId) => {
    setSelectedLectures((prev) =>
      prev.includes(lectureId)
        ? prev.filter((id) => id !== lectureId)
        : [...prev, lectureId],
    );
  };

  const handleUploadExam = async (e) => {
    e.preventDefault();
    if (!pdfFile || !selectedCourseObj || selectedLectures.length === 0 || !year) {
      setStatusMessage('Please fill all required fields: Course, Lectures, PDF, and Year.');
      setIngestStatus('error');
      return;
    }

    setIngestStatus('loading');
    setStatusMessage('Uploading PDF and extracting questions with Gemini AI... This can take 30-60 seconds.');

    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('courseId', selectedCourseObj._id);
      formData.append('examType', examType);
      formData.append('year', year);

      selectedLectures.forEach(id => {
         formData.append('lectureIds', id);
      });

      const token = await getAdminToken();
      const res = await fetch(`${API_URL}/api/admin/upload-past-exam`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload exam');
      }

      setIngestStatus('success');
      setStatusMessage(data.message || 'Questions successfully ingested!');
      
      setPdfFile(null);
      if (document.getElementById('file-upload')) {
        document.getElementById('file-upload').value = null; // Clear visually
      }
      
    } catch (err) {
      setIngestStatus('error');
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="page-content">
      <PageHeader 
        title="AI Ingestion Engine" 
        description="Upload past exams (PDF), extract questions with Gemini, and map them directly into the ArchivedQuestion database."
      />

      <div style={{
          background: 'rgba(6, 78, 59, 0.4)',
          border: '1px solid rgba(52, 211, 153, 0.2)',
          borderRadius: '16px',
          padding: '30px',
          marginTop: '20px'
      }}>
        <h2 style={{ color: '#6ee7b7', margin: '0 0 20px', fontSize: '18px' }}>🤖 Google Gemini Pipeline</h2>

        <form onSubmit={handleUploadExam}>
          
          {/* Step 1: Course Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#a3c9b4', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>1. Select Target Course</label>
            <select 
              value={selectedCourseObj ? selectedCourseObj._id : ""} 
              onChange={handleCourseChange}
              disabled={coursesLoading || ingestStatus === 'loading'}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(6, 78, 59, 0.6)',
                border: '1px solid rgba(52, 211, 153, 0.2)',
                borderRadius: '8px',
                color: '#e8f9f0',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="">-- Choose a course --</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>
                  {c.courseCode} - {c.courseName}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Lecture Selection */}
          {selectedCourseObj && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#a3c9b4', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                2. Select Linked Material (Multiple Selection Allowed) 
                {loadingLectures && ' (Loading...)'}
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '10px'
              }}>
                {!loadingLectures && lectures.length === 0 && (
                  <p style={{ color: '#a3c9b4' }}>No lectures synced yet.</p>
                )}
                {!loadingLectures && lectures.map((lec) => (
                  <label
                    key={lec.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px',
                      background: selectedLectures.includes(lec.id) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 78, 59, 0.6)',
                      border: selectedLectures.includes(lec.id) ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(52, 211, 153, 0.2)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: selectedLectures.includes(lec.id) ? '#6ee7b7' : '#e8f9f0',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLectures.includes(lec.id)}
                      onChange={() => toggleLecture(lec.id)}
                      disabled={ingestStatus === 'loading'}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lec.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Exam Parameters */}
          {selectedLectures.length > 0 && (
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', color: '#a3c9b4', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>3. Exam Type</label>
                <select 
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  disabled={ingestStatus === 'loading'}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(6, 78, 59, 0.6)',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    borderRadius: '8px',
                    color: '#e8f9f0',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="midterm">Midterm</option>
                  <option value="final">Final</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', color: '#a3c9b4', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>4. Exam Year</label>
                <input 
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                  disabled={ingestStatus === 'loading'}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(6, 78, 59, 0.6)',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    borderRadius: '8px',
                    color: '#e8f9f0',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 4: PDF Upload */}
          {selectedLectures.length > 0 && (
             <div style={{ marginBottom: '30px' }}>
               <label style={{ display: 'block', color: '#a3c9b4', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>5. Upload Exam PDF</label>
               <input 
                 id="file-upload"
                 type="file"
                 accept="application/pdf"
                 onChange={(e) => setPdfFile(e.target.files[0])}
                 disabled={ingestStatus === 'loading'}
                 style={{
                   width: '100%',
                   padding: '12px 14px',
                   background: 'rgba(6, 78, 59, 0.6)',
                   border: '1px dashed rgba(52, 211, 153, 0.5)',
                   borderRadius: '8px',
                   color: '#e8f9f0',
                   cursor: 'pointer'
                 }}
               />
             </div>
          )}

          {/* Status Panel */}
          {statusMessage && (
            <div style={{
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
              background: ingestStatus === 'error' ? 'rgba(239, 68, 68, 0.15)' 
                          : ingestStatus === 'success' ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(59, 130, 246, 0.15)',
              border: ingestStatus === 'error' ? '1px solid rgba(239, 68, 68, 0.3)'
                      : ingestStatus === 'success' ? '1px solid rgba(16, 185, 129, 0.3)'
                      : '1px solid rgba(59, 130, 246, 0.3)',
              color: ingestStatus === 'error' ? '#fca5a5'
                     : ingestStatus === 'success' ? '#6ee7b7'
                     : '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontWeight: 500
            }}>
              {ingestStatus === 'loading' && <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid transparent', borderTopColor: '#93c5fd', borderRadius: '50%' }}></div>}
              {ingestStatus === 'success' && <span>✅</span>}
              {ingestStatus === 'error' && <span>⚠️</span>}
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
             <button
                type="submit"
                disabled={!pdfFile || selectedLectures.length === 0 || ingestStatus === 'loading'}
                className="ai-action-btn primary"
                style={{
                  fontSize: '16px',
                  padding: '12px 24px',
                  opacity: (!pdfFile || selectedLectures.length === 0 || ingestStatus === 'loading') ? 0.5 : 1,
                  cursor: (!pdfFile || selectedLectures.length === 0 || ingestStatus === 'loading') ? 'not-allowed' : 'pointer',
                  border: 'none',
                  outline: 'none'
                }}
             >
                {ingestStatus === 'loading' ? 'Processing...' : 'Run Ingestion 🚀'}
             </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default AIPanel;
