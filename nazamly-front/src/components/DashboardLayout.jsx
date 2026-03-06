import { useState } from "react";
import "../App.css";
import "../styles/Dashboard.css";
import { NavLink, Outlet } from "react-router-dom";
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
} from "../Icons/DashboardIcons";

const navItems = [
  { path: "/dashboard", label: "الرئيسية", icon: <IconHome /> },
  {
    path: "/dashboard/gpa-calculator",
    label: "حساب المعدل",
    icon: <IconChart />,
  },
  {
    path: "/dashboard/gpa-planner",
    label: "مخطط المعدل",
    icon: <IconCalendar />,
  },
  { path: "/dashboard/materials", label: "مركز المواد", icon: <IconBook /> },
  {
    path: "/dashboard/questions",
    label: "بنك الأسئلة",
    icon: <IconQuestion />,
  },
  { path: "/dashboard/generator", label: "منظم الجداول", icon: <IconTable /> },
];

function DashboardLayout({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const name = user?.user?.displayName || user?.user?.email || "طالب";
  const email = user?.user?.email || "";
  const avatar = name.charAt(0).toUpperCase();
  return (
    <div className="dash-wrapper">
      {/* ══ Sidebar ══ */}
      <aside className={`dash-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        {/* Logo */}
        <div className="dash-logo">
          {sidebarOpen && (
            <div className="logo-text">
              <img src={logo} alt="نظملي" className="logo-img" />
              <div>
                <h1>نظملي</h1>
                <p>صفحة الطالب</p>
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
            <div className="dash-avatar">{avatar}</div>
            <div className="dash-user-info">
              <p className="dash-username">{name}</p>
              <p className="dash-email">{email}</p>
            </div>
          </div>
        )}
        {!sidebarOpen && <div className="dash-avatar-small">{avatar}</div>}
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
            title={!sidebarOpen ? "الإعدادات" : ""}
          >
            <span className="nav-icon">
              <IconSettings />
            </span>
            {sidebarOpen && <span className="nav-label">الإعدادات</span>}
          </NavLink>
          <button
            className="dash-nav-item dash-logout"
            onClick={onLogout}
            title={!sidebarOpen ? "تسجيل الخروج" : ""}
          >
            <span className="nav-icon">
              <IconLogout />
            </span>
            {sidebarOpen && <span className="nav-label">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>
      {/* ══ Main ══ */}
      <main className="dash-main">
        <header className="dash-header">
          <h2>مرحباً، {name}!</h2>
          <p>
            لوحة معلومات النجاح الأكاديمي الشخصية الخاصة بك. تتبع تقدمك وحقق
            أهدافك.
          </p>
          <p>GPA: 3.8</p>
        </header>
        <Outlet context={{ user, onLogout }} />
      </main>
    </div>
  );
}

export default DashboardLayout;
