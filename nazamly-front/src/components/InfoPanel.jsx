import tryImage from "../assets/Eco-System.jpg";

function InfoPanel() {
  return (
    <div className="auth-info">
      <div className="info-img-wrap">
        <img src={tryImage} alt="نظملي" />
      </div>
      <div className="info-text">
        <h3>نظام التعليم المتكامل</h3>
        <p>نظملي هو نظام إدارة التعلم المتكامل الذي يوفر بيئة تعليمية شاملة</p>
        <ul>
          <li>إدارة الدروس والاختبارات</li>
          <li>تواصل فعال بين الطلاب والمعلمين</li>
          <li>بيئة تعليمية شاملة</li>
        </ul>
      </div>
    </div>
  );
}

export default InfoPanel;
