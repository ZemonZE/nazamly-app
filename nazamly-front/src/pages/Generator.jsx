import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { IconTrash } from "../Icons/DashboardIcons";
import { auth, API_URL } from "../firebase";

/* ═══════════════════════════════════
   SHARED CONSTANTS
═══════════════════════════════════ */
const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const DAYS_EN_MAP = {
  Saturday: "Saturday",
  Sunday: "Sunday",
  Monday: "Monday",
  Tuesday: "Tuesday",
  Wednesday: "Wednesday",
  Thursday: "Thursday",
};

const SLOTS = {
  2: [
    { start: "8:00 AM", end: "10:00 AM" },
    { start: "10:00 AM", end: "12:00 PM" },
    { start: "12:00 PM", end: "2:00 PM" },
    { start: "2:00 PM", end: "4:00 PM" },
    { start: "4:00 PM", end: "6:00 PM" },
    { start: "6:00 PM", end: "8:00 PM" },
  ],
  3: [
    { start: "8:00 AM", end: "11:00 AM" },
    { start: "11:00 AM", end: "2:00 PM" },
    { start: "2:00 PM", end: "5:00 PM" },
    { start: "5:00 PM", end: "8:00 PM" },
  ],
};

const TYPE_LABELS = { ن: "Lecture", ت: "Section", ع: "Lab" };
const TYPE_COLORS = {
  ن: "type-badge-n",
  ت: "type-badge-t",
  ع: "type-badge-a",
};

const initialForm = {
  subject: "",
  type: "ن",
  day: "Saturday",
  duration: 2,
  slotIndex: 0,
  group: "",
  place: "",
};

