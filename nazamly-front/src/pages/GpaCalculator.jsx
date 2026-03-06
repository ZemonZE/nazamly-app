import { useState } from "react";
import { IconTrash } from "../Icons/DashboardIcons";

function GpaCalculator() {
  const [courses, setCourses] = useState([]);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(4.0);
  const [credits, setCredits] = useState(3);

  const addCourse = () => {
    if (!name.trim()) return;
    const g = Math.min(5, Math.max(0, parseFloat(grade)));
    setCourses((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: name.trim(),
        grade: g,
        credits: parseInt(credits),
      },
    ]);
    setName("");
    setGrade(4.0);
    setCredits(3);
  };

  const removeCourse = (id) =>
    setCourses((prev) => prev.filter((c) => c.id !== id));

  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const totalPoints = courses.reduce((s, c) => s + c.grade * c.credits, 0);
  const gpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : 0;
  const avgGrade = courses.length
    ? (courses.reduce((s, c) => s + c.grade, 0) / courses.length).toFixed(2)
    : 0;

  return (
    <div className="dash-home">
      {/* ── Title ── */}
      <div>
        <h2 className="page-title">حساب المعدل</h2>
        <p className="page-sub">احسب معدلك الفصلي مع تفاصيل الدرجات</p>
      </div>

      {/* ── GPA Card ── */}
      <div className="gpa-result-card">
        <div className="gpa-main">
          <span className="gpa-label">المعدل الحالي</span>
          <span className="gpa-value">{gpa}</span>
        </div>
        <div className="gpa-sub-stats">
          <div className="gpa-sub-item">
            <span className="gpa-sub-label">إجمالي الساعات</span>
            <span className="gpa-sub-value">{totalCredits}</span>
          </div>
          <div className="gpa-sub-item">
            <span className="gpa-sub-label">عدد المواد</span>
            <span className="gpa-sub-value">{courses.length}</span>
          </div>
          <div className="gpa-sub-item">
            <span className="gpa-sub-label">متوسط الدرجات</span>
            <span className="gpa-sub-value">{avgGrade}</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid ── */}
      <div className="gpa-grid">
        {/* Add Course */}
        <div className="gpa-card">
          <h3>إضافة مادة</h3>

          <div className="form-group">
            <label>اسم المادة</label>
            <input
              className="gpa-input"
              type="text"
              placeholder="مثال: الرياضيات"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCourse()}
            />
          </div>

          <div className="form-group">
            <label>الدرجة (0.0 — 5.0)</label>
            <input
              className="gpa-input"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>الساعات المعتمدة</label>
            <input
              className="gpa-input"
              type="number"
              min={1}
              max={4}
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </div>

          <button className="btn-primary" onClick={addCourse}>
            + إضافة مادة
          </button>
        </div>

        {/* Courses List */}
        <div className="gpa-card">
          <h3>المواد المضافة</h3>
          <p className="gpa-courses-count">
            {courses.length
              ? `${courses.length} مادة مضافة`
              : "لم تضف أي مادة بعد"}
          </p>

          <div className="gpa-courses-list">
            {courses.length === 0 && (
              <div className="gpa-empty">
                <span>📚</span>
                <p>أضف مواد لحساب معدلك</p>
              </div>
            )}
            {courses.map((c) => (
              <div key={c.id} className="gpa-course-item">
                <div className="gpa-course-info">
                  <span className="gpa-course-name">{c.name}</span>
                  <span className="gpa-course-detail">
                    {c.credits} ساعات × {c.grade} ={" "}
                    {(c.credits * c.grade).toFixed(1)} نقطة
                  </span>
                </div>
                <div className="gpa-course-right">
                  <span className="gpa-course-grade">
                    {(c.grade * c.credits).toFixed(1)}
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
        </div>
      </div>
    </div>
  );
}

export default GpaCalculator;
