import React, { useState, useEffect, useCallback } from "react";
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
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";

import { API_URL } from "@/firebase";

const parseScheduleFromImage = async (
  uri: string,
  mimeType: string,
  name: string,
  token: string,
) => {
  const formData = new FormData();
  formData.append("file", { uri, type: mimeType, name } as any);
  const res = await fetch(`${API_URL}/api/schedule/parse-from-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      payload.message || payload.error || "Failed to parse schedule",
    );
  return payload.data || payload;
};

const replaceScheduleWithEntries = async (
  entries: OCREntry[],
  token: string,
) => {
  const schedulePayload = entries.map((entry) => ({
    courseCode: entry.courseCode || entry.courseName,
    courseName: entry.courseName,
    type: entry.sessionType,
    dayOfWeek: entry.dayOfWeek,
    startTime: entry.startTime,
    endTime: entry.endTime,
    group: entry.groupNumber,
    location: entry.location,
  }));
  const res = await fetch(`${API_URL}/api/schedule/save-ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ schedule: schedulePayload }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      payload.message || payload.error || "Failed to replace schedule",
    );
  return payload.data || payload;
};
// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

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
const EDIT_TYPE_OPTIONS: Array<"Lecture" | "Section" | "Lab"> = [
  "Lecture",
  "Section",
  "Lab",
];

const DAY_NUMBER_TO_NAME: Record<number, string> = {
  6: "Saturday",
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
};

