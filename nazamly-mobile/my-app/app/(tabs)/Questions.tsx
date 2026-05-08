import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  ActivityIndicator, TextInput,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/constants/theme';
import { API_URL } from '@/firebase';

type CourseMaterial = { courseId: string; courseCode: string; courseName: string };
type DriveFile = { id: string; name: string };

const getMyCoursesMaterials = async (token: string) => {
  const res = await fetch(`${API_URL}/api/course-materials/my-courses`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to load courses');
  return json.courses || [];
};

const getSubFolderFiles = async (courseCode: string, subFolderType: string, token: string) => {
  const safeCode = encodeURIComponent(courseCode);
  const res = await fetch(`${API_URL}/api/course-materials/${safeCode}/files/${subFolderType}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to load materials');
  return { files: json.files || [] };
};

const getQuizHistory = async (token: string) => {
  const res = await fetch(`${API_URL}/api/student/quizzes/history`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to load history');
  return { history: json.history || json.data || [] };
};

const getArchiveQuestions = async (
  courseId: string,
  lectureIds: string[],
  token: string,
) => {
  const url = `${API_URL}/api/questions/archive?courseId=${courseId}&lectureId=${lectureIds.join(",")}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch archive");
  return { midterms: json.midterms || [], finals: json.finals || [] };
};

const generateExamStream = async (opts: any, token: string, onStatus: (s: string) => void) => {
  const query = new URLSearchParams({
    courseId: opts.courseId,
    materialFileIds: opts.materialFileIds?.join(',') || '',
    examType: opts.examType || 'Quiz',
    questionCount: String(opts.questionCount || 10)
  }).toString();
  
  onStatus('Connecting to AI engine...');
  const res = await fetch(`${API_URL}/api/questions/generate-stream?${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) throw new Error('Failed to generate exam');
  
  // The backend returns SSE format: "data: {...}\n\n"
  // Parse each SSE event to extract the JSON payloads
  const text = await res.text();
  const events = text.split('\n\n').filter(Boolean);
  
  for (const event of events) {
    const dataLine = event.replace(/^data:\s*/m, '').trim();
    if (!dataLine) continue;
    try {
      const parsed = JSON.parse(dataLine);
      if (parsed.status === 'generating') {
        onStatus(parsed.message || 'Generating questions...');
      } else if (parsed.status === 'ready' && parsed.questions) {
        return parsed.questions;
      } else if (parsed.success === false) {
        throw new Error(parsed.message || 'Generation failed');
      }
    } catch (e: any) {
      if (e.message && e.message !== 'Generation failed' && !e.message.includes('JSON')) {
        throw e;
      }
    }
  }
  return [];
};

const submitQuiz = async (data: any, token: string) => {
  const res = await fetch(`${API_URL}/api/student/quizzes/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  return json.data || json;
};


// ── Exam config (matches frontend) ──
const EXAM_CONFIG: Record<string, { total: number; mcq: number; tf: number }> = {
  Quiz:    { total: 10, mcq: 5,  tf: 5  },
  Midterm: { total: 20, mcq: 10, tf: 10 },
  Final:   { total: 60, mcq: 30, tf: 30 },
};

// ── Difficulty helpers ──
const getDifficultyLabel = (level: number) => {
  if (level <= 2) return 'Easy';
  if (level <= 3) return 'Medium';
  return 'Hard';
};

const getDifficultyColor = (level: number) => {
  if (level <= 2) return '#22c55e';
  if (level <= 3) return '#f59e0b';
  return '#ef4444';
};

interface AIQuestion {
  _id?: string;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  type?: 'mcq' | 'tf' | 'essay' | 'short';
  difficulty?: number;
  derivedFromConcept?: string;
  explanation?: string;
  isCorrect?: boolean;
  studentAnswer?: string;
  aiConfidenceScore?: number;
}

interface ArchiveQuestion {
  _id?: string;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  examType?: 'midterm' | 'final';
  year?: number;
  explanation?: string;
}

interface QuizHistoryItem {
  _id: string;
  courseId?: { courseName: string; courseCode: string };
  score: number;
  totalQuestions: number;
  createdAt: string;
  questionsSnapshot: AIQuestion[];
}

export default function QuestionsScreen() {
  const { colors } = useAppTheme();
  const { user, backendUser } = useAuth();

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'archive'>('generate');

  // ── Step 1: Courses ──
  const [courses, setCourses] = useState<CourseMaterial[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseMaterial | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  // ── Step 2: Lectures ──
  const [lectures, setLectures] = useState<DriveFile[]>([]);
  const [selectedLectures, setSelectedLectures] = useState<string[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(false);

  // ── Step 3: Exam Type ──
  const [examType, setExamType] = useState<'Quiz' | 'Midterm' | 'Final'>('Quiz');

  // ── AI Engine ──
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiUserAnswers, setAiUserAnswers] = useState<Record<number, string>>({});
  const [aiSubmitted, setAiSubmitted] = useState(false);

  // ── Quiz History ──
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedHistoryQuiz, setSelectedHistoryQuiz] = useState<QuizHistoryItem | null>(null);

  // ── Archive State ──
  const [archiveMidterms, setArchiveMidterms] = useState<ArchiveQuestion[]>([]);
  const [archiveFinals, setArchiveFinals] = useState<ArchiveQuestion[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [hasSearchedArchive, setHasSearchedArchive] = useState(false);
  const [archiveAnswers, setArchiveAnswers] = useState<Record<string, string>>({});
  const [archiveRevealed, setArchiveRevealed] = useState<Record<string, boolean>>({});

  const currentConfig = EXAM_CONFIG[examType];
  const answeredCount = Object.keys(aiUserAnswers).length;
  const totalQuestions = aiQuestions.length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  // ── Load Courses ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      setCoursesLoading(true);
      setCoursesError(null);
      try {
        const token = await user.getIdToken();
        const materials = await getMyCoursesMaterials(token);
        const materialMap = new Map((materials || []).map((c: any) => [c.courseCode, c]));

        if (backendUser?.termCourses && backendUser.termCourses.length > 0) {
          const mapped = backendUser.termCourses.map((c: any) => {
            const match = materialMap.get(c.courseCode);
            return match || {
              courseId: c._id || c.courseCode,
              courseCode: c.courseCode,
              courseName: c.name || c.courseName,
            };
          });
          setCourses(mapped);
        } else {
          setCourses(materials || []);
        }
      } catch (err: any) {
        setCoursesError(err.message || 'Failed to load courses');
      } finally {
        setCoursesLoading(false);
      }
    })();
  }, [user, backendUser]);

  // ── Load History when tab switches ──
  useEffect(() => {
    if (activeTab === 'history' && user) loadHistory();
  }, [activeTab]);

  const loadHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const token = await user.getIdToken();
      const response = await getQuizHistory(token);
      setQuizHistory(response.history || []);
    } catch (err: any) {
      setHistoryError(err.message || 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Handle Course Selection ──
  const handleCourseSelect = async (course: CourseMaterial) => {
    if (!user) return;
    setSelectedCourse(course);
    setSelectedLectures([]);
    setLectures([]);
    setAiQuestions([]);
    setArchiveMidterms([]);
    setArchiveFinals([]);
    setHasSearchedArchive(false);
    setArchiveAnswers({});
    setArchiveRevealed({});

    setLoadingLectures(true);
    try {
      const token = await user.getIdToken();
      const res = await getSubFolderFiles(course.courseCode, 'lectures', token);
      setLectures(res.files || []);
    } catch (err) {
      console.error('Failed to fetch lectures:', err);
    } finally {
      setLoadingLectures(false);
    }
  };

  const toggleLecture = (lectureId: string) => {
    setSelectedLectures(prev =>
      prev.includes(lectureId) ? prev.filter(id => id !== lectureId) : [...prev, lectureId],
    );
  };

  // ── Fetch Archive ──
  const handleFetchArchive = async () => {
    if (!user || !selectedCourse || selectedLectures.length === 0) return;
    setArchiveLoading(true);
    setArchiveError(null);
    setHasSearchedArchive(true);
    setArchiveMidterms([]);
    setArchiveFinals([]);
    setArchiveAnswers({});
    setArchiveRevealed({});
    try {
      const token = await user.getIdToken();
      const response = await getArchiveQuestions(selectedCourse.courseId, selectedLectures, token);
      setArchiveMidterms(response.midterms || []);
      setArchiveFinals(response.finals || []);
    } catch (err: any) {
      setArchiveError(err.message || 'Failed to fetch archive');
    } finally {
      setArchiveLoading(false);
    }
  };

  // ── Generate Exam (SSE fetch) ──
  const handleGenerateExam = useCallback(async () => {
    if (!selectedCourse || selectedLectures.length === 0 || !user) return;

    setAiLoading(true);
    setAiQuestions([]);
    setAiStatusMessage('Connecting to AI engine...');
    setAiError(null);
    setAiUserAnswers({});
    setAiSubmitted(false);

    try {
      const token = await user.getIdToken();
      const questions = await generateExamStream(
        {
          courseId: selectedCourse.courseId,
          examType,
          questionCount: currentConfig.total,
          materialFileIds: selectedLectures,
        },
        token,
        (status) => setAiStatusMessage(status)
      );

      if (questions.length > 0) {
        setAiQuestions(questions);
      } else {
        throw new Error('No questions generated');
      }
    } catch (err: any) {
      setAiError(err.message || 'Connection lost. Please try again.');
    } finally {
      setAiLoading(false);
      setAiStatusMessage('');
    }
  }, [selectedCourse, selectedLectures, examType, currentConfig, user]);

  // ── Select Answer ──
  const handleSelectAnswer = (questionIdx: number, option: string) => {
    if (aiSubmitted) return;
    setAiUserAnswers(prev => ({ ...prev, [questionIdx]: option }));
  };

  // ── Submit Exam ──
  const handleSubmitExam = async () => {
    if (!user || !selectedCourse) return;
    setAiLoading(true);
    setAiStatusMessage('Grading your exam...');

    const questionsSnapshot = aiQuestions.map((q, idx) => {
      const studentAnswer = aiUserAnswers[idx] || '';
      const isCorrect = studentAnswer === q.correctAnswer;
      return {
        questionText: q.questionText,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        studentAnswer,
        isCorrect,
        explanation: '',
        difficulty: q.difficulty || null,
        derivedFromConcept: q.derivedFromConcept || null,
      };
    });

    try {
      const token = await user.getIdToken();
      const response = await submitQuiz(
        {
          courseId: selectedCourse.courseId,
          totalQuestions: aiQuestions.length,
          questionsSnapshot,
        },
        token
      );

      if (response.attempt?.questionsSnapshot) {
        setAiQuestions(response.attempt.questionsSnapshot);
      }
      setAiSubmitted(true);
    } catch (err: any) {
      console.error('Failed to submit exam:', err);
    } finally {
      setAiLoading(false);
      setAiStatusMessage('');
    }
  };

  const handleReset = () => {
    setAiQuestions([]);
    setAiUserAnswers({});
    setAiSubmitted(false);
    setAiError(null);
    setAiStatusMessage('');
  };

  // ── Score calculation ──
  const aiScore = aiSubmitted
    ? aiQuestions.reduce((acc, q, idx) => {
        if (q.hasOwnProperty('isCorrect')) return q.isCorrect ? acc + 1 : acc;
        return aiUserAnswers[idx] === q.correctAnswer ? acc + 1 : acc;
      }, 0)
    : 0;
  const aiScorePercent = aiSubmitted && aiQuestions.length > 0 ? Math.round((aiScore / aiQuestions.length) * 100) : 0;

  const isTFArchiveQuestion = (q: ArchiveQuestion) => {
    if (!q.options || q.options.length !== 2) return false;
    const normalized = q.options.map(opt => opt.toLowerCase().trim());
    return normalized.includes('true') && normalized.includes('false');
  };

  const handleArchiveSelectAnswer = (key: string, option: string) => {
    if (archiveAnswers[key] !== undefined) return;
    setArchiveAnswers(prev => ({ ...prev, [key]: option }));
  };

  const handleArchiveReveal = (key: string) => {
    setArchiveRevealed(prev => ({ ...prev, [key]: true }));
  };

  const isArchiveQuestionResolved = (key: string) =>
    archiveAnswers[key] !== undefined || archiveRevealed[key] === true;

  const getArchiveOptionStyle = (key: string, option: string, correctAnswer?: string) => {
    const resolved = isArchiveQuestionResolved(key);
    const selected = archiveAnswers[key];
    if (!resolved) return {};
    if (option === correctAnswer) return { backgroundColor: '#22c55e20', borderColor: '#22c55e' };
    if (selected === option && option !== correctAnswer) return { backgroundColor: '#ef444420', borderColor: '#ef4444' };
    return {};
  };

  // ── Option styling ──
  const getOptionStyle = (q: AIQuestion, option: string, qIdx: number) => {
    const selected = aiUserAnswers[qIdx];
    if (!aiSubmitted) {
      return selected === option ? { backgroundColor: colors.indigo + '20', borderColor: colors.indigo } : {};
    }
    if (option === q.correctAnswer) return { backgroundColor: '#22c55e20', borderColor: '#22c55e' };
    if (selected === option && selected !== q.correctAnswer) return { backgroundColor: '#ef444420', borderColor: '#ef4444' };
    return {};
  };

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* ── Tab Bar ── */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'generate' && { backgroundColor: colors.indigo }]}
          onPress={() => setActiveTab('generate')}
        >
          <MaterialCommunityIcons name="brain" size={16} color={activeTab === 'generate' ? '#fff' : colors.textMuted} />
          <Text style={[s.tabBtnText, activeTab === 'generate' && { color: '#fff' }]}>AI Exam</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'history' && { backgroundColor: colors.indigo }]}
          onPress={() => setActiveTab('history')}
        >
          <Feather name="award" size={16} color={activeTab === 'history' ? '#fff' : colors.textMuted} />
          <Text style={[s.tabBtnText, activeTab === 'history' && { color: '#fff' }]}>My Quizzes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'archive' && { backgroundColor: colors.indigo }]}
          onPress={() => setActiveTab('archive')}
        >
          <MaterialCommunityIcons name="archive" size={16} color={activeTab === 'archive' ? '#fff' : colors.textMuted} />
          <Text style={[s.tabBtnText, activeTab === 'archive' && { color: '#fff' }]}>Archive</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ═══════════════════════════════════
            TAB: GENERATE AI EXAM
        ═══════════════════════════════════ */}
        {activeTab === 'generate' && (
          <>
            {/* Configuration (only when no questions yet) */}
            {!aiLoading && aiQuestions.length === 0 && !aiError && (
              <View style={[s.card, { backgroundColor: colors.card }]}>
                <View style={s.cardHeaderRow}>
                  <MaterialCommunityIcons name="brain" size={24} color={colors.indigo} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Smart Exams</Text>
                    <Text style={[s.cardDesc, { color: colors.textMuted }]}>
                      AI-generated questions based on your course materials.
                    </Text>
                  </View>
                </View>

                {/* Step 1: Course */}
                <Text style={[s.stepLabel, { color: colors.textSecondary }]}>
                  <Text style={s.stepNum}>1</Text>  Select Course
                </Text>
                {coursesLoading ? (
                  <ActivityIndicator size="small" color={colors.indigo} style={{ marginVertical: 10 }} />
                ) : coursesError ? (
                  <Text style={{ color: '#ef4444', padding: 10 }}>{coursesError}</Text>
                ) : courses.length === 0 ? (
                  <Text style={{ color: colors.textMuted, padding: 10 }}>No courses available.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.courseScroll}>
                    {courses.map(c => (
                      <TouchableOpacity
                        key={c.courseId}
                        style={[s.courseChip, selectedCourse?.courseId === c.courseId && { backgroundColor: colors.indigo, borderColor: colors.indigo }]}
                        onPress={() => handleCourseSelect(c)}
                      >
                        <Text style={[s.courseChipText, selectedCourse?.courseId === c.courseId && { color: '#fff' }]} numberOfLines={1}>
                          {c.courseCode}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* Step 2: Lectures */}
                {selectedCourse && (
                  <>
                    <Text style={[s.stepLabel, { color: colors.textSecondary, marginTop: 18 }]}>
                      <Text style={s.stepNum}>2</Text>  Select Materials
                      {!loadingLectures && <Text style={s.countBadge}>  {selectedLectures.length} selected</Text>}
                    </Text>
                    {loadingLectures ? (
                      <ActivityIndicator size="small" color={colors.indigo} style={{ marginVertical: 10 }} />
                    ) : lectures.length === 0 ? (
                      <Text style={{ color: colors.textMuted, padding: 10 }}>No lectures found.</Text>
                    ) : (
                      <View style={s.lectureGrid}>
                        {lectures.map(lec => {
                          const isSelected = selectedLectures.includes(lec.id);
                          return (
                            <TouchableOpacity
                              key={lec.id}
                              style={[s.lectureCard, isSelected && { backgroundColor: colors.indigo + '15', borderColor: colors.indigo }]}
                              onPress={() => toggleLecture(lec.id)}
                            >
                              <View style={[s.lectureCheck, isSelected && { backgroundColor: colors.indigo }]}>
                                {isSelected && <Feather name="check" size={12} color="#fff" />}
                              </View>
                              <Text style={[s.lectureName, { color: colors.textPrimary }]} numberOfLines={2}>{lec.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}

                {/* Step 3: Exam Type */}
                {selectedLectures.length > 0 && (
                  <>
                    <Text style={[s.stepLabel, { color: colors.textSecondary, marginTop: 18 }]}>
                      <Text style={s.stepNum}>3</Text>  Challenge Mode
                    </Text>
                    <View style={s.examTypeRow}>
                      {(['Quiz', 'Midterm', 'Final'] as const).map(t => {
                        const cfg = EXAM_CONFIG[t];
                        return (
                          <TouchableOpacity
                            key={t}
                            style={[s.examTypeBtn, examType === t && { backgroundColor: colors.indigo, borderColor: colors.indigo }]}
                            onPress={() => setExamType(t)}
                          >
                            <Text style={[s.examTypeName, examType === t && { color: '#fff' }]}>{t}</Text>
                            <Text style={[s.examTypeMeta, examType === t && { color: 'rgba(255,255,255,0.7)' }]}>
                              {cfg.total}Q · {cfg.mcq}MCQ + {cfg.tf}T/F
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Generate Button */}
                    <TouchableOpacity style={[s.generateBtn, { backgroundColor: colors.indigo }]} onPress={handleGenerateExam}>
                      <MaterialCommunityIcons name="auto-fix" size={20} color="#fff" />
                      <Text style={s.generateBtnText}>Generate My Exam</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Loading */}
            {aiLoading && (
              <View style={s.loadingSection}>
                <ActivityIndicator size="large" color={colors.indigo} />
                <Text style={[s.loadingTitle, { color: colors.textPrimary }]}>Generating Your Exam</Text>
                <Text style={[s.loadingMsg, { color: colors.textMuted }]}>{aiStatusMessage}</Text>
              </View>
            )}

            {/* Error */}
            {aiError && !aiLoading && aiQuestions.length === 0 && (
              <View style={[s.card, { backgroundColor: colors.card, alignItems: 'center' }]}>
                <Feather name="alert-triangle" size={36} color="#ef4444" />
                <Text style={[s.errorTitle, { color: colors.textPrimary }]}>Generation Failed</Text>
                <Text style={[s.errorMsg, { color: colors.textMuted }]}>{aiError}</Text>
                <TouchableOpacity style={[s.retryBtn, { backgroundColor: colors.indigo }]} onPress={handleReset}>
                  <Text style={s.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Exam Engine ── */}
            {aiQuestions.length > 0 && (
              <>
                {/* Score card (after submit) */}
                {aiSubmitted && (
                  <View style={[s.scoreCard, { backgroundColor: colors.indigo }]}>
                    <Text style={s.scoreEmoji}>{aiScorePercent >= 85 ? '🏆' : aiScorePercent >= 60 ? '👍' : '💪'}</Text>
                    <Text style={s.scoreTitle}>Result Summary</Text>
                    <Text style={s.scoreValue}>{aiScorePercent}%</Text>
                    <Text style={s.scoreDetail}>Correct: {aiScore} / {aiQuestions.length}</Text>
                    <TouchableOpacity style={s.newExamBtn} onPress={handleReset}>
                      <MaterialCommunityIcons name="auto-fix" size={16} color={colors.indigo} />
                      <Text style={[s.newExamBtnText, { color: colors.indigo }]}>Generate Another</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Progress (before submit) */}
                {!aiSubmitted && (
                  <View style={[s.progressBar, { backgroundColor: colors.card }]}>
                    <Text style={[s.progressText, { color: colors.textPrimary }]}>{answeredCount}/{totalQuestions} Answered</Text>
                    <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
                      <View style={[s.progressFill, { backgroundColor: colors.indigo, width: `${totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0}%` as any }]} />
                    </View>
                  </View>
                )}

                {/* Questions */}
                {aiQuestions.map((q, idx) => {
                  const isTF = q.type === 'tf';
                  return (
                    <View key={q._id || idx} style={[s.questionCard, { backgroundColor: colors.card }]}>
                      {/* Header badges */}
                      <View style={s.qBadgeRow}>
                        {q.difficulty != null && (
                          <View style={[s.diffBadge, { backgroundColor: getDifficultyColor(q.difficulty) + '18' }]}>
                            <Text style={[s.diffBadgeText, { color: getDifficultyColor(q.difficulty) }]}>{getDifficultyLabel(q.difficulty)}</Text>
                          </View>
                        )}
                        <View style={[s.typeBadge, { backgroundColor: isTF ? '#14b8a618' : '#6366f118' }]}>
                          <Text style={[s.typeBadgeText, { color: isTF ? '#14b8a6' : '#6366f1' }]}>{isTF ? 'True / False' : 'MCQ'}</Text>
                        </View>
                      </View>

                      <Text style={[s.qNumber, { color: colors.textMuted }]}>
                        Q{idx + 1}{q.derivedFromConcept ? ` · ${q.derivedFromConcept}` : ''}
                      </Text>
                      <Text style={[s.qText, { color: colors.textPrimary }]}>{q.questionText}</Text>

                      {/* Options */}
                      {q.options && q.options.length > 0 ? (
                        <View style={s.optionsGrid}>
                          {q.options.map((option, optIdx) => (
                            <TouchableOpacity
                              key={optIdx}
                              style={[s.optionBtn, { borderColor: colors.border }, getOptionStyle(q, option, idx)]}
                              onPress={() => handleSelectAnswer(idx, option)}
                              disabled={aiSubmitted}
                            >
                              <View style={[s.optionLetter, {
                                backgroundColor: aiUserAnswers[idx] === option ? colors.indigo : colors.border,
                              }]}>
                                <Text style={[s.optionLetterText, {
                                  color: aiUserAnswers[idx] === option ? '#fff' : colors.textMuted,
                                }]}>
                                  {isTF ? (option === 'True' ? 'T' : 'F') : String.fromCharCode(65 + optIdx)}
                                </Text>
                              </View>
                              <Text style={[s.optionText, { color: colors.textPrimary }]}>{option}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <View style={s.essayBox}>
                          <TextInput
                            style={[s.essayInput, { color: colors.textPrimary, borderColor: colors.border }]}
                            value={aiUserAnswers[idx] || ''}
                            onChangeText={(text) => handleSelectAnswer(idx, text)}
                            multiline
                            editable={!aiSubmitted}
                            placeholder="Type your answer here..."
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>
                      )}

                      {/* Explanation (after submit) */}
                      {aiSubmitted && q.explanation && (
                        <View style={[s.explanationBox, { backgroundColor: colors.bg }]}>
                          <Text style={[s.explanationTitle, { color: colors.textPrimary }]}>💡 Explanation</Text>
                          <Text style={[s.explanationText, { color: colors.textSecondary }]}>{q.explanation}</Text>
                          <Text style={[s.correctAnswerText, { color: colors.indigo }]}>Correct: {q.correctAnswer}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Submit button */}
                {!aiSubmitted && (
                  <TouchableOpacity
                    style={[s.submitBtn, { backgroundColor: allAnswered ? colors.indigo : colors.border, opacity: allAnswered ? 1 : 0.6 }]}
                    onPress={handleSubmitExam}
                    disabled={!allAnswered}
                  >
                    <Feather name={allAnswered ? 'check-circle' : 'alert-circle'} size={18} color={allAnswered ? '#fff' : colors.textMuted} />
                    <Text style={[s.submitBtnText, { color: allAnswered ? '#fff' : colors.textMuted }]}>
                      {allAnswered ? 'Submit Exam' : `Answer All (${answeredCount}/${totalQuestions})`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}

        {/* ═══════════════════════════════════
            TAB: QUIZ HISTORY
        ═══════════════════════════════════ */}
        {activeTab === 'history' && !selectedHistoryQuiz && (
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <View style={s.cardHeaderRow}>
              <Feather name="award" size={24} color={colors.indigo} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>My Quizzes</Text>
                <Text style={[s.cardDesc, { color: colors.textMuted }]}>Review your past AI-generated quizzes.</Text>
              </View>
            </View>

            {historyLoading ? (
              <ActivityIndicator size="large" color={colors.indigo} style={{ marginVertical: 30 }} />
            ) : historyError ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 36 }}>⚠️</Text>
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Failed to load history</Text>
                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>{historyError}</Text>
              </View>
            ) : quizHistory.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 40 }}>🌟</Text>
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No Quizzes Yet</Text>
                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>Generate and complete a quiz to see it here!</Text>
              </View>
            ) : (
              quizHistory.map(attempt => (
                <TouchableOpacity
                  key={attempt._id}
                  style={[s.historyCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
                  onPress={() => setSelectedHistoryQuiz(attempt)}
                >
                  <View style={s.historyTop}>
                    <Text style={[s.historyDate, { color: colors.textMuted }]}>{new Date(attempt.createdAt).toLocaleDateString()}</Text>
                    <Text style={[s.historyScore, { color: colors.indigo }]}>
                      {attempt.score}/{attempt.totalQuestions}
                    </Text>
                  </View>
                  <Text style={[s.historyCourseName, { color: colors.textPrimary }]}>
                    {attempt.courseId?.courseName || 'Unknown Course'}
                  </Text>
                  <Text style={[s.historyCourseCode, { color: colors.textMuted }]}>
                    {attempt.courseId?.courseCode || ''}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Quiz Review */}
        {selectedHistoryQuiz && activeTab === 'history' && (
          <>
            <TouchableOpacity style={[s.backBtn, { backgroundColor: colors.card }]} onPress={() => setSelectedHistoryQuiz(null)}>
              <Feather name="arrow-left" size={18} color={colors.textPrimary} />
              <Text style={[s.backBtnText, { color: colors.textPrimary }]}>Back to Quizzes</Text>
            </TouchableOpacity>

            <View style={[s.scoreCard, { backgroundColor: colors.indigo }]}>
              <Text style={s.scoreEmoji}>
                {Math.round((selectedHistoryQuiz.score / selectedHistoryQuiz.totalQuestions) * 100) >= 85 ? '🏆' : '💪'}
              </Text>
              <Text style={s.scoreTitle}>{selectedHistoryQuiz.courseId?.courseName || 'Quiz Review'}</Text>
              <Text style={s.scoreValue}>
                {Math.round((selectedHistoryQuiz.score / selectedHistoryQuiz.totalQuestions) * 100)}%
              </Text>
              <Text style={s.scoreDetail}>
                {selectedHistoryQuiz.score}/{selectedHistoryQuiz.totalQuestions} Correct · {new Date(selectedHistoryQuiz.createdAt).toLocaleDateString()}
              </Text>
            </View>

                {selectedHistoryQuiz.questionsSnapshot.map((q, idx) => (
              <View key={q._id || idx} style={[s.questionCard, { backgroundColor: colors.card }]}>
                <Text style={[s.qNumber, { color: colors.textMuted }]}>Q{idx + 1}</Text>
                <Text style={[s.qText, { color: colors.textPrimary }]}>{q.questionText}</Text>
                {q.options && q.options.length > 0 && (
                  <View style={s.optionsGrid}>
                    {q.options.map((option, optIdx) => {
                      let bg = {};
                      if (option === q.correctAnswer) bg = { backgroundColor: '#22c55e20', borderColor: '#22c55e' };
                      else if (option === q.studentAnswer && option !== q.correctAnswer) bg = { backgroundColor: '#ef444420', borderColor: '#ef4444' };
                      return (
                        <View key={optIdx} style={[s.optionBtn, { borderColor: colors.border }, bg]}>
                          <View style={[s.optionLetter, { backgroundColor: colors.border }]}>
                            <Text style={[s.optionLetterText, { color: colors.textMuted }]}>{String.fromCharCode(65 + optIdx)}</Text>
                          </View>
                          <Text style={[s.optionText, { color: colors.textPrimary }]}>{option}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                {q.explanation && (
                  <View style={[s.explanationBox, { backgroundColor: colors.bg }]}>
                    <Text style={[s.explanationText, { color: colors.textSecondary }]}>{q.explanation}</Text>
                    {q.correctAnswer && <Text style={[s.correctAnswerText, { color: colors.indigo }]}>Correct: {q.correctAnswer}</Text>}
                  </View>
                )}
                {!q.options || q.options.length === 0 ? (
                  <View style={[s.explanationBox, { backgroundColor: colors.bg }]}>
                    <Text style={[s.explanationTitle, { color: colors.textPrimary }]}>Your Answer</Text>
                    <Text style={[s.explanationText, { color: colors.textSecondary }]}>
                      {q.studentAnswer || 'No answer provided'}
                    </Text>
                    {q.correctAnswer && (
                      <Text style={[s.correctAnswerText, { color: colors.indigo }]}>Expected: {q.correctAnswer}</Text>
                    )}
                  </View>
                ) : null}
              </View>
            ))}
          </>
        )}

        {/* ═══════════════════════════════════
            TAB: ARCHIVE
        ═══════════════════════════════════ */}
        {activeTab === 'archive' && (
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <View style={s.cardHeaderRow}>
              <MaterialCommunityIcons name="archive" size={24} color={colors.indigo} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Past Exams Archive</Text>
                <Text style={[s.cardDesc, { color: colors.textMuted }]}>Review midterm and final questions.</Text>
              </View>
            </View>

            {/* Course selection */}
            <Text style={[s.stepLabel, { color: colors.textSecondary }]}>Select Course</Text>
            {coursesLoading ? (
              <ActivityIndicator size="small" color={colors.indigo} style={{ marginVertical: 10 }} />
            ) : courses.length === 0 ? (
              <Text style={{ color: colors.textMuted, padding: 10 }}>No courses available.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.courseScroll}>
                {courses.map(c => (
                  <TouchableOpacity
                    key={c.courseId}
                    style={[s.courseChip, selectedCourse?.courseId === c.courseId && { backgroundColor: colors.indigo, borderColor: colors.indigo }]}
                    onPress={() => handleCourseSelect(c)}
                  >
                    <Text style={[s.courseChipText, selectedCourse?.courseId === c.courseId && { color: '#fff' }]} numberOfLines={1}>
                      {c.courseCode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Lecture selection */}
            {selectedCourse && (
              <>
                <Text style={[s.stepLabel, { color: colors.textSecondary, marginTop: 18 }]}>Select Materials</Text>
                {loadingLectures ? (
                  <ActivityIndicator size="small" color={colors.indigo} style={{ marginVertical: 10 }} />
                ) : lectures.length === 0 ? (
                  <Text style={{ color: colors.textMuted, padding: 10 }}>No lectures found.</Text>
                ) : (
                  <View style={s.lectureGrid}>
                    {lectures.map(lec => {
                      const isSelected = selectedLectures.includes(lec.id);
                      return (
                        <TouchableOpacity
                          key={lec.id}
                          style={[s.lectureCard, isSelected && { backgroundColor: colors.indigo + '15', borderColor: colors.indigo }]}
                          onPress={() => toggleLecture(lec.id)}
                        >
                          <View style={[s.lectureCheck, isSelected && { backgroundColor: colors.indigo }]}>
                            {isSelected && <Feather name="check" size={12} color="#fff" />}
                          </View>
                          <Text style={[s.lectureName, { color: colors.textPrimary }]} numberOfLines={2}>{lec.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {selectedLectures.length > 0 && (
              <TouchableOpacity
                style={[s.generateBtn, { backgroundColor: colors.indigo, marginTop: 16 }]}
                onPress={handleFetchArchive}
                disabled={archiveLoading}
              >
                <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
                <Text style={s.generateBtnText}>{archiveLoading ? 'Searching...' : 'Search Archive'}</Text>
              </TouchableOpacity>
            )}

            {archiveError && (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 36 }}>⚠️</Text>
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Search Failed</Text>
                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>{archiveError}</Text>
              </View>
            )}

            {hasSearchedArchive && !archiveLoading && !archiveError && (
              <View style={{ marginTop: 16 }}>
                {archiveMidterms.length === 0 && archiveFinals.length === 0 ? (
                  <View style={s.emptyState}>
                    <Text style={{ fontSize: 40 }}>📘</Text>
                    <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No Archives Found</Text>
                    <Text style={[s.emptyDesc, { color: colors.textMuted }]}>No past exam questions for this selection.</Text>
                  </View>
                ) : (
                  <>
                    {archiveMidterms.length > 0 && (
                      <View style={{ marginBottom: 18 }}>
                        <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Midterm Questions</Text>
                        {archiveMidterms.map((q, idx) => {
                          const key = `mid-${idx}`;
                          const isTF = isTFArchiveQuestion(q);
                          const resolved = isArchiveQuestionResolved(key);
                          return (
                            <View key={q._id || key} style={[s.questionCard, { backgroundColor: colors.bg }]}> 
                              <Text style={[s.qNumber, { color: colors.textMuted }]}>Midterm Q{idx + 1} {q.year ? `· ${q.year}` : ''}</Text>
                              <Text style={[s.qText, { color: colors.textPrimary }]}>{q.questionText}</Text>
                              {q.options && q.options.length > 0 && (
                                <View style={s.optionsGrid}>
                                  {q.options.map((option, optIdx) => (
                                    <TouchableOpacity
                                      key={optIdx}
                                      style={[s.optionBtn, { borderColor: colors.border }, getArchiveOptionStyle(key, option, q.correctAnswer)]}
                                      onPress={() => handleArchiveSelectAnswer(key, option)}
                                      disabled={resolved}
                                    >
                                      <View style={[s.optionLetter, { backgroundColor: colors.border }]}>
                                        <Text style={[s.optionLetterText, { color: colors.textMuted }]}>
                                          {isTF ? (option === 'True' ? 'T' : 'F') : String.fromCharCode(65 + optIdx)}
                                        </Text>
                                      </View>
                                      <Text style={[s.optionText, { color: colors.textPrimary }]}>{option}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}
                              {!resolved && (
                                <TouchableOpacity style={[s.revealBtn, { borderColor: colors.indigo }]} onPress={() => handleArchiveReveal(key)}>
                                  <Text style={[s.revealBtnText, { color: colors.indigo }]}>Show Answer</Text>
                                </TouchableOpacity>
                              )}
                              {resolved && q.correctAnswer && (
                                <View style={[s.explanationBox, { backgroundColor: colors.card }]}>
                                  <Text style={[s.correctAnswerText, { color: colors.indigo }]}>Correct: {q.correctAnswer}</Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {archiveFinals.length > 0 && (
                      <View>
                        <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Final Questions</Text>
                        {archiveFinals.map((q, idx) => {
                          const key = `fin-${idx}`;
                          const isTF = isTFArchiveQuestion(q);
                          const resolved = isArchiveQuestionResolved(key);
                          return (
                            <View key={q._id || key} style={[s.questionCard, { backgroundColor: colors.bg }]}>
                              <Text style={[s.qNumber, { color: colors.textMuted }]}>Final Q{idx + 1} {q.year ? `· ${q.year}` : ''}</Text>
                              <Text style={[s.qText, { color: colors.textPrimary }]}>{q.questionText}</Text>
                              {q.options && q.options.length > 0 && (
                                <View style={s.optionsGrid}>
                                  {q.options.map((option, optIdx) => (
                                    <TouchableOpacity
                                      key={optIdx}
                                      style={[s.optionBtn, { borderColor: colors.border }, getArchiveOptionStyle(key, option, q.correctAnswer)]}
                                      onPress={() => handleArchiveSelectAnswer(key, option)}
                                      disabled={resolved}
                                    >
                                      <View style={[s.optionLetter, { backgroundColor: colors.border }]}>
                                        <Text style={[s.optionLetterText, { color: colors.textMuted }]}>
                                          {isTF ? (option === 'True' ? 'T' : 'F') : String.fromCharCode(65 + optIdx)}
                                        </Text>
                                      </View>
                                      <Text style={[s.optionText, { color: colors.textPrimary }]}>{option}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}
                              {!resolved && (
                                <TouchableOpacity style={[s.revealBtn, { borderColor: colors.indigo }]} onPress={() => handleArchiveReveal(key)}>
                                  <Text style={[s.revealBtnText, { color: colors.indigo }]}>Show Answer</Text>
                                </TouchableOpacity>
                              )}
                              {resolved && q.correctAnswer && (
                                <View style={[s.explanationBox, { backgroundColor: colors.card }]}>
                                  <Text style={[s.correctAnswerText, { color: colors.indigo }]}>Correct: {q.correctAnswer}</Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}
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

  stepLabel: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  stepNum: { fontSize: 14, fontWeight: '900', color: colors.indigo },
  countBadge: { fontSize: 12, fontWeight: '500' },

  courseScroll: { marginBottom: 4 },
  courseChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, marginRight: 8, backgroundColor: colors.bg },
  courseChipText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },

  lectureGrid: { gap: 6 },
  lectureCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  lectureCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  lectureName: { flex: 1, fontSize: 13, fontWeight: '500' },

  examTypeRow: { gap: 8, marginBottom: 16 },
  examTypeBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border },
  examTypeName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  examTypeMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 8, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  loadingSection: { alignItems: 'center', paddingVertical: 60 },
  loadingTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  loadingMsg: { fontSize: 13, marginTop: 6 },

  errorTitle: { fontSize: 18, fontWeight: '700', marginTop: 14 },
  errorMsg: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontWeight: '700' },

  scoreCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  scoreEmoji: { fontSize: 40, marginBottom: 8 },
  scoreTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  scoreValue: { color: '#fff', fontSize: 48, fontWeight: '900', lineHeight: 54, marginVertical: 4 },
  scoreDetail: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  newExamBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12 },
  newExamBtnText: { fontWeight: '700', fontSize: 13 },

  progressBar: { borderRadius: 14, padding: 14, marginBottom: 14 },
  progressText: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  questionCard: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  qBadgeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  diffBadgeText: { fontSize: 10, fontWeight: 'bold' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold' },
  qNumber: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  qText: { fontSize: 15, fontWeight: '600', lineHeight: 22, marginBottom: 12 },

  optionsGrid: { gap: 8 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  optionLetter: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionLetterText: { fontSize: 12, fontWeight: '800' },
  optionText: { flex: 1, fontSize: 14 },

  essayBox: { marginTop: 6 },
  essayInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 120, textAlignVertical: 'top', fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  revealBtn: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  revealBtnText: { fontSize: 12, fontWeight: '700' },

  explanationBox: { marginTop: 14, padding: 14, borderRadius: 12 },
  explanationTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  explanationText: { fontSize: 13, lineHeight: 19 },
  correctAnswerText: { fontSize: 13, fontWeight: '700', marginTop: 8 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  submitBtnText: { fontSize: 16, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 10 },
  emptyDesc: { fontSize: 13, marginTop: 4, textAlign: 'center' },

  historyCard: { borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyDate: { fontSize: 12, fontWeight: '500' },
  historyScore: { fontSize: 14, fontWeight: '800' },
  historyCourseName: { fontSize: 16, fontWeight: '700' },
  historyCourseCode: { fontSize: 12, marginTop: 2 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 14 },
  backBtnText: { fontSize: 14, fontWeight: '600' },
});