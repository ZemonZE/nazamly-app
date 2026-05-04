import React from "react";
import { useNavigate } from "react-router-dom";
import "../CSS/Home.css";
import {
  IconUser,
  IconDepartments,
  IconCourses,
  IconDoctors,
  IconCourseInstances,
  IconChapters,
  IconMaterials,
  IconAiPanel,
  IconCode,
  IconHome,
} from "../Icons/Icons";

const userManagement = [
  {
    path: "/users",
    icon: <IconUser />,
    label: "Users Management",
    desc: "Manage user access, roles, and permissions.",
  },
];

const academicCatalog = [
  {
    path: "/departments",
    icon: <IconDepartments />,
    label: "Departments",
    desc: "Configure university departments and faculties.",
  },
  {
    path: "/courses",
    icon: <IconCourses />,
    label: "Courses Catalog",
    desc: "Manage the global course and catalog database.",
  },
  {
    path: "/doctors",
    icon: <IconDoctors />,
    label: "Doctors",
    desc: "Manage professors and faculty staff members.",
  },
  {
    path: "/course-instances",
    icon: <IconCourseInstances />,
    label: "Course Instances",
    desc: "Manage specific term offerings and instances.",
  },
  {
    path: "/chapters",
    icon: <IconChapters />,
    label: "Chapters",
    desc: "Organize course content and chapter structures.",
  },
];

const contentManagement = [
  {
    path: "/materials",
    icon: <IconMaterials />,
    label: "Materials Center",
    desc: "Upload and organize study files and resources.",
  },
  {
    path: "/coding-problems",
    icon: <IconCode />,
    label: "Coding Problems",
    desc: "Manage the coding practice bank and challenges.",
  },
];

const aiOperations = [
  {
    path: "/ai-panel",
    icon: <IconAiPanel />,
    label: "AI Control Panel",
    desc: "Configure AI generation settings and prompts.",
  },
];

function Home() {
  const navigate = useNavigate();

  const renderTools = (tools) => (
    <div className="dash-tools">
      {tools.map((tool) => (
        <div
          key={tool.path}
          className="tool-card"
          onClick={() => navigate(tool.path)}
        >
          <div className="tool-icon">{tool.icon}</div>
          <h3>{tool.label}</h3>
          <p>{tool.desc}</p>
          <span className="tool-link">Open &rarr;</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="dash-home admin-home-fade">
      {/* ── Header ── */}
      <div className="dash-header">
        <div className="dash-header-content">
          <div className="header-title-row">
            <div className="header-icon">
              <IconHome />
            </div>
            <h1 className="header-title">Welcome to Nazamly Admin Dashboard</h1>
          </div>
          <p className="header-subtitle">
            Manage system users, academic catalogs, and AI operations from one
            place.
          </p>
        </div>
        <div className="header-badge">Admin Panel</div>
      </div>

      {/* ── User Management ── */}
      <div>
        <h2 className="dash-section-title">USER MANAGEMENT</h2>
        {renderTools(userManagement)}
      </div>

      {/* ── Academic Catalog ── */}
      <div>
        <h2 className="dash-section-title">ACADEMIC CATALOG</h2>
        {renderTools(academicCatalog)}
      </div>

      {/* ── Content Management ── */}
      <div>
        <h2 className="dash-section-title">CONTENT MANAGEMENT</h2>
        {renderTools(contentManagement)}
      </div>

      {/* ── AI Operations ── */}
      <div>
        <h2 className="dash-section-title">AI OPERATIONS</h2>
        {renderTools(aiOperations)}
      </div>
    </div>
  );
}

export default Home;
