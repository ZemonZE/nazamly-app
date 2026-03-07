import PageHeader from '../components/PageHeader';
import './Users.css';

function Chapters() {
  return (
    <div className="page-content">
      <PageHeader 
        title="Chapters" 
        description="Manage course chapters and materials"
      />

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Title</th>
              <th>Course Instance</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="5" className="empty-state">
                No chapters found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Chapters;
