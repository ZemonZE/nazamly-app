import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";
import { auth, API_URL } from "../firebase";
import { AnimatedBackground } from "../components/AnimatedBackground";

const COOLDOWN_MS = 60_000;
const POLL_INTERVAL_MS = 15_000;

function VerifyEmailPrompt({ user, setUser }) {
  const navigate = useNavigate();

  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  const cooldownTimerRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const confirmVerification = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    // Reload user to check emailVerified — may throw if Firebase rate-limits
    try {
      await firebaseUser.reload();
    } catch (reloadErr) {
      console.warn("[Verify] Firebase reload throttled, will retry:", reloadErr.message);
      return; // silently skip this cycle, try again on next poll
    }

    if (!auth.currentUser.emailVerified) return;

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setConfirmLoading(true);
    setConfirmError(null);

    try {
      const token = await auth.currentUser.getIdToken(true);
      const res = await fetch(`${API_URL}/api/auth/confirm-email-verified`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.status === 429) {
        console.warn("[Verify] Rate limited, backing off...");
        return;
      }
      if (res.status === 400 && data?.message?.includes("not been verified")) {
        return;
      }
      if (!res.ok) {
        setConfirmError(data?.message || "Something went wrong. Please try again.");
        return;
      }
      setUser((prev) => ({ ...prev, ...data.user }));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("[Verify] Error:", err);
      setConfirmError("Network error — could not reach the server. Please try again.");
    } finally {
      setConfirmLoading(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      confirmVerification();
    }, POLL_INTERVAL_MS);
  }, [confirmVerification]);

  useEffect(() => {
    startPolling();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [startPolling]);

  const handleSendVerification = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    setSendLoading(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      await sendEmailVerification(firebaseUser);
      setSendSuccess(true);

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
      setSendError(err?.message || "Failed to send verification email. Please try again.");
    } finally {
      setSendLoading(false);
    }
  };

  const handleManualCheck = () => {
    setConfirmError(null);
    confirmVerification();
  };

  const isSendDisabled = sendLoading || cooldownRemaining > 0 || confirmLoading;
  const isActionsDisabled = confirmLoading;
  const email = user?.email || auth.currentUser?.email || "your email address";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-mint text-3xl">
            ✉️
          </div>
          <h1 className="font-display text-2xl font-bold">Verify your email</h1>
          <p className="mt-1 text-sm text-muted-foreground">One quick step before you get started</p>
        </div>

        {/* Email display */}
        <p className="mb-3 text-sm text-muted-foreground">We'll send a verification link to:</p>
        <div className="mb-5 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold break-all">
          {email}
        </div>

        {/* Success banner */}
        {sendSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300">
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

        {/* Send error */}
        {sendError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{sendError}</span>
          </div>
        )}

        {/* Confirm error */}
        {confirmError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{confirmError}</span>
          </div>
        )}

        {/* Loading indicator */}
        {confirmLoading && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Activating your account…
          </div>
        )}

        {/* Send Verification Email button */}
        <button
          type="button"
          onClick={handleSendVerification}
          disabled={isSendDisabled}
          className="mb-3 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sendLoading
            ? "Sending…"
            : cooldownRemaining > 0
            ? `Resend in ${cooldownRemaining}s`
            : "Send Verification Email"}
        </button>

        {/* I've verified button */}
        <button
          type="button"
          onClick={handleManualCheck}
          disabled={isActionsDisabled}
          className="mb-3 flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmLoading ? "Checking…" : "I've verified my email"}
        </button>

        {/* Skip */}
        <button
          type="button"
          onClick={() => navigate("/dashboard", { replace: true })}
          disabled={isActionsDisabled}
          className="mx-auto block text-sm text-muted-foreground transition hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

export default VerifyEmailPrompt;
