import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

import { API_URL } from "@/firebase";

const scheduleAPI = {
  getMyTimetable: async (token: string) => {
    const res = await fetch(`${API_URL}/api/schedule/my-timetable`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return safeJsonParse(res);
  },
  addEntry: async (payload: any, token: string) => {
    const res = await fetch(`${API_URL}/api/schedule/add-entry`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return safeJsonParse(res);
  },
  deleteSession: async (id: string, token: string) => {
    const res = await fetch(`${API_URL}/api/schedule/session/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return safeJsonParse(res);
  },
  importFromImage: async (
    uri: string,
    type: string,
    name: string,
    token: string,
  ) => {
    const formData = new FormData();
    formData.append("file", { uri, type, name } as any);
    const res = await fetch(`${API_URL}/api/schedule/import-from-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return safeJsonParse(res);
  },
  saveFullTimetable: async (entries: any[], token: string) => {
    const res = await fetch(`${API_URL}/api/schedule/save-timetable`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entries, title: "Mobile Sync" }),
    });
    return safeJsonParse(res);
  },
};

// ── Safe JSON parser to handle HTML error pages gracefully ──
const safeJsonParse = async (response: Response) => {
  const text = await response.text();
  if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
    console.error(
      `[TimeTable] 🔴 Server returned HTML from: ${response.url} (Status: ${response.status})`,
    );
    throw new Error("Server returned HTML. Check that backend is running.");
  }
  try {
    return JSON.parse(text);
  } catch {
    console.error(
      `[TimeTable] 🔴 Failed to parse JSON from: ${response.url} (Status: ${response.status})\nExcerpt:`,
      text.substring(0, 200),
    );
    throw new Error("Invalid response from server.");
  }
};

// ── Map numeric dayOfWeek to day name string ──
const DAY_NUM_TO_NAME: Record<number, string> = {
  6: "Saturday",
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
};

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
];

function normalizeDayName(dayOfWeek: number | string): string {
  if (typeof dayOfWeek === "number")
    return DAY_NUM_TO_NAME[dayOfWeek] || "Sunday";
  if (DAYS.includes(dayOfWeek)) return dayOfWeek;
  const num = parseInt(String(dayOfWeek), 10);
  if (!isNaN(num)) return DAY_NUM_TO_NAME[num] || "Sunday";
  return dayOfWeek;
}

const SLOTS: Record<number, { start: string; end: string }[]> = {
  2: [
    { start: "8:00 AM", end: "10:00 AM" },
    { start: "10:00 AM", end: "12:00 PM" },
    { start: "12:00 PM", end: "2:00 PM" },
    { start: "2:00 PM", end: "4:00 PM" },
    { start: "4:00 PM", end: "6:00 PM" },
    { start: "6:00 PM", end: "8:00 PM" },
  ],
  3: [
    { start: "8:00 AM", end: "11:00 AM" },
    { start: "11:00 AM", end: "2:00 PM" },
    { start: "2:00 PM", end: "5:00 PM" },
    { start: "5:00 PM", end: "8:00 PM" },
  ],
};

const TYPE_LABELS: Record<string, string> = {
  Lec: "Lecture",
  Sec: "Section",
  Lab: "Lab",
};
const TYPE_COLORS: Record<string, string> = {
  Lec: "#6366f1",
  Sec: "#14b8a6",
  Lab: "#f59e0b",
};

// Map sessionType back to short code for display
const TYPE_TO_SHORT: Record<string, string> = {
  Lecture: "Lec",
  Section: "Sec",
  Lab: "Lab",
};

