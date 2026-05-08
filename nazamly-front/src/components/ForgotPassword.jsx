import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import FormInput from "./FormInput";
import { IconEmail } from "../Icons/Icons";
import "../styles/Login.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setEmail("");
      setSuccess(true);
    } catch (err) {
      if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-panel">
      <h2>Reset Password</h2>
      <p>Enter your email and we&apos;ll send you a reset link.</p>

      <form onSubmit={handleSubmit}>
        <FormInput
          id="forgot-email"
          label="Email Address"
          type="email"
          placeholder="example@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          icon={<IconEmail />}
          showClear
          errorMsg={error}
          disabled={loading}
        />

        {success && (
          <p className="success-msg">Check your inbox for a reset link.</p>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p className="form-footer">
        <Link to="/login" className="forgot-link">Back to login</Link>
      </p>
    </div>
  );
}

export default ForgotPassword;
