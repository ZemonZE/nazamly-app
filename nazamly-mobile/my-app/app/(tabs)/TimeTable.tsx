import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface TimeTableItemProps {
  title: string;
  code: string;
  time: string;
  location: string;
}

const TimetableScreen = () => {
  const [selectedDay, setSelectedDay] = useState('Sat');
  
  const navigation = useNavigation<any>(); 

  const days = [
    { id: 'Sat', label: 'Sat', count: 2 },
    { id: 'Sun', label: 'Sun', count: 2 },
    { id: 'Mon', label: 'Mon', count: 2 },
    { id: 'Tue', label: 'Tue', count: 2 },
    { id: 'Wed', label: 'Wed', count: 2 },
    { id: 'Thu', label: 'Thu', count: 2 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Timetable</Text>
          <Text style={styles.subtitle}>12 classes this semester</Text>
        </View>
        
        {/* 3. ضفنا الـ onPress هنا عشان ينقلك للصفحة التانية */}
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('AddClassModal')}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Class</Text>
        </TouchableOpacity>
      </View>

      {/* Days Selector - Horizontal Scroll */}
      <View style={styles.daysContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {days.map((day) => (
            <TouchableOpacity
              key={day.id}
              onPress={() => setSelectedDay(day.id)}
              style={[styles.dayTab, selectedDay === day.id && styles.activeDayTab]}
            >
              <Text style={[styles.dayText, selectedDay === day.id && styles.activeDayText]}>{day.label}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{day.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Classes List */}
      <ScrollView contentContainerStyle={styles.classesList}>
        <ClassItem
          title="Data Structures"
          code="CS201"
          time="08:00–09:30"
          location="B204"
        />
        <ClassItem
          title="Linear Algebra"
          code="MATH301"
          time="10:00–11:30"
          location="A101"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const ClassItem = ({ title, code, time, location }: TimeTableItemProps) => (
  <View style={styles.classCard}>
    <View style={styles.orangeAccent} />
    <View style={styles.cardMainContent}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Feather name="book" size={18} color="#1e293b" style={{ marginRight: 8 }} />
          <Text style={styles.classTitle}>{title}</Text>
        </View>
        <Text style={styles.classCode}>{code}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.infoRow}>
          <Feather name="clock" size={14} color="#94a3b8" />
          <Text style={styles.infoText}>{time}</Text>
          <Ionicons name="location-outline" size={14} color="#94a3b8" style={{ marginLeft: 10 }} />
          <Text style={styles.infoText}>{location}</Text>
        </View>
        <TouchableOpacity>
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
    marginBottom: 20
  },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  addButton: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12
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
    marginRight: 5
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
    right: 2
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
});

export default TimetableScreen;