import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/firebase";
// --- Interfaces ---
interface ExtractedCourse {
  courseCode: string;
  courseName: string;
  creditHours: number;
  gradePoints?: number;
  mark?: number;
}

interface TranscriptHistoryItem {
  _id: string;
  fileName: string;
  status: 'completed' | 'failed' | 'processing';
  createdAt: string;
  termGPA?: number;
  totalCreditHours?: number;
}

// --- API Helpers ---
const gpaAPI = {
  getTermCourses: async (token: string) => {
    const res = await fetch(`${API_URL}/api/gpa/my-courses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return json.data || [];
  },
  addTermCourse: async (payload: any, token: string) => {
    const res = await fetch(`${API_URL}/api/gpa/my-courses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  removeTermCourse: async (id: string, token: string) => {
    await fetch(`${API_URL}/api/gpa/my-courses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  updateGpaProfile: async (cgpa: number, hours: number, token: string) => {
    await fetch(`${API_URL}/api/auth/setup-profile`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentCGPA: cgpa, earnedCreditHours: hours }),
    });
  },
  generateTargetPlan: async (target: number, courses: any[], token: string) => {
    const res = await fetch(`${API_URL}/api/gpa/target-strategy`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCGPA: target, courses }),
    });
    const json = await res.json();
    return json.data;
  }
};

const transcriptAPI = {
  upload: async (formData: FormData, token: string) => {
    const res = await fetch(`${API_URL}/api/gpa/upload-transcript`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res.json();
  },
  getHistory: async (token: string) => {
    const res = await fetch(`${API_URL}/api/gpa/transcripts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return json.data || [];
  },
  delete: async (id: string, token: string) => {
    await fetch(`${API_URL}/api/gpa/transcripts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  update: async (id: string, payload: any, token: string) => {
    await fetch(`${API_URL}/api/gpa/transcripts/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
};

const STORAGE_KEY = "@nazamly_gpa_profile";
const COURSES_STORAGE_KEY = "@nazamly_gpa_courses";
const API_BASE = `${API_URL}/api`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
}

type DataSource = "manual" | "upload" | "history";
type UploadState = "idle" | "uploading" | "processing" | "review" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyGpa(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n) || n < 0) return { label: "", color: "transparent" };
  if (n === 0) return { label: "F", color: "#ef4444" };
  if (n < 1.0) return { label: "Pass", color: "#ef4444" };
  if (n < 1.5) return { label: "C+", color: "#f97316" };
  if (n < 2.5) return { label: "B", color: "#eab308" };
  if (n < 3.5) return { label: "B+", color: "#f59e0b" };
  if (n < 4.0) return { label: "A", color: "#38bdf8" };
  if (n < 4.5) return { label: "A+", color: "#3b82f6" };
  if (n <= 5.0) return { label: "A+ (Honors)", color: "#22c55e" };
  return { label: "", color: "transparent" };
}

function gradeLabel(val: number) {
  const opts = [
    { value: 4.0, label: "A+" },
    { value: 3.5, label: "A" },
    { value: 3.0, label: "B+" },
    { value: 2.5, label: "B" },
    { value: 2.0, label: "C+" },
    { value: 1.5, label: "C" },
  ];
  return opts.find((o) => o.value === val)?.label ?? classifyGpa(val).label;
}

function computeStrategy(
  courses: Course[],
  grades: Record<string, number>,
  oldCgpa: number,
  oldHours: number,
  target: number,
) {
  const termHours = courses.reduce((s, c) => s + c.credits, 0);
  const totalHours = oldHours + termHours;
  const neededPoints = target * totalHours - oldCgpa * oldHours;
  const maxPoints = courses.reduce((s, c) => s + 5.0 * c.credits, 0);
  const maxCgpa = (oldCgpa * oldHours + maxPoints) / totalHours;

  if (target > 5.0 || neededPoints > maxPoints)
    return { possible: false, maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2) };
  if (neededPoints <= 0)
    return {
      possible: true,
      requiredTermGpa: "0.00",
      maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2),
      plan: courses.map((c) => ({ ...c, requiredGrade: 1.5 })),
      note: "Target already met.",
    };

  let remaining = [...courses];
  let remainingPoints = neededPoints;
  const planGrades: Record<string, number> = {};

  while (remaining.length > 0) {
    const ppc = remainingPoints / remaining.length;
    const overflow = remaining.filter((c) => ppc / c.credits > 5.0);
    if (overflow.length === 0) {
      remaining.forEach((c) => {
        planGrades[c.id] = parseFloat((ppc / c.credits).toFixed(2));
      });
      break;
    }
    overflow.forEach((c) => {
      planGrades[c.id] = 4.9;
      remainingPoints -= 4.9 * c.credits;
    });
    remaining = remaining.filter((c) => planGrades[c.id] === undefined);
    if (remaining.length === 0 && remainingPoints > 0.001)
      return { possible: false, maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2) };
  }

  return {
    possible: true,
    requiredTermGpa: (termHours ? neededPoints / termHours : 0).toFixed(2),
    maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2),
    plan: courses.map((c) => ({ ...c, requiredGrade: planGrades[c.id] ?? 0 })),
  };
}

function extractedToCourses(extracted: ExtractedCourse[]): {
  courses: Course[];
  grades: Record<string, number>;
} {
  const courses: Course[] = extracted.map((c, i) => ({
    id: `ext_${i}`,
    name: c.courseName || c.courseCode,
    code: c.courseCode,
    credits: c.creditHours || 3,
  }));
  const grades: Record<string, number> = {};
  extracted.forEach((c, i) => {
    grades[`ext_${i}`] = c.gradePoints ?? 0;
  });
  return { courses, grades };
}

// ─── Data Source Picker Modal ─────────────────────────────────────────────────

