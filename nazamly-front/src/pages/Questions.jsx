import { useMemo, useState, useCallback } from "react";

// ══════════════════════════════════════════════
//  EXISTING MOCK DATA (Preserved from original)
// ══════════════════════════════════════════════
const MOCK_QUESTIONS = [
  {
    id: 1,
    subject: "OS",
    chapter: "Processes",
    type: "MCQ",
    difficulty: "Easy",
    question: "Which part of the OS is responsible for scheduling processes?",
    options: ["Compiler", "Kernel", "Shell Script", "Text Editor"],
    correctAnswer: "Kernel",
    explanation:
      "The process scheduler is implemented in the kernel and decides CPU allocation.",
  },
  {
    id: 2,
    subject: "OS",
    chapter: "Processes",
    type: "MCQ",
    difficulty: "Medium",
    question: "Which structure stores the execution context of a process?",
    options: ["Page Table", "Inode", "PCB", "Semaphore"],
    correctAnswer: "PCB",
    explanation:
      "The Process Control Block stores process state, program counter, registers, and scheduling data.",
  },
  {
    id: 3,
    subject: "OS",
    chapter: "Scheduling",
    type: "MCQ",
    difficulty: "Medium",
    question: "Which scheduling algorithm may cause starvation?",
    options: ["Round Robin", "FCFS", "Priority Scheduling", "SJF"],
    correctAnswer: "Priority Scheduling",
    explanation:
      "Priority Scheduling can cause starvation if low-priority processes never get CPU time.",
  },
  {
    id: 4,
    subject: "OS",
    chapter: "Scheduling",
    type: "MCQ",
    difficulty: "Hard",
    question:
      "In the Banker's Algorithm, what condition must hold to grant a resource request?",
    options: [
      "Request ≤ Need",
      "Request ≤ Available",
      "Both Request ≤ Need and Request ≤ Available",
      "Request = Max",
    ],
    correctAnswer: "Both Request ≤ Need and Request ≤ Available",
    explanation:
      "Both conditions must be satisfied before simulating the allocation and checking for a safe state.",
  },
  {
    id: 5,
    subject: "DB",
    chapter: "SQL",
    type: "MCQ",
    difficulty: "Easy",
    question: "What does SQL stand for?",
    options: [
      "Structured Query Language",
      "Simple Query Logic",
      "System Query Language",
      "Static Query Layer",
    ],
    correctAnswer: "Structured Query Language",
    explanation:
      "SQL is the standard language for relational database querying and manipulation.",
  },
  {
    id: 6,
    subject: "DB",
    chapter: "SQL",
    type: "MCQ",
    difficulty: "Medium",
    question: "Which SQL clause is used to filter groups after aggregation?",
    options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
    correctAnswer: "HAVING",
    explanation:
      "HAVING filters groups produced by GROUP BY, whereas WHERE filters individual rows.",
  },
  {
    id: 7,
    subject: "DB",
    chapter: "Normalization",
    type: "MCQ",
    difficulty: "Medium",
    question:
      "A relation is in 2NF if it is in 1NF and every non-key attribute is:",
    options: [
      "Partially dependent on the primary key",
      "Fully functionally dependent on the primary key",
      "Transitively dependent on the primary key",
      "Independent of the primary key",
    ],
    correctAnswer: "Fully functionally dependent on the primary key",
    explanation:
      "2NF eliminates partial dependencies — every non-key attribute must depend on the whole primary key.",
  },
  {
    id: 8,
    subject: "DB",
    chapter: "Normalization",
    type: "MCQ",
    difficulty: "Hard",
    question:
      "Which normal form specifically deals with multi-valued dependencies?",
    options: ["1NF", "2NF", "3NF", "4NF"],
    correctAnswer: "4NF",
    explanation:
      "4NF eliminates non-trivial multi-valued dependencies that are not functional dependencies.",
  },
  {
    id: 9,
    subject: "Java",
    chapter: "OOP",
    type: "MCQ",
    difficulty: "Easy",
    question: "Which keyword is used to inherit a class in Java?",
    options: ["implements", "inherits", "extends", "super"],
    correctAnswer: "extends",
    explanation:
      "Java uses 'extends' for class inheritance and 'implements' for interfaces.",
  },
  {
    id: 10,
    subject: "Java",
    chapter: "OOP",
    type: "MCQ",
    difficulty: "Medium",
    question:
      "Which OOP principle is achieved by declaring class variables as private?",
    options: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"],
    correctAnswer: "Encapsulation",
    explanation:
      "Encapsulation hides internal state by restricting direct access through access modifiers.",
  },
  {
    id: 11,
    subject: "Java",
    chapter: "Collections",
    type: "MCQ",
    difficulty: "Medium",
    question: "Which collection maintains insertion order in Java?",
    options: ["HashSet", "TreeSet", "LinkedHashSet", "PriorityQueue"],
    correctAnswer: "LinkedHashSet",
    explanation:
      "LinkedHashSet uses a hash table plus linked list to preserve insertion order.",
  },
  {
    id: 12,
    subject: "Java",
    chapter: "Collections",
    type: "MCQ",
    difficulty: "Hard",
    question: "What is the time complexity of HashMap.get() in the worst case?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctAnswer: "O(n)",
    explanation:
      "In the worst case (all keys hash to the same bucket), get() degrades to O(n) traversal.",
  },
];

