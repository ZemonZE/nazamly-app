import tryImage from "../assets/Eco-System.jpg";

function InfoPanel() {
  return (
    <div className="auth-info">
      <div className="info-img-wrap">
        <img src={tryImage} alt="نظملي" />
      </div>
      <div className="info-text">
        <h3>Integrated Education System</h3>
        <p>Nazamly is an integrated learning management system providing a comprehensive educational environment</p>
        <ul>
          <li>Manage lessons and exams</li>
          <li>Effective communication between students and teachers</li>
          <li>Comprehensive educational environment</li>
        </ul>
      </div>
    </div>
  );
}

export default InfoPanel;
