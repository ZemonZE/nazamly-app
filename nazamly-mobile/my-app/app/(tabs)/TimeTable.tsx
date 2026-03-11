import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AddClassModal from '../../components/ui/AddClassModal';
import { auth, API_URL } from '@/firebase';

// Day mapping: number → short label
const DAY_MAP: Record<number, string> = {
  6: 'Sat', 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri',
};
const DAY_ORDER = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

interface TimetableEntry {
  _id: string;
  courseCode: string;
  courseName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sessionType: string;
  location: string;
  groupNumber: string;
}

const TimetableScreen = () => {
  const [selectedDay, setSelectedDay] = useState('Sat');
  const [modalVisible, setModalVisible] = useState(false);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleTitle, setScheduleTitle] = useState('');

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setEntries([]);
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/schedule/my-timetable`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setEntries(data.data.entries || []);
        setScheduleTitle(data.data.title || '');
      }
    } catch (err) {
      console.error('Failed to fetch timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refetch when screen comes into focus (e.g. after saving from web)
  useFocusEffect(
    useCallback(() => {
      fetchTimetable();
    }, [])
  );

  // Group entries by day label
  const entriesByDay: Record<string, TimetableEntry[]> = {};
  DAY_ORDER.forEach((d) => (entriesByDay[d] = []));
  entries.forEach((e) => {
    const dayLabel = DAY_MAP[e.dayOfWeek] || 'Sat';
    if (entriesByDay[dayLabel]) entriesByDay[dayLabel].push(e);
  });

  // Build day tabs with real counts
  const days = DAY_ORDER.map((d) => ({
    id: d,
    label: d,
    count: entriesByDay[d]?.length || 0,
  }));

  const currentDayEntries = (entriesByDay[selectedDay] || []).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  const totalClasses = entries.length;

  const handleDelete = async (entryId: string) => {
    Alert.alert('Delete Class', 'Are you sure you want to remove this class?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();
            await fetch(`${API_URL}/api/schedule/session/${entryId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            setEntries((prev) => prev.filter((e) => e._id !== entryId));
          } catch (err) {
            Alert.alert('Error', 'Failed to delete class');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Add Class Modal */}
      <AddClassModal visible={modalVisible} onClose={() => setModalVisible(false)} />

      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Timetable</Text>
          <Text style={styles.subtitle}>{totalClasses} classes this semester</Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Class</Text>
        </TouchableOpacity>
      </View>

      {/* Days Selector - Horizontal Scroll */}
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
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{day.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Classes List */}
      <ScrollView contentContainerStyle={styles.classesList}>
        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
        ) : currentDayEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No classes on this day</Text>
          </View>
        ) : (
          currentDayEntries.map((entry) => (
            <ClassItem
              key={entry._id}
              title={entry.courseName || entry.courseCode}
              code={entry.courseCode}
              time={`${entry.startTime}–${entry.endTime}`}
              location={entry.location}
              onDelete={() => handleDelete(entry._id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

interface ClassItemProps {
  title: string;
  code: string;
  time: string;
  location: string;
  onDelete: () => void;
}

const ClassItem = ({ title, code, time, location, onDelete }: ClassItemProps) => (
  <View style={styles.classCard}>
    <View style={styles.orangeAccent} />
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
        <Text style={styles.classCode}>{code}</Text>
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
        <TouchableOpacity onPress={onDelete}>
          <Feather name="trash-2" size={18} color="#cbd5e1" />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  addButton: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  daysContainer: { paddingHorizontal: 15, marginBottom: 20 },
  daysScroll: { backgroundColor: '#f1f5f9', borderRadius: 15, padding: 6 },
  dayTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 5,
  },
  activeDayTab: { backgroundColor: '#fff', elevation: 2, shadowOpacity: 0.1 },
  dayText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  activeDayText: { color: '#0f172a', fontWeight: 'bold' },
  badge: {
    backgroundColor: '#4f46e5',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    position: 'absolute',
    top: -2,
    right: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  classesList: { paddingHorizontal: 20 },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    flexDirection: 'row',
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  orangeAccent: { width: 6, backgroundColor: '#f97316' },
  cardMainContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  classTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  classCode: { fontSize: 12, color: '#94a3b8' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 13, color: '#64748b', marginLeft: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#94a3b8', marginTop: 8 },
});

export default TimetableScreen;
