import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { IconTrash } from "../Icons/DashboardIcons";
import { auth, API_URL } from "../firebase";

/* ═══════════════════════════════════
   SHARED CONSTANTS
═══════════════════════════════════ */
const DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const DAYS_EN_TO_AR = {
  Saturday: "السبت",
  Sunday: "الأحد",
  Monday: "الاثنين",
  Tuesday: "الثلاثاء",
  Wednesday: "الأربعاء",
  Thursday: "الخميس",
};

const SLOTS = {
  2: [
    { start: "8:00 ص", end: "10:00 ص" },
    { start: "10:00 ص", end: "12:00 م" },
    { start: "12:00 م", end: "2:00 م" },
    { start: "2:00 م", end: "4:00 م" },
    { start: "4:00 م", end: "6:00 م" },
    { start: "6:00 م", end: "8:00 م" },
  ],
  3: [
    { start: "8:00 ص", end: "11:00 ص" },
    { start: "11:00 ص", end: "2:00 م" },
    { start: "2:00 م", end: "5:00 م" },
    { start: "5:00 م", end: "8:00 م" },
  ],
};

const TYPE_LABELS = { ن: "نظري", ت: "سكشن", ع: "عملي" };
const TYPE_COLORS = {
  ن: "type-badge-n",
  ت: "type-badge-t",
  ع: "type-badge-a",
};

const initialForm = {
  subject: "",
  type: "ن",
  day: "السبت",
  duration: 2,
  slotIndex: 0,
  group: "",
  place: "",
};

