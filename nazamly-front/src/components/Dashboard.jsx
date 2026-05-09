import { useOutletContext, useNavigate, Link } from "react-router-dom";
import {
  Calculator, BookOpen, HelpCircle, Code2, ArrowUpRight, CalendarDays, Target,
} from "lucide-react";

const tools = [
  {
    path: "/dashboard/gpa-calculator",
    icon: Calculator,
    label: "GPA Calculator",
    desc: "Calculate semester GPA with grade details",
    tone: "bg-brand-mint",
  },
  {
    path: "/dashboard/gpa-planner",
    icon: Target,
    label: "GPA Planner",
    desc: "Plan your academic future and predict your final GPA",
    tone: "bg-brand-peach",
  },
  {
    path: "/dashboard/materials",
    icon: BookOpen,
    label: "Materials Center",
    desc: "Browse and share study materials with colleagues",
    tone: "bg-brand-blush",
  },
  {
    path: "/dashboard/questions",
    icon: HelpCircle,
    label: "Question Bank",
    desc: "Practice questions and get instant feedback",
    tone: "bg-secondary",
  },
  {
    path: "/dashboard/generator",
    icon: CalendarDays,
    label: "Schedule Generator",
    desc: "Convert your data into professionally formatted schedules",
    tone: "bg-brand-mint",
  },
  {
    path: "/dashboard/coding",
    icon: Code2,
    label: "Coding Practice",
    desc: "Sharpen your programming skills with interactive challenges",
    tone: "bg-brand-peach",
  },
];

function Dashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const name = user?.displayName || user?.fullName || "Student";
  const firstName = name.split(" ")[0];
  const lastName = name.split(" ").slice(1).join(" ") || "";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "Current GPA",      value: user?.cgpa != null ? user.cgpa : "—", icon: Calculator, tone: "bg-brand-mint" },
    { label: "Completed Hours",   value: user?.completedHours != null ? user.completedHours : "—", icon: BookOpen, tone: "bg-brand-peach" },
    { label: "Account Status",    value: user?.accessStatus || "Active", icon: HelpCircle, tone: "bg-brand-blush" },
    { label: "Join Date",         value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—", icon: CalendarDays, tone: "bg-secondary" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Welcome zone with animated geometric hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 shadow-sm md:p-10">
        <div className="relative z-10 max-w-xl">
          <p className="text-sm font-medium text-muted-foreground">{greeting},</p>
          <h1 className="mt-1 font-display text-5xl font-light leading-tight md:text-6xl">
            {firstName} <span className="font-bold">{lastName}</span>
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Your personal academic dashboard. Track your progress, manage your courses, and achieve your goals.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/dashboard/generator"
              className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
            >
              <CalendarDays className="h-4 w-4" /> Open schedule
            </Link>
            <Link
              to="/dashboard/gpa-planner"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary transition"
            >
              Plan my GPA <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Decorative shapes (CSS-animated) */}
        <svg className="absolute right-[-40px] top-[-30px] h-[280px] w-[280px] float-shape opacity-90" viewBox="0 0 280 280">
          <circle cx="140" cy="140" r="70" fill="var(--brand-orange)" opacity="0.85" />
          <circle cx="220" cy="80"  r="36" fill="var(--brand-coral)" opacity="0.85" />
          <path d="M40 240 A60 60 0 0 1 160 240 Z" fill="var(--brand-pink)" opacity="0.9" />
          <rect x="100" y="200" width="80" height="60" rx="10" fill="var(--brand-teal)" opacity="0.9" />
        </svg>
      </div>

      {/* Quick stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl ${s.tone} p-5`}>
            <s.icon className="h-5 w-5 text-foreground/70" />
            <div className="mt-3 font-display text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs font-medium text-foreground/70">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Available Tools */}
      <h2 className="mt-8 font-display text-xl font-semibold">Available Tools</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <div
            key={tool.path}
            className="group cursor-pointer rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition hover:shadow-md hover:border-brand-teal/40"
            onClick={() => navigate(tool.path)}
          >
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${tool.tone}`}>
              <tool.icon className="h-5 w-5 text-foreground/70" />
            </div>
            <h3 className="mt-4 font-semibold">{tool.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{tool.desc}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-teal opacity-0 transition group-hover:opacity-100">
              Open <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
