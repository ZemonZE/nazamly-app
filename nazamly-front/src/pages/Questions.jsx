import { useState, useEffect, useCallback } from "react";
import { getMyCoursesMaterials, getSubFolderFiles } from "../services/materialsService";
import { API_URL } from "../firebase";

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
//  MAIN COMPONENT
// ══════════════════════════════════════════════
function Questions() {
  // ── Tab Navigation ──
  const [activeMainTab, setActiveMainTab] = useState("generate"); // "generate" | "archive"

  // ── Step 1: Course Data ──
  const [courses, setCourses] = useState([]);
  const [selectedCourseObj, setSelectedCourseObj] = useState(null); // The full course object
  const [coursesLoading, setCoursesLoading] = useState(true);

  // ── Step 2: Lectures ──
  const [lectures, setLectures] = useState([]);
  const [selectedLectures, setSelectedLectures] = useState([]);
  const [loadingLectures, setLoadingLectures] = useState(false);

  // ── Step 3: Exam Parameters ──
  const [examType, setExamType] = useState("Quiz");
  const [questionCount, setQuestionCount] = useState(5);

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

  // ── Initial Data Fetch ──
  useEffect(() => {
    getMyCoursesMaterials()
      .then((data) => {
        setCourses(data || []);
        setCoursesLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load courses:", err);
        setCoursesLoading(false);
      });
  }, []);

  // ── Handle Course Selection ──
  const handleCourseChange = async (e) => {
    const courseId = e.target.value;
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
      const data = JSON.parse(event.data);
      if (data.status === "generating") {
        setAiStatusMessage(data.message);
      } else if (data.status === "ready") {
        setAiQuestions(data.questions);
        setAiLoading(false);
        setAiStatusMessage("");
        eventSource.close();
      } else if (data.status === "error" || data.success === false) {
        setAiError(data.message);
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
    generateExam(selectedCourseObj.courseId, examType, questionCount, selectedLectures);
  };

  const handleFetchArchive = async () => {
    if (!selectedCourseObj || selectedLectures.length === 0) return;
    
    setArchiveLoading(true);
    setArchiveError(null);
    setHasSearchedArchive(true);
    setArchiveMidterms([]);
    setArchiveFinals([]);

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
      setArchiveError(err.message);
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

  const aiScore = aiSubmitted
    ? aiQuestions.reduce((acc, q, idx) => {
        return aiUserAnswers[idx] === q.correctAnswer ? acc + 1 : acc;
      }, 0)
    : 0;
  
  const aiScorePercent =
    aiSubmitted && aiQuestions.length > 0
      ? Math.round((aiScore / aiQuestions.length) * 100)
      : 0;

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
          <span className="nse-tab-icon">⚡</span>
          Generate AI Exam
        </button>
        <button
          type="button"
          className={`nse-tab-btn ${activeMainTab === "archive" ? "active" : ""}`}
          onClick={() => setActiveMainTab("archive")}
        >
          <span className="nse-tab-icon">📚</span>
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
                <div className="nse-config-icon">🧠</div>
                <div>
                  <h2 className="nse-config-title">Nazamly Smart Exams</h2>
                  <p className="nse-config-subtitle">
                    Configure your exam parameters. Our AI will generate custom questions
                    based strictly on your professor's historical exams and the lecture content.
                  </p>
                </div>
              </div>

              <div className="nse-config-form">
                {/* ── Step 1: Course Selection ── */}
                <div className="nse-form-group">
                  <label className="qb-filter-label">1. Select Target Course</label>
                  <select 
                    className="qb-pill-input nse-select" 
                    value={selectedCourseObj ? selectedCourseObj.courseId : ""} 
                    onChange={handleCourseChange}
                    disabled={coursesLoading}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="">-- Choose a course --</option>
                    {courses.map(c => (
                      <option key={c.courseId} value={c.courseId}>
                        {c.courseCode} - {c.courseName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── Step 2: Lecture Selection ── */}
                {selectedCourseObj && (
                  <div className="nse-form-group">
                    <label className="qb-filter-label">
                      2. Select Source Material
                      {loadingLectures && <span className="nse-count-badge" style={{marginLeft: '10px'}}>Loading...</span>}
                      {!loadingLectures && <span className="nse-count-badge" style={{marginLeft: '10px'}}>{selectedLectures.length} selected</span>}
                    </label>
                    <div className="nse-lecture-grid">
                      {!loadingLectures && lectures.length === 0 && (
                        <p style={{ color: 'var(--text-secondary)', padding: '10px' }}>No lectures found for this course yet.</p>
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

                {/* ── Step 3: Exam Parameters ── */}
                {selectedLectures.length > 0 && (
                  <>
                    <div className="nse-form-group">
                      <label className="qb-filter-label">3. Challenge Mode</label>
                      <div className="nse-type-pills">
                        {["Quiz", "Midterm", "Final"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`nse-type-pill ${examType === t ? "active" : ""}`}
                            onClick={() => setExamType(t)}
                          >
                            <span className="nse-pill-icon">
                              {t === "Quiz" ? "📝" : t === "Midterm" ? "📋" : "🎯"}
                            </span>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="nse-form-group">
                      <label className="qb-filter-label">
                        Number of Questions
                        <span className="nse-count-badge" style={{marginLeft: '10px'}}>{questionCount}</span>
                      </label>
                      <div className="nse-counter-control" style={{marginTop: '10px'}}>
                        <button
                          type="button"
                          className="nse-counter-btn"
                          onClick={() => setQuestionCount((c) => Math.max(1, c - 1))}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          className="qb-pill-input nse-count-input"
                          value={questionCount}
                          min={1}
                          max={50}
                          onChange={(e) =>
                            setQuestionCount(
                              Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)),
                            )
                          }
                        />
                        <button
                          type="button"
                          className="nse-counter-btn"
                          onClick={() => setQuestionCount((c) => Math.min(50, c + 1))}
                        >
                          +
                        </button>
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
                      Generate My Exam ✨
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
                <div className="nse-pulse-core">🧠</div>
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
              <div className="nse-error-icon">⚠️</div>
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
                      {aiScorePercent >= 85 ? "🏆" : aiScorePercent >= 60 ? "👍" : "💪"}
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
                  <button
                    type="button"
                    className="gen-tab-btn active nse-new-exam-btn"
                    onClick={handleResetAiExam}
                    style={{marginTop: '20px'}}
                  >
                    Generate Another Exam ✨
                  </button>
                </div>
              )}

              <div className="qb-questions-list">
                {aiQuestions.map((q, idx) => (
                  <article key={q._id || idx} className="tool-card qb-question-card nse-ai-card">
                    <div className="qb-badges-corner">
                      <span className={`qb-difficulty ${getDifficultyClass(q.difficulty)}`}>
                        {getDifficultyLabel(q.difficulty)}
                      </span>
                      {q.aiConfidenceScore != null && (
                        <span className="qb-chip nse-confidence-chip">
                          {q.aiConfidenceScore}% conf.
                        </span>
                      )}
                    </div>

                    <span className="qb-topic">
                      Q{idx + 1}
                      {q.derivedFromConcept ? ` • ${q.derivedFromConcept}` : ""}
                    </span>

                    <h3 className="qb-question-title">{q.questionText}</h3>

                    {q.options && q.options.length > 0 && (
                      <div className="qb-options-grid">
                        {q.options.map((option, optIdx) => (
                          <button
                            key={optIdx}
                            type="button"
                            className={`qb-option-btn ${getAiOptionClass(q, option, idx)}`.trim()}
                            onClick={() => handleAiSelectAnswer(idx, option)}
                          >
                            <span className="nse-option-letter">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="qb-option-text">{option}</span>
                            <span className="qb-option-check" aria-hidden="true">✓</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {aiSubmitted && (
                      <div className="qb-detail" style={{marginTop: '15px'}}>
                        <div className="qb-answer-box">
                          <strong>Correct Answer:</strong>
                          <p>{q.correctAnswer}</p>
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
                      {reportedQuestions[idx] ? "Reported ✓" : "Report Issue 🚩"}
                    </button>
                  </article>
                ))}
              </div>

              {!aiSubmitted && (
                <div className="qb-submit-wrap" style={{marginTop: '30px', textAlign: 'center'}}>
                  <button
                    type="button"
                    className="gen-tab-btn active"
                    onClick={handleAiSubmitExam}
                    disabled={Object.keys(aiUserAnswers).length === 0}
                  >
                    Submit Exam
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB 2: PAST EXAMS ARCHIVE
      ══════════════════════════════════════════ */}
      {activeMainTab === "archive" && (
        <div className="nse-archive-tab">
          <div className="nse-config-section">
            <div className="nse-config-header">
              <div className="nse-config-icon">🗄️</div>
              <div>
                <h2 className="nse-config-title">Past Exams Archive</h2>
                <p className="nse-config-subtitle">
                  Access historical exam questions linked to your selected lectures.
                  Select a course and the material files.
                </p>
              </div>
            </div>

            <div className="nse-config-form">
              {/* ── Step 1: Course Selection ── */}
              <div className="nse-form-group">
                <label className="qb-filter-label">1. Select Target Course</label>
                <select 
                  className="qb-pill-input nse-select" 
                  value={selectedCourseObj ? selectedCourseObj.courseId : ""} 
                  onChange={handleCourseChange}
                  disabled={coursesLoading}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="">-- Choose a course --</option>
                  {courses.map(c => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.courseCode} - {c.courseName}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Step 2: Lecture Selection ── */}
              {selectedCourseObj && (
                <div className="nse-form-group">
                  <label className="qb-filter-label">
                    2. Select Source Material
                    {loadingLectures && <span className="nse-count-badge" style={{marginLeft: '10px'}}>Loading...</span>}
                    {!loadingLectures && <span className="nse-count-badge" style={{marginLeft: '10px'}}>{selectedLectures.length} selected</span>}
                  </label>
                  <div className="nse-lecture-grid">
                    {!loadingLectures && lectures.length === 0 && (
                      <p style={{ color: 'var(--text-secondary)', padding: '10px' }}>No lectures found for this course yet.</p>
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
                  className="gen-tab-btn active qb-generate-ai-btn nse-generate-btn"
                  onClick={handleFetchArchive}
                  disabled={selectedLectures.length === 0 || !selectedCourseObj || archiveLoading}
                  style={{ marginTop: '20px' }}
                >
                  {archiveLoading ? "Searching..." : "Search Archive 🔍"}
                </button>
              )}
            </div>
          </div>

          {archiveError && (
             <div className="tool-card nse-error-card" style={{ marginTop: '30px', textAlign: 'center' }}>
               <div className="nse-error-icon">⚠️</div>
               <h3 style={{ margin: '15px 0' }}>Search Failed</h3>
               <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>{archiveError}</p>
             </div>
          )}

          {hasSearchedArchive && !archiveLoading && !archiveError && (
            <div className="nse-archive-results" style={{ marginTop: '30px' }}>
              {archiveMidterms.length === 0 && archiveFinals.length === 0 ? (
                <div className="tool-card" style={{padding: '40px', textAlign: 'center'}}>
                  <div style={{fontSize: '40px', marginBottom: '15px'}}>🍃</div>
                  <h3>No Archives Found</h3>
                  <p style={{color: 'var(--text-secondary)', marginTop: '10px'}}>
                    We couldn't find any archived questions linked to the selected lectures.
                  </p>
                </div>
              ) : (
                <>
                  {archiveMidterms.length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                      <h3 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>
                        📋 Midterm Questions ({archiveMidterms.length})
                      </h3>
                      <div className="qb-questions-list">
                        {archiveMidterms.map((q, idx) => (
                          <article key={q._id || idx} className="tool-card qb-question-card">
                            <div className="qb-badges-corner">
                              <span className="qb-chip nse-confidence-chip">
                                {q.year}
                              </span>
                            </div>
                            <span className="qb-topic">
                              Midterm Q{idx + 1}
                            </span>
                            <h3 className="qb-question-title">{q.questionText}</h3>
                            {q.options && q.options.length > 0 && (
                              <div className="qb-options-grid">
                                {q.options.map((option, optIdx) => (
                                  <div
                                    key={optIdx}
                                    className={`qb-option-btn ${option === q.correctAnswer ? "qb-option-correct" : ""}`.trim()}
                                    style={{ cursor: 'default' }}
                                  >
                                    <span className="nse-option-letter">
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="qb-option-text">{option}</span>
                                    {option === q.correctAnswer && <span className="qb-option-check" aria-hidden="true" style={{opacity: 1}}>✓</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                  {archiveFinals.length > 0 && (
                    <div>
                      <h3 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>
                        🎯 Final Questions ({archiveFinals.length})
                      </h3>
                      <div className="qb-questions-list">
                        {archiveFinals.map((q, idx) => (
                          <article key={q._id || idx} className="tool-card qb-question-card">
                            <div className="qb-badges-corner">
                              <span className="qb-chip nse-confidence-chip">
                                {q.year}
                              </span>
                            </div>
                            <span className="qb-topic">
                              Final Q{idx + 1}
                            </span>
                            <h3 className="qb-question-title">{q.questionText}</h3>
                            {q.options && q.options.length > 0 && (
                              <div className="qb-options-grid">
                                {q.options.map((option, optIdx) => (
                                  <div
                                    key={optIdx}
                                    className={`qb-option-btn ${option === q.correctAnswer ? "qb-option-correct" : ""}`.trim()}
                                    style={{ cursor: 'default' }}
                                  >
                                    <span className="nse-option-letter">
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="qb-option-text">{option}</span>
                                    {option === q.correctAnswer && <span className="qb-option-check" aria-hidden="true" style={{opacity: 1}}>✓</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
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
