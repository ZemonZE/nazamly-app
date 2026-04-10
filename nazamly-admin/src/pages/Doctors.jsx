import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { IconClose } from '../Icons/Icons';
import { API_URL, authHeaders } from '../firebase';
import '../CSS/Users.css';

function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Toast notification: { type: 'success'|'error', message }
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (type, message) => setToast({ type, message });

  // Fetch all doctors on mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/doctors`, {
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch doctors');
      const data = await res.json();
      setDoctors(data);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({ name: '', email: '' });
    setFormError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormError('');
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setFormError('Doctor name is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/doctors`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ name: formData.name.trim(), email: formData.email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create doctor');

      // Optimistically append the new doctor to the list without a full refetch
      setDoctors(prev => [...prev, data]);
      showToast('success', `Dr. ${data.name} added successfully.`);
      handleCloseModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete Dr. ${name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/doctors/${id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete doctor');
      setDoctors(prev => prev.filter(d => d._id !== id));
      showToast('success', `Dr. ${name} removed.`);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const filteredDoctors = doctors.filter(d =>
    searchTerm === '' ||
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-content">
      <PageHeader title="Doctors" description="Manage teaching staff and professor profiles" />

      {/* ── Toast Notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          padding: '14px 20px',
          background: toast.type === 'success' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(22, 163, 74, 0.4)' : 'rgba(220, 38, 38, 0.4)'}`,
          borderLeft: `4px solid ${toast.type === 'success' ? '#16a34a' : 'var(--error)'}`,
          borderRadius: '10px',
          color: toast.type === 'success' ? '#16a34a' : 'var(--error)',
          fontSize: '14px', fontWeight: 500, maxWidth: '420px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          backdropFilter: 'blur(10px)',
          animation: 'slideInToast 0.3s ease-out',
        }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px', paddingLeft: '8px' }}>×</button>
        </div>
      )}

      {/* ── Filters Bar ── */}
      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button className="action-btn" onClick={handleOpenModal}>+ Add Doctor</button>
      </div>

      {/* ── Doctors Table ── */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="empty-state">Loading...</td></tr>
            ) : filteredDoctors.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-state">
                  {searchTerm ? 'No doctors match your search.' : 'No doctors yet. Click "Add Doctor" to get started.'}
                </td>
              </tr>
            ) : (
              filteredDoctors.map((doc, idx) => (
                <tr key={doc._id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Avatar initial */}
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: 'var(--blue-glow)', border: '1px solid var(--glass-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--blue-700)', fontWeight: 700, fontSize: '14px', flexShrink: 0,
                      }}>
                        {doc.name?.charAt(0).toUpperCase() || 'D'}
                      </div>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Dr. {doc.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{doc.email || '—'}</td>
                  <td>
                    <button
                      className="icon-btn delete-btn"
                      onClick={() => handleDelete(doc._id, doc.name)}
                      title="Delete doctor"
                    >🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Doctor Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Doctor</h2>
              <button className="modal-close-btn" onClick={handleCloseModal}><IconClose /></button>
            </div>

            <div className="modal-body">
              {/* Name field */}
              <div className="form-group">
                <label>Full Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="e.g., Ahmed Hassan"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {/* Email field */}
              <div className="form-group">
                <label>Email <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>(optional)</span></label>
                <input
                  className="modal-input"
                  type="email"
                  placeholder="e.g., a.hassan@university.edu"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {/* Inline form error */}
              {formError && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  borderRadius: '8px',
                  color: 'var(--error)',
                  fontSize: '13px',
                }}>
                  {formError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <div className="modal-actions">
                <button className="cancel-btn" onClick={handleCloseModal}>Cancel</button>
                <button
                  className="save-btn"
                  onClick={handleSubmit}
                  disabled={saving || !formData.name.trim()}
                >
                  {saving ? 'Adding...' : 'Add Doctor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Doctors;
