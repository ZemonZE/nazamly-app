import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/firebase";
import AddClassModal from "../../components/ui/AddClassModal";

interface EntryData {
  _id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
  sessionType?: string;
  groupNumber?: string;
  courseId?: { _id: string; name: string; code: string } | string;
}

const DAY_MAP: Record<string, number> = {
  Sat: 6,
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
};



const TimetableScreen = () => {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState("Sat");
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      console.log("[TimeTable] Fetching schedule with token:", token ? "✓" : "✗");
      
      const res = await fetch(`${API_URL}/api/schedule/my-schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("[TimeTable] Response status:", res.status);
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("[TimeTable] Non-JSON response, status:", res.status);
        return;
      }
      
      const body = await res.json();
      console.log("[TimeTable] Response body:", body);
      
      if (res.ok && body.success) {
        const allEntries: EntryData[] = [];
        const schedules = body.data || [];
        for (const schedule of schedules) {
          if (schedule.entries && Array.isArray(schedule.entries)) {
            allEntries.push(...schedule.entries);
          }
        }
        setEntries(allEntries);
      } else {
        console.error("[TimeTable] fetch failed:", body);
      }
    } catch (err) {
      console.error("[TimeTable] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleAddClass = async (newClass: {
    title: string;
    code: string;
    day: string;
    time: string;
    location: string;
  }) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const [startTime, endTime] = newClass.time.split("–");
      const dayOfWeek = DAY_MAP[newClass.day] ?? 6;

      const entryPayload = {
        dayOfWeek,
        startTime: startTime?.trim(),
        endTime: endTime?.trim(),
        location: newClass.location || "TBD",
        sessionType: "Lecture",
        courseName: newClass.title,
        courseCode: newClass.code,
      };

      const res = await fetch(`${API_URL}/api/schedule/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entries: [entryPayload],
          title: "My Schedule",
        }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        if (Platform.OS === "android") {
          ToastAndroid.showWithGravity(
            "Class added successfully",
            ToastAndroid.SHORT,
            ToastAndroid.BOTTOM,
          );
        }
        await fetchSchedule();
      } else {
        Alert.alert("Error", body.message || "Failed to add class");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    Alert.alert("Delete Class", "Are you sure you want to remove this class?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(entryId);
            const token = await user.getIdToken();
            const res = await fetch(
              `${API_URL}/api/schedule/session/${entryId}`,
              {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            const body = await res.json();
            if (res.ok && body.success) {
              setEntries((prev) => prev.filter((e) => e._id !== entryId));
              if (Platform.OS === "android") {
                ToastAndroid.showWithGravity(
                  "Class removed",
                  ToastAndroid.SHORT,
                  ToastAndroid.BOTTOM,
                );
              }
            } else {
              Alert.alert("Error", body.message || "Failed to delete");
            }
          } catch (err: any) {
            Alert.alert("Error", err.message);
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const selectedDayNum = DAY_MAP[selectedDay] ?? 6;
  const filteredEntries = entries.filter((e) => e.dayOfWeek === selectedDayNum);

  const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"].map((d) => ({
    id: d,
    label: d,
    count: entries.filter((e) => e.dayOfWeek === DAY_MAP[d]).length,
  }));

  const getEntryTitle = (entry: EntryData) => {
    if (
      entry.courseId &&
      typeof entry.courseId === "object" &&
      entry.courseId.name
    ) {
      return entry.courseId.name;
    }
    return (entry as any).courseName || "Untitled";
  };

  const getEntryCode = (entry: EntryData) => {
    if (
      entry.courseId &&
      typeof entry.courseId === "object" &&
      entry.courseId.code
    ) {
      return entry.courseId.code;
    }
    return (entry as any).courseCode || "";
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Timetable</Text>
          <Text style={styles.subtitle}>
            {entries.length} {entries.length === 1 ? "class" : "classes"} this
            semester
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Class</Text>
        </TouchableOpacity>
      </View>

      {/* Days Selector */}
      <View style={styles.daysContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysScroll}
        >
          {days.map((day) => (
            <TouchableOpacity
              key={day.id}
              onPress={() => setSelectedDay(day.id)}
              style={[
                styles.dayTab,
                selectedDay === day.id && styles.activeDayTab,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  selectedDay === day.id && styles.activeDayText,
                ]}
              >
                {day.label}
              </Text>
              {day.count > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{day.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Classes List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={{ color: "#94a3b8", marginTop: 10 }}>
            Loading schedule...
          </Text>
        </View>
      ) : filteredEntries.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="calendar" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No classes on {selectedDay}</Text>
          <Text style={styles.emptySubtext}>
            Tap &quot;Add Class&quot; to get started
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.classesList}>
          {filteredEntries.map((entry) => (
            <ClassItem
              key={entry._id}
              title={getEntryTitle(entry)}
              code={getEntryCode(entry)}
              time={`${entry.startTime}–${entry.endTime}`}
              location={entry.location || "TBD"}
              sessionType={entry.sessionType}
              isDeleting={deleting === entry._id}
              onDelete={() => handleDeleteEntry(entry._id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Add Class Modal */}
      {isAddModalVisible && (
        <AddClassModal
          visible={isAddModalVisible}
          onClose={() => setIsAddModalVisible(false)}
          onAddClass={handleAddClass}
        />
      )}
    </SafeAreaView>
  );
};

interface ClassItemProps {
  title: string;
  code: string;
  time: string;
  location: string;
  sessionType?: string;
  isDeleting?: boolean;
  onDelete: () => void;
}

const ClassItem = ({
  title,
  code,
  time,
  location,
  sessionType,
  isDeleting,
  onDelete,
}: ClassItemProps) => {
  const accentColors: Record<string, string> = {
    Lecture: "#f97316",
    Section: "#4f46e5",
    Lab: "#10b981",
  };
  const accent = accentColors[sessionType || "Lecture"] || "#f97316";

  return (
    <View style={styles.classCard}>
      <View style={[styles.orangeAccent, { backgroundColor: accent }]} />
      <View style={styles.cardMainContent}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Feather
              name="book"
              size={18}
              color="#1e293b"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.classTitle}>{title}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.classCode}>{code}</Text>
            {sessionType && (
              <Text style={[styles.sessionBadge, { color: accent }]}>
                {sessionType}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Feather name="clock" size={14} color="#94a3b8" />
            <Text style={styles.infoText}>{time}</Text>
            <Ionicons
              name="location-outline"
              size={14}
              color="#94a3b8"
              style={{ marginLeft: 10 }}
            />
            <Text style={styles.infoText}>{location}</Text>
          </View>
          <TouchableOpacity onPress={onDelete} disabled={isDeleting}>
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Feather name="trash-2" size={18} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },
  screenTitle: { fontSize: 24, fontWeight: "bold", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#94a3b8", marginTop: 4 },
  addButton: {
    backgroundColor: "#4f46e5",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addButtonText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
  daysContainer: { paddingHorizontal: 15, marginBottom: 20 },
  daysScroll: { backgroundColor: "#f1f5f9", borderRadius: 15, padding: 6 },
  dayTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 5,
  },
  activeDayTab: { backgroundColor: "#fff", elevation: 2, shadowOpacity: 0.1 },
  dayText: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  activeDayText: { color: "#0f172a", fontWeight: "bold" },
  badge: {
    backgroundColor: "#4f46e5",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    position: "absolute",
    top: -2,
    right: 2,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  classesList: { paddingHorizontal: 20, paddingBottom: 20 },
  classCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    flexDirection: "row",
    marginBottom: 15,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  orangeAccent: { width: 6 },
  cardMainContent: { flex: 1, padding: 16 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  classTitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  classCode: { fontSize: 12, color: "#94a3b8" },
  sessionBadge: { fontSize: 10, fontWeight: "bold", marginTop: 2 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoText: { fontSize: 13, color: "#64748b", marginLeft: 4 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtext: { fontSize: 13, color: "#94a3b8", marginTop: 4 },
});

export default TimetableScreen;
