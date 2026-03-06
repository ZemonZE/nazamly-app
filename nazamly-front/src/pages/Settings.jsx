import { useState } from "react";
import { useOutletContext } from "react-router-dom";

function Settings() {
  const { user, onLogout } = useOutletContext();

  const name = user?.user?.displayName || "—";
  const email = user?.user?.email || "—";
  const status = user?.user?.status || "نشط";
  const role = user?.user?.role || "طالب";

  const [notifications, setNotifications] = useState(true);
  const [privacy, setPrivacy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="dash-home">
      <div>
        <h2 className="page-title">الإعدادات</h2>
        <p className="page-sub">إدارة حسابك وتفضيلاتك الشخصية</p>
      </div>

      <div className="settings-grid">
        <div className="settings-col">
          {/* ── Account Info ── */}
          <div className="settings-card">
            <div className="settings-card-header">
              <span className="settings-card-icon">👤</span>
              <h3>معلومات الحساب</h3>
            </div>

            <div className="settings-avatar-row">
              <div className="settings-avatar">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="settings-name">{name}</p>
                <p className="settings-role-badge">{role}</p>
              </div>
            </div>

            <div className="settings-info-list">
              <div className="settings-info-item">
                <span className="settings-info-label">البريد الإلكتروني</span>
                <div className="settings-info-value-row">
                  <span className="settings-info-value">{email}</span>
                  <button className="settings-copy-btn" onClick={copyEmail}>
                    {copied ? "✅ تم النسخ" : "📋 نسخ"}
                  </button>
                </div>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">حالة الحساب</span>
                <span
                  className={`settings-status ${status === "نشط" ? "active" : "inactive"}`}
                >
                  {status === "نشط" ? "✅" : "⛔"} {status}
                </span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">الدور</span>
                <span className="settings-info-value">{role}</span>
              </div>
            </div>
          </div>

          {/* ── Danger Zone ── */}
          <div className="settings-card danger-card">
            <div className="settings-card-header">
              <span className="settings-card-icon">⚠️</span>
              <h3>اعدادات الحساب</h3>
            </div>

            <p className="settings-danger-desc">
              هذه الإجراءات لا يمكن التراجع عنها، يرجى التأكد قبل المتابعة.
            </p>

            <div className="settings-danger-actions">
              <button className="settings-logout-btn" onClick={onLogout}>
                🚪 تسجيل الخروج
              </button>
              <button
                className="settings-delete-btn"
                onClick={() => setDeleteConfirm(true)}
              >
                🗑 حذف الحساب
              </button>
            </div>
          </div>
        </div>

        {/* ══ Left Column ══ */}
        <div className="settings-col">
          {/* ── Preferences ── */}
          <div className="settings-card">
            <div className="settings-card-header">
              <span className="settings-card-icon">⚙️</span>
              <h3>التفضيلات</h3>
            </div>

            <div className="settings-toggles">
              <div className="settings-toggle-item">
                <div className="settings-toggle-info">
                  <span className="settings-toggle-label">🔔 الإشعارات</span>
                  <span className="settings-toggle-desc">
                    استقبال إشعارات البريد الإلكتروني
                  </span>
                </div>
                <button
                  className={`toggle-switch ${notifications ? "on" : ""}`}
                  onClick={() => setNotifications((p) => !p)}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>

              <div className="settings-toggle-item">
                <div className="settings-toggle-info">
                  <span className="settings-toggle-label">🔒 الخصوصية</span>
                  <span className="settings-toggle-desc">
                    إخفاء معلوماتك عن المستخدمين الآخرين
                  </span>
                </div>
                <button
                  className={`toggle-switch ${privacy ? "on" : ""}`}
                  onClick={() => setPrivacy((p) => !p)}
                >
                  <span className="toggle-thumb" />
                </button>
              </div>
            </div>
          </div>

          {/* ── App Info ── */}
          <div className="settings-card">
            <div className="settings-card-header">
              <span className="settings-card-icon">ℹ️</span>
              <h3>عن التطبيق</h3>
            </div>
            <div className="settings-info-list">
              <div className="settings-info-item">
                <span className="settings-info-label">اسم التطبيق</span>
                <span className="settings-info-value">نظملي — Nazamly</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">الإصدار</span>
                <span className="settings-info-value">1.0.0</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">التواصل مع الدعم</span>
                <a href="mailto:support@nazamly.com" className="settings-link">
                  support@nazamly.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete Confirm Popup ── */}
      {deleteConfirm && (
        <div
          className="conflict-overlay"
          onClick={() => setDeleteConfirm(false)}
        >
          <div className="conflict-popup" onClick={(e) => e.stopPropagation()}>
            <div className="conflict-icon">🗑</div>
            <h3 style={{ color: "var(--error)" }}>حذف الحساب</h3>
            <p>هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه.</p>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                className="settings-delete-btn"
                style={{ flex: 1 }}
                onClick={() => {
                  setDeleteConfirm(false);
                  onLogout();
                }}
              >
                نعم، احذف حسابي
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => setDeleteConfirm(false)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
