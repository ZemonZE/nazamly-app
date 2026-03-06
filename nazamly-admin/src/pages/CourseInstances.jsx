import PageHeader from '../components/PageHeader';
import './Users.css';

function CourseInstances() {
  return (
    <div className="page-content">
      <PageHeader 
        title="Course Instances" 
        description="Manage course offerings by semester"
      />

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Doctor</th>
              <th>Academic Year</th>
              <th>Term</th>
              <th>Drive Folder</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="6" className="empty-state">
                No course instances found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CourseInstances;
