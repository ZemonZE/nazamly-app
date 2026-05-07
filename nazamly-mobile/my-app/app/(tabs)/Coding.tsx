import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/constants/theme';

type CodeSubmission = { _id: string; status: string; submittedAt: string; language: string; testCasesPassed?: number; totalTestCases?: number; executionTime?: number; memoryUsed?: number };
type StudentProgress = { totalProblemsSolved: number; currentStreak: number; maxStreak: number; easyCount: number; mediumCount: number; hardCount: number };
import { API_URL } from '@/firebase';

const getSubmissions = async (token: string) => {
  const res = await fetch(`${API_URL}/api/coding/submissions`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json().then(d => d.data || d);
};
const getProgress = async (token: string) => {
  const res = await fetch(`${API_URL}/api/coding/progress`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json().then(d => d.data || d);
};

const { width: SCREEN_W } = Dimensions.get('window');

const getStatusColor = (status: string) => {
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

const getStatusIcon = (status: string) => {
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

  const [activeTab, setActiveTab] = useState<'submissions' | 'progress'>('submissions');

  // Submissions
  const [submissions, setSubmissions] = useState<CodeSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // Progress
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // Load Submissions on mount and tab switch
  useEffect(() => {
    if (activeTab === 'submissions' && user) loadSubmissions();
  }, [activeTab, user]);

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

  // Load Progress on tab switch
  useEffect(() => {
    if (activeTab === 'progress' && user) loadProgress();
  }, [activeTab, user]);

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

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* Tab Bar */}
      <View style={s.tabBar}>
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
                        {submission.status.replace('_', ' ').toUpperCase()}
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