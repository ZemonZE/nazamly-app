import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import ThemeToggle from "./components/ThemeToggle";
import Login from "./components/Login";
import Signup from "./components/Signup";
import InfoPanel from "./components/InfoPanel";
import Dashboard from "./components/Dashboard";
import DashboardLayout from "./components/DashboardLayout";

import GpaCalculator from "./pages/GpaCalculator";
import GpaPlanner from "./pages/GpaPlanner";
import Materials from "./pages/Materials";
import Questions from "./pages/Questions";
import Generator from "./pages/Generator";
import Settings from "./pages/Settings";

import mainLogo from "./assets/logo.jpg";

function App() {
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);

  const handleLogin = (data) => {
    setUser(data);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const AuthLayout = () => (
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
              onLogin={handleLogin}
              switchToSignup={() => setIsLogin(false)}
            />
          ) : (
            <Signup
              onSignup={handleLogin}
              switchToLogin={() => setIsLogin(true)}
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route
          path="/login"
          element={!user ? <AuthLayout /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <DashboardLayout user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          <Route
            index
            element={<Dashboard user={user} onLogout={handleLogout} />}
          />
          <Route path="gpa-calculator" element={<GpaCalculator />} />
          <Route path="gpa-planner" element={<GpaPlanner />} />
          <Route path="materials" element={<Materials />} />
          <Route path="questions" element={<Questions />} />
          <Route path="generator" element={<Generator />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;
