import { useState, useEffect, useCallback } from "react";
import { getMyCoursesMaterials, getSubFolderFiles } from "../services/materialsService";
import { API_URL, auth } from "../firebase";
import { useLocation, useOutletContext } from "react-router-dom";

import {
  GenerateIcon, ArchiveIcon, BrainIcon, QuizIcon, MidtermIcon, FinalIcon,
  CheckIcon, WarningIcon, ReportIcon, LightbulbIcon, SparklesIcon,
  SearchIcon, EyeIcon, LeafIcon, TrophyIcon, ThumbsUpIcon, TrendingUpIcon,
  GraduationCapIcon, BarChartIcon, TypeIcon, CheckCircleIcon
} from '../Icons/Icons';

// ══════════════════════════════════════════════
//  DIFFICULTY HELPERS
// ══════════════════════════════════════════════
const getDifficultyLabel = (level) => {
  if (level <= 2) return "Easy";
  if (level <= 3) return "Medium";
  return "Hard";
};

const getDifficultyClass = (level) => {
  if (typeof level === "string") return `qb-diff-${level.toLowerCase()}`;
  if (level <= 2) return "qb-diff-easy";
  if (level <= 3) return "qb-diff-medium";
  return "qb-diff-hard";
};

// ══════════════════════════════════════════════
//  EXAM STRUCTURE CONFIG
// ══════════════════════════════════════════════
const EXAM_CONFIG = {
  Quiz:    { total: 10, mcq: 5,  tf: 5  },
  Midterm: { total: 20, mcq: 10, tf: 10 },
  Final:   { total: 60, mcq: 30, tf: 30 },
};

const getQuestionType = (q) => {
  if (q.type) {
    const t = q.type.toLowerCase();
    if (t === "t/f" || t === "true/false") return "tf";
    return t;
  }
  if (q.options && q.options.length === 2 && q.options.some(opt => opt.toLowerCase() === "true" || opt.toLowerCase() === "false")) return "tf";
  if (q.options && q.options.length > 2) return "mcq";
  return "essay";
};

const sortQuestionsByType = (questions) => {
  const typeOrder = { mcq: 1, tf: 2, essay: 3 };
  return [...questions].sort((a, b) => {
    const typeA = getQuestionType(a);
    const typeB = getQuestionType(b);
    return (typeOrder[typeA] || 4) - (typeOrder[typeB] || 4);
  });
};

