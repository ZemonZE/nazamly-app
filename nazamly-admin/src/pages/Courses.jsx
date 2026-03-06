import PageHeader from '../components/PageHeader';
import './Users.css';

function Courses() {
  return (
    <div className="page-content">
      <PageHeader 
        title="Courses" 
        description="Manage academic courses"
      />

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Credits</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="5" className="empty-state">
                No courses found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Courses;
