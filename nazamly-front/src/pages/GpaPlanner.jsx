import { useState, useEffect, useCallback, useMemo } from "react";
import "../styles/GpaPlanner.css";

const STORAGE_KEY = "nazamly-gpa-profile";

/* Fixed grade‑point options for dropdowns */
const GRADE_OPTIONS = [
  { value: 4.0, label: "امتياز مرتفع" },
  { value: 3.5, label: "امتياز" },
  { value: 3.0, label: "جيد جداً مرتفع" },
  { value: 2.5, label: "جيد جيد" },
  { value: 2.0, label: "جيد مرتفع" },
  { value: 1.5, label: "جيد" },
];

/* Mock current‑term schedule */
const MOCK_SCHEDULE = [
  { id: 1, name: "الرياضيات التحليلية", code: "MATH 232", credits: 4 },
  { id: 2, name: "البرمجة المتقدمة", code: "CS 301", credits: 4 },
  { id: 3, name: "قواعد البيانات", code: "CS 302", credits: 3 },
  { id: 4, name: "الجبر الخطي", code: "MATH 211", credits: 3 },
  { id: 5, name: "مبادئ الإدارة", code: "MGT 101", credits: 2 },
];

/* ══════════════════════════════════════
   INTERVAL‑BASED CLASSIFICATION
   Accepts ANY decimal 0.00 – 5.00
══════════════════════════════════════ */
function classifyGpa(v) {
  const n = parseFloat(v);
  if (isNaN(n) || n < 0) return { label: "", color: "", css: "" };
  if (n === 0) return { label: "راسب", color: "#ef4444", css: "cls-fail" };
  if (n < 1.5) return { label: "مقبول", color: "#ef4444", css: "cls-fail" };
  if (n < 2.0) return { label: "جيد", color: "#f97316", css: "cls-pass" };
  if (n < 2.5) return { label: "جيد مرتفع", color: "#eab308", css: "cls-ok" };
  if (n < 3.0) return { label: "جيد جداً", color: "#f59e0b", css: "cls-good" };
  if (n < 3.5)
    return { label: "جيد جداً مرتفع", color: "#38bdf8", css: "cls-vgood" };
  if (n < 4.0) return { label: "امتياز", color: "#3b82f6", css: "cls-exc" };
  if (n <= 5.0)
    return { label: "امتياز مرتفع", color: "#22c55e", css: "cls-top" };
  return { label: "", color: "", css: "" };
}

