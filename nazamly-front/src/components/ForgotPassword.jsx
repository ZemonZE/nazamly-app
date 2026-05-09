import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

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
    <div>
      <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to login
      </Link>

      <h1 className="font-display text-5xl font-light leading-tight">
        Reset <span className="font-bold">password</span>
      </h1>
      <p className="mt-2 text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="you@university.edu"
              disabled={loading}
              className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-ring transition disabled:opacity-50"
            />
          </div>
        </label>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-brand-mint px-4 py-3 text-sm text-foreground">
            <CheckCircle className="h-4 w-4 shrink-0 text-brand-teal" />
            <span>Check your inbox for a reset link.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Reset Link"}
          {!loading && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
        </button>
      </form>
    </div>
  );
}

export default ForgotPassword;
