import { useState, useEffect, useCallback } from "react";
import { getMyCoursesMaterials, getSubFolderFiles } from "../services/materialsService";
import { API_URL } from "../firebase";

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
  // ── Tab Navigation ──
  const [activeMainTab, setActiveMainTab] = useState("generate"); // "generate" | "archive"

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

  // ── Computed: current exam config ──
  const currentConfig = EXAM_CONFIG[examType] || EXAM_CONFIG.Quiz;
  const answeredCount = Object.keys(aiUserAnswers).length;
  const totalQuestions = aiQuestions.length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // ── Initial Data Fetch ──
  useEffect(() => {
    setCoursesLoading(true);
    setCoursesError(null);
    getMyCoursesMaterials()
      .then((data) => {
        setCourses(data || []);
      })
      .catch((err) => {
        console.error("Failed to load courses:", err);
        setCoursesError(err.message || "Failed to load courses.");
      })
      .finally(() => {
        setCoursesLoading(false);
      });
  }, []);

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
          setAiQuestions(data.questions || []);
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
    if (!selectedCourseObj || selectedLectures.length === 0) return;

    setArchiveLoading(true);
    setArchiveError(null);
    setHasSearchedArchive(true);
    setArchiveMidterms([]);
    setArchiveFinals([]);
    setArchiveAnswers({});
    setArchiveRevealed({});

    try {
      const url = `${API_URL}/api/questions/archive?courseId=${selectedCourseObj.courseId}&lectureId=${selectedLectures.join(",")}`;
      const response = await fetch(url);
      const data = await response.json();

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

  const handleAiSubmitExam = () => {
    setAiSubmitted(true);
    // Scroll to top of the dashboard content area to show results
    setTimeout(() => {
      const scrollContainer = document.querySelector('.dash-main');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
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
        return aiUserAnswers[idx] === q.correctAnswer ? acc + 1 : acc;
      }, 0)
    : 0;

  const aiScorePercent =
    aiSubmitted && aiQuestions.length > 0
      ? Math.round((aiScore / aiQuestions.length) * 100)
      : 0;

  // ── Per-type breakdown (MCQ vs T/F) ──
  const mcqQuestions = aiSubmitted ? aiQuestions.filter(q => q.type === "mcq") : [];
  const tfQuestions  = aiSubmitted ? aiQuestions.filter(q => q.type === "tf")  : [];

  const mcqCorrect = mcqQuestions.reduce((acc, q) => {
    const idx = aiQuestions.indexOf(q);
    return aiUserAnswers[idx] === q.correctAnswer ? acc + 1 : acc;
  }, 0);
  const tfCorrect = tfQuestions.reduce((acc, q) => {
    const idx = aiQuestions.indexOf(q);
    return aiUserAnswers[idx] === q.correctAnswer ? acc + 1 : acc;
  }, 0);

  const mcqPercent = mcqQuestions.length > 0 ? Math.round((mcqCorrect / mcqQuestions.length) * 100) : 0;
  const tfPercent  = tfQuestions.length  > 0 ? Math.round((tfCorrect  / tfQuestions.length)  * 100) : 0;

  const getBreakdownFeedback = (percent, type) => {
    if (percent >= 90) return type === "mcq" ? "Outstanding concept mastery." : "Excellent true/false judgment.";
    if (percent >= 70) return type === "mcq" ? "Solid understanding of concepts." : "Good grasp of core facts.";
    if (percent >= 50) return type === "mcq" ? "Review key topics to strengthen MCQ skills." : "Revisit fundamentals for T/F accuracy.";
    return type === "mcq" ? "Focus on understanding core concepts." : "Review your T/F basics.";
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
            <div className="tool-card nse-error-card" style={{ marginTop: '30px', textAlign: 'center' }}>
              <div className="nse-error-icon">{<WarningIcon size={28} />}</div>
              <h3 style={{ margin: '15px 0' }}>Generation Failed</h3>
              <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>{aiError}</p>
              <button
                type="button"
                className="gen-tab-btn active"
                onClick={handleResetAiExam}
              >
                Configure New Exam
              </button>
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
                      {/* T/F Bar */}
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

                      {q.options && q.options.length > 0 && (
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
                      )}

                      {aiSubmitted && (
                        <div className="nse-explanation-box" style={{marginTop: '18px'}}>
                          <div className="nse-explanation-header">
                            <span className="nse-explanation-icon">{<LightbulbIcon size={18} />}</span>
                            <strong>Explanation</strong>
                          </div>
                          {q.explanation && (
                            <p className="nse-explanation-text">{q.explanation}</p>
                          )}
                          <div className="nse-explanation-answer">
                            <span>Correct Answer:</span> <strong>{q.correctAnswer}</strong>
                          </div>
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
    </div>
  );
}

export default Questions;
