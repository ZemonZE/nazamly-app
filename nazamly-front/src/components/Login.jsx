import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import FormInput from "./FormInput";
import { IconEmail, IconLock, GoogleLogo } from "../Icons/Icons";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider, API_URL } from "../firebase";
import { getFriendlyAuthError } from "../utils/authErrors";

function Login({ onLogin, switchToSignup }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

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

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const data = await syncWithBackend(result.user);
      onLogin(data.user);
      navigate(data.user?.isProfileComplete === true ? "/dashboard" : "/onboarding");
    } catch (error) {
      setAuthError(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const data = await syncWithBackend(result.user);
      onLogin(data.user);
      navigate(data.user?.isProfileComplete === true ? "/dashboard" : "/onboarding");
    } catch (error) {
      setAuthError(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-panel">
      <h2>Login</h2>
      <p>Welcome back! Please login to your account.</p>

      <form onSubmit={handleEmailLogin}>
        <FormInput
          id="email"
          label="Email Address"
          type="email"
          placeholder="example@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setAuthError(null); }}
          icon={<IconEmail />}
          showClear
        />

        <FormInput
          id="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setAuthError(null); }}
          icon={<IconLock />}
          showClear
          showToggle
          showVisible={showPwd}
          onToggle={() => setShowPwd((p) => !p)}
        />

        <span className="forgot-link">Forgot password?</span>

        {authError && (
          <div className="auth-error-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{authError}</span>
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Loading..." : "Login"}
        </button>
        <div className="divider">
          <span>OR</span>
        </div>
        <button type="button" className="btn-google" onClick={handleGoogleLogin} disabled={loading}>
          <GoogleLogo />
          <span>Login with Google</span>
        </button>
      </form>

      <p className="form-footer">
        Don't have an account?
        <span className="link-text" onClick={switchToSignup}>
          Sign Up
        </span>
      </p>
    </div>
  );
}

export default Login;
