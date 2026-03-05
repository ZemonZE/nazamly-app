import PageHeader from '../components/PageHeader';
import { IconDoneAI, IconProcessing, IconPendingAI, IconDownload, IconAiPanel } from '../Icons/Icons'
import './AIPanel.css';

function AIPanel() {
  const jobs = [
    {
      id: 1,
      type: 'Extraction',
      status: 'Completed',
      progress: null,
      started: '3/2/2026 5:49:52 PM',
      completed: '3/2/2026 6:19:52 PM'
    },
    {
      id: 2,
      type: 'Generation',
      status: 'Processing',
      progress: 65,
      started: '3/2/2026 6:39:52 PM',
      completed: null
    },
    {
      id: 3,
      type: 'Extraction',
      status: 'Pending',
      progress: null,
      started: '3/2/2026 6:44:52 PM',
      completed: null
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return (
          <IconDoneAI />
        );
      case 'Processing':
        return (
          <IconProcessing />
        );
      case 'Pending':
        return (
          <IconPendingAI />
        );
      default:
        return null;
    }
  };

  return (
    <div className="page-content">
      <PageHeader 
        title="AI Operations" 
        description="Trigger AI extraction and question generation"
      />

      <div className="ai-header">
        <div className="ai-tabs">
          <button className="ai-tab active">AI Jobs</button>
          <button className="ai-tab">
            Questions to Review
            <span className="badge">0</span>
          </button>
        </div>
        <div className="ai-actions">
          <button className="ai-action-btn">
            <IconDownload />
            Trigger Extraction
          </button>
          <button className="ai-action-btn primary">
            <IconAiPanel />
            Generate Questions
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Started</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.id}>
                <td>{job.type}</td>
                <td>
                  <div className="status-cell">
                    {getStatusIcon(job.status)}
                    <span>{job.status}</span>
                  </div>
                </td>
                <td>
                  {job.progress !== null ? (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${job.progress}%` }}></div>
                      </div>
                      <span className="progress-text">{job.progress}%</span>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{job.started}</td>
                <td>{job.completed || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AIPanel;