/* ═══════════════════════════════════
   HELPER — convert 24h to English/Arabic 12h
═══════════════════════════════════ */
function to12hEn(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${suffix}`;
}

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
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");

  /* ───────────────────────────────
     PDF EXPORT — Professional A4 Schedule
  ─────────────────────────────── */
  /* ───────────────────────────────
     PDF EXPORT — Professional A4 Schedule
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

      /* ── Stage container for measuring multiple pages ── */
      const stage = document.createElement("div");
      stage.style.cssText = "position:fixed; left:-9999px; top:0;";
      document.body.appendChild(stage);

      const createPage = () => {
        const wrap = document.createElement("div");
        wrap.innerHTML = `<style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        </style>`;
        
        // Standard A4 dimensions in pixels approx (794 x 1123)
        wrap.style.cssText = `
          width:794px; min-height: 1123px;
          background:#ffffff; padding:40px;
          font-family:'Cairo', sans-serif;
          direction:rtl; color:#1e293b;
          box-sizing: border-box;
        `;

        /* title */
        const hdr = document.createElement("div");
        hdr.style.cssText = "text-align:center; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px;";
        hdr.innerHTML = `
        <div style="font-size:32px; font-weight:700; color:#0f172a; margin-bottom:4px;">جدولي الدراسي</div>
        <div style="font-size:14px; color:#64748b; letter-spacing:3px;">NAZAMLY</div>
        `;
        wrap.appendChild(hdr);
        return wrap;
      };

      let currentWrap = createPage();
      stage.appendChild(currentWrap);
      const pages = [currentWrap];

      /* Global Table Header */
      const tableHeaderRow = `
        <tr style="background-color: #f1f5f9; font-weight: 700; font-size: 14px; color: #334155;">
          <th style="padding: 12px; text-align: right; width: 170px; border-radius: 0 6px 0 0;">الوقت</th>
          <th style="padding: 12px; text-align: right;">المادة</th>
          <th style="padding: 12px; text-align: center; width: 80px;">النوع</th>
          <th style="padding: 12px; text-align: right; width: 100px;">المجموعة</th>
          <th style="padding: 12px; text-align: right; width: 140px; border-radius: 6px 0 0 0;">المكان</th>
        </tr>
      `;

      /* each day */
      DAYS.forEach((day) => {
        const items = dayGroups[day];
        if (!items || !items.length) return;

        const dayContainer = document.createElement("div");
        dayContainer.style.marginBottom = "24px";

        /* day header */
        const arDays = {
          "Saturday": "السبت",
          "Sunday": "الأحد",
          "Monday": "الاثنين",
          "Tuesday": "الثلاثاء",
          "Wednesday": "الأربعاء",
          "Thursday": "الخميس"
        };
        const dh = document.createElement("div");
        dh.textContent = arDays[day] || day;
        dh.style.cssText = `
          background:#10b981; color:#ffffff;
          padding: 8px 16px; font-size: 18px; font-weight: 700;
          border-radius: 6px 6px 0 0;
        `;
        dayContainer.appendChild(dh);

        /* rows */
        const tbl = document.createElement("table");
        tbl.style.cssText = "width:100%; border-collapse:collapse; font-size:14px; border: 1px solid #e2e8f0; border-top: none;";
        
        // Append Header
        const thead = document.createElement("thead");
        thead.innerHTML = tableHeaderRow;
        tbl.appendChild(thead);

        const tbody = document.createElement("tbody");

        const sorted = [...items].sort((a, b) => {
          const aT = type === "manual" ? a.slot.start : (a.startTime || "");
          const bT = type === "manual" ? b.slot.start : (b.startTime || "");
          return aT.localeCompare(bT);
        });

        sorted.forEach((item, index) => {
          const tr = document.createElement("tr");
          // Zebra striping
          tr.style.cssText = `border-bottom:1px solid #e2e8f0; background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};`;
          
          const tc = type === "manual" ? item.type : aiTypeToAr(item.type);
          const clr = { "\u0646":"#3b82f6", "\u062a":"#f59e0b", "\u0639":"#ef4444" };
          
          let tStartAr = type === "manual" ? item.slot.start.replace("AM", "ص").replace("PM", "م") : to12hAr(item.startTime);
          let tEndAr = type === "manual" ? item.slot.end.replace("AM", "ص").replace("PM", "م") : to12hAr(item.endTime);

         // Extract suffix and time separately
          const startSuffix = tStartAr.includes("ص") ? "ص" : "م";
          const startTimeNum = tStartAr.replace(" ص", "").replace(" م", "").replace("ص", "").replace("م", "").trim();
          
          const endSuffix = tEndAr.includes("ص") ? "ص" : "م";
          const endTimeNum = tEndAr.replace(" ص", "").replace(" م", "").replace("ص", "").replace("م", "").trim();

          // Force strictly LTR physical layout to bypass html2canvas bidi bugs
          // Visual LTR order: [End Suffix] [End Time] [إلى] [Start Suffix] [Start Time]
          const timeHtml = `
            <div style="display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 4px; direction: ltr; width: 100%;">
              <span style="font-weight: 700;">${endSuffix}</span>
              <span style="font-weight: 600;">${endTimeNum}</span>
              
              <span style="color: #94a3b8; font-size: 12px; margin: 0 4px;">إلى</span>
              
              <span style="font-weight: 700;">${startSuffix}</span>
              <span style="font-weight: 600;">${startTimeNum}</span>
            </div>
          `;

          const name = type === "manual" ? item.subject : item.courseCode;
          const group = item.group || "—";
          const location = type === "manual" ? (item.place || "—") : (item.location || "—");

          const TYPE_LABELS_AR = { "ن": "نظري", "ت": "سكشن", "ع": "معمل" };

          tr.innerHTML = `
            <td style="padding: 12px; color: #475569; font-weight: 600;">${timeHtml}</td>
            <td style="padding: 12px; font-weight: 700; color: #0f172a; text-align: right;">${name}</td>
            <td style="padding: 12px; text-align: center;">
              <span style="background:${clr[tc]||"#94a3b8"}; color:#fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">${TYPE_LABELS_AR[tc] || TYPE_LABELS[tc]}</span>
            </td>
            <td style="padding: 12px; color: #64748b; font-weight: 600; text-align: right;">${group}</td>
            <td style="padding: 12px; color: #64748b; font-weight: 600; text-align: right;">${location}</td>
          `;
          tbody.appendChild(tr);
        });
        
        tbl.appendChild(tbody);
        dayContainer.appendChild(tbl);
        currentWrap.appendChild(dayContainer);

        // Check overflow threshold (~1040px height leaves margin space)
        let totalHeight = 0;
        for (let j = 0; j < currentWrap.children.length; j++) {
          totalHeight += currentWrap.children[j].getBoundingClientRect().height || currentWrap.children[j].offsetHeight;
        }

        if (totalHeight > 1040 && currentWrap.children.length > 2) {
          // Remove from current page due to overflow
          currentWrap.removeChild(dayContainer);
          // Create new formal page
          currentWrap = createPage();
          stage.appendChild(currentWrap);
          pages.push(currentWrap);
          // Fit it on the new page
          currentWrap.appendChild(dayContainer);
        }
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { 
          scale: 2, 
          backgroundColor: "#ffffff",
          useCORS: true 
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.9);
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      }

      document.body.removeChild(stage);
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
        msg: `You already have a course "${timeConflict.subject}" at this time!`,
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
        msg: `Course "${form.subject}" is already registered as ${TYPE_LABELS[form.type]}!`,
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
        msg: `Course "${form.subject}" has reached the maximum limit (twice only)!`,
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
      setAiError("Max 5 images only");
      return;
    }
    setAiFiles((prev) => [...prev, ...picked]);
    setAiError("");
  };

  const removeFile = (idx) =>
    setAiFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleGenerate = async () => {
    if (aiFiles.length === 0) {
      setAiError("Please upload at least one image");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResults(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must login first to generate a schedule");
      }
      const token = await user.getIdToken();

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate schedules");
      }
      setAiResults(data);
      setAiSelected(0);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  /* Group an AI schedule array by day (English) */
  const groupByDay = (schedule) => {
    const map = {};
    DAYS.forEach((d) => (map[d] = []));
    schedule.forEach((s) => {
      const dayEn = DAYS_EN_MAP[s.dayOfWeek] || s.dayOfWeek;
      if (map[dayEn]) map[dayEn].push(s);
    });
    return map;
  };

  /* ───────────────────────────────
     SAVE AI SCHEDULE TO MOBILE TIMETABLE
  ─────────────────────────────── */
  const handleSaveToMobile = async () => {
    const chosen = aiResults?.generatedSchedules?.[aiSelected]?.schedule || [];
    if (chosen.length === 0) return;

    setSaving(true);
    setSaveSuccess("");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must login first to save the schedule");
      }
      const token = await user.getIdToken();

      const res = await fetch(`${API_URL}/api/schedule/save-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schedule: chosen,
          title: `Smart Schedule #${aiSelected + 1}`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save the schedule");
      }

      setSaveSuccess("✅ Schedule saved successfully! Open the Nazamly app on your mobile");
    } catch (err) {
      setSaveSuccess(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  /* ═══════════════════════════════
     RENDER
  ═══════════════════════════════ */
  return (
    <div className="dash-home">
      {/* ── Title ── */}
      <div>
        <h2 className="page-title">Schedule Manager</h2>
        <p className="page-sub">Organize your study schedule easily</p>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="gen-tabs">
        <button
          className={`gen-tab-btn ${tab === "manual" ? "active" : ""}`}
          onClick={() => setTab("manual")}
        >
          📝 Manual Schedule
        </button>
        <button
          className={`gen-tab-btn ${tab === "smart" ? "active" : ""}`}
          onClick={() => setTab("smart")}
        >
          🤖 Smart Schedule
        </button>
      </div>

      {/* ── Conflict Popup (manual) ── */}
      {conflict && (
        <div className="conflict-overlay" onClick={() => setConflict(null)}>
          <div className="conflict-popup" onClick={(e) => e.stopPropagation()}>
            <div className="conflict-icon">⚠️</div>
            <h3>Schedule Conflict</h3>
            <p>{conflict.msg}</p>
            <button className="btn-primary" onClick={() => setConflict(null)}>
              OK
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
              <h3 style={{ marginBottom: "16px" }}>Add Schedule Slot</h3>

              <div className="form-group">
                <label>Course Name</label>
                <input
                  className="gpa-input"
                  type="text"
                  placeholder="Example: Operating Systems"
                  value={form.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Course Type</label>
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
                <label>Day</label>
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
                  Duration of{" "}
                  {form.type === "ن"
                    ? "Lecture"
                    : form.type === "ع"
                      ? "Lab"
                      : "Section"}
                </label>
                <div className="duration-selector">
                  <button
                    type="button"
                    className={`duration-btn ${form.duration === 2 ? "active" : ""}`}
                    onClick={() => handleChange("duration", 2)}
                  >
                    2 Hours
                  </button>
                  <button
                    type="button"
                    className={`duration-btn ${form.duration === 3 ? "active" : ""}`}
                    onClick={() => handleChange("duration", 3)}
                  >
                    3 Hours
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Time Slot</label>
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
                <label>Group Number</label>
                <input
                  className="gpa-input"
                  type="text"
                  placeholder="Example: G1"
                  value={form.group}
                  onChange={(e) => handleChange("group", e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  className="gpa-input"
                  type="text"
                  placeholder="Example: Room 101"
                  value={form.place}
                  onChange={(e) => handleChange("place", e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary">
                + Add to Schedule
              </button>
            </form>
          </div>

          {/* ── Schedule ── */}
          <div className="gen-schedule">
            {schedules.length > 0 && (
              <button
                className="btn-primary pdf-export-btn"
                onClick={() => exportPDF("My-Schedule.pdf", "manual")}
                disabled={exporting}
              >
                {exporting ? "Exporting..." : "📥 Export PDF"}
              </button>
            )}
            {schedules.length === 0 ? (
              <div className="gpa-card">
                <div className="gpa-empty">
                  <span>📅</span>
                  <p>Add slots to view your schedule</p>
                </div>
              </div>
            ) : (
              DAYS.map((day) => {
                const items = scheduleByDay[day];
                if (!items?.length) return null;
                return (
                  <div key={day} className="gen-day-card">
                    <h4 className="gen-day-title">{day}</h4>

                    <div className="gen-item-header">
                      <span>Time</span>
                      <span>Course</span>
                      <span>Group</span>
                      <span>Location</span>
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
                              <span className="gen-col-label">Course</span>
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
                              <span className="gen-col-label">Group</span>
                              <span className="gen-col-value">
                                {item.group || "—"}
                              </span>
                            </div>

                            <div className="gen-col">
                              <span className="gen-col-label">Location</span>
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
              <h3 style={{ marginBottom: "4px" }}>🤖 Generate Smart Schedule</h3>
              <p className="ai-upload-desc">
                Upload college schedule images and select course numbers — we will suggest the 3 best schedules without conflicts
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
                <p>Click or drag images here</p>
                <p className="ai-dropzone-hint">
                  JPG, PNG, WEBP, PDF — up to 5 files
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
                <label>Course Numbers (Optional)</label>
                <input
                  className="gpa-input"
                  type="text"
                  placeholder="Example: 402, 407, 408, 490"
                  value={aiCourses}
                  onChange={(e) => setAiCourses(e.target.value)}
                />
                <span className="ai-input-hint">
                  Separate numbers with a comma — leave empty to show all courses
                </span>
              </div>

              {aiError && <p className="ai-error">{aiError}</p>}

              <button
                className="btn-primary"
                style={{ marginTop: "16px", width: "100%" }}
                onClick={handleGenerate}
                disabled={aiLoading}
              >
                {aiLoading ? "Analyzing with AI..." : "🚀 Generate Schedules"}
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
                  <span className="ai-meta-label">Model</span>
                  <span className="ai-meta-value">
                    {aiResults.metadata?.aiModelUsed || "Gemini"}
                  </span>
                </div>
                <div className="ai-meta-item">
                  <span className="ai-meta-label">Extracted Sessions</span>
                  <span className="ai-meta-value">
                    {aiResults.metadata?.totalSessionsExtracted || 0}
                  </span>
                </div>
                <div className="ai-meta-item">
                  <span className="ai-meta-label">Detected Courses</span>
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
                  ↻ Try Again
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
                      Score: {Math.round(s.score)}
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
                        <p>No suitable schedules found</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      className="btn-primary pdf-export-btn"
                      onClick={() => exportPDF(`Smart-Schedule-${aiSelected + 1}.pdf`, "ai")}
                      disabled={exporting}
                    >
                      {exporting ? "Exporting..." : "📥 Export PDF"}
                    </button>
                    <button
                      className="btn-primary pdf-export-btn"
                      style={{ background: "#4f46e5" }}
                      onClick={handleSaveToMobile}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "📱 Save to Mobile"}
                    </button>
                  </div>
                  {saveSuccess && (
                    <p style={{
                      marginTop: "8px",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      background: saveSuccess.startsWith("✅") ? "#f0fdf4" : "#fef2f2",
                      color: saveSuccess.startsWith("✅") ? "#16a34a" : "#dc2626",
                    }}>
                      {saveSuccess}
                    </p>
                  )}
                  <div className="gen-schedule">
                    {DAYS.map((day) => {
                      const items = byDay[day];
                      if (!items || !items.length) return null;
                      return (
                        <div key={day} className="gen-day-card">
                          <h4 className="gen-day-title">{day}</h4>
                          <div className="gen-item-header">
                            <span>Time</span>
                            <span>Course</span>
                            <span>Type</span>
                            <span>Group</span>
                            <span>Location</span>
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
                                      <span>{to12hEn(s.startTime)}</span>
                                      <span className="gen-time-sep">↓</span>
                                      <span>{to12hEn(s.endTime)}</span>
                                    </div>

                                    <div className="gen-col">
                                      <span className="gen-col-label">
                                        Course
                                      </span>
                                      <div className="gen-item-top">
                                        <span className="gen-subject">
                                          {s.courseCode}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="gen-col">
                                      <span className="gen-col-label">
                                        Type
                                      </span>
                                      <span
                                        className={`type-badge ${TYPE_COLORS[typeAr]}`}
                                      >
                                        {TYPE_LABELS[typeAr]}
                                      </span>
                                    </div>

                                    <div className="gen-col">
                                      <span className="gen-col-label">
                                        Group
                                      </span>
                                      <span className="gen-col-value">
                                        {s.group || "—"}
                                      </span>
                                    </div>

                                    <div className="gen-col">
                                      <span className="gen-col-label">
                                        Location
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
