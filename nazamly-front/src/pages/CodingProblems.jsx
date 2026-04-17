import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { auth, API_URL } from "../firebase";
import "../styles/CodingProblems.css";

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Recently Updated" },
  { value: "difficulty", label: "Difficulty" },
  { value: "acCount", label: "Acceptance Count" },
];

const DIFFICULTY_LABELS = { 1: "Easy", 2: "Medium", 3: "Hard" };
const DIFFICULTY_CLASS  = { 1: "diff-easy", 2: "diff-medium", 3: "diff-hard" };
const STATUS_ICONS      = { solved: "✅", attempted: "🔄", unsolved: "○" };

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken(true);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function CodingProblems() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate   = useNavigate();
  const courseId   = searchParams.get("courseId") || "";

  const [courses,        setCourses]        = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [problems,       setProblems]       = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");

  const [diffVisible,    setDiffVisible]    = useState(false);
  const [diffToggling,   setDiffToggling]   = useState(false);

  const [sort,           setSort]           = useState("updatedAt");
  const [dir,            setDir]            = useState("desc");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterDiff,     setFilterDiff]     = useState([]);
  const [filterTopics,   setFilterTopics]   = useState([]);
  const [filterTags,     setFilterTags]     = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const headers = await authHeaders();
        const res  = await fetch(`${API_URL}/api/courses`, { headers });
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data || json.courses || [];
        setCourses(list);
        if (!courseId && list.length > 0)
          setSearchParams({ courseId: list[0]._id }, { replace: true });
      } catch { /* non-fatal */ }
      finally  { setCoursesLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!courseId) return;
    fetchProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, sort, dir]);

  async function fetchProblems() {
    setLoading(true);
    setError("");
    setFilterStatus("all");
    setFilterDiff([]);
    setFilterTopics([]);
    setFilterTags([]);
    try {
      const headers = await authHeaders();
      const params  = new URLSearchParams({ courseId, sort, dir });
      const res     = await fetch(`${API_URL}/api/coding/problems?${params}`, { headers });
      const json    = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load problems");
      const list = json.data || json.problems || [];
      setProblems(list);
      setDiffVisible(list.some(p => p.showDifficulty));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleDiffToggle = useCallback(async () => {
    if (diffToggling || problems.length === 0) return;
    const next = !diffVisible;
    setDiffToggling(true);
    setDiffVisible(next);
    if (!next) setFilterDiff([]);
    try {
      const headers = await authHeaders();
      await Promise.all(
        problems.map(p =>
          fetch(`${API_URL}/api/coding/problems/${p._id}/difficulty-preference`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ showDifficulty: next }),
          })
        )
      );
      const params = new URLSearchParams({ courseId, sort, dir });
      const res    = await fetch(`${API_URL}/api/coding/problems?${params}`, { headers });
      const json   = await res.json();
      if (res.ok) setProblems(json.data || json.problems || []);
    } catch {
      setDiffVisible(d => !d);
    } finally {
      setDiffToggling(false);
    }
  }, [diffToggling, diffVisible, problems, courseId, sort, dir]);

  function handleCourseChange(id) {
    setProblems([]);
    setError("");
    setDiffVisible(false);
    setSearchParams({ courseId: id });
  }

  const toggleDir = () => setDir(d => d === "asc" ? "desc" : "asc");

  const allTopics = useMemo(() =>
    [...new Set(problems.map(p => p.topic || "General"))].sort(), [problems]);

  const allTags = useMemo(() =>
    [...new Set(problems.flatMap(p => p.tags || []))].sort(), [problems]);

  const filtered = useMemo(() => problems.filter(p => {
    if (filterStatus !== "all" && p.solvedStatus !== filterStatus) return false;
    if (filterDiff.length > 0 && !filterDiff.includes(p.difficulty))  return false;
    const topic = p.topic || "General";
    if (filterTopics.length > 0 && !filterTopics.includes(topic))     return false;
    if (filterTags.length > 0 && !filterTags.some(t => (p.tags || []).includes(t))) return false;
    return true;
  }), [problems, filterStatus, filterDiff, filterTopics, filterTags]);

  const grouped = useMemo(() => filtered.reduce((acc, p) => {
    const topic = p.topic || "General";
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(p);
    return acc;
  }, {}), [filtered]);

  function toggleArr(setter, val) {
    setter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  const hasActiveFilters =
    filterStatus !== "all" || filterDiff.length > 0 ||
    filterTopics.length > 0 || filterTags.length > 0;

  function clearFilters() {
    setFilterStatus("all");
    setFilterDiff([]);
    setFilterTopics([]);
    setFilterTags([]);
  }

  const selectedCourse = courses.find(c => c._id === courseId);

  return (
    <div className="cp-container">
      <div className="cp-course-bar">
        {coursesLoading ? <div className="cp-spinner cp-spinner-sm" /> : (
          <select className="cp-course-select" value={courseId} onChange={e => handleCourseChange(e.target.value)}>
            {!courseId && <option value="">— Select a course —</option>}
            {courses.map(c => <option key={c._id} value={c._id}>{c.courseCode} — {c.courseName}</option>)}
          </select>
        )}
        {selectedCourse && (
          <span className="cp-course-meta">Level {selectedCourse.level} · {selectedCourse.creditHours} credits</span>
        )}
      </div>

      <div className="cp-layout">
        <div className="cp-main">
          {courseId && (
            <div className="cp-controls">
              <div className="cp-title-row">
                <h2 className="cp-title">Coding Problems</h2>
                {hasActiveFilters && <span className="cp-filter-count">{filtered.length} / {problems.length} shown</span>}
              </div>
              <div className="cp-sort-row">
                <span className="cp-sort-label">Sort by:</span>
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} className={`cp-sort-btn ${sort === opt.value ? "active" : ""}`}
                    onClick={() => { if (sort === opt.value) toggleDir(); else { setSort(opt.value); setDir("asc"); } }}>
                    {opt.label}
                    {sort === opt.value && <span className="cp-sort-arrow">{dir === "asc" ? " ↑" : " ↓"}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!courseId && !coursesLoading && <div className="cp-empty"><span className="cp-empty-icon">💻</span><p>Select a course above to browse its coding problems.</p></div>}
          {courseId && loading && <div className="cp-center"><div className="cp-spinner" /><p>Loading problems...</p></div>}
          {!loading && error && <div className="cp-error">{error}</div>}
          {courseId && !loading && !error && problems.length === 0 && <div className="cp-empty"><span className="cp-empty-icon">📭</span><p>No problems available for this course yet.</p></div>}
          {courseId && !loading && !error && problems.length > 0 && filtered.length === 0 && (
            <div className="cp-empty">
              <span className="cp-empty-icon">🔍</span>
              <p>No problems match your filters.</p>
              <button className="cp-clear-btn" onClick={clearFilters}>Clear filters</button>
            </div>
          )}

          {!loading && !error && Object.entries(grouped).map(([topic, topicProblems]) => (
            <div key={topic} className="cp-topic-group">
              <h3 className="cp-topic-title">{topic}</h3>
              <div className="cp-problem-list">
                {topicProblems.map(problem => (
                  <div key={problem._id} className={`cp-problem-row ${problem.solvedStatus === "solved" ? "solved" : ""}`}
                    onClick={() => navigate(`/dashboard/coding/problems/${problem._id}`)}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && navigate(`/dashboard/coding/problems/${problem._id}`)}>
                    <span className="cp-status-icon" title={problem.solvedStatus}>{STATUS_ICONS[problem.solvedStatus] || STATUS_ICONS.unsolved}</span>
                    <span className="cp-problem-title">{problem.title}</span>
                    <div className="cp-problem-meta">
                      {problem.difficulty != null && <span className={`cp-difficulty ${DIFFICULTY_CLASS[problem.difficulty]}`}>{DIFFICULTY_LABELS[problem.difficulty]}</span>}
                      <span className="cp-ac-count">✓ {problem.acCount ?? 0}</span>
                      <div className="cp-langs">{(problem.supportedLanguages || []).map(lang => <span key={lang} className="cp-lang-badge">{lang}</span>)}</div>
                    </div>
                    <span className="cp-arrow">→</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {courseId && !loading && problems.length > 0 && (
          <aside className="cp-sidebar">
            <div className="cp-sidebar-header">
              <span>Filters</span>
              {hasActiveFilters && <button className="cp-sidebar-clear" onClick={clearFilters}>Clear all</button>}
            </div>

            <div className="cp-filter-section">
              <p className="cp-filter-label">Difficulty</p>
              <button className={`cp-diff-toggle-btn ${diffVisible ? "on" : ""}`} onClick={handleDiffToggle} disabled={diffToggling}>
                {diffToggling ? "..." : diffVisible ? "👁 Showing difficulty" : "🙈 Hidden — click to reveal"}
              </button>
              {diffVisible && (
                <div className="cp-diff-chips">
                  {[1, 2, 3].map(d => (
                    <button key={d} className={`cp-filter-chip diff-chip-${d} ${filterDiff.includes(d) ? "active" : ""}`} onClick={() => toggleArr(setFilterDiff, d)}>
                      {DIFFICULTY_LABELS[d]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="cp-filter-section">
              <p className="cp-filter-label">Status</p>
              {["all", "solved", "attempted", "unsolved"].map(s => (
                <button key={s} className={`cp-filter-chip ${filterStatus === s ? "active" : ""}`} onClick={() => setFilterStatus(s)}>
                  {s === "all" ? "All" : STATUS_ICONS[s] + " " + s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {allTopics.length > 0 && (
              <div className="cp-filter-section">
                <p className="cp-filter-label">Topic</p>
                {allTopics.map(t => (
                  <button key={t} className={`cp-filter-chip ${filterTopics.includes(t) ? "active" : ""}`} onClick={() => toggleArr(setFilterTopics, t)}>{t}</button>
                ))}
              </div>
            )}

            {allTags.length > 0 && (
              <div className="cp-filter-section">
                <p className="cp-filter-label">Tags</p>
                <div className="cp-filter-tags">
                  {allTags.map(tag => (
                    <button key={tag} className={`cp-filter-chip tag-chip ${filterTags.includes(tag) ? "active" : ""}`} onClick={() => toggleArr(setFilterTags, tag)}>{tag}</button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default CodingProblems;
