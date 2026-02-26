import { useState } from "react";
import "../styles/Login.css";
import FormInput from "./FormInput";
import { IconEmail, IconLock, GoogleLogo } from "../Icons/Icons";

function Login({ onLogin, switchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="auth-form-panel">
      <h2>تسجيل الدخول</h2>
      <p>أهلاً بك! الرجاء تسجيل الدخول إلى حسابك.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLogin({ email, password });
        }}
      >
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

        <button type="submit" className="btn-primary">
          تسجيل الدخول
        </button>
        <div className="divider">
          <span>أو</span>
        </div>
        <button type="button" className="btn-google">
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
