import { useState } from "react";
import { useOutletContext } from "react-router-dom";

function Settings() {
  const { user, onLogout } = useOutletContext();

  const name = user?.displayName || "—";
  const email = user?.email || "—";
  const status = user?.accessStatus || "Active";
  const role = user?.role || "Student";

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
        <h2 className="page-title">Settings</h2>
        <p className="page-sub">Manage your account and personal preferences</p>
      </div>

      <div className="settings-grid">
        <div className="settings-col">
          {/* ── Account Info ── */}
          <div className="settings-card">
            <div className="settings-card-header">
              <span className="settings-card-icon">👤</span>
              <h3>Account Information</h3>
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
                <span className="settings-info-label">Email Address</span>
                <div className="settings-info-value-row">
                  <span className="settings-info-value">{email}</span>
                  <button className="settings-copy-btn" onClick={copyEmail}>
                    {copied ? "✅ Copied" : "📋 Copy"}
                  </button>
                </div>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Account Status</span>
                <span
                  className={`settings-status ${status === "Active" ? "active" : "inactive"}`}
                >
                  {status === "Active" ? "✅" : "⛔"} {status}
                </span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Role</span>
                <span className="settings-info-value">{role}</span>
              </div>
            </div>
          </div>

          {/* ── Danger Zone ── */}
          <div className="settings-card danger-card">
            <div className="settings-card-header">
              <span className="settings-card-icon">⚠️</span>
              <h3>Account Settings</h3>
            </div>

            <p className="settings-danger-desc">
              These actions cannot be undone, please be certain before proceeding.
            </p>

            <div className="settings-danger-actions">
              <button className="settings-logout-btn" onClick={onLogout}>
                🚪 Logout
              </button>
              <button
                className="settings-delete-btn"
                onClick={() => setDeleteConfirm(true)}
              >
                🗑 Delete Account
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
              <h3>Preferences</h3>
            </div>

            <div className="settings-toggles">
              <div className="settings-toggle-item">
                <div className="settings-toggle-info">
                  <span className="settings-toggle-label">🔔 Notifications</span>
                  <span className="settings-toggle-desc">
                    Receive email notifications
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
                  <span className="settings-toggle-label">🔒 Privacy</span>
                  <span className="settings-toggle-desc">
                    Hide your information from other users
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
              <h3>About App</h3>
            </div>
            <div className="settings-info-list">
              <div className="settings-info-item">
                <span className="settings-info-label">App Name</span>
                <span className="settings-info-value">Nazamly</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Version</span>
                <span className="settings-info-value">1.0.0</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Contact Support</span>
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
            <h3 style={{ color: "var(--error)" }}>Delete Account</h3>
            <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                className="settings-delete-btn"
                style={{ flex: 1 }}
                onClick={() => {
                  setDeleteConfirm(false);
                  onLogout();
                }}
              >
                Yes, delete my account
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={() => setDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
