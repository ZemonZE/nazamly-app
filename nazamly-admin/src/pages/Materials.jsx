import PageHeader from '../components/PageHeader';
import './Users.css';

function Materials() {
  return (
    <div className="page-content">
      <PageHeader 
        title="Materials Management" 
        description="Manage course materials and Google Drive files"
      />

      <div className="filters-bar">
        <select className="filter-select" style={{ flex: 1 }}>
          <option>Course Instance: Select course instance</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Type</th>
              <th>Size</th>
              <th>Drive Link</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="5" className="empty-state">
                No materials found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Materials;
