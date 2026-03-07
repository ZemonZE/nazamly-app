import { useState, useEffect } from "react";
import { IconTrash } from "../Icons/DashboardIcons";

const DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];

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

function Generator() {
  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem("schedules");
    return saved ? JSON.parse(saved) : [];
  });
  const [form, setForm] = useState(initialForm);
  const [conflict, setConflict] = useState(null);
  const slots = SLOTS[form.duration];

  // Save schedules to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("schedules", JSON.stringify(schedules));
  }, [schedules]);

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

  return (
    <div className="dash-home">
      {/* ── Title ── */}
      <div>
        <h2 className="page-title">منظم الجداول</h2>
        <p className="page-sub">نظّم جدولك الدراسي بسهولة</p>
      </div>

      {/* ── Conflict Popup ── */}
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
                      .sort((a, b) => a.slot.start.localeCompare(b.slot.start))
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
    </div>
  );
}

export default Generator;
