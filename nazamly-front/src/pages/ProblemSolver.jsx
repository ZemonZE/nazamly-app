import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { auth, API_URL } from "../firebase";
import "../styles/ProblemSolver.css";

const DIFFICULTY_LABELS = { 1: "Easy", 2: "Medium", 3: "Hard" };
const DIFFICULTY_CLASS  = { 1: "ps-easy", 2: "ps-medium", 3: "ps-hard" };

const LANG_PLACEHOLDERS = {
  cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    // your code here\n    return 0;\n}`,
  js: `process.stdin.resume();\nprocess.stdin.setEncoding('utf8');\nlet _input = '';\nprocess.stdin.on('data', d => _input += d);\nprocess.stdin.on('end', () => {\n    const lines = _input.trim().split('\\n');\n    // your code here\n    console.log(lines[0]);\n});`,
  emu8086: `; your 8086 assembly here\n.model small\n.stack 100h\n.data\n.code\nmain proc\n    mov ax, 4c00h\n    int 21h\nmain endp\nend main`,
  plsql: `-- your PL/SQL here\nBEGIN\n    NULL;\nEND;\n/`,
};

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken(true);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function ProblemSolver() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [problem,  setProblem]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const [language, setLanguage] = useState("");
  const [code,     setCode]     = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [verdict,    setVerdict]    = useState(null);

  const [submissions,  setSubmissions]  = useState([]);
  const [subsLoading,  setSubsLoading]  = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);
  const [diffToggling, setDiffToggling] = useState(false);

  /* ── fetch problem ── */
  const fetchProblem = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API_URL}/api/coding/problems/${id}`, { headers: await authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load problem");
      const p = json.data || json.problem || json;
      setProblem(p);
      const lang = p.supportedLanguages?.[0] || "cpp";
      setLanguage(lang);
      setCode(LANG_PLACEHOLDERS[lang] || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProblem(); }, [fetchProblem]);

  /* ── toggle difficulty ── */
  async function toggleDifficulty() {
    if (!problem) return;
    const next = !problem.showDifficulty;
    setDiffToggling(true);
    try {
      const res = await fetch(`${API_URL}/api/coding/problems/${id}/difficulty-preference`, {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ showDifficulty: next }),
      });
      if (res.ok) {
        // Re-fetch so the backend returns difficulty field when showDifficulty=true
        await fetchProblem();
      }
    } finally {
      setDiffToggling(false);
    }
  }

  /* ── language change ── */
  function handleLangChange(lang) {
    setLanguage(lang);
    if (!code || code === LANG_PLACEHOLDERS[language]) {
      setCode(LANG_PLACEHOLDERS[lang] || "");
    }
  }

  /* ── submit ── */
  async function handleSubmit() {
    if (!code.trim()) return;
    setSubmitting(true);
    setVerdict(null);
    try {
      const res  = await fetch(`${API_URL}/api/coding/submissions`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ problemId: id, language, code }),
      });
      const json = await res.json();
      if (res.status === 429) { setVerdict({ type: "rate",  message: json.message }); return; }
      if (res.status === 503) { setVerdict({ type: "error", message: json.message }); return; }
      setVerdict({ type: json.verdict === "AC" ? "ac" : "wa", ...json });
      if (json.verdict === "AC") fetchProblem();
    } catch (err) {
      setVerdict({ type: "error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  /* ── submission history ── */
  const fetchSubmissions = useCallback(async () => {
    setSubsLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/coding/submissions?problemId=${id}`, { headers: await authHeaders() });
      const json = await res.json();
      setSubmissions(json.data || json.submissions || []);
    } catch { setSubmissions([]); }
    finally  { setSubsLoading(false); }
  }, [id]);

  function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next && submissions.length === 0) fetchSubmissions();
  }

  /* ── loading / error screens ── */
  if (loading) return (
    <div className="ps-fullpage ps-center">
      <div className="ps-spinner" />
      <p>Loading problem…</p>
    </div>
  );

  if (error) return (
    <div className="ps-fullpage ps-center">
      <p className="ps-err">{error}</p>
      <button className="ps-back-btn" onClick={() => navigate(-1)}>← Back</button>
    </div>
  );

  if (!problem) return null;

  return (
    <div className="ps-fullpage">
      {/* ══ TOP BAR ══ */}
      <div className="ps-topbar">
        <button className="ps-back-btn" onClick={() => navigate(-1)}>← Back</button>
        <span className="ps-topbar-title">{problem.title}</span>
        <div className="ps-topbar-meta">
          <span className="ps-badge ps-topic">{problem.topic}</span>
          {problem.showDifficulty && problem.difficulty != null && (
            <span className={`ps-badge ${DIFFICULTY_CLASS[problem.difficulty]}`}>
              {DIFFICULTY_LABELS[problem.difficulty]}
            </span>
          )}
          {problem.estimatedMinutes && (
            <span className="ps-badge ps-time">⏱ {problem.estimatedMinutes} min</span>
          )}
          <button
            className="ps-diff-toggle"
            onClick={toggleDifficulty}
            disabled={diffToggling}
          >
            {problem.showDifficulty ? "🙈 Hide Difficulty" : "👁 Show Difficulty"}
          </button>
        </div>
      </div>

      {/* ══ SPLIT BODY ══ */}
      <div className="ps-body">

        {/* ── LEFT: description ── */}
        <div className="ps-left">
          <div className="ps-description">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {problem.descriptionMd || "_No description provided._"}
            </ReactMarkdown>
          </div>

          {/* tags */}
          {(problem.tags || []).length > 0 && (
            <div className="ps-tags">
              {problem.tags.map(t => <span key={t} className="ps-tag">{t}</span>)}
            </div>
          )}

          {/* sample test cases */}
          {(problem.testCases || []).length > 0 && (
            <div className="ps-samples">
              <p className="ps-samples-title">Sample Test Cases</p>
              {problem.testCases.map((tc, i) => (
                <div key={i} className="ps-sample">
                  <div className="ps-sample-col">
                    <span className="ps-sample-label">Input</span>
                    <pre className="ps-pre">{tc.input}</pre>
                  </div>
                  <div className="ps-sample-col">
                    <span className="ps-sample-label">Expected Output</span>
                    <pre className="ps-pre">{tc.expectedOutput}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: editor + submission ── */}
        <div className="ps-right">
          {/* toolbar */}
          <div className="ps-toolbar">
            <select
              className="ps-lang-select"
              value={language}
              onChange={e => handleLangChange(e.target.value)}
            >
              {(problem.supportedLanguages || []).map(l => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
            <button
              className={`ps-submit-btn ${submitting ? "running" : ""}`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "⏳ Running…" : "▶ Submit"}
            </button>
          </div>

          {/* editor */}
          <textarea
            className="ps-editor"
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="Write your solution here…"
          />

          {/* verdict */}
          {verdict && (
            <div className={`ps-verdict ps-verdict-${verdict.type}`}>
              {verdict.type === "ac" && (
                <>
                  <span className="ps-verdict-icon">✅</span>
                  <span>Accepted — all test cases passed!</span>
                </>
              )}
              {verdict.type === "wa" && (
                <div className="ps-verdict-wa-body">
                  <div className="ps-verdict-wa-title">
                    <span className="ps-verdict-icon">❌</span>
                    <span>Wrong Answer</span>
                  </div>
                  {verdict.firstFailure && (
                    <div className="ps-failure">
                      <div className="ps-sample-col">
                        <span className="ps-sample-label">Input</span>
                        <pre className="ps-pre">{verdict.firstFailure.input}</pre>
                      </div>
                      <div className="ps-sample-col">
                        <span className="ps-sample-label">Expected</span>
                        <pre className="ps-pre">{verdict.firstFailure.expectedOutput}</pre>
                      </div>
                      {verdict.firstFailure.stdout != null && (
                        <div className="ps-sample-col">
                          <span className="ps-sample-label">Your Output</span>
                          <pre className="ps-pre">{verdict.firstFailure.stdout}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {(verdict.type === "error" || verdict.type === "rate") && (
                <>
                  <span className="ps-verdict-icon">⚠️</span>
                  <span>{verdict.message || "An error occurred."}</span>
                </>
              )}
            </div>
          )}

          {/* submission history */}
          <div className="ps-history">
            <button className="ps-history-toggle" onClick={toggleHistory}>
              {showHistory ? "▲ Hide" : "▼ Show"} Submission History
            </button>
            {showHistory && (
              <div className="ps-history-list">
                {subsLoading && <div className="ps-spinner ps-spinner-sm" />}
                {!subsLoading && submissions.length === 0 && (
                  <p className="ps-history-empty">No submissions yet.</p>
                )}
                {submissions.map(sub => (
                  <div key={sub._id} className={`ps-history-row ${sub.verdict === "AC" ? "ac" : "wa"}`}>
                    <span className={`ps-vbadge ${sub.verdict === "AC" ? "ac" : "wa"}`}>{sub.verdict}</span>
                    <span className="ps-history-lang">{sub.language?.toUpperCase()}</span>
                    <span className="ps-history-time">{new Date(sub.createdAt).toLocaleString()}</span>
                    <details className="ps-code-details">
                      <summary>View Code</summary>
                      <pre className="ps-pre ps-history-code">{sub.code}</pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
