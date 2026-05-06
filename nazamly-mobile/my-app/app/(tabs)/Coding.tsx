import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/constants/theme';
import { API_URL } from '@/firebase';

type CodingProblem = { _id: string; title: string; difficulty: string; tags?: string[]; description?: string; examples?: any[]; constraints?: string[]; starterCode?: Record<string, string> };
type CodeSubmission = { _id: string; status?: string; verdict?: string; submittedAt: string; language: string; testCasesPassed?: number; totalTestCases?: number; executionTime?: number; memoryUsed?: number; firstFailure?: { input: string; expectedOutput: string; stdout?: string } };
type StudentProgress = { totalProblemsSolved: number; currentStreak: number; maxStreak: number; easyCount: number; mediumCount: number; hardCount: number };

const listProblems = async (token: string) => {
  const res = await fetch(`${API_URL}/api/coding/problems`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json().then(d => d.data || d);
};
const getProblem = async (id: string, token: string) => {
  const res = await fetch(`${API_URL}/api/coding/problems/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json().then(d => d.data || d);
};
const submitCode = async (data: any, token: string) => {
  const res = await fetch(`${API_URL}/api/coding/submissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json().then(d => d.data || d);
};
const runCode = async (data: any, token: string) => {
  const res = await fetch(`${API_URL}/api/coding/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};
const getSubmissions = async (token: string) => {
  const res = await fetch(`${API_URL}/api/coding/submissions`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json().then(d => d.data || d);
};
const getProgress = async (token: string) => {
  const res = await fetch(`${API_URL}/api/coding/progress`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json().then(d => d.data || d);
};
const toggleDifficulty = async (id: string, showDifficulty: boolean, token: string) => {
  const res = await fetch(`${API_URL}/api/coding/problems/${id}/difficulty-preference`, { 
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ showDifficulty })
  });
  return res.json();
};


// ── Difficulty helpers ──
const getDifficultyLabel = (level: string) => {
  switch (level) {
    case 'easy': return 'Easy';
    case 'medium': return 'Medium';
    case 'hard': return 'Hard';
    default: return 'Unknown';
  }
};

const getDifficultyColor = (level: string) => {
  switch (level) {
    case 'easy': return '#22c55e';
    case 'medium': return '#f59e0b';
    case 'hard': return '#ef4444';
    default: return '#6b7280';
  }
};

const getStatusColor = (status: string | undefined) => {
  if (!status) return '#6b7280';
  switch (status) {
    case 'accepted': return '#22c55e';
    case 'wrong_answer': return '#ef4444';
    case 'time_limit_exceeded': return '#f59e0b';
    case 'memory_limit_exceeded': return '#f59e0b';
    case 'runtime_error': return '#ef4444';
    case 'compilation_error': return '#ef4444';
    case 'running': return '#3b82f6';
    case 'pending': return '#6b7280';
    default: return '#6b7280';
  }
};

const getStatusIcon = (status: string | undefined) => {
  if (!status) return 'help-circle';
  switch (status) {
    case 'accepted': return 'check-circle';
    case 'wrong_answer': return 'x-circle';
    case 'time_limit_exceeded': return 'clock';
    case 'memory_limit_exceeded': return 'cpu';
    case 'runtime_error': return 'alert-triangle';
    case 'compilation_error': return 'code';
    case 'running': return 'loader';
    case 'pending': return 'clock';
    default: return 'help-circle';
  }
};

export default function CodingScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState<'problems' | 'submissions' | 'progress'>('problems');

  // ── Problems Tab ──
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [problemsError, setProblemsError] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);

  // ── Problem Detail ──
  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('cpp');
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<CodeSubmission | null>(null);
  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState<any>(null);

  // ── Submissions Tab ──
  const [submissions, setSubmissions] = useState<CodeSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // ── Progress Tab ──
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // ── Load Problems ──
  useEffect(() => {
    if (user) loadProblems();
  }, [user]);

  const loadProblems = async () => {
    if (!user) return;
    setProblemsLoading(true);
    setProblemsError(null);
    try {
      const token = await user.getIdToken();
      const response = await listProblems(token);
      setProblems(response.problems || []);
    } catch (err: any) {
      setProblemsError(err.message || 'Failed to load problems');
    } finally {
      setProblemsLoading(false);
    }
  };

  // ── Load Submissions when tab switches ──
  useEffect(() => {
    if (activeTab === 'submissions' && user) loadSubmissions();
  }, [activeTab]);

  const loadSubmissions = async () => {
    if (!user) return;
    setSubmissionsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await getSubmissions(token);
      setSubmissions(response.submissions || []);
    } catch (err: any) {
      console.error('Failed to load submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // ── Load Progress when tab switches ──
  useEffect(() => {
    if (activeTab === 'progress' && user) loadProgress();
  }, [activeTab]);

  const loadProgress = async () => {
    if (!user) return;
    setProgressLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await getProgress(token);
      setProgress(response.progress || null);
    } catch (err: any) {
      console.error('Failed to load progress:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  // ── Handle Problem Selection ──
  const handleProblemSelect = async (problem: CodingProblem) => {
    setSelectedProblem(problem);
    setCode(problem.starterCode?.[selectedLanguage] || '');
    setLastSubmission(null);

    // Load problem details if needed
    if (!problem.description) {
      try {
        const token = await user?.getIdToken();
        if (token) {
          const response = await getProblem(problem._id, token);
          if (response.problem) {
            setSelectedProblem(response.problem);
            setCode(response.problem.starterCode?.[selectedLanguage] || '');
          }
        }
      } catch (err) {
        console.error('Failed to load problem details:', err);
      }
    }
  };

  // ── Handle Code Run (sample test cases) ──
  const handleRunCode = async () => {
    if (!user || !selectedProblem || !code.trim()) return;
    setRunning(true);
    setRunResults(null);
    try {
      const token = await user.getIdToken();
      const response = await runCode({
        problemId: selectedProblem._id,
        language: selectedLanguage,
        code: code.trim(),
      }, token);
      if (response.status === 429) {
        setRunResults({ error: response.message });
      } else {
        setRunResults(response);
      }
    } catch (err: any) {
      setRunResults({ error: err.message || 'Run failed.' });
    } finally {
      setRunning(false);
    }
  };

  // ── Handle Code Submission ──
  const handleSubmitCode = async () => {
    if (!user || !selectedProblem || !code.trim()) return;

    setSubmitting(true);
    setRunResults(null);
    try {
      const token = await user.getIdToken();
      const response = await submitCode({
        problemId: selectedProblem._id,
        code: code.trim(),
        language: selectedLanguage,
      }, token);

      // Backend returns { verdict: "AC"|"WA", firstFailure?, submission? }
      if (response.verdict === 'AC') {
        setLastSubmission({ ...response, status: 'accepted' });
      } else if (response.verdict === 'WA') {
        setLastSubmission({ ...response, status: 'wrong_answer' });
      } else if (response.submission) {
        setLastSubmission(response.submission);
      }
      loadSubmissions();
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Failed to submit code');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handle Difficulty Toggle ──
  const handleToggleDifficulty = async (problemId: string, showDifficulty: boolean) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await toggleDifficulty(problemId, showDifficulty, token);
      // Reload problems to reflect the change
      loadProblems();
    } catch (err: any) {
      console.error('Failed to toggle difficulty:', err);
    }
  };

  // ── Handle Language Change ──
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    if (selectedProblem?.starterCode?.[language]) {
      setCode(selectedProblem.starterCode[language]);
    }
  };

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* ── Tab Bar ── */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'problems' && { backgroundColor: colors.indigo }]}
          onPress={() => {
            setActiveTab('problems');
            setSelectedProblem(null);
          }}
        >
          <MaterialCommunityIcons name="code-braces" size={16} color={activeTab === 'problems' ? '#fff' : colors.textMuted} />
          <Text style={[s.tabBtnText, activeTab === 'problems' && { color: '#fff' }]}>Problems</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'submissions' && { backgroundColor: colors.indigo }]}
          onPress={() => setActiveTab('submissions')}
        >
          <Feather name="send" size={16} color={activeTab === 'submissions' ? '#fff' : colors.textMuted} />
          <Text style={[s.tabBtnText, activeTab === 'submissions' && { color: '#fff' }]}>Submissions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'progress' && { backgroundColor: colors.indigo }]}
          onPress={() => setActiveTab('progress')}
        >
          <Feather name="trending-up" size={16} color={activeTab === 'progress' ? '#fff' : colors.textMuted} />
          <Text style={[s.tabBtnText, activeTab === 'progress' && { color: '#fff' }]}>Progress</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ═══════════════════════════════════
            TAB: PROBLEMS
        ═══════════════════════════════════ */}
        {activeTab === 'problems' && !selectedProblem && (
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <View style={s.cardHeaderRow}>
              <MaterialCommunityIcons name="code-braces" size={24} color={colors.indigo} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Coding Problems</Text>
                <Text style={[s.cardDesc, { color: colors.textMuted }]}>
                  Practice your coding skills with our curated problems.
                </Text>
              </View>
            </View>

            {problemsLoading ? (
              <ActivityIndicator size="large" color={colors.indigo} style={{ marginVertical: 30 }} />
            ) : problemsError ? (
              <Text style={{ color: '#ef4444', padding: 10 }}>{problemsError}</Text>
            ) : problems.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 40 }}>💻</Text>
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No Problems Yet</Text>
                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>Check back later for new coding challenges!</Text>
              </View>
            ) : (
              problems.map(problem => (
                <TouchableOpacity
                  key={problem._id}
                  style={[s.problemCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
                  onPress={() => handleProblemSelect(problem)}
                >
                  <View style={s.problemHeader}>
                    <Text style={[s.problemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {problem.title}
                    </Text>
                    <View style={[s.difficultyBadge, { backgroundColor: getDifficultyColor(problem.difficulty) + '18' }]}>
                      <Text style={[s.difficultyText, { color: getDifficultyColor(problem.difficulty) }]}>
                        {getDifficultyLabel(problem.difficulty)}
                      </Text>
                    </View>
                  </View>
                  <View style={s.problemMeta}>
                    <Text style={[s.problemTags, { color: colors.textMuted }]}>
                      {problem.tags?.slice(0, 3).join(' · ') || 'No tags'}
                    </Text>
                    <TouchableOpacity
                      style={s.difficultyToggle}
                      onPress={() => handleToggleDifficulty(problem._id, true)}
                    >
                      <Feather name="eye" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Problem Detail View */}
        {selectedProblem && activeTab === 'problems' && (
          <>
            <TouchableOpacity
              style={[s.backBtn, { backgroundColor: colors.card }]}
              onPress={() => setSelectedProblem(null)}
            >
              <Feather name="arrow-left" size={18} color={colors.textPrimary} />
              <Text style={[s.backBtnText, { color: colors.textPrimary }]}>Back to Problems</Text>
            </TouchableOpacity>

            <View style={[s.card, { backgroundColor: colors.card }]}>
              <View style={s.problemDetailHeader}>
                <Text style={[s.problemDetailTitle, { color: colors.textPrimary }]}>
                  {selectedProblem.title}
                </Text>
                <View style={[s.difficultyBadge, { backgroundColor: getDifficultyColor(selectedProblem.difficulty) + '18' }]}>
                  <Text style={[s.difficultyText, { color: getDifficultyColor(selectedProblem.difficulty) }]}>
                    {getDifficultyLabel(selectedProblem.difficulty)}
                  </Text>
                </View>
              </View>

              <Text style={[s.problemDescription, { color: colors.textPrimary }]}>
                {selectedProblem.description}
              </Text>

              {/* Examples */}
              {selectedProblem.examples && selectedProblem.examples.length > 0 && (
                <View style={s.examplesSection}>
                  <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Examples</Text>
                  {selectedProblem.examples.map((example, idx) => (
                    <View key={idx} style={[s.exampleBox, { backgroundColor: colors.bg }]}>
                      <Text style={[s.exampleLabel, { color: colors.textMuted }]}>Input:</Text>
                      <Text style={[s.exampleText, { color: colors.textPrimary }]}>{example.input}</Text>
                      <Text style={[s.exampleLabel, { color: colors.textMuted }]}>Output:</Text>
                      <Text style={[s.exampleText, { color: colors.textPrimary }]}>{example.output}</Text>
                      {example.explanation && (
                        <>
                          <Text style={[s.exampleLabel, { color: colors.textMuted }]}>Explanation:</Text>
                          <Text style={[s.exampleText, { color: colors.textSecondary }]}>{example.explanation}</Text>
                        </>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Constraints */}
              {selectedProblem.constraints && selectedProblem.constraints.length > 0 && (
                <View style={s.constraintsSection}>
                  <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Constraints</Text>
                  {selectedProblem.constraints.map((constraint, idx) => (
                    <Text key={idx} style={[s.constraintText, { color: colors.textSecondary }]}>
                      • {constraint}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* Code Editor */}
            <View style={[s.card, { backgroundColor: colors.card }]}>
              <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Your Solution</Text>

              {/* Language Selector */}
              <View style={s.languageSelector}>
                {['cpp', 'js', 'python'].map(lang => (
                  <TouchableOpacity
                    key={lang}
                    style={[s.languageBtn, selectedLanguage === lang && { backgroundColor: colors.indigo }]}
                    onPress={() => handleLanguageChange(lang)}
                  >
                    <Text style={[s.languageText, selectedLanguage === lang && { color: '#fff' }]}>
                      {lang.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Code Input */}
              <TextInput
                style={[s.codeInput, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                multiline
                placeholder="Write your code here..."
                placeholderTextColor={colors.textMuted}
                value={code}
                onChangeText={setCode}
                textAlignVertical="top"
              />

              {/* Run + Submit Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[s.submitBtn, { backgroundColor: running ? colors.border : colors.teal, flex: 1 }]}
                  onPress={handleRunCode}
                  disabled={!code.trim() || running || submitting}
                >
                  {running ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="play" size={16} color={code.trim() ? '#fff' : colors.textMuted} />
                      <Text style={[s.submitBtnText, { color: code.trim() ? '#fff' : colors.textMuted }]}>Run</Text>
                    </>
                  )}
                </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: code.trim() ? colors.indigo : colors.border, flex: 1 }]}
                onPress={handleSubmitCode}
                disabled={!code.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={18} color={code.trim() ? '#fff' : colors.textMuted} />
                    <Text style={[s.submitBtnText, { color: code.trim() ? '#fff' : colors.textMuted }]}>
                      Submit
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              </View>

              {/* Run Results */}
              {runResults && (
                <View style={[s.card, { backgroundColor: colors.card, marginTop: 12 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Sample Test Results</Text>
                    <TouchableOpacity onPress={() => setRunResults(null)}>
                      <Feather name="x" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {runResults.error ? (
                    <Text style={{ color: colors.red }}>⚠️ {runResults.error}</Text>
                  ) : runResults.message ? (
                    <Text style={{ color: colors.red }}>{runResults.message}</Text>
                  ) : (
                    (runResults.results || []).map((r: any, i: number) => (
                      <View key={i} style={[s.exampleBox, { backgroundColor: r.passed ? '#22c55e10' : '#ef444410', borderRadius: 8, padding: 10, marginBottom: 8 }]}>
                        <Text style={{ color: r.passed ? '#22c55e' : '#ef4444', fontWeight: '700', marginBottom: 6 }}>
                          {r.passed ? '✅' : '❌'} Case {i + 1} — {r.passed ? 'Passed' : 'Failed'}
                        </Text>
                        <Text style={[s.exampleLabel, { color: colors.textMuted }]}>Input:</Text>
                        <Text style={[s.exampleText, { color: colors.textPrimary }]}>{r.input}</Text>
                        <Text style={[s.exampleLabel, { color: colors.textMuted }]}>Expected:</Text>
                        <Text style={[s.exampleText, { color: colors.textPrimary }]}>{r.expectedOutput}</Text>
                        {r.actualOutput != null && (
                          <>
                            <Text style={[s.exampleLabel, { color: colors.textMuted }]}>Your Output:</Text>
                            <Text style={[s.exampleText, { color: r.passed ? '#22c55e' : '#ef4444' }]}>{r.actualOutput || '(empty)'}</Text>
                          </>
                        )}
                        {r.stderr ? (
                          <>
                            <Text style={[s.exampleLabel, { color: colors.textMuted }]}>Stderr:</Text>
                            <Text style={[s.exampleText, { color: '#ef4444' }]}>{r.stderr}</Text>
                          </>
                        ) : null}
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Last Submission Result */}
            {lastSubmission && (
              <View style={[s.card, { backgroundColor: colors.card }]}>
                <View style={s.submissionHeader}>
                  <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Last Submission</Text>
                  <View style={[s.statusBadge, { backgroundColor: getStatusColor(lastSubmission.status || (lastSubmission.verdict === 'AC' ? 'accepted' : 'wrong_answer')) + '20' }]}>
                    <Feather name={getStatusIcon(lastSubmission.status || (lastSubmission.verdict === 'AC' ? 'accepted' : 'wrong_answer')) as any} size={14} color={getStatusColor(lastSubmission.status || (lastSubmission.verdict === 'AC' ? 'accepted' : 'wrong_answer'))} />
                    <Text style={[s.statusText, { color: getStatusColor(lastSubmission.status || (lastSubmission.verdict === 'AC' ? 'accepted' : 'wrong_answer')) }]}>
                      {lastSubmission.verdict === 'AC' ? 'ACCEPTED' : lastSubmission.verdict === 'WA' ? 'WRONG ANSWER' : (lastSubmission.status || '').replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {lastSubmission.verdict === 'WA' && lastSubmission.firstFailure && (
                  <View style={[s.exampleBox, { backgroundColor: '#ef444410', borderRadius: 8, padding: 10, marginTop: 8 }]}>
                    <Text style={{ color: '#ef4444', fontWeight: '700', marginBottom: 6 }}>First Failing Case</Text>
                    <Text style={[s.exampleLabel, { color: colors.textMuted }]}>Input:</Text>
                    <Text style={[s.exampleText, { color: colors.textPrimary }]}>{lastSubmission.firstFailure.input}</Text>
                    <Text style={[s.exampleLabel, { color: colors.textMuted }]}>Expected:</Text>
                    <Text style={[s.exampleText, { color: colors.textPrimary }]}>{lastSubmission.firstFailure.expectedOutput}</Text>
                    {lastSubmission.firstFailure.stdout != null && (
                      <>
                        <Text style={[s.exampleLabel, { color: colors.textMuted }]}>Your Output:</Text>
                        <Text style={[s.exampleText, { color: '#ef4444' }]}>{lastSubmission.firstFailure.stdout}</Text>
                      </>
                    )}
                  </View>
                )}

                {lastSubmission.testCasesPassed !== undefined && lastSubmission.totalTestCases !== undefined && (
                  <Text style={[s.testResults, { color: colors.textSecondary }]}>
                    {lastSubmission.testCasesPassed}/{lastSubmission.totalTestCases} test cases passed
                  </Text>
                )}

                {lastSubmission.executionTime && (
                  <Text style={[s.executionInfo, { color: colors.textMuted }]}>
                    Time: {lastSubmission.executionTime}ms
                    {lastSubmission.memoryUsed ? ` · Memory: ${lastSubmission.memoryUsed}KB` : ''}
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        {/* ═══════════════════════════════════
            TAB: SUBMISSIONS
        ═══════════════════════════════════ */}
        {activeTab === 'submissions' && (
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <View style={s.cardHeaderRow}>
              <Feather name="send" size={24} color={colors.indigo} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Your Submissions</Text>
                <Text style={[s.cardDesc, { color: colors.textMuted }]}>
                  Track your coding journey and see your progress.
                </Text>
              </View>
            </View>

            {submissionsLoading ? (
              <ActivityIndicator size="large" color={colors.indigo} style={{ marginVertical: 30 }} />
            ) : submissions.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 40 }}>🚀</Text>
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No Submissions Yet</Text>
                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>Start solving problems to see your submissions here!</Text>
              </View>
            ) : (
              submissions.map(submission => (
                <View key={submission._id} style={[s.submissionCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <View style={s.submissionTop}>
                    <Text style={[s.submissionTime, { color: colors.textMuted }]}>
                      {new Date(submission.submittedAt).toLocaleString()}
                    </Text>
                    <View style={[s.statusBadge, { backgroundColor: getStatusColor(submission.status) + '20' }]}>
                      <Feather name={getStatusIcon(submission.status)} size={12} color={getStatusColor(submission.status)} />
                      <Text style={[s.statusText, { color: getStatusColor(submission.status) }]}>
                        {(submission.status || 'unknown').replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[s.submissionLang, { color: colors.textSecondary }]}>
                    {submission.language.toUpperCase()}
                  </Text>
                  {submission.testCasesPassed !== undefined && submission.totalTestCases !== undefined && (
                    <Text style={[s.testResults, { color: colors.textPrimary }]}>
                      {submission.testCasesPassed}/{submission.totalTestCases} tests passed
                    </Text>
                  )}
                  {submission.executionTime && (
                    <Text style={[s.executionInfo, { color: colors.textMuted }]}>
                      {submission.executionTime}ms · {submission.memoryUsed || 0}KB
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ═══════════════════════════════════
            TAB: PROGRESS
        ═══════════════════════════════════ */}
        {activeTab === 'progress' && (
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <View style={s.cardHeaderRow}>
              <Feather name="trending-up" size={24} color={colors.indigo} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Your Progress</Text>
                <Text style={[s.cardDesc, { color: colors.textMuted }]}>
                  Track your coding achievements and streaks.
                </Text>
              </View>
            </View>

            {progressLoading ? (
              <ActivityIndicator size="large" color={colors.indigo} style={{ marginVertical: 30 }} />
            ) : progress ? (
              <View style={s.progressStats}>
                <View style={s.statGrid}>
                  <View style={[s.statCard, { backgroundColor: colors.bg }]}>
                    <Text style={[s.statNumber, { color: colors.indigo }]}>{progress.totalProblemsSolved}</Text>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>Problems Solved</Text>
                  </View>
                  <View style={[s.statCard, { backgroundColor: colors.bg }]}>
                    <Text style={[s.statNumber, { color: colors.indigo }]}>{progress.currentStreak}</Text>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>Current Streak</Text>
                  </View>
                  <View style={[s.statCard, { backgroundColor: colors.bg }]}>
                    <Text style={[s.statNumber, { color: colors.indigo }]}>{progress.maxStreak}</Text>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>Max Streak</Text>
                  </View>
                </View>

                <View style={s.difficultyBreakdown}>
                  <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Difficulty Breakdown</Text>
                  <View style={s.difficultyRow}>
                    <View style={s.difficultyItem}>
                      <View style={[s.difficultyDot, { backgroundColor: '#22c55e' }]} />
                      <Text style={[s.difficultyCount, { color: colors.textPrimary }]}>
                        Easy: {progress.easyCount}
                      </Text>
                    </View>
                    <View style={s.difficultyItem}>
                      <View style={[s.difficultyDot, { backgroundColor: '#f59e0b' }]} />
                      <Text style={[s.difficultyCount, { color: colors.textPrimary }]}>
                        Medium: {progress.mediumCount}
                      </Text>
                    </View>
                    <View style={s.difficultyItem}>
                      <View style={[s.difficultyDot, { backgroundColor: '#ef4444' }]} />
                      <Text style={[s.difficultyCount, { color: colors.textPrimary }]}>
                        Hard: {progress.hardCount}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 40 }}>📊</Text>
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No Progress Yet</Text>
                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>Start solving problems to track your progress!</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 110 },

  tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 10, gap: 8, marginBottom: 16 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.card },
  tabBtnText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },

  card: { borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 19, marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 10 },
  emptyDesc: { fontSize: 13, marginTop: 4, textAlign: 'center' },

  problemCard: { borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1 },
  problemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  problemTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 10 },
  difficultyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  difficultyText: { fontSize: 10, fontWeight: 'bold' },
  problemMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  problemTags: { fontSize: 12, flex: 1 },
  difficultyToggle: { padding: 4 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 14 },
  backBtnText: { fontSize: 14, fontWeight: '600' },

  problemDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  problemDetailTitle: { fontSize: 20, fontWeight: '700', flex: 1, marginRight: 10 },
  problemDescription: { fontSize: 15, lineHeight: 22, marginBottom: 20 },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  examplesSection: { marginBottom: 20 },
  exampleBox: { padding: 12, borderRadius: 8, marginBottom: 8 },
  exampleLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  exampleText: { fontSize: 13, fontFamily: 'monospace', marginBottom: 8 },

  constraintsSection: { marginBottom: 20 },
  constraintText: { fontSize: 13, lineHeight: 19, marginBottom: 4 },

  languageSelector: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  languageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.border },
  languageText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },

  codeInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 13, fontFamily: 'monospace', minHeight: 200, marginBottom: 16 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  submitBtnText: { fontSize: 15, fontWeight: '700' },

  submissionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  testResults: { fontSize: 13, marginTop: 4 },
  executionInfo: { fontSize: 12, marginTop: 2 },

  submissionCard: { borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
  submissionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  submissionTime: { fontSize: 12 },
  submissionLang: { fontSize: 13, fontWeight: '600' },

  progressStats: { gap: 20 },
  statGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12 },
  statNumber: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 12, textAlign: 'center' },

  difficultyBreakdown: { marginTop: 8 },
  difficultyRow: { gap: 16 },
  difficultyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  difficultyDot: { width: 8, height: 8, borderRadius: 4 },
  difficultyCount: { fontSize: 14, fontWeight: '600' },
});