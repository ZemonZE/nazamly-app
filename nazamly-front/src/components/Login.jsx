import { useState } from "react";
import "../styles/Login.css";
import FormInput from "./FormInput";
import { IconEmail, IconLock, GoogleLogo } from "../Icons/Icons";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider, API_URL } from "../firebase";

function Login({ onLogin, switchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const syncWithBackend = async (user) => {
    const token = await user.getIdToken(true);
    const res = await fetch(`${API_URL}/api/auth/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const data = await syncWithBackend(result.user);
      onLogin(data.user);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const data = await syncWithBackend(result.user);
      onLogin(data.user);
    } catch (error) {
      alert(error.message);
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
          onChange={(e) => setEmail(e.target.value)}
          icon={<IconEmail />}
          showClear
        />

        <FormInput
          id="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<IconLock />}
          showClear
          showToggle
          showVisible={showPwd}
          onToggle={() => setShowPwd((p) => !p)}
        />

        <span className="forgot-link">Forgot password?</span>

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
