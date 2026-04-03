import { useMemo, useState } from "react";

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

function Questions() {
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

  return (
    <div className="dash-home qb-quiz-wrap">
      <div className="qb-filter-bar">
        <div className="qb-filter-group">
          <label className="qb-filter-label">Course</label>
          <select
            className="qb-pill-input"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setChapter("All");
              handleFilterResetState(e.target.value);
            }}
          >
            {SUBJECT_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="qb-filter-group">
          <label className="qb-filter-label">Chapter</label>
          <select
            className="qb-pill-input"
            value={chapter}
            onChange={(e) => {
              setChapter(e.target.value);
              handleFilterResetState();
            }}
          >
            {chapterOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="qb-filter-group">
          <label className="qb-filter-label">Type</label>
          <select
            className="qb-pill-input"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              handleFilterResetState();
            }}
          >
            {TYPE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="qb-filter-group">
          <label className="qb-filter-label">Difficulty</label>
          <select
            className="qb-pill-input"
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              handleFilterResetState();
            }}
          >
            {DIFFICULTY_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="gen-tab-btn active qb-generate-ai-btn"
          onClick={handleGenerateQuestions}
        >
          Generate Questions ✨
        </button>
      </div>

      {showQuestions && (
        <>
          {submitted && (
            <div className="tool-card qb-score-card qb-result-header">
              <h3>Result Summary</h3>
              <p>
                Your Score: <strong>{score}</strong> /{" "}
                <strong>{mcqQuestions.length}</strong>
              </p>
              <p className="qb-score-percent">{scorePercent}%</p>
              <p className="qb-score-message">{scoreMessage}</p>
            </div>
          )}

          {filteredQuestions.length === 0 ? (
            <div className="tool-card qb-empty">No questions found.</div>
          ) : (
            <div className="qb-questions-list">
              {filteredQuestions.map((q) => (
                <article key={q.id} className="tool-card qb-question-card">
                  <div className="qb-badges-corner">
                    <span
                      className={`qb-difficulty qb-diff-${q.difficulty.toLowerCase()}`}
                    >
                      {q.difficulty}
                    </span>
                    <span className="qb-chip">{q.type}</span>
                  </div>

                  <span className="qb-topic">
                    {q.subject} • {q.chapter}
                  </span>

                  <h3 className="qb-question-title">{q.question}</h3>

                  {q.type === "MCQ" ? (
                    <div className="qb-options-grid">
                      {q.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`qb-option-btn ${getOptionStateClass(q, option)}`.trim()}
                          onClick={() => handleSelectAnswer(q.id, option)}
                        >
                          <span className="qb-option-text">{option}</span>
                          <span className="qb-option-check" aria-hidden="true">
                            ✓
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="qb-explanation-box">
                      <strong>Detailed Explanation:</strong>
                      <p>{q.explanation}</p>
                    </div>
                  )}

                  {submitted && q.type === "MCQ" && (
                    <div className="qb-detail">
                      <div className="qb-answer-box">
                        <strong>Correct Answer:</strong>
                        <p>{q.correctAnswer}</p>
                      </div>
                      <div className="qb-explanation-box">
                        <strong>Detailed Explanation:</strong>
                        <p>{q.explanation}</p>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="qb-submit-wrap">
            <button
              type="button"
              className="gen-tab-btn active"
              onClick={handleSubmitQuiz}
              disabled={mcqQuestions.length === 0}
            >
              Submit Quiz
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Questions;
