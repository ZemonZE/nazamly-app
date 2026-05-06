import React, { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import "../styles/Profile.css";
import { IconBook, IconCode } from "../Icons/DashboardIcons";
import { TrophyIcon, GraduationCapIcon } from "../Icons/Icons";
import { auth, API_URL } from "../firebase";

const classifyGpa = (v) => {
  const n = parseFloat(v);
  if (isNaN(n) || n < 0) return { label: "", color: "", css: "" };
  if (n === 0) return { label: "Fail", color: "#ef4444", css: "cls-fail" };
  if (n < 1.5) return { label: "Pass", color: "#ef4444", css: "cls-fail" };
  if (n < 2.0) return { label: "Good", color: "#f97316", css: "cls-pass" };
  if (n < 2.5) return { label: "High Good", color: "#eab308", css: "cls-ok" };
  if (n < 3.0) return { label: "Very Good", color: "#f59e0b", css: "cls-good" };
  if (n < 3.5)
    return { label: "High Very Good", color: "#38bdf8", css: "cls-vgood" };
  if (n < 4.0) return { label: "Excellent", color: "#3b82f6", css: "cls-exc" };
  if (n <= 5.0)
    return { label: "High Excellent", color: "#22c55e", css: "cls-top" };
  return { label: "", color: "", css: "" };
};

const mockCodingHistory = [
  {
    problemName: "Two Sum",
    language: "C++",
    difficulty: "Easy",
    timeAgo: "2 hours ago",
  },
  {
    problemName: "Longest Substring",
    language: "JavaScript",
    difficulty: "Medium",
    timeAgo: "1 day ago",
  },
  {
    problemName: "Merge Intervals",
    language: "Java",
    difficulty: "Medium",
    timeAgo: "3 days ago",
  },
];

function Profile() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [quizHistory, setQuizHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Goal Tracker Mock Calculations
  const targetGpa = 3.8; // Set mock constant, ready to be linked to API later
  const currentGpa = user?.cgpa || 0;
  const remainingGpa = Math.max(targetGpa - currentGpa, 0).toFixed(2);
  const goalPercent =
    targetGpa > 0 ? Math.min((currentGpa / targetGpa) * 100, 100) : 0;

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
        if (res.ok && data.history) {
          setQuizHistory(data.history.slice(0, 4));
        }
      } catch (err) {
        console.error("Error fetching quiz history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [user]);

  if (!user) return null;

  const avatar = (user.displayName || user.fullName || "")
    .trim()
    .substring(0, 1)
    .toUpperCase();

  return (
    <div className="profile-container fade-in">
      <div className="profile-header-card">
        <div className="profile-avatar-lg">{avatar}</div>
        <div className="profile-title-info">
          <h2>{user.displayName || user.fullName || "Student"}</h2>
          <p className="profile-email">{user.email}</p>
          <span className="profile-badge status-badge">
            {user.accessStatus || "Active"}
          </span>
        </div>
      </div>

      <div className="profile-stats-grid">
        <div className="profile-stat-box">
          <p className="stat-label">CGPA</p>
          <h3>{user.cgpa ?? "—"}</h3>
          {user.cgpa != null && (
            <div
              className="profile-gpa-badge"
              style={{ color: classifyGpa(user.cgpa).color }}
            >
              {classifyGpa(user.cgpa).label}
            </div>
          )}
        </div>
        <div className="profile-stat-box">
          <p className="stat-label">Completed Hours</p>
          <h3>{user.completedHours ?? "—"}</h3>
        </div>
        <div className="profile-stat-box">
          <p className="stat-label">Role</p>
          <h3 style={{ textTransform: "capitalize" }}>
            {user.role || "student"}
          </h3>
        </div>
        <div className="profile-stat-box">
          <p className="stat-label">Member Since</p>
          <h3>
            {user.createdAt ? new Date(user.createdAt).getFullYear() : "—"}
          </h3>
        </div>
        {user.timeTableId && (
          <div className="profile-stat-box" style={{ borderColor: 'var(--blue-500)' }}>
            <p className="stat-label">Active Timetable</p>
            <h3 style={{ fontSize: '0.8rem', opacity: 0.8 }}>{user.timeTableId}</h3>
          </div>
        )}
      </div>

      {user.cgpa != null && (
        <div className="profile-goal-tracker-card">
          <div className="goal-tracker-top">
            <div className="goal-tracker-title">
              <TrophyIcon size={24} className="goal-tracker-icon" />
              <h3>GPA Goal Tracker</h3>
            </div>
            <button
              className="view-all-history-btn"
              style={{
                fontSize: "0.85rem",
                padding: "6px 16px",
                color: "#10b981",
                borderColor: "#10b981",
              }}
              onClick={() =>
                navigate("/dashboard/gpa-planner", {
                  state: { activeTab: "planner" },
                })
              }
            >
              How to reach this goal?
            </button>
          </div>
          <div className="goal-tracker-metrics">
            <div className="goal-metric">
              <span className="goal-metric-label">Current GPA</span>
              <span className="goal-metric-value">{currentGpa}</span>
            </div>
            <div className="goal-metric">
              <span className="goal-metric-label">Your Target</span>
              <span className="goal-metric-value">{targetGpa.toFixed(2)}</span>
            </div>
            <div className="goal-metric">
              <span className="goal-metric-label">Remaining to Goal</span>
              <span className="goal-metric-value highlight">
                +{remainingGpa}
              </span>
            </div>
          </div>
          <div className="goal-progress-wrap">
            <div className="goal-progress-track">
              <div
                className="goal-progress-fill"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <div className="goal-progress-labels">
              <span>0.00</span>
              <span>{Math.round(goalPercent)}% achieved</span>
              <span>{targetGpa.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="profile-courses-section nse-grad-progress">
        <div className="grad-progress-header">
          <div className="grad-progress-title">
            <GraduationCapIcon size={24} style={{ color: "var(--blue-400)" }} />
            <h3 style={{ margin: 0 }}>Graduation Progress</h3>
          </div>
          <span className="grad-progress-percent">
            {Math.round(((user.completedHours || 0) / 146) * 100)}%
          </span>
        </div>
        <div className="grad-progress-track">
          <div
            className="grad-progress-fill"
            style={{
              width: `${Math.min(Math.round(((user.completedHours || 0) / 146) * 100), 100)}%`,
            }}
          />
        </div>
        <p className="grad-progress-text">
          You have completed <strong>{user.completedHours || 0}</strong> hours.{" "}
          <strong>{Math.max(146 - (user.completedHours || 0), 0)}</strong> hours
          left to graduate.
        </p>
      </div>

      <div className="profile-courses-section">
        <h3>Registered Courses</h3>
        {user.termCourses && user.termCourses.length > 0 ? (
          <div className="profile-courses-grid">
            {user.termCourses.map((course, idx) => (
              <div key={idx} className="profile-course-card">
                <div className="course-icon-bg">
                  <IconBook width={24} height={24} />
                </div>
                <div className="course-details">
                  <h4>{course.name}</h4>
                  <p>
                    {course.courseCode} • {course.creditHours} Credits
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="profile-empty-text">
            No courses registered for this term.
          </p>
        )}
      </div>
      <div className="profile-courses-section nse-latest-quizzes">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          <TrophyIcon size={24} style={{ color: "var(--blue-400)" }} />
          <h3 style={{ margin: 0 }}>Latest Quiz Results</h3>
        </div>

        {loadingHistory ? (
          <p className="profile-empty-text">Loading recent quiz activity...</p>
        ) : quizHistory.length > 0 ? (
          <>
            <div className="profile-quizzes-grid">
              {quizHistory.map((quiz, idx) => {
                const percent =
                  quiz.totalQuestions > 0
                    ? Math.round((quiz.score / quiz.totalQuestions) * 100)
                    : 0;
                return (
                  <div key={idx} className="profile-quiz-card">
                    <div className="quiz-card-header">
                      <h4>{quiz.courseId?.courseName || "Unknown Course"}</h4>
                      <span className="quiz-date">
                        {new Date(quiz.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="quiz-card-body">
                      <div className="quiz-score-badge">
                        <span>
                          {quiz.score}/{quiz.totalQuestions}
                        </span>
                      </div>
                      <span
                        className={`quiz-percent ${percent >= 80 ? "good" : percent >= 50 ? "average" : "poor"}`}
                      >
                        {percent}% Success
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="profile-quiz-footer">
              <button
                className="view-all-history-btn"
                onClick={() =>
                  navigate("/dashboard/questions", {
                    state: { activeTab: "history" },
                  })
                }
              >
                View All History
              </button>
            </div>
          </>
        ) : (
          <p className="profile-empty-text">No quiz activities recorded yet.</p>
        )}
      </div>

      <div className="profile-courses-section nse-recent-coding">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          <IconCode
            width={24}
            height={24}
            style={{ color: "var(--blue-400)" }}
          />
          <h3 style={{ margin: 0 }}>Recent Coding Practice</h3>
        </div>

        <div className="profile-quizzes-grid">
          {mockCodingHistory.map((item, idx) => (
            <div key={idx} className="profile-quiz-card">
              <div className="quiz-card-header">
                <h4>{item.problemName}</h4>
                <span className="quiz-date">{item.timeAgo}</span>
              </div>
              <div className="quiz-card-body">
                <div className="quiz-score-badge">
                  <span>{item.language}</span>
                </div>
                <span
                  className={`quiz-percent ${item.difficulty === "Easy" ? "good" : item.difficulty === "Medium" ? "average" : "poor"}`}
                >
                  {item.difficulty}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="profile-quiz-footer">
          <button
            className="view-all-history-btn"
            onClick={() => navigate("/dashboard/coding")}
          >
            View Coding History
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
