import { useState } from "react";
import "../styles/Signup.css";
import FormInput from "./FormInput";
import { IconEmail, IconLock, IconUser, GoogleLogo } from "../Icons/Icons";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider, API_URL } from "../firebase";

function Signup({ onSignup, switchToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwdMismatch = password && confirm && password !== confirm;

  const syncWithBackend = async (user) => {
    const token = await user.getIdToken();
    const res = await fetch(`${API_URL}/api/auth/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (pwdMismatch) return;
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
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const data = await syncWithBackend(result.user);
      onSignup(data.user);
    } catch (error) {
      alert(error.message);
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
          onChange={(e) => setUsername(e.target.value)}
          icon={<IconUser />}
          showClear
        />

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

        <FormInput
          id="confirm"
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          icon={<IconLock />}
          showClear
          showToggle
          showVisible={showConfirm}
          onToggle={() => setShowConfirm((p) => !p)}
          errorMsg={pwdMismatch ? "Passwords do not match" : ""}
        />

        <div className="terms-row">
          <input type="checkbox" id="terms" required />
          <label htmlFor="terms">
            I agree to the <a href="#">Terms and Conditions</a> and{" "}
            <a href="#">Privacy Policy</a>
          </label>
        </div>

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
