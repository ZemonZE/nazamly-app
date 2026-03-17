import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Image, Alert, ToastAndroid, Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/firebase';

interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
}

interface ScheduleItemProps {
  title: string;
  code: string;
  time: string;
  location: string;
  accentColor: string;
}

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

const DAY_FULL_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HomeScreen = () => {
  const { user, backendUser, setBackendUser } = useAuth();
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayClasses, setTodayClasses] = useState<EntryData[]>([]);
  const [isUploadingCard, setIsUploadingCard] = useState(false);
  const [cardUploadProgress, setCardUploadProgress] = useState(0);
  const [localCardUri, setLocalCardUri] = useState<string | null>(null);
  const [studentCardUrl, setStudentCardUrl] = useState<string | null>(backendUser?.studentCardPhotoURL || null);

  const today = new Date();
  const currentDayIndex = today.getDay();
  const currentDayFullName = DAY_FULL_NAMES[currentDayIndex];
  const firstName = user?.displayName?.split(' ')[0] || 'Student';

  const fetchSchedule = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/schedule/my-schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) return;
      const body = await res.json();
      if (res.ok && body.success) {
        const allEntries: EntryData[] = [];
        for (const schedule of body.data || []) {
          if (Array.isArray(schedule.entries)) allEntries.push(...schedule.entries);
        }
        setEntries(allEntries);
        setTodayClasses(allEntries.filter(e => e.dayOfWeek === currentDayIndex));
      }
    } catch (err) {
      console.error('[HomePage] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentDayIndex]);

  const fetchStudentCard = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/auth/student-card`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (res.ok && body.success && body.studentCardPhotoURL) {
        setStudentCardUrl(body.studentCardPhotoURL);
      }
    } catch (err) {
      console.error('[HomePage] fetch student card error:', err);
    }
  }, [user]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);
  useEffect(() => { fetchStudentCard(); }, [fetchStudentCard]);

  const getGreeting = () => {
    const h = today.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getTotalCourses = () => {
    const s = new Set<string>();
    entries.forEach(e => { if (e.courseId && typeof e.courseId === 'object') s.add(e.courseId.code); });
    return s.size;
  };

  const handleStudentCardUpload = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Permission Required', 'Please allow access to your photo library.');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.7,
      });
      if (result.canceled) return;

      const imageUri = result.assets[0].uri;
      setLocalCardUri(imageUri);
      setIsUploadingCard(true);
      setCardUploadProgress(10);

      // Compress
      const ctx = ImageManipulator.ImageManipulator.manipulate(imageUri);
      ctx.resize({ width: 1200 });
      const rendered = await ctx.renderAsync();
      const saved = await rendered.saveAsync({ compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
      setCardUploadProgress(30);

      // Upload to backend via multipart/form-data — no Firebase Storage
      const token = await user?.getIdToken();
      const formData = new FormData();

      if (Platform.OS === 'web') {
        // Web: convert the data URI to a real Blob so multer can parse it
        const response = await fetch(saved.uri);
        const blob = await response.blob();
        formData.append('photo', blob, 'card.jpg');
      } else {
        // Mobile (Android/iOS): React Native accepts the object form
        formData.append('photo', { uri: saved.uri, name: 'card.jpg', type: 'image/jpeg' } as any);
      }

      const res = await fetch(`${API_URL}/api/auth/upload-student-card`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setCardUploadProgress(90);

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed');

      setCardUploadProgress(100);
      if (data.data?.studentCardPhotoURL) setStudentCardUrl(data.data.studentCardPhotoURL);
      if (backendUser) setBackendUser({ ...backendUser, studentCardPhotoURL: data.data?.studentCardPhotoURL });
      setLocalCardUri(null);

      if (Platform.OS === 'android') {
        ToastAndroid.showWithGravity('Student card uploaded successfully', ToastAndroid.SHORT, ToastAndroid.BOTTOM);
      } else {
        Alert.alert('Success', 'Student card uploaded successfully');
      }
    } catch (err: any) {
      console.error('[HomePage] Student card upload error:', err);
      setLocalCardUri(null);
      Alert.alert('Upload Failed', err.message || 'Failed to upload student card. Please try again.');
    } finally {
      setIsUploadingCard(false);
      setCardUploadProgress(0);
    }
  };

  const accentColors = ['#f97316', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{firstName}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="book-open" label="Courses" value={getTotalCourses().toString()} color="#3b82f6" />
          <StatCard icon="calendar" label="Today" value={todayClasses.length.toString()} color="#8b5cf6" />
          <StatCard icon="award" label="CGPA" value={backendUser?.currentCGPA?.toFixed(2) || '0.00'} color="#f59e0b" />
        </View>

        {/* Student Card */}
        <View style={styles.studentCardContainer}>
          {(localCardUri || studentCardUrl) ? (
            <View style={styles.studentCardWithPhoto}>
              <Image
                source={{ uri: localCardUri || studentCardUrl! }}
                style={styles.studentCardImage}
              />
              <TouchableOpacity style={styles.updateCardButton} onPress={handleStudentCardUpload} disabled={isUploadingCard}>
                {isUploadingCard ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.updateCardButtonText}>{cardUploadProgress}%</Text>
                  </>
                ) : (
                  <>
                    <Feather name="upload" size={16} color="#fff" />
                    <Text style={styles.updateCardButtonText}>Update</Text>
                  </>
                )}
              </TouchableOpacity>
              {isUploadingCard && (
                <View style={styles.progressBarOuter}>
                  <View style={[styles.progressBarInner, { width: `${cardUploadProgress}%` as any }]} />
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.studentCard} onPress={handleStudentCardUpload} disabled={isUploadingCard}>
              <View style={styles.cardIconContainer}>
                {isUploadingCard
                  ? <ActivityIndicator size={24} color="#6366f1" />
                  : <Ionicons name="card-outline" size={24} color="#6366f1" />}
              </View>
              <View>
                <Text style={styles.cardTitle}>Student Card</Text>
                <Text style={styles.cardSubtitle}>{isUploadingCard ? 'Uploading...' : 'Tap to upload your card'}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Schedule */}
        <View style={styles.scheduleHeaderRow}>
          <Text style={styles.sectionTitle}>{"Today's Schedule"}</Text>
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
                title={courseData?.name || 'Course'}
                code={courseData?.code || 'N/A'}
                time={`${entry.startTime}–${entry.endTime}`}
                location={entry.location || 'TBA'}
                accentColor={accentColors[index % accentColors.length]}
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const StatCard = ({ icon, label, value, color }: StatCardProps) => (
  <View style={styles.statCard}>
    <Feather name={icon} size={20} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ScheduleItem = ({ title, code, time, location, accentColor }: ScheduleItemProps) => (
  <View style={styles.scheduleItem}>
    <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
    <View style={styles.scheduleContent}>
      <View style={styles.scheduleHeaderRow}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 25 },
  greeting: { fontSize: 16, color: '#64748b', fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { backgroundColor: '#fff', width: '31%', padding: 15, borderRadius: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  statValue: { fontSize: 20, fontWeight: 'bold', marginVertical: 4 },
  statLabel: { fontSize: 12, color: '#94a3b8' },
  studentCardContainer: { marginBottom: 30 },
  studentCard: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  studentCardWithPhoto: { backgroundColor: '#fff', borderRadius: 12, padding: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  studentCardImage: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover', marginBottom: 12 },
  updateCardButton: { backgroundColor: '#6366f1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  updateCardButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  progressBarOuter: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressBarInner: { height: '100%', backgroundColor: '#6366f1', borderRadius: 3 },
  cardIconContainer: { backgroundColor: '#eef2ff', padding: 10, borderRadius: 10, marginRight: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  cardSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  scheduleHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  dayBadge: { fontSize: 14, fontWeight: '600', color: '#6366f1', backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 14, color: '#94a3b8' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 12, marginBottom: 15 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 15 },
  emptySubtext: { fontSize: 14, color: '#94a3b8', marginTop: 5 },
  scheduleItem: { backgroundColor: '#fff', borderRadius: 12, flexDirection: 'row', marginBottom: 15, overflow: 'hidden' },
  accentBar: { width: 5 },
  scheduleContent: { flex: 1, padding: 15 },
  scheduleTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  scheduleCode: { fontSize: 12, color: '#94a3b8' },
  scheduleDetails: { flexDirection: 'row' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
  detailText: { fontSize: 13, color: '#64748b', marginLeft: 5 },
});

export default HomeScreen;
