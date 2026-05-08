import { useNavigate } from "react-router-dom";
import "../styles/VerifiedOnly.css";

/**
 * VerifiedOnly — wraps a page and shows a frosted-glass lock screen
 * over it when the user's accessStatus is not "active".
 *
 * Usage:
 *   <VerifiedOnly user={user}>
 *     <ActualPage />
 *   </VerifiedOnly>
 */
function VerifiedOnly({ user, children }) {
  const navigate = useNavigate();
  const isVerified = user?.accessStatus === "active";

  return (
    <div className="vo-wrapper">
      <div className={`vo-content ${!isVerified ? "vo-content--blurred" : ""}`} aria-hidden={!isVerified}>
        {children}
      </div>

      {!isVerified && (
        <div className="vo-overlay" role="dialog" aria-modal="true" aria-label="Email verification required">
          <div className="vo-card">
            {/* Lock icon */}
            <div className="vo-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h2 className="vo-title">Verified accounts only</h2>
            <p className="vo-desc">
              Verify your email to unlock the Question Bank and Coding Practice features.
            </p>

            <button
              type="button"
              className="vo-btn-primary"
              onClick={() => navigate("/verify-email-prompt")}
            >
              Verify my email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerifiedOnly;
