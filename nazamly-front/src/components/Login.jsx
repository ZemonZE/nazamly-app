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

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const data = await syncWithBackend(result.user);
      onLogin(data);
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
      onLogin(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-panel">
      <h2>تسجيل الدخول</h2>
      <p>أهلاً بك! الرجاء تسجيل الدخول إلى حسابك.</p>

      <form onSubmit={handleEmailLogin}>
        <FormInput
          id="email"
          label="البريد الإلكتروني"
          type="email"
          placeholder="example@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<IconEmail />}
          showClear
        />

        <FormInput
          id="password"
          label="كلمة المرور"
          placeholder="أدخل كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<IconLock />}
          showClear
          showToggle
          showVisible={showPwd}
          onToggle={() => setShowPwd((p) => !p)}
        />

        <span className="forgot-link">هل نسيت كلمة المرور؟</span>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "جاري التحميل..." : "تسجيل الدخول"}
        </button>
        <div className="divider">
          <span>أو</span>
        </div>
        <button type="button" className="btn-google" onClick={handleGoogleLogin} disabled={loading}>
          <GoogleLogo />
          <span>تسجيل الدخول باستخدام جوجل</span>
        </button>
      </form>

      <p className="form-footer">
        ليس لديك حساب؟
        <span className="link-text" onClick={switchToSignup}>
          إنشاء حساب
        </span>
      </p>
    </div>
  );
}

export default Login;
