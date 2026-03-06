import './PageHeader.css';

function PageHeader({ title, description }) {
  return (
    <div className="page-header">
      <h1 className="page-title">{title}</h1>
      <p className="page-description">{description}</p>
    </div>
  );
}

export default PageHeader;