const SUBJECT_OPTIONS = ["OS", "DB", "Java"];
const TYPE_OPTIONS = ["All", "MCQ", "Essay", "Short Answer"];
const DIFFICULTY_OPTIONS = ["All", "Easy", "Medium", "Hard"];

// ══════════════════════════════════════════════
//  MOCK LECTURES for AI Generator (temporary until backend integration)
// ══════════════════════════════════════════════
const MOCK_LECTURES = [
  { id: "lec_hw_01", name: "Lecture 1: Computer Hardware Basics", chapter: "Hardware" },
  { id: "lec_os_02", name: "Lecture 2: OS Fundamentals", chapter: "OS Intro" },
  { id: "lec_proc_03", name: "Lecture 3: Process Management", chapter: "Processes" },
  { id: "lec_sched_04", name: "Lecture 4: CPU Scheduling", chapter: "Scheduling" },
  { id: "lec_mem_05", name: "Lecture 5: Memory Management", chapter: "Memory" },
  { id: "lec_io_06", name: "Lecture 6: I/O Systems", chapter: "I/O" },
];

// Mock archive data for Past Exams tab
const MOCK_ARCHIVE_LECTURES = [
  { id: "arch_1", name: "Lecture 1: Hardware", questionCount: 8 },
  { id: "arch_2", name: "Lecture 2: Processes", questionCount: 12 },
  { id: "arch_3", name: "Lecture 3: Scheduling", questionCount: 6 },
  { id: "arch_4", name: "Lecture 4: Memory", questionCount: 10 },
];