/* ═══════════════════════════════════
   HELPER — convert 24h to Arabic 12h
═══════════════════════════════════ */
function to12hAr(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "م" : "ص";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${suffix}`;
}

/* Map AI type string to Arabic code */
function aiTypeToAr(t) {
  if (!t) return "ن";
  const lower = t.toLowerCase();
  if (lower.includes("lec")) return "ن";
  if (lower.includes("sec")) return "ت";
  if (lower.includes("lab")) return "ع";
  return "ن";
}

/* ═══════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════ */
function Generator() {
  const [tab, setTab] = useState("manual"); // "manual" | "smart"

  /* ── Manual state ── */
  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem("schedules");
    return saved ? JSON.parse(saved) : [];
  });
  const [form, setForm] = useState(initialForm);
  const [conflict, setConflict] = useState(null);
  const slots = SLOTS[form.duration];

  useEffect(() => {
    localStorage.setItem("schedules", JSON.stringify(schedules));
  }, [schedules]);

  /* ── Smart AI state ── */
  const [aiFiles, setAiFiles] = useState([]);
  const [aiCourses, setAiCourses] = useState(""); // comma-separated course numbers
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResults, setAiResults] = useState(null); // full response
  const [aiSelected, setAiSelected] = useState(0); // which of the 3 is expanded
  const fileInputRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  /* ───────────────────────────────
     PDF EXPORT — compact student schedule card
  ─────────────────────────────── */
  const exportPDF = async (filename, type = "manual") => {
    setExporting(true);
    try {
      /* ── collect day groups ── */
      let dayGroups;
      if (type === "manual") {
        dayGroups = {};
        DAYS.forEach((d) => { dayGroups[d] = schedules.filter((s) => s.day === d); });
      } else {
        const chosen = aiResults?.generatedSchedules?.[aiSelected]?.schedule || [];
        dayGroups = groupByDay(chosen);
      }

      /* ── build hidden compact card ── */
      const wrap = document.createElement("div");
      wrap.style.cssText = `
        position:fixed;left:-9999px;top:0;
        width:370px;background:#fff;padding:14px 12px;
        font-family:'Segoe UI',Tahoma,sans-serif;
        direction:rtl;color:#1e293b;
      `;

      /* title */
      const hdr = document.createElement("div");
      hdr.style.cssText = "text-align:center;margin-bottom:8px;";
      hdr.innerHTML = `
        <div style="font-size:14px;font-weight:700;margin-bottom:1px">جدولي الدراسي</div>
        <div style="font-size:8px;color:#94a3b8;letter-spacing:2px">NAZAMLY</div>
      `;
      wrap.appendChild(hdr);

      /* each day */
      DAYS.forEach((day) => {
        const items = dayGroups[day];
        if (!items || !items.length) return;

        /* day header */
        const dh = document.createElement("div");
        dh.textContent = day;
        dh.style.cssText = `
          background:#6ee7b7;color:#064e3b;
          padding:2px 8px;font-size:9px;font-weight:700;
          border-radius:3px 3px 0 0;margin-top:5px;
        `;
        wrap.appendChild(dh);

        /* rows */
        const tbl = document.createElement("table");
        tbl.style.cssText = "width:100%;border-collapse:collapse;font-size:8px;";

        const sorted = [...items].sort((a, b) => {
          const aT = type === "manual" ? a.slot.start : (a.startTime || "");
          const bT = type === "manual" ? b.slot.start : (b.startTime || "");
          return aT.localeCompare(bT);
        });

        sorted.forEach((item) => {
          const tr = document.createElement("tr");
          tr.style.cssText = "border-bottom:1px solid #e2e8f0;";
          const tc = type === "manual" ? item.type : aiTypeToAr(item.type);
          const clr = { "\u0646":"#3b82f6", "\u062a":"#f59e0b", "\u0639":"#ef4444" };
          const time = type === "manual"
            ? `${item.slot.start} — ${item.slot.end}`
            : `${to12hAr(item.startTime)} — ${to12hAr(item.endTime)}`;
          const name = type === "manual" ? item.subject : item.courseCode;
          const extra = type === "manual"
            ? [item.group, item.place].filter(Boolean).join(" · ")
            : [item.group, item.location].filter(Boolean).join(" · ");

          tr.innerHTML = `
            <td style="padding:3px 5px;width:75px;color:#64748b;font-size:7px;white-space:nowrap">${time}</td>
            <td style="padding:3px 5px;font-weight:600;font-size:8px">${name}</td>
            <td style="padding:3px 5px;width:32px;text-align:center">
              <span style="background:${clr[tc]||"#94a3b8"};color:#fff;padding:1px 4px;border-radius:2px;font-size:6px">${TYPE_LABELS[tc]}</span>
            </td>
            ${extra ? `<td style="padding:3px 5px;color:#94a3b8;font-size:6px;white-space:nowrap">${extra}</td>` : ""}
          `;
          tbl.appendChild(tr);
        });
        wrap.appendChild(tbl);
      });

      document.body.appendChild(wrap);

      const canvas = await html2canvas(wrap, { scale: 2, backgroundColor: "#ffffff" });
      document.body.removeChild(wrap);

      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const mmW = (canvas.width / 2 / 96) * 25.4;
      const mmH = (canvas.height / 2 / 96) * 25.4;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [mmW, mmH] });
      pdf.addImage(imgData, "JPEG", 0, 0, mmW, mmH);
      pdf.save(filename);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  /* ───────────────────────────────
     MANUAL LOGIC (unchanged)
  ─────────────────────────────── */
  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "duration" ? { slotIndex: 0 } : {}),
    }));
  };

  const validate = () => {
    const slot = slots[form.slotIndex];
    const timeConflict = schedules.find(
      (s) => s.day === form.day && s.slot.start === slot.start,
    );
    if (timeConflict) {
      setConflict({
        type: "time",
        msg: `لديك بالفعل مادة "${timeConflict.subject}" في هذا الميعاد!`,
      });
      return false;
    }
    const sameType = schedules.find(
      (s) =>
        s.subject.trim().toLowerCase() === form.subject.trim().toLowerCase() &&
        s.type === form.type,
    );
    if (sameType) {
      setConflict({
        type: "type",
        msg: `مادة "${form.subject}" مسجلة بالفعل كـ ${TYPE_LABELS[form.type]}!`,
      });
      return false;
    }
    const sameSubject = schedules.filter(
      (s) =>
        s.subject.trim().toLowerCase() === form.subject.trim().toLowerCase(),
    );
    if (sameSubject.length >= 2) {
      setConflict({
        type: "limit",
        msg: `مادة "${form.subject}" وصلت للحد الأقصى (مرتين فقط)!`,
      });
      return false;
    }
    return true;
  };

  const addSchedule = () => {
    if (!validate()) return;
    const slot = slots[form.slotIndex];
    setSchedules((prev) => [
      ...prev,
      {
        id: Date.now(),
        subject: form.subject.trim(),
        type: form.type,
        day: form.day,
        slot,
        group: form.group,
        place: form.place,
      },
    ]);
    setForm(initialForm);
  };

  const removeSchedule = (id) =>
    setSchedules((prev) => prev.filter((s) => s.id !== id));

  const scheduleByDay = DAYS.reduce((acc, day) => {
    acc[day] = schedules.filter((s) => s.day === day);
    return acc;
  }, {});

  /* ───────────────────────────────
     SMART AI LOGIC
  ─────────────────────────────── */
  const handleFilePick = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length + aiFiles.length > 5) {
      setAiError("الحد الأقصى 5 صور فقط");
      return;
    }
    setAiFiles((prev) => [...prev, ...picked]);
    setAiError("");
  };

  const removeFile = (idx) =>
    setAiFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleGenerate = async () => {
    if (aiFiles.length === 0) {
      setAiError("يرجى رفع صورة واحدة على الأقل");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResults(null);

    try {
      const formData = new FormData();
      aiFiles.forEach((f) => formData.append("scheduleFiles", f));
      if (aiCourses.trim()) {
        const arr = aiCourses
          .split(/[,،\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        formData.append("targetCourses", JSON.stringify(arr));
      }

      const res = await fetch(`${API_URL}/api/ai/generate`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "فشل في توليد الجداول");
      }
      setAiResults(data);
      setAiSelected(0);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  /* Group an AI schedule array by day (Arabic) */
  const groupByDay = (schedule) => {
    const map = {};
    DAYS.forEach((d) => (map[d] = []));
    schedule.forEach((s) => {
      const dayAr = DAYS_EN_TO_AR[s.dayOfWeek] || s.dayOfWeek;
      if (map[dayAr]) map[dayAr].push(s);
    });
    return map;
  };

  /* ═══════════════════════════════
     RENDER
  ═══════════════════════════════ */
  return (
    <div className="dash-home">
      {/* ── Title ── */}
      <div>
        <h2 className="page-title">منظم الجداول</h2>
        <p className="page-sub">نظّم جدولك الدراسي بسهولة</p>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="gen-tabs">
        <button
          className={`gen-tab-btn ${tab === "manual" ? "active" : ""}`}
          onClick={() => setTab("manual")}
        >
          📝 الجدول اليدوي
        </button>
        <button
          className={`gen-tab-btn ${tab === "smart" ? "active" : ""}`}
          onClick={() => setTab("smart")}
        >
          🤖 الجدول الذكي
        </button>
      </div>

      {/* ── Conflict Popup (manual) ── */}
      {conflict && (
        <div className="conflict-overlay" onClick={() => setConflict(null)}>
          <div className="conflict-popup" onClick={(e) => e.stopPropagation()}>
            <div className="conflict-icon">⚠️</div>
            <h3>تعارض في الجدول</h3>
            <p>{conflict.msg}</p>
            <button className="btn-primary" onClick={() => setConflict(null)}>
              حسناً
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════
         MANUAL TAB
      ════════════════════════════ */}
      {tab === "manual" && (
        <div className="gen-grid">
          {/* ── Form ── */}
          <div className="gpa-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addSchedule();
              }}
            >
              <h3 style={{ marginBottom: "16px" }}>إضافة ميعاد</h3>

              <div className="form-group">
                <label>اسم المادة</label>
                <input
                  className="gpa-input"
                  type="text"
                  placeholder="مثال: Operating Systems"
                  value={form.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>نوع المادة</label>
                <div className="type-selector">
                  {Object.entries(TYPE_LABELS).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      className={`type-btn ${form.type === key ? "active" : ""}`}
                      onClick={() => handleChange("type", key)}
                    >
                      <span className="type-code">{key}</span>
                      <span className="type-name">{val}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>اليوم</label>
                <select
                  className="gpa-input"
                  value={form.day}
                  onChange={(e) => handleChange("day", e.target.value)}
                  required
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  مدة{" "}
                  {form.type === "ن"
                    ? "المحاضرة"
                    : form.type === "ع"
                      ? "العملي"
                      : "السكشن"}
                </label>
                <div className="duration-selector">
                  <button
                    type="button"
                    className={`duration-btn ${form.duration === 2 ? "active" : ""}`}
                    onClick={() => handleChange("duration", 2)}
                  >
                    ساعتان
                  </button>
                  <button
                    type="button"
                    className={`duration-btn ${form.duration === 3 ? "active" : ""}`}
                    onClick={() => handleChange("duration", 3)}
                  >
                    ٣ ساعات
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>الميعاد</label>
                <select
                  className="gpa-input"
                  value={form.slotIndex}
                  onChange={(e) =>
                    handleChange("slotIndex", parseInt(e.target.value))
                  }
                  required
                >
                  {slots.map((s, i) => (
                    <option key={i} value={i}>
                      {s.start} — {s.end}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>رقم المجموعة</label>
                <input
                  className="gpa-input"
                  type="text"
                  placeholder="مثال: G1"
                  value={form.group}
                  onChange={(e) => handleChange("group", e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>مكان الحضور</label>
                <input
                  className="gpa-input"
                  type="text"
                  placeholder="مثال: قاعة 101"
                  value={form.place}
                  onChange={(e) => handleChange("place", e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary">
                + إضافة للجدول
              </button>
            </form>
          </div>

          {/* ── Schedule ── */}
          <div className="gen-schedule">
            {schedules.length > 0 && (
              <button
                className="btn-primary pdf-export-btn"
                onClick={() => exportPDF("جدولي.pdf", "manual")}
                disabled={exporting}
              >
                {exporting ? "جاري التصدير..." : "📥 تصدير PDF"}
              </button>
            )}
            {schedules.length === 0 ? (
              <div className="gpa-card">
                <div className="gpa-empty">
                  <span>📅</span>
                  <p>أضف مواعيد لعرض جدولك</p>
                </div>
              </div>
            ) : (
              DAYS.map((day) => {
                const items = scheduleByDay[day];
                if (!items.length) return null;
                return (
                  <div key={day} className="gen-day-card">
                    <h4 className="gen-day-title">{day}</h4>

                    <div className="gen-item-header">
                      <span>الوقت</span>
                      <span>المادة</span>
                      <span>المجموعة</span>
                      <span>المكان</span>
                      <span></span>
                    </div>

                    <div className="gen-day-items">
                      {items
                        .sort((a, b) =>
                          a.slot.start.localeCompare(b.slot.start),
                        )
                        .map((item) => (
                          <div key={item.id} className="gen-item">
                            <div className="gen-item-time">
                              <span>{item.slot.start}</span>
                              <span className="gen-time-sep">↓</span>
                              <span>{item.slot.end}</span>
                            </div>

                            <div className="gen-col">
                              <span className="gen-col-label">المادة</span>
                              <div className="gen-item-top">
                                <span className="gen-subject">
                                  {item.subject}
                                </span>
                                <span
                                  className={`type-badge ${TYPE_COLORS[item.type]}`}
                                >
                                  {item.type}
                                </span>
                              </div>
                            </div>

                            <div className="gen-col">
                              <span className="gen-col-label">المجموعة</span>
                              <span className="gen-col-value">
                                {item.group || "—"}
                              </span>
                            </div>

                            <div className="gen-col">
                              <span className="gen-col-label">المكان</span>
                              <span className="gen-col-value">
                                {item.place || "—"}
                              </span>
                            </div>

                            <button
                              className="gpa-delete-btn"
                              onClick={() => removeSchedule(item.id)}
                            >
                              <IconTrash width={16} height={16} />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════
         SMART AI TAB
      ════════════════════════════ */}
      {tab === "smart" && (
        <div className="ai-gen-wrap">
          {/* ── Upload + Course input ── */}
          {!aiResults && (
            <div className="gpa-card ai-upload-card">
              <h3 style={{ marginBottom: "4px" }}>🤖 توليد جدول ذكي</h3>
              <p className="ai-upload-desc">
                ارفع صور جداول الكلية وحدد أرقام المواد — سيتم اقتراح أفضل 3
                جداول بدون تعارض
              </p>

              {/* Drop zone */}
              <div
                className="ai-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  multiple
                  hidden
                  onChange={handleFilePick}
                />
                <span className="ai-dropzone-icon">📷</span>
                <p>اضغط أو اسحب الصور هنا</p>
                <p className="ai-dropzone-hint">
                  JPG, PNG, WEBP, PDF — حتى 5 ملفات
                </p>
              </div>

              {/* Thumbnails */}
              {aiFiles.length > 0 && (
                <div className="ai-thumbs">
                  {aiFiles.map((f, i) => (
                    <div key={i} className="ai-thumb">
                      <span className="ai-thumb-name">{f.name}</span>
                      <button
                        className="ai-thumb-remove"
                        onClick={() => removeFile(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Course numbers input */}
              <div className="form-group" style={{ marginTop: "16px" }}>
                <label>أرقام المواد (اختياري)</label>
                <input
                  className="gpa-input"
                  type="text"
                  placeholder="مثال: 402, 407, 408, 490"
                  value={aiCourses}
                  onChange={(e) => setAiCourses(e.target.value)}
                />
                <span className="ai-input-hint">
                  افصل بين الأرقام بفاصلة — اتركه فارغ لإظهار كل المواد
                </span>
              </div>

              {aiError && <p className="ai-error">{aiError}</p>}

              <button
                className="btn-primary"
                style={{ marginTop: "16px", width: "100%" }}
                onClick={handleGenerate}
                disabled={aiLoading}
              >
                {aiLoading ? "جاري التحليل بالذكاء الاصطناعي..." : "🚀 توليد الجداول"}
              </button>

              {aiLoading && (
                <div className="ai-loading-bar">
                  <div className="ai-loading-fill" />
                </div>
              )}
            </div>
          )}

          {/* ── Results ── */}
          {aiResults && (
            <>
              {/* Metadata */}
              <div className="ai-meta-bar">
                <div className="ai-meta-item">
                  <span className="ai-meta-label">النموذج</span>
                  <span className="ai-meta-value">
                    {aiResults.metadata?.aiModelUsed || "Gemini"}
                  </span>
                </div>
                <div className="ai-meta-item">
                  <span className="ai-meta-label">جلسات مستخرجة</span>
                  <span className="ai-meta-value">
                    {aiResults.metadata?.totalSessionsExtracted || 0}
                  </span>
                </div>
                <div className="ai-meta-item">
                  <span className="ai-meta-label">مواد تم رصدها</span>
                  <span className="ai-meta-value">
                    {(
                      aiResults.metadata?.uniqueCoursesIdentified || []
                    ).join(" , ")}
                  </span>
                </div>
                <button
                  className="btn-primary ai-retry-btn"
                  onClick={() => {
                    setAiResults(null);
                    setAiFiles([]);
                    setAiCourses("");
                  }}
                >
                  ↻ جرب مرة أخرى
                </button>
              </div>

              {/* Schedule selector pills */}
              <div className="ai-pills">
                {(aiResults.generatedSchedules || []).map((s, i) => (
                  <button
                    key={i}
                    className={`ai-pill ${aiSelected === i ? "active" : ""}`}
                    onClick={() => setAiSelected(i)}
                  >
                    <span className="ai-pill-rank">#{i + 1}</span>
                    <span className="ai-pill-score">
                      نقاط: {Math.round(s.score)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Render selected schedule as timetable */}
              {(() => {
                const chosen =
                  aiResults.generatedSchedules?.[aiSelected]?.schedule || [];
                const byDay = groupByDay(chosen);
                const hasContent = chosen.length > 0;

                if (!hasContent) {
                  return (
                    <div className="gpa-card">
                      <div className="gpa-empty">
                        <span>📋</span>
                        <p>لا توجد جداول مناسبة</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <>
                  <button
                    className="btn-primary pdf-export-btn"
                    onClick={() => exportPDF(`جدول-ذكي-${aiSelected + 1}.pdf`, "ai")}
                    disabled={exporting}
                  >
                    {exporting ? "جاري التصدير..." : "📥 تصدير PDF"}
                  </button>
                  <div className="gen-schedule">
                    {DAYS.map((day) => {
                      const items = byDay[day];
                      if (!items || !items.length) return null;
                      return (
                        <div key={day} className="gen-day-card">
                          <h4 className="gen-day-title">{day}</h4>
                          <div className="gen-item-header">
                            <span>الوقت</span>
                            <span>المادة</span>
                            <span>النوع</span>
                            <span>المجموعة</span>
                            <span>المكان</span>
                          </div>
                          <div className="gen-day-items">
                            {items
                              .sort((a, b) =>
                                (a.startTime || "").localeCompare(
                                  b.startTime || "",
                                ),
                              )
                              .map((s, idx) => {
                                const typeAr = aiTypeToAr(s.type);
                                return (
                                  <div key={idx} className="gen-item ai-item">
                                    <div className="gen-item-time">
                                      <span>{to12hAr(s.startTime)}</span>
                                      <span className="gen-time-sep">↓</span>
                                      <span>{to12hAr(s.endTime)}</span>
                                    </div>

                                    <div className="gen-col">
                                      <span className="gen-col-label">
                                        المادة
                                      </span>
                                      <div className="gen-item-top">
                                        <span className="gen-subject">
                                          {s.courseCode}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="gen-col">
                                      <span className="gen-col-label">
                                        النوع
                                      </span>
                                      <span
                                        className={`type-badge ${TYPE_COLORS[typeAr]}`}
                                      >
                                        {TYPE_LABELS[typeAr]}
                                      </span>
                                    </div>

                                    <div className="gen-col">
                                      <span className="gen-col-label">
                                        المجموعة
                                      </span>
                                      <span className="gen-col-value">
                                        {s.group || "—"}
                                      </span>
                                    </div>

                                    <div className="gen-col">
                                      <span className="gen-col-label">
                                        المكان
                                      </span>
                                      <span className="gen-col-value">
                                        {s.location || "—"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Generator;
