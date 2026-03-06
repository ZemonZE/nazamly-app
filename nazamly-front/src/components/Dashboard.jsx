import { useOutletContext, useNavigate } from "react-router-dom";
import {
  IconChart,
  IconCalendar,
  IconBook,
  IconQuestion,
  IconTable,
} from "../Icons/DashboardIcons";

const tools = [
  {
    path: "/dashboard/gpa-calculator",
    icon: <IconChart />,
    label: "حساب المعدل",
    desc: "احسب المعدل الفصلي مع تفاصيل الدرجات",
  },
  {
    path: "/dashboard/gpa-planner",
    icon: <IconCalendar />,
    label: "مخطط المعدل",
    desc: "خطط مستقبلك الأكاديمي وتوقع معدلك النهائي",
  },
  {
    path: "/dashboard/materials",
    icon: <IconBook />,
    label: "مركز المواد",
    desc: "تصفح وشارك المواد الدراسية مع زملائك",
  },
  {
    path: "/dashboard/questions",
    icon: <IconQuestion />,
    label: "بنك الأسئلة",
    desc: "تدرب على الأسئلة واحصل على تغذية راجعة فورية",
  },
  {
    path: "/dashboard/generator",
    icon: <IconTable />,
    label: "منظم الجداول",
    desc: "حوّل بياناتك إلى جداول منسقة باحترافية",
  },
];

function Dashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const status = user?.user?.status || "نشط";
  const joinDate = user?.user?.createdAt
    ? new Date(user.user.createdAt).toLocaleDateString("ar-EG")
    : new Date().toLocaleDateString("ar-EG");

  return (
    <div className="dash-home">
      {/* ── Stats ── */}
      <div className="dash-stats">
        <div className="stat-card">
          <span className="stat-label">المعدل الحالي</span>
          <span className="stat-value green">{user?.user?.gpa || "3.0"}</span>
          <span className="stat-sub">من 5.0</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">حالة الحساب</span>
          <span className="stat-value">{status}</span>
          <span className="stat-sub">حسابك مفعّل</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">تاريخ الانضمام</span>
          <span className="stat-value date">{joinDate}</span>
          <span className="stat-sub">تاريخ التسجيل</span>
        </div>
      </div>

      {/* ── Tools ── */}
      <h2 className="dash-section-title">الأدوات المتاحة</h2>
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
            <span className="tool-link">فتح ←</span>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="Quick-Links">
        <h2 className="dash-section-title">
          هل أنت مستعد لتحسين مستواك الدراسي؟{" "}
        </h2>
        <div className="dash-quick-links">
          <button onClick={() => navigate("/dashboard/gpa-calculator")}>
            ابدأ بحساب معدلك الآن!
          </button>
          <button onClick={() => navigate("/dashboard/materials")}>
            تصفح المواد الدراسية
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
