import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { IconEdit, IconDelete, IconClose } from '../Icons/Icons';
import '../CSS/Users.css';

function Departments() {
  const [departments, setDepartments] = useState([
    { id: 1, code: 'CS', name: 'Computer Science', description: 'Computer Science Department', created: '3/2/2026' },
    { id: 2, code: 'MATH', name: 'Mathematics', description: 'Mathematics Department', created: '3/2/2026' },
    { id: 3, code: 'PHYS', name: 'Physics', description: 'Physics Department', created: '3/2/2026' },
  ]);

  const [selectedDept, setSelectedDept] = useState(null);
  const [editedDept, setEditedDept] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const handleEditClick = (dept) => {
    setSelectedDept(dept);
    setEditedDept({ ...dept });
  };

  const handleCloseModal = () => {
    setSelectedDept(null);
    setEditedDept(null);
  };

  const handleInputChange = (field, value) => {
    setEditedDept({ ...editedDept, [field]: value });
  };

  const handleSaveChanges = () => {
    setDepartments(departments.map(d => d.id === editedDept.id ? editedDept : d));
    handleCloseModal();
  };

  const hasChanges = () => {
    if (!selectedDept || !editedDept) return false;
    return (
      selectedDept.code !== editedDept.code ||
      selectedDept.name !== editedDept.name ||
      selectedDept.description !== editedDept.description
    );
  };

  const handleDeleteClick = (dept) => {
    setShowDeleteConfirm(dept);
  };

  const handleConfirmDelete = () => {
    setDepartments(departments.filter(d => d.id !== showDeleteConfirm.id));
    setShowDeleteConfirm(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  return (
    <div className="page-content">
      <PageHeader 
        title="Departments" 
        description="Manage academic departments"
      />

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Description</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => (
              <tr key={dept.id}>
                <td><strong>{dept.code}</strong></td>
                <td>{dept.name}</td>
                <td style={{ color: '#94a3b8' }}>{dept.description}</td>
                <td>{dept.created}</td>
                <td>
                  <button className="icon-btn" title="Edit" onClick={() => handleEditClick(dept)}>
                    <IconEdit />
                  </button>
                  <button className="icon-btn delete-btn" title="Delete" onClick={() => handleDeleteClick(dept)}>
                    <IconDelete />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {selectedDept && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Department</h2>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                <IconClose />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Department Code</label>
                <input
                  type="text"
                  value={editedDept.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  className="modal-input"
                  placeholder="e.g., CS"
                />
              </div>

              <div className="form-group">
                <label>Department Name</label>
                <input
                  type="text"
                  value={editedDept.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="modal-input"
                  placeholder="e.g., Computer Science"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editedDept.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="modal-textarea"
                  placeholder="Department description..."
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>Created Date</label>
                <input
                  type="text"
                  value={editedDept.created}
                  disabled
                  className="modal-input disabled"
                />
              </div>
            </div>

            <div className="modal-footer">
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
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Department</h2>
              <button className="modal-close-btn" onClick={handleCancelDelete}>
                <IconClose />
              </button>
            </div>

            <div className="modal-body">
              <div className="delete-warning">
                <IconDelete />
                <p>Are you sure you want to delete the department</p>
                <strong>{showDeleteConfirm.name} ({showDeleteConfirm.code})</strong>
                <p className="warning-text">This action cannot be undone</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={handleCancelDelete}>
                Cancel
              </button>
              <button className="delete-confirm-btn" onClick={handleConfirmDelete}>
                Delete Department
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Departments;
