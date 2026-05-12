import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import "./CSS/App.css";
import Home from './pages/Home';
import Sidebar from './components/Sidebar';
import Users from './pages/Users';
import Departments from './pages/Departments';
import Courses from './pages/Courses';
import Doctors from './pages/Doctors';
import CourseInstances from './pages/CourseInstances';
import Chapters from './pages/Chapters';
import Materials from './pages/Materials';
import AIPanel from './pages/AIPanel';
import AdminLogin from './pages/AdminLogin';
import ProblemSubmissions from './pages/ProblemSubmissions';
import CodingProblems from './pages/CodingProblems';
import { auth, API_URL } from './firebase';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isSidebarFolded, setIsSidebarFolded] = useState(false);

  const [isDark, setIsDark] = useState(() => localStorage.getItem('adminTheme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('adminTheme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const storedData = localStorage.getItem('adminUserData');
        if (storedData) {
          const data = JSON.parse(storedData);
          if (data.user && data.user.admin && data.token) {
            try {
              const response = await fetch(`${API_URL}/api/auth/verify-admin`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${data.token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                const { user: dbUser } = await response.json();
                const updatedData = {
                  ...data,
                  user: {
                    ...data.user,
                    admin: true,
                    name: dbUser.name || data.user.name
                  }
                };
                setIsAuthenticated(true);
                setUserData(updatedData);
                localStorage.setItem('adminUserData', JSON.stringify(updatedData));
              } else {
                console.warn('Admin verification failed, clearing session');
                localStorage.removeItem('adminUserData');
                setIsAuthenticated(false);
                setUserData(null);
              }
            } catch (error) {
              console.error('Error verifying admin status:', error);
              setIsAuthenticated(true);
              setUserData(data);
            }
          }
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (data) => {
    setIsAuthenticated(true);
    setUserData(data);
    localStorage.setItem('adminUserData', JSON.stringify(data));
  };

  const handleLogout = async () => {
    await auth.signOut();
    setIsAuthenticated(false);
    setUserData(null);
    localStorage.removeItem('adminUserData');
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        color: 'var(--blue-700)',
        background: 'var(--bg-deep)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid var(--blue-glow)',
            borderTop: '3px solid var(--blue-700)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<AdminLogin onLoginSuccess={handleLoginSuccess} />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="app-layout">
        <Sidebar 
          onLogout={handleLogout} 
          userData={userData}
          onFoldChange={setIsSidebarFolded}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
        <main className={`main-content ${isSidebarFolded ? 'sidebar-folded' : ''}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/users" element={<Users />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/course-instances" element={<CourseInstances />} />
            <Route path="/chapters" element={<Chapters />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/ai-panel" element={<AIPanel />} />
            <Route path="/coding-problems" element={<CodingProblems />} />
            <Route path="/coding-problems/:id/submissions" element={<ProblemSubmissions />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
