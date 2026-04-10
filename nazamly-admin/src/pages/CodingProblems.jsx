import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { IconClose } from '../Icons/Icons';
import { API_URL, authHeaders } from '../firebase';
import '../CSS/Users.css';
import '../CSS/CodingProblems.css';

const DIFFICULTY_LABELS = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const DIFFICULTY_CLASSES = { 1: 'difficulty-easy', 2: 'difficulty-medium', 3: 'difficulty-hard' };
const SUPPORTED_LANGUAGES = ['cpp', 'js', 'emu8086', 'plsql'];

const emptyForm = {
  title: '',
  topic: '',
  courseId: '',
  estimatedMinutes: 30,
  difficulty: 1,
  supportedLanguages: [],
  tags: '',
  descriptionFile: null,
  testCasesFile: null,
};

function CodingProblems() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [problems, setProblems] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchCourses(); }, []);
  useEffect(() => { if (selectedCourse) fetchProblems(selectedCourse); else setProblems([]); }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/courses`, { headers: await authHeaders() });
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : data.data || data.courses || []);
    } catch {
      setError('Failed to load courses');
    }
  };

  const fetchProblems = async (courseId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/coding/problems?courseId=${courseId}`, { headers: await authHeaders() });
      const data = await res.json();
      setProblems(Array.isArray(data) ? data : data.data || data.problems || []);
    } catch {
      setError('Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProblem(null);
    setFormData({ ...emptyForm, courseId: selectedCourse });
    setShowModal(true);
  };

  const handleOpenEdit = (problem) => {
    setEditingProblem(problem);
    setFormData({
      title: problem.title || '',
      topic: problem.topic || '',
      courseId: problem.courseId?._id || problem.courseId || selectedCourse,
      estimatedMinutes: problem.estimatedMinutes || 30,
      difficulty: problem.difficulty || 1,
      supportedLanguages: problem.supportedLanguages || [],
      tags: Array.isArray(problem.tags) ? problem.tags.join(', ') : problem.tags || '',
      descriptionFile: null,
      testCasesFile: null,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.courseId) return;
    setActionLoading(true);
    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('topic', formData.topic);
      fd.append('courseId', formData.courseId);
      fd.append('estimatedMinutes', formData.estimatedMinutes);
      fd.append('difficulty', formData.difficulty);
      formData.supportedLanguages.forEach(lang => fd.append('supportedLanguages[]', lang));
      fd.append('tags', formData.tags);
      if (formData.descriptionFile) fd.append('descriptionFile', formData.descriptionFile);
      if (formData.testCasesFile) fd.append('testCasesFile', formData.testCasesFile);

      const token = (await authHeaders())['Authorization'];
      const url = editingProblem
        ? `${API_URL}/api/admin/coding/problems/${editingProblem._id}`
        : `${API_URL}/api/admin/coding/problems`;
      const method = editingProblem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: token ? { Authorization: token } : {},
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || 'Failed to save problem');
      }
      setShowModal(false);
      if (selectedCourse) fetchProblems(selectedCourse);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete problem "${title}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/coding/problems/${id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      if (selectedCourse) fetchProblems(selectedCourse);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleLanguage = (lang) => {
    setFormData(prev => ({
      ...prev,
      supportedLanguages: prev.supportedLanguages.includes(lang)
        ? prev.supportedLanguages.filter(l => l !== lang)
        : [...prev.supportedLanguages, lang],
    }));
  };

  return (
    <div className="page-content">
      <PageHeader title="Coding Problems" description="Manage coding problems per course" />

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '10px', color: 'var(--error)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}

      <div className="filters-bar">
        <select
          className="filter-select"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">— Select a course —</option>
          {courses.map(c => (
            <option key={c._id} value={c._id}>{c.courseCode} — {c.courseName}</option>
          ))}
        </select>
        <button className="action-btn" onClick={handleOpenCreate} disabled={!selectedCourse}>
          + Create Problem
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Topic</th>
              <th>Difficulty</th>
              <th>AC Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!selectedCourse ? (
              <tr><td colSpan="5" className="empty-state">Select a course to view problems</td></tr>
            ) : loading ? (
              <tr><td colSpan="5" className="empty-state">Loading...</td></tr>
            ) : problems.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">No problems found for this course</td></tr>
            ) : (
              problems.map(problem => (
                <tr key={problem._id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{problem.title}</td>
                  <td>{problem.topic}</td>
                  <td>
                    <span className={`difficulty-badge ${DIFFICULTY_CLASSES[problem.difficulty] || ''}`}>
                      {DIFFICULTY_LABELS[problem.difficulty] || problem.difficulty}
                    </span>
                  </td>
                  <td>{problem.acCount ?? 0}</td>
                  <td>
                    <button className="action-btn" style={{ marginRight: '6px' }} onClick={() => handleOpenEdit(problem)}>Edit</button>
                    <button className="action-btn" style={{ marginRight: '6px' }} onClick={() => navigate(`/coding-problems/${problem._id}/submissions`)}>View Submissions</button>
                    <button className="icon-btn delete-btn" onClick={() => handleDelete(problem._id, problem.title)}>🗑️</button>
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
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProblem ? 'Edit Problem' : 'Create Problem'}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><IconClose /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input className="modal-input" placeholder="Problem title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Topic</label>
                <input className="modal-input" placeholder="e.g., Arrays, Recursion" value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Course</label>
                <select className="modal-select" value={formData.courseId} onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}>
                  <option value="">— Select course —</option>
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>{c.courseCode} — {c.courseName}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Estimated Minutes</label>
                  <input className="modal-input" type="number" min={1} value={formData.estimatedMinutes} onChange={(e) => setFormData({ ...formData, estimatedMinutes: Number(e.target.value) })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Difficulty</label>
                  <select className="modal-select" value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: Number(e.target.value) })}>
                    <option value={1}>1 — Easy</option>
                    <option value={2}>2 — Medium</option>
                    <option value={3}>3 — Hard</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Supported Languages</label>
                <div className="lang-checkboxes">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <label key={lang} className="lang-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.supportedLanguages.includes(lang)}
                        onChange={() => toggleLanguage(lang)}
                      />
                      {lang}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input className="modal-input" placeholder="e.g., sorting, dp, greedy" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Description File (.md){editingProblem && ' — optional on edit'}</label>
                <input
                  className="modal-input"
                  type="file"
                  accept=".md"
                  onChange={(e) => setFormData({ ...formData, descriptionFile: e.target.files[0] || null })}
                />
              </div>
              <div className="form-group">
                <label>Test Cases File (.txt){editingProblem && ' — optional on edit'}</label>
                <input
                  className="modal-input"
                  type="file"
                  accept=".txt"
                  onChange={(e) => setFormData({ ...formData, testCasesFile: e.target.files[0] || null })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button
                  className="save-btn"
                  onClick={handleSave}
                  disabled={!formData.title.trim() || !formData.courseId || actionLoading}
                >
                  {actionLoading ? 'Saving...' : editingProblem ? 'Update Problem' : 'Create Problem'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CodingProblems;