const MOCK_ARCHIVE_QUESTIONS = {
  arch_1: [
    { id: "aq1", text: "What is the main function of the System Bus?", source: "Midterm 2023", difficulty: "Medium" },
    { id: "aq2", text: "Define volatile memory and give an example.", source: "Final 2023", difficulty: "Easy" },
    { id: "aq3", text: "Compare RISC and CISC architectures.", source: "Midterm 2024", difficulty: "Hard" },
    { id: "aq4", text: "List the basic structural elements of a computer.", source: "Quiz 3", difficulty: "Easy" },
  ],
  arch_2: [
    { id: "aq5", text: "What information does a PCB contain?", source: "Midterm 2023", difficulty: "Medium" },
    { id: "aq6", text: "Explain the difference between a process and a thread.", source: "Final 2023", difficulty: "Hard" },
    { id: "aq7", text: "What are the five states of a process?", source: "Quiz 2", difficulty: "Easy" },
    { id: "aq8", text: "Describe context switching overhead.", source: "Midterm 2024", difficulty: "Medium" },
    { id: "aq9", text: "What is a zombie process?", source: "Final 2024", difficulty: "Medium" },
  ],
  arch_3: [
    { id: "aq10", text: "Compare Round Robin and FCFS scheduling.", source: "Midterm 2023", difficulty: "Medium" },
    { id: "aq11", text: "What is the convoy effect in FCFS?", source: "Final 2023", difficulty: "Hard" },
    { id: "aq12", text: "Explain the Banker's Algorithm.", source: "Midterm 2024", difficulty: "Hard" },
  ],
  arch_4: [
    { id: "aq13", text: "What is virtual memory?", source: "Midterm 2023", difficulty: "Easy" },
    { id: "aq14", text: "Explain page replacement using LRU.", source: "Final 2023", difficulty: "Hard" },
    { id: "aq15", text: "What causes thrashing?", source: "Midterm 2024", difficulty: "Medium" },
    { id: "aq16", text: "Compare paging and segmentation.", source: "Final 2024", difficulty: "Hard" },
  ],
};

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
  // ── Existing state (preserved) ──
  const [subject, setSubject] = useState("OS");
  const [chapter, setChapter] = useState("All");
  const [type, setType] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);

  const generateQuestions = (currentSubject) => {
    return MOCK_QUESTIONS.filter((q) => q.subject === currentSubject);
  };

  const [questions, setQuestions] = useState(() => generateQuestions("OS"));

  // ── Tab Navigation ──
  const [activeMainTab, setActiveMainTab] = useState("generate"); // "generate" | "archive"

  // ── AI Generator State ──
  const [examType, setExamType] = useState("Quiz");
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedLectures, setSelectedLectures] = useState([]);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState("");
  const [aiError, setAiError] = useState(null);
  const [aiUserAnswers, setAiUserAnswers] = useState({});
  const [aiSubmitted, setAiSubmitted] = useState(false);
  const [reportedQuestions, setReportedQuestions] = useState({});

  // ── Archive State ──
  const [selectedArchiveLecture, setSelectedArchiveLecture] = useState(null);

  // ══════════════════════════════════════════
  //  EXISTING LOGIC (preserved)
  // ══════════════════════════════════════════
  const chapterOptions = useMemo(() => {
    const chapters = Array.from(
      new Set(
        questions.filter((q) => q.subject === subject).map((q) => q.chapter),
      ),
    );
    return ["All", ...chapters];
  }, [questions, subject]);

  const filteredQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return questions.filter((q) => {
      const matchesSubject = q.subject === subject;
      const matchesChapter = chapter === "All" || q.chapter === chapter;
      const matchesType = type === "All" || q.type === type;
      const matchesDifficulty =
        difficulty === "All" || q.difficulty === difficulty;
      const matchesSearch =
        query.length === 0 ||
        q.question.toLowerCase().includes(query) ||
        q.chapter.toLowerCase().includes(query);

      return (
        matchesSubject &&
        matchesChapter &&
        matchesType &&
        matchesDifficulty &&
        matchesSearch
      );
    });
  }, [questions, subject, chapter, type, difficulty, searchQuery]);

  const mcqQuestions = filteredQuestions.filter((q) => q.type === "MCQ");
  const score = mcqQuestions.reduce((acc, q) => {
    if (!submitted) return acc;
    return userAnswers[q.id] === q.correctAnswer ? acc + 1 : acc;
  }, 0);
  const scorePercent =
    submitted && mcqQuestions.length > 0
      ? Math.round((score / mcqQuestions.length) * 100)
      : 0;

  const handleSelectAnswer = (questionId, option) => {
    if (submitted) return;
    setUserAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitQuiz = () => {
    setSubmitted(true);
  };

  const handleFilterResetState = (newSubject) => {
    setUserAnswers({});
    setSubmitted(false);
    setShowQuestions(false);
    if (newSubject) {
      setQuestions(MOCK_QUESTIONS.filter((q) => q.subject === newSubject));
    }
  };

  const handleGenerateQuestions = () => {
    setQuestions(MOCK_QUESTIONS.filter((q) => q.subject === subject));
    setChapter("All");
    setUserAnswers({});
    setSubmitted(false);
    setShowQuestions(true);
  };

  const getOptionStateClass = (question, option) => {
    const selected = userAnswers[question.id];
    if (!submitted) {
      return selected === option ? "qb-option-selected" : "";
    }

    if (option === question.correctAnswer) return "qb-option-correct";
    if (selected === option && selected !== question.correctAnswer) {
      return "qb-option-wrong";
    }
    return "";
  };

  const scoreMessage =
    scorePercent >= 85
      ? "Excellent work. Keep this momentum going."
      : scorePercent >= 60
        ? "Good progress. Review explanations to level up."
        : "Solid attempt. Focus on concepts and try again.";

  // ══════════════════════════════════════════
  //  SSE EXAM GENERATION LOGIC
  // ══════════════════════════════════════════
  const generateExam = useCallback((courseId, examTypeVal, count, materialFileIds) => {
    setAiLoading(true);
    setAiQuestions([]);
    setAiStatusMessage("Starting connection...");
    setAiError(null);
    setAiUserAnswers({});
    setAiSubmitted(false);

    const url = `/api/questions/generate-stream?courseId=${courseId}&examType=${examTypeVal}&questionCount=${count}&materialFileIds=${materialFileIds.join(",")}`;
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
      } else if (data.status === "error") {
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

  // Toggle lecture selection for the AI generator
  const toggleLecture = (lectureId) => {
    setSelectedLectures((prev) =>
      prev.includes(lectureId)
        ? prev.filter((id) => id !== lectureId)
        : [...prev, lectureId],
    );
  };

  // Handle AI exam form submission
  const handleGenerateAiExam = () => {
    if (selectedLectures.length === 0) return;
    // Using a mock courseId since we're not yet connected to course selection
    generateExam("mock_course_id", examType, questionCount, selectedLectures);
  };

  // Handle AI exam answer selection
  const handleAiSelectAnswer = (questionIdx, option) => {
    if (aiSubmitted) return;
    setAiUserAnswers((prev) => ({ ...prev, [questionIdx]: option }));
  };

  // Handle AI exam submission
  const handleAiSubmitExam = () => {
    setAiSubmitted(true);
  };

  // Report a question
  const handleReportQuestion = (questionIdx) => {
    setReportedQuestions((prev) => ({ ...prev, [questionIdx]: true }));
  };

  // Get AI option state class
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

  // Calculate AI exam score
  const aiScore = aiSubmitted
    ? aiQuestions.reduce((acc, q, idx) => {
        return aiUserAnswers[idx] === q.correctAnswer ? acc + 1 : acc;
      }, 0)
    : 0;
  const aiScorePercent =
    aiSubmitted && aiQuestions.length > 0
      ? Math.round((aiScore / aiQuestions.length) * 100)
      : 0;

  // Reset AI exam to config view
  const handleResetAiExam = () => {
    setAiQuestions([]);
    setAiUserAnswers({});
    setAiSubmitted(false);
    setAiError(null);
    setAiStatusMessage("");
    setReportedQuestions({});
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
          {/* ── View A: Configuration Form ── */}
          {!aiLoading && aiQuestions.length === 0 && !aiError && (
            <div className="nse-config-section">
              <div className="nse-config-header">
                <div className="nse-config-icon">🧠</div>
                <div>
                  <h2 className="nse-config-title">Nazamly Smart Exams</h2>
                  <p className="nse-config-subtitle">
                    Configure your exam parameters. Our AI will generate questions
                    matched to your professor's testing style.
                  </p>
                </div>
              </div>

              <div className="nse-config-form">
                {/* Exam Type Selector */}
                <div className="nse-form-group">
                  <label className="qb-filter-label">Exam Type</label>
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

                {/* Question Count */}
                <div className="nse-form-group">
                  <label className="qb-filter-label">
                    Number of Questions
                    <span className="nse-count-badge">{questionCount}</span>
                  </label>
                  <div className="nse-counter-control">
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

                {/* Lecture Selection */}
                <div className="nse-form-group">
                  <label className="qb-filter-label">
                    Target Lectures
                    <span className="nse-count-badge">
                      {selectedLectures.length} selected
                    </span>
                  </label>
                  <div className="nse-lecture-grid">
                    {MOCK_LECTURES.map((lec) => (
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

                {/* Generate Button */}
                <button
                  type="button"
                  className="gen-tab-btn active qb-generate-ai-btn nse-generate-btn"
                  onClick={handleGenerateAiExam}
                  disabled={selectedLectures.length === 0}
                >
                  Generate My Exam ✨
                </button>
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
            <div className="tool-card nse-error-card">
              <div className="nse-error-icon">⚠️</div>
              <h3>Generation Failed</h3>
              <p>{aiError}</p>
              <button
                type="button"
                className="gen-tab-btn active"
                onClick={handleResetAiExam}
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── View C: Exam Engine (AI-generated questions) ── */}
          {aiQuestions.length > 0 && (
            <div className="nse-exam-engine">
              {/* Score card after submission */}
              {aiSubmitted && (
                <div className="tool-card qb-score-card nse-result-card">
                  <div className="nse-result-header">
                    <div className="nse-result-emoji">
                      {aiScorePercent >= 85 ? "🏆" : aiScorePercent >= 60 ? "👍" : "💪"}
                    </div>
                    <div>
                      <h3>Result Summary</h3>
                      <p className="nse-result-sub">
                        {examType} • {aiQuestions.length} Questions
                      </p>
                    </div>
                  </div>
                  <div className="nse-score-row">
                    <div className="nse-score-circle">
                      <span className="nse-score-value">{aiScorePercent}%</span>
                    </div>
                    <div className="nse-score-details">
                      <p>
                        Correct: <strong>{aiScore}</strong> / {aiQuestions.length}
                      </p>
                      <p className="nse-score-msg">
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
                  >
                    Generate New Exam ✨
                  </button>
                </div>
              )}

              {/* Question cards */}
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

                    {/* Options as radio-style buttons */}
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

                    {/* Post-submission: show correct answer */}
                    {aiSubmitted && (
                      <div className="qb-detail">
                        <div className="qb-answer-box">
                          <strong>Correct Answer:</strong>
                          <p>{q.correctAnswer}</p>
                        </div>
                      </div>
                    )}

                    {/* Report button */}
                    <button
                      type="button"
                      className={`nse-report-btn ${reportedQuestions[idx] ? "reported" : ""}`}
                      onClick={() => handleReportQuestion(idx)}
                      disabled={reportedQuestions[idx]}
                    >
                      {reportedQuestions[idx] ? "Reported ✓" : "Report Issue 🚩"}
                    </button>
                  </article>
                ))}
              </div>

              {/* Submit / Actions */}
              {!aiSubmitted && (
                <div className="qb-submit-wrap">
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
          <div className="nse-archive-layout">
            {/* Sidebar */}
            <aside className="nse-archive-sidebar tool-card">
              <h3 className="nse-sidebar-title">📖 Lectures</h3>
              <div className="nse-sidebar-list">
                {MOCK_ARCHIVE_LECTURES.map((lec) => (
                  <button
                    key={lec.id}
                    type="button"
                    className={`nse-sidebar-item ${selectedArchiveLecture === lec.id ? "active" : ""}`}
                    onClick={() => setSelectedArchiveLecture(lec.id)}
                  >
                    <span className="nse-sidebar-name">{lec.name}</span>
                    <span className="nse-sidebar-badge">{lec.questionCount} Q</span>
                  </button>
                ))}
              </div>
            </aside>

            {/* Main Content */}
            <div className="nse-archive-main">
              {!selectedArchiveLecture ? (
                <div className="nse-archive-empty tool-card">
                  <div className="nse-empty-icon">📂</div>
                  <h3>Select a Lecture</h3>
                  <p>Choose a lecture from the sidebar to view its archived exam questions.</p>
                </div>
              ) : (
                <div className="nse-archive-grid">
                  {(MOCK_ARCHIVE_QUESTIONS[selectedArchiveLecture] || []).map((q) => (
                    <article key={q.id} className="tool-card nse-archive-card">
                      <span className={`qb-difficulty ${getDifficultyClass(q.difficulty)}`}>
                        {q.difficulty}
                      </span>
                      <h4 className="nse-archive-question">{q.text}</h4>
                      <div className="nse-archive-meta">
                        <span className="nse-source-badge">🏷️ {q.source}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Questions;