const DAY_NAME_TO_NUMBER: Record<string, number> = {
  Saturday: 6,
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
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

// Convert 12h/24h input to 24h HH:mm
function to24h(timeInput: string): string {
  if (!timeInput) return "";
  const raw = timeInput.trim().toUpperCase();
  const isPm = raw.includes("PM");
  const isAm = raw.includes("AM");
  const cleaned = raw.replace(/[^0-9:]/g, "");
  const [hStr, mStr = "00"] = cleaned.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h)) return "";
  if (isPm && h < 12) h += 12;
  if (isAm && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
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

interface EditFormState {
  courseCode: string;
  courseName: string;
  sessionType: "Lecture" | "Section" | "Lab";
  day: string;
  startTime: string;
  endTime: string;
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
  const { user } = useAuth();

  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [conflict, setConflict] = useState<ConflictState | null>(null);

  // ── OCR Import state ──
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState(
    "Analyzing your schedule with AI...",
  );
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [ocrPreviewEntries, setOcrPreviewEntries] = useState<OCREntry[]>([]);
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editContext, setEditContext] = useState<"schedule" | "ocr" | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    courseCode: "",
    courseName: "",
    sessionType: "Lecture",
    day: DAYS[0],
    startTime: "08:00",
    endTime: "10:00",
    groupNumber: "",
    location: "",
  });

  // Pulse animation for scanning
  const [pulseAnim] = useState(new Animated.Value(1));

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
  }, [scanLoading]);

  const slots = SLOTS[form.duration];

  // ── Load from DB & AsyncStorage ──
  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      if (user) {
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${API_URL}/api/schedule/my-timetable`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const json = await res.json();
          if (json.success && json.data?.entries) {
            // Map DB entries to LocalEntry
            const dbEntries = json.data.entries.map((e: any) => ({
              id: e._id || Date.now() + Math.random(),
              subject: e.courseCode || e.courseName || "",
              type: TYPE_TO_SHORT[e.sessionType] || "Lec",
              day: DAY_NUMBER_TO_NAME[e.dayOfWeek] || "Sunday",
              slot: { start: to12h(e.startTime), end: to12h(e.endTime) },
              group: e.groupNumber || "",
              place: e.location || "",
            }));
            setSchedules(dbEntries);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dbEntries));
            return;
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
    let newEntryId = Date.now().toString() as any;

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

        const res = await fetch(`${API_URL}/api/schedule/add-entry`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success && json.data?._id) {
          newEntryId = json.data._id;
        }
      }
    } catch (err) {
      console.error("[TimeTable] Error saving to DB:", err);
    }

    setSchedules((prev) => [
      ...prev,
      {
        id: newEntryId,
        subject: form.subject.trim(),
        type: form.type,
        day: form.day,
        slot,
        group: form.group,
        place: form.place,
      },
    ]);
    setForm(initialForm);
    setAddModalVisible(false);
  };

  const removeSchedule = async (id: number | string) => {
    try {
      if (user && typeof id === "string") {
        const token = await user.getIdToken();
        await fetch(`${API_URL}/api/schedule/session/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error("[TimeTable] Error deleting from DB:", err);
    }
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  // ── OCR Import Functions ──
  const handleScanPress = () => {
    setSourcePickerVisible(true);
  };

  const normalizeOcrEntry = (entry: any): OCREntry => {
    const dayOfWeek =
      typeof entry.dayOfWeek === "number"
        ? entry.dayOfWeek
        : (DAY_NAME_TO_NUMBER[entry.dayOfWeek] ?? 0);
    return {
      courseCode: entry.courseCode || "",
      courseName: entry.courseName || entry.courseCode || "",
      dayOfWeek,
      startTime: to24h(entry.startTime || ""),
      endTime: to24h(entry.endTime || ""),
      sessionType: entry.sessionType || "Lecture",
      groupNumber: entry.groupNumber || "",
      location: entry.location || "",
    };
  };

  const handleOcrUpload = async (
    uri: string,
    mimeType: string,
    name: string,
  ) => {
    if (!user) return;
    try {
      setScanMessage("Processing your schedule image...");
      setScanLoading(true);
      const token = await user.getIdToken();
      const res = await parseScheduleFromImage(uri, mimeType, name, token);
      const parsedEntries = (res.entries || []).map(normalizeOcrEntry);
      if (parsedEntries.length) {
        setOcrPreviewEntries(parsedEntries);
        setScanModalVisible(true);
      } else {
        Alert.alert(
          "No schedule found",
          "Could not extract schedule from this image.",
        );
      }
    } catch (err: any) {
      console.error("[TimeTable] OCR parse error:", err);
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

  const confirmOCRImport = async () => {
    if (!user) return;
    try {
      setScanMessage("Replacing your schedule...");
      setScanLoading(true);
      const token = await user.getIdToken();
      await replaceScheduleWithEntries(ocrPreviewEntries, token);
      await loadSchedules();
      setScanModalVisible(false);
      setOcrPreviewEntries([]);
    } catch (err: any) {
      console.error("[TimeTable] OCR replace error:", err);
      Alert.alert("Error", err.message || "Replace failed");
    } finally {
      setScanLoading(false);
    }
  };

  const openEditForSchedule = (entry: ScheduleEntry) => {
    setEditContext("schedule");
    setEditingId(entry.id);
    setEditingIndex(null);
    setEditForm({
      courseCode: "",
      courseName: entry.subject,
      sessionType:
        (TYPE_LABELS[entry.type] as EditFormState["sessionType"]) || "Lecture",
      day: entry.day,
      startTime: to24h(entry.slot.start),
      endTime: to24h(entry.slot.end),
      groupNumber: entry.group,
      location: entry.place,
    });
    setEditModalVisible(true);
  };

  const openEditForOcr = (entry: OCREntry, index: number) => {
    setEditContext("ocr");
    setEditingId(null);
    setEditingIndex(index);
    setEditForm({
      courseCode: entry.courseCode,
      courseName: entry.courseName || entry.courseCode,
      sessionType:
        (entry.sessionType as EditFormState["sessionType"]) || "Lecture",
      day: DAY_NUMBER_TO_NAME[entry.dayOfWeek] || "Sunday",
      startTime: entry.startTime,
      endTime: entry.endTime,
      groupNumber: entry.groupNumber,
      location: entry.location,
    });
    setEditModalVisible(true);
  };

  const removeOcrPreviewEntry = (index: number) => {
    setOcrPreviewEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditContext(null);
    setEditingId(null);
    setEditingIndex(null);
  };

  const handleEditSave = async () => {
    const startTime = to24h(editForm.startTime);
    const endTime = to24h(editForm.endTime);
    if (!editForm.courseName && !editForm.courseCode) {
      Alert.alert("Missing info", "Please enter a course name or code.");
      return;
    }
    const subjectLabel =
      editForm.courseName || editForm.courseCode || "Untitled";
    if (!startTime || !endTime) {
      Alert.alert("Missing time", "Please enter valid start and end times.");
      return;
    }

    if (editContext === "ocr" && editingIndex != null) {
      const nextEntry: OCREntry = {
        courseCode: editForm.courseCode || editForm.courseName,
        courseName: editForm.courseName || editForm.courseCode,
        dayOfWeek: DAY_NAME_TO_NUMBER[editForm.day] ?? 0,
        startTime,
        endTime,
        sessionType: editForm.sessionType,
        groupNumber: editForm.groupNumber,
        location: editForm.location,
      };
      setOcrPreviewEntries((prev) =>
        prev.map((entry, idx) => (idx === editingIndex ? nextEntry : entry)),
      );
      closeEditModal();
      return;
    }

    if (editContext === "schedule" && editingId != null) {
      const updatedEntry: ScheduleEntry = {
        id: editingId,
        subject: subjectLabel,
        type: TYPE_TO_SHORT[editForm.sessionType] || "Lec",
        day: editForm.day,
        slot: { start: to12h(startTime), end: to12h(endTime) },
        group: editForm.groupNumber,
        place: editForm.location,
      };

      setSchedules((prev) =>
        prev.map((entry) => (entry.id === editingId ? updatedEntry : entry)),
      );

      try {
        if (user && typeof editingId === "string") {
          const token = await user.getIdToken();
          await fetch(`${API_URL}/api/schedule/session/${editingId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              courseCode: editForm.courseCode,
              courseName: editForm.courseName,
              dayOfWeek: DAY_NAME_TO_NUMBER[editForm.day] ?? 0,
              startTime,
              endTime,
              sessionType: editForm.sessionType,
              groupNumber: editForm.groupNumber,
              location: editForm.location,
            }),
          });
        }
      } catch (err) {
        console.error("[TimeTable] Error updating session:", err);
      }
    }

    closeEditModal();
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

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
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
          <TouchableOpacity
            style={s.replaceButton}
            onPress={handleScanPress}
            disabled={scanLoading}
          >
            {scanLoading ? (
              <Animated.View style={{ opacity: pulseAnim }}>
                <ActivityIndicator size="small" color="#fff" />
              </Animated.View>
            ) : (
              <>
                <Feather name="camera" size={16} color="#fff" />
                <Text style={s.replaceButtonText}>Replace from Image</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scanning overlay ── */}
      {scanLoading && (
        <View style={s.scanningBanner}>
          <ActivityIndicator size="small" color={colors.indigo} />
          <Text style={s.scanningText}>{scanMessage}</Text>
        </View>
      )}

      {scanLoading && (
        <View style={s.processingOverlay}>
          <View style={s.processingCard}>
            <ActivityIndicator size="large" color={colors.indigo} />
            <Text style={s.processingText}>{scanMessage}</Text>
          </View>
        </View>
      )}

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
            Replace from an image or add classes manually
          </Text>
          <View style={s.emptyActions}>
            <TouchableOpacity
              style={s.emptyActionBtn}
              onPress={handleScanPress}
            >
              <Feather name="camera" size={18} color={colors.indigo} />
              <Text style={s.emptyActionText}>Replace from Image</Text>
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
                        <View style={s.classActions}>
                          <TouchableOpacity
                            onPress={() => openEditForSchedule(item)}
                            style={s.editBtn}
                          >
                            <Feather
                              name="edit-2"
                              size={15}
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => removeSchedule(item.id)}
                            style={s.deleteBtn}
                          >
                            <Feather name="trash-2" size={15} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
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
        </ScrollView>
      )}

      {/* ── Source Picker Modal ── */}
      <Modal visible={sourcePickerVisible} transparent animationType="fade">
        <TouchableOpacity
          style={s.sourceOverlay}
          activeOpacity={1}
          onPress={() => setSourcePickerVisible(false)}
        >
          <View style={s.sourceSheet}>
            <View style={s.sourceHandle} />
            <Text style={s.sourceTitle}>Replace Schedule</Text>
            <Text style={s.sourceSubtitle}>
              Choose how to upload your schedule image
            </Text>

            <TouchableOpacity style={s.sourceOption} onPress={pickFromCamera}>
              <View
                style={[
                  s.sourceIconCircle,
                  { backgroundColor: "#6366f1" + "18" },
                ]}
              >
                <Feather name="camera" size={22} color="#6366f1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sourceOptionTitle}>Take Photo</Text>
                <Text style={s.sourceOptionDesc}>
                  Capture your schedule with camera
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity style={s.sourceOption} onPress={pickFromGallery}>
              <View
                style={[
                  s.sourceIconCircle,
                  { backgroundColor: "#14b8a6" + "18" },
                ]}
              >
                <Feather name="image" size={22} color="#14b8a6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sourceOptionTitle}>From Gallery</Text>
                <Text style={s.sourceOptionDesc}>Pick an existing photo</Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.sourceCancelBtn}
              onPress={() => setSourcePickerVisible(false)}
            >
              <Text style={s.sourceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── OCR Preview Modal ── */}
      <Modal visible={scanModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.ocrModalContent}>
            {/* Header */}
            <View style={s.ocrModalHeader}>
              <View>
                <Text style={s.ocrModalTitle}>Extracted Classes</Text>
                <Text style={s.ocrModalSubtitle}>
                  {ocrPreviewEntries.length} classes found
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setScanModalVisible(false);
                  setOcrPreviewEntries([]);
                }}
              >
                <Feather name="x" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Preview list */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {ocrPreviewEntries.map((entry, idx) => {
                const typeShort = TYPE_TO_SHORT[entry.sessionType] || "Lec";
                const dayName = DAY_NUMBER_TO_NAME[entry.dayOfWeek] || "Sunday";
                return (
                  <View key={idx} style={s.ocrClassCard}>
                    <View
                      style={[
                        s.ocrAccent,
                        {
                          backgroundColor: TYPE_COLORS[typeShort] || "#6366f1",
                        },
                      ]}
                    />
                    <View style={s.ocrClassContent}>
                      <View style={s.ocrClassTopRow}>
                        <Text style={s.ocrClassName} numberOfLines={1}>
                          {entry.courseName || entry.courseCode || "Unknown"}
                        </Text>
                        <View style={s.ocrTopActions}>
                          <View
                            style={[
                              s.typeBadge,
                              {
                                backgroundColor:
                                  (TYPE_COLORS[typeShort] || "#6366f1") + "18",
                                borderColor:
                                  TYPE_COLORS[typeShort] || "#6366f1",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                s.typeBadgeText,
                                { color: TYPE_COLORS[typeShort] || "#6366f1" },
                              ]}
                            >
                              {entry.sessionType}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => openEditForOcr(entry, idx)}
                            style={s.ocrActionBtn}
                          >
                            <Feather
                              name="edit-2"
                              size={14}
                              color={colors.textMuted}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => removeOcrPreviewEntry(idx)}
                            style={s.ocrActionBtn}
                          >
                            <Feather name="trash-2" size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={s.ocrClassInfoRow}>
                        <View style={s.infoItem}>
                          <Feather
                            name="calendar"
                            size={11}
                            color={colors.textMuted}
                          />
                          <Text style={s.infoText}>{dayName}</Text>
                        </View>
                        <View style={s.infoItem}>
                          <Feather
                            name="clock"
                            size={11}
                            color={colors.textMuted}
                          />
                          <Text style={s.infoText}>
                            {to12h(entry.startTime)} – {to12h(entry.endTime)}
                          </Text>
                        </View>
                        {entry.groupNumber ? (
                          <View style={s.infoItem}>
                            <Feather
                              name="users"
                              size={11}
                              color={colors.textMuted}
                            />
                            <Text style={s.infoText}>{entry.groupNumber}</Text>
                          </View>
                        ) : null}
                        {entry.location ? (
                          <View style={s.infoItem}>
                            <Feather
                              name="map-pin"
                              size={11}
                              color={colors.textMuted}
                            />
                            <Text style={s.infoText}>{entry.location}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Actions */}
            <View style={s.ocrActions}>
              <TouchableOpacity
                style={s.ocrCancelBtn}
                onPress={() => {
                  setScanModalVisible(false);
                  setOcrPreviewEntries([]);
                }}
              >
                <Text style={s.ocrCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.ocrConfirmBtn}
                onPress={confirmOCRImport}
              >
                <Feather name="check" size={18} color="#fff" />
                <Text style={s.ocrConfirmText}>Replace Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Entry Modal ── */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {editContext === "ocr" ? "Edit Extracted Class" : "Edit Class"}
              </Text>
              <TouchableOpacity onPress={closeEditModal}>
                <Feather name="x" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              <Text style={s.label}>Course Name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Operating Systems"
                placeholderTextColor={colors.textMuted}
                value={editForm.courseName}
                onChangeText={(t) =>
                  setEditForm((prev) => ({ ...prev, courseName: t }))
                }
              />

              <Text style={s.label}>Course Code</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. CS408"
                placeholderTextColor={colors.textMuted}
                value={editForm.courseCode}
                onChangeText={(t) =>
                  setEditForm((prev) => ({ ...prev, courseCode: t }))
                }
              />

              <Text style={s.label}>Class Type</Text>
              <View style={s.typeRow}>
                {EDIT_TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      s.typeBtn,
                      editForm.sessionType === option && {
                        backgroundColor: colors.indigo,
                        borderColor: colors.indigo,
                      },
                    ]}
                    onPress={() =>
                      setEditForm((prev) => ({ ...prev, sessionType: option }))
                    }
                  >
                    <Text
                      style={[
                        s.typeBtnCode,
                        editForm.sessionType === option && { color: "#fff" },
                      ]}
                    >
                      {option.slice(0, 3)}
                    </Text>
                    <Text
                      style={[
                        s.typeBtnLabel,
                        editForm.sessionType === option && { color: "#fff" },
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Day</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.chipRow}
              >
                {DAYS.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[s.chip, editForm.day === day && s.chipActive]}
                    onPress={() => setEditForm((prev) => ({ ...prev, day }))}
                  >
                    <Text
                      style={[
                        s.chipText,
                        editForm.day === day && s.chipTextActive,
                      ]}
                    >
                      {day.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.label}>Start Time (24h)</Text>
              <TextInput
                style={s.input}
                placeholder="08:00"
                placeholderTextColor={colors.textMuted}
                value={editForm.startTime}
                onChangeText={(t) =>
                  setEditForm((prev) => ({ ...prev, startTime: t }))
                }
              />

              <Text style={s.label}>End Time (24h)</Text>
              <TextInput
                style={s.input}
                placeholder="10:00"
                placeholderTextColor={colors.textMuted}
                value={editForm.endTime}
                onChangeText={(t) =>
                  setEditForm((prev) => ({ ...prev, endTime: t }))
                }
              />

              <Text style={s.label}>Group Number</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. G1"
                placeholderTextColor={colors.textMuted}
                value={editForm.groupNumber}
                onChangeText={(t) =>
                  setEditForm((prev) => ({ ...prev, groupNumber: t }))
                }
              />

              <Text style={s.label}>Location</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Hall 101"
                placeholderTextColor={colors.textMuted}
                value={editForm.location}
                onChangeText={(t) =>
                  setEditForm((prev) => ({ ...prev, location: t }))
                }
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            <TouchableOpacity style={s.submitBtn} onPress={handleEditSave}>
              <Text style={s.submitBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    emptyActionText: { fontSize: 14, fontWeight: "600", color: colors.indigo },

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
    replaceButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#14b8a6",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      gap: 6,
    },
    replaceButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },

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
    processingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    processingCard: {
      width: "100%",
      maxWidth: 320,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
      gap: 12,
    },
    processingText: {
      fontSize: 14,
      color: colors.textPrimary,
      textAlign: "center",
    },

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
    classActions: { flexDirection: "row", gap: 6 },
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
    editBtn: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
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

    // Source picker modal
    sourceOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sourceSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 36,
    },
    sourceHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 20,
    },
    sourceTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    sourceSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
    sourceOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sourceIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
    },
    sourceOptionTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    sourceOptionDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    sourceCancelBtn: {
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.bg,
      alignItems: "center",
    },
    sourceCancelText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textMuted,
    },

    // OCR preview modal
    ocrModalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: "85%",
      padding: 20,
    },
    ocrModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    ocrModalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    ocrModalSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    ocrClassCard: {
      flexDirection: "row",
      backgroundColor: colors.bg,
      borderRadius: 12,
      marginBottom: 8,
      overflow: "hidden",
    },
    ocrAccent: { width: 4 },
    ocrClassContent: { flex: 1, padding: 12 },
    ocrClassTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    ocrTopActions: { flexDirection: "row", alignItems: "center", gap: 6 },
    ocrActionBtn: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    ocrClassName: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
      flex: 1,
      marginRight: 8,
    },
    ocrClassInfoRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    ocrActions: { flexDirection: "row", gap: 10, marginTop: 12 },
    ocrCancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
    },
    ocrCancelText: { fontSize: 15, fontWeight: "600", color: colors.textMuted },
    ocrConfirmBtn: {
      flex: 2,
      flexDirection: "row",
      gap: 6,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.indigo,
      alignItems: "center",
      justifyContent: "center",
    },
    ocrConfirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },

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
  });

export default TimetableScreen;
