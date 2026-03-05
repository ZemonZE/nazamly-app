import PageHeader from '../components/PageHeader';
import { IconEdit, IconDelete } from '../Icons/Icons'
import './Users.css';

function Departments() {
  const departments = [
    { code: 'CS', name: 'Computer Science', description: 'Computer Science Department', created: '3/2/2026' },
    { code: 'MATH', name: 'Mathematics', description: 'Mathematics Department', created: '3/2/2026' },
    { code: 'PHYS', name: 'Physics', description: 'Physics Department', created: '3/2/2026' },
  ];

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
              <tr key={dept.code}>
                <td><strong>{dept.code}</strong></td>
                <td>{dept.name}</td>
                <td style={{ color: '#94a3b8' }}>{dept.description}</td>
                <td>{dept.created}</td>
                <td>
                  <button className="icon-btn" title="Edit">
                    <IconEdit />
                  </button>
                  <button className="icon-btn delete-btn" title="Delete">
                    <IconDelete />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Departments;
