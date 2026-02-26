import { useState } from "react";
import "./App.css";
import Login from "./components/Login";
import Signup from "./components/Signup";
import InfoPanel from "./components/InfoPanel";
import mainLogo from "./assets/logo.jpg";

function App() {
  const [isLogin, setIsLogin] = useState(true);

  const handleData = (data) => {
    console.log("Auth data:", data);
    alert("تم! راجع الـ Console.");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <a href="#">
            <img src={mainLogo} className="site-logo" alt="نظملي" />
            <h1>نظملي</h1>
          </a>
          <p className="tagline">Nazamly — منصة التعليم المتكاملة</p>
        </div>

        <div className="auth-content">
          <InfoPanel />
          {isLogin ? (
            <Login
              onLogin={handleData}
              switchToSignup={() => setIsLogin(false)}
            />
          ) : (
            <Signup
              onSignup={handleData}
              switchToLogin={() => setIsLogin(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