function gradeLabel(val) {
  const g = GRADE_OPTIONS.find((o) => o.value === val);
  return g ? g.label : classifyGpa(val).label;
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
   TARGET PLANNER ALGORITHM
══════════════════════════════════════ */
function computeStrategy(courses, grades, oldCgpa, oldHours, target) {
  const termHours = courses.reduce((s, c) => s + c.credits, 0);
  const totalHours = oldHours + termHours;
  const neededPoints = target * totalHours - oldCgpa * oldHours;
  const maxPoints = courses.reduce((s, c) => s + 5.0 * c.credits, 0);
  const maxCgpa = (oldCgpa * oldHours + maxPoints) / totalHours;

  if (target > 5.0 || neededPoints > maxPoints) {
    return {
      possible: false,
      maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2),
      maxCls: classifyGpa(Math.min(maxCgpa, 5.0)),
    };
  }

  if (neededPoints <= 0) {
    return {
      possible: true,
      requiredTermGpa: "0.00",
      maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2),
      plan: courses.map((c) => ({ ...c, requiredGrade: 1.5 })),
      note: "معدلك الحالي يتجاوز الهدف بالفعل! أي درجات ستحقق ذلك.",
    };
  }

  let remaining = [...courses];
  let remainingPoints = neededPoints;
  const planGrades = {};

  while (remaining.length > 0) {
    const pointsPerCourse = remainingPoints / remaining.length;
    const overflow = remaining.filter((c) => pointsPerCourse / c.credits > 5.0);

    if (overflow.length === 0) {
      remaining.forEach((c) => {
        planGrades[c.id] = parseFloat((pointsPerCourse / c.credits).toFixed(2));
      });
      break;
    }

    overflow.forEach((c) => {
      planGrades[c.id] = 4.9;
      remainingPoints -= 4.9 * c.credits;
    });

    remaining = remaining.filter((c) => planGrades[c.id] === undefined);

    if (remaining.length === 0 && remainingPoints > 0.001) {
      return {
        possible: false,
        maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2),
        maxCls: classifyGpa(Math.min(maxCgpa, 5.0)),
      };
    }
  }

  const plan = courses.map((c) => ({
    ...c,
    requiredGrade: planGrades[c.id] ?? 0,
  }));

  const requiredTermGpa = termHours ? neededPoints / termHours : 0;

  return {
    possible: true,
    requiredTermGpa: requiredTermGpa.toFixed(2),
    maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2),
    plan,
  };
}

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
function GpaPlanner() {
  const [profile, setProfile] = useState(null);
  const [cgpaInput, setCgpaInput] = useState("");
  const [hoursInput, setHoursInput] = useState("");
  const [profileError, setProfileError] = useState("");
  const [activeTab, setActiveTab] = useState("calculator");
  const [grades, setGrades] = useState(() =>
    Object.fromEntries(MOCK_SCHEDULE.map((c) => [c.id, 4.0])),
  );
  const [targetCgpa, setTargetCgpa] = useState("");
  const [strategy, setStrategy] = useState(null);

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

  const saveProfile = useCallback(() => {
    const cgpa = parseFloat(cgpaInput);
    const hours = parseInt(hoursInput, 10);
    setProfileError("");
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 5) {
      setProfileError("المعدل التراكمي يجب أن يكون بين 0 و 5");
      return;
    }
    if (isNaN(hours) || hours < 0 || hours > 300) {
      setProfileError("عدد الساعات غير صحيح");
      return;
    }
    const data = { cgpa, hours };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setProfile(data);
  }, [cgpaInput, hoursInput]);

  const editProfile = () => {
    if (profile) {
      setCgpaInput(String(profile.cgpa));
      setHoursInput(String(profile.hours));
    }
    setProfile(null);
    setStrategy(null);
  };

  const handleGradeChange = (courseId, value) => {
    let v = parseFloat(value);
    if (isNaN(v)) v = 0;
    v = Math.round(v * 100) / 100; // keep 2 decimals
    v = Math.max(0, Math.min(5, v));
    setGrades((prev) => ({ ...prev, [courseId]: v }));
  };
  const incrementGrade = (courseId) => {
    setGrades((prev) => {
      const cur = prev[courseId] ?? 0;
      const next = Math.min(5, Math.round((cur + 0.1) * 100) / 100);
      return { ...prev, [courseId]: next };
    });
  };
  const decrementGrade = (courseId) => {
    setGrades((prev) => {
      const cur = prev[courseId] ?? 0;
      const next = Math.max(0, Math.round((cur - 0.1) * 100) / 100);
      return { ...prev, [courseId]: next };
    });
  };

  const calculations = useMemo(() => {
    if (!profile) return null;
    const termHours = MOCK_SCHEDULE.reduce((s, c) => s + c.credits, 0);
    const termPoints = MOCK_SCHEDULE.reduce(
      (s, c) => s + grades[c.id] * c.credits,
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
  }, [profile, grades]);

  const computeTarget = useCallback(() => {
    const target = parseFloat(targetCgpa);
    if (!profile || isNaN(target) || target < 0 || target > 5) {
      setStrategy({ error: "الرجاء إدخال معدل مستهدف بين 0 و 5" });
      return;
    }
    setStrategy(
      computeStrategy(
        MOCK_SCHEDULE,
        grades,
        profile.cgpa,
        profile.hours,
        target,
      ),
    );
  }, [targetCgpa, profile, grades]);

  /* ═══════════════════════════════
     SCREEN 1 — Onboarding
  ═══════════════════════════════ */
  if (!profile) {
    return (
      <div className="dash-home">
        <div className="planner-onboard-wrap">
          <div className="planner-onboard-card">
            <div className="planner-onboard-icon">🎓</div>
            <h2 className="planner-onboard-title">مخطط المعدل الذكي</h2>
            <p className="planner-onboard-sub">
              أدخل بياناتك الأكاديمية الحالية للبدء في التخطيط لمعدلك التراكمي
            </p>

            {profileError && (
              <div className="planner-alert planner-alert-red">
                {profileError}
              </div>
            )}

            <div className="planner-onboard-form">
              <div className="planner-field">
                <label className="planner-label">المعدل التراكمي الحالي</label>
                <div className="planner-input-hint">من 0.00 إلى 5.00</div>
                <div className="planner-input-row">
                  <input
                    className="planner-input"
                    type="number"
                    min={0}
                    max={5}
                    step={0.01}
                    placeholder="مثال: 3.75"
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
                <label className="planner-label">إجمالي الساعات المجتازة</label>
                <div className="planner-input-hint">
                  الساعات المعتمدة المكتسبة حتى الآن
                </div>
                <input
                  className="planner-input"
                  type="number"
                  min={0}
                  max={300}
                  step={1}
                  placeholder="مثال: 90"
                  value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                />
              </div>

              <button className="planner-btn-primary" onClick={saveProfile}>
                حفظ والمتابعة
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
        <div>
          <h2 className="page-title">مخطط المعدل الذكي</h2>
          <p className="page-sub">
            خطط لمعدلك التراكمي واعرف ما تحتاج لتحقيق هدفك
          </p>
        </div>
        <button className="planner-btn-outline" onClick={editProfile}>
          تعديل البيانات
        </button>
      </div>

      {/* Profile Strip */}
      <div className="planner-profile-strip">
        <div className="planner-strip-item">
          <span className="planner-strip-label">المعدل التراكمي</span>
          <span className="planner-strip-value">{profile.cgpa}</span>
          <span className={`planner-strip-cls ${profileCls.css}`}>
            {profileCls.label}
          </span>
        </div>
        <div className="planner-strip-divider" />
        <div className="planner-strip-item">
          <span className="planner-strip-label">الساعات المجتازة</span>
          <span className="planner-strip-value">{profile.hours}</span>
        </div>
        <div className="planner-strip-divider" />
        <div className="planner-strip-item">
          <span className="planner-strip-label">ساعات الفصل</span>
          <span className="planner-strip-value">{calculations?.termHours}</span>
        </div>
        <div className="planner-strip-divider" />
        <div className="planner-strip-item">
          <span className="planner-strip-label">أقصى معدل ممكن</span>
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
          حاسبة الفصل الحالي
        </button>
        <button
          className={`planner-tab ${activeTab === "planner" ? "active" : ""}`}
          onClick={() => setActiveTab("planner")}
        >
          التخطيط الاستراتيجي
        </button>
      </div>

      {activeTab === "calculator" && (
        <CalculatorScreen
          calculations={calculations}
          grades={grades}
          onGradeChange={handleGradeChange}
          onIncrement={incrementGrade}
          onDecrement={decrementGrade}
          profile={profile}
        />
      )}
      {activeTab === "planner" && (
        <PlannerScreen
          targetCgpa={targetCgpa}
          setTargetCgpa={setTargetCgpa}
          computeTarget={computeTarget}
          strategy={strategy}
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
  grades,
  onGradeChange,
  onIncrement,
  onDecrement,
  profile,
}) {
  if (!calculations) return null;

  const termCls = classifyGpa(calculations.termGpa);
  const expectedCls = classifyGpa(calculations.expectedCgpa);

  return (
    <div className="planner-calc-layout">
      {/* Results Column */}
      <div className="planner-results-col">
        <div className="planner-circle-card">
          <CircularProgress
            value={calculations.expectedCgpa}
            label="المعدل المتوقع"
            sub={`من ${profile.cgpa}`}
            classification
          />
        </div>

        <div className="planner-circle-card planner-circle-card-sm">
          <CircularProgress
            value={calculations.termGpa}
            size={120}
            stroke={8}
            label="معدل الفصل"
            classification
          />
        </div>

        {/* Classification badges */}
        <div className="planner-cls-row">
          <div className={`planner-cls-card ${expectedCls.css}`}>
            <span className="planner-cls-card-label">المعدل المتوقع</span>
            <span className="planner-cls-card-value">
              {calculations.expectedCgpa}
            </span>
            <span className="planner-cls-card-class">{expectedCls.label}</span>
          </div>
          <div className={`planner-cls-card ${termCls.css}`}>
            <span className="planner-cls-card-label">معدل الفصل</span>
            <span className="planner-cls-card-value">
              {calculations.termGpa}
            </span>
            <span className="planner-cls-card-class">{termCls.label}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="planner-stats-row">
          <div className="planner-stat-box">
            <span className="planner-stat-num">{calculations.termHours}</span>
            <span className="planner-stat-txt">ساعات الفصل</span>
          </div>
          <div className="planner-stat-box">
            <span className="planner-stat-num">{calculations.totalHours}</span>
            <span className="planner-stat-txt">إجمالي الساعات</span>
          </div>
          <div className="planner-stat-box">
            <span className="planner-stat-num">
              {calculations.termPoints.toFixed(1)}
            </span>
            <span className="planner-stat-txt">النقاط</span>
          </div>
        </div>
      </div>

      {/* Courses Column */}
      <div className="planner-courses-col">
        <div className="planner-card">
          <div className="planner-card-head">
            <h3>مواد الفصل الحالي</h3>
            <span className="planner-badge">{MOCK_SCHEDULE.length} مواد</span>
          </div>

          <div className="planner-course-list">
            {MOCK_SCHEDULE.map((course) => (
              <div key={course.id} className="planner-course-row">
                <div className="planner-course-info">
                  <span className="planner-course-name">{course.name}</span>
                  <span className="planner-course-meta">
                    {course.code} • {course.credits} ساعات
                  </span>
                </div>
                <div className="planner-course-grade-wrap">
                  {(() => {
                    const gVal = grades[course.id];
                    const gCls = classifyGpa(gVal);
                    return (
                      <>
                        <div className="planner-smart-input">
                          <button
                            className="planner-stepper-btn"
                            onClick={() => onDecrement(course.id)}
                            disabled={gVal <= 0}
                            tabIndex={-1}
                            aria-label="تقليل"
                          >
                            −
                          </button>
                          <input
                            className="planner-grade-input"
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            value={gVal}
                            onChange={(e) =>
                              onGradeChange(course.id, e.target.value)
                            }
                          />
                          <button
                            className="planner-stepper-btn"
                            onClick={() => onIncrement(course.id)}
                            disabled={gVal >= 5}
                            tabIndex={-1}
                            aria-label="زيادة"
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
                          {(gVal * course.credits).toFixed(1)} نقطة
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
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
        <h3>🎯 حدد هدفك</h3>
        <p className="planner-target-desc">
          أدخل المعدل التراكمي الذي تطمح للوصول إليه وسنخبرك بالخطة المطلوبة
        </p>

        <div className="planner-target-form">
          <div className="planner-target-input-wrap">
            <input
              className="planner-input planner-input-lg"
              type="number"
              min={0}
              max={5}
              step={0.01}
              placeholder="المعدل المستهدف (مثال: 4.50)"
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
          <button className="planner-btn-primary" onClick={computeTarget}>
            احسب الخطة
          </button>
        </div>

        {calculations && (
          <div className="planner-max-info">
            أقصى معدل ممكن هذا الفصل: <strong>{calculations.maxCgpa}</strong>
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
      {strategy && strategy.error && (
        <div className="planner-alert planner-alert-red">{strategy.error}</div>
      )}

      {/* Impossible */}
      {strategy && !strategy.error && !strategy.possible && (
        <div className="planner-alert-card planner-alert-card-red">
          <div className="planner-alert-icon">⚠️</div>
          <h4>عفواً، لا يمكن تحقيق هذا الهدف</h4>
          <p>
            أقصى معدل يمكنك الوصول إليه هو <strong>{strategy.maxCgpa}</strong>
            <span className={`planner-cls-inline ${strategy.maxCls.css}`}>
              {" "}
              ({strategy.maxCls.label})
            </span>
          </p>
          <div className="planner-alert-tip">
            جرّب تحديد هدف أقل من أو يساوي {strategy.maxCgpa}
          </div>
        </div>
      )}

      {/* Possible */}
      {strategy && strategy.possible && strategy.plan && (
        <div className="planner-strategy-card">
          <div className="planner-strategy-head">
            <div className="planner-strategy-icon">✅</div>
            <div>
              <h4>يمكنك تحقيق هدفك!</h4>
              <p>
                للوصول إلى المعدل <strong>{targetCgpa}</strong> (
                {classifyGpa(targetCgpa).label})، تحتاج معدل فصلي{" "}
                <strong>{strategy.requiredTermGpa}</strong> (
                {classifyGpa(strategy.requiredTermGpa).label})
              </p>
            </div>
          </div>

          {strategy.note && (
            <div className="planner-alert planner-alert-blue">
              {strategy.note}
            </div>
          )}

          <div className="planner-strategy-subtitle">
            التوزيع المقترح للدرجات:
          </div>

          <div className="planner-strategy-list">
            {strategy.plan.map((c) => {
              const gi = classifyGpa(c.requiredGrade);
              return (
                <div key={c.id} className="planner-strategy-row">
                  <div className="planner-strategy-course">
                    <span className="planner-strategy-name">{c.name}</span>
                    <span className="planner-strategy-meta">
                      {c.code} • {c.credits} ساعات
                    </span>
                  </div>
                  <div className="planner-strategy-grade">
                    <span
                      className={`planner-grade-badge ${
                        c.requiredGrade >= 4.5
                          ? "grade-excellent"
                          : c.requiredGrade >= 3.5
                            ? "grade-good"
                            : c.requiredGrade >= 2.5
                              ? "grade-mid"
                              : "grade-low"
                      }`}
                    >
                      {c.requiredGrade}
                    </span>
                    <span className="planner-grade-name">
                      {gradeLabel(c.requiredGrade)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary chips */}
          <div className="planner-strategy-summary">
            {(() => {
              const counts = {};
              strategy.plan.forEach((c) => {
                const lbl = gradeLabel(c.requiredGrade);
                counts[lbl] = (counts[lbl] || 0) + 1;
              });
              return Object.entries(counts).map(([label, count]) => (
                <span key={label} className="planner-summary-chip">
                  {count} مادة {label}
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
