import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import "./App.css";
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
import { auth } from './firebase';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isSidebarFolded, setIsSidebarFolded] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Check if user data is stored in localStorage
        const storedData = localStorage.getItem('adminUserData');
        if (storedData) {
          const data = JSON.parse(storedData);
          if (data.user && data.user.role === 'admin') {
            setIsAuthenticated(true);
            setUserData(data);
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
        color: '#6ee7b7',
        background: '#061a10'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(110, 231, 183, 0.3)',
            borderTop: '3px solid #6ee7b7',
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
        />
        <main className={`main-content ${isSidebarFolded ? 'sidebar-folded' : ''}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/users" replace />} />
            <Route path="/users" element={<Users />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/course-instances" element={<CourseInstances />} />
            <Route path="/chapters" element={<Chapters />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/ai-panel" element={<AIPanel />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
