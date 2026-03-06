import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  IconBrain, 
  IconChevronLeft, 
  IconChevronRight,
  IconUser,
  IconDepartments,
  IconCourses,
  IconDoctors,
  IconCourseInstances,
  IconChapters,
  IconMaterials,
  IconAiPanel,
  IconSignOut,
  IconStudent,
  IconAdmin
} from '../Icons/Icons';
import './Sidebar.css';

function Sidebar({ onLogout, userData, onFoldChange }) {
  const [isFolded, setIsFolded] = useState(false);
  const userEmail = userData?.user?.email || 'admin@nazamly.com';
  const userName = userData?.user?.name || 'Admin User';
  const userRole = userData?.user?.role || 'admin';

  const toggleSidebar = () => {
    const newFoldedState = !isFolded;
    setIsFolded(newFoldedState);
    if (onFoldChange) {
      onFoldChange(newFoldedState);
    }
  };

  const getRoleIcon = () => {
    return userRole === 'student' ? <IconStudent /> : <IconAdmin />;
  };

  return (
    <div className={`sidebar ${isFolded ? 'folded' : ''}`}>
      <div className="sidebar-header">
        <button className="toggle-btn" onClick={toggleSidebar} title={isFolded ? 'Expand' : 'Collapse'}>
          {isFolded ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
        <div className="sidebar-header-content">
          <IconBrain />
          {!isFolded && (
            <div className="sidebar-header-text">
              <h1>نظملي</h1>
              <p className="sidebar-subtitle">Nazamly Admin</p>
            </div>
          )}
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          {!isFolded && <div className="nav-section-title">USER MANAGEMENT</div>}
          <NavLink to="/users" className="nav-link" title="Users">
            <IconUser />
            {!isFolded && <span>Users</span>}
          </NavLink>
        </div>

        <div className="nav-section">
          {!isFolded && <div className="nav-section-title">ACADEMIC CATALOG</div>}
          <NavLink to="/departments" className="nav-link" title="Departments">
            <IconDepartments />
            {!isFolded && <span>Departments</span>}
          </NavLink>
          <NavLink to="/courses" className="nav-link" title="Courses">
            <IconCourses />
            {!isFolded && <span>Courses</span>}
          </NavLink>
          <NavLink to="/doctors" className="nav-link" title="Doctors">
            <IconDoctors />
            {!isFolded && <span>Doctors</span>}
          </NavLink>
          <NavLink to="/course-instances" className="nav-link" title="Course Instances">
            <IconCourseInstances />
            {!isFolded && <span>Course Instances</span>}
          </NavLink>
          <NavLink to="/chapters" className="nav-link" title="Chapters">
            <IconChapters />
            {!isFolded && <span>Chapters</span>}
          </NavLink>
        </div>

        <div className="nav-section">
          {!isFolded && <div className="nav-section-title">CONTENT MANAGEMENT</div>}
          <NavLink to="/materials" className="nav-link" title="Materials">
            <IconMaterials />
            {!isFolded && <span>Materials</span>}
          </NavLink>
        </div>

        <div className="nav-section">
          {!isFolded && <div className="nav-section-title">AI OPERATIONS</div>}
          <NavLink to="/ai-panel" className="nav-link" title="AI Panel">
            <IconAiPanel />
            {!isFolded && <span>AI Panel</span>}
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        {!isFolded ? (
          <div className="user-profile">
            <div className="user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-role-container">
                <div className="admin-label">{userName}</div>
                <div className="user-role-badge">
                  {getRoleIcon()}
                </div>
              </div>
              <div className="admin-email">{userEmail}</div>
            </div>
            <button className="sign-out-btn-inline" onClick={onLogout} title="Sign Out">
              <IconSignOut />
            </button>
          </div>
        ) : (
          <button className="sign-out-btn-folded" onClick={onLogout} title="Sign Out">
            <IconSignOut />
          </button>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
