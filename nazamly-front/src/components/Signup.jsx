import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Signup.css";
import FormInput from "./FormInput";
import { IconEmail, IconLock, IconUser, GoogleLogo } from "../Icons/Icons";
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

  // Validate confirm field: required when password has a value
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
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
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
    <div className="auth-form-panel">
      <h2>Create a New Account</h2>
      <p>Welcome! Please fill out the form below to create your account.</p>

      <form onSubmit={handleEmailSignup}>
        <FormInput
          id="username"
          label="Username"
          type="text"
          placeholder="Full Name"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setAuthError(null); }}
          icon={<IconUser />}
          showClear
        />

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

        <FormInput
          id="confirm"
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setAuthError(null); }}
          icon={<IconLock />}
          showClear
          showToggle
          showVisible={showConfirm}
          onToggle={() => setShowConfirm((p) => !p)}
          errorMsg={confirmError}
        />

        <div className="terms-row">
          <input type="checkbox" id="terms" required />
          <label htmlFor="terms">
            I agree to the <a href="#">Terms and Conditions</a> and{" "}
            <a href="#">Privacy Policy</a>
          </label>
        </div>

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
          {loading ? "Loading..." : "Sign Up"}
        </button>
        <div className="divider">
          <span>OR</span>
        </div>
        <button type="button" className="btn-google" onClick={handleGoogleSignup} disabled={loading}>
          <GoogleLogo />
          <span>Sign up with Google</span>
        </button>
      </form>

      <p className="form-footer">
        Already have an account?
        <span className="link-text" onClick={switchToLogin}>
          Login
        </span>
      </p>
    </div>
  );
}

export default Signup;