// Convert 24h HH:mm to 12h display
function to12h(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${suffix}`;
}

// Convert 12h display back to 24h HH:mm
function to24h(time12: string): string {
  if (!time12) return "08:00";
  const parts = time12.trim().split(" ");
  const modifier = parts[1]?.toUpperCase() || "AM";
  const [hoursStr, minutesStr] = (parts[0] || "8:00").split(":");
  let h = parseInt(hoursStr, 10);
  const m = (minutesStr || "00").padStart(2, "0");
  if (modifier === "PM" && h !== 12) h += 12;
  if (modifier === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
}

interface ScheduleEntry {
  id: number | string;
  subject: string;
  type: string;
  day: string;
  slot: { start: string; end: string };
  group: string;
  place: string;
}

interface RegisteredCourse {
  name: string;
  courseCode: string;
  creditHours: number;
}

interface FormState {
  subject: string;
  type: string;
  day: string;
  duration: 2 | 3;
  slotIndex: number;
  group: string;
  place: string;
}

interface ConflictState {
  type: string;
  msg: string;
}

interface OCREntry {
  _id?: string;
  courseCode: string;
  courseName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sessionType: string;
  groupNumber: string;
  location: string;
}

const STORAGE_KEY = "@nazamly_schedules_v2";

const initialForm: FormState = {
  subject: "",
  type: "Lec",
  day: DAYS[0],
  duration: 2,
  slotIndex: 0,
  group: "",
  place: "",
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const TimetableScreen = () => {
  const { colors } = useAppTheme();
  const { user, backendUser } = useAuth();

  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [registeredCourses, setRegisteredCourses] = useState<
    RegisteredCourse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [conflict, setConflict] = useState<ConflictState | null>(null);

  // ── OCR Import state ──
  const [scanLoading, setScanLoading] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [ocrPreviewEntries, setOcrPreviewEntries] = useState<OCREntry[]>([]);
  const [ocrConfidence, setOcrConfidence] = useState(0);
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);

  // Pulse animation for scanning
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (scanLoading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [scanLoading, pulseAnim]);

  const slots = SLOTS[form.duration];

  // ── Load from DB & AsyncStorage ──
  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      if (user) {
        try {
          const token = await user.getIdToken();
          // Fetch unified timetable (includes entries and termCourses)
          const json = await scheduleAPI.getMyTimetable(token);

          if (json.success && json.data) {
            // 1. Map Timetable Entries
            if (json.data.entries) {
              const dbEntries = json.data.entries.map((e: any) => ({
                id:
                  e._id ||
                  `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                subject: e.courseName || e.courseCode || "",
                type: TYPE_TO_SHORT[e.sessionType] || "Lec",
                day: normalizeDayName(e.dayOfWeek),
                slot: { start: to12h(e.startTime), end: to12h(e.endTime) },
                group: e.groupNumber || "",
                place: e.location || "",
              }));
              setSchedules(dbEntries);
              await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(dbEntries),
              );
            }

            // 2. Map Registered Courses (Term Courses)
            if (json.data.termCourses) {
              const mappedCourses = json.data.termCourses.map((c: any) => ({
                name: c.name || c.courseName || "",
                courseCode: c.courseCode || "",
                creditHours: c.creditHours || 0,
              }));
              setRegisteredCourses(mappedCourses);
            }
          }
        } catch (dbErr) {
          console.error("[Timetable] DB Load error:", dbErr);
        }
      }

      // Fallback to AsyncStorage if DB fails
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) setSchedules(JSON.parse(saved));
    } catch (err) {
      console.error("[Timetable] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [loadSchedules]),
  );

  // ── Save to AsyncStorage whenever schedules change ──
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(schedules)).catch(
        console.error,
      );
    }
  }, [schedules, loading]);

  const handleChange = (field: keyof FormState, value: any) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "duration" ? { slotIndex: 0 } : {}),
    }));
  };

  // ── Conflict validation ──
  const validate = (): boolean => {
    const slot = slots[form.slotIndex];

    const timeConflict = schedules.find(
      (s) => s.day === form.day && s.slot.start === slot.start,
    );
    if (timeConflict) {
      setAddModalVisible(false);
      setTimeout(
        () =>
          setConflict({
            type: "time",
            msg: `You already have "${timeConflict.subject}" at this time!`,
          }),
        300,
      );
      return false;
    }

    const sameType = schedules.find(
      (s) =>
        s.subject.trim().toLowerCase() === form.subject.trim().toLowerCase() &&
        s.type === form.type,
    );
    if (sameType) {
      setAddModalVisible(false);
      setTimeout(
        () =>
          setConflict({
            type: "type",
            msg: `"${form.subject}" is already registered as ${TYPE_LABELS[form.type]}!`,
          }),
        300,
      );
      return false;
    }

    const sameSubjectCount = schedules.filter(
      (s) =>
        s.subject.trim().toLowerCase() === form.subject.trim().toLowerCase(),
    ).length;
    if (sameSubjectCount >= 2) {
      setAddModalVisible(false);
      setTimeout(
        () =>
          setConflict({
            type: "limit",
            msg: `"${form.subject}" has reached the limit (2 entries max)!`,
          }),
        300,
      );
      return false;
    }

    return true;
  };

  const addSchedule = async () => {
    if (!form.subject.trim()) {
      setAddModalVisible(false);
      setTimeout(
        () =>
          setConflict({ type: "empty", msg: "Please enter the subject name." }),
        300,
      );
      return;
    }
    if (!validate()) return;

    const slot = slots[form.slotIndex];
    setForm(initialForm);
    setAddModalVisible(false);

    try {
      if (user) {
        const token = await user.getIdToken();
        const payload = {
          courseName: form.subject.trim(),
          dayOfWeek: form.day,
          startTime: to24h(slot.start),
          endTime: to24h(slot.end),
          sessionType:
            form.type === "Lec"
              ? "Lecture"
              : form.type === "Sec"
                ? "Section"
                : "Lab",
          location: form.place || "",
          groupNumber: form.group || "",
        };

        const json = await scheduleAPI.addEntry(payload, token);
        if (json.success) {
          // Reload from DB to get the authoritative state
          await loadSchedules();
          return;
        }
      }
    } catch (err) {
      console.error("[TimeTable] Error saving to DB:", err);
    }

    // Fallback: add locally if DB save failed or no user
    setSchedules((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        subject: form.subject.trim(),
        type: form.type,
        day: form.day,
        slot,
        group: form.group,
        place: form.place,
      },
    ]);
  };

  const removeSchedule = async (id: number | string) => {
    // Optimistic UI: remove locally first
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    try {
      if (user && typeof id === "string" && !id.startsWith("local-")) {
        const token = await user.getIdToken();
        await scheduleAPI.deleteSession(id, token);
      }
    } catch (err) {
      console.error("[TimeTable] Error deleting from DB:", err);
      // Reload to restore if delete failed
      await loadSchedules();
    }
  };

  // ── OCR Import Functions ──
  const handleScanPress = () => {
    setSourcePickerVisible(true);
  };

  const handleOcrUpload = async (
    uri: string,
    mimeType: string,
    fileName: string,
  ) => {
    if (!user) {
      Alert.alert("Not logged in", "Please sign in to use the scan feature.");
      return;
    }

    setScanLoading(true);

    try {
      const token = await user.getIdToken();
      const response = await scheduleAPI.importFromImage(
        uri,
        mimeType,
        fileName,
        token,
      );

      if (response.success && response.data) {
        const entries = response.data.entries || [];
        setOcrPreviewEntries(entries);
        setScanModalVisible(true);
      } else {
        Alert.alert(
          "Extraction Failed",
          response.message || "Could not extract classes from the image.",
        );
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Upload failed");
    } finally {
      setScanLoading(false);
    }
  };

  const pickFromCamera = async () => {
    setSourcePickerVisible(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Camera access is required to scan your schedule.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleOcrUpload(result.assets[0].uri, "image/jpeg", "camera.jpg");
    }
  };

  const pickFromGallery = async () => {
    setSourcePickerVisible(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleOcrUpload(result.assets[0].uri, "image/jpeg", "gallery.jpg");
    }
  };

  const pickDocument = async () => {
    setSourcePickerVisible(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleOcrUpload(
        result.assets[0].uri,
        result.assets[0].mimeType || "application/pdf",
        result.assets[0].name,
      );
    }
  };

  const confirmOCRImport = async () => {
    if (!user || ocrPreviewEntries.length === 0) return;

    setScanLoading(true);
    try {
      const token = await user.getIdToken();
      // Map OCR results to the format expected by save-timetable
      const payload = ocrPreviewEntries.map((e) => ({
        courseName: e.courseName || e.courseCode,
        courseCode: e.courseCode || "",
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        sessionType: e.sessionType,
        location: e.location || "",
        groupNumber: e.groupNumber || "",
      }));

      const json = await scheduleAPI.saveFullTimetable(payload, token);
      if (json.success) {
        setScanModalVisible(false);
        setOcrPreviewEntries([]);
        await loadSchedules();
      } else {
        Alert.alert("Sync Error", "Could not save scanned schedule to cloud.");
      }
    } catch (err) {
      console.error("[TimeTable] OCR Confirm Sync Error:", err);
    } finally {
      setScanLoading(false);
    }
  };

  const syncToCloud = async () => {
    if (!user || schedules.length === 0) {
      Alert.alert("Sync Info", "No schedules to sync or not logged in.");
      return;
    }

    setLoading(true);
    try {
      const token = await user.getIdToken();
      // Map local entries back to backend format
      const payload = schedules.map((s) => {
        const to24h = (time12h: string) => {
          if (!time12h) return "00:00";
          const [time, modifier] = time12h.split(" ");
          let [hours, minutes] = time.split(":").map(Number);
          if (hours === 12) hours = 0;
          if (modifier === "PM") hours += 12;
          return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        };

        const dayToNum = (dayName: string) => {
          const map: Record<string, number> = {
            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
          };
          return map[dayName] || 0;
        };

        return {
          courseName: s.subject,
          dayOfWeek: dayToNum(s.day),
          startTime: to24h(s.slot.start),
          endTime: to24h(s.slot.end),
          sessionType:
            s.type === "Lec" ? "Lecture" : s.type === "Sec" ? "Section" : "Lab",
          location: s.place || "",
          groupNumber: s.group || "",
        };
      });

      const json = await scheduleAPI.saveFullTimetable(payload, token);
      if (json.success) {
        Alert.alert("Success", "Schedule synchronized with cloud!");
        await loadSchedules();
      }
    } catch (err) {
      console.error("[TimeTable] Manual Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group by day
  const scheduleByDay: Record<string, ScheduleEntry[]> = DAYS.reduce(
    (acc, day) => {
      acc[day] = schedules
        .filter((s) => s.day === day)
        .sort((a, b) => a.slot.start.localeCompare(b.slot.start));
      return acc;
    },
    {} as Record<string, ScheduleEntry[]>,
  );

  // Identify registered courses NOT in the schedule
  const missingFromSchedule = useMemo(() => {
    return registeredCourses.filter(
      (rc) =>
        !schedules.some(
          (s) =>
            s.subject.toLowerCase().includes(rc.courseCode.toLowerCase()) ||
            rc.courseCode.toLowerCase().includes(s.subject.toLowerCase()),
        ),
    );
  }, [registeredCourses, schedules]);

  const handleQuickAdd = (rc: RegisteredCourse) => {
    setForm((prev) => ({
      ...prev,
      subject: rc.name || rc.courseCode,
      place: "",
      group: "",
    }));
    setAddModalVisible(true);
  };

  const s = useMemo(() => styles(colors), [colors]);

  return (
    <SafeAreaView style={s.container}>
      {/* ── Active Sync Banner ── */}
      {backendUser?.timeTableId && (
        <View style={s.syncBanner}>
          <Feather name="cloud" size={14} color={colors.indigo} />
          <Text style={s.syncBannerText}>
            Linked: {backendUser.timeTableId.substring(0, 12)}...
          </Text>
          <View style={s.syncBadge}>
            <Text style={s.syncBadgeText}>ACTIVE</Text>
          </View>
        </View>
      )}

      {/* ── Conflict Popup ── */}
      <Modal visible={!!conflict} transparent animationType="fade">
        <TouchableOpacity
          style={s.conflictOverlay}
          activeOpacity={1}
          onPress={() => setConflict(null)}
        >
          <TouchableOpacity
            style={s.conflictPopup}
            activeOpacity={1}
            onPress={() => {}}
          >
            <Text style={s.conflictIcon}>⚠️</Text>
            <Text style={s.conflictTitle}>Schedule Conflict</Text>
            <Text style={s.conflictMsg}>{conflict?.msg}</Text>
            <TouchableOpacity
              style={s.conflictBtn}
              onPress={() => setConflict(null)}
            >
              <Text style={s.conflictBtnText}>OK</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.screenTitle}>Schedule</Text>
          <Text style={s.subtitle}>
            {schedules.length} {schedules.length === 1 ? "Class" : "Classes"}
          </Text>
        </View>
        <View style={s.headerActions}>
          {/* Sync/Save Button */}
          <TouchableOpacity
            style={[s.scanButton, { backgroundColor: colors.indigo + "20" }]}
            onPress={syncToCloud}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.indigo} />
            ) : (
              <>
                <Feather name="refresh-cw" size={16} color={colors.indigo} />
                <Text style={[s.scanButtonText, { color: colors.indigo }]}>Save</Text>
              </>
            )}
          </TouchableOpacity>
          {/* Add Class Button */}
          <TouchableOpacity
            style={s.addButton}
            onPress={() => setAddModalVisible(true)}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={s.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Schedule list grouped by day ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.indigo} />
        </View>
      ) : schedules.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIconCircle}>
            <Feather name="calendar" size={40} color={colors.indigo} />
          </View>
          <Text style={s.emptyTitle}>No Classes Yet</Text>
          <Text style={s.emptyText}>
            Add classes manually or scan your schedule photo
          </Text>

          {missingFromSchedule.length > 0 && (
            <View style={s.quickAddContainer}>
              <Text style={s.quickAddTitle}>From Your Profile:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.quickAddScroll}
              >
                {missingFromSchedule.map((rc) => (
                  <TouchableOpacity
                    key={rc.courseCode}
                    style={[
                      s.quickAddBtn,
                      { backgroundColor: colors.indigoPale },
                    ]}
                    onPress={() => handleQuickAdd(rc)}
                  >
                    <Text style={[s.quickAddBtnText, { color: colors.indigo }]}>
                      {rc.courseCode}
                    </Text>
                    <Feather
                      name="plus-circle"
                      size={12}
                      color={colors.indigo}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={s.emptyActions}>
            <TouchableOpacity
              style={s.emptyActionBtn}
              onPress={handleScanPress}
            >
              <Feather name="camera" size={18} color={colors.indigo} />
              <Text style={s.emptyActionText}>Scan Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.emptyActionBtn, s.emptyActionBtnFilled]}
              onPress={() => setAddModalVisible(true)}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={[s.emptyActionText, { color: "#fff" }]}>
                Add Manually
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {DAYS.map((day) => {
            const items = scheduleByDay[day];
            if (!items.length) return null;
            return (
              <View key={day} style={s.dayCard}>
                <View style={s.dayHeader}>
                  <Text style={s.dayTitle}>{day}</Text>
                  <View style={s.dayBadge}>
                    <Text style={s.dayBadgeText}>{items.length}</Text>
                  </View>
                </View>

                {items.map((item) => (
                  <View key={item.id} style={s.classCard}>
                    {/* Color accent bar */}
                    <View
                      style={[
                        s.classAccent,
                        {
                          backgroundColor: TYPE_COLORS[item.type] || "#6366f1",
                        },
                      ]}
                    />
                    <View style={s.classContent}>
                      {/* Top row: subject + delete */}
                      <View style={s.classTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.subjectText} numberOfLines={1}>
                            {item.subject}
                          </Text>
                          <View
                            style={[
                              s.typeBadge,
                              {
                                backgroundColor:
                                  (TYPE_COLORS[item.type] || "#6366f1") + "18",
                                borderColor:
                                  TYPE_COLORS[item.type] || "#6366f1",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                s.typeBadgeText,
                                { color: TYPE_COLORS[item.type] || "#6366f1" },
                              ]}
                            >
                              {TYPE_LABELS[item.type] || item.type}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => removeSchedule(item.id)}
                          style={s.deleteBtn}
                        >
                          <Feather name="trash-2" size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                      {/* Info row */}
                      <View style={s.classInfoRow}>
                        <View style={s.infoItem}>
                          <Feather
                            name="clock"
                            size={12}
                            color={colors.textMuted}
                          />
                          <Text style={s.infoText}>
                            {item.slot.start} – {item.slot.end}
                          </Text>
                        </View>
                        {item.group ? (
                          <View style={s.infoItem}>
                            <Feather
                              name="users"
                              size={12}
                              color={colors.textMuted}
                            />
                            <Text style={s.infoText}>{item.group}</Text>
                          </View>
                        ) : null}
                        {item.place ? (
                          <View style={s.infoItem}>
                            <Feather
                              name="map-pin"
                              size={12}
                              color={colors.textMuted}
                            />
                            <Text style={s.infoText}>{item.place}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}

          {missingFromSchedule.length > 0 && (
            <View style={s.suggestedSection}>
              <View style={s.sectionDivider} />
              <Text style={s.suggestedTitle}>Registered Courses to Add</Text>
              <View style={s.suggestedGrid}>
                {missingFromSchedule.map((rc) => (
                  <TouchableOpacity
                    key={rc.courseCode}
                    style={s.classCard}
                    onPress={() => handleQuickAdd(rc)}
                  >
                    <View
                      style={[
                        s.classAccent,
                        { backgroundColor: colors.indigo },
                      ]}
                    />
                    <View style={s.classContent}>
                      <View style={s.classTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.subjectText}>{rc.name}</Text>
                          <Text style={[s.infoText, { fontSize: 10 }]}>
                            {rc.courseCode}
                          </Text>
                        </View>
                        <View
                          style={[
                            s.suggestedPlus,
                            { backgroundColor: colors.indigo },
                          ]}
                        >
                          <Feather name="plus" size={14} color="#fff" />
                        </View>
                      </View>
                      <View style={s.classInfoRow}>
                        <View style={s.infoItem}>
                          <Feather
                            name="book-open"
                            size={12}
                            color={colors.textMuted}
                          />
                          <Text style={s.infoText}>
                            {rc.creditHours} Credits
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Add Class Modal ── */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {/* Modal Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Class</Text>
              <TouchableOpacity
                onPress={() => {
                  setAddModalVisible(false);
                  setForm(initialForm);
                }}
              >
                <Feather name="x" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              {/* Subject Name */}
              <Text style={s.label}>Subject Name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Operating Systems"
                placeholderTextColor={colors.textMuted}
                value={form.subject}
                onChangeText={(t) => handleChange("subject", t)}
              />

              {/* Type selector */}
              <Text style={s.label}>Class Type</Text>
              <View style={s.typeRow}>
                {Object.entries(TYPE_LABELS).map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      s.typeBtn,
                      form.type === key && {
                        backgroundColor: TYPE_COLORS[key],
                        borderColor: TYPE_COLORS[key],
                      },
                    ]}
                    onPress={() => handleChange("type", key)}
                  >
                    <Text
                      style={[
                        s.typeBtnCode,
                        form.type === key && { color: "#fff" },
                      ]}
                    >
                      {key}
                    </Text>
                    <Text
                      style={[
                        s.typeBtnLabel,
                        form.type === key && { color: "#fff" },
                      ]}
                    >
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Day picker */}
              <Text style={s.label}>Day</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.chipRow}
              >
                {DAYS.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[s.chip, form.day === day && s.chipActive]}
                    onPress={() => handleChange("day", day)}
                  >
                    <Text
                      style={[s.chipText, form.day === day && s.chipTextActive]}
                    >
                      {day.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Duration selector */}
              <Text style={s.label}>Duration</Text>
              <View style={s.durationRow}>
                {([2, 3] as (2 | 3)[]).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      s.durationBtn,
                      form.duration === d && s.durationBtnActive,
                    ]}
                    onPress={() => handleChange("duration", d)}
                  >
                    <Text
                      style={[
                        s.durationBtnText,
                        form.duration === d && s.durationBtnTextActive,
                      ]}
                    >
                      {d === 2 ? "2 hours" : "3 hours"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Time slot picker */}
              <Text style={s.label}>Time Slot</Text>
              {slots.map((sl, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.slotBtn, form.slotIndex === i && s.slotBtnActive]}
                  onPress={() => handleChange("slotIndex", i)}
                >
                  <Text
                    style={[
                      s.slotBtnText,
                      form.slotIndex === i && s.slotBtnTextActive,
                    ]}
                  >
                    {sl.start} — {sl.end}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Group */}
              <Text style={s.label}>Group Number</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. G1"
                placeholderTextColor={colors.textMuted}
                value={form.group}
                onChangeText={(t) => handleChange("group", t)}
              />

              {/* Place */}
              <Text style={s.label}>Location</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Hall 101"
                placeholderTextColor={colors.textMuted}
                value={form.place}
                onChangeText={(t) => handleChange("place", t)}
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Submit */}
            <TouchableOpacity style={s.submitBtn} onPress={addSchedule}>
              <Text style={s.submitBtnText}>+ Add to Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles factory ───────────────────────────────────────────────────────────
const styles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },

    // Empty state
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.indigo + "15",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 6,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    emptyActions: { flexDirection: "row", gap: 12 },
    emptyActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.indigo,
    },
    emptyActionBtnFilled: {
      backgroundColor: colors.indigo,
      borderColor: colors.indigo,
    },
    emptyActionText: { fontSize: 14, fontWeight: "700", color: "#6366f1" },

    // Registered courses / Quick add
    quickAddContainer: { marginTop: 24, width: "100%", alignItems: "center" },
    quickAddTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 10,
    },
    quickAddScroll: { paddingHorizontal: 20, gap: 10 },
    quickAddBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    quickAddBtnText: { fontSize: 12, fontWeight: "700" },

    suggestedSection: { marginTop: 30, paddingBottom: 20 },
    sectionDivider: {
      height: 1,
      backgroundColor: colors.divider,
      marginBottom: 20,
      marginHorizontal: 40,
    },
    suggestedTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.textSecondary,
      marginBottom: 12,
      textAlign: "center",
    },
    suggestedGrid: {
      gap: 10,
      paddingHorizontal: 16,
    },
    suggestedCard: {
      width: "47%",
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    suggestedInfo: { flex: 1 },
    suggestedName: { fontSize: 12, fontWeight: "700", marginBottom: 2 },
    suggestedCode: { fontSize: 10 },
    suggestedPlus: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },

    // Header
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      paddingTop: 16,
    },
    screenTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
    headerActions: { flexDirection: "row", gap: 8 },
    scanButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#14b8a6",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      gap: 5,
      minWidth: 72,
      justifyContent: "center",
    },
    scanButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.indigo,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      gap: 5,
    },
    addButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },

    // Scanning banner
    scanningBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      padding: 14,
      backgroundColor: colors.indigo + "12",
      borderRadius: 12,
      marginBottom: 8,
    },
    scanningText: { fontSize: 13, color: colors.indigo, fontWeight: "500" },

    // Day card
    dayCard: { marginBottom: 16 },
    dayHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    dayTitle: { fontSize: 16, fontWeight: "bold", color: colors.textPrimary },
    dayBadge: {
      backgroundColor: colors.indigo + "20",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    dayBadgeText: { fontSize: 11, fontWeight: "bold", color: colors.indigo },

    // Class card (new design)
    classCard: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 14,
      marginBottom: 8,
      overflow: "hidden",
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    classAccent: { width: 4 },
    classContent: { flex: 1, padding: 12, paddingLeft: 14 },
    classTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    subjectText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    classInfoRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 8,
    },
    infoItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    infoText: { fontSize: 12, color: colors.textMuted },
    deleteBtn: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },

    // Type badge
    typeBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
    },
    typeBadgeText: { fontSize: 10, fontWeight: "bold" },

    // Conflict popup
    conflictOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 30,
    },
    conflictPopup: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 28,
      width: "100%",
      maxWidth: 340,
      alignItems: "center",
      elevation: 10,
    },
    conflictIcon: { fontSize: 40, marginBottom: 12 },
    conflictTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    conflictMsg: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 20,
    },
    conflictBtn: {
      backgroundColor: colors.indigo,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 12,
    },
    conflictBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    // Add class modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: "88%",
      padding: 20,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: "bold", color: colors.textPrimary },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
      marginTop: 14,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: colors.textPrimary,
    },

    // Type selector
    typeRow: { flexDirection: "row", gap: 10 },
    typeBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    typeBtnCode: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    typeBtnLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

    // Day chips
    chipRow: { flexDirection: "row", marginBottom: 4 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    chipActive: { backgroundColor: colors.indigo, borderColor: colors.indigo },
    chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
    chipTextActive: { color: "#fff", fontWeight: "700" },

    // Duration buttons
    durationRow: { flexDirection: "row", gap: 10 },
    durationBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    durationBtnActive: {
      borderColor: colors.indigo,
      backgroundColor: colors.indigo + "18",
    },
    durationBtnText: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: "500",
    },
    durationBtnTextActive: { color: colors.indigo, fontWeight: "700" },

    // Time slot picker
    slotBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 6,
      backgroundColor: colors.bg,
    },
    slotBtnActive: {
      borderColor: colors.indigo,
      backgroundColor: colors.indigo + "15",
    },
    slotBtnText: { fontSize: 14, color: colors.textMuted },
    slotBtnTextActive: { color: colors.indigo, fontWeight: "700" },

    // Submit button
    submitBtn: {
      backgroundColor: colors.indigo,
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 10,
    },
    submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    
    // Sync Banner Styles
    syncBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.indigo + "10",
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    syncBannerText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "600",
      color: colors.indigo,
    },
    syncBadge: {
      backgroundColor: colors.indigo,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    syncBadgeText: {
      fontSize: 9,
      fontWeight: "bold",
      color: "#fff",
    },
  });

export default TimetableScreen;
