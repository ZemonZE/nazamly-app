import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/constants/theme";
import { API_URL } from "@/firebase";

type Course = {
  _id: string;
  courseCode: string;
  courseName: string;
  creditHours?: number;
  level?: number;
};

type CodeSubmission = {
  _id: string;
  verdict: "AC" | "WA" | "ERROR";
  language: string;
  createdAt: string;
  problemId?: {
    _id: string;
    title?: string;
    courseId?: { courseName?: string; courseCode?: string };
  };
};

type StudentProgress = {
  solvedCount: number;
  attemptedCount: number;
  totalCount: number;
  problems?: any[];
};

const getCodingHistory = async (token: string) => {
  const res = await fetch(`${API_URL}/api/coding/history?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(json.message || json.error || "Failed to load history");
  return json.data || [];
};

const getProgress = async (token: string, courseId: string) => {
  const res = await fetch(
    `${API_URL}/api/coding/progress?courseId=${courseId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const json = await res.json();
  if (!res.ok)
    throw new Error(json.message || json.error || "Failed to load progress");
  return json.data || json;
};

const getCourses = async (token: string) => {
  const res = await fetch(`${API_URL}/api/courses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(json.message || json.error || "Failed to load courses");
  return json.data || [];
};

const getStatusColor = (verdict: string) => {
  switch (verdict) {
    case "AC":
      return "#22c55e";
    case "WA":
      return "#f59e0b";
    case "ERROR":
      return "#ef4444";
    default:
      return "#6b7280";
  }
};

const getStatusIcon = (verdict: string) => {
  switch (verdict) {
    case "AC":
      return "check-circle";
    case "WA":
      return "x-circle";
    case "ERROR":
      return "alert-triangle";
    default:
      return "help-circle";
  }
};

export default function CodingScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [activeTab, setActiveTab] = useState<"submissions" | "progress">(
    "submissions",
  );

  const [submissions, setSubmissions] = useState<CodeSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyFailed, setVerifyFailed] = useState(false);

  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  useEffect(() => {
    if (!user) return;
    const loadCourses = async () => {
      setCoursesLoading(true);
      try {
        const token = await user.getIdToken();
        const list = await getCourses(token);
        setCourses(list);
        if (!selectedCourseId && list.length > 0)
          setSelectedCourseId(list[0]._id);
      } catch (err: any) {
        if (err.message?.includes("Email verification required")) {
          setIsLocked(true);
        }
        console.error("Failed to load courses:", err);
      } finally {
        setCoursesLoading(false);
      }
    };
    loadCourses();
  }, [user]);

  useEffect(() => {
    if (activeTab === "submissions" && user) loadSubmissions();
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === "progress" && user && selectedCourseId) loadProgress();
  }, [activeTab, user, selectedCourseId]);

  const loadSubmissions = async () => {
    if (!user) return;
    setSubmissionsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await getCodingHistory(token);
      setSubmissions(response || []);
    } catch (err: any) {
      if (err.message?.includes("Email verification required")) {
        setIsLocked(true);
      }
      console.error("Failed to load submissions:", err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!user || !selectedCourseId) return;
    setProgressLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await getProgress(token, selectedCourseId);
      setProgress(response || null);
    } catch (err: any) {
      if (err.message?.includes("Email verification required")) {
        setIsLocked(true);
      }
      console.error("Failed to load progress:", err);
    } finally {
      setProgressLoading(false);
    }
  };

  const handleVerifyCheck = async () => {
    if (!user) return;
    setIsVerifying(true);
    setVerifyFailed(false);
    try {
      await user.reload(); // Refresh firebase user state
      const token = await user.getIdToken(true); // Force token refresh
      
      const response = await getCodingHistory(token);
      setSubmissions(response || []);
      setIsLocked(false); // Success! Unlocked
      if (activeTab === "progress") loadProgress();
    } catch (err: any) {
      if (err.message?.includes("Email verification required")) {
        setIsLocked(true);
        setVerifyFailed(true);
      } else {
        console.error("Verification check failed:", err);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const s = styles(colors, isTablet);

  const solved = progress?.solvedCount || 0;
  const attempted = progress?.attemptedCount || 0;
  const total = progress?.totalCount || 0;
  const completionPct = total > 0 ? Math.round((solved / total) * 100) : 0;

  if (isLocked) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Feather name="mail" size={64} color={colors.amber} style={{ marginBottom: 24 }} />
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' }}>
          Email Verification Required
        </Text>
        <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
          Please verify your email address to unlock the Coding platform and view your submissions.
        </Text>
        <TouchableOpacity 
          style={{ 
            backgroundColor: colors.indigo, 
            paddingHorizontal: 32, 
            paddingVertical: 16, 
            borderRadius: 12, 
            elevation: 2, 
            shadowColor: colors.indigo, 
            shadowOffset: {width: 0, height: 4}, 
            shadowOpacity: 0.3, 
            shadowRadius: 8, 
            flexDirection: 'row', 
            alignItems: 'center', 
            minWidth: 200, 
            justifyContent: 'center' 
          }}
          onPress={handleVerifyCheck}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
              I&apos;ve Verified My Email
            </Text>
          )}
        </TouchableOpacity>
        {verifyFailed && (
          <View style={{ marginTop: 16, backgroundColor: 'rgba(33, 150, 243, 0.5)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
              Verification failed. Please try again.
            </Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[
            s.tabBtn,
            activeTab === "submissions" && { backgroundColor: colors.indigo },
          ]}
          onPress={() => setActiveTab("submissions")}
        >
          <Feather
            name="send"
            size={16}
            color={activeTab === "submissions" ? "#fff" : colors.textMuted}
          />
          <Text
            style={[
              s.tabBtnText,
              activeTab === "submissions" && { color: "#fff" },
            ]}
          >
            Submissions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            s.tabBtn,
            activeTab === "progress" && { backgroundColor: colors.indigo },
          ]}
          onPress={() => setActiveTab("progress")}
        >
          <Feather
            name="trending-up"
            size={16}
            color={activeTab === "progress" ? "#fff" : colors.textMuted}
          />
          <Text
            style={[
              s.tabBtnText,
              activeTab === "progress" && { color: "#fff" },
            ]}
          >
            Progress
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "submissions" && (
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <View style={s.cardHeaderRow}>
              <Feather name="send" size={24} color={colors.indigo} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                  Your Submissions
                </Text>
                <Text style={[s.cardDesc, { color: colors.textMuted }]}>
                  Track your coding journey and see your progress.
                </Text>
              </View>
            </View>

            {submissionsLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.indigo}
                style={{ marginVertical: 30 }}
              />
            ) : submissions.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 40 }}>🚀</Text>
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>
                  No Submissions Yet
                </Text>
                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>
                  Start solving problems to see your submissions here!
                </Text>
              </View>
            ) : (
              submissions.map((submission) => (
                <View
                  key={submission._id}
                  style={[
                    s.submissionCard,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <View style={s.submissionTop}>
                    <Text
                      style={[s.submissionTime, { color: colors.textMuted }]}
                    >
                      {new Date(submission.createdAt).toLocaleString()}
                    </Text>
                    <View
                      style={[
                        s.statusBadge,
                        {
                          backgroundColor:
                            getStatusColor(submission.verdict) + "20",
                        },
                      ]}
                    >
                      <Feather
                        name={getStatusIcon(submission.verdict)}
                        size={12}
                        color={getStatusColor(submission.verdict)}
                      />
                      <Text
                        style={[
                          s.statusText,
                          { color: getStatusColor(submission.verdict) },
                        ]}
                      >
                        {submission.verdict}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[s.submissionLang, { color: colors.textSecondary }]}
                  >
                    {(submission.language || "").toUpperCase()}
                  </Text>
                  <Text
                    style={[s.submissionProblem, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {submission.problemId?.title || "Coding Problem"}
                  </Text>
                  <Text
                    style={[s.submissionCourse, { color: colors.textMuted }]}
                  >
                    {submission.problemId?.courseId?.courseName ||
                      submission.problemId?.courseId?.courseCode ||
                      "Unknown Course"}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "progress" && (
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <View style={s.cardHeaderRow}>
              <Feather name="trending-up" size={24} color={colors.indigo} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                  Your Progress
                </Text>
                <Text style={[s.cardDesc, { color: colors.textMuted }]}>
                  Track your coding achievements and streaks.
                </Text>
              </View>
            </View>

            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>
              Select Course
            </Text>
            {coursesLoading ? (
              <ActivityIndicator
                size="small"
                color={colors.indigo}
                style={{ marginVertical: 10 }}
              />
            ) : courses.length === 0 ? (
              <Text style={{ color: colors.textMuted, padding: 10 }}>
                No courses available.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.courseScroll}
              >
                {courses.map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={[
                      s.courseChip,
                      selectedCourseId === c._id && {
                        backgroundColor: colors.indigo,
                        borderColor: colors.indigo,
                      },
                    ]}
                    onPress={() => {
                      setSelectedCourseId(c._id);
                      setProgress(null);
                    }}
                  >
                    <Text
                      style={[
                        s.courseChipText,
                        selectedCourseId === c._id && { color: "#fff" },
                      ]}
                      numberOfLines={1}
                    >
                      {c.courseCode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {progressLoading ? (
              <ActivityIndicator
                size="large"
                color={colors.indigo}
                style={{ marginVertical: 30 }}
              />
            ) : !selectedCourseId ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 40 }}>📚</Text>
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>
                  Pick a Course
                </Text>
                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>
                  Select a course to view your coding progress.
                </Text>
              </View>
            ) : progress ? (
              <View style={s.progressStats}>
                <View style={s.statGrid}>
                  <View style={[s.statCard, { backgroundColor: colors.bg }]}>
                    <Text style={[s.statNumber, { color: colors.indigo }]}>
                      {solved}
                    </Text>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>
                      Solved
                    </Text>
                  </View>
                  <View style={[s.statCard, { backgroundColor: colors.bg }]}>
                    <Text style={[s.statNumber, { color: colors.indigo }]}>
                      {attempted}
                    </Text>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>
                      Attempted
                    </Text>
                  </View>
                  <View style={[s.statCard, { backgroundColor: colors.bg }]}>
                    <Text style={[s.statNumber, { color: colors.indigo }]}>
                      {total}
                    </Text>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>
                      Total
                    </Text>
                  </View>
                </View>

                <View
                  style={[s.progressTrack, { backgroundColor: colors.border }]}
                >
                  <View
                    style={[
                      s.progressFill,
                      {
                        backgroundColor: colors.indigo,
                        width: `${completionPct}%` as any,
                      },
                    ]}
                  />
                </View>
                <Text style={[s.progressMeta, { color: colors.textMuted }]}>
                  Completion based on solved problems.
                </Text>
              </View>
            ) : (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 40 }}>📊</Text>
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>
                  No Progress Yet
                </Text>
                <Text style={[s.emptyDesc, { color: colors.textMuted }]}>
                  Start solving problems to track your progress!
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (colors: any, isTablet = false) => {
  const sf = isTablet ? 1.25 : 1; // scale factor
  const fs = isTablet ? 1.18 : 1; // font scale
  const r = (v: number) => Math.round(v * sf);
  const f = (v: number) => Math.round(v * fs);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: {
      paddingHorizontal: r(20),
      paddingTop: r(10),
      paddingBottom: r(110),
    },

    tabBar: {
      flexDirection: "row",
      marginHorizontal: r(20),
      marginTop: r(10),
      gap: r(8),
      marginBottom: r(16),
    },
    tabBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: r(6),
      paddingVertical: r(12),
      borderRadius: r(14),
      backgroundColor: colors.card,
    },
    tabBtnText: { fontSize: f(14), fontWeight: "700", color: colors.textMuted },

    card: {
      borderRadius: r(20),
      padding: r(20),
      marginBottom: r(16),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: r(18),
    },
    cardTitle: { fontSize: f(18), fontWeight: "700" },
    cardDesc: { fontSize: f(13), lineHeight: f(19), marginTop: 2 },

    emptyState: { alignItems: "center", paddingVertical: r(30) },
    emptyTitle: { fontSize: f(18), fontWeight: "700", marginTop: r(10) },
    emptyDesc: { fontSize: f(13), marginTop: 4, textAlign: "center" },

    submissionCard: {
      borderRadius: r(12),
      padding: r(14),
      marginBottom: r(8),
      borderWidth: 1,
    },
    submissionTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: r(6),
    },
    submissionTime: { fontSize: f(12) },
    submissionLang: { fontSize: f(13), fontWeight: "600", marginBottom: 4 },
    submissionProblem: { fontSize: f(14), fontWeight: "700" },
    submissionCourse: { fontSize: f(12), marginTop: 2 },

    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: r(8),
      paddingVertical: r(2),
      borderRadius: r(8),
    },
    statusText: { fontSize: f(10), fontWeight: "bold" },

    courseScroll: { marginBottom: r(6) },
    courseChip: {
      paddingHorizontal: r(16),
      paddingVertical: r(10),
      borderRadius: r(12),
      borderWidth: 1.5,
      borderColor: colors.border,
      marginRight: r(8),
      backgroundColor: colors.bg,
    },
    courseChipText: {
      fontSize: f(13),
      fontWeight: "700",
      color: colors.textPrimary,
    },

    progressStats: { gap: r(20) },
    statGrid: { flexDirection: "row", gap: r(12) },
    statCard: {
      flex: 1,
      alignItems: "center",
      padding: r(16),
      borderRadius: r(12),
    },
    statNumber: { fontSize: f(24), fontWeight: "900", marginBottom: 4 },
    statLabel: { fontSize: f(12), textAlign: "center" },

    progressTrack: { height: r(8), borderRadius: 4, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 4 },
    progressMeta: { fontSize: f(12), marginTop: r(6) },

    sectionTitle: { fontSize: f(14), fontWeight: "700", marginBottom: r(10) },
  });
};
