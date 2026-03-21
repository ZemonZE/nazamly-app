import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { IconTrash } from "../Icons/DashboardIcons";
import { auth, API_URL } from "../firebase";

/* ═══════════════════════════════════
   SHARED CONSTANTS
═══════════════════════════════════ */
const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
];
const DAYS_EN_MAP = {
  Saturday: "Saturday",
  Sunday: "Sunday",
  Monday: "Monday",
  Tuesday: "Tuesday",
  Wednesday: "Wednesday",
  Thursday: "Thursday",
};
const DAYS_AR_MAP = {
  Saturday: "السبت",
  Sunday: "الأحد",
  Monday: "الإثنين",
  Tuesday: "الثلاثاء",
  Wednesday: "الأربعاء",
  Thursday: "الخميس",
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

function buildFriendlyAiError(rawError) {
  const raw = String(rawError || "");
  const lower = raw.toLowerCase();

  if (
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("googlegenerativeai")
  ) {
    return {
      title: "AI service is currently unavailable",
      message:
        "We could not connect to the schedule generation service due to a server configuration issue.",
      hint: "Please try again later, or contact support if the issue continues.",
    };
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("timeout")
  ) {
    return {
      title: "Network connection issue",
      message: "We could not reach the server while generating your schedule.",
      hint: "Please check your internet connection and try again.",
    };
  }

  if (lower.includes("must login") || lower.includes("unauthorized")) {
    return {
      title: "Login required",
      message: "You need to sign in before generating a schedule.",
      hint: "Sign in, then click Generate Schedules again.",
    };
  }

  return {
    title: "Unable to generate schedule",
    message: "An unexpected error occurred while analyzing your files.",
    hint: "Try uploading fewer files or clearer images, then try again.",
  };
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
  const manualScheduleRef = useRef(null);
  const aiScheduleRef = useRef(null);
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
  const [aiError, setAiError] = useState(null);
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
  const exportPDF = async (
    fileName = "Nazamly-Schedule.pdf",
    mode = "manual",
  ) => {
    const captureTarget =
      mode === "ai" ? aiScheduleRef.current : manualScheduleRef.current;
    if (!captureTarget) return;

    setExporting(true);

    const FIXED_WIDTH_PX = 1000;
    const GRID_COLS = "22% 30% 16% 14% 18%";
    const GRID_COLS_AI = "22% 30% 16% 14% 18%";
    const TYPE_AR_MAP = {
      lecture: "محاضرة",
      section: "سكشن",
      lab: "معمل",
      ن: "محاضرة",
      ت: "سكشن",
      ع: "معمل",
    };

    try {
      const canvas = await html2canvas(captureTarget, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: FIXED_WIDTH_PX,
        windowWidth: FIXED_WIDTH_PX,
        onclone: (doc) => {
          const clonedSchedule = doc.querySelector(".gen-schedule");
          if (clonedSchedule) {
            clonedSchedule.setAttribute("dir", "rtl");
            clonedSchedule.setAttribute("lang", "ar");
            clonedSchedule.style.width = FIXED_WIDTH_PX + "px";
            clonedSchedule.style.maxWidth = FIXED_WIDTH_PX + "px";
            clonedSchedule.style.minWidth = FIXED_WIDTH_PX + "px";
            clonedSchedule.style.overflow = "visible";
            clonedSchedule.style.direction = "rtl";

            const captionDiv = doc.createElement("div");
            captionDiv.style.cssText = `
            text-align: center;
            padding: 18px 14px;
            font-family: 'Arial', 'Tajawal', sans-serif;
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            -webkit-text-fill-color: #0f172a;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 14px;
            direction: rtl;
          `;
            captionDiv.textContent = "جدولي الدراسي - NAZAMLY";
            clonedSchedule.insertBefore(captionDiv, clonedSchedule.firstChild);
          }

          doc.documentElement.setAttribute("dir", "rtl");
          doc.body.setAttribute("dir", "rtl");
          doc.body.style.direction = "rtl";

          doc
            .querySelectorAll(
              ".gen-schedule, .gen-day-card, .gen-day-items, .gen-item-header",
            )
            .forEach((el) => {
              el.style.overflow = "visible";
            });

          const spanBase = `
          color: #475569;
          -webkit-text-fill-color: #475569;
          font-size: 14px;
          font-weight: 800;
          text-align: center;
          display: inline-block;
          line-height: 1.6;
          white-space: nowrap;
          overflow: visible;
          padding: 2px 4px;
        `;
          const firstSpanStyle = spanBase + ` padding-right: 8px;`;

          const clonedHeaders = doc.querySelectorAll(".gen-item-header");
          clonedHeaders.forEach((header) => {
            const isAI = header
              .closest(".gen-day-card")
              ?.querySelector(".ai-item");
            const cols = isAI ? GRID_COLS_AI : GRID_COLS;

            header.style.cssText = `
            display: grid !important;
            grid-template-columns: ${cols} !important;
            gap: 8px !important;
            align-items: center !important;
            padding: 10px 20px !important;
            background: #f1f5f9 !important;
            border-bottom: 1px solid #e2e8f0 !important;
            overflow: visible !important;
            direction: rtl !important;
          `;

            header.innerHTML =
              `<span style="${firstSpanStyle}">الوقت</span>` +
              `<span style="${spanBase}">المادة</span>` +
              `<span style="${spanBase}">النوع</span>` +
              `<span style="${spanBase}">المجموعة</span>` +
              `<span style="${spanBase}">المكان</span>`;
          });

          doc.querySelectorAll(".gen-item:not(.ai-item)").forEach((row) => {
            const subjectCol = row.children[1];
            const groupCol = row.children[2];
            const placeCol = row.children[3];
            const deleteBtn = row.children[4];
            if (!subjectCol || !groupCol || !placeCol) return;

            const subjectText =
              subjectCol.querySelector(".gen-subject")?.textContent?.trim() ||
              subjectCol.textContent?.trim() ||
              "";
            const badge = subjectCol.querySelector(".type-badge");

            const cleanSubjectCol = doc.createElement("div");
            cleanSubjectCol.className = "gen-col";
            cleanSubjectCol.innerHTML = `<span class="gen-col-value gen-subject">${subjectText}</span>`;

            const typeCol = doc.createElement("div");
            typeCol.className = "gen-col";
            if (badge) {
              typeCol.appendChild(badge.cloneNode(true));
            } else {
              const fallback = doc.createElement("span");
              fallback.className = "gen-col-value";
              fallback.textContent = "—";
              typeCol.appendChild(fallback);
            }

            row.replaceChild(cleanSubjectCol, subjectCol);
            row.insertBefore(typeCol, groupCol);
            if (deleteBtn) deleteBtn.remove();
          });

          doc.querySelectorAll(".gen-day-title").forEach((el) => {
            const dayText = (el.textContent || "").trim();
            if (DAYS_AR_MAP[dayText]) {
              el.textContent = DAYS_AR_MAP[dayText];
            }
          });

          doc.querySelectorAll(".type-badge").forEach((badge) => {
            const raw = (badge.textContent || "").trim().toLowerCase();
            badge.textContent = TYPE_AR_MAP[raw] || badge.textContent;
          });

          doc.querySelectorAll(".gen-time-sep").forEach((el) => {
            el.textContent = "←";
          });

          doc.querySelectorAll(".gen-item-time span").forEach((timeSpan) => {
            if (!timeSpan.textContent) return;
            timeSpan.textContent = timeSpan.textContent
              .replace(/\bAM\b/gi, "ص")
              .replace(/\bPM\b/gi, "م");
          });

          const style = doc.createElement("style");
          style.textContent = `
                              :root {
                                --bg-page: #ffffff;
                                --bg-surface: #ffffff;
                                --bg-card: #ffffff;
                                --bg-header: #1e293b;
                                --bg-col-header: #f1f5f9;
                                --bg-row-even: #f8fafc;
                                --bg-row-odd: #ffffff;
                                --border: #e2e8f0;
                                --text-primary: #0f172a;
                                --text-secondary: #334155;
                                --text-muted: #64748b;
                                --text-soft: #94a3b8;
                                --badge-n: #2563eb;
                                --badge-t: #f59e0b;
                                --badge-a: #dc2626;
                                --badge-text: #ffffff;
                              }

                              * {
                                box-sizing: border-box !important;
                                font-family: "Arial", "Tajawal", sans-serif !important;
                                color: var(--text-primary) !important;
                                -webkit-text-fill-color: var(--text-primary) !important;
                                text-rendering: optimizeLegibility !important;
                                -webkit-font-smoothing: antialiased !important;
                                font-synthesis-weight: none !important;
                                letter-spacing: normal !important;
                                word-spacing: normal !important;
                                font-variant-ligatures: common-ligatures !important;
                              }

                              html, body {
                                background: var(--bg-page) !important;
                                direction: rtl !important;
                              }

                              .gen-schedule {
                                background: var(--bg-surface) !important;
                                border: 1px solid var(--border) !important;
                                border-radius: 12px !important;
                                padding: 14px !important;
                                overflow: visible !important;
                              }

                              .gen-day-card {
                                background: var(--bg-card) !important;
                                border: 1px solid var(--border) !important;
                                border-radius: 10px !important;
                                margin-bottom: 14px !important;
                                overflow: visible !important;
                              }

                              .gen-day-title {
                                background: var(--bg-header) !important;
                                color: #ffffff !important;
                                -webkit-text-fill-color: #ffffff !important;
                                font-size: 21px !important;
                                font-weight: 800 !important;
                                line-height: 1.5 !important;
                                padding: 12px 20px !important;
                              }

                              .gen-item-header {
                                display: grid !important;
                                grid-template-columns: ${GRID_COLS} !important;
                                gap: 8px !important;
                                align-items: center !important;
                                background: var(--bg-col-header) !important;
                                border-bottom: 1px solid var(--border) !important;
                                padding: 10px 20px !important;
                                overflow: visible !important;
                                direction: rtl !important;
                              }

                              .gen-day-card:has(.ai-item) > .gen-item-header {
                                grid-template-columns: ${GRID_COLS_AI} !important;
                              }

                              .gen-item-header > span {
                                font-size: 16px !important;
                                font-weight: 800 !important;
                                color: #475569 !important;
                                -webkit-text-fill-color: #475569 !important;
                                text-align: center !important;
                                white-space: nowrap !important;
                                overflow: visible !important;
                                display: inline-block !important;
                                padding: 2px 4px !important;
                              }

                              .gen-item-header > span:first-child {
                                padding-right: 8px !important;
                              }

                              .gen-day-items {
                                overflow: visible !important;
                              }

                              .gen-item {
                                display: grid !important;
                                grid-template-columns: ${GRID_COLS} !important;
                                align-items: center !important;
                                gap: 8px !important;
                                background: var(--bg-row-odd) !important;
                                border-bottom: 1px solid var(--border) !important;
                                padding: 12px 20px !important;
                                overflow: visible !important;
                              }

                              .gen-item.ai-item {
                                grid-template-columns: ${GRID_COLS_AI} !important;
                              }

                              .gen-item-header,
                              .gen-item,
                              .gen-item.ai-item {
                                justify-items: center !important;
                              }

                              .gen-item:nth-child(even) {
                                background: var(--bg-row-even) !important;
                              }

                              .gen-item-time {
                                display: flex !important;
                                flex-direction: row !important;
                                align-items: center !important;
                                justify-content: center !important;
                                gap: 5px !important;
                                flex-wrap: nowrap !important;
                                white-space: nowrap !important;
                                color: var(--text-secondary) !important;
                                -webkit-text-fill-color: var(--text-secondary) !important;
                                font-size: 17px !important;
                                font-weight: 700 !important;
                                line-height: 1.5 !important;
                              }

                              .gen-col-label {
                                display: none !important;
                              }

                              .gen-col {
                                text-align: center !important;
                              }

                              .gen-col-value {
                                color: var(--text-secondary) !important;
                                -webkit-text-fill-color: var(--text-secondary) !important;
                                font-size: 17px !important;
                                font-weight: 600 !important;
                                line-height: 1.45 !important;
                                text-align: center !important;
                              }

                              .gen-subject {
                                color: var(--text-primary) !important;
                                -webkit-text-fill-color: var(--text-primary) !important;
                                font-size: 19px !important;
                                font-weight: 800 !important;
                                line-height: 1.5 !important;
                              }

                              .gen-item-top {
                                justify-content: center !important;
                              }

                              .gen-time-sep {
                                color: #94a3b8 !important;
                                -webkit-text-fill-color: #94a3b8 !important;
                                font-weight: 700 !important;
                                font-size: 15px !important;
                              }

                              .type-badge {
                                display: inline-block !important;
                                font-size: 15px !important;
                                font-weight: 700 !important;
                                line-height: 1.2 !important;
                                padding: 5px 14px !important;
                                border-radius: 999px !important;
                                border: none !important;
                                color: var(--badge-text) !important;
                                -webkit-text-fill-color: var(--badge-text) !important;
                              }

                              .type-badge-n {
                                background: var(--badge-n) !important;
                                color: #ffffff !important;
                                -webkit-text-fill-color: #ffffff !important;
                              }

                              .type-badge-t {
                                background: var(--badge-t) !important;
                                color: #ffffff !important;
                                -webkit-text-fill-color: #ffffff !important;
                              }

                              .type-badge-a {
                                background: var(--badge-a) !important;
                                color: #ffffff !important;
                                -webkit-text-fill-color: #ffffff !important;
                              }

                              button,
                              svg,
                              .icon-trash,
                              .pdf-export-btn,
                              .gpa-delete-btn,
                              .ai-thumb-remove {
                                display: none !important;
                                visibility: hidden !important;
                                width: 0 !important;
                                height: 0 !important;
                                overflow: hidden !important;
                              }

                              .gpa-delete-btn {
                                display: none !important;
                              }
        `;
          doc.head.appendChild(style);
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.8);

      const pdfWidthMM = 210;
      const pdfHeightMM = (canvas.height * pdfWidthMM) / canvas.width;
      const pdf = new jsPDF({
        orientation: pdfHeightMM > pdfWidthMM ? "p" : "l",
        unit: "mm",
        format: [pdfWidthMM, pdfHeightMM],
      });

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidthMM, pdfHeightMM);
      pdf.save(fileName);
    } catch (err) {
      console.error(err);
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
      setAiError({
        title: "Too many files",
        message: "You can upload up to 5 files only.",
        hint: "Remove at least one file, then upload again.",
      });
      return;
    }
    setAiFiles((prev) => [...prev, ...picked]);
    setAiError(null);
  };

  const removeFile = (idx) =>
    setAiFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleGenerate = async () => {
    if (aiFiles.length === 0) {
      setAiError({
        title: "No files uploaded",
        message:
          "Please upload at least one image before generating a schedule.",
      });
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiResults(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must login first to generate a schedule");
      }
      const token = await user.getIdToken(true);

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
      setAiError(buildFriendlyAiError(err?.message || err));
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
      const token = await user.getIdToken(true);

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

      setSaveSuccess(
        "✅ Schedule saved successfully! Open the Nazamly app on your mobile",
      );
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
          <div className="gen-schedule" ref={manualScheduleRef}>
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
                        .sort((a, b) => {
                          const getMinutes = (timeStr) => {
                            const [time, modifier] = timeStr.split(" ");
                            let [hours, minutes] = time.split(":").map(Number);
                            if (hours === 12) hours = 0;
                            if (modifier === "PM") hours += 12;
                            return hours * 60 + minutes;
                          };

                          return (
                            getMinutes(a.slot.start) - getMinutes(b.slot.start)
                          );
                        })
                        .map((item) => (
                          <div key={item.id} className="gen-item">
                            <div className="gen-item-time">
                              <span>{item.slot.start}</span>
                              <span className="gen-time-sep">↓</span>
                              <span>{item.slot.end}</span>
                            </div>

                            <div className="gen-col">
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
                              <span className="gen-col-value">
                                {item.group || "—"}
                              </span>
                            </div>

                            <div className="gen-col">
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
              <h3 style={{ marginBottom: "4px" }}>
                🤖 Generate Smart Schedule
              </h3>
              <p className="ai-upload-desc">
                Upload college schedule images and select course numbers — we
                will suggest the 3 best schedules without conflicts
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
                  Separate numbers with a comma — leave empty to show all
                  courses
                </span>
              </div>

              {aiError && (
                <div className="ai-error" role="alert" aria-live="polite">
                  <div className="ai-error-title">{aiError.title}</div>
                  <p className="ai-error-message">{aiError.message}</p>
                  {aiError.hint && (
                    <p className="ai-error-hint">{aiError.hint}</p>
                  )}
                </div>
              )}

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
                    {(aiResults.metadata?.uniqueCoursesIdentified || []).join(
                      " , ",
                    )}
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
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <button
                        className="btn-primary pdf-export-btn"
                        onClick={() =>
                          exportPDF(
                            `Smart-Schedule-${aiSelected + 1}.pdf`,
                            "ai",
                          )
                        }
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
                      <p
                        style={{
                          marginTop: "8px",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          background: saveSuccess.startsWith("✅")
                            ? "#f0fdf4"
                            : "#fef2f2",
                          color: saveSuccess.startsWith("✅")
                            ? "#16a34a"
                            : "#dc2626",
                        }}
                      >
                        {saveSuccess}
                      </p>
                    )}
                    <div className="gen-schedule" ref={aiScheduleRef}>
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
