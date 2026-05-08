import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";
import { auth, API_URL } from "../firebase";

// 60 seconds for trying again sending verification
const COOLDOWN_MS = 60_000;
// max time to use the feature after then I will cooldown for 1 hour
const POLL_INTERVAL_MS = 5_000;

function VerifyEmailPrompt({ user, setUser }) {
  const navigate = useNavigate();

  /* ── Send-email state ── */
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  /* ── Confirm-email-verified (sync) state ── */
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  /* ── Refs for intervals / timers ── */
  const cooldownTimerRef = useRef(null);
  const pollIntervalRef = useRef(null);


  // bashof el-user verified wala lesa
  const confirmVerification = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    // pab3t le firbase tegyp el-user
    await firebaseUser.reload();

    if (!auth.currentUser.emailVerified) return; // lesa mesh verified

    // keda el-user verified
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setConfirmLoading(true);
    setConfirmError(null);

    try {
      // Force-refresh the token so it carries email_verified: true
      const token = await auth.currentUser.getIdToken(true);

      const res = await fetch(`${API_URL}/api/auth/confirm-email-verified`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setConfirmError(data?.message || "Something went wrong. Please try again.");
        // Restart polling so we can retry automatically
        startPolling();
        return;
      }

      // Success — update local user state and navigate to dashboard
      setUser((prev) => ({ ...prev, ...data.user }));
      navigate("/dashboard", { replace: true });
    } catch {
      setConfirmError("Network error — could not reach the server. Please try again.");
      startPolling();
    } finally {
      setConfirmLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─────────────────────────────────────────────────────────────────────────
   * startPolling — (re)starts the 5-second polling interval.
   * ───────────────────────────────────────────────────────────────────────── */
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      confirmVerification();
    }, POLL_INTERVAL_MS);
  }, [confirmVerification]);

  /* ── Start polling on mount; clear on unmount ── */
  useEffect(() => {
    startPolling();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [startPolling]);

  /* ─────────────────────────────────────────────────────────────────────────
   * handleSendVerification — calls Firebase SDK to send the email.
   * ───────────────────────────────────────────────────────────────────────── */
  const handleSendVerification = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    setSendLoading(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      await sendEmailVerification(firebaseUser);
      setSendSuccess(true);

      // Start 60-second cooldown
      let remaining = COOLDOWN_MS / 1000;
      setCooldownRemaining(remaining);

      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = setInterval(() => {
        remaining -= 1;
        setCooldownRemaining(remaining);
        if (remaining <= 0) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
          setCooldownRemaining(0);
        }
      }, 1000);
    } catch (err) {
      setSendError(
        err?.message || "Failed to send verification email. Please try again."
      );
    } finally {
      setSendLoading(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────
   * handleManualCheck — "I've verified my email" button handler.
   * ───────────────────────────────────────────────────────────────────────── */
  const handleManualCheck = () => {
    setConfirmError(null);
    confirmVerification();
  };

  /* ── Derived state ── */
  const isSendDisabled = sendLoading || cooldownRemaining > 0 || confirmLoading;
  const isActionsDisabled = confirmLoading;

  const email = user?.email || auth.currentUser?.email || "your email address";

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        {/* ── Header ── */}
        <div className="onboarding-header">
          <h1>Verify your email</h1>
          <p className="tagline">One quick step before you get started</p>
        </div>

        <div className="onboarding-form-panel">
          {/* ── Email display ── */}
          <p style={{ marginBottom: "1.25rem", color: "var(--text-secondary)" }}>
            We'll send a verification link to:
          </p>
          <div
            style={{
              background: "var(--bg-secondary, #f5f5f5)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              fontWeight: 600,
              wordBreak: "break-all",
            }}
          >
            {email}
          </div>

          {/* ── Send success banner ── */}
          {sendSuccess && (
            <div className="onboarding-success-banner" style={{ marginBottom: "1rem" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>
                Verification email sent! Check your inbox
                {cooldownRemaining > 0 && ` — resend available in ${cooldownRemaining}s`}.
              </span>
            </div>
          )}

          {/* ── Send error banner ── */}
          {sendError && (
            <div className="auth-error-banner" style={{ marginBottom: "1rem" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{sendError}</span>
            </div>
          )}

          {/* ── Confirm error banner ── */}
          {confirmError && (
            <div className="auth-error-banner" style={{ marginBottom: "1rem" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{confirmError}</span>
            </div>
          )}

          {/* ── Loading indicator while confirm is in flight ── */}
          {confirmLoading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 16,
                  border: "2px solid currentColor",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Activating your account…
            </div>
          )}

          {/* ── Send Verification Email button ── */}
          <button
            type="button"
            className="btn-primary"
            onClick={handleSendVerification}
            disabled={isSendDisabled}
            style={{ marginBottom: "0.75rem" }}
          >
            {sendLoading
              ? "Sending…"
              : cooldownRemaining > 0
              ? `Resend in ${cooldownRemaining}s`
              : "Send Verification Email"}
          </button>

          {/* ── I've verified my email button ── */}
          <button
            type="button"
            className="btn-primary"
            onClick={handleManualCheck}
            disabled={isActionsDisabled}
            style={{
              marginBottom: "0.75rem",
              background: "var(--bg-secondary, #f0f0f0)",
              color: "var(--text-primary, #333)",
              border: "1px solid var(--border-color, #ddd)",
            }}
          >
            {confirmLoading ? "Checking…" : "I've verified my email"}
          </button>

          {/* ── Skip for now ── */}
          <button
            type="button"
            className="onboarding-signout-btn"
            onClick={() => navigate("/dashboard", { replace: true })}
            disabled={isActionsDisabled}
            style={{ display: "block", margin: "0 auto", marginTop: "0.5rem" }}
          >
            Skip for now
          </button>
        </div>
      </div>

      {/* ── Inline keyframe for the spinner ── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default VerifyEmailPrompt;
