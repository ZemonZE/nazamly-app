import { IconShield } from "../Icons/Icons";

function InfoPanel() {
  return (
    <div className="auth-info">
      <div className="info-icon-wrap">
        <IconShield />
      </div>
      <div className="info-text">
        <h3>لوحة تحكم المسؤول</h3>
        <p>
          إدارة شاملة لمنصة نظملي التعليمية — تحكم كامل في المحتوى والمستخدمين
        </p>
        <ul>
          <li>إدارة المستخدمين والصلاحيات</li>
          <li>متابعة المقررات والاختبارات</li>
          <li>إحصائيات وتقارير شاملة</li>
          <li>إدارة المحتوى التعليمي</li>
        </ul>
      </div>
    </div>
  );
}

export default InfoPanel;
