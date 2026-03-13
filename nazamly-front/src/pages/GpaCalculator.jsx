import { useState } from "react";
import { IconTrash } from "../Icons/DashboardIcons";
import { calculateTermGPA } from "../services/gpaService";

/* mark → grade‑point (same formula the backend uses) */
const markToGP = (m) => (m < 60 ? 0 : Number(((m / 10) - 5).toFixed(1)));

function GpaCalculator() {
  const [courses, setCourses] = useState([]);
  const [courseCode, setCourseCode] = useState("");
  const [mark, setMark] = useState(80);
  const [credits, setCredits] = useState(3);
  const [isRetake, setIsRetake] = useState(false);

  /* Result from the server */
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addCourse = () => {
    if (!courseCode.trim()) return;
    const m = Math.min(100, Math.max(0, parseInt(mark)));
    setCourses((prev) => [
      ...prev,
      {
        id: Date.now(),
        courseCode: courseCode.trim(),
        mark: m,
        creditHours: parseInt(credits),
        isRetake,
      },
    ]);
    setCourseCode("");
    setMark(80);
    setCredits(3);
    setIsRetake(false);
    setResult(null); // clear stale result
  };

  const removeCourse = (id) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setResult(null);
  };

  /* ── Call the server ── */
  const handleCalculate = async () => {
    if (!courses.length) return;
    setLoading(true);
    setError("");
    try {
      const data = await calculateTermGPA(
        courses.map(({ courseCode, creditHours, mark, isRetake }) => ({
          courseCode,
          creditHours,
          mark,
          isRetake,
        }))
      );
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Local quick stats ── */
  const totalCredits = courses.reduce((s, c) => s + c.creditHours, 0);
  const avgMark = courses.length
    ? (courses.reduce((s, c) => s + c.mark, 0) / courses.length).toFixed(1)
    : 0;

  return (
    <div className="dash-home">
      {/* ── Title ── */}
      <div>
        <h2 className="page-title">GPA Calculator</h2>
        <p className="page-sub">Calculate your semester GPA with grade details</p>
      </div>

      {/* ── GPA Result Card ── */}
      <div className="gpa-result-card">
        <div className="gpa-main">
          <span className="gpa-label">
            {result ? "Semester GPA" : "Current GPA"}
          </span>
          <span className="gpa-value">
            {result ? result.termGPA : "—"}
          </span>
        </div>
        <div className="gpa-sub-stats">
          <div className="gpa-sub-item">
            <span className="gpa-sub-label">Expected CGPA</span>
            <span className="gpa-sub-value">
              {result ? result.newCGPA : "—"}
            </span>
          </div>
          <div className="gpa-sub-item">
            <span className="gpa-sub-label">Total Hours</span>
            <span className="gpa-sub-value">
              {result ? result.termHoursCalculated : totalCredits}
            </span>
          </div>
          <div className="gpa-sub-item">
            <span className="gpa-sub-label">Courses Count</span>
            <span className="gpa-sub-value">{courses.length}</span>
          </div>
          <div className="gpa-sub-item">
            <span className="gpa-sub-label">Average Grade</span>
            <span className="gpa-sub-value">{avgMark}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="planner-alert planner-alert-red">{error}</div>
      )}

      {/* ── Bottom Grid ── */}
      <div className="gpa-grid">
        {/* Add Course */}
        <div className="gpa-card">
          <h3>Add Course</h3>

          <div className="form-group">
            <label>Course Code</label>
            <input
              className="gpa-input"
              type="text"
              placeholder="Example: CS 301"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCourse()}
            />
          </div>

          <div className="form-group">
            <label>Grade (0 — 100)</label>
            <input
              className="gpa-input"
              type="number"
              min={0}
              max={100}
              step={1}
              value={mark}
              onChange={(e) => setMark(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Credit Hours</label>
            <input
              className="gpa-input"
              type="number"
              min={1}
              max={6}
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="isRetake"
              checked={isRetake}
              onChange={(e) => setIsRetake(e.target.checked)}
            />
            <label htmlFor="isRetake" style={{ margin: 0 }}>Retake Course</label>
          </div>

          <button className="btn-primary" onClick={addCourse}>
            + Add Course
          </button>
        </div>

        {/* Courses List */}
        <div className="gpa-card">
          <h3>Added Courses</h3>
          <p className="gpa-courses-count">
            {courses.length
              ? `${courses.length} course(s) added`
              : "No courses added yet"}
          </p>

          <div className="gpa-courses-list">
            {courses.length === 0 && (
              <div className="gpa-empty">
                <span>📚</span>
                <p>Add courses to calculate your GPA</p>
              </div>
            )}
            {courses.map((c) => (
              <div key={c.id} className="gpa-course-item">
                <div className="gpa-course-info">
                  <span className="gpa-course-name">{c.courseCode}</span>
                  <span className="gpa-course-detail">
                    {c.creditHours} hours • grade {c.mark}/100 → {markToGP(c.mark)} GPA
                    {c.isRetake ? " (Retake)" : ""}
                  </span>
                </div>
                <div className="gpa-course-right">
                  <span className="gpa-course-grade">
                    {(markToGP(c.mark) * c.creditHours).toFixed(1)}
                  </span>
                  <button
                    className="gpa-delete-btn"
                    onClick={() => removeCourse(c.id)}
                  >
                    <IconTrash width={16} height={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {courses.length > 0 && (
            <button
              className="btn-primary"
              style={{ marginTop: 16 }}
              onClick={handleCalculate}
              disabled={loading}
            >
              {loading ? "Calculating..." : "Calculate GPA"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GpaCalculator;
