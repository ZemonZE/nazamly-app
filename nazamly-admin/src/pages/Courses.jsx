import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { IconClose } from '../Icons/Icons';
import { API_URL, authHeaders } from '../firebase';
import '../CSS/Users.css';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    courseCode: '', courseName: '', level: 3, creditHours: 3, difficulty: 3, department: 'CS'
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      console.log('[Courses] Fetching from:', `${API_URL}/api/admin/courses`);
      const headers = await authHeaders();
      console.log('[Courses] Headers:', headers);
      const res = await fetch(`${API_URL}/api/admin/courses`, { headers });
      console.log('[Courses] Response status:', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Courses] Error response:', errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      const data = await res.json();
      console.log('[Courses] Received data:', data);
      setCourses(data);
    } catch (err) {
      console.error('[Courses] Error:', err);
      setError('Failed to load courses: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setFormData({ courseCode: '', courseName: '', level: 3, creditHours: 3, difficulty: 3, department: 'CS' });
    setShowModal(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      courseCode: course.courseCode,
      courseName: course.courseName,
      level: course.level,
      creditHours: course.creditHours,
      difficulty: course.difficulty || 3,
      department: course.department || 'CS',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.courseCode.trim() || !formData.courseName.trim()) return;
    setActionLoading(true);
    try {
      const url = editingCourse
        ? `${API_URL}/api/admin/courses/${editingCourse._id}`
        : `${API_URL}/api/admin/courses`;
      const method = editingCourse ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: await authHeaders(),
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save course');
      }
      setShowModal(false);
      fetchCourses();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete course "${name}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/courses/${id}`, { method: 'DELETE', headers: await authHeaders() });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      fetchCourses();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = searchTerm === '' ||
      c.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === 'all' || c.level === Number(levelFilter);
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="page-content">
      <PageHeader title="Courses" description="Manage academic courses" />

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '10px', color: 'var(--error)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}

      <div className="filters-bar">
        <input className="search-input" placeholder="Search courses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <select className="filter-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
          <option value="all">All Levels</option>
          <option value="1">Level 1</option>
          <option value="2">Level 2</option>
          <option value="3">Level 3</option>
          <option value="4">Level 4</option>
        </select>
        <button className="action-btn" onClick={handleOpenCreate}>+ Add Course</button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Level</th>
              <th>Credits</th>
              <th>Difficulty</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="empty-state">Loading...</td></tr>
            ) : filteredCourses.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">No courses found</td></tr>
            ) : (
              filteredCourses.map(course => (
                <tr key={course._id}>
                  <td><span className="role-badge">{course.courseCode}</span></td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{course.courseName}</td>
                  <td>{course.level}</td>
                  <td>{course.creditHours}</td>
                  <td>{'⭐'.repeat(course.difficulty || 3)}</td>
                  <td>{course.department || 'General'}</td>
                  <td>
                    <button className="action-btn" style={{ marginRight: '8px' }} onClick={() => handleOpenEdit(course)}>Edit</button>
                    <button className="icon-btn delete-btn" onClick={() => handleDelete(course._id, course.courseName)}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCourse ? 'Edit Course' : 'Add Course'}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><IconClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Course Code</label>
                <input className="modal-input" placeholder="e.g., CS301" value={formData.courseCode} onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Course Name</label>
                <input className="modal-input" placeholder="e.g., Operating Systems" value={formData.courseName} onChange={(e) => setFormData({ ...formData, courseName: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Level</label>
                  <select className="modal-select" value={formData.level} onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}>
                    <option value={1}>Level 1</option>
                    <option value={2}>Level 2</option>
                    <option value={3}>Level 3</option>
                    <option value={4}>Level 4</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Credit Hours</label>
                  <select className="modal-select" value={formData.creditHours} onChange={(e) => setFormData({ ...formData, creditHours: Number(e.target.value) })}>
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Difficulty (1-5)</label>
                  <select className="modal-select" value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: Number(e.target.value) })}>
                    <option value={1}>1 - Easy</option>
                    <option value={2}>2</option>
                    <option value={3}>3 - Medium</option>
                    <option value={4}>4</option>
                    <option value={5}>5 - Hard</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Department</label>
                  <input className="modal-input" placeholder="e.g., CS" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="save-btn" onClick={handleSave} disabled={!formData.courseCode.trim() || !formData.courseName.trim() || actionLoading}>
                  {actionLoading ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Courses;
