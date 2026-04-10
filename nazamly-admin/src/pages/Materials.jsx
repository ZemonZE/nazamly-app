import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { IconClose } from '../Icons/Icons';
import { API_URL, authHeaders, getAdminToken } from '../firebase';
import '../CSS/Users.css';

const SUB_FOLDER_LABELS = {
  lectures: 'المحاضرات',
  sections: 'السكاشن',
  videos: 'الفيديوهات',
  finals: 'الفاينالز',
  mids: 'الميدترمز',
  assignments: 'الواجبات',
};

function Materials() {
  // ── State ──
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeSubFolder, setActiveSubFolder] = useState('lectures');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ── Load courses on mount ──
  useEffect(() => {
    fetchCourses();
  }, []);

  // ── Load files when sub-folder or course changes ──
  useEffect(() => {
    if (selectedCourse && selectedCourse.initialized) {
      fetchFiles(selectedCourse.courseCode, activeSubFolder);
    } else {
      setFiles([]);
    }
  }, [selectedCourse, activeSubFolder]);

  // ── API ──
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/course-materials`, { headers: await authHeaders() });
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (courseCode, subFolderType) => {
    setFilesLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/course-materials/${courseCode}/files/${subFolderType}`, { headers: await authHeaders() });
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError('Failed to load files');
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !selectedCourse) return;
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (uploadTitle.trim()) formData.append('title', uploadTitle.trim());

      const token = await getAdminToken();
      
      const uploadUrl = new URL(`/api/admin/course-materials/${selectedCourse.courseCode}/upload/${activeSubFolder}`, import.meta.env.VITE_API_URL).toString();
      
      const res = await fetch(
        uploadUrl,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );
      if (!res.ok) throw new Error('Upload failed');
      setUploadTitle('');
      setUploadFile(null);
      setShowUpload(false);
      fetchFiles(selectedCourse.courseCode, activeSubFolder);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this file from Google Drive?')) return;
    try {
      const res = await fetch(
        `${API_URL}/api/admin/course-materials/${selectedCourse.courseCode}/files/${activeSubFolder}/${fileId}`,
        { method: 'DELETE', headers: await authHeaders() }
      );
      if (!res.ok) throw new Error('Delete failed');
      fetchFiles(selectedCourse.courseCode, activeSubFolder);
    } catch (err) {
      setError('Failed to delete file');
    }
  };

  const handleReprocessFile = async (mongoId) => {
    if (!mongoId) return setError('File has no database record to reprocess yet.');
    try {
      // Optimistically update the UI to PROCESSING
      setFiles(prev => prev.map(f => f.mongoId === mongoId ? { ...f, aiStatus: 'PROCESSING', aiError: null } : f));
      
      const res = await fetch(
        `${API_URL}/api/admin/materials/reprocess/${selectedCourse.courseCode}/${activeSubFolder}/${mongoId}`,
        { method: 'POST', headers: await authHeaders() }
      );
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to trigger reprocessing');
      }
    } catch (err) {
      setError(err.message);
      // Re-fetch to reset the optimistic state
      fetchFiles(selectedCourse.courseCode, activeSubFolder);
    }
  };

  const handleInitCourse = async (course) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/course-materials/init`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ courseCode: course.courseCode, courseName: course.courseName }),
      });
      if (!res.ok) throw new Error('Init failed');
      fetchCourses();
    } catch (err) {
      setError('Failed to initialize course folders');
    }
  };

  // ── Helpers ──
  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('video')) return '🎥';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📗';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📄';
  };

  const filteredCourses = courses.filter((c) => {
    const matchLevel = !filterLevel || String(c.level) === filterLevel;
    const matchSearch =
      !searchTerm ||
      c.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.courseCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchLevel && matchSearch;
  });

  const handleSyncDrive = async () => {
    if (!window.confirm('Sync existing folders from Google Drive? This will create missing courses in the database.')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/course-materials/sync-drive`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      alert(data.message);
      fetchCourses();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ──

  // Detail view for a selected course
  if (selectedCourse) {
    return (
      <div className="page-content">
        <PageHeader
          title={`${selectedCourse.courseName} — ${selectedCourse.courseCode}`}
          description="Manage Google Drive material folders for this course"
        />

        {/* Back button */}
        <button
          className="action-btn"
          style={{ marginBottom: '16px' }}
          onClick={() => { setSelectedCourse(null); setFiles([]); setActiveSubFolder('lectures'); }}
        >
          ← Back to Courses
        </button>

        {error && (
          <div style={{
            padding: '12px 16px', background: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '10px',
            color: 'var(--error)', marginBottom: '16px', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
          }}>
            {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>
        )}

        {!selectedCourse.initialized ? (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            background: 'rgba(255, 255, 255, 0.2)', borderRadius: '12px',
            border: '1px dashed rgba(59, 109, 224, 0.2)',
          }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
              Drive folders have not been created for this course yet.
            </p>
            <button className="action-btn" onClick={() => handleInitCourse(selectedCourse)}>
              Initialize Drive Folders
            </button>
          </div>
        ) : (
          <>
            {/* Drive link */}
            {selectedCourse.driveWebViewLink && (
              <div style={{ marginBottom: '16px' }}>
                <a
                  href={selectedCourse.driveWebViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--blue-700)', fontSize: '13px', textDecoration: 'underline' }}
                >
                  📂 Open root folder on Google Drive
                </a>
              </div>
            )}

            {/* Sub-folder tabs */}
            <div style={{
              display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px',
            }}>
              {Object.entries(SUB_FOLDER_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setActiveSubFolder(type)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: activeSubFolder === type
                      ? '1px solid rgba(37, 99, 235, 0.5)'
                      : '1px solid rgba(59, 109, 224, 0.15)',
                    background: activeSubFolder === type
                      ? 'rgba(37, 99, 235, 0.2)'
                      : 'var(--surface-bg)',
                    color: activeSubFolder === type ? 'var(--blue-700)' : '#9ec5ae',
                    cursor: 'pointer',
                    fontWeight: activeSubFolder === type ? 600 : 400,
                    fontSize: '14px',
                    transition: 'all 0.2s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Upload button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: 'var(--blue-700)', margin: 0, fontSize: '16px' }}>
                Files — {SUB_FOLDER_LABELS[activeSubFolder]}
              </h3>
              <button className="action-btn" onClick={() => setShowUpload(true)}>+ Upload File</button>
            </div>

            {/* Files table */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Status</th>
                    <th>Size</th>
                    <th>Drive Link</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filesLoading ? (
                    <tr>
                      <td colSpan="6" className="empty-state">Loading files...</td>
                    </tr>
                  ) : files.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">No files in this folder yet</td>
                    </tr>
                  ) : (
                    files.map((file) => (
                      <tr key={file.id}>
                        <td>
                          <span style={{ marginRight: '8px' }}>{getFileIcon(file.mimeType)}</span>
                          {file.name}
                        </td>
                        <td>
                          <span 
                            title={file.aiError || ''}
                            style={{ 
                              padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                              background: file.aiStatus === 'SUCCESS' ? 'rgba(37, 99, 235, 0.2)' :
                                          file.aiStatus === 'FAILED' ? 'rgba(220, 38, 38, 0.2)' :
                                          file.aiStatus === 'PROCESSING' ? 'rgba(59, 130, 246, 0.2)' :
                                          'rgba(156, 163, 175, 0.2)',
                              color: file.aiStatus === 'SUCCESS' ? 'var(--blue-500)' :
                                     file.aiStatus === 'FAILED' ? '#ef4444' :
                                     file.aiStatus === 'PROCESSING' ? '#3b82f6' :
                                     '#9ca3af'
                            }}>
                            {file.aiStatus === 'PROCESSING' ? '⏳ PROCESSING' : file.aiStatus || 'UNKNOWN'}
                          </span>
                        </td>
                        <td>{formatFileSize(file.size)}</td>
                        <td>
                          {file.webViewLink ? (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--blue-700)', textDecoration: 'underline' }}
                            >
                              Open in Drive
                            </a>
                          ) : '—'}
                        </td>
                        <td>{file.createdTime ? new Date(file.createdTime).toLocaleDateString() : '—'}</td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          {file.aiStatus === 'FAILED' && file.mongoId && (
                            <button
                              className="action-btn"
                              style={{ padding: '4px 8px', fontSize: '12px', height: 'auto', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)' }}
                              onClick={() => handleReprocessFile(file.mongoId)}
                              title="Reprocess AI Tasks"
                            >
                              🔄 Reprocess
                            </button>
                          )}
                          <button
                            className="icon-btn delete-btn"
                            onClick={() => handleDeleteFile(file.id)}
                            title="Delete file"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Upload Modal ── */}
        {showUpload && (
          <div className="modal-overlay" onClick={() => setShowUpload(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Upload File to {SUB_FOLDER_LABELS[activeSubFolder]}</h2>
                <button className="modal-close-btn" onClick={() => setShowUpload(false)}>
                  <IconClose />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>File Title (optional — defaults to file name)</label>
                  <input
                    type="text"
                    placeholder="e.g., Chapter 1 Slides"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="modal-input"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Choose File</label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    style={{
                      padding: '10px',
                      background: 'var(--surface-bg)',
                      border: '1px solid rgba(59, 109, 224, 0.2)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      width: '100%',
                    }}
                  />
                </div>
                {uploadFile && (
                  <p style={{ color: 'var(--blue-700)', fontSize: '13px', margin: '4px 0 0' }}>
                    Selected: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '8px 0 0' }}>
                  File will be uploaded to Drive folder: {selectedCourse.courseName} → {SUB_FOLDER_LABELS[activeSubFolder]}
                </p>
              </div>
              <div className="modal-footer">
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setShowUpload(false)}>Cancel</button>
                  <button
                    className="save-btn"
                    onClick={handleUpload}
                    disabled={!uploadFile || actionLoading}
                  >
                    {actionLoading ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Courses grid (main view) ──
  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PageHeader
          title="Materials Management"
          description="Manage course material folders on Google Drive"
        />
        <button 
          className="action-btn" 
          onClick={handleSyncDrive}
          disabled={loading}
          style={{ background: 'rgba(37, 99, 235, 0.2)', border: '1px solid rgba(37, 99, 235, 0.4)' }}
        >
          {loading ? 'Syncing...' : '🔄 Sync from Drive'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', background: 'rgba(220, 38, 38, 0.15)',
          border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '10px',
          color: 'var(--error)', marginBottom: '16px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search by course name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'var(--surface-bg)',
            border: '1px solid rgba(59, 109, 224, 0.2)',
            borderRadius: '10px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <select
          className="filter-select"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          <option value="">All Levels</option>
          <option value="1">Level 1</option>
          <option value="2">Level 2</option>
          <option value="3">Level 3</option>
          <option value="4">Level 4</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '48px' }}>Loading courses...</p>
      ) : filteredCourses.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'rgba(255, 255, 255, 0.2)', borderRadius: '12px',
          border: '1px dashed rgba(59, 109, 224, 0.2)',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            {courses.length === 0
              ? 'No courses found. Add courses first from the Courses page.'
              : 'No courses match your search.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
          marginTop: '8px',
        }}>
          {filteredCourses.map((course) => (
            <div
              key={course.courseCode}
              onClick={() => setSelectedCourse(course)}
              style={{
                padding: '20px',
                background: 'var(--surface-bg)',
                border: '1px solid rgba(59, 109, 224, 0.15)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.4)';
                e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59, 109, 224, 0.15)';
                e.currentTarget.style.background = 'var(--surface-bg)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{
                  background: 'rgba(37, 99, 235, 0.2)', color: 'var(--blue-700)',
                  padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                }}>
                  {course.courseCode}
                </span>
                <span style={{
                  fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                  background: course.initialized ? 'rgba(37, 99, 235, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: course.initialized ? 'var(--blue-700)' : '#3b6de0',
                }}>
                  {course.initialized ? '✓ Drive Ready' : '⚠ Not Initialized'}
                </span>
              </div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, margin: '0 0 8px' }}>
                {course.courseName}
              </h3>
              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                {course.level && <span>Level {course.level}</span>}
                {course.creditHours && <span>{course.creditHours} Credit Hours</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Materials;
