import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { auth, API_URL } from "../firebase";
import "../styles/CodingProblems.css";

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Recently Updated" },
  { value: "difficulty", label: "Difficulty" },
  { value: "acCount", label: "Acceptance Count" },
];

const DIFFICULTY_LABELS = { 1: "Easy", 2: "Medium", 3: "Hard" };
const DIFFICULTY_CLASS = { 1: "diff-easy", 2: "diff-medium", 3: "diff-hard" };

const STATUS_ICONS = {
  solved: "✅",
  attempted: "🔄",
  unsolved: "○",
};

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken(true);
  return { Authorization: `Bearer ${token}` };
}

function CodingProblems() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = searchParams.get("courseId") || "";

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [dir, setDir] = useState("desc");

  // Fetch all courses on mount
  useEffect(() => {
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_URL}/api/courses`, { headers });
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data || json.courses || [];
        setCourses(list);
        // Auto-select first course if none in URL
        if (!courseId && list.length > 0) {
          setSearchParams({ courseId: list[0]._id }, { replace: true });
        }
      } catch {
        // non-fatal — user can still pick manually
      } finally {
        setCoursesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch problems whenever courseId / sort / dir changes
  useEffect(() => {
    if (!courseId) return;
    fetchProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, sort, dir]);

  async function fetchProblems() {
    setLoading(true);
    setError("");
    try {
      const headers = await authHeaders();
      const params = new URLSearchParams({ courseId, sort, dir });
      const res = await fetch(`${API_URL}/api/coding/problems?${params}`, { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load problems");
      setProblems(json.data || json.problems || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCourseChange(id) {
    setProblems([]);
    setError("");
    setSearchParams({ courseId: id });
  }

  // Group problems by topic
  const grouped = problems.reduce((acc, p) => {
    const topic = p.topic || "General";
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(p);
    return acc;
  }, {});

  const toggleDir = () => setDir((d) => (d === "asc" ? "desc" : "asc"));

  const selectedCourse = courses.find((c) => c._id === courseId);

  return (
    <div className="cp-container">
      {/* Course selector */}
      <div className="cp-course-bar">
        {coursesLoading ? (
          <div className="cp-spinner cp-spinner-sm" />
        ) : (
          <select
            className="cp-course-select"
            value={courseId}
            onChange={(e) => handleCourseChange(e.target.value)}
          >
            {!courseId && <option value="">— Select a course —</option>}
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.courseCode} — {c.courseName}
              </option>
            ))}
          </select>
        )}
        {selectedCourse && (
          <span className="cp-course-meta">
            Level {selectedCourse.level} · {selectedCourse.creditHours} credits
          </span>
        )}
      </div>

      {/* Controls */}
      {courseId && (
        <div className="cp-controls">
          <h2 className="cp-title">Coding Problems</h2>
          <div className="cp-sort-row">
            <span className="cp-sort-label">Sort by:</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`cp-sort-btn ${sort === opt.value ? "active" : ""}`}
                onClick={() => {
                  if (sort === opt.value) toggleDir();
                  else { setSort(opt.value); setDir("asc"); }
                }}
              >
                {opt.label}
                {sort === opt.value && (
                  <span className="cp-sort-arrow">{dir === "asc" ? " ↑" : " ↓"}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No course selected */}
      {!courseId && !coursesLoading && (
        <div className="cp-empty">
          <span className="cp-empty-icon">💻</span>
          <p>Select a course above to browse its coding problems.</p>
        </div>
      )}

      {/* Loading problems */}
      {courseId && loading && (
        <div className="cp-center">
          <div className="cp-spinner" />
          <p>Loading problems...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="cp-error">{error}</div>
      )}

      {/* Empty */}
      {courseId && !loading && !error && problems.length === 0 && (
        <div className="cp-empty">
          <span className="cp-empty-icon">📭</span>
          <p>No problems available for this course yet.</p>
        </div>
      )}

      {/* Problem groups */}
      {!loading && !error && Object.entries(grouped).map(([topic, topicProblems]) => (
        <div key={topic} className="cp-topic-group">
          <h3 className="cp-topic-title">{topic}</h3>
          <div className="cp-problem-list">
            {topicProblems.map((problem) => (
              <div
                key={problem._id}
                className={`cp-problem-row ${problem.solvedStatus === "solved" ? "solved" : ""}`}
                onClick={() => navigate(`/dashboard/coding/problems/${problem._id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/dashboard/coding/problems/${problem._id}`)}
              >
                <span className="cp-status-icon" title={problem.solvedStatus}>
                  {STATUS_ICONS[problem.solvedStatus] || STATUS_ICONS.unsolved}
                </span>
                <span className="cp-problem-title">{problem.title}</span>
                <div className="cp-problem-meta">
                  {problem.difficulty != null && (
                    <span className={`cp-difficulty ${DIFFICULTY_CLASS[problem.difficulty]}`}>
                      {DIFFICULTY_LABELS[problem.difficulty]}
                    </span>
                  )}
                  <span className="cp-ac-count">✓ {problem.acCount ?? 0}</span>
                  <div className="cp-langs">
                    {(problem.supportedLanguages || []).map((lang) => (
                      <span key={lang} className="cp-lang-badge">{lang}</span>
                    ))}
                  </div>
                </div>
                <span className="cp-arrow">→</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CodingProblems;