function DataSourceModal({
  visible,
  onClose,
  onSelect,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (src: DataSource) => void;
  colors: any;
}) {
  const options: {
    src: DataSource;
    icon: string;
    title: string;
    desc: string;
  }[] = [
    {
      src: "manual",
      icon: "edit-3",
      title: "Enter Manually",
      desc: "Type in your courses and grades",
    },
    {
      src: "upload",
      icon: "upload",
      title: "Upload Transcript",
      desc: "PDF or image — AI extracts grades",
    },
    {
      src: "history",
      icon: "clock",
      title: "From History",
      desc: "Use a previously uploaded transcript",
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[m.sheet, { backgroundColor: colors.card }]}>
        <View style={[m.handle, { backgroundColor: colors.divider }]} />
        <Text style={[m.sheetTitle, { color: colors.textPrimary }]}>
          How do you want to add courses?
        </Text>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.src}
            style={[m.option, { borderColor: colors.border }]}
            onPress={() => {
              onClose();
              onSelect(opt.src);
            }}
          >
            <View style={[m.optIcon, { backgroundColor: colors.indigoPale }]}>
              <Feather name={opt.icon as any} size={20} color={colors.indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[m.optTitle, { color: colors.textPrimary }]}>
                {opt.title}
              </Text>
              <Text style={[m.optDesc, { color: colors.textMuted }]}>
                {opt.desc}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </View>
    </Modal>
  );
}

// ─── Upload Flow (inline) ─────────────────────────────────────────────────────

