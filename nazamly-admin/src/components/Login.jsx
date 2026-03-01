import { useState } from "react";
import "../styles/Login.css";
import FormInput from "./FormInput";
import { IconEmail, IconLock } from "../Icons/Icons";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // UI only — no logic
  };

  return (
    <div className="auth-form-panel">
      <h2>تسجيل الدخول</h2>
      <p>أهلاً بك! الرجاء تسجيل الدخول إلى لوحة التحكم.</p>

      <form onSubmit={handleSubmit}>
        <FormInput
          id="email"
          label="البريد الإلكتروني"
          type="email"
          placeholder="admin@nazamly.com"
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
      </form>

      <p className="form-footer">
        هذه اللوحة مخصصة للمسؤولين فقط
      </p>
    </div>
  );
}

export default Login;
