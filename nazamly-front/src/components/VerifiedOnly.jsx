import { useNavigate } from "react-router-dom";

/**
 * VerifiedOnly — wraps a page and shows a frosted-glass lock screen
 * over it when the user's accessStatus is not "active".
 */
function VerifiedOnly({ user, children }) {
  const navigate = useNavigate();
  const isVerified = user?.accessStatus === "active";

  return (
    <div className="relative">
      <div className={isVerified ? "" : "blur-sm pointer-events-none select-none"} aria-hidden={!isVerified}>
        {children}
      </div>

      {!isVerified && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Email verification required">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl text-center max-w-sm mx-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-mint">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">Verified accounts only</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Verify your email to unlock the Question Bank and Coding Practice features.
            </p>
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
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

