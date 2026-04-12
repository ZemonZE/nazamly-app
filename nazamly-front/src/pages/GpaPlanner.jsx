import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import "../styles/GpaPlanner.css";
import {
  calculateTermGPA as apiCalculate,
  generateTargetPlan as apiTargetPlan,
  updateGpaProfile,
  getTermCourses,
  addTermCourse,
  removeTermCourse,
} from "../services/gpaService";
import { IconTrash } from "../Icons/DashboardIcons";

const STORAGE_KEY = "nazamly-gpa-profile";

/* mark → grade‑point (same formula the backend uses) */
const markToGP = (m) => (m < 60 ? 0 : Number((m / 10 - 5).toFixed(1)));

/* grade‑rating labels based on mark */
const getRating = (m) => {
  if (m >= 85) return "Excellent";
  if (m >= 75) return "Very Good";
  if (m >= 65) return "Good";
  if (m >= 60) return "Pass";
  return "Fail";
};

/* ══════════════════════════════════════
   INTERVAL‑BASED CLASSIFICATION
   Accepts ANY decimal 0.00 – 5.00
══════════════════════════════════════ */
function classifyGpa(v) {
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
}

function gradeLabel(val) {
  return classifyGpa(val).label;
}

/* ══════════════════════════════════════
   CIRCULAR PROGRESS SVG
══════════════════════════════════════ */
function CircularProgress({
  value,
  max = 5,
  size = 180,
  stroke = 12,
  label,
  sub,
  classification,
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);
  const cls = classifyGpa(value);

  return (
    <div className="planner-circle-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={cls.color || "var(--blue-400)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition:
              "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1), stroke 0.5s ease",
          }}
        />
      </svg>
      <div className="planner-circle-inner">
        <span className="planner-circle-value">{value}</span>
        <span className="planner-circle-label">{label}</span>
        {classification && (
          <span className="planner-circle-cls" style={{ color: cls.color }}>
            {cls.label}
          </span>
        )}
        {sub && <span className="planner-circle-sub">{sub}</span>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
function GpaPlanner() {
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [cgpaInput, setCgpaInput] = useState("");
  const [hoursInput, setHoursInput] = useState("");
  const [profileError, setProfileError] = useState("");
  const [activeTab, setActiveTab] = useState("calculator");

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  /* Dynamic courses loaded from API */
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCreditHours, setNewCreditHours] = useState("");
  const [courseError, setCourseError] = useState("");

  /* marks keyed by course _id (0-100) */
  const [marks, setMarks] = useState({});

  /* API results */
  const [apiResult, setApiResult] = useState(null); // from /api/gpa/calculate
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [targetCgpa, setTargetCgpa] = useState("");
  const [strategy, setStrategy] = useState(null);
  const [strategyLoading, setStrategyLoading] = useState(false);

  /* Live classification for onboarding input */
  const cgpaClassification = useMemo(() => {
    const v = parseFloat(cgpaInput);
    if (cgpaInput === "" || isNaN(v) || v < 0 || v > 5) return null;
    return classifyGpa(v);
  }, [cgpaInput]);

  /* Load profile */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cgpa !== undefined && parsed.hours !== undefined)
          setProfile(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* Load term courses from API */
  useEffect(() => {
    (async () => {
      try {
        const data = await getTermCourses();
        setCourses(data);
        setMarks((prev) => {
          const next = { ...prev };
          data.forEach((c) => {
            if (!(c._id in next)) next[c._id] = 80;
          });
          return next;
        });
      } catch {
        /* offline or not logged in */
      } finally {
        setCoursesLoading(false);
      }
    })();
  }, []);

  const saveProfile = useCallback(async () => {
    const cgpa = parseFloat(cgpaInput);
    const hours = parseInt(hoursInput, 10);
    setProfileError("");
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 5) {
      setProfileError("CGPA must be between 0 and 5");
      return;
    }
    if (isNaN(hours) || hours < 0 || hours > 300) {
      setProfileError("Invalid number of hours");
      return;
    }
    const data = { cgpa, hours };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    /* Also persist to the server so /api/gpa endpoints use it */
    try {
      await updateGpaProfile(cgpa, hours);
    } catch {
      /* offline or not logged in — continue locally */
    }

    setProfile(data);
  }, [cgpaInput, hoursInput]);

  const editProfile = () => {
    if (profile) {
      setCgpaInput(String(profile.cgpa));
      setHoursInput(String(profile.hours));
    }
    setProfile(null);
    setStrategy(null);
    setApiResult(null);
  };

  /* ── Course management handlers ── */
  const handleAddCourse = async () => {
    setCourseError("");
    const credits = parseInt(newCreditHours, 10);
    if (!newCourseName.trim()) {
      setCourseError("Enter course name");
      return;
    }
    if (!newCourseCode.trim()) {
      setCourseError("Enter course code");
      return;
    }
    if (isNaN(credits) || credits < 1 || credits > 6) {
      setCourseError("Hours must be between 1 and 6");
      return;
    }
    try {
      const updatedCourses = await addTermCourse(
        newCourseName.trim(),
        newCourseCode.trim(),
        credits,
      );
      setCourses(updatedCourses);
      setMarks((prev) => {
        const next = { ...prev };
        updatedCourses.forEach((c) => {
          if (!(c._id in next)) next[c._id] = 80;
        });
        return next;
      });
      setNewCourseName("");
      setNewCourseCode("");
      setNewCreditHours("");
      setApiResult(null);
    } catch (err) {
      setCourseError(err.message);
    }
  };

  const handleRemoveCourse = async (courseId) => {
    try {
      const updatedCourses = await removeTermCourse(courseId);
      setCourses(updatedCourses);
      setMarks((prev) => {
        const next = { ...prev };
        delete next[courseId];
        return next;
      });
      setApiResult(null);
    } catch {
      /* ignore */
    }
  };

  /* ── Mark handlers ── */
  const handleMarkChange = (courseId, value) => {
    let v = parseInt(value, 10);
    if (isNaN(v)) v = 0;
    v = Math.max(0, Math.min(100, v));
    setMarks((prev) => ({ ...prev, [courseId]: v }));
  };
  const incrementMark = (courseId) => {
    setMarks((prev) => {
      const next = Math.min(100, (prev[courseId] ?? 0) + 1);
      return { ...prev, [courseId]: next };
    });
  };
  const decrementMark = (courseId) => {
    setMarks((prev) => {
      const next = Math.max(0, (prev[courseId] ?? 0) - 1);
      return { ...prev, [courseId]: next };
    });
  };

  /* ── Local instant calculations (mark → grade‑point) ── */
  const calculations = useMemo(() => {
    if (!profile || courses.length === 0) return null;
    const termHours = courses.reduce((s, c) => s + c.creditHours, 0);
    const termPoints = courses.reduce(
      (s, c) => s + markToGP(marks[c._id] ?? 80) * c.creditHours,
      0,
    );
    const termGpa = termHours ? termPoints / termHours : 0;
    const totalHours = profile.hours + termHours;
    const expectedCgpa = totalHours
      ? (profile.cgpa * profile.hours + termGpa * termHours) / totalHours
      : 0;
    const maxCgpa = totalHours
      ? (profile.cgpa * profile.hours + 5.0 * termHours) / totalHours
      : 0;
    return {
      termHours,
      termPoints,
      termGpa: parseFloat(termGpa.toFixed(2)),
      totalHours,
      expectedCgpa: parseFloat(expectedCgpa.toFixed(2)),
      maxCgpa: parseFloat(Math.min(maxCgpa, 5.0).toFixed(2)),
    };
  }, [profile, marks, courses]);

  /* ── Call server for authoritative GPA calculation ── */
  const handleServerCalc = useCallback(async () => {
    setApiLoading(true);
    setApiError("");
    try {
      const coursesPayload = courses.map((c) => ({
        courseCode: c.courseCode,
        creditHours: c.creditHours,
        mark: marks[c._id] ?? 80,
      }));
      const data = await apiCalculate(coursesPayload);
      setApiResult(data); // { termGPA, termHoursCalculated, oldCGPA, newCGPA }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setApiLoading(false);
    }
  }, [marks, courses]);

  /* ── Call server for target strategy ── */
  const computeTarget = useCallback(async () => {
    const target = parseFloat(targetCgpa);
    if (!profile || isNaN(target) || target < 0 || target > 5) {
      setStrategy({ error: "Please enter a target GPA between 0 and 5" });
      return;
    }
    setStrategyLoading(true);
    try {
      const coursesPayload = courses.map((c) => ({
        courseCode: c.courseCode,
        creditHours: c.creditHours,
      }));
      const data = await apiTargetPlan(target, coursesPayload);
      /* data: { targetCGPA, requiredTermAverageGPA, plan: [{ courseCode, difficulty, targetMark, targetRating }] } */
      setStrategy({
        possible: true,
        requiredTermGpa: data.requiredTermAverageGPA,
        plan: data.plan,
        targetCGPA: data.targetCGPA,
      });
    } catch (err) {
      /* The API returns 400 for impossible targets */
      setStrategy({
        possible: false,
        error: err.message,
        maxCgpa: calculations?.maxCgpa,
        maxCls: classifyGpa(calculations?.maxCgpa),
      });
    } finally {
      setStrategyLoading(false);
    }
  }, [targetCgpa, profile, calculations]);

  /* ═══════════════════════════════
     SCREEN 1 — Onboarding
  ═══════════════════════════════ */
  if (!profile) {
    return (
      <div className="dash-home">
        <div className="planner-onboard-wrap">
          <div className="planner-onboard-card">
            <div className="planner-onboard-icon">🎓</div>
            <h2 className="planner-onboard-title">Smart GPA Planner</h2>
            <p className="planner-onboard-sub">
              Enter your current academic data to start planning your cumulative
              GPA
            </p>

            {profileError && (
              <div className="planner-alert planner-alert-red">
                {profileError}
              </div>
            )}

            <div className="planner-onboard-form">
              <div className="planner-field">
                <label className="planner-label">Current Cumulative GPA</label>
                <div className="planner-input-hint">From 0.00 to 5.00</div>
                <div className="planner-input-row">
                  <input
                    className="planner-input"
                    type="number"
                    min={0}
                    max={5}
                    step={0.01}
                    placeholder="Example: 3.75"
                    value={cgpaInput}
                    onChange={(e) => setCgpaInput(e.target.value)}
                  />
                  {cgpaClassification && (
                    <span
                      className={`planner-cls-badge ${cgpaClassification.css}`}
                    >
                      {cgpaClassification.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="planner-field">
                <label className="planner-label">Total Completed Hours</label>
                <div className="planner-input-hint">
                  Credit hours earned so far
                </div>
                <input
                  className="planner-input"
                  type="number"
                  min={0}
                  max={300}
                  step={1}
                  placeholder="Example: 90"
                  value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                />
              </div>

              <button className="planner-btn-primary" onClick={saveProfile}>
                Save and Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════
     SCREENS 2 & 3
  ═══════════════════════════════ */
  const profileCls = classifyGpa(profile.cgpa);

  return (
    <div className="dash-home">
      {/* Header */}
      <div className="planner-header">
        <button className="planner-btn-outline" onClick={editProfile}>
          Edit Data
        </button>
      </div>

      {/* Profile Strip */}
      <div className="planner-profile-strip">
        <div className="planner-strip-item">
          <span className="planner-strip-label">Cumulative GPA</span>
          <span className="planner-strip-value">{profile.cgpa}</span>
          <span className={`planner-strip-cls ${profileCls.css}`}>
            {profileCls.label}
          </span>
        </div>
        <div className="planner-strip-divider" />
        <div className="planner-strip-item">
          <span className="planner-strip-label">Completed Hours</span>
          <span className="planner-strip-value">{profile.hours}</span>
        </div>
        <div className="planner-strip-divider" />
        <div className="planner-strip-item">
          <span className="planner-strip-label">Term Hours</span>
          <span className="planner-strip-value">{calculations?.termHours}</span>
        </div>
        <div className="planner-strip-divider" />
        <div className="planner-strip-item">
          <span className="planner-strip-label">Maximum Possible GPA</span>
          <span className="planner-strip-value">{calculations?.maxCgpa}</span>
          <span
            className={`planner-strip-cls ${classifyGpa(calculations?.maxCgpa).css}`}
          >
            {classifyGpa(calculations?.maxCgpa).label}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="planner-tabs">
        <button
          className={`planner-tab ${activeTab === "calculator" ? "active" : ""}`}
          onClick={() => setActiveTab("calculator")}
        >
          Current Term Calculator
        </button>
        <button
          className={`planner-tab ${activeTab === "planner" ? "active" : ""}`}
          onClick={() => setActiveTab("planner")}
        >
          Strategic Planning
        </button>
      </div>

      {activeTab === "calculator" && (
        <CalculatorScreen
          calculations={calculations}
          marks={marks}
          onMarkChange={handleMarkChange}
          onIncrement={incrementMark}
          onDecrement={decrementMark}
          profile={profile}
          onServerCalc={handleServerCalc}
          apiResult={apiResult}
          apiLoading={apiLoading}
          apiError={apiError}
          courses={courses}
          coursesLoading={coursesLoading}
          onRemoveCourse={handleRemoveCourse}
          onAddCourse={handleAddCourse}
          newCourseName={newCourseName}
          setNewCourseName={setNewCourseName}
          newCourseCode={newCourseCode}
          setNewCourseCode={setNewCourseCode}
          newCreditHours={newCreditHours}
          setNewCreditHours={setNewCreditHours}
          courseError={courseError}
        />
      )}
      {activeTab === "planner" && (
        <PlannerScreen
          targetCgpa={targetCgpa}
          setTargetCgpa={setTargetCgpa}
          computeTarget={computeTarget}
          strategy={strategy}
          strategyLoading={strategyLoading}
          calculations={calculations}
          profile={profile}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   SCREEN 2 — Current Term Calculator
══════════════════════════════════════ */
function CalculatorScreen({
  calculations,
  marks,
  onMarkChange,
  onIncrement,
  onDecrement,
  profile,
  onServerCalc,
  apiResult,
  apiLoading,
  apiError,
  courses,
  coursesLoading,
  onRemoveCourse,
  onAddCourse,
  newCourseName,
  setNewCourseName,
  newCourseCode,
  setNewCourseCode,
  newCreditHours,
  setNewCreditHours,
  courseError,
}) {
  /* Show server result when available, otherwise local */
  const termGpa = apiResult
    ? apiResult.termGPA
    : calculations
      ? calculations.termGpa
      : 0;
  const expectedCgpa = apiResult
    ? apiResult.newCGPA
    : calculations
      ? calculations.expectedCgpa
      : 0;

  const termCls = classifyGpa(termGpa);
  const expectedCls = classifyGpa(expectedCgpa);

  return (
    <div className="planner-calc-layout">
      {/* Results Column */}
      <div className="planner-results-col">
        {calculations && (
          <>
            <div className="planner-circle-card">
              <CircularProgress
                value={expectedCgpa}
                label="CGPA"
                sub={`Out of ${profile.cgpa}`}
                classification
              />
            </div>

            <div className="planner-circle-card planner-circle-card-sm">
              <CircularProgress
                value={termGpa}
                size={120}
                stroke={8}
                label="Semester GPA"
                classification
              />
            </div>

            {/* Classification badges */}
            <div className="planner-cls-row">
              <div className={`planner-cls-card ${expectedCls.css}`}>
                <span className="planner-cls-card-label">CGPA</span>
                <span className="planner-cls-card-value">{expectedCgpa}</span>
                <span className="planner-cls-card-class">
                  {expectedCls.label}
                </span>
              </div>
              <div className={`planner-cls-card ${termCls.css}`}>
                <span className="planner-cls-card-label">Semester GPA</span>
                <span className="planner-cls-card-value">{termGpa}</span>
                <span className="planner-cls-card-class">{termCls.label}</span>
              </div>
            </div>

            {apiResult && (
              <div
                className="planner-alert planner-alert-blue"
                style={{ textAlign: "center" }}
              >
                Server Result — Previous CGPA: {apiResult.oldCGPA}
              </div>
            )}

            {apiError && (
              <div className="planner-alert planner-alert-red">{apiError}</div>
            )}

            {/* Stats */}
            <div className="planner-stats-row">
              <div className="planner-stat-box">
                <span className="planner-stat-num">
                  {calculations.termHours}
                </span>
                <span className="planner-stat-txt">Term Hours</span>
              </div>
              <div className="planner-stat-box">
                <span className="planner-stat-num">
                  {calculations.totalHours}
                </span>
                <span className="planner-stat-txt">Total Hours</span>
              </div>
              <div className="planner-stat-box">
                <span className="planner-stat-num">
                  {calculations.termPoints.toFixed(1)}
                </span>
                <span className="planner-stat-txt">Points</span>
              </div>
            </div>
          </>
        )}

        {!calculations && courses.length === 0 && !coursesLoading && (
          <div className="planner-alert planner-alert-blue">
            Add term courses first to start calculation
          </div>
        )}
      </div>

      {/* Courses Column */}
      <div className="planner-courses-col">
        {/* Add Course Form */}
        <div className="planner-card" style={{ marginBottom: 16 }}>
          <div className="planner-card-head">
            <h3>Add New Course</h3>
          </div>
          {courseError && (
            <div className="planner-alert planner-alert-red">{courseError}</div>
          )}
          <div
            className="planner-add-course-form"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <input
              className="planner-input"
              type="text"
              placeholder="Course Name"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
            />
            <input
              className="planner-input"
              type="text"
              placeholder="Course Code (CS 301)"
              value={newCourseCode}
              onChange={(e) => setNewCourseCode(e.target.value)}
            />
            <input
              className="planner-input"
              type="number"
              min={1}
              max={6}
              step={1}
              placeholder="Hours"
              value={newCreditHours}
              onChange={(e) => setNewCreditHours(e.target.value)}
              style={{ width: 70 }}
            />
          </div>
          <button
            className="planner-btn-primary"
            style={{ width: "100%" }}
            onClick={onAddCourse}
          >
            + Add Course
          </button>
        </div>

        {/* Course List */}
        <div className="planner-card">
          <div className="planner-card-head">
            <h3>Current Term Courses</h3>
            <span className="planner-badge">{courses.length} Courses</span>
          </div>

          {coursesLoading && (
            <div style={{ textAlign: "center", padding: 24, opacity: 0.6 }}>
              Loading...
            </div>
          )}

          {!coursesLoading && courses.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, opacity: 0.6 }}>
              No courses added yet. Add your courses above.
            </div>
          )}

          <div className="planner-course-list">
            {courses.map((course) => {
              const mVal = marks[course._id] ?? 80;
              const gp = markToGP(mVal);
              const gCls = classifyGpa(gp);
              return (
                <div key={course._id} className="planner-course-row">
                  <div className="planner-course-info">
                    <span className="planner-course-name">{course.name}</span>
                    <span className="planner-course-meta">
                      {course.courseCode} • {course.creditHours} Hours
                    </span>
                  </div>
                  <div className="planner-course-grade-wrap">
                    <div className="planner-smart-input">
                      <button
                        className="planner-stepper-btn"
                        onClick={() => onDecrement(course._id)}
                        disabled={mVal <= 0}
                        tabIndex={-1}
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <input
                        className="planner-grade-input"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={mVal}
                        onChange={(e) =>
                          onMarkChange(course._id, e.target.value)
                        }
                      />
                      <button
                        className="planner-stepper-btn"
                        onClick={() => onIncrement(course._id)}
                        disabled={mVal >= 100}
                        tabIndex={-1}
                        aria-label="Increase"
                      >
                        +
                      </button>
                      <span
                        className={`planner-cls-badge planner-cls-badge-sm ${gCls.css}`}
                      >
                        {gCls.label}
                      </span>
                    </div>
                    <span className="planner-course-pts">
                      {gp} GPA • {(gp * course.creditHours).toFixed(1)} pts
                    </span>
                  </div>
                  <button
                    className="planner-stepper-btn"
                    onClick={() => onRemoveCourse(course._id)}
                    title="Delete Course"
                    style={{ color: "#ef4444", marginRight: 4 }}
                  >
                    <IconTrash />
                  </button>
                </div>
              );
            })}
          </div>

          {courses.length > 0 && (
            <button
              className="planner-btn-primary"
              style={{ marginTop: 16, width: "100%" }}
              onClick={onServerCalc}
              disabled={apiLoading}
            >
              {apiLoading ? "Calculating..." : "Calculate from Server"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   SCREEN 3 — Target Planner
══════════════════════════════════════ */
function PlannerScreen({
  targetCgpa,
  setTargetCgpa,
  computeTarget,
  strategy,
  strategyLoading,
  calculations,
  profile,
}) {
  const targetCls = useMemo(() => {
    const v = parseFloat(targetCgpa);
    if (targetCgpa === "" || isNaN(v) || v < 0 || v > 5) return null;
    return classifyGpa(v);
  }, [targetCgpa]);

  return (
    <div className="planner-target-layout">
      {/* Input Card */}
      <div className="planner-card planner-target-input-card">
        <h3>🎯 Set Your Target</h3>
        <p className="planner-target-desc">
          Enter the CGPA you aspire to reach and we will give you the required
          plan
        </p>

        <div className="planner-target-form">
          <div className="planner-target-input-wrap">
            <input
              className="planner-input planner-input-lg"
              type="number"
              min={0}
              max={5}
              step={0.01}
              placeholder="Target CGPA (e.g. 4.50)"
              value={targetCgpa}
              onChange={(e) => setTargetCgpa(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && computeTarget()}
            />
            {targetCls && (
              <span
                className={`planner-cls-badge planner-cls-badge-inline ${targetCls.css}`}
              >
                {targetCls.label}
              </span>
            )}
          </div>
          <button
            className="planner-btn-primary"
            onClick={computeTarget}
            disabled={strategyLoading}
          >
            {strategyLoading ? "Calculating..." : "Calculate Plan"}
          </button>
        </div>

        {calculations && (
          <div className="planner-max-info">
            Highest possible GPA this semester:{" "}
            <strong>{calculations.maxCgpa}</strong>
            <span
              className={`planner-cls-inline ${classifyGpa(calculations.maxCgpa).css}`}
            >
              {" "}
              ({classifyGpa(calculations.maxCgpa).label})
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {strategy && strategy.error && !strategy.possible && (
        <div className="planner-alert-card planner-alert-card-red">
          <div className="planner-alert-icon">⚠️</div>
          <h4>Sorry, this target cannot be achieved</h4>
          <p>{strategy.error}</p>
          {strategy.maxCgpa && (
            <div className="planner-alert-tip">
              The maximum GPA you can reach is {strategy.maxCgpa}
            </div>
          )}
        </div>
      )}

      {/* Possible — server result */}
      {strategy && strategy.possible && strategy.plan && (
        <div className="planner-strategy-card">
          <div className="planner-strategy-head">
            <div className="planner-strategy-icon">✅</div>
            <div>
              <h4>You can achieve your target!</h4>
              <p>
                To reach a GPA of <strong>{targetCgpa}</strong> (
                {classifyGpa(targetCgpa).label}), you need a semester GPA of{" "}
                <strong>{strategy.requiredTermGpa}</strong> (
                {classifyGpa(strategy.requiredTermGpa).label})
              </p>
            </div>
          </div>

          <div className="planner-strategy-subtitle">
            Suggested grade distribution:
          </div>

          <div className="planner-strategy-list">
            {strategy.plan.map((c) => (
              <div key={c.courseCode} className="planner-strategy-row">
                <div className="planner-strategy-course">
                  <span className="planner-strategy-name">{c.courseCode}</span>
                  <span className="planner-strategy-meta">
                    Difficulty: {c.difficulty}/5
                  </span>
                </div>
                <div className="planner-strategy-grade">
                  <span
                    className={`planner-grade-badge ${
                      c.targetMark >= 85
                        ? "grade-excellent"
                        : c.targetMark >= 75
                          ? "grade-good"
                          : c.targetMark >= 65
                            ? "grade-mid"
                            : "grade-low"
                    }`}
                  >
                    {c.targetMark}/100
                  </span>
                  <span className="planner-grade-name">{c.targetRating}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary chips */}
          <div className="planner-strategy-summary">
            {(() => {
              const counts = {};
              strategy.plan.forEach((c) => {
                const lbl = c.targetRating;
                counts[lbl] = (counts[lbl] || 0) + 1;
              });
              return Object.entries(counts).map(([label, count]) => (
                <span key={label} className="planner-summary-chip">
                  {count} {label} courses
                </span>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default GpaPlanner;
