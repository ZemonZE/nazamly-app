import PageHeader from '../components/PageHeader';
import './Users.css';

function Doctors() {
  return (
    <div className="page-content">
      <PageHeader 
        title="Doctors" 
        description="Manage teaching staff"
      />

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Email</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="5" className="empty-state">
                No doctors found
                <div>
                  <button className="add-btn">Add Doctor</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Doctors;
