import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { IconClose } from '../Icons/Icons';
import { API_URL, authHeaders } from '../firebase';
import './Users.css';

function CourseInstances() {
  const [instances, setInstances] = useState([]);
  const [courses, setCourses] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState(null);
  const [formData, setFormData] = useState({
    courseId: '', doctorId: '', academicYear: '2025/2026', semester: 'Spring'
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Doctor creation inline
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorEmail, setNewDoctorEmail] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [instRes, courseRes, doctorRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/course-instances`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/admin/courses`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/admin/doctors`, { headers: authHeaders() }),
      ]);
      setInstances(await instRes.json());
      setCourses(await courseRes.json());
      setDoctors(await doctorRes.json());
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingInstance(null);
    setFormData({ courseId: '', doctorId: '', academicYear: '2025/2026', semester: 'Spring' });
    setShowModal(true);
  };

  const handleOpenEdit = (inst) => {
    setEditingInstance(inst);
    setFormData({
      courseId: inst.courseId?._id || '',
      doctorId: inst.doctorId?._id || '',
      academicYear: inst.academicYear,
      semester: inst.semester,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.courseId || !formData.doctorId || !formData.academicYear || !formData.semester) return;
    setActionLoading(true);
    try {
      const url = editingInstance
        ? `${API_URL}/api/admin/course-instances/${editingInstance._id}`
        : `${API_URL}/api/admin/course-instances`;
      const method = editingInstance ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course instance?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/course-instances/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddDoctor = async () => {
    if (!newDoctorName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/doctors`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: newDoctorName.trim(), email: newDoctorEmail.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create doctor');
      const doctor = await res.json();
      setDoctors([...doctors, doctor]);
      setFormData({ ...formData, doctorId: doctor._id });
      setNewDoctorName('');
      setNewDoctorEmail('');
      setShowAddDoctor(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredInstances = instances.filter(inst => {
    const courseName = inst.courseId?.courseName || '';
    const courseCode = inst.courseId?.courseCode || '';
    const doctorName = inst.doctorId?.name || '';
    const matchesSearch = searchTerm === '' ||
      courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = semesterFilter === 'all' || inst.semester === semesterFilter;
    return matchesSearch && matchesSemester;
  });

  return (
    <div className="page-content">
      <PageHeader title="Course Instances" description="Manage course offerings by semester" />

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#fca5a5', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}

      <div className="filters-bar">
        <input className="search-input" placeholder="Search by course or doctor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <select className="filter-select" value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)}>
          <option value="all">All Semesters</option>
          <option value="Fall">Fall</option>
          <option value="Spring">Spring</option>
        </select>
        <button className="action-btn" onClick={handleOpenCreate}>+ Add Instance</button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Doctor</th>
              <th>Academic Year</th>
              <th>Semester</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="empty-state">Loading...</td></tr>
            ) : filteredInstances.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">No course instances found</td></tr>
            ) : (
              filteredInstances.map(inst => (
                <tr key={inst._id}>
                  <td>
                    <div>
                      <span style={{ color: '#e8f9f0', fontWeight: 500 }}>{inst.courseId?.courseName || 'Unknown'}</span>
                      <div style={{ fontSize: '12px', color: '#5a8a6e', marginTop: '2px' }}>{inst.courseId?.courseCode || ''}</div>
                    </div>
                  </td>
                  <td>Dr. {inst.doctorId?.name || 'Unknown'}</td>
                  <td>{inst.academicYear}</td>
                  <td><span className="role-badge">{inst.semester}</span></td>
                  <td>
                    <button className="action-btn" style={{ marginRight: '8px' }} onClick={() => handleOpenEdit(inst)}>Edit</button>
                    <button className="icon-btn delete-btn" onClick={() => handleDelete(inst._id)}>🗑️</button>
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
              <h2>{editingInstance ? 'Edit Instance' : 'Add Course Instance'}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><IconClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Course</label>
                <select className="modal-select" value={formData.courseId} onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}>
                  <option value="">Select a course...</option>
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>{c.courseCode} - {c.courseName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Doctor
                  <button
                    type="button"
                    onClick={() => setShowAddDoctor(!showAddDoctor)}
                    style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
                  >
                    {showAddDoctor ? 'Cancel' : '+ New Doctor'}
                  </button>
                </label>
                {showAddDoctor ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input className="modal-input" style={{ flex: 1 }} placeholder="Doctor name" value={newDoctorName} onChange={(e) => setNewDoctorName(e.target.value)} />
                    <input className="modal-input" style={{ flex: 1 }} placeholder="Email (optional)" value={newDoctorEmail} onChange={(e) => setNewDoctorEmail(e.target.value)} />
                    <button className="save-btn" style={{ padding: '10px 16px' }} onClick={handleAddDoctor} disabled={!newDoctorName.trim()}>Add</button>
                  </div>
                ) : (
                  <select className="modal-select" value={formData.doctorId} onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}>
                    <option value="">Select a doctor...</option>
                    {doctors.map(d => (
                      <option key={d._id} value={d._id}>Dr. {d.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Academic Year</label>
                  <input className="modal-input" placeholder="e.g., 2025/2026" value={formData.academicYear} onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Semester</label>
                  <select className="modal-select" value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })}>
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="save-btn" onClick={handleSave} disabled={!formData.courseId || !formData.doctorId || actionLoading}>
                  {actionLoading ? 'Saving...' : editingInstance ? 'Update' : 'Create Instance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseInstances;
