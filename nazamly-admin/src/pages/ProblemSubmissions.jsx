import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { API_URL, authHeaders } from '../firebase';
import '../CSS/Users.css';

const VERDICT_STYLES = {
  AC: { label: 'AC', className: 'verdict-ac' },
  WA: { label: 'WA', className: 'verdict-wa' },
  ERROR: { label: 'ERROR', className: 'verdict-error' },
};

function VerdictBadge({ verdict }) {
  const style = VERDICT_STYLES[verdict] || { label: verdict, className: 'verdict-other' };
  return <span className={`verdict-badge ${style.className}`}>{style.label}</span>;
}

function ProblemSubmissions() {
  const { id: problemId } = useParams();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    fetchSubmissions();
  }, [problemId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/coding/problems/${problemId}/submissions`,
        { headers: await authHeaders() }
      );
      if (!res.ok) throw new Error('Failed to load submissions');
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : data.submissions || []);
    } catch (err) {
      setError(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: '16px' }}>
        <button className="action-btn" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <PageHeader title="Problem Submissions" description="All student submissions for this problem" />

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(220, 38, 38, 0.15)',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          borderRadius: '10px',
          color: 'var(--error)',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Language</th>
              <th>Verdict</th>
              <th>Timestamp</th>
              <th>Code</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="empty-state">Loading...</td></tr>
            ) : submissions.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">No submissions yet</td></tr>
            ) : (
              submissions.map((sub) => {
                const rowId = sub._id;
                const isExpanded = expandedRows.has(rowId);
                return (
                  <>
                    <tr key={rowId}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {sub.studentId?._id || sub.studentId || '—'}
                      </td>
                      <td>
                        <span className="role-badge">{sub.language || '—'}</span>
                      </td>
                      <td>
                        <VerdictBadge verdict={sub.verdict} />
                      </td>
                      <td>{formatTimestamp(sub.submittedAt || sub.createdAt)}</td>
                      <td>
                        <button className="action-btn" onClick={() => toggleRow(rowId)}>
                          {isExpanded ? 'Hide Code' : 'View Code'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${rowId}-code`}>
                        <td colSpan="5" style={{ padding: '0' }}>
                          <pre style={{
                            margin: 0,
                            padding: '16px 24px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            color: 'var(--text-secondary)',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            borderTop: '1px solid rgba(59, 109, 224, 0.1)',
                          }}>
                            {sub.code || '(no code available)'}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .verdict-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .verdict-ac {
          background: rgba(37, 99, 235, 0.2);
          color: var(--blue-700);
          border: 1px solid rgba(37, 99, 235, 0.3);
        }
        .verdict-wa {
          background: rgba(220, 38, 38, 0.15);
          color: var(--error);
          border: 1px solid rgba(220, 38, 38, 0.3);
        }
        .verdict-error {
          background: rgba(245, 158, 11, 0.15);
          color: #fcd34d;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .verdict-other {
          background: rgba(163, 201, 180, 0.1);
          color: var(--text-secondary);
          border: 1px solid rgba(163, 201, 180, 0.2);
        }
      `}</style>
    </div>
  );
}

export default ProblemSubmissions;
