import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { auth, API_URL } from "../firebase";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Progress } from "../components/ui/progress";
import {
  Trophy, GraduationCap, BookOpen, Code2, ArrowRight, Target,
} from "lucide-react";

const classifyGpa = (v) => {
  const n = parseFloat(v);
  if (isNaN(n) || n < 0) return { label: "", color: "" };
  if (n === 0) return { label: "Fail", color: "text-red-500" };
  if (n < 1.5) return { label: "Pass", color: "text-red-500" };
  if (n < 2.0) return { label: "Good", color: "text-orange-500" };
  if (n < 2.5) return { label: "High Good", color: "text-yellow-500" };
  if (n < 3.0) return { label: "Very Good", color: "text-amber-500" };
  if (n < 3.5) return { label: "High Very Good", color: "text-sky-400" };
  if (n < 4.0) return { label: "Excellent", color: "text-blue-500" };
  if (n <= 5.0) return { label: "High Excellent", color: "text-green-500" };
  return { label: "", color: "" };
};

function Profile() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [quizHistory, setQuizHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [codingHistory, setCodingHistory] = useState([]);
  const [codingLoading, setCodingLoading] = useState(true);
  const [codingError, setCodingError] = useState("");

  const targetGpa = 3.8;
  const currentGpa = user?.cgpa || 0;
  const remainingGpa = Math.max(targetGpa - currentGpa, 0).toFixed(2);
  const goalPercent = targetGpa > 0 ? Math.min((currentGpa / targetGpa) * 100, 100) : 0;

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_URL}/api/student/quizzes/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.history) setQuizHistory(data.history.slice(0, 4));
      } catch (err) {
        console.error("Error fetching quiz history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchCodingHistory = async () => {
      try {
        setCodingLoading(true);
        setCodingError("");
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_URL}/api/coding/history?limit=4`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) setCodingHistory(data.data);
      } catch (err) {
        setCodingError(err.message || "Failed to load coding history.");
      } finally {
        setCodingLoading(false);
      }
    };
    fetchCodingHistory();
  }, [user]);

  if (!user) return null;

  const name = user.displayName || user.fullName || "Student";
  const avatar = name.trim().substring(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:gap-5">
        <Avatar className="h-16 w-16 ring-4 ring-background">
          <AvatarFallback className="bg-brand-orange text-white text-xl font-bold">{avatar}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold">{name}</h2>
          <p className="text-sm text-muted-foreground break-all">{user.email}</p>
          <span className="mt-1.5 inline-block rounded-full bg-brand-mint px-3 py-0.5 text-xs font-semibold">
            {user.accessStatus || "Unknown"}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-brand-mint p-5">
          <p className="text-xs font-medium text-foreground/70">CGPA</p>
          <h3 className="font-display text-3xl font-bold mt-1">{user.cgpa ?? "—"}</h3>
          {user.cgpa != null && (
            <span className={`text-xs font-semibold ${classifyGpa(user.cgpa).color}`}>
              {classifyGpa(user.cgpa).label}
            </span>
          )}
        </div>
        <div className="rounded-2xl bg-brand-peach p-5">
          <p className="text-xs font-medium text-foreground/70">Completed Hours</p>
          <h3 className="font-display text-3xl font-bold mt-1">{user.completedHours ?? "—"}</h3>
        </div>
        <div className="rounded-2xl bg-brand-blush p-5">
          <p className="text-xs font-medium text-foreground/70">Role</p>
          <h3 className="font-display text-3xl font-bold mt-1 capitalize">{user.role || "student"}</h3>
        </div>
        <div className="rounded-2xl bg-secondary p-5">
          <p className="text-xs font-medium text-foreground/70">Member Since</p>
          <h3 className="font-display text-3xl font-bold mt-1">
            {user.createdAt ? new Date(user.createdAt).getFullYear() : "—"}
          </h3>
        </div>
      </div>

      {/* GPA Goal Tracker */}
      {user.cgpa != null && (
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand-orange" />
              <h3 className="font-display text-lg font-semibold">GPA Goal Tracker</h3>
            </div>
            <button
              onClick={() => navigate("/dashboard/gpa-planner", { state: { activeTab: "planner" } })}
              className="text-sm font-medium text-brand-teal hover:underline"
            >
              How to reach this goal?
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-3">
            <div><span className="text-xs text-muted-foreground">Current GPA</span><p className="font-display text-2xl font-bold">{currentGpa}</p></div>
            <div><span className="text-xs text-muted-foreground">Your Target</span><p className="font-display text-2xl font-bold">{targetGpa.toFixed(2)}</p></div>
            <div><span className="text-xs text-muted-foreground">Remaining</span><p className="font-display text-2xl font-bold text-brand-teal">+{remainingGpa}</p></div>
          </div>
          <Progress value={goalPercent} className="h-3 mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.00</span>
            <span>{Math.round(goalPercent)}% achieved</span>
            <span>{targetGpa.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Graduation Progress */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-brand-teal" />
            <h3 className="font-display text-lg font-semibold">Graduation Progress</h3>
          </div>
          <span className="text-sm font-bold">{Math.round(((user.completedHours || 0) / 146) * 100)}%</span>
        </div>
        <Progress value={Math.min(((user.completedHours || 0) / 146) * 100, 100)} className="h-3 mb-2" />
        <p className="text-sm text-muted-foreground">
          You have completed <strong>{user.completedHours || 0}</strong> hours. <strong>{Math.max(146 - (user.completedHours || 0), 0)}</strong> hours left to graduate.
        </p>
      </div>

      {/* Registered Courses */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <h3 className="font-display text-lg font-semibold mb-4">Registered Courses</h3>
        {user.termCourses && user.termCourses.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {user.termCourses.map((course, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-mint">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{course.name}</h4>
                  <p className="text-xs text-muted-foreground">{course.courseCode} • {course.creditHours} Credits</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No courses registered for this term.</p>
        )}
      </div>

      {/* Latest Quiz Results */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-brand-orange" />
          <h3 className="font-display text-lg font-semibold">Latest Quiz Results</h3>
        </div>
        {loadingHistory ? (
          <p className="text-sm text-muted-foreground">Loading recent quiz activity...</p>
        ) : quizHistory.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {quizHistory.map((quiz, idx) => {
                const percent = quiz.totalQuestions > 0 ? Math.round((quiz.score / quiz.totalQuestions) * 100) : 0;
                return (
                  <div key={idx} className="rounded-xl bg-secondary/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate">{quiz.courseId?.courseName || "Unknown Course"}</h4>
                      <span className="text-xs text-muted-foreground">{new Date(quiz.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-brand-mint px-2.5 py-0.5 text-sm font-bold">{quiz.score}/{quiz.totalQuestions}</span>
                      <span className={`text-sm font-semibold ${percent >= 80 ? "text-green-500" : percent >= 50 ? "text-amber-500" : "text-red-500"}`}>{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:underline"
              onClick={() => navigate("/dashboard/questions", { state: { activeTab: "history" } })}
            >
              View All History <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No quiz activities recorded yet.</p>
        )}
      </div>

      {/* Recent Coding Practice */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="h-5 w-5 text-brand-teal" />
          <h3 className="font-display text-lg font-semibold">Recent Coding Practice</h3>
        </div>
        {codingLoading ? (
          <p className="text-sm text-muted-foreground">Loading recent coding activity...</p>
        ) : codingHistory.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {codingHistory.map((entry) => {
                const problem = entry.problemId || {};
                const course = problem.courseId || {};
                const status = entry.verdict === "AC" ? "Solved" : entry.verdict === "WA" ? "Attempted" : "Error";
                const statusColor = entry.verdict === "AC" ? "text-green-500" : entry.verdict === "WA" ? "text-amber-500" : "text-red-500";
                return (
                  <div key={entry._id} className="rounded-xl bg-secondary/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate">{problem.title || "Coding Problem"}</h4>
                      <span className="text-xs text-muted-foreground">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{course.courseName || course.courseCode || "Unknown"}</span>
                      {entry.language && <span className="rounded bg-secondary px-1.5 py-0.5 font-mono">{entry.language.toUpperCase()}</span>}
                      <span className={`font-semibold ${statusColor}`}>{status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-teal hover:underline"
              onClick={() => navigate("/dashboard/coding")}
            >
              View Coding History <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{codingError || "No coding activity recorded yet."}</p>
        )}
      </div>
    </div>
  );
}

export default Profile;
