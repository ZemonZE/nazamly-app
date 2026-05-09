import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { auth, API_URL } from "../firebase";
import {
  Code2, Loader2, Search, SlidersHorizontal, ArrowUpDown, Eye, EyeOff, ChevronRight, X,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "updatedAt", label: "Recently Updated" },
  { value: "difficulty", label: "Difficulty" },
  { value: "acCount", label: "Acceptance Count" },
];

const DIFFICULTY_LABELS = { 1: "Easy", 2: "Medium", 3: "Hard" };
const DIFFICULTY_COLOR = { 1: "text-green-500 bg-green-500/10", 2: "text-amber-500 bg-amber-500/10", 3: "text-red-500 bg-red-500/10" };
const STATUS_ICONS = { solved: "✅", attempted: "🔄", unsolved: "○" };

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken(true);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
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

  const [diffVisible, setDiffVisible] = useState(false);
  const [diffToggling, setDiffToggling] = useState(false);

  const [sort, setSort] = useState("updatedAt");
  const [dir, setDir] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDiff, setFilterDiff] = useState([]);
  const [filterTopics, setFilterTopics] = useState([]);
  const [filterTags, setFilterTags] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${API_URL}/api/courses`, { headers });
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data || json.courses || [];
        setCourses(list);
        if (!courseId && list.length > 0)
          setSearchParams({ courseId: list[0]._id }, { replace: true });
      } catch { /* non-fatal */ }
      finally { setCoursesLoading(false); }
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
      const params = new URLSearchParams({ courseId, sort, dir });
      const res = await fetch(`${API_URL}/api/coding/problems?${params}`, { headers });
      const json = await res.json();
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
      const res = await fetch(`${API_URL}/api/coding/problems?${params}`, { headers });
      const json = await res.json();
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
    if (filterDiff.length > 0 && !filterDiff.includes(p.difficulty)) return false;
    const topic = p.topic || "General";
    if (filterTopics.length > 0 && !filterTopics.includes(topic)) return false;
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

  const hasActiveFilters = filterStatus !== "all" || filterDiff.length > 0 || filterTopics.length > 0 || filterTags.length > 0;

  function clearFilters() {
    setFilterStatus("all");
    setFilterDiff([]);
    setFilterTopics([]);
    setFilterTags([]);
  }

  const selectedCourse = courses.find(c => c._id === courseId);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Course selector bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {coursesLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
        ) : (
          <select
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-ring transition"
            value={courseId}
            onChange={e => handleCourseChange(e.target.value)}
          >
            {!courseId && <option value="">— Select a course —</option>}
            {courses.map(c => <option key={c._id} value={c._id}>{c.courseCode} — {c.courseName}</option>)}
          </select>
        )}
        {selectedCourse && (
          <span className="text-sm text-muted-foreground">Level {selectedCourse.level} · {selectedCourse.creditHours} credits</span>
        )}
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {courseId && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-2xl font-semibold">Coding Problems</h2>
                {hasActiveFilters && (
                  <span className="rounded-full bg-brand-mint px-2.5 py-0.5 text-xs font-semibold">{filtered.length} / {problems.length} shown</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Sort:</span>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      sort === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                    }`}
                    onClick={() => { if (sort === opt.value) toggleDir(); else { setSort(opt.value); setDir("asc"); } }}
                  >
                    {opt.label}
                    {sort === opt.value && <ArrowUpDown className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!courseId && !coursesLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Code2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-lg">Select a course above to browse its coding problems.</p>
            </div>
          )}
          {courseId && loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-brand-teal" />
              <p className="text-sm text-muted-foreground">Loading problems...</p>
            </div>
          )}
          {!loading && error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">{error}</div>}
          {courseId && !loading && !error && problems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Code2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium">No problems available for this course yet.</p>
            </div>
          )}
          {courseId && !loading && !error && problems.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium">No problems match your filters.</p>
              <button onClick={clearFilters} className="mt-2 text-sm text-brand-teal hover:underline">Clear filters</button>
            </div>
          )}

          {!loading && !error && Object.entries(grouped).map(([topic, topicProblems]) => (
            <div key={topic} className="mb-6">
              <h3 className="font-display text-lg font-semibold mb-3">{topic}</h3>
              <div className="space-y-2">
                {topicProblems.map(problem => (
                  <div
                    key={problem._id}
                    className={`group flex items-center gap-3 rounded-xl border bg-card p-4 cursor-pointer transition hover:shadow-sm hover:border-brand-teal/40 ${
                      problem.solvedStatus === "solved" ? "border-green-500/20" : "border-border/60"
                    }`}
                    onClick={() => navigate(`/dashboard/coding/problems/${problem._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && navigate(`/dashboard/coding/problems/${problem._id}`)}
                  >
                    <span className="text-lg" title={problem.solvedStatus}>{STATUS_ICONS[problem.solvedStatus] || STATUS_ICONS.unsolved}</span>
                    <span className="flex-1 font-medium text-sm truncate">{problem.title}</span>
                    <div className="flex items-center gap-2">
                      {problem.difficulty != null && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_COLOR[problem.difficulty]}`}>
                          {DIFFICULTY_LABELS[problem.difficulty]}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">✓ {problem.acCount ?? 0}</span>
                      <div className="hidden md:flex gap-1">
                        {(problem.supportedLanguages || []).map(lang => (
                          <span key={lang} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono">{lang}</span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Filters */}
        {courseId && !loading && problems.length > 0 && (
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-1"><SlidersHorizontal className="h-4 w-4" /> Filters</span>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs text-brand-teal hover:underline flex items-center gap-0.5"><X className="h-3 w-3" /> Clear</button>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Difficulty</p>
                <button
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition ${diffVisible ? "bg-brand-mint" : "bg-secondary"}`}
                  onClick={handleDiffToggle}
                  disabled={diffToggling}
                >
                  {diffToggling ? "..." : diffVisible ? (
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Showing</span>
                  ) : (
                    <span className="flex items-center gap-1"><EyeOff className="h-3 w-3" /> Hidden — reveal</span>
                  )}
                </button>
                {diffVisible && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[1, 2, 3].map(d => (
                      <button
                        key={d}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          filterDiff.includes(d) ? `${DIFFICULTY_COLOR[d]} ring-1 ring-current` : "bg-secondary"
                        }`}
                        onClick={() => toggleArr(setFilterDiff, d)}
                      >
                        {DIFFICULTY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {["all", "solved", "attempted", "unsolved"].map(s => (
                    <button
                      key={s}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                      onClick={() => setFilterStatus(s)}
                    >
                      {s === "all" ? "All" : `${STATUS_ICONS[s]} ${s.charAt(0).toUpperCase() + s.slice(1)}`}
                    </button>
                  ))}
                </div>
              </div>

              {allTopics.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Topic</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allTopics.map(t => (
                      <button key={t} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${filterTopics.includes(t) ? "bg-primary text-primary-foreground" : "bg-secondary"}`} onClick={() => toggleArr(setFilterTopics, t)}>{t}</button>
                    ))}
                  </div>
                </div>
              )}

              {allTags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                      <button key={tag} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${filterTags.includes(tag) ? "bg-primary text-primary-foreground" : "bg-secondary"}`} onClick={() => toggleArr(setFilterTags, tag)}>{tag}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default CodingProblems;