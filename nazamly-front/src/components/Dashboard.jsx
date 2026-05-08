import { useOutletContext, useNavigate } from "react-router-dom";
import {
  IconChart,
  IconCalendar,
  IconBook,
  IconQuestion,
  IconTable,
  IconCode,
} from "../Icons/DashboardIcons";

const tools = [
  {
    path: "/dashboard/gpa-calculator",
    icon: <IconChart />,
    label: "GPA Calculator",
    desc: "Calculate semester GPA with grade details",
  },
  {
    path: "/dashboard/gpa-planner",
    icon: <IconCalendar />,
    label: "GPA Planner",
    desc: "Plan your academic future and predict your final GPA",
  },
  {
    path: "/dashboard/materials",
    icon: <IconBook />,
    label: "Materials Center",
    desc: "Browse and share study materials with colleagues",
  },
  {
    path: "/dashboard/questions",
    icon: <IconQuestion />,
    label: "Question Bank",
    desc: "Practice questions and get instant feedback",
  },
  {
    path: "/dashboard/generator",
    icon: <IconTable />,
    label: "Schedule Generator",
    desc: "Convert your data into professionally formatted schedules",
  },
  {
    path: "/dashboard/coding",
    icon: <IconCode />,
    label: "Coding Practice",
    desc: "Sharpen your programming skills with interactive challenges and real-time feedback.",
  },
];

function Dashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const status = user?.accessStatus || "Unknown";
  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US")
    : new Date().toLocaleDateString("en-US");

  return (
    <div className="dash-home">
      {/* ── Stats ── */}
      <div className="dash-stats">
        <div className="stat-card">
          <span className="stat-label">Current GPA</span>
          <span className="stat-value green">{user?.cgpa != null ? user.cgpa : "—"}</span>
          <span className="stat-sub">out of 5.0</span>
          {user?.cgpa != null && (
            <div className="stat-progress-track">
              <div
                className="stat-progress-fill"
                style={{ width: `${Math.min((user.cgpa / 5) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed Hours</span>
          <span className="stat-value">{user?.completedHours != null ? user.completedHours : "—"}</span>
          <span className="stat-sub">credit hours earned</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Account Status</span>
          <span className="stat-value">{status}</span>
          <span className="stat-sub">{status}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Join Date</span>
          <span className="stat-value date">{joinDate}</span>
          <span className="stat-sub">Registration Date</span>
        </div>
      </div>

      {/* ── Tools ── */}
      <h2 className="dash-section-title">Available Tools</h2>
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

      {/* Quick Links */}
      <div className="Quick-Links">
        <h2 className="dash-section-title">
          Ready to boost your academic performance?{" "}
        </h2>
        <div className="dash-quick-links">
          <button onClick={() => navigate("/dashboard/gpa-calculator")}>
            Start calculating your GPA now!
          </button>
          <button onClick={() => navigate("/dashboard/materials")}>
            Browse study materials
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
