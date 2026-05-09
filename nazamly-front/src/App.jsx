import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
/* App.css removed — all styles now in index.css + Tailwind */
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
import CodingProblems from "./pages/CodingProblems";
import ProblemSolver from "./pages/ProblemSolver";
import Profile from "./pages/Profile";
import StudentOnboarding from "./pages/StudentOnboarding";
import VerifyEmailPrompt from "./pages/VerifyEmailPrompt";

import { auth, API_URL } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import ForgotPassword from "./components/ForgotPassword";
import VerifiedOnly from "./components/VerifiedOnly";
import { AnimatedBackground } from "./components/AnimatedBackground";
import mainLogo from "./assets/logo.jpg";

/* ── GeometricBanner — colorful SVG pattern from the Spline design ── */
function GeometricBanner() {
  return (
    <svg className="absolute inset-x-0 top-0 h-44 w-full" viewBox="0 0 600 180" preserveAspectRatio="xMidYMid slice">
      <rect width="600" height="180" fill="var(--brand-ink)" />
      <circle cx="60" cy="90" r="60" fill="var(--brand-orange)" />
      <path d="M120 180 A60 60 0 0 1 240 180 Z" fill="var(--brand-pink)" />
      <rect x="240" y="0" width="80" height="180" fill="var(--brand-teal)" />
      <circle cx="380" cy="90" r="60" fill="var(--brand-coral)" />
      <path d="M440 0 A60 60 0 0 1 560 0 Z" fill="var(--brand-orange)" transform="rotate(180 500 0)" />
      <rect x="500" y="60" width="100" height="60" fill="var(--brand-teal)" />
      <circle cx="560" cy="150" r="30" fill="var(--brand-pink)" />
    </svg>
  );
}

/* ── Auth layout — exact Spline design: animated BG + hero panel ── */
function AuthLayout({ isLogin, onLogin, onSwitchToSignup, onSwitchToLogin, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground variant="intense" />
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-16">
        {/* Form side */}
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 inline-flex items-center gap-3">
            <img src={mainLogo} className="h-12 w-12 rounded-xl object-cover shadow-md" alt="Nazamly" />
            <span className="font-display text-xl font-semibold">Nazamly</span>
          </div>

          {children ?? (
            isLogin ? (
              <Login
                onLogin={onLogin}
                switchToSignup={onSwitchToSignup}
              />
            ) : (
              <Signup
                onSignup={onLogin}
                switchToLogin={onSwitchToLogin}
              />
            )
          )}
        </div>

        {/* Hero panel — animated CSS scene (desktop only) */}
        <div className="relative hidden h-[600px] overflow-hidden rounded-3xl border border-border/60 bg-card/40 shadow-xl backdrop-blur lg:block">
          <GeometricBanner />
          <div className="absolute inset-x-0 bottom-0 p-10">
            <h2 className="font-display text-4xl font-light leading-tight">
              Plan smarter.<br /><span className="font-bold">Study deeper.</span>
            </h2>
            <p className="mt-3 max-w-sm text-muted-foreground">
              Your AI-assisted student companion for grades, materials, and code.
            </p>
          </div>
          {/* Floating tiles */}
          <div className="absolute left-10 top-20 rotate-[-6deg] rounded-2xl bg-card p-4 shadow-lg float-shape" style={{ animationDelay: "-3s" }}>
            <div className="text-xs text-muted-foreground">Current GPA</div>
            <div className="font-display text-2xl font-bold">3.86</div>
          </div>
          <div className="absolute right-8 top-44 rotate-[5deg] rounded-2xl bg-brand-ink p-4 text-white shadow-lg float-shape" style={{ animationDelay: "-7s" }}>
            <div className="text-xs opacity-70">Next event</div>
            <div className="font-display text-lg font-semibold">Ergonomics · 11:00</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);

  /* Listen for Firebase auth state changes (persists across refresh) */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken(true);
          const res = await fetch(`${API_URL}/api/auth/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (!res.ok) {
            await auth.signOut();
            setUser(null);
            return;
          }
          const data = await res.json();
          setUser(data.user);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (data) => {
    setUser(data?.user ?? data ?? null);
  };

  const handleLogout = () => {
    auth.signOut();
    setUser(null);
  };

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p style={{ fontSize: 18, opacity: 0.6 }}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <ThemeToggle />
      <Routes>
        {/* ── Root redirect ── */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ── Auth (Login / Signup) ── */}
        <Route
          path="/login"
          element={
            !user ? (
              <AuthLayout
                isLogin={isLogin}
                onLogin={handleLogin}
                onSwitchToSignup={() => setIsLogin(false)}
                onSwitchToLogin={() => setIsLogin(true)}
              />
            ) : user.isProfileComplete === true && user.accessStatus === "pending" ? (
              <Navigate to="/verify-email-prompt" replace />
            ) : user.isProfileComplete === true ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          }
        />

        {/* ── Forgot Password ── */}
        <Route
          path="/forgot-password"
          element={
            user
              ? <Navigate to="/dashboard" replace />
              : <AuthLayout><ForgotPassword /></AuthLayout>
          }
        />

        {/* ── Onboarding (incomplete profile only) ── */}
        <Route
          path="/onboarding"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user.isProfileComplete === true ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <StudentOnboarding user={user} setUser={setUser} />
            )
          }
        />

        {/* ── Verify Email Prompt (pending users with complete profile) ── */}
        <Route
          path="/verify-email-prompt"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user.isProfileComplete !== true ? (
              <Navigate to="/onboarding" replace />
            ) : user.accessStatus === "active" ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <VerifyEmailPrompt user={user} setUser={setUser} />
            )
          }
        />

        {/* ── Standalone full-page routes (no sidebar/header) ── */}
        <Route
          path="/dashboard/coding/problems/:id"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user.isProfileComplete !== true ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <VerifiedOnly user={user}>
                <ProblemSolver />
              </VerifiedOnly>
            )
          }
        />

        {/* ── Dashboard (complete profile only) ── */}
        <Route
          path="/dashboard"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user.isProfileComplete !== true ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <DashboardLayout user={user} setUser={setUser} onLogout={handleLogout} />
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
          <Route
            path="questions"
            element={
              <VerifiedOnly user={user}>
                <Questions />
              </VerifiedOnly>
            }
          />
          <Route path="generator" element={<Generator />} />
          <Route path="settings" element={<Settings />} />
          <Route
            path="coding"
            element={
              <VerifiedOnly user={user}>
                <CodingProblems />
              </VerifiedOnly>
            }
          />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* ── Catch-all: always send to /login (guards handle the rest) ── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