function UploadFlow({
  colors,
  user,
  onDone,
  onCancel,
}: {
  colors: any;
  user: any;
  onDone: (courses: Course[], grades: Record<string, number>) => void;
  onCancel: () => void;
}) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    size: number;
    file?: any;
  } | null>(null);
  const [courses, setCourses] = useState<ExtractedCourse[]>([]);
  const [termGPA, setTermGPA] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [transcriptId, setTranscriptId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState("");

  const recalc = (updated: ExtractedCourse[]) => {
    const pts = updated.reduce(
      (s, c) => s + (c.gradePoints || 0) * (c.creditHours || 3),
      0,
    );
    const hrs = updated.reduce((s, c) => s + (c.creditHours || 3), 0);
    setTermGPA(hrs > 0 ? parseFloat((pts / hrs).toFixed(2)) : 0);
    setTotalHours(hrs);
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/webp",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || "application/octet-stream",
        size: asset.size || 0,
        file: asset.file,
      });
      setUploadState("idle");
      setErrorMsg("");
    } catch {
      Alert.alert("Error", "Failed to pick file.");
    }
  };

  const doUpload = async () => {
    if (!selectedFile || !user) return;
    setUploadState("uploading");
    try {
      const token = await user.getIdToken();
      setUploadState("processing");
      const formData = new FormData();
      formData.append("file", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType,
      } as any);
      const res = await fetch(`${API_BASE}/gpa/upload-transcript`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      const result = json.data || json;
      if (
        (json.success || result.status === "completed") &&
        result.extractedCourses?.length > 0
      ) {
        setTranscriptId(result.transcriptId);
        setCourses(result.extractedCourses);
        setTermGPA(result.termGPA);
        setTotalHours(result.totalCreditHours);
        setConfidence(result.ocrConfidence);
        setUploadState("review");
      } else {
        setErrorMsg(json.message || "No courses extracted from transcript");
        setUploadState("error");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Upload failed.");
      setUploadState("error");
    }
  };

  const updateCourse = (
    i: number,
    field: keyof ExtractedCourse,
    val: string,
  ) => {
    const updated = [...courses];
    if (field === "mark" || field === "gradePoints" || field === "creditHours")
      (updated[i] as any)[field] = parseFloat(val) || 0;
    else (updated[i] as any)[field] = val;
    setCourses(updated);
    recalc(updated);
  };

  const formatBytes = (b: number) =>
    b < 1024
      ? `${b} B`
      : b < 1048576
        ? `${(b / 1024).toFixed(1)} KB`
        : `${(b / 1048576).toFixed(1)} MB`;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={u.topRow}>
        <TouchableOpacity onPress={onCancel} style={u.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[u.title, { color: colors.textPrimary }]}>
          Upload Transcript
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {(uploadState === "idle" || uploadState === "error") && (
        <>
          <TouchableOpacity
            style={[
              u.dropZone,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={pickFile}
            activeOpacity={0.8}
          >
            <View style={[u.dropIcon, { backgroundColor: colors.indigoPale }]}>
              <MaterialCommunityIcons
                name="file-upload-outline"
                size={38}
                color={colors.indigo}
              />
            </View>
            <Text style={[u.dropTitle, { color: colors.textPrimary }]}>
              {selectedFile
                ? selectedFile.name
                : "Tap to select your transcript"}
            </Text>
            <Text style={[u.dropSub, { color: colors.textMuted }]}>
              {selectedFile
                ? formatBytes(selectedFile.size)
                : "PDF, JPG, PNG, or WEBP"}
            </Text>
          </TouchableOpacity>

          {uploadState === "error" && (
            <View
              style={[
                u.errorBox,
                {
                  backgroundColor: colors.redLight,
                  borderColor: colors.red + "40",
                },
              ]}
            >
              <Feather name="alert-circle" size={16} color={colors.red} />
              <Text style={[u.errorText, { color: colors.red }]}>
                {errorMsg}
              </Text>
            </View>
          )}

          {selectedFile && (
            <TouchableOpacity
              style={[u.btn, { backgroundColor: colors.indigo }]}
              onPress={doUpload}
            >
              <Feather name="upload" size={18} color="#fff" />
              <Text style={u.btnText}>Extract Grades</Text>
            </TouchableOpacity>
          )}

          <View style={u.infoRow}>
            {[
              { icon: "file-text", label: "PDF" },
              { icon: "image", label: "Image" },
            ].map((item) => (
              <View
                key={item.label}
                style={[u.infoCard, { backgroundColor: colors.card }]}
              >
                <Feather
                  name={item.icon as any}
                  size={20}
                  color={colors.indigo}
                />
                <Text style={[u.infoLabel, { color: colors.textPrimary }]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {(uploadState === "uploading" || uploadState === "processing") && (
        <View style={[u.processingCard, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="large" color={colors.indigo} />
          <Text style={[u.processingTitle, { color: colors.textPrimary }]}>
            {uploadState === "uploading"
              ? "Uploading..."
              : "Extracting grades..."}
          </Text>
          <Text style={[u.processingSub, { color: colors.textMuted }]}>
            {uploadState === "processing"
              ? "AI is reading your transcript."
              : "Sending file to server..."}
          </Text>
        </View>
      )}

      {uploadState === "review" && (
        <>
          <View style={[u.summaryCard, { backgroundColor: colors.indigo }]}>
            <View style={u.summaryRow}>
              <View style={u.summaryItem}>
                <Text style={u.summaryVal}>{termGPA.toFixed(2)}</Text>
                <Text style={u.summaryLbl}>Term GPA</Text>
              </View>
              <View style={u.summaryDiv} />
              <View style={u.summaryItem}>
                <Text style={u.summaryVal}>{totalHours}</Text>
                <Text style={u.summaryLbl}>Credit Hrs</Text>
              </View>
              <View style={u.summaryDiv} />
              <View style={u.summaryItem}>
                <Text style={u.summaryVal}>{courses.length}</Text>
                <Text style={u.summaryLbl}>Courses</Text>
              </View>
            </View>
            <Text style={u.confidenceText}>
              Confidence: {Math.round(confidence * 100)}% — Review and correct
              if needed
            </Text>
          </View>

          {courses.map((course, i) => (
            <View
              key={
                course.courseCode
                  ? `review_${course.courseCode}_${i}`
                  : `review_${i}`
              }
              style={[u.courseCard, { backgroundColor: colors.card }]}
            >
              <View style={u.courseHeader}>
                <TextInput
                  style={[u.courseCode, { color: colors.indigo }]}
                  value={course.courseCode}
                  onChangeText={(v) => updateCourse(i, "courseCode", v)}
                />
                <TouchableOpacity
                  onPress={() => {
                    const upd = courses.filter((_, j) => j !== i);
                    setCourses(upd);
                    recalc(upd);
                  }}
                >
                  <Feather name="trash-2" size={16} color={colors.red} />
                </TouchableOpacity>
              </View>
              <View style={u.courseFields}>
                {(
                  [
                    "mark",
                    "gradePoints",
                    "creditHours",
                  ] as (keyof ExtractedCourse)[]
                ).map((field) => (
                  <View key={String(field)} style={u.fieldGroup}>
                    <Text style={[u.fieldLabel, { color: colors.textMuted }]}>
                      {field === "gradePoints"
                        ? "GPA Pts"
                        : field === "creditHours"
                          ? "Credits"
                          : "Mark"}
                    </Text>
                    <TextInput
                      style={[
                        u.fieldInput,
                        {
                          color: colors.textPrimary,
                          borderColor: colors.border,
                          backgroundColor: colors.bg,
                        },
                      ]}
                      value={String((course as any)[field] ?? "")}
                      onChangeText={(v) => updateCourse(i, field, v)}
                      keyboardType="numeric"
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[u.btn, { backgroundColor: colors.teal }]}
            onPress={async () => {
              try {
                if (user && transcriptId) {
                  const token = await user.getIdToken();
                  await fetch(`${API_BASE}/gpa/transcripts/${transcriptId}`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ courses, termGPA, totalHours }),
                  });
                }
              } catch (err: any) {
                console.error("Failed to save corrections to history:", err);
              }
              const { courses: c, grades: g } = extractedToCourses(courses);
              onDone(c, g);
            }}
          >
            <Feather name="check" size={18} color="#fff" />
            <Text style={u.btnText}>Use These Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[u.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => {
              setUploadState("idle");
              setSelectedFile(null);
            }}
          >
            <Text style={[u.secondaryBtnText, { color: colors.textSecondary }]}>
              Upload Another
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ─── History Picker Flow (inline) ─────────────────────────────────────────────

function HistoryFlow({
  colors,
  user,
  onDone,
  onCancel,
}: {
  colors: any;
  user: any;
  onDone: (courses: Course[], grades: Record<string, number>) => void;
  onCancel: () => void;
}) {
  const [history, setHistory] = useState<TranscriptHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/gpa/transcripts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setHistory(json.data || []);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleDelete = (item: TranscriptHistoryItem) => {
    Alert.alert("Delete Transcript", `Delete "${item.fileName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(item._id);
            const token = await user!.getIdToken();
            await fetch(`${API_BASE}/gpa/transcripts/${item._id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            setHistory((prev) => prev.filter((h) => h._id !== item._id));
          } catch (err: any) {
            Alert.alert("Error", err.message || "Delete failed");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const statusColor = (s: string) =>
    s === "completed"
      ? colors.teal
      : s === "failed"
        ? colors.red
        : colors.amber;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={h.topRow}>
        <TouchableOpacity onPress={onCancel} style={h.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[h.title, { color: colors.textPrimary }]}>
            Transcript History
          </Text>
          <Text style={[h.subtitle, { color: colors.textMuted }]}>
            Tap a completed transcript to use it
          </Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={h.centered}>
          <ActivityIndicator size="large" color={colors.indigo} />
          <Text style={[h.loadingText, { color: colors.textMuted }]}>
            Loading...
          </Text>
        </View>
      ) : history.length === 0 ? (
        <View style={[h.emptyCard, { backgroundColor: colors.card }]}>
          <View
            style={[h.emptyIconWrap, { backgroundColor: colors.indigoPale }]}
          >
            <Feather name="file-text" size={36} color={colors.indigo} />
          </View>
          <Text style={[h.emptyTitle, { color: colors.textPrimary }]}>
            No transcripts yet
          </Text>
          <Text style={[h.emptySub, { color: colors.textMuted }]}>
            Upload a transcript from the{"\n"} Upload Transcript option to get
            started
          </Text>
          <TouchableOpacity
            style={[h.emptyBtn, { backgroundColor: colors.indigo }]}
            onPress={onCancel}
          >
            <Feather name="arrow-left" size={15} color="#fff" />
            <Text style={h.emptyBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        history.map((item) => (
          <TouchableOpacity
            key={item._id}
            style={[
              h.card,
              {
                backgroundColor: colors.card,
                opacity: item.status !== "completed" ? 0.5 : 1,
              },
            ]}
            onPress={async () => {
              if (item.status !== "completed") return;
              try {
                setLoadingId(item._id);
                const token = await user!.getIdToken();
                const res = await fetch(`${API_BASE}/gpa/transcripts/${item._id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                const full = json.data || json;
                const { courses: c, grades: g } = extractedToCourses(
                  full.extractedCourses || [],
                );
                onDone(c, g);
              } catch (err: any) {
                Alert.alert(
                  "Error",
                  err.message || "Failed to load transcript",
                );
              } finally {
                setLoadingId(null);
              }
            }}
            disabled={item.status !== "completed" || loadingId === item._id}
          >
            <View style={h.cardLeft}>
              <View
                style={[h.fileIcon, { backgroundColor: colors.indigoPale }]}
              >
                <Feather name="file-text" size={20} color={colors.indigo} />
              </View>
              <View style={h.cardInfo}>
                <Text
                  style={[h.fileName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {item.fileName}
                </Text>
                <Text style={[h.fileDate, { color: colors.textMuted }]}>
                  {formatDate(item.createdAt)}
                </Text>
                <View style={h.metaRow}>
                  <View
                    style={[
                      h.statusBadge,
                      { backgroundColor: statusColor(item.status) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        h.statusText,
                        { color: statusColor(item.status) },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                  {item.status === "completed" && (
                    <Text style={[h.gpaText, { color: colors.textSecondary }]}>
                      GPA {item.termGPA?.toFixed(2)} · {item.totalCreditHours}{" "}
                      hrs
                    </Text>
                  )}
                </View>
              </View>
            </View>
            <View style={h.cardRight}>
              {item.status === "completed" && (
                <View
                  style={[h.useBadge, { backgroundColor: colors.indigoPale }]}
                >
                  {loadingId === item._id ? (
                    <ActivityIndicator size="small" color={colors.indigo} />
                  ) : (
                    <Text style={[h.useText, { color: colors.indigo }]}>
                      Use
                    </Text>
                  )}
                </View>
              )}
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                disabled={deletingId === item._id}
                style={h.deleteBtn}
              >
                {deletingId === item._id ? (
                  <ActivityIndicator size="small" color={colors.red} />
                ) : (
                  <Feather name="trash-2" size={16} color={colors.red} />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

// ─── Main GPA Planner Screen ──────────────────────────────────────────────────

export default function GpaPlannerScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();

  const [profile, setProfile] = useState<{
    cgpa: number;
    hours: number;
  } | null>(null);
  const [cgpaInput, setCgpaInput] = useState("");
  const [hoursInput, setHoursInput] = useState("");
  const [profileError, setProfileError] = useState("");

  const [activeTab, setActiveTab] = useState<"calculator" | "planner">(
    "calculator",
  );
  const [dataSource, setDataSource] = useState<DataSource>("manual");
  const [activeFlow, setActiveFlow] = useState<"none" | "upload" | "history">(
    "none",
  );
  const [showSourceModal, setShowSourceModal] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [targetCgpa, setTargetCgpa] = useState("");
  const [strategy, setStrategy] = useState<any>(null);

  const cgpaClassification = useMemo(() => {
    const v = parseFloat(cgpaInput);
    if (!cgpaInput || isNaN(v) || v < 0 || v > 5) return null;
    return classifyGpa(v);
  }, [cgpaInput]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!saved) return;
      try {
        const p = JSON.parse(saved);
        if (p.cgpa !== undefined && p.hours !== undefined) setProfile(p);
      } catch {}
    });
    // Load saved courses & grades (local first, then try backend)
    AsyncStorage.getItem(COURSES_STORAGE_KEY).then((saved) => {
      if (!saved) return;
      try {
        const { courses: c, grades: g, dataSource: ds } = JSON.parse(saved);
        if (c) setCourses(c);
        if (g) setGrades(g);
        if (ds) setDataSource(ds);
      } catch {}
    });
    // Also try loading courses from backend
    if (user) {
      (async () => {
        try {
          const token = await user.getIdToken();
          const backendCourses = await gpaAPI.getTermCourses(token);
          if (backendCourses && backendCourses.length > 0) {
            const mapped = backendCourses.map((c: any) => ({
              id: c.id,
              name: c.courseName,
              code: c.courseCode,
              credits: c.creditHours,
            }));
            // Only use backend courses if local is empty
            const localSaved = await AsyncStorage.getItem(COURSES_STORAGE_KEY);
            if (!localSaved) {
              setCourses(mapped);
              const defaultGrades: Record<string, number> = {};
              mapped.forEach((c: Course) => {
                defaultGrades[c.id] = 4.0;
              });
              setGrades(defaultGrades);
            }
          }
        } catch (err) {
          // Backend unavailable — use local data
          console.log("Backend courses unavailable, using local:", err);
        }
      })();
    }
  }, [user]);

  const saveProfile = useCallback(async () => {
    const cgpa = parseFloat(cgpaInput);
    const hours = parseInt(hoursInput, 10);
    setProfileError("");
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 5)
      return setProfileError("Invalid CGPA (0–5)");
    if (isNaN(hours) || hours < 0 || hours > 300)
      return setProfileError("Invalid hours (0–300)");
    const data = { cgpa, hours };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setProfile(data);
    // Sync profile to backend (fire-and-forget)
    if (user) {
      try {
        const token = await user.getIdToken();
        await gpaAPI.updateGpaProfile(cgpa, hours, token);
      } catch (err) {
        console.log("Failed to sync profile to backend:", err);
      }
    }
  }, [cgpaInput, hoursInput, user]);

  const editProfile = () => {
    if (profile) {
      setCgpaInput(String(profile.cgpa));
      setHoursInput(String(profile.hours));
    }
    setProfile(null);
    setStrategy(null);
    setCourses([]);
    setGrades({});
    AsyncStorage.removeItem(COURSES_STORAGE_KEY);
  };

  const handleGradeChange = (id: string, value: string) => {
    let v = Math.max(
      0,
      Math.min(5, Math.round((parseFloat(value) || 0) * 100) / 100),
    );
    const updatedGrades = { ...grades, [id]: v };
    setGrades(updatedGrades);
    AsyncStorage.setItem(
      COURSES_STORAGE_KEY,
      JSON.stringify({ courses, grades: updatedGrades, dataSource }),
    );
  };

  const handleSourceSelect = (src: DataSource) => {
    setDataSource(src);
    if (src === "upload") setActiveFlow("upload");
    else if (src === "history") setActiveFlow("history");
    else {
      // manual — reset to empty editable list
      setCourses([]);
      setGrades({});
    }
  };

  const handleFlowDone = (
    newCourses: Course[],
    newGrades: Record<string, number>,
  ) => {
    setCourses(newCourses);
    setGrades(newGrades);
    setActiveFlow("none");
    AsyncStorage.setItem(
      COURSES_STORAGE_KEY,
      JSON.stringify({ courses: newCourses, grades: newGrades, dataSource }),
    );
  };

  const addManualCourse = async () => {
    const id = `manual_${Date.now()}`;
    const newCourse: Course = { id, name: "", code: "", credits: 3 };
    const updatedCourses = [...courses, newCourse];
    const updatedGrades = { ...grades, [id]: 4.0 };
    setCourses(updatedCourses);
    setGrades(updatedGrades);
    AsyncStorage.setItem(
      COURSES_STORAGE_KEY,
      JSON.stringify({
        courses: updatedCourses,
        grades: updatedGrades,
        dataSource,
      }),
    );
    // Also sync to backend (fire-and-forget)
    if (user) {
      try {
        const token = await user.getIdToken();
        await gpaAPI.addTermCourse(
          { courseName: "New Course", courseCode: "", creditHours: 3 },
          token,
        );
      } catch (err) {
        console.log("Failed to add course to backend:", err);
      }
    }
  };

  const updateManualCourse = (
    id: string,
    field: keyof Course,
    value: string,
  ) => {
    const updatedCourses = courses.map((c) =>
      c.id === id
        ? { ...c, [field]: field === "credits" ? parseInt(value) || 0 : value }
        : c,
    );
    setCourses(updatedCourses);
    AsyncStorage.setItem(
      COURSES_STORAGE_KEY,
      JSON.stringify({ courses: updatedCourses, grades, dataSource }),
    );
  };

  const removeManualCourse = async (id: string) => {
    const updatedCourses = courses.filter((c) => c.id !== id);
    const updatedGrades = { ...grades };
    delete updatedGrades[id];
    setCourses(updatedCourses);
    setGrades(updatedGrades);
    AsyncStorage.setItem(
      COURSES_STORAGE_KEY,
      JSON.stringify({
        courses: updatedCourses,
        grades: updatedGrades,
        dataSource,
      }),
    );
    // Also sync to backend (fire-and-forget)
    if (user) {
      try {
        const token = await user.getIdToken();
        await gpaAPI.removeTermCourse(id, token);
      } catch (err) {
        console.log("Failed to remove course from backend:", err);
      }
    }
  };

  const calculations = useMemo(() => {
    if (!profile || courses.length === 0) return null;
    const termHours = courses.reduce((s, c) => s + c.credits, 0);
    const termPoints = courses.reduce(
      (s, c) => s + (grades[c.id] ?? 0) * c.credits,
      0,
    );
    const termGpa = termHours ? termPoints / termHours : 0;
    const totalHours = profile.hours + termHours;
    const expectedCgpa = totalHours
      ? (profile.cgpa * profile.hours + termGpa * termHours) / totalHours
      : 0;
    const maxCgpa = totalHours
      ? (profile.cgpa * profile.hours + 5.0 * termHours) / totalHours
      : 0;
    return {
      termHours,
      termGpa: parseFloat(termGpa.toFixed(2)),
      totalHours,
      expectedCgpa: parseFloat(expectedCgpa.toFixed(2)),
      maxCgpa: parseFloat(Math.min(maxCgpa, 5.0).toFixed(2)),
    };
  }, [profile, courses, grades]);

  const computeTarget = useCallback(async () => {
    const target = parseFloat(targetCgpa);
    if (!profile || isNaN(target) || target < 0 || target > 5) {
      setStrategy({ error: "Invalid Target CGPA" });
      return;
    }
    if (courses.length === 0) {
      setStrategy({ error: "Add courses first" });
      return;
    }
    // Try backend first, fall back to local computation
    if (user) {
      try {
        const token = await user.getIdToken();
        const backendPlan = await gpaAPI.generateTargetPlan(
          target,
          courses.map((c) => ({ courseCode: c.code, creditHours: c.credits })),
          token,
        );
        if (backendPlan)
          setStrategy({
            //possible: true,
            requiredTermGpa: backendPlan.requiredTermAverageGPA?.toFixed(2),
            ...backendPlan,
            plan: backendPlan.plan || [],
          });
        else setStrategy({ error: "Failed to generate plan" });
        return;
      } catch (err) {
        console.log("Backend strategy unavailable, using local:", err);
      }
    }
    // Local fallback
    setStrategy(
      computeStrategy(courses, grades, profile.cgpa, profile.hours, target),
    );
  }, [targetCgpa, profile, courses, grades, user]);

  const targetCls = useMemo(() => {
    const v = parseFloat(targetCgpa);
    if (!targetCgpa || isNaN(v) || v < 0 || v > 5) return null;
    return classifyGpa(v);
  }, [targetCgpa]);

  // ── Onboarding ──
  if (!profile) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[s.container, { backgroundColor: colors.bg }]}
      >
        <ScrollView contentContainerStyle={s.onboardCenter}>
          <View style={s.onboardIconWrap}>
            <Text style={{ fontSize: 44 }}>🎓</Text>
          </View>
          <Text style={[s.onboardTitle, { color: colors.textPrimary }]}>
            Smart GPA Planner
          </Text>
          <Text style={[s.onboardSub, { color: colors.textSecondary }]}>
            Plan and calculate your target CGPA accurately.
          </Text>

          {!!profileError && (
            <View style={[s.errorBox, { backgroundColor: colors.redLight }]}>
              <Text style={{ color: colors.red }}>{profileError}</Text>
            </View>
          )}

          <View
            style={[
              s.inputCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                s.elegantInput,
                {
                  backgroundColor: colors.indigoPale,
                  borderColor: colors.indigoLight,
                },
              ]}
            >
              <View
                style={[s.elegantIconWrap, { backgroundColor: colors.card }]}
              >
                <Feather name="award" size={20} color={colors.indigo} />
              </View>
              <View style={s.elegantInputContent}>
                <Text style={[s.elegantLabel, { color: colors.textSecondary }]}>
                  Current CGPA
                </Text>
                <TextInput
                  style={[s.elegantField, { color: colors.textPrimary }]}
                  keyboardType="decimal-pad"
                  placeholder="e.g., 3.75"
                  placeholderTextColor={colors.textMuted}
                  value={cgpaInput}
                  onChangeText={setCgpaInput}
                />
              </View>
              {cgpaClassification && (
                <View
                  style={[
                    s.badge,
                    { backgroundColor: cgpaClassification.color + "20" },
                  ]}
                >
                  <Text
                    style={[s.badgeText, { color: cgpaClassification.color }]}
                  >
                    {cgpaClassification.label}
                  </Text>
                </View>
              )}
            </View>

            <View
              style={[
                s.elegantInput,
                {
                  backgroundColor: colors.tealLight,
                  borderColor: "#ccfbf1",
                  marginTop: 16,
                },
              ]}
            >
              <View
                style={[s.elegantIconWrap, { backgroundColor: colors.card }]}
              >
                <Feather name="clock" size={20} color={colors.teal} />
              </View>
              <View style={s.elegantInputContent}>
                <Text style={[s.elegantLabel, { color: colors.textSecondary }]}>
                  Total Earned Hours
                </Text>
                <TextInput
                  style={[s.elegantField, { color: colors.textPrimary }]}
                  keyboardType="number-pad"
                  placeholder="e.g., 90"
                  placeholderTextColor={colors.textMuted}
                  value={hoursInput}
                  onChangeText={setHoursInput}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                s.primaryBtn,
                { backgroundColor: colors.indigo, marginTop: 24 },
              ]}
              onPress={saveProfile}
            >
              <Text style={s.primaryBtnText}>Save and Continue</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const profileCls = classifyGpa(profile.cgpa);

  // ── Inline flows ──
  if (activeFlow === "upload") {
    return (
      <View
        style={[
          s.container,
          { backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 16 },
        ]}
      >
        <UploadFlow
          colors={colors}
          user={user}
          onDone={handleFlowDone}
          onCancel={() => setActiveFlow("none")}
        />
      </View>
    );
  }

  if (activeFlow === "history") {
    return (
      <View
        style={[
          s.container,
          { backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 16 },
        ]}
      >
        <HistoryFlow
          colors={colors}
          user={user}
          onDone={handleFlowDone}
          onCancel={() => setActiveFlow("none")}
        />
      </View>
    );
  }

  // ── Main planner ──
  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <DataSourceModal
        visible={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        onSelect={handleSourceSelect}
        colors={colors}
      />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.screenTitle, { color: colors.textPrimary }]}>
            Smart GPA Planner
          </Text>
          <Text style={[s.screenSubtitle, { color: colors.textMuted }]}>
            Plan your academics
          </Text>
        </View>
        <TouchableOpacity
          style={[s.editBtn, { borderColor: colors.indigo }]}
          onPress={editProfile}
        >
          <Text style={[s.editBtnText, { color: colors.indigo }]}>
            Edit Input
          </Text>
        </TouchableOpacity>
      </View>

      {/* Profile Strip */}
      <View
        style={[
          s.strip,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        {[
          {
            label: "CGPA",
            value: profile.cgpa,
            sub: profileCls.label,
            subColor: profileCls.color,
          },
          { label: "Earned Hrs", value: profile.hours },
          { label: "Term Hrs", value: calculations?.termHours ?? "—" },
          { label: "Max CGPA", value: calculations?.maxCgpa ?? "—" },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <View style={s.stripItem}>
              <Text style={[s.stripLabel, { color: colors.textSecondary }]}>
                {item.label}
              </Text>
              <Text style={[s.stripVal, { color: colors.textPrimary }]}>
                {item.value}
              </Text>
              {item.sub ? (
                <Text
                  style={{
                    color: item.subColor,
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                >
                  {item.sub}
                </Text>
              ) : null}
            </View>
            {i < arr.length - 1 && (
              <View style={[s.stripDiv, { backgroundColor: colors.divider }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Tabs */}
      <View style={[s.tabsRow]}>
        {(["calculator", "planner"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              s.tabBtn,
              {
                borderBottomColor:
                  activeTab === tab ? colors.indigo : "transparent",
              },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                s.tabText,
                { color: activeTab === tab ? colors.indigo : colors.textMuted },
              ]}
            >
              {tab === "calculator" ? "Current Term" : "Strategic Planner"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* ── Calculator Tab ── */}
        {activeTab === "calculator" && (
          <>
            {/* Data source selector */}
            <TouchableOpacity
              style={[
                s.sourceRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setShowSourceModal(true)}
            >
              <View
                style={[
                  s.sourceIconWrap,
                  { backgroundColor: colors.indigoPale },
                ]}
              >
                <Feather
                  name={
                    dataSource === "upload"
                      ? "upload"
                      : dataSource === "history"
                        ? "clock"
                        : "edit-3"
                  }
                  size={16}
                  color={colors.indigo}
                />
              </View>
              <Text style={[s.sourceLabel, { color: colors.textPrimary }]}>
                {dataSource === "upload"
                  ? "From Transcript Upload"
                  : dataSource === "history"
                    ? "From Transcript History"
                    : "Manual Entry"}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Results */}
            {calculations && (
              <View style={[s.resultCardsRow]}>
                <View
                  style={[
                    s.resultCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[s.resultLabel, { color: colors.textSecondary }]}
                  >
                    Expected CGPA
                  </Text>
                  <Text
                    style={[
                      s.resultVal,
                      { color: classifyGpa(calculations.expectedCgpa).color },
                    ]}
                  >
                    {calculations.expectedCgpa}
                  </Text>
                  <Text
                    style={[
                      s.resultCls,
                      { color: classifyGpa(calculations.expectedCgpa).color },
                    ]}
                  >
                    {classifyGpa(calculations.expectedCgpa).label}
                  </Text>
                </View>
                <View
                  style={[
                    s.resultCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[s.resultLabel, { color: colors.textSecondary }]}
                  >
                    Term GPA
                  </Text>
                  <Text
                    style={[
                      s.resultVal,
                      { color: classifyGpa(calculations.termGpa).color },
                    ]}
                  >
                    {calculations.termGpa}
                  </Text>
                  <Text
                    style={[
                      s.resultCls,
                      { color: classifyGpa(calculations.termGpa).color },
                    ]}
                  >
                    {classifyGpa(calculations.termGpa).label}
                  </Text>
                </View>
              </View>
            )}

            {/* Course list */}
            {courses.length > 0 ? (
              <View
                style={[
                  s.courseListCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    s.courseListHeader,
                    { borderBottomColor: colors.divider },
                  ]}
                >
                  <Text
                    style={[s.courseListTitle, { color: colors.textPrimary }]}
                  >
                    Courses
                  </Text>
                  <View
                    style={[
                      s.courseCountBadge,
                      { backgroundColor: colors.indigoPale },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.indigo,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {courses.length}
                    </Text>
                  </View>
                </View>
                {courses.map((c) => {
                  const gVal = grades[c.id] ?? 0;
                  const gCls = classifyGpa(gVal);
                  return (
                    <View
                      key={c.id}
                      style={[
                        s.courseRow,
                        { borderBottomColor: colors.divider },
                      ]}
                    >
                      <View style={{ flex: 1, paddingLeft: 10 }}>
                        {dataSource === "manual" ? (
                          <>
                            <TextInput
                              style={[
                                s.courseName,
                                { color: colors.textPrimary },
                              ]}
                              value={c.name}
                              onChangeText={(v) =>
                                updateManualCourse(c.id, "name", v)
                              }
                              placeholder="Course name"
                              placeholderTextColor={colors.textMuted}
                            />
                            <TextInput
                              style={[
                                s.courseMeta,
                                { color: colors.textMuted },
                              ]}
                              value={c.code}
                              onChangeText={(v) =>
                                updateManualCourse(c.id, "code", v)
                              }
                              placeholder="Code · Credits"
                              placeholderTextColor={colors.textMuted}
                            />
                          </>
                        ) : (
                          <>
                            <Text
                              style={[
                                s.courseName,
                                { color: colors.textPrimary },
                              ]}
                              numberOfLines={1}
                            >
                              {c.name || c.code}
                            </Text>
                            <Text
                              style={[
                                s.courseMeta,
                                { color: colors.textMuted },
                              ]}
                            >
                              {c.code} · {c.credits} Hrs
                            </Text>
                          </>
                        )}
                      </View>
                      <View style={s.courseControls}>
                        <View
                          style={[
                            s.stepperWrap,
                            {
                              borderColor: colors.border,
                              backgroundColor: colors.bg,
                            },
                          ]}
                        >
                          <TouchableOpacity
                            style={s.stepperBtn}
                            onPress={() =>
                              handleGradeChange(
                                c.id,
                                String(Math.max(0, gVal - 0.1)),
                              )
                            }
                          >
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontSize: 18,
                              }}
                            >
                              −
                            </Text>
                          </TouchableOpacity>
                          <TextInput
                            style={[
                              s.stepperInput,
                              { color: colors.textPrimary },
                            ]}
                            keyboardType="numeric"
                            value={String(gVal)}
                            onChangeText={(v) => handleGradeChange(c.id, v)}
                          />
                          <TouchableOpacity
                            style={s.stepperBtn}
                            onPress={() =>
                              handleGradeChange(
                                c.id,
                                String(Math.min(5, gVal + 0.1)),
                              )
                            }
                          >
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontSize: 18,
                              }}
                            >
                              +
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={[s.coursePts, { color: gCls.color }]}>
                          {(gVal * c.credits).toFixed(1)} Pts
                        </Text>
                      </View>
                      {dataSource === "manual" && (
                        <TouchableOpacity
                          onPress={() => removeManualCourse(c.id)}
                          style={{ padding: 8 }}
                        >
                          <Feather name="x" size={16} color={colors.red} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                {dataSource === "manual" && (
                  <TouchableOpacity
                    style={[s.addCourseBtn, { borderTopColor: colors.divider }]}
                    onPress={addManualCourse}
                  >
                    <Feather name="plus" size={16} color={colors.indigo} />
                    <Text
                      style={[s.addCourseBtnText, { color: colors.indigo }]}
                    >
                      Add Course
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View
                style={[
                  s.emptyCoursesCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Feather
                  name="book-open"
                  size={32}
                  color={colors.indigoLight}
                />
                <Text style={[s.emptyCoursesText, { color: colors.textMuted }]}>
                  {dataSource === "manual"
                    ? 'Tap "Add Course" to get started'
                    : "Select a data source above to load courses"}
                </Text>
                {dataSource === "manual" && (
                  <TouchableOpacity
                    style={[
                      s.primaryBtn,
                      {
                        backgroundColor: colors.indigo,
                        paddingHorizontal: 24,
                        marginTop: 8,
                      },
                    ]}
                    onPress={addManualCourse}
                  >
                    <Text style={s.primaryBtnText}>Add Course</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={{ height: 110 }} />
          </>
        )}

        {/* ── Planner Tab ── */}
        {activeTab === "planner" && (
          <>
            <View
              style={[
                s.targetCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={s.targetIcon}>🎯</Text>
              <Text style={[s.targetTitle, { color: colors.textPrimary }]}>
                Set Your Target
              </Text>
              <Text style={[s.targetDesc, { color: colors.textSecondary }]}>
                Find out what grades you need to achieve your target CGPA.
              </Text>

              <View
                style={[
                  s.elegantInput,
                  {
                    backgroundColor: colors.indigoPale,
                    borderColor: colors.indigoLight,
                    marginVertical: 20,
                  },
                ]}
              >
                <View
                  style={[s.elegantIconWrap, { backgroundColor: colors.card }]}
                >
                  <Feather name="target" size={20} color={colors.indigo} />
                </View>
                <View style={s.elegantInputContent}>
                  <Text
                    style={[s.elegantLabel, { color: colors.textSecondary }]}
                  >
                    Target CGPA
                  </Text>
                  <TextInput
                    style={[s.elegantField, { color: colors.textPrimary }]}
                    keyboardType="decimal-pad"
                    placeholder="e.g., 4.5"
                    placeholderTextColor={colors.textMuted}
                    value={targetCgpa}
                    onChangeText={setTargetCgpa}
                  />
                </View>
                {targetCls && (
                  <View
                    style={[
                      s.badge,
                      { backgroundColor: targetCls.color + "20" },
                    ]}
                  >
                    <Text style={[s.badgeText, { color: targetCls.color }]}>
                      {targetCls.label}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.indigo }]}
                onPress={computeTarget}
              >
                <Text style={s.primaryBtnText}>Calculate Plan</Text>
              </TouchableOpacity>
              {calculations && (
                <Text style={[s.maxInfo, { color: colors.textMuted }]}>
                  Max possible this term:{" "}
                  <Text
                    style={{ color: colors.textPrimary, fontWeight: "700" }}
                  >
                    {calculations.maxCgpa}
                  </Text>
                </Text>
              )}
            </View>

            {strategy?.error && (
              <View style={[s.alertBox, { backgroundColor: colors.redLight }]}>
                <Text style={{ color: colors.red }}>{strategy.error}</Text>
              </View>
            )}

            {strategy && !strategy.error && !strategy.possible && (
              <View
                style={[
                  s.alertBox,
                  { backgroundColor: colors.redLight, padding: 20 },
                ]}
              >
                <Text
                  style={{
                    fontSize: 30,
                    textAlign: "center",
                    marginBottom: 10,
                  }}
                >
                  ⚠️
                </Text>
                <Text style={[s.alertTitle, { color: colors.red }]}>
                  Target Impossible
                </Text>
                <Text style={[s.alertText, { color: colors.red }]}>
                  Max reachable is{" "}
                  <Text style={{ fontWeight: "800" }}>{strategy.maxCgpa}</Text>.
                  Try a lower target.
                </Text>
              </View>
            )}

            {strategy?.possible && strategy.plan && (
              <View
                style={[
                  s.strategyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={[s.stratHead]}>
                  <Text style={{ fontSize: 24, paddingRight: 10 }}>✅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.stratTitle, { color: colors.textPrimary }]}>
                      Target Achievable
                    </Text>
                    <Text style={[s.stratSub, { color: colors.textSecondary }]}>
                      Need term GPA of{" "}
                      <Text
                        style={{ fontWeight: "800", color: colors.textPrimary }}
                      >
                        {strategy.requiredTermGpa}
                      </Text>
                    </Text>
                  </View>
                </View>
                {strategy.note && (
                  <View
                    style={[
                      s.alertBox,
                      {
                        backgroundColor: colors.indigoPale,
                        marginHorizontal: 20,
                        marginBottom: 16,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.indigo }}>
                      {strategy.note}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    s.courseListHeader,
                    {
                      borderBottomColor: colors.divider,
                      paddingHorizontal: 20,
                    },
                  ]}
                >
                  <Text
                    style={[s.courseListTitle, { color: colors.textPrimary }]}
                  >
                    Suggested Grades
                  </Text>
                </View>
                {strategy.plan.map((c: any) => {
                  const gi = classifyGpa(c.requiredGrade);
                  return (
                    <View
                      key={c.id}
                      style={[
                        s.courseRow,
                        {
                          borderBottomColor: colors.divider,
                          paddingHorizontal: 20,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[s.courseName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {c.name || c.code}
                        </Text>
                        <Text
                          style={[s.courseMeta, { color: colors.textMuted }]}
                        >
                          {c.code} · {c.credits} Hrs
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={[
                            s.stratReqGrade,
                            { color: gi.color || colors.textPrimary },
                          ]}
                        >
                          {c.requiredGrade}
                        </Text>
                        <Text
                          style={[
                            s.stratReqName,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {gradeLabel(c.requiredGrade)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={{ height: 110 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  onboardCenter: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingBottom: 110,
  },
  onboardIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(63,81,181,0.1)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  onboardTitle: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  onboardSub: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  inputCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  elegantInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 8,
    paddingRight: 16,
  },
  elegantIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  elegantInputContent: { flex: 1, marginLeft: 12, marginRight: 12 },
  elegantLabel: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  elegantField: { fontSize: 17, fontWeight: "800", padding: 0 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  primaryBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  errorBox: { padding: 14, borderRadius: 12, marginBottom: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  screenTitle: { fontSize: 22, fontWeight: "800" },
  screenSubtitle: { fontSize: 13, marginTop: 2 },
  editBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: { fontSize: 12, fontWeight: "700" },
  strip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  stripItem: { alignItems: "center", flex: 1 },
  stripLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  stripVal: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  stripDiv: { width: 1, height: 24 },
  tabsRow: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 10 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 13, fontWeight: "700" },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  sourceIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  resultCardsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  resultCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
  },
  resultLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  resultVal: { fontSize: 32, fontWeight: "900", marginBottom: 4 },
  resultCls: { fontSize: 12, fontWeight: "700" },
  courseListCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
  },
  courseListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  courseListTitle: { fontSize: 16, fontWeight: "800" },
  courseCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  courseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  courseName: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  courseMeta: { fontSize: 12 },
  courseControls: { alignItems: "center", width: 110 },
  stepperWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 6,
  },
  stepperBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  stepperInput: {
    width: 40,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 4,
  },
  coursePts: { fontSize: 11, fontWeight: "700" },
  addCourseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 14,
    borderTopWidth: 1,
  },
  addCourseBtnText: { fontSize: 14, fontWeight: "700" },
  emptyCoursesCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  emptyCoursesText: { fontSize: 14, textAlign: "center" },
  targetCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  targetIcon: { fontSize: 40, marginBottom: 12 },
  targetTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  targetDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  maxInfo: { fontSize: 13, marginTop: 16 },
  alertBox: { padding: 16, borderRadius: 16, marginBottom: 20 },
  alertTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  alertText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  strategyCard: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  stratHead: { flexDirection: "row", alignItems: "center", padding: 20 },
  stratTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  stratSub: { fontSize: 13 },
  stratReqGrade: { fontSize: 18, fontWeight: "900" },
  stratReqName: { fontSize: 11, fontWeight: "600", marginTop: 2 },
});

// Modal styles
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", marginBottom: 16 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  optIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  optDesc: { fontSize: 13 },
});

// Upload flow styles
const u = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: "800" },
  dropZone: {
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    padding: 36,
    marginBottom: 16,
  },
  dropIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  dropTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  dropSub: { fontSize: 13, textAlign: "center" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    borderRadius: 14,
    gap: 10,
    marginBottom: 12,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
  infoRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  infoCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  infoLabel: { fontSize: 13, fontWeight: "700" },
  processingCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    gap: 16,
    marginTop: 20,
  },
  processingTitle: { fontSize: 18, fontWeight: "700" },
  processingSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  summaryCard: { borderRadius: 20, padding: 22, marginBottom: 20 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  summaryItem: { alignItems: "center" },
  summaryVal: { fontSize: 28, fontWeight: "900", color: "#fff" },
  summaryLbl: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  summaryDiv: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  confidenceText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  courseCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  courseCode: { fontSize: 16, fontWeight: "800" },
  courseFields: { flexDirection: "row", gap: 10 },
  fieldGroup: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  fieldInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: "center",
  },
});

// History flow styles
const h = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  centered: { alignItems: "center", paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 14 },
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    gap: 16,
    marginTop: 20,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 14 },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  fileDate: { fontSize: 12, marginBottom: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  gpaText: { fontSize: 12 },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  useBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  useText: { fontSize: 12, fontWeight: "700" },
  deleteBtn: { padding: 8 },
});
