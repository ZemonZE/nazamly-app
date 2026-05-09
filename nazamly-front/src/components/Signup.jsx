import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider, API_URL } from "../firebase";
import { getFriendlyAuthError } from "../utils/authErrors";

function Signup({ onSignup, switchToLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const confirmError = password && !confirm
    ? "Please confirm your password."
    : password && confirm && password !== confirm
      ? "Passwords do not match."
      : "";

  const syncWithBackend = async (user) => {
    const token = await user.getIdToken(true);
    const res = await fetch(`${API_URL}/api/auth/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      await auth.signOut();
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Server sync failed. Please try again.");
    }
    return await res.json();
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (confirmError) return;
    setAuthError(null);
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: username });
      const data = await syncWithBackend(result.user);
      onSignup(data.user);
      navigate(data.user?.isProfileComplete === true ? "/dashboard" : "/onboarding");
    } catch (error) {
      setAuthError(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const data = await syncWithBackend(result.user);
      onSignup(data.user);
      navigate(data.user?.isProfileComplete === true ? "/dashboard" : "/onboarding");
    } catch (error) {
      setAuthError(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-5xl font-light leading-tight">
        Create your <span className="font-bold">account</span>
      </h1>
      <p className="mt-2 text-muted-foreground">Join Nazamly and start planning.</p>

      <form onSubmit={handleEmailSignup} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name</span>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => { setUsername(e.target.value); setAuthError(null); }}
              placeholder="John Doe"
              className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-ring transition"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setAuthError(null); }}
              placeholder="you@university.edu"
              className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-ring transition"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type={showPwd ? "text" : "password"}
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(null); }}
              placeholder="••••••••"
              className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-12 text-sm outline-none focus:border-ring transition"
            />
            <button
              type="button"
              onClick={() => setShowPwd((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm Password</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type={showConfirm ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setAuthError(null); }}
              placeholder="••••••••"
              className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-12 text-sm outline-none focus:border-ring transition"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
          {confirmError && (
            <p className="mt-1 text-xs text-destructive">{confirmError}</p>
          )}
        </label>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <input type="checkbox" id="terms" required className="mt-0.5 h-3.5 w-3.5 rounded" />
          <label htmlFor="terms">
            I agree to the <span className="text-foreground/80 font-medium">Terms and Conditions</span> and{" "}
            <span className="text-foreground/80 font-medium">Privacy Policy</span>
          </label>
        </div>

        {authError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
          {!loading && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
        </button>

        <div className="relative my-2 text-center text-xs text-muted-foreground">
          <span className="relative z-10 bg-background px-3">or</span>
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary transition disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l3.01-2.32z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97L3.97 7.3C4.68 5.17 6.66 3.58 9 3.58z"/></svg>
          Sign up with Google
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <span className="cursor-pointer font-semibold text-foreground hover:underline" onClick={switchToLogin}>
          Login
        </span>
      </p>
    </div>
  );
}

export default Signup;
