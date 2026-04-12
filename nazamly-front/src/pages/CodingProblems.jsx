import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { auth, API_URL } from "../firebase";
import "../styles/CodingProblems.css";
import {
  TypeIcon,
  ArchiveIcon, 
  BrainIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  GraduationCapIcon,
  SearchIcon,
  CheckIcon
} from "../Icons/Icons";

// ══════════════════════════════════════════════
//  CUSTOM SELECT COMPONENT
// ══════════════════════════════════════════════
function NseCustomSelect({ value, onChange, options, placeholder, disabled, icon }) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className={`nse-custom-select ${open ? "open" : ""} ${disabled ? "disabled" : ""}`}>
      <button
        type="button"
        className="nse-select-trigger"
        onClick={() => !disabled && setOpen(!open)}
        aria-expanded={open}
      >
        {icon && <span className="nse-select-icon">{icon}</span>}
        <span className={`nse-select-value ${!selectedOption ? "placeholder" : ""}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`nse-select-chevron ${open ? "rotated" : ""}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open && (
        <div className="nse-select-dropdown">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`nse-select-option ${value === opt.value ? "selected" : ""}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.icon && <span className="nse-opt-icon">{opt.icon}</span>}
              <span>{opt.label}</span>
              {value === opt.value && <span className="nse-opt-check"><CheckIcon size={12} /></span>}
            </button>
          ))}
        </div>
      )}

      {open && <div className="nse-select-backdrop" onClick={() => setOpen(false)} />}
    </div>
  );
}

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Recent", icon: <ArchiveIcon size={15} /> },
  { value: "difficulty", label: "Difficulty", icon: <BrainIcon size={15} /> },
  { value: "acCount", label: "Acceptance", icon: <TrendingUpIcon size={15} /> },
];

const DIFFICULTY_LABELS = { 1: "Easy", 2: "Medium", 3: "Hard" };
const DIFFICULTY_CLASS = { 1: "diff-easy", 2: "diff-medium", 3: "diff-hard" };

const STATUS_ICONS = {
  solved: <CheckCircleIcon size={18} className="icon-solved" />,
  attempted: <TypeIcon size={18} className="icon-attempted" />,
  unsolved: <div className="icon-unsolved-circle" />
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
          <NseCustomSelect
            value={courseId}
            onChange={(val) => handleCourseChange(val)}
            options={courses.map((c) => ({
              value: c._id,
              label: `${c.courseCode} — ${c.courseName}`,
              icon: <GraduationCapIcon size={16} />
            }))}
            placeholder="— Select a course —"
            icon={<GraduationCapIcon size={16} />}
          />
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
                className={`cp-sort-btn-pill ${sort === opt.value ? "active" : ""}`}
                onClick={() => {
                  if (sort === opt.value) toggleDir();
                  else { setSort(opt.value); setDir("asc"); }
                }}
              >
                <span className="cp-sort-icon">{opt.icon}</span>
                <span>{opt.label}</span>
                {sort === opt.value && (
                  <span className={`cp-sort-arrow ${dir === "desc" ? "rotated" : ""}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5M5 12l7-7 7 7"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No course selected */}
      {!courseId && !coursesLoading && (
        <div className="cp-empty-state">
          <div className="cp-empty-svg"><TypeIcon size={54} /></div>
          <h3 className="cp-empty-title">Select a Course</h3>
          <p className="cp-empty-desc">Choose a course from the dropdown above to discover coding problems tailored to its curriculum.</p>
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
        <div className="cp-empty-state">
          <div className="cp-empty-svg"><SearchIcon size={54} /></div>
          <h3 className="cp-empty-title">No Problems Found</h3>
          <p className="cp-empty-desc">There are no coding problems available for this course yet. Check back later.</p>
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
                <span className="cp-status-svg" title={problem.solvedStatus}>
                  {STATUS_ICONS[problem.solvedStatus] || STATUS_ICONS.unsolved}
                </span>
                <span className="cp-problem-title">{problem.title}</span>
                <div className="cp-problem-meta">
                  {problem.difficulty != null && (
                    <span className={`cp-difficulty ${DIFFICULTY_CLASS[problem.difficulty]}`}>
                      {DIFFICULTY_LABELS[problem.difficulty]}
                    </span>
                  )}
                  <span className="cp-ac-count">
                    <CheckCircleIcon size={12} className="cp-ac-icon" />
                    {problem.acCount ?? 0}
                  </span>
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
