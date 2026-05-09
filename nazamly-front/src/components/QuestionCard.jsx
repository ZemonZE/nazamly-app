import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckIcon, LightbulbIcon } from "../Icons/Icons";

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

const getQuestionType = (question) => {
  if (question.type) {
    const t = question.type.toLowerCase();
    if (t === "t/f" || t === "true/false") return "tf";
    return t;
  }
  if (question.options && question.options.length === 2 && 
      question.options.some(opt => opt.toLowerCase() === "true" || opt.toLowerCase() === "false")) {
    return "tf";
  }
  if (question.options && question.options.length > 2) return "mcq";
  return "essay";
};

const getOptionLabel = (question, optIdx) => {
  const qType = getQuestionType(question);
  if (qType === "tf") {
    return question.options[optIdx] === "True" ? "T" : "F";
  }
  return String.fromCharCode(65 + optIdx);
};

function QuestionCard({
  question,
  questionNumber,
  selectedAnswer,
  onSelectAnswer,
  submitted = false,
  showExplanation = false,
  onReport,
  reported = false,
  className,
  ...props
}) {
  const qType = getQuestionType(question);
  const isTF = qType === "tf";
  const isEssay = qType === "essay";
  const isUnanswered = !submitted && selectedAnswer === undefined;

  const getOptionClass = (option) => {
    if (!submitted) {
      return selectedAnswer === option ? "qb-option-selected" : "";
    }
    if (option === question.correctAnswer) return "qb-option-correct";
    if (selectedAnswer === option && selectedAnswer !== question.correctAnswer) {
      return "qb-option-wrong";
    }
    return "";
  };

  return (
    <Card
      className={cn(
        "qb-question-card nse-ai-card",
        isUnanswered && "nse-unanswered",
        className
      )}
      {...props}
    >
      <CardContent className="p-6">
        <div className="qb-badges-corner">
          {question.difficulty && (
            <span className={cn("qb-difficulty", getDifficultyClass(question.difficulty))}>
              {getDifficultyLabel(question.difficulty)}
            </span>
          )}
          {question.aiConfidenceScore != null && (
            <span className="qb-chip nse-confidence-chip">
              {question.aiConfidenceScore}% conf.
            </span>
          )}
          <span className={cn("nse-qtype-badge", isTF ? "nse-qtype-tf" : isEssay ? "nse-qtype-essay" : "nse-qtype-mcq")}>
            {isTF ? "True / False" : isEssay ? "Essay" : "MCQ"}
          </span>
        </div>

        <span className="qb-topic">
          Q{questionNumber}
          {question.derivedFromConcept ? ` • ${question.derivedFromConcept}` : ""}
        </span>

        <h3 className="qb-question-title">{question.questionText}</h3>

        {!isEssay && question.options && question.options.length > 0 ? (
          <div className={cn("qb-options-grid nse-options-fullwidth", isTF && "nse-tf-grid")}>
            {question.options.map((option, optIdx) => (
              <button
                key={optIdx}
                type="button"
                className={cn(
                  "qb-option-btn nse-option-card",
                  isTF && "nse-tf-card",
                  getOptionClass(option)
                )}
                onClick={() => onSelectAnswer && onSelectAnswer(option)}
                disabled={submitted}
              >
                <span className={cn("nse-option-letter nse-letter-circle", isTF && "nse-tf-letter")}>
                  {getOptionLabel(question, optIdx)}
                </span>
                <span className="qb-option-text">{option}</span>
                <span className="qb-option-check" aria-hidden="true">
                  <CheckIcon size={14} />
                </span>
              </button>
            ))}
          </div>
        ) : isEssay ? (
          <div style={{ marginTop: "15px" }}>
            <textarea
              className="qb-pill-input"
              style={{
                width: "100%",
                minHeight: "120px",
                padding: "15px",
                color: "var(--text-primary)",
                backgroundColor: "var(--input-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
              placeholder="Type your answer here..."
              value={selectedAnswer || ""}
              onChange={(e) => onSelectAnswer && onSelectAnswer(e.target.value)}
              disabled={submitted}
            />
          </div>
        ) : null}

        {submitted && showExplanation && (
          <div className="nse-explanation-box" style={{ marginTop: "18px" }}>
            <div className="nse-explanation-header">
              <span className="nse-explanation-icon">
                <LightbulbIcon size={18} />
              </span>
              <strong>Explanation</strong>
            </div>
            {!isEssay ? (
              <>
                {question.explanation && (
                  <p className="nse-explanation-text">{question.explanation}</p>
                )}
                <div className="nse-explanation-answer">
                  <span>Correct Answer:</span> <strong>{question.correctAnswer}</strong>
                </div>
              </>
            ) : (
              <div
                style={{
                  marginTop: "10px",
                  padding: "15px",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "8px",
                  borderLeft: `4px solid ${question.isCorrect ? "var(--success)" : "var(--error)"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "18px", marginRight: "8px" }}>
                    {question.isCorrect ? "✅" : "❌"}
                  </span>
                  <strong style={{ color: question.isCorrect ? "var(--success)" : "var(--error)" }}>
                    AI Feedback
                  </strong>
                </div>
                <p style={{ margin: 0, lineHeight: 1.5, color: "var(--text-secondary)" }}>
                  {question.explanation ||
                    (question.isCorrect
                      ? "Correct answer."
                      : "Incorrect. Core concepts were missing.")}
                </p>
                {question.correctAnswer && (
                  <div
                    style={{
                      marginTop: "10px",
                      paddingTop: "10px",
                      borderTop: "1px dashed var(--border-color)",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Required Concepts:
                    </strong>
                    <p style={{ margin: "5px 0 0 0", fontSize: "14px" }}>
                      {question.correctAnswer}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {onReport && (
          <button
            type="button"
            className={cn("nse-report-btn", reported && "reported")}
            onClick={onReport}
            disabled={reported}
            style={{ marginTop: "15px" }}
          >
            {reported ? (
              <>
                <CheckIcon size={14} /> Reported
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>{" "}
                Report Issue
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default QuestionCard;
