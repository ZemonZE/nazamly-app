import { IconDone, IconCross, IconPending } from '../Icons/Icons';
import './StatusBadge.css';

function StatusBadge({ status }) {
  const getStatusClass = () => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'pending':
        return 'status-pending';
      case 'blocked':
        return 'status-blocked';
      case 'completed':
        return 'status-completed';
      case 'processing':
        return 'status-processing';
      default:
        return 'status-default';
    }
  };

  const getStatusIcon = () => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <IconDone />;
      case 'blocked':
        return <IconCross />;
      case 'pending':
        return <IconPending />;
      default:
        return null;
    }
  };

  return (
    <span className={`status-badge ${getStatusClass()}`}>
      {getStatusIcon()}
      {status}
    </span>
  );
}

export default StatusBadge;
