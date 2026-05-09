import { useState, useEffect, useRef, useCallback } from "react";
import { sendEmailVerification } from "firebase/auth";
import { auth, API_URL } from "../firebase";

const COOLDOWN_MS = 60_000;
const POLL_INTERVAL_MS = 15_000;

function VerificationBanner({ user, setUser }) {
  if (user?.accessStatus !== "pending") return null;
  return <VerificationBannerInner user={user} setUser={setUser} />;
}

function VerificationBannerInner({ user, setUser }) {
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

    try {
      await firebaseUser.reload();
    } catch (reloadErr) {
      console.warn("[VerifyBanner] Firebase reload throttled, will retry:", reloadErr.message);
      return;
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
        console.warn("[VerifyBanner] Rate limited, backing off...");
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
    } catch (err) {
      console.error("[VerifyBanner] Error:", err);
      setConfirmError("Network error \u2014 could not reach the server. Please try again.");
    } finally {
      setConfirmLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const isSendDisabled = sendLoading || cooldownRemaining > 0 || confirmLoading;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
      {/* Warning icon */}
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="shrink-0" aria-hidden="true"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      {/* Message */}
      <span className="min-w-0 flex-1">
        <strong>Verify your email</strong>
        {sendSuccess && !confirmLoading && (
          <span className="ml-2 font-normal">
            — Check your inbox
            {cooldownRemaining > 0 && ` (resend in ${cooldownRemaining}s)`}.
          </span>
        )}
        {confirmLoading && (
          <span className="ml-2 inline-flex items-center gap-1.5 font-normal">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Activating your account…
          </span>
        )}
      </span>

      {/* Inline error */}
      {(sendError || confirmError) && (
        <span className="w-full text-xs text-red-700 dark:text-red-400">
          {sendError || confirmError}
        </span>
      )}

      {/* Send button */}
      <button
        type="button"
        onClick={handleSendVerification}
        disabled={isSendDisabled}
        className="shrink-0 whitespace-nowrap rounded-lg border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
      >
        {sendLoading
          ? "Sending…"
          : cooldownRemaining > 0
          ? `Resend in ${cooldownRemaining}s`
          : "Send verification email"}
      </button>
    </div>
  );
}

export default VerificationBanner;
