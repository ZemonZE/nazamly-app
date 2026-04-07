import { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { IconStudent, IconAdmin, IconClose } from '../Icons/Icons';
import { fetchWithAuth } from '../services/api';
import './Users.css';

function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editedUser, setEditedUser] = useState(null);

  //users state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const isFirstRender = useRef(true);

  // fetch all users from Firebase and MongoDB
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Search handling
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const data = await fetchWithAuth('/api/admin/users?' + params.toString());
      setUsers(data.map(u => ({
        id: u._id || u.firebaseUid,
        name: u.displayName || u.email,
        email: u.email,
        role: u.role,
        status: u.accessStatus,
        lastLogin: u.updatedAt,
      })));
    } catch (err) {
      if (err && err.status) {
        switch (err.status) {
          case 401:
            window.location.href = '/login';
            return;
          case 403:
            setError('Insufficient permissions');
            break;
          case 404:
            setError('User not found');
            break;
          case 409:
            setError(err.message);
            break;
          case 500:
            setError('Server error, please try again');
            break;
          default:
            setError('Network error, please check your connection');
        }
      } else {
        setError('Network error, please check your connection');
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter]);

  // Fetch on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Debounced search
  useEffect(() => {
    if (isFirstRender.current) return;
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Immediate fetch on filter change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const getRoleIcon = (role) => {
    return role === 'student' ? <IconStudent /> : <IconAdmin />;
  };

  const handleManageClick = (user) => {
    setSelectedUser(user);
    setEditedUser({ ...user });
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setEditedUser(null);
  };

  const handleInputChange = (field, value) => {
    setEditedUser({ ...editedUser, [field]: value });
  };

  // save user changes using API
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      await fetchWithAuth('/api/admin/users/' + editedUser.id, {
        method: 'PUT',
        body: JSON.stringify({
          email: editedUser.email,
          displayName: editedUser.name,
          role: editedUser.role,
          accessStatus: editedUser.status,
        }),
      });
      await fetchUsers();
      handleCloseModal();
    } catch (err) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // ban or unban a user
  const handleBanUser = async () => {
    const newStatus = editedUser.status === 'blocked' ? 'active' : 'blocked';
    setSaving(true);
    try {
      const updated = await fetchWithAuth('/api/admin/users/' + editedUser.id + '/status', {
        method: 'PATCH',
        body: JSON.stringify({ accessStatus: newStatus }),
      });
      const mappedUser = {
        id: updated._id,
        name: updated.displayName || updated.email,
        email: updated.email,
        role: updated.role,
        status: updated.accessStatus,
        lastLogin: updated.updatedAt,
      };
      setUsers(users.map(u => u.id === mappedUser.id ? mappedUser : u));
      setEditedUser({ ...editedUser, status: newStatus });
    } catch (err) {
      setError(err.message || 'Failed to update user status');
    } finally {
      setSaving(false);
    }
  };

  // check if any user fields were modified
  const hasChanges = () => {
    if (!selectedUser || !editedUser) return false;
    return (
      selectedUser.name !== editedUser.name ||
      selectedUser.email !== editedUser.email ||
      selectedUser.role !== editedUser.role ||
      selectedUser.status !== editedUser.status
    );
  };

  return (
    <div className="page-content">
      <PageHeader 
        title="Users Management" 
        description="Manage user access, roles, and permissions"
      />

      <div className="filters-bar">
        <input 
          type="text" 
          placeholder="Search by name or email.." 
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="student">Student</option>
        </select>
        <select 
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {error && (
        <div className="error-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', marginBottom: '12px', backgroundColor: '#fde8e8', border: '1px solid #f5c6c6', borderRadius: '6px', color: '#c0392b' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#c0392b', marginLeft: '12px' }}>✕</button>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Loading users...</td></tr>
            ) : (
              users.map(user => {
                const lastLoginDate = user.lastLogin ? new Date(user.lastLogin) : null;
                const lastLoginDisplay = lastLoginDate && !isNaN(lastLoginDate)
                  ? lastLoginDate.toLocaleDateString()
                  : 'Never';
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-email">{user.email}</div>
                        <div className="user-name">{user.name}</div>
                      </div>
                    </td>
                    <td>
                      <span className="role-badge">
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={user.status} />
                    </td>
                    <td>{lastLoginDisplay}</td>
                    <td>
                      <button className="action-btn" onClick={() => handleManageClick(user)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage User</h2>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <IconClose />
              </button>
            </div>

            <div className="modal-body">
              <div className="user-avatar-large">
                {editedUser.name.charAt(0).toUpperCase()}
              </div>

              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editedUser.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editedUser.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="modal-input"
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={editedUser.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="modal-select"
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={editedUser.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="modal-select"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div className="form-group">
                <label>Last Login</label>
                <input
                  type="text"
                  value={editedUser.lastLogin}
                  disabled
                  className="modal-input disabled"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className={`ban-btn ${editedUser.status === 'blocked' ? 'unban' : ''}`}
                onClick={handleBanUser}
                disabled={saving}
              >
                {editedUser.status === 'blocked' ? 'Unban User' : 'Ban User'}
              </button>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button 
                  className="save-btn" 
                  onClick={handleSaveChanges}
                  disabled={saving || !hasChanges()}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