// ══════════════════════════════════════════════
//  CUSTOM SELECT COMPONENT
// ══════════════════════════════════════════════
function NseCustomSelect({ value, onChange, options, placeholder, disabled, icon }) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className={`nse-custom-select ${open ? "open" : ""} ${disabled ? "disabled" : ""}`}>
      <button
        type="button"
        className="nse-select-trigger"
        onClick={() => !disabled && setOpen(!open)}
        aria-expanded={open}
      >
        {icon && <span className="nse-select-icon">{icon}</span>}
        <span className={`nse-select-value ${!selectedOption ? "placeholder" : ""}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={`nse-select-chevron ${open ? "rotated" : ""}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open && (
        <div className="nse-select-dropdown">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`nse-select-option ${value === opt.value ? "selected" : ""}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.icon && <span className="nse-opt-icon">{opt.icon}</span>}
              <span>{opt.label}</span>
              {value === opt.value && <span className="nse-opt-check">{<CheckIcon size={12} />}</span>}
            </button>
          ))}
        </div>
      )}

      {open && <div className="nse-select-backdrop" onClick={() => setOpen(false)} />}
    </div>
  );
}

// ══════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════
function Questions() {
  const location = useLocation();
  const { user } = useOutletContext();
  // ── Tab Navigation ──
  const [activeMainTab, setActiveMainTab] = useState("generate"); // "generate" | "archive"

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveMainTab(location.state.activeTab);
    }
  }, [location.state]);

  // ── Step 1: Course Data ──
  const [courses, setCourses] = useState([]);
  const [selectedCourseObj, setSelectedCourseObj] = useState(null);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState(null);

  // ── Step 2: Lectures ──
  const [lectures, setLectures] = useState([]);
  const [selectedLectures, setSelectedLectures] = useState([]);
  const [loadingLectures, setLoadingLectures] = useState(false);

  // ── Step 3: Exam Parameters ──
  const [examType, setExamType] = useState("Quiz");

  // ── AI Engine State ──
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState("");
  const [aiError, setAiError] = useState(null);

  const [aiUserAnswers, setAiUserAnswers] = useState({});
  const [aiSubmitted, setAiSubmitted] = useState(false);
  const [reportedQuestions, setReportedQuestions] = useState({});

  // ── Archive State ──
  const [archiveMidterms, setArchiveMidterms] = useState([]);
  const [archiveFinals, setArchiveFinals] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState(null);
  const [hasSearchedArchive, setHasSearchedArchive] = useState(false);

  // ── Archive Interaction State (dual-mode) ──
  const [archiveAnswers, setArchiveAnswers] = useState({});    // { "mid-0": "option", "fin-3": "option" }
  const [archiveRevealed, setArchiveRevealed] = useState({});  // { "mid-0": true, "fin-3": true }

  // ── Quiz History State ──
  const [quizHistory, setQuizHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [selectedHistoryQuiz, setSelectedHistoryQuiz] = useState(null);

  // ── Computed: current exam config ──
  const currentConfig = EXAM_CONFIG[examType] || EXAM_CONFIG.Quiz;
  const answeredCount = Object.keys(aiUserAnswers).length;
  const totalQuestions = aiQuestions.length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // ── Initial Data Fetch — fetch real course ObjectIds, filter to user's enrolled courses ──
  useEffect(() => {
    setCoursesLoading(true);
    setCoursesError(null);

    const loadCourses = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        // Always fetch the real courses list to get correct ObjectIds
        const res = await fetch(`${API_URL}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch courses");
        const allCourses = await res.json();
        const coursesList = Array.isArray(allCourses) ? allCourses : (allCourses.courses || allCourses.data || []);

        // If user has termCourses, filter to only enrolled courses
        if (user?.termCourses && user.termCourses.length > 0) {
          const enrolledCodes = new Set(user.termCourses.map((c) => c.courseCode));
          const filtered = coursesList
            .filter((c) => enrolledCodes.has(c.courseCode))
            .map((c) => ({
              courseId: c._id,
              courseCode: c.courseCode,
              courseName: c.courseName,
            }));
          console.log("[Questions] courses (real ObjectIds):", filtered);
          setCourses(filtered);
        } else {
          // No termCourses — show all courses
          const mapped = coursesList.map((c) => ({
            courseId: c._id,
            courseCode: c.courseCode,
            courseName: c.courseName,
          }));
          setCourses(mapped);
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
        setCoursesError(err.message || "Failed to load courses.");
      } finally {
        setCoursesLoading(false);
      }
    };

    if (auth.currentUser) loadCourses();
  }, [user]);

  useEffect(() => {
    if (activeMainTab === "history") {
      loadHistory();
    }
  }, [activeMainTab]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/student/quizzes/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuizHistory(data.history || []);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Handle Course Selection ──
  const handleCourseChange = async (courseIdValue) => {
    // Support both event objects (from native select) and direct values (from custom select)
    const courseId = typeof courseIdValue === "object" ? courseIdValue.target.value : courseIdValue;
    const course = courses.find((c) => c.courseId === courseId);

    setSelectedCourseObj(course || null);
    setSelectedLectures([]);
    setLectures([]);
    setAiQuestions([]);
    setArchiveMidterms([]);
    setArchiveFinals([]);
    setHasSearchedArchive(false);

    if (course) {
      setLoadingLectures(true);
      try {
        const res = await getSubFolderFiles(course.courseCode, "lectures");
        setLectures(res.files || []);
      } catch (err) {
        console.error("Failed to fetch lectures", err);
      } finally {
        setLoadingLectures(false);
      }
    }
  };

  // ── Toggle Lecture Selection ──
  const toggleLecture = (lectureId) => {
    setSelectedLectures((prev) =>
      prev.includes(lectureId)
        ? prev.filter((id) => id !== lectureId)
        : [...prev, lectureId],
    );
  };

  // ── SSE Generator Function ──
  const generateExam = useCallback((courseId, examTypeVal, count, materialFileIds) => {
    setAiLoading(true);
    setAiQuestions([]);
    setAiStatusMessage("Starting connection...");
    setAiError(null);
    setAiUserAnswers({});
    setAiSubmitted(false);

    const url = `${API_URL}/api/questions/generate-stream?courseId=${courseId}&examType=${examTypeVal}&questionCount=${count}&materialFileIds=${materialFileIds.join(",")}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === "generating") {
          setAiStatusMessage(data.message || "Generating questions...");
        } else if (data.status === "ready") {
          setAiQuestions(sortQuestionsByType(data.questions || []));
          setAiLoading(false);
          setAiStatusMessage("");
          eventSource.close();
        } else if (data.status === "error" || data.success === false) {
          setAiError(data.message || "An unexpected error occurred.");
          setAiLoading(false);
          eventSource.close();
        }
      } catch (parseErr) {
        console.error("Failed to parse SSE message:", parseErr);
        setAiError("Received an invalid response from the server.");
        setAiLoading(false);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setAiError("Connection lost. Please try again.");
      setAiLoading(false);
      eventSource.close();
    };
  }, []);

  const handleGenerateAiExam = () => {
    if (selectedLectures.length === 0 || !selectedCourseObj) return;
    generateExam(selectedCourseObj.courseId, examType, currentConfig.total, selectedLectures);
  };

  const handleFetchArchive = async () => {
    if (!selectedCourseObj) return;

    setArchiveLoading(true);
    setArchiveError(null);
    setHasSearchedArchive(true);
    setArchiveMidterms([]);
    setArchiveFinals([]);
    setArchiveAnswers({});
    setArchiveRevealed({});

    try {
      const token = await auth.currentUser.getIdToken();
      const url = `${API_URL}/api/questions/archive?courseId=${selectedCourseObj.courseId}`;
      console.log("[Archive] Fetching:", url, "courseObj:", selectedCourseObj);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log("[Archive] Response:", response.status, data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch archive");
      }

      setArchiveMidterms(data.midterms || []);
      setArchiveFinals(data.finals || []);
    } catch (err) {
      console.error(err);
      setArchiveError(err.message || "Failed to fetch archive.");
    } finally {
      setArchiveLoading(false);
    }
  };

  // ── Event Handlers for the generated exam ──
  const handleAiSelectAnswer = (questionIdx, option) => {
    if (aiSubmitted) return;
    setAiUserAnswers((prev) => ({ ...prev, [questionIdx]: option }));
  };

  const handleAiSubmitExam = async () => {
    if (Object.keys(aiUserAnswers).length === 0) return;
    setAiLoading(true);
    setAiStatusMessage("Grading your exam via AI...");

    const questionsSnapshot = aiQuestions.map((q, idx) => {
      const studentAnswer = aiUserAnswers[idx] || "";
      const isCorrect = studentAnswer === q.correctAnswer;
      return {
        questionText: q.questionText,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        studentAnswer,
        isCorrect,
        explanation: "",
        difficulty: q.difficulty || null,
        derivedFromConcept: q.derivedFromConcept || null
      };
    });

    try {
      const token = await auth.currentUser.getIdToken();
      const payload = {
        courseId: selectedCourseObj.courseId,
        totalQuestions: aiQuestions.length,
        questionsSnapshot
      };

      const response = await fetch(`${API_URL}/api/student/quizzes/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const responseData = await response.json();
      
      // Override local unstructured aiQuestions with the definitively graded snapshot
      if (responseData.attempt && responseData.attempt.questionsSnapshot) {
          setAiQuestions(sortQuestionsByType(responseData.attempt.questionsSnapshot));
      }
      
      setAiSubmitted(true);
      
      // Scroll to top of the dashboard content area to show results
      setTimeout(() => {
        const scrollContainer = document.querySelector('.dash-main');
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    } catch (err) {
      console.error("Failed to submit exam:", err);
    } finally {
      setAiLoading(false);
      setAiStatusMessage("");
    }
  };

  const handleReportQuestion = (questionIdx) => {
    setReportedQuestions((prev) => ({ ...prev, [questionIdx]: true }));
  };

  const handleResetAiExam = () => {
    setAiQuestions([]);
    setAiUserAnswers({});
    setAiSubmitted(false);
    setAiError(null);
    setAiStatusMessage("");
    setReportedQuestions({});
  };

  const getAiOptionClass = (question, option, questionIdx) => {
    const selected = aiUserAnswers[questionIdx];
    if (!aiSubmitted) {
      return selected === option ? "qb-option-selected" : "";
    }
    if (option === question.correctAnswer) return "qb-option-correct";
    if (selected === option && selected !== question.correctAnswer) {
      return "qb-option-wrong";
    }
    return "";
  };

  // ── Archive Interaction Handlers ──
  const handleArchiveSelectAnswer = (key, option, correctAnswer) => {
    if (archiveAnswers[key] !== undefined) return; // Already answered
    setArchiveAnswers((prev) => ({ ...prev, [key]: option }));
  };

  const handleArchiveReveal = (key) => {
    setArchiveRevealed((prev) => ({ ...prev, [key]: true }));
  };

  const getArchiveOptionClass = (key, option, correctAnswer) => {
    const selected = archiveAnswers[key];
    const revealed = archiveRevealed[key];
    if (selected === undefined && !revealed) return "";
    // After answer or reveal, show correct/wrong
    if (option === correctAnswer) return "qb-option-correct";
    if (selected === option && selected !== correctAnswer) return "qb-option-wrong";
    return "";
  };

  const isArchiveQuestionResolved = (key) => {
    return archiveAnswers[key] !== undefined || archiveRevealed[key];
  };

  const aiScore = aiSubmitted
    ? aiQuestions.reduce((acc, q, idx) => {
        // If the backend graded snapshot contains an explicit isCorrect tag (essays), prefer it
        if (q.hasOwnProperty("isCorrect")) {
           return q.isCorrect ? acc + 1 : acc;
        }
        const ans = aiUserAnswers[idx] || "";
        const correctAns = q.correctAnswer || "";
        return ans.trim().toLowerCase() === correctAns.trim().toLowerCase() ? acc + 1 : acc;
      }, 0)
    : 0;

  const aiScorePercent =
    aiSubmitted && aiQuestions.length > 0
      ? Math.round((aiScore / aiQuestions.length) * 100)
      : 0;

  // ── Per-type breakdown (MCQ vs T/F vs Essay) ──
  const mcqQuestions = aiSubmitted ? aiQuestions.filter(q => getQuestionType(q) === "mcq") : [];
  const tfQuestions  = aiSubmitted ? aiQuestions.filter(q => getQuestionType(q) === "tf")  : [];
  const essayQuestions = aiSubmitted ? aiQuestions.filter(q => getQuestionType(q) === "essay") : [];

  const mcqCorrect = mcqQuestions.reduce((acc, q) => {
    const idx = aiQuestions.indexOf(q);
    const ans = aiUserAnswers[idx] || "";
    const correctAns = q.correctAnswer || "";
    return ans.trim().toLowerCase() === correctAns.trim().toLowerCase() ? acc + 1 : acc;
  }, 0);

  const tfCorrect = tfQuestions.reduce((acc, q) => {
    const idx = aiQuestions.indexOf(q);
    const ans = aiUserAnswers[idx] || "";
    const correctAns = q.correctAnswer || "";
    return ans.trim().toLowerCase() === correctAns.trim().toLowerCase() ? acc + 1 : acc;
  }, 0);

  const essayCorrect = essayQuestions.reduce((acc, q) => {
    const idx = aiQuestions.indexOf(q);
    const ans = aiUserAnswers[idx] || "";
    return ans.trim().length > 0 ? acc + 1 : acc;
  }, 0);

  const mcqPercent = mcqQuestions.length > 0 ? Math.round((mcqCorrect / mcqQuestions.length) * 100) : 0;
  const tfPercent  = tfQuestions.length  > 0 ? Math.round((tfCorrect  / tfQuestions.length)  * 100) : 0;
  const essayPercent = essayQuestions.length > 0 ? Math.round((essayCorrect / essayQuestions.length) * 100) : 0;

  const getBreakdownFeedback = (percent, type) => {
    if (percent >= 90) return type === "mcq" ? "Outstanding concept mastery." : type === "tf" ? "Excellent true/false judgment." : "Great analytical writing.";
    if (percent >= 70) return type === "mcq" ? "Solid understanding of concepts." : type === "tf" ? "Good grasp of core facts." : "Good expression of ideas.";
    if (percent >= 50) return type === "mcq" ? "Review key topics to strengthen MCQ skills." : type === "tf" ? "Revisit fundamentals for T/F accuracy." : "Work on expanding your arguments.";
    return type === "mcq" ? "Focus on understanding core concepts." : type === "tf" ? "Review your T/F basics." : "Practice writing more detailed answers.";
  };

  // ── Build select options ──
  const courseOptions = courses.map((c) => ({
    value: c.courseId,
    label: `${c.courseCode} – ${c.courseName}`,
    icon: <GraduationCapIcon size={16} />,
  }));

  // ── Helper: get option label letter ──
  const getOptionLabel = (question, optIdx) => {
    if (question.type === "tf") {
      return question.options[optIdx] === "True" ? "T" : "F";
    }
    return String.fromCharCode(65 + optIdx);
  };

  // ══════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════
  return (
    <div className="dash-home qb-quiz-wrap">
      {/* ── Main Tab Navigation ── */}
      <div className="nse-tab-bar">
        <button
          type="button"
          className={`nse-tab-btn ${activeMainTab === "generate" ? "active" : ""}`}
          onClick={() => setActiveMainTab("generate")}
        >
          <span className="nse-tab-icon">{<GenerateIcon size={16} />}</span>
          Generate AI Exam
        </button>
        <button
          type="button"
          className={`nse-tab-btn ${activeMainTab === "history" ? "active" : ""}`}
          onClick={() => setActiveMainTab("history")}
        >
          <span className="nse-tab-icon">🏆</span>
          My Quizzes
        </button>
        <button
          type="button"
          className={`nse-tab-btn ${activeMainTab === "archive" ? "active" : ""}`}
          onClick={() => setActiveMainTab("archive")}
        >
          <span className="nse-tab-icon">{<ArchiveIcon size={16} />}</span>
          Past Exams Archive
        </button>
      </div>

      {/* ══════════════════════════════════════════
          TAB 1: GENERATE AI EXAM
      ══════════════════════════════════════════ */}
      {activeMainTab === "generate" && (
        <div className="nse-generate-tab">
          {!aiLoading && aiQuestions.length === 0 && !aiError && (
            <div className="nse-config-section">
              <div className="nse-config-header">
                <div className="nse-config-icon">{<BrainIcon size={24} />}</div>
                <div>
                  <h2 className="nse-config-title">Nazamly Smart Exams</h2>
                  <p className="nse-config-subtitle">
                    Configure your exam parameters. Our AI will generate custom questions
                    based strictly on your professor's historical exams and the lecture content.
                  </p>
                </div>
              </div>

              <div className="nse-config-form">
                {/* ── Step 1: Course Selection (Custom Select) ── */}
                <div className="nse-form-group">
                  <label className="qb-filter-label">
                    <span className="nse-step-num">1</span>
                    Select Target Course
                  </label>
                  <NseCustomSelect
                    value={selectedCourseObj ? selectedCourseObj.courseId : ""}
                    onChange={(val) => handleCourseChange(val)}
                    options={courseOptions}
                    placeholder="Choose a course..."
                    disabled={coursesLoading}
                    icon={<GraduationCapIcon size={16} />}
                  />
                  {!coursesLoading && courses.length === 0 && !coursesError && (
                    <div className="nse-empty-courses">
                      <GraduationCapIcon size={32} />
                      <p>You haven't registered for any courses yet.</p>
                      <span>Complete your profile to access question banks for your enrolled courses.</span>
                    </div>
                  )}
                  {coursesError && (
                    <p style={{ color: '#ff6b6b', padding: '10px', marginTop: '8px' }}>{coursesError}</p>
                  )}
                </div>

                {/* ── Step 2: Lecture Selection ── */}
                {selectedCourseObj && (
                  <div className="nse-form-group">
                    <label className="qb-filter-label">
                      <span className="nse-step-num">2</span>
                      Select Source Material
                      {loadingLectures && <span className="nse-count-badge" style={{marginLeft: '10px'}}>Loading...</span>}
                      {!loadingLectures && <span className="nse-count-badge" style={{marginLeft: '10px'}}>{selectedLectures.length} selected</span>}
                    </label>
                    <div className="nse-lecture-grid nse-styled-scrollbar">
                      {!loadingLectures && lectures.length === 0 && (
                        <p style={{ color: 'var(--text-secondary)', padding: '10px' }}>No lectures found for this course.</p>
                      )}

                      {!loadingLectures && lectures.map((lec) => (
                        <label
                          key={lec.id}
                          className={`nse-lecture-card ${selectedLectures.includes(lec.id) ? "selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="nse-checkbox-hidden"
                            checked={selectedLectures.includes(lec.id)}
                            onChange={() => toggleLecture(lec.id)}
                          />
                          <span className="nse-lecture-check">
                            {selectedLectures.includes(lec.id) ? <CheckIcon size={14} /> : ""}
                          </span>
                          <span className="nse-lecture-name">{lec.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 3: Exam Parameters ── */}
                {selectedLectures.length > 0 && (
                  <>
                    <div className="nse-form-group">
                      <label className="qb-filter-label">
                        <span className="nse-step-num">3</span>
                        Challenge Mode
                      </label>
                      <div className="nse-type-pills">
                        {["Quiz", "Midterm", "Final"].map((t) => {
                          const cfg = EXAM_CONFIG[t];
                          return (
                            <button
                              key={t}
                              type="button"
                              className={`nse-type-pill ${examType === t ? "active" : ""}`}
                              onClick={() => setExamType(t)}
                            >
                              <span className="nse-pill-icon">
                                {t === "Quiz" ? <QuizIcon size={16} /> : t === "Midterm" ? <MidtermIcon size={16} /> : <FinalIcon size={16} />}
                              </span>
                              <span className="nse-pill-label">{t}</span>
                              <span className="nse-pill-meta">
                                {cfg.total}Q · {cfg.mcq} MCQ + {cfg.tf} T/F
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>



                    {/* ── Exam Info Summary ── */}
                    <div className="nse-exam-info-badge">
                      <div className="nse-info-item">
                        <span className="nse-info-icon">{<BarChartIcon size={16} />}</span>
                        <span>{currentConfig.total} Questions Total</span>
                      </div>
                      <div className="nse-info-divider" />
                      <div className="nse-info-item">
                        <span className="nse-info-icon">{<TypeIcon size={16} />}</span>
                        <span>{currentConfig.mcq} MCQ</span>
                      </div>
                      <div className="nse-info-divider" />
                      <div className="nse-info-item">
                        <span className="nse-info-icon">{<CheckCircleIcon size={16} />}</span>
                        <span>{currentConfig.tf} True/False</span>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <button
                      type="button"
                      className="gen-tab-btn active qb-generate-ai-btn nse-generate-btn"
                      onClick={handleGenerateAiExam}
                      disabled={selectedLectures.length === 0 || !selectedCourseObj}
                      style={{ marginTop: '20px' }}
                    >
                      {<SparklesIcon size={16} />} Generate My Exam
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── View B: Loading / Generating ── */}
          {aiLoading && (
            <div className="nse-loading-section">
              <div className="nse-pulse-wrapper">
                <div className="nse-pulse-ring" />
                <div className="nse-pulse-ring nse-pulse-delay-1" />
                <div className="nse-pulse-ring nse-pulse-delay-2" />
                <div className="nse-pulse-core">{<BrainIcon size={28} />}</div>
              </div>
              <h3 className="nse-loading-title">Generating Your Exam</h3>
              <p className="nse-loading-message">{aiStatusMessage}</p>
              <div className="nse-loading-dots">
                <span className="nse-dot" />
                <span className="nse-dot nse-dot-2" />
                <span className="nse-dot nse-dot-3" />
              </div>
            </div>
          )}

          {/* ── Error State ── */}
          {aiError && !aiLoading && aiQuestions.length === 0 && (
            <div className="qb-error-card-modern">
              <div className="qb-error-icon-glow">
                <WarningIcon size={42} />
              </div>
              <h3 className="qb-error-head">AI Assistant is Taking a Short Break</h3>
              <p className="qb-error-body">
                We're having trouble connecting to our AI service right now. This is usually
                <br />a temporary issue that resolves quickly.
              </p>
              
              <div className="qb-error-btn-group">
                <button
                  type="button"
                  className="qb-error-btn-primary"
                  onClick={handleResetAiExam}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6"></path>
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  </svg>
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  className="qb-error-btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </button>
              </div>

              <p className="qb-error-footer">
                If this issue persists, please contact support or try again later.
              </p>
            </div>
          )}

          {/* ── View C: Exam Engine (AI-generated questions) ── */}
          {aiQuestions.length > 0 && (
            <div className="nse-exam-engine">
              {aiSubmitted && (
                <div className="tool-card qb-score-card nse-result-card">
                  <div className="nse-result-header">
                    <div className="nse-result-emoji">
                      {aiScorePercent >= 85 ? <TrophyIcon size={28} /> : aiScorePercent >= 60 ? <ThumbsUpIcon size={28} /> : <TrendingUpIcon size={28} />}
                    </div>
                    <div>
                      <h3>Result Summary</h3>
                      <p className="nse-result-sub" style={{opacity: 0.8}}>
                        {examType} • {aiQuestions.length} Questions
                      </p>
                    </div>
                  </div>
                  <div className="nse-score-row" style={{display: 'flex', alignItems: 'center', marginTop: '20px', gap: '20px'}}>
                    <div className="nse-score-circle">
                      <span className="nse-score-value" style={{fontSize: '24px', fontWeight: 'bold'}}>{aiScorePercent}%</span>
                    </div>
                    <div className="nse-score-details">
                      <p>
                        Correct: <strong>{aiScore}</strong> / {aiQuestions.length}
                      </p>
                      <p className="nse-score-msg" style={{color: 'var(--text-secondary)', marginTop: '8px'}}>
                        {aiScorePercent >= 85
                          ? "Excellent work. Keep this momentum going."
                          : aiScorePercent >= 60
                            ? "Good progress. Review explanations to level up."
                            : "Solid attempt. Focus on concepts and try again."}
                      </p>
                    </div>
                  </div>

                  {/* ── Performance Breakdown ── */}
                  <div className="nse-breakdown-section">
                    <h4 className="nse-breakdown-title">
                      {<BarChartIcon size={16} />} Performance Breakdown
                    </h4>
                    <div className="nse-breakdown-bars">
                      {/* MCQ Bar */}
                      {mcqQuestions.length > 0 && (
                        <div className="nse-breakdown-item">
                          <div className="nse-breakdown-header">
                            <span className="nse-breakdown-label">
                              <span className="nse-qtype-badge nse-qtype-mcq" style={{fontSize: '0.62rem', padding: '2px 8px'}}>MCQ</span>
                              <span className="nse-breakdown-count">{mcqCorrect}/{mcqQuestions.length} Correct</span>
                            </span>
                            <span className="nse-breakdown-percent">{mcqPercent}%</span>
                          </div>
                          <div className="nse-breakdown-track">
                            <div
                              className={`nse-breakdown-fill nse-breakdown-fill-mcq ${mcqPercent === 100 ? 'complete' : ''}`}
                              style={{ width: `${mcqPercent}%` }}
                            />
                          </div>
                          <p className="nse-breakdown-insight">{getBreakdownFeedback(mcqPercent, 'mcq')}</p>
                        </div>
                      )}
                      {/* T/F Bar */}
                      {tfQuestions.length > 0 && (
                        <div className="nse-breakdown-item">
                          <div className="nse-breakdown-header">
                            <span className="nse-breakdown-label">
                              <span className="nse-qtype-badge nse-qtype-tf" style={{fontSize: '0.62rem', padding: '2px 8px'}}>T / F</span>
                              <span className="nse-breakdown-count">{tfCorrect}/{tfQuestions.length} Correct</span>
                            </span>
                            <span className="nse-breakdown-percent">{tfPercent}%</span>
                          </div>
                          <div className="nse-breakdown-track">
                            <div
                              className={`nse-breakdown-fill nse-breakdown-fill-tf ${tfPercent === 100 ? 'complete' : ''}`}
                              style={{ width: `${tfPercent}%` }}
                            />
                          </div>
                          <p className="nse-breakdown-insight">{getBreakdownFeedback(tfPercent, 'tf')}</p>
                        </div>
                      )}
                      {/* Essay Bar */}
                      {essayQuestions.length > 0 && (
                        <div className="nse-breakdown-item">
                          <div className="nse-breakdown-header">
                            <span className="nse-breakdown-label">
                              <span className="nse-qtype-badge nse-qtype-essay" style={{fontSize: '0.62rem', padding: '2px 8px'}}>Essay</span>
                              <span className="nse-breakdown-count">{essayCorrect}/{essayQuestions.length} Completed</span>
                            </span>
                            <span className="nse-breakdown-percent">{essayPercent}%</span>
                          </div>
                          <div className="nse-breakdown-track">
                            <div
                              className={`nse-breakdown-fill nse-breakdown-fill-essay ${essayPercent === 100 ? 'complete' : ''}`}
                              style={{ width: `${essayPercent}%` }}
                            />
                          </div>
                          <p className="nse-breakdown-insight">{getBreakdownFeedback(essayPercent, 'essay')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="gen-tab-btn active nse-new-exam-btn"
                    onClick={handleResetAiExam}
                    style={{marginTop: '20px'}}
                  >
                    {<SparklesIcon size={16} />} Generate Another Exam
                  </button>
                </div>
              )}

              {/* ── Progress Indicator ── */}
              {!aiSubmitted && (
                <div className="nse-progress-bar-wrap">
                  <div className="nse-progress-header">
                    <span className="nse-progress-label">
                      {answeredCount === totalQuestions
                        ? <>{<CheckCircleIcon size={14} />} All questions answered — ready to submit!</>
                        : `${answeredCount}/${totalQuestions} Answered`}
                    </span>
                    <span className="nse-progress-percent">{progressPercent}%</span>
                  </div>
                  <div className="nse-progress-track">
                    <div
                      className={`nse-progress-fill ${allAnswered ? "complete" : ""}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {!allAnswered && (
                    <p className="nse-progress-hint">{<WarningIcon size={14} />} You must answer all questions before submitting.</p>
                  )}
                </div>
              )}

              <div className="qb-questions-list nse-questions-spaced">
                {aiQuestions.map((q, idx) => {
                  const isTF = q.type === "tf";
                  const isUnanswered = !aiSubmitted && aiUserAnswers[idx] === undefined;

                  return (
                    <article
                      key={q._id || idx}
                      className={`tool-card qb-question-card nse-ai-card ${isUnanswered ? "nse-unanswered" : ""}`}
                    >
                      <div className="qb-badges-corner">
                        <span className={`qb-difficulty ${getDifficultyClass(q.difficulty)}`}>
                          {getDifficultyLabel(q.difficulty)}
                        </span>
                        {q.aiConfidenceScore != null && (
                          <span className="qb-chip nse-confidence-chip">
                            {q.aiConfidenceScore}% conf.
                          </span>
                        )}
                        <span className={`nse-qtype-badge ${isTF ? "nse-qtype-tf" : "nse-qtype-mcq"}`}>
                          {isTF ? "True / False" : "MCQ"}
                        </span>
                      </div>

                      <span className="qb-topic">
                        Q{idx + 1}
                        {q.derivedFromConcept ? ` • ${q.derivedFromConcept}` : ""}
                      </span>

                      <h3 className="qb-question-title">{q.questionText}</h3>

                      {q.options && q.options.length > 0 ? (
                        <div className={`qb-options-grid nse-options-fullwidth ${isTF ? "nse-tf-grid" : ""}`}>
                          {q.options.map((option, optIdx) => (
                            <button
                              key={optIdx}
                              type="button"
                              className={`qb-option-btn nse-option-card ${isTF ? "nse-tf-card" : ""} ${getAiOptionClass(q, option, idx)}`.trim()}
                              onClick={() => handleAiSelectAnswer(idx, option)}
                            >
                              <span className={`nse-option-letter nse-letter-circle ${isTF ? "nse-tf-letter" : ""}`}>
                                {getOptionLabel(q, optIdx)}
                              </span>
                              <span className="qb-option-text">{option}</span>
                              <span className="qb-option-check" aria-hidden="true">{<CheckIcon size={14} />}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div style={{ marginTop: '15px' }}>
                          <textarea
                            className="qb-pill-input"
                            style={{ width: '100%', minHeight: '120px', padding: '15px', color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', resize: 'vertical', fontFamily: 'inherit' }}
                            placeholder="Type your answer here..."
                            value={aiUserAnswers[idx] || ""}
                            onChange={(e) => handleAiSelectAnswer(idx, e.target.value)}
                            disabled={aiSubmitted}
                          />
                        </div>
                      )}

                      {aiSubmitted && (
                        <div className="nse-explanation-box" style={{marginTop: '18px'}}>
                          <div className="nse-explanation-header">
                            <span className="nse-explanation-icon">{<LightbulbIcon size={18} />}</span>
                            <strong>Explanation</strong>
                          </div>
                          {q.options && q.options.length > 0 ? (
                            <>
                              {q.explanation && (
                                <p className="nse-explanation-text">{q.explanation}</p>
                              )}
                              <div className="nse-explanation-answer">
                                <span>Correct Answer:</span> <strong>{q.correctAnswer}</strong>
                              </div>
                            </>
                          ) : (
                            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: `4px solid ${q.isCorrect ? 'var(--success)' : 'var(--error)'}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '18px', marginRight: '8px' }}>{q.isCorrect ? '✅' : '❌'}</span>
                                <strong style={{ color: q.isCorrect ? 'var(--success)' : 'var(--error)' }}>AI Feedback</strong>
                              </div>
                              <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                                {q.explanation || (q.isCorrect ? "Correct answer." : "Incorrect. Core concepts were missing.")}
                              </p>
                              {q.correctAnswer && (
                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
                                  <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Required Concepts:</strong>
                                  <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{q.correctAnswer}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        className={`nse-report-btn ${reportedQuestions[idx] ? "reported" : ""}`}
                        onClick={() => handleReportQuestion(idx)}
                        disabled={reportedQuestions[idx]}
                        style={{marginTop: '15px'}}
                      >
                        {reportedQuestions[idx] ? <>{<CheckIcon size={14} />} Reported</> : <>{<ReportIcon size={14} />} Report Issue</>}
                      </button>
                    </article>
                  );
                })}
              </div>

              {!aiSubmitted && (
                <div className="qb-submit-wrap">
                  <button
                    type="button"
                    className={`nse-submit-btn ${!allAnswered ? "nse-submit-disabled" : ""}`}
                    onClick={handleAiSubmitExam}
                    disabled={!allAnswered}
                    title={!allAnswered ? `Answer all ${totalQuestions} questions to submit` : "Submit your exam"}
                  >
                    {allAnswered
                      ? <><CheckCircleIcon size={18} /> Submit Exam</>
                      : <><WarningIcon size={18} /> Answer All Questions ({answeredCount}/{totalQuestions})</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB 2: PAST EXAMS ARCHIVE (Study Guide)
      ══════════════════════════════════════════ */}
      {activeMainTab === "archive" && (
        <div className="nse-archive-tab nse-archive-theme">
          <div className="nse-config-section">
            <div className="nse-config-header">
              <div className="nse-config-icon nse-archive-icon">{<ArchiveIcon size={24} />}</div>
              <div>
                <h2 className="nse-config-title nse-archive-title">Study Guide — Past Exams</h2>
                <p className="nse-config-subtitle">
                  Review historical exam questions with detailed explanations.
                  Click an option to test yourself, or use the reveal button to show the answer.
                </p>
              </div>
            </div>

            <div className="nse-config-form">
              {/* ── Step 1: Course Selection (Custom Select) ── */}
              <div className="nse-form-group">
                <label className="qb-filter-label">
                  <span className="nse-step-num nse-step-archive">1</span>
                  Select Target Course
                </label>
                <NseCustomSelect
                  value={selectedCourseObj ? selectedCourseObj.courseId : ""}
                  onChange={(val) => handleCourseChange(val)}
                  options={courseOptions}
                  placeholder="Choose a course..."
                  disabled={coursesLoading}
                  icon={<GraduationCapIcon size={16} />}
                />
                {!coursesLoading && courses.length === 0 && !coursesError && (
                  <p style={{ color: 'var(--text-secondary)', padding: '10px', marginTop: '8px' }}>No courses available yet.</p>
                )}
                {coursesError && (
                  <p style={{ color: '#ff6b6b', padding: '10px', marginTop: '8px' }}>{coursesError}</p>
                )}
              </div>

              {/* ── Step 2: Lecture Selection ── */}
              {selectedCourseObj && (
                <div className="nse-form-group">
                  <label className="qb-filter-label">
                    <span className="nse-step-num nse-step-archive">2</span>
                    Select Source Material
                    {loadingLectures && <span className="nse-count-badge" style={{marginLeft: '10px'}}>Loading...</span>}
                    {!loadingLectures && <span className="nse-count-badge" style={{marginLeft: '10px'}}>{selectedLectures.length} selected</span>}
                  </label>
                  <div className="nse-lecture-grid nse-styled-scrollbar">
                    {!loadingLectures && lectures.length === 0 && (
                      <p style={{ color: 'var(--text-secondary)', padding: '10px' }}>No lectures found for this course.</p>
                    )}

                    {!loadingLectures && lectures.map((lec) => (
                      <label
                        key={lec.id}
                        className={`nse-lecture-card ${selectedLectures.includes(lec.id) ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="nse-checkbox-hidden"
                          checked={selectedLectures.includes(lec.id)}
                          onChange={() => toggleLecture(lec.id)}
                        />
                        <span className="nse-lecture-check">
                          {selectedLectures.includes(lec.id) ? "✓" : ""}
                        </span>
                        <span className="nse-lecture-name">{lec.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Button */}
              {selectedLectures.length > 0 && (
                <button
                  type="button"
                  className="gen-tab-btn active qb-generate-ai-btn nse-generate-btn nse-archive-search-btn"
                  onClick={handleFetchArchive}
                  disabled={selectedLectures.length === 0 || !selectedCourseObj || archiveLoading}
                  style={{ marginTop: '20px' }}
                >
                  {archiveLoading ? "Searching..." : <>{<SearchIcon size={16} />} Search Archive</>}
                </button>
              )}
            </div>
          </div>

          {archiveError && (
             <div className="tool-card nse-error-card" style={{ marginTop: '30px', textAlign: 'center' }}>
               <div className="nse-error-icon">{<WarningIcon size={28} />}</div>
               <h3 style={{ margin: '15px 0' }}>Search Failed</h3>
               <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>{archiveError}</p>
             </div>
          )}

          {hasSearchedArchive && !archiveLoading && !archiveError && (
            <div className="nse-archive-results" style={{ marginTop: '30px' }}>
              {archiveMidterms.length === 0 && archiveFinals.length === 0 ? (
                <div className="tool-card" style={{padding: '40px', textAlign: 'center'}}>
                  <div style={{marginBottom: '15px', color: 'var(--accent-color)'}}>{<LeafIcon size={40} />}</div>
                  <h3>No Archives Found</h3>
                  <p style={{color: 'var(--text-secondary)', marginTop: '10px'}}>
                    No past exam questions found for this selection.
                  </p>
                </div>
              ) : (
                <>
                  {/* ── Midterm Section ── */}
                  {archiveMidterms.length > 0 && (() => {
                    const years = [...new Set(archiveMidterms.map(q => q.year))].sort((a, b) => b - a);
                    return (
                      <div className="nse-archive-section" style={{ marginBottom: '40px' }}>
                        <div className="nse-archive-section-header">
                          <span className="nse-archive-section-icon">{<MidtermIcon size={20} />}</span>
                          <h3 className="nse-archive-section-title">Midterm Questions</h3>
                          <span className="nse-archive-section-count">{archiveMidterms.length} questions</span>
                        </div>

                        {years.map(year => {
                          const yearQuestions = archiveMidterms.filter(q => q.year === year);
                          return (
                            <div key={`mid-${year}`} className="nse-year-group">
                              <div className="nse-year-header">
                                <span className="nse-year-badge">{year}</span>
                                <span className="nse-year-line" />
                                <span className="nse-year-count">{yearQuestions.length} Q</span>
                              </div>

                              <div className="qb-questions-list nse-questions-spaced">
                                {yearQuestions.map((q, idx) => {
                                  const globalIdx = archiveMidterms.indexOf(q);
                                  const key = `mid-${globalIdx}`;
                                  const isTF = q.type === "tf";
                                  const resolved = isArchiveQuestionResolved(key);

                                  return (
                                    <article key={q._id || key} className={`tool-card qb-question-card nse-archive-card-theme ${resolved ? "nse-archive-resolved" : ""}`}>
                                      <div className="qb-badges-corner">
                                        <span className={`nse-qtype-badge ${isTF ? "nse-qtype-tf" : "nse-qtype-mcq"}`}>
                                          {isTF ? "True / False" : "MCQ"}
                                        </span>
                                        {q.difficulty && (
                                          <span className={`qb-difficulty ${getDifficultyClass(q.difficulty)}`}>
                                            {getDifficultyLabel(q.difficulty)}
                                          </span>
                                        )}
                                      </div>

                                      <span className="qb-topic">Midterm Q{globalIdx + 1} • {year}</span>
                                      <h3 className="qb-question-title">{q.questionText}</h3>

                                      {q.options && q.options.length > 0 && (
                                        <div className={`qb-options-grid nse-options-fullwidth ${isTF ? "nse-tf-grid" : ""}`}>
                                          {q.options.map((option, optIdx) => (
                                            <button
                                              key={optIdx}
                                              type="button"
                                              className={`qb-option-btn nse-option-card ${isTF ? "nse-tf-card" : ""} ${getArchiveOptionClass(key, option, q.correctAnswer)}`.trim()}
                                              onClick={() => handleArchiveSelectAnswer(key, option, q.correctAnswer)}
                                              disabled={resolved}
                                            >
                                              <span className={`nse-option-letter nse-letter-circle ${isTF ? "nse-tf-letter" : ""}`}>
                                                {isTF ? (option === "True" ? "T" : "F") : String.fromCharCode(65 + optIdx)}
                                              </span>
                                              <span className="qb-option-text">{option}</span>
                                              {resolved && option === q.correctAnswer && (
                                                <span className="qb-option-check" aria-hidden="true" style={{opacity: 1}}>{<CheckIcon size={14} />}</span>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      )}

                                      {/* ── Study Mode: Show Answer Button ── */}
                                      {!resolved && (
                                        <button
                                          type="button"
                                          className="nse-reveal-btn"
                                          onClick={() => handleArchiveReveal(key)}
                                        >
                                          {<EyeIcon size={16} />} Show Answer & Explanation
                                        </button>
                                      )}

                                      {/* ── Explanation Box (fade-in) ── */}
                                      {resolved && q.explanation && (
                                        <div className="nse-explanation-box">
                                          <div className="nse-explanation-header">
                                            <span className="nse-explanation-icon">💡</span>
                                            <strong>Explanation</strong>
                                          </div>
                                          <p className="nse-explanation-text">{q.explanation}</p>
                                          <div className="nse-explanation-answer">
                                            <span>Correct Answer:</span> <strong>{q.correctAnswer}</strong>
                                          </div>
                                        </div>
                                      )}
                                    </article>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* ── Finals Section ── */}
                  {archiveFinals.length > 0 && (() => {
                    const years = [...new Set(archiveFinals.map(q => q.year))].sort((a, b) => b - a);
                    return (
                      <div className="nse-archive-section">
                        <div className="nse-archive-section-header">
                          <span className="nse-archive-section-icon">{<FinalIcon size={20} />}</span>
                          <h3 className="nse-archive-section-title">Final Exam Questions</h3>
                          <span className="nse-archive-section-count">{archiveFinals.length} questions</span>
                        </div>

                        {years.map(year => {
                          const yearQuestions = archiveFinals.filter(q => q.year === year);
                          return (
                            <div key={`fin-${year}`} className="nse-year-group">
                              <div className="nse-year-header">
                                <span className="nse-year-badge">{year}</span>
                                <span className="nse-year-line" />
                                <span className="nse-year-count">{yearQuestions.length} Q</span>
                              </div>

                              <div className="qb-questions-list nse-questions-spaced">
                                {yearQuestions.map((q, idx) => {
                                  const globalIdx = archiveFinals.indexOf(q);
                                  const key = `fin-${globalIdx}`;
                                  const isTF = q.type === "tf";
                                  const resolved = isArchiveQuestionResolved(key);

                                  return (
                                    <article key={q._id || key} className={`tool-card qb-question-card nse-archive-card-theme ${resolved ? "nse-archive-resolved" : ""}`}>
                                      <div className="qb-badges-corner">
                                        <span className={`nse-qtype-badge ${isTF ? "nse-qtype-tf" : "nse-qtype-mcq"}`}>
                                          {isTF ? "True / False" : "MCQ"}
                                        </span>
                                        {q.difficulty && (
                                          <span className={`qb-difficulty ${getDifficultyClass(q.difficulty)}`}>
                                            {getDifficultyLabel(q.difficulty)}
                                          </span>
                                        )}
                                      </div>

                                      <span className="qb-topic">Final Q{globalIdx + 1} • {year}</span>
                                      <h3 className="qb-question-title">{q.questionText}</h3>

                                      {q.options && q.options.length > 0 && (
                                        <div className={`qb-options-grid nse-options-fullwidth ${isTF ? "nse-tf-grid" : ""}`}>
                                          {q.options.map((option, optIdx) => (
                                            <button
                                              key={optIdx}
                                              type="button"
                                              className={`qb-option-btn nse-option-card ${isTF ? "nse-tf-card" : ""} ${getArchiveOptionClass(key, option, q.correctAnswer)}`.trim()}
                                              onClick={() => handleArchiveSelectAnswer(key, option, q.correctAnswer)}
                                              disabled={resolved}
                                            >
                                              <span className={`nse-option-letter nse-letter-circle ${isTF ? "nse-tf-letter" : ""}`}>
                                                {isTF ? (option === "True" ? "T" : "F") : String.fromCharCode(65 + optIdx)}
                                              </span>
                                              <span className="qb-option-text">{option}</span>
                                              {resolved && option === q.correctAnswer && (
                                                <span className="qb-option-check" aria-hidden="true" style={{opacity: 1}}>{<CheckIcon size={14} />}</span>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      )}

                                      {/* ── Study Mode: Show Answer Button ── */}
                                      {!resolved && (
                                        <button
                                          type="button"
                                          className="nse-reveal-btn"
                                          onClick={() => handleArchiveReveal(key)}
                                        >
                                          {<EyeIcon size={16} />} Show Answer & Explanation
                                        </button>
                                      )}

                                      {/* ── Explanation Box (fade-in) ── */}
                                      {resolved && q.explanation && (
                                        <div className="nse-explanation-box">
                                          <div className="nse-explanation-header">
                                            <span className="nse-explanation-icon">{<LightbulbIcon size={18} />}</span>
                                            <strong>Explanation</strong>
                                          </div>
                                          <p className="nse-explanation-text">{q.explanation}</p>
                                          <div className="nse-explanation-answer">
                                            <span>Correct Answer:</span> <strong>{q.correctAnswer}</strong>
                                          </div>
                                        </div>
                                      )}
                                    </article>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB 3: MY QUIZZES (HISTORY)
      ══════════════════════════════════════════ */}
      {activeMainTab === "history" && !selectedHistoryQuiz && (
        <div className="nse-history-tab">
          <div className="nse-config-section">
            <div className="nse-config-header">
              <div className="nse-config-icon">🏆</div>
              <div>
                <h2 className="nse-config-title">My Quizzes</h2>
                <p className="nse-config-subtitle">Review your past AI-generated quizzes and track your progress.</p>
              </div>
            </div>

            {historyLoading ? (
              <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>Loading history...</p>
            ) : historyError ? (
              <div className="tool-card nse-error-card" style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ color: 'var(--error)' }}>{historyError}</p>
              </div>
            ) : quizHistory.length === 0 ? (
              <div className="tool-card" style={{ padding: '40px', textAlign: 'center', marginTop: '20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '15px' }}>🌟</div>
                <h3>No Quizzes Taken Yet</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                  Generate and complete an AI quiz to see it here!
                </p>
              </div>
            ) : (
              <div className="qb-questions-list" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {quizHistory.map(attempt => (
                  <div key={attempt._id} className="tool-card qb-question-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => setSelectedHistoryQuiz(attempt)} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <span className="qb-chip nse-confidence-chip" style={{ background: 'var(--blue-glow)', color: 'var(--blue-700)' }}>
                        {new Date(attempt.createdAt).toLocaleDateString()}
                      </span>
                      <span style={{ fontWeight: 'bold' }}>
                        Score: {attempt.score}/{attempt.totalQuestions}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>
                      {attempt.courseId?.courseName || 'Unknown Course'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                      {attempt.courseId?.courseCode || ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUIZ REVIEW MODAL/VIEW */}
      {selectedHistoryQuiz && activeMainTab === "history" && (
        <div className="nse-history-review">
          <button 
            className="gen-tab-btn" 
            onClick={() => setSelectedHistoryQuiz(null)}
            style={{ marginBottom: '20px' }}
          >
            ← Back to Quizzes
          </button>
          
          <div className="tool-card qb-score-card nse-result-card" style={{ marginBottom: '30px' }}>
            <div className="nse-result-header">
              <div className="nse-result-emoji">
                {Math.round((selectedHistoryQuiz.score / selectedHistoryQuiz.totalQuestions) * 100) >= 85 ? "🏆" : "💪"}
              </div>
              <div>
                <h3>{selectedHistoryQuiz.courseId?.courseName || 'Review Quiz'}</h3>
                <p className="nse-result-sub" style={{ opacity: 0.8 }}>
                  {new Date(selectedHistoryQuiz.createdAt).toLocaleString()} • {selectedHistoryQuiz.totalQuestions} Questions
                </p>
              </div>
            </div>
            <div className="nse-score-row" style={{ display: 'flex', alignItems: 'center', marginTop: '20px', gap: '20px' }}>
              <div className="nse-score-circle">
                <span className="nse-score-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {Math.round((selectedHistoryQuiz.score / selectedHistoryQuiz.totalQuestions) * 100)}%
                </span>
              </div>
              <div className="nse-score-details">
                <p>Correct: <strong>{selectedHistoryQuiz.score}</strong> / {selectedHistoryQuiz.totalQuestions}</p>
              </div>
            </div>
          </div>

          <div className="qb-questions-list">
             {selectedHistoryQuiz.questionsSnapshot.map((q, idx) => (
               <article key={q._id || idx} className="tool-card qb-question-card">
                 <span className="qb-topic">Q{idx + 1} {q.derivedFromConcept ? `• ${q.derivedFromConcept}` : ''}</span>
                 <h3 className="qb-question-title">{q.questionText}</h3>
                 
                 {q.options && q.options.length > 0 ? (
                   <div className="qb-options-grid">
                     {q.options.map((option, optIdx) => {
                       let optClass = "";
                       if (option === q.correctAnswer) {
                          optClass = "qb-option-correct";
                       } else if (option === q.studentAnswer && option !== q.correctAnswer) {
                          optClass = "qb-option-wrong";
                       }
                       
                       return (
                         <div
                           key={optIdx}
                           className={`qb-option-btn ${optClass}`}
                           style={{ cursor: 'default' }}
                         >
                           <span className="nse-option-letter">{String.fromCharCode(65 + optIdx)}</span>
                           <span className="qb-option-text">{option}</span>
                           {(option === q.correctAnswer || option === q.studentAnswer) && (
                             <span className="qb-option-check" style={{ opacity: 1 }}>
                               {option === q.correctAnswer ? "✓" : "✗"}
                             </span>
                           )}
                         </div>
                       );
                     })}
                   </div>
                 ) : (
                    <div style={{ marginTop: '15px' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Your Answer:</p>
                      <div className="qb-pill-input" style={{ width: '100%', padding: '15px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'default' }}>
                         {q.studentAnswer || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No answer provided</span>}
                      </div>
                    </div>
                 )}
                 <div className="qb-detail" style={{ marginTop: '15px' }}>
                   <div className="qb-answer-box">
                      {q.options && q.options.length > 0 && (
                        <>
                          <strong>Correct Answer:</strong>
                          <p>{q.correctAnswer}</p>
                        </>
                      )}
                      {(!q.options || q.options.length === 0) && (
                         <div style={{ marginTop: '10px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: `4px solid ${q.isCorrect ? 'var(--success)' : 'var(--error)'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '18px', marginRight: '8px' }}>{q.isCorrect ? '✅' : '❌'}</span>
                                <strong style={{ color: q.isCorrect ? 'var(--success)' : 'var(--error)' }}>AI Feedback</strong>
                            </div>
                            <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                              {q.explanation || "No explanation provided by AI."}
                            </p>
                            {q.correctAnswer && (
                              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
                                <strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Required Concepts:</strong>
                                <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{q.correctAnswer}</p>
                              </div>
                            )}
                         </div>
                      )}
                   </div>
                 </div>
               </article>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Questions;
