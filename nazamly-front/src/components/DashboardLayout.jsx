import { useState } from "react";
import "../App.css";
import "../styles/Dashboard.css";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import logo from "../assets/logo.jpg";
import {
  IconHome,
  IconChart,
  IconCalendar,
  IconBook,
  IconQuestion,
  IconTable,
  IconSettings,
  IconLogout,
  IconChevronRight,
  IconChevronLeft,
  IconCode,
  IconProfile,
} from "../Icons/DashboardIcons";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: <IconHome /> },
  {
    path: "/dashboard/gpa-calculator",
    label: "GPA Calculator",
    icon: <IconChart />,
  },
  {
    path: "/dashboard/gpa-planner",
    label: "GPA Planner",
    icon: <IconCalendar />,
  },
  {
    path: "/dashboard/materials",
    label: "Materials Center",
    icon: <IconBook />,
  },
  {
    path: "/dashboard/questions",
    label: "Question Bank",
    icon: <IconQuestion />,
  },
  {
    path: "/dashboard/generator",
    label: "Schedule Generator",
    icon: <IconTable />,
  },
  {
    path: "/dashboard/coding",
    label: "Coding Practice",
    icon: <IconCode />,
  },
  {
    path: "/dashboard/profile",
    label: "Profile",
    icon: <IconProfile />,
  },
];

const PAGE_META = {
  "/dashboard": {
    icon: <IconHome width={22} height={22} />,
    getTitle: (name) => "Welcome, " + name + "!",
    subtitle: "Your personal academic success dashboard. Track your progress.",
  },
  "/dashboard/generator": {
    icon: <IconTable width={22} height={22} />,
    title: "Schedule Generator",
    subtitle:
      "Create and customize your professionally formatted study schedules.",
  },
  "/dashboard/gpa-calculator": {
    icon: <IconChart width={22} height={22} />,
    title: "GPA Calculator",
    subtitle:
      "Calculate your semester GPA with high precision and grade details.",
  },
  "/dashboard/gpa-planner": {
    icon: <IconCalendar width={22} height={22} />,
    title: "GPA Planner",
    subtitle: "Strategize your academic future and reach your target CGPA.",
  },
  "/dashboard/materials": {
    icon: <IconBook width={22} height={22} />,
    title: "Materials Center",
    subtitle: "Access lectures, sections, and study files shared by the admin.",
  },
  "/dashboard/questions": {
    icon: <IconQuestion width={22} height={22} />,
    title: "Question Bank",
    subtitle: "Practice with past exam questions and boost your preparation.",
  },
  "/dashboard/settings": {
    icon: <IconSettings width={22} height={22} />,
    title: "Account Settings",
    subtitle: "Manage your personal info and app preferences.",
  },
  "/dashboard/coding": {
    icon: <IconCode width={22} height={22} />,
    title: "Coding Practice",
    subtitle: "Browse and solve coding problems for your courses.",
  },
  "/dashboard/profile": {
    icon: <IconProfile width={22} height={22} />,
    title: "Student Profile",
    subtitle: "View your academic info and registered courses.",
  },
};

function DashboardLayout({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const name = user?.displayName || user?.fullName || "—";
  const email = user?.email || "";
  const avatar = (name || "").trim().substring(0, 1).toUpperCase();

  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const meta = PAGE_META[normalizedPath];
  const pageTitle = meta
    ? typeof meta.getTitle === "function"
      ? meta.getTitle(name)
      : meta.title
    : "Dashboard";
  const pageSubtitle = meta?.subtitle ?? "";

  return (
    <div className="dash-wrapper">
      {/* ══ Sidebar ══ */}
      <aside className={`dash-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        {/* Logo */}
        <div className="dash-logo">
          {sidebarOpen && (
            <div className="logo-text">
              <img src={logo} alt="Nazamly" className="logo-img" />
              <div>
                <h1>Nazamly</h1>
                <p>Student Portal</p>
              </div>
            </div>
          )}
          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen((p) => !p)}
          >
            {sidebarOpen ? <IconChevronRight /> : <IconChevronLeft />}
          </button>
        </div>
        {/* User Info */}
        {sidebarOpen && (
          <div className="dash-user">
            <Link to="/dashboard/profile" style={{ textDecoration: 'none' }}>
              <div className="dash-avatar">{avatar}</div>
            </Link>
            <div className="dash-user-info">
              <p className="dash-username">{name}</p>
              <p className="dash-email">{email}</p>
            </div>
          </div>
        )}
        {!sidebarOpen && (
          <Link to="/dashboard/profile" style={{ textDecoration: 'none', display: 'flex' }}>
            <div className="dash-avatar-small">{avatar}</div>
          </Link>
        )}
        {/* Nav */}
        <nav className="dash-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) =>
                `dash-nav-item ${isActive ? "active" : ""}`
              }
              title={!sidebarOpen ? item.label : ""}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        {/* Footer: Settings & Logout */}
        <div className="dash-sidebar-footer">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              `dash-nav-item ${isActive ? "active" : ""}`
            }
            title={!sidebarOpen ? "Settings" : ""}
          >
            <span className="nav-icon">
              <IconSettings />
            </span>
            {sidebarOpen && <span className="nav-label">Settings</span>}
          </NavLink>
          <button
            className="dash-nav-item dash-logout"
            onClick={onLogout}
            title={!sidebarOpen ? "Logout" : ""}
          >
            <span className="nav-icon">
              <IconLogout />
            </span>
            {sidebarOpen && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>
      {/* ══ Main ══ */}
      <main className="dash-main">
        <header className="dash-header">
          <div className="dash-header-content">
            <div className="header-title-row">
              {meta?.icon && <span className="header-icon">{meta.icon}</span>}
              <h2 className="header-title">{pageTitle}</h2>
            </div>
            <p className="header-subtitle">{pageSubtitle}</p>
          </div>
          {user?.cgpa != null && (
            <div className="header-badge">CGPA: {user.cgpa}</div>
          )}
        </header>
        <Outlet context={{ user, onLogout }} />
      </main>
    </div>
  );
}

export default DashboardLayout;
