import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";

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

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.userName}>Ahmed</Text>
        </View>

        {/* Stats Cards Row */}
        <View style={styles.statsRow}>
          <StatCard
            icon="book-open"
            label="Courses"
            value="5"
            color="#3b82f6"
          />
          <StatCard icon="calendar" label="Today" value="2" color="#8b5cf6" />
          <StatCard
            icon="help-circle"
            label="Questions"
            value="8"
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
        <Text style={styles.sectionTitle}>Today&apos;s Schedule</Text>

        <ScheduleItem
          title="Data Structures"
          code="CS201"
          time="08:00–09:30"
          location="B204"
          accentColor="#f97316"
        />

        <ScheduleItem
          title="Physics Lab"
          code="PHY201L"
          time="14:00–16:00"
          location="Lab3"
          accentColor="#8b5cf6"
        />
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
    marginBottom: 15,
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
