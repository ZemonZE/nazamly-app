import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/firebase";

// 1. StatCard
interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
}

// 2. ScheduleItem
interface ScheduleItemProps {
  title: string;
  code: string;
  time: string;
  location: string;
  accentColor: string;
}

// 3. Schedule Entry from backend
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

// Day mapping
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const HomeScreen = () => {
  const { user, backendUser } = useAuth();
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayClasses, setTodayClasses] = useState<EntryData[]>([]);
  
  // Get current day
  const today = new Date();
  const currentDayIndex = today.getDay(); // 0 = Sunday, 6 = Saturday
  const currentDayName = DAY_NAMES[currentDayIndex];
  const currentDayFullName = DAY_FULL_NAMES[currentDayIndex];
  
  // Extract just the first name if available
  const firstName = user?.displayName?.split(' ')[0] || "Student";

  // Fetch schedule from backend
  const fetchSchedule = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      const res = await fetch(`${API_URL}/api/schedule/my-schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("[HomePage] Non-JSON response, status:", res.status);
        return;
      }
      
      const body = await res.json();
      
      if (res.ok && body.success) {
        const allEntries: EntryData[] = [];
        const schedules = body.data || [];
        for (const schedule of schedules) {
          if (schedule.entries && Array.isArray(schedule.entries)) {
            allEntries.push(...schedule.entries);
          }
        }
        setEntries(allEntries);
        
        // Filter today's classes
        const todayEntries = allEntries.filter(
          (entry) => entry.dayOfWeek === currentDayIndex
        );
        setTodayClasses(todayEntries);
      } else {
        console.error("[HomePage] fetch failed:", body);
      }
    } catch (err) {
      console.error("[HomePage] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, currentDayIndex]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get total unique courses
  const getTotalCourses = () => {
    const uniqueCourses = new Set();
    entries.forEach(entry => {
      if (entry.courseId && typeof entry.courseId === 'object') {
        uniqueCourses.add(entry.courseId.code);
      }
    });
    return uniqueCourses.size;
  };

  // Accent colors for schedule items
  const accentColors = ["#f97316", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{firstName}</Text>
        </View>

        {/* Stats Cards Row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="book-open"
            label="Courses"
            value={getTotalCourses().toString()}
            color="#3b82f6"
          />
          <StatCard 
            icon="calendar" 
            label="Today" 
            value={todayClasses.length.toString()} 
            color="#8b5cf6" 
          />
          <StatCard
            icon="award"
            label="CGPA"
            value={backendUser?.currentCGPA?.toFixed(2) || "0.00"}
            color="#f59e0b"
          />
        </View>

        {/* Student Card Section */}
        <TouchableOpacity style={styles.studentCard}>
          <View style={styles.cardIconContainer}>
            <Ionicons name="card-outline" size={24} color="#6366f1" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Student Card</Text>
            <Text style={styles.cardSubtitle}>Tap to upload your card</Text>
          </View>
        </TouchableOpacity>

        {/* Schedule Section */}
        <View style={styles.scheduleHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>
          <Text style={styles.dayBadge}>{currentDayFullName}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText}>Loading schedule...</Text>
          </View>
        ) : todayClasses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="calendar" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No classes today</Text>
            <Text style={styles.emptySubtext}>Enjoy your free day!</Text>
          </View>
        ) : (
          todayClasses.map((entry, index) => {
            const courseData = typeof entry.courseId === 'object' ? entry.courseId : null;
            return (
              <ScheduleItem
                key={entry._id}
                title={courseData?.name || "Course"}
                code={courseData?.code || "N/A"}
                time={`${entry.startTime}–${entry.endTime}`}
                location={entry.location || "TBA"}
                accentColor={accentColors[index % accentColors.length]}
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Sub Components ---

const StatCard = ({ icon, label, value, color }: StatCardProps) => (
  <View style={styles.statCard}>
    <Feather name={icon} size={20} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ScheduleItem = ({
  title,
  code,
  time,
  location,
  accentColor,
}: ScheduleItemProps) => (
  <View style={styles.scheduleItem}>
    <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
    <View style={styles.scheduleContent}>
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleTitle}>{title}</Text>
        <Text style={styles.scheduleCode}>{code}</Text>
      </View>
      <View style={styles.scheduleDetails}>
        <View style={styles.detailRow}>
          <Feather name="clock" size={14} color="#94a3b8" />
          <Text style={styles.detailText}>{time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color="#94a3b8" />
          <Text style={styles.detailText}>{location}</Text>
        </View>
      </View>
    </View>
  </View>
);

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { padding: 20 },
  header: { marginBottom: 25 },
  greeting: { fontSize: 16, color: "#64748b", fontWeight: "500" },
  userName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  statCard: {
    backgroundColor: "#fff",
    width: "31%",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  statValue: { fontSize: 20, fontWeight: "bold", marginVertical: 4 },
  statLabel: { fontSize: 12, color: "#94a3b8" },
  studentCard: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  cardIconContainer: {
    backgroundColor: "#eef2ff",
    padding: 10,
    borderRadius: 10,
    marginRight: 15,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  cardSubtitle: { fontSize: 13, color: "#94a3b8", marginTop: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    flex: 1,
  },
  scheduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  dayBadge: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366f1",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#94a3b8",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 5,
  },
  scheduleItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    flexDirection: "row",
    marginBottom: 15,
    overflow: "hidden",
  },
  accentBar: { width: 5 },
  scheduleContent: { flex: 1, padding: 15 },
  scheduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  scheduleTitle: { fontSize: 15, fontWeight: "bold", color: "#1e293b" },
  scheduleCode: { fontSize: 12, color: "#94a3b8" },
  scheduleDetails: { flexDirection: "row" },
  detailRow: { flexDirection: "row", alignItems: "center", marginRight: 15 },
  detailText: { fontSize: 13, color: "#64748b", marginLeft: 5 },
});

export default HomeScreen;
