import { useState } from "react";
import "../styles/Signup.css";
import FormInput from "./FormInput";
import { IconEmail, IconLock, IconUser, GoogleLogo } from "../Icons/Icons";

function Signup({ onSignup, switchToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const pwdMismatch = password && confirm && password !== confirm;

  return (
    <div className="auth-form-panel">
      <h2>إنشاء حساب جديد</h2>
      <p>مرحباً بك! الرجاء ملء النموذج التالي لإنشاء حسابك.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!pwdMismatch) onSignup({ username, email, password });
        }}
      >
        <FormInput
          id="username"
          label="اسم المستخدم"
          type="text"
          placeholder="الاسم الكامل"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          icon={<IconUser />}
          showClear
        />

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

        <FormInput
          id="confirm"
          label="تأكيد كلمة المرور"
          placeholder="أعد إدخال كلمة المرور"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          icon={<IconLock />}
          showClear
          showToggle
          showVisible={showConfirm}
          onToggle={() => setShowConfirm((p) => !p)}
          errorMsg={pwdMismatch ? "كلمة المرور غير متطابقة" : ""}
        />

        <div className="terms-row">
          <input type="checkbox" id="terms" required />
          <label htmlFor="terms">
            أوافق على <a href="#">الشروط والأحكام</a> و{" "}
            <a href="#">سياسة الخصوصية</a>
          </label>
        </div>

        <button type="submit" className="btn-primary">
          إنشاء حساب
        </button>
        <div className="divider">
          <span>أو</span>
        </div>
        <button type="button" className="btn-google">
          <GoogleLogo />
          <span>التسجيل باستخدام جوجل</span>
        </button>
      </form>

      <p className="form-footer">
        هل لديك حساب؟
        <span className="link-text" onClick={switchToLogin}>
          تسجيل الدخول
        </span>
      </p>
    </div>
  );
}

export default Signup;
