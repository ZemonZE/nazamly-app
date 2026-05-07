import { useState, useEffect, useRef } from "react";
import { updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, API_URL } from "../firebase";
import mainLogo from "../assets/logo.jpg";
import "../styles/StudentOnboarding.css";

/* ── Department options (matching the backend seed data) ── */
const DEPARTMENTS = [
  "General",
  "CS",
  "IT",
  "MATH",
  "PHYS",
];

function StudentOnboarding({ user, setUser }) {
  const navigate = useNavigate();

  /* ── Derive initial fullName from the authenticated user ── */
  const deriveFullName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.fullName) return user.fullName;
    if (user?.name) return user.name;
    return "";
  };

  /* ── Form state ── */
  const [fullName, setFullName] = useState(deriveFullName);
  const [studentCode, setStudentCode] = useState("");
  const [completedHours, setCompletedHours] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [department, setDepartment] = useState("");

  /* ── Course selection state ── */
  const [availableCourses, setAvailableCourses] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  /* ── UI state ── */
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);

  /* ── Fetch courses on mount ── */
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;
        const token = await firebaseUser.getIdToken();
        const res = await fetch(`${API_URL}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load courses");
        const json = await res.json();
        setAvailableCourses(json.data || []);
      } catch {
        setCoursesError("Could not load courses. You can still complete your profile.");
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Auto-set department when year = 1 ── */
  const handleYearChange = (value) => {
    setAcademicYear(value);
    setFormError(null);
    if (value === "1") {
      setDepartment("General");
    }
  };

  /* ── Course selection helpers ── */
  const toggleCourse = (courseId) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
    setCourseSearch("");
  };

  const removeCourse = (courseId) => {
    setSelectedCourseIds((prev) => prev.filter((id) => id !== courseId));
  };

  const filteredCourses = availableCourses.filter((c) => {
    if (selectedCourseIds.includes(c._id)) return false;
    const q = courseSearch.toLowerCase();
    if (!q) return true;
    return (
      c.courseName?.toLowerCase().includes(q) ||
      c.courseCode?.toLowerCase().includes(q)
    );
  });

  const getCourseLabelById = (id) => {
    const c = availableCourses.find((x) => x._id === id);
    return c ? `${c.courseCode} — ${c.courseName}` : id;
  };

  /* ── Submit handler ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    /* Frontend validation: studentCode must be exactly 7 digits */
    if (!/^\d{7}$/.test(studentCode)) {
      setFormError("Student code must be exactly 7 digits (e.g. 2327482).");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        studentCode: studentCode.trim(),
        completedHours: Number(completedHours),
        cgpa: Number(cgpa),
        academicYear: Number(academicYear),
        department: academicYear === "1" ? "General" : department,
        registeredCourses: selectedCourseIds,
      };

      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setFormError("You must be logged in to complete your profile.");
        setLoading(false);
        return;
      }
      const token = await firebaseUser.getIdToken(true);

      const res = await fetch(`${API_URL}/api/students/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 201) {
        setSuccess(true);
        const trimmedName = fullName.trim();
        if (trimmedName && auth.currentUser) {
          try {
            await updateProfile(auth.currentUser, { displayName: trimmedName });
          } catch {
            // Best-effort Firebase profile update; don't block onboarding.
          }
        }
        // Deep-merge the full backend user object so Dashboard sees real data instantly
        setUser(prev => ({ ...prev, ...data.data, isProfileComplete: true }));
        setTimeout(() => navigate("/dashboard"), 1500);
        return;
      }

      if (res.status === 400 && data.errors) {
        setFormError(data.errors.join(" • "));
        return;
      }

      if (res.status === 409) {
        setFormError(data.message || "Student code already exists.");
        return;
      }

      /* 500 or other */
      setFormError("An unexpected server error occurred. Please try again later.");
    } catch {
      setFormError("Network error — could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        {/* ── Header ── */}
        <div className="onboarding-header">
          <a href="#">
            <img src={mainLogo} className="site-logo" alt="Nazamly" />
            <h1>Nazamly</h1>
          </a>
          <p className="tagline">Complete your academic profile</p>
        </div>

        {/* ── Form Panel ── */}
        <div className="onboarding-form-panel">
          <h2>Student Onboarding</h2>
          <p>Fill in your academic data to get started with your dashboard.</p>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="onb-fullName">Full Name</label>
              <div className="input-wrap">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </span>
                <input
                  id="onb-fullName"
                  type="text"
                  placeholder="e.g. Ahmed Mohamed"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setFormError(null); }}
                  required
                />
              </div>
            </div>

            {/* Student Code */}
            <div className="form-group">
              <label htmlFor="onb-studentCode">Student Code</label>
              <div className="input-wrap">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </span>
                <input
                  id="onb-studentCode"
                  type="text"
                  placeholder="e.g. 2327482"
                  maxLength={7}
                  value={studentCode}
                  onChange={(e) => { setStudentCode(e.target.value); setFormError(null); }}
                  required
                />
              </div>
            </div>

            {/* Completed Hours & CGPA (side-by-side) */}
            <div className="onboarding-form-row">
              <div className="form-group">
                <label htmlFor="onb-hours">Completed Hours</label>
                <input
                  id="onb-hours"
                  className="onboarding-input"
                  type="number"
                  placeholder="e.g. 92"
                  min="0"
                  value={completedHours}
                  onChange={(e) => { setCompletedHours(e.target.value); setFormError(null); }}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="onb-cgpa">CGPA</label>
                <input
                  id="onb-cgpa"
                  className="onboarding-input"
                  type="number"
                  placeholder="e.g. 3.84"
                  min="0"
                  max="5"
                  step="0.01"
                  value={cgpa}
                  onChange={(e) => { setCgpa(e.target.value); setFormError(null); }}
                  required
                />
              </div>
            </div>

            {/* Academic Year & Department (side-by-side) */}
            <div className="onboarding-form-row">
              <div className="form-group">
                <label htmlFor="onb-year">Academic Year</label>
                <select
                  id="onb-year"
                  className="onboarding-select"
                  value={academicYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  required
                >
                  <option value="" disabled>Select year</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="onb-dept">Department</label>
                <select
                  id="onb-dept"
                  className="onboarding-select"
                  value={academicYear === "1" ? "General" : department}
                  onChange={(e) => { setDepartment(e.target.value); setFormError(null); }}
                  disabled={academicYear === "1"}
                  required
                >
                  <option value="" disabled>Select department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Course Multi-Select ── */}
            <div className="form-group">
              <label>Registered Courses <span className="label-optional">(optional)</span></label>

              <div className="course-multiselect" ref={dropdownRef}>
                {/* Selected chips */}
                {selectedCourseIds.length > 0 && (
                  <div className="course-chips">
                    {selectedCourseIds.map((id) => (
                      <span key={id} className="course-chip">
                        {getCourseLabelById(id)}
                        <button
                          type="button"
                          className="chip-remove"
                          onClick={() => removeCourse(id)}
                          aria-label="Remove"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search input */}
                <div className="course-search-wrap">
                  <svg className="course-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="course-search-input"
                    placeholder={isLoadingCourses ? "Loading courses..." : "Search courses by name or code…"}
                    value={courseSearch}
                    onChange={(e) => { setCourseSearch(e.target.value); setIsDropdownOpen(true); }}
                    onFocus={() => setIsDropdownOpen(true)}
                    disabled={isLoadingCourses}
                  />
                  {selectedCourseIds.length > 0 && (
                    <span className="course-count-badge">{selectedCourseIds.length}</span>
                  )}
                </div>

                {/* Courses error */}
                {coursesError && (
                  <p className="course-load-error">{coursesError}</p>
                )}

                {/* Dropdown list */}
                {isDropdownOpen && !isLoadingCourses && !coursesError && (
                  <ul className="course-dropdown">
                    {filteredCourses.length === 0 ? (
                      <li className="course-dropdown-empty">
                        {courseSearch ? "No courses match your search." : "All courses selected."}
                      </li>
                    ) : (
                      filteredCourses.map((c) => (
                        <li
                          key={c._id}
                          className="course-dropdown-item"
                          onClick={() => toggleCourse(c._id)}
                        >
                          <span className="course-item-code">{c.courseCode}</span>
                          <span className="course-item-name">{c.courseName}</span>
                          <span className="course-item-meta">{c.creditHours}h</span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* ── Error Banner (identical to auth-error-banner) ── */}
            {formError && (
              <div className="auth-error-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{formError}</span>
              </div>
            )}

            {/* ── Success Banner ── */}
            {success && (
              <div className="onboarding-success-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>Profile created successfully! Redirecting to dashboard…</span>
              </div>
            )}

            {/* ── Submit Button (mirrors btn-primary) ── */}
            <button type="submit" className="btn-primary" disabled={loading || success}>
              {loading ? "Saving..." : "Complete Profile"}
            </button>
          </form>
        </div>

        {/* ── Sign out link ── */}
        <p className="onboarding-signout">
          Wrong account?{" "}
          <button
            type="button"
            className="onboarding-signout-btn"
            onClick={() => {
              auth.signOut();
              setUser(null);
            }}
          >
            Sign Out
          </button>
        </p>
      </div>
    </div>
  );
}

export default StudentOnboarding;
