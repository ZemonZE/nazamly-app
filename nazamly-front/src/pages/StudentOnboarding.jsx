import { useState, useEffect, useRef } from "react";
import { updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth, API_URL } from "../firebase";
import mainLogo from "../assets/logo.jpg";
import { AnimatedBackground } from "../components/AnimatedBackground";
import {
  User, CreditCard, BookOpen, GraduationCap, Search, X,
  AlertCircle, CheckCircle, ArrowRight, LogOut, Loader2,
} from "lucide-react";

const DEPARTMENTS = ["General", "CS", "IT", "MATH", "PHYS"];

function StudentOnboarding({ user, setUser }) {
  const navigate = useNavigate();

  const deriveFullName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.fullName) return user.fullName;
    if (user?.name) return user.name;
    return "";
  };

  const [fullName, setFullName] = useState(deriveFullName);
  const [studentCode, setStudentCode] = useState("");
  const [completedHours, setCompletedHours] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [department, setDepartment] = useState("");

  const [availableCourses, setAvailableCourses] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);

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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleYearChange = (value) => {
    setAcademicYear(value);
    setFormError(null);
    if (value === "1") setDepartment("General");
  };

  const toggleCourse = (courseId) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
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
    return c.courseName?.toLowerCase().includes(q) || c.courseCode?.toLowerCase().includes(q);
  });

  const getCourseLabelById = (id) => {
    const c = availableCourses.find((x) => x._id === id);
    return c ? `${c.courseCode} — ${c.courseName}` : id;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

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
            // Best-effort Firebase profile update
          }
        }
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

      setFormError("An unexpected server error occurred. Please try again later.");
    } catch {
      setFormError("Network error — could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "h-12 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-ring transition";
  const selectClass = "h-12 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-ring transition appearance-none";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground variant="soft" />
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <img src={mainLogo} alt="Nazamly" className="h-10 w-10 rounded-xl object-cover shadow" />
            <span className="font-display text-xl font-semibold">Nazamly</span>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-xl backdrop-blur">
            <h1 className="font-display text-3xl font-light leading-tight mb-1">
              Student <span className="font-bold">Onboarding</span>
            </h1>
            <p className="text-sm text-muted-foreground mb-6">Fill in your academic data to get started.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" required value={fullName} onChange={(e) => { setFullName(e.target.value); setFormError(null); }}
                    placeholder="e.g. Ahmed Mohamed" className={inputClass} />
                </div>
              </label>

              {/* Student Code */}
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Student Code</span>
                <div className="relative">
                  <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" required maxLength={7} value={studentCode} onChange={(e) => { setStudentCode(e.target.value); setFormError(null); }}
                    placeholder="e.g. 2327482" className={inputClass} />
                </div>
              </label>

              {/* Hours & CGPA */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Completed Hours</span>
                  <div className="relative">
                    <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="number" required min="0" value={completedHours} onChange={(e) => { setCompletedHours(e.target.value); setFormError(null); }}
                      placeholder="e.g. 92" className={inputClass} />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">CGPA</span>
                  <div className="relative">
                    <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="number" required min="0" max="5" step="0.01" value={cgpa} onChange={(e) => { setCgpa(e.target.value); setFormError(null); }}
                      placeholder="e.g. 3.84" className={inputClass} />
                  </div>
                </label>
              </div>

              {/* Year & Department */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Academic Year</span>
                  <select required value={academicYear} onChange={(e) => handleYearChange(e.target.value)} className={selectClass}>
                    <option value="" disabled>Select year</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Department</span>
                  <select
                    required
                    value={academicYear === "1" ? "General" : department}
                    onChange={(e) => { setDepartment(e.target.value); setFormError(null); }}
                    disabled={academicYear === "1"}
                    className={`${selectClass} disabled:opacity-50`}
                  >
                    <option value="" disabled>Select department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
              </div>

              {/* Course Multi-Select */}
              <div>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Registered Courses <span className="opacity-50">(optional)</span>
                </span>
                <div ref={dropdownRef} className="relative">
                  {selectedCourseIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedCourseIds.map((id) => (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-mint px-2.5 py-1 text-xs font-medium">
                          {getCourseLabelById(id)}
                          <button type="button" onClick={() => removeCourse(id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={isLoadingCourses ? "Loading courses..." : "Search courses..."}
                      value={courseSearch}
                      onChange={(e) => { setCourseSearch(e.target.value); setIsDropdownOpen(true); }}
                      onFocus={() => setIsDropdownOpen(true)}
                      disabled={isLoadingCourses}
                      className={`${inputClass} disabled:opacity-50`}
                    />
                    {selectedCourseIds.length > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-brand-orange px-2 py-0.5 text-xs font-bold text-white">{selectedCourseIds.length}</span>
                    )}
                  </div>
                  {coursesError && <p className="text-xs text-destructive mt-1">{coursesError}</p>}
                  {isDropdownOpen && !isLoadingCourses && !coursesError && (
                    <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-card shadow-lg">
                      {filteredCourses.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-muted-foreground">{courseSearch ? "No courses match." : "All courses selected."}</li>
                      ) : (
                        filteredCourses.map((c) => (
                          <li key={c._id} className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-secondary transition text-sm" onClick={() => toggleCourse(c._id)}>
                            <span className="font-medium">{c.courseCode}</span>
                            <span className="text-muted-foreground truncate ml-2">{c.courseName}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{c.creditHours}h</span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-brand-mint px-4 py-3 text-sm text-foreground">
                  <CheckCircle className="h-4 w-4 shrink-0 text-brand-teal" />
                  <span>Profile created successfully! Redirecting to dashboard…</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || success}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <>Complete Profile <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></>}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Wrong account?{" "}
              <button
                type="button"
                className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline"
                onClick={() => { auth.signOut(); setUser(null); }}
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentOnboarding;
