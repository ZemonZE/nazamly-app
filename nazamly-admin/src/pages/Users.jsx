import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { IconStudent, IconAdmin, IconClose } from '../Icons/Icons';
import './Users.css';

function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editedUser, setEditedUser] = useState(null);

  const [users, setUsers] = useState([
    { id: 1, name: 'Waleed', email: 'waleed@example.com', role: 'admin', status: 'pending', lastLogin: '3/2/2026' },
    { id: 2, name: 'Hazem', email: 'hazem@example.com', role: 'admin', status: 'active', lastLogin: '3/2/2026' },
    { id: 3, name: 'Abdo', email: 'abdo@example.com', role: 'student', status: 'active', lastLogin: '3/2/2026' },
    { id: 4, name: 'Youssef', email: 'youssef@example.com', role: 'student', status: 'active', lastLogin: '3/2/2026' },
    { id: 5, name: 'Amr', email: 'amr@example.com', role: 'student', status: 'active', lastLogin: '3/2/2026' },
    { id: 6, name: 'Eid', email: 'mostafa@example.com', role: 'student', status: 'pending', lastLogin: '3/1/2026' },
    { id: 7, name: 'User 7', email: 'user7@example.com', role: 'student', status: 'active', lastLogin: '3/2/2026' },
    { id: 8, name: 'User 8', email: 'user8@example.com', role: 'student', status: 'blocked', lastLogin: '3/2/2026' },
    { id: 9, name: 'User 9', email: 'user9@example.com', role: 'student', status: 'active', lastLogin: '3/1/2026' },
    { id: 10, name: 'User 10', email: 'user10@example.com', role: 'student', status: 'active', lastLogin: '3/2/2026' },
    { id: 11, name: 'User 11', email: 'user11@example.com', role: 'student', status: 'pending', lastLogin: '3/1/2026' },
  ]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

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

  const handleSaveChanges = () => {
    setUsers(users.map(u => u.id === editedUser.id ? editedUser : u));
    handleCloseModal();
  };

  const handleBanUser = () => {
    const newStatus = editedUser.status === 'blocked' ? 'active' : 'blocked';
    setEditedUser({ ...editedUser, status: newStatus });
  };

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
            {filteredUsers.map(user => (
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
                <td>{user.lastLogin}</td>
                <td>
                  <button className="action-btn" onClick={() => handleManageClick(user)}>
                    Manage
                  </button>
                </td>
              </tr>
            ))}
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
                  disabled={!hasChanges()}
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
