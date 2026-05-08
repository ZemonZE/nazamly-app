import { useState, useEffect, useRef, useCallback } from "react";
import { sendEmailVerification } from "firebase/auth";
import { auth, API_URL } from "../firebase";

/* ── How long (ms) the send button stays disabled after a successful send ── */
const COOLDOWN_MS = 60_000;
/* ── How often (ms) to poll Firebase for emailVerified flip ── */
const POLL_INTERVAL_MS = 5_000;

function VerificationBanner({ user, setUser }) {
  /* ── Only render for pending users ── */
  if (user?.accessStatus !== "pending") return null;

  return <VerificationBannerInner user={user} setUser={setUser} />;
}

/* ── Inner component so hooks always run in the same order ── */
function VerificationBannerInner({ user, setUser }) {
  /* ── Send-email state ── */
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // seconds

  /* ── Confirm-email-verified (sync) state ── */
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  /* ── Refs for intervals / timers ── */
  const cooldownTimerRef = useRef(null);
  const pollIntervalRef = useRef(null);

  /* ─────────────────────────────────────────────────────────────────────────
   * confirmVerification — polls Firebase and syncs accessStatus to backend.
   * ───────────────────────────────────────────────────────────────────────── */
  const confirmVerification = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    // Reload to get the latest emailVerified state from Firebase
    await firebaseUser.reload();

    if (!auth.currentUser.emailVerified) return; // not verified yet

    // Stop polling — we detected verification
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

      // Success — update local user state; banner unmounts automatically
      // because accessStatus becomes "active"
      setUser((prev) => ({ ...prev, ...data.user }));
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
   * handleSendVerification — calls Firebase SDK to send the verification email.
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

  /* ── Derived state ── */
  const isSendDisabled = sendLoading || cooldownRemaining > 0 || confirmLoading;

  return (
    <div
      style={{
        background: "var(--warning-bg, #fffbeb)",
        borderBottom: "1px solid var(--warning-border, #fcd34d)",
        padding: "0.65rem 1.25rem",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.5rem 1rem",
        fontSize: "0.875rem",
        color: "var(--warning-text, #92400e)",
      }}
    >
      {/* ── Warning icon ── */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      {/* ── Message ── */}
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong>Verify your email</strong>
        {sendSuccess && !confirmLoading && (
          <span style={{ marginLeft: "0.5rem", fontWeight: 400 }}>
            — Check your inbox
            {cooldownRemaining > 0 && ` (resend in ${cooldownRemaining}s)`}.
          </span>
        )}
        {confirmLoading && (
          <span
            style={{
              marginLeft: "0.5rem",
              fontWeight: 400,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                border: "2px solid currentColor",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "banner-spin 0.7s linear infinite",
              }}
            />
            Activating your account…
          </span>
        )}
      </span>

      {/* ── Inline error ── */}
      {(sendError || confirmError) && (
        <span
          style={{
            color: "var(--error-text, #b91c1c)",
            fontSize: "0.8rem",
            flexBasis: "100%",
          }}
        >
          {sendError || confirmError}
        </span>
      )}

      {/* ── Send verification email button ── */}
      <button
        type="button"
        onClick={handleSendVerification}
        disabled={isSendDisabled}
        style={{
          padding: "0.3rem 0.85rem",
          fontSize: "0.8rem",
          fontWeight: 600,
          borderRadius: "6px",
          border: "1px solid var(--warning-border, #fcd34d)",
          background: "var(--warning-btn-bg, #fef3c7)",
          color: "var(--warning-text, #92400e)",
          cursor: isSendDisabled ? "not-allowed" : "pointer",
          opacity: isSendDisabled ? 0.6 : 1,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {sendLoading
          ? "Sending…"
          : cooldownRemaining > 0
          ? `Resend in ${cooldownRemaining}s`
          : "Send verification email"}
      </button>

      {/* ── Inline keyframe for the spinner ── */}
      <style>{`
        @keyframes banner-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default VerificationBanner;
