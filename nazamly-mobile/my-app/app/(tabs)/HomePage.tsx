import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator, Image, Alert, ToastAndroid, Platform,
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Animated, Dimensions,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/firebase';
import { useAppTheme } from '@/constants/theme';

import { useRouter } from 'expo-router';

const { width: SCREEN_W } = Dimensions.get('window');

interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
  bgColor: string;
  onPress?: () => void;
}

interface ScheduleItemProps {
  title: string;
  type: string;
  time: string;
  place: string;
  accentColor: string;
  colors: any;
}

// Matches the AsyncStorage model from TimeTable.tsx (web-parity format)
interface LocalEntry {
  id: number;
  subject: string;
  type: string; // 'Lec' | 'Sec' | 'Lab'
  day: string;  // English day name
  slot: { start: string; end: string };
  group: string;
  place: string;
}

const SCHEDULE_STORAGE_KEY = '@nazamly_schedules';

const DB_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];




const HomeScreen = () => {
  const { colors } = useAppTheme();
  const { user, backendUser, setBackendUser } = useAuth();
  const router = useRouter();


  const [todayClasses, setTodayClasses] = useState<LocalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadingCard, setIsUploadingCard] = useState(false);
  const [cardUploadProgress, setCardUploadProgress] = useState(0);
  const [localCardUri, setLocalCardUri] = useState<string | null>(null);
  const [studentCardUrl, setStudentCardUrl] = useState<string | null>(backendUser?.studentCardPhotoURL || null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const today = new Date();
  const currentDayIndex = today.getDay();
  const firstName = user?.displayName?.split(' ')[0] || 'Student';
  const currentGpa = backendUser?.currentCGPA ?? 3.84;
  const targetGpa = 4.0;
  const gpaProgress = Math.min(currentGpa / targetGpa, 1);
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    Animated.spring(progressAnim, { toValue: gpaProgress, useNativeDriver: false, tension: 60, friction: 8 }).start();
  }, [gpaProgress, progressAnim]);



  // Load today's schedule from AsyncStorage (web-parity format)
  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const saved = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (saved) {
        const all: LocalEntry[] = JSON.parse(saved);
        // We match by DB_DAY_NAMES or fallback to index.
        const todayDayNameEN = DB_DAY_NAMES[currentDayIndex];
        // In case old data is saved in Arabic.
        const allDaysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const todayDayNameAR = allDaysAr[currentDayIndex];
        const todayEntries = all.filter(e => e.day === todayDayNameEN || e.day === todayDayNameAR);
        todayEntries.sort((a, b) => a.slot.start.localeCompare(b.slot.start));
        setTodayClasses(todayEntries);
      } else {
        setTodayClasses([]);
      }
    } catch (err) {
      console.error('[HomePage] AsyncStorage load error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDayIndex]);

  const fetchStudentCard = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/auth/student-card`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (res.ok && body.success && body.studentCardPhotoURL) setStudentCardUrl(body.studentCardPhotoURL);
    } catch (err) { console.error('[HomePage] fetch student card error:', err); }
  }, [user]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);
  useEffect(() => { fetchStudentCard(); }, [fetchStudentCard]);

  const getGreeting = () => {
    const h = today.getHours();
    if (h < 12) return 'Good Morning,';
    if (h < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const getDayDisplayName = () => {
    const arr = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return arr[(currentDayIndex + 1) % 7];
  };

  const getTotalCourses = () => todayClasses.length;

  const navigateToTimetable = () => router.push('/(tabs)/TimeTable' as any);

  const handleStudentCardUpload = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Permission Required', 'Camera roll permissions are required to upload a card.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [16, 10], quality: 0.7 });
      if (result.canceled) return;
      const imageUri = result.assets[0].uri;
      setLocalCardUri(imageUri); setIsUploadingCard(true); setCardUploadProgress(10);
      const ctx = ImageManipulator.ImageManipulator.manipulate(imageUri);
      ctx.resize({ width: 1200 });
      const rendered = await ctx.renderAsync();
      const saved = await rendered.saveAsync({ compress: 0.6, format: ImageManipulator.SaveFormat.JPEG });
      setCardUploadProgress(30);
      const token = await user?.getIdToken();
      const formData = new FormData();
      if (Platform.OS === 'web') { const response = await fetch(saved.uri); const blob = await response.blob(); formData.append('photo', blob, 'card.jpg'); }
      else { formData.append('photo', { uri: saved.uri, name: 'card.jpg', type: 'image/jpeg' } as any); }
      const res = await fetch(`${API_URL}/api/auth/upload-student-card`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      setCardUploadProgress(90);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'فشل الرفع');
      setCardUploadProgress(100);
      if (data.data?.studentCardPhotoURL) setStudentCardUrl(data.data.studentCardPhotoURL);
      if (backendUser) setBackendUser({ ...backendUser, studentCardPhotoURL: data.data?.studentCardPhotoURL });
      setLocalCardUri(null);
      if (Platform.OS === 'android') { ToastAndroid.showWithGravity('Updated!', ToastAndroid.SHORT, ToastAndroid.BOTTOM); }
      else { Alert.alert('Saved', 'Saved'); }
    } catch (err: any) { setLocalCardUri(null); Alert.alert('Error', err.message); }
    finally { setIsUploadingCard(false); setCardUploadProgress(0); }
  };

  const navigateToGpa = () => router.push('/(tabs)/GpaPlanner' as any);
  const typeAccent: Record<string, string> = { Lec: colors.indigo, Sec: colors.teal, Lab: colors.amber };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ alignItems: 'flex-start' }}>
            <Text style={[s.greeting, { color: colors.textSecondary }]}>{getGreeting()} 👋</Text>
            <Text style={[s.userName, { color: colors.textPrimary }]}>{firstName}</Text>
            <Text style={[s.dateText, { color: colors.textMuted }]}>{todayStr}</Text>
          </View>
          <View style={[s.focusChip, { backgroundColor: colors.indigoPale, flexDirection: 'row' }]}>
            <MaterialCommunityIcons name="brain" size={14} color={colors.indigo} />
            <Text style={[s.focusChipText, { color: colors.indigo }]}>Deep Work</Text>
          </View>
        </View>

        {/* GPA Hero Card */}
        <TouchableOpacity style={[s.gpaCard, { backgroundColor: colors.indigo }]} activeOpacity={0.85} onPress={navigateToGpa}>
          <View style={s.gpaCardTop}>
            <View style={{ alignItems: 'flex-start', flex: 1 }}>
              <Text style={s.gpaLabel}>GPA Overview</Text>
              <Text style={s.gpaValue}>{currentGpa.toFixed(2)}</Text>
              <Text style={s.gpaSubLabel}>Target {targetGpa.toFixed(1)}</Text>
            </View>
            <View style={[s.gpaBadge, { flexDirection: 'row' }]}>
              <Feather name="award" size={20} color={colors.teal} />
              <Text style={s.gpaBadgeText}>Dean&apos;s List</Text>
            </View>
          </View>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { backgroundColor: colors.teal, width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <View style={[s.gpaCardFooter, { flexDirection: 'row' }]}>
            <Text style={s.progressLabel}>{Math.round(gpaProgress * 100)}%</Text>
            <Text style={s.tapHint}>View Details -{'>'}</Text>
          </View>
        </TouchableOpacity>

        {/* Stats */}
        <View style={[s.statsRow, { flexDirection: 'row' }]}>
          <StatCard icon="book-open" label="Schedule" value={getTotalCourses().toString()} color={colors.indigo} bgColor={colors.indigoPale} />
          <StatCard icon="clock" label="Total Earned Hrs" value={(backendUser?.earnedCreditHours ?? 0).toString()} color={colors.teal} bgColor={colors.tealLight} />
          <StatCard icon="trending-up" label="CGPA" value={currentGpa.toFixed(2)} color={colors.amber} bgColor={colors.amberLight} onPress={navigateToGpa} />
        </View>

        {/* Schedule */}
        <View style={[s.sectionHeader, { flexDirection: 'row' }]}>
          <View style={{ alignItems: 'flex-start', flex: 1 }}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Upcoming Classes</Text>
            <Text style={[s.sectionSub, { color: colors.textMuted }]}>{getDayDisplayName()}</Text>
          </View>
          <TouchableOpacity style={[s.addButton, { backgroundColor: colors.indigo }]} onPress={navigateToTimetable}>
            <Feather name="plus" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loadingContainer}><ActivityIndicator size="large" color={colors.indigo} /><Text style={[s.loadingText, { color: colors.textMuted }]}>...</Text></View>
        ) : todayClasses.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="calendar" size={36} color={colors.indigoLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No classes today</Text>
            <Text style={[s.emptySubtext, { color: colors.textMuted }]}>Enjoy your free time!</Text>
          </View>
        ) : (
          todayClasses.slice(0, 3).map(entry => {
            const accent = typeAccent[entry.type] || colors.indigo;
            let displayType = entry.type;
            if (entry.type === 'Lec') displayType = 'Lecture';
            else if (entry.type === 'Sec') displayType = 'Section';
            else if (entry.type === 'Lab') displayType = 'Lab';
            return (
              <ScheduleItem key={entry.id} title={entry.subject}
                type={displayType} time={`${entry.slot.start} – ${entry.slot.end}`}
                place={entry.place || 'TBD'} accentColor={accent} colors={colors} rowDir="row" alignText="left" />
            );
          })
        )}

        {/* Quick Actions */}
        <Text style={[s.sectionTitle, { marginTop: 24, marginBottom: 14, color: colors.textPrimary }]}>Quick Actions</Text>
        <View style={[s.quickGrid, { flexDirection: 'row' }]}>
          {[
            { icon: 'calendar', label: 'Schedule', color: colors.indigo, onPress: navigateToTimetable },
            { icon: 'pie-chart', label: 'Planner', color: colors.teal, onPress: navigateToGpa },
            { icon: 'check-square', label: 'Generator', color: colors.green, onPress: () => router.push('/(tabs)/Generator' as any) },
            { icon: 'book', label: 'Library', color: colors.amber, onPress: () => router.push('/(tabs)/Questions' as any) },
          ].map(({ icon, label, color, onPress }) => (
            <TouchableOpacity key={label} style={[s.quickCard, { backgroundColor: color }]} activeOpacity={0.85} onPress={onPress}>
              <Feather name={icon as any} size={22} color="#fff" />
              <Text style={s.quickCardLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Student Card */}
        <Text style={[s.sectionTitle, { marginTop: 24, marginBottom: 14, color: colors.textPrimary }]}>Student Card</Text>
        <View style={s.studentCardContainer}>
          {(localCardUri || studentCardUrl) ? (
            <View style={[s.studentCardWithPhoto, { backgroundColor: colors.card }]}>
              <Image source={{ uri: localCardUri || studentCardUrl! }} style={s.studentCardImage} />
              <TouchableOpacity style={[s.updateCardButton, { backgroundColor: colors.indigo, flexDirection: 'row' }]} onPress={handleStudentCardUpload} disabled={isUploadingCard}>
                {isUploadingCard ? <><ActivityIndicator size="small" color="#fff" /><Text style={s.updateCardButtonText}>{cardUploadProgress}%</Text></> : <><Feather name="upload" size={16} color="#fff" /><Text style={s.updateCardButtonText}>Save</Text></>}
              </TouchableOpacity>
              {isUploadingCard && <View style={[s.progressBarOuter, { backgroundColor: colors.border }]}><View style={[s.progressBarInner, { backgroundColor: colors.indigo, width: `${cardUploadProgress}%` as any }]} /></View>}
            </View>
          ) : (
            <TouchableOpacity style={[s.studentCard, { backgroundColor: colors.card, flexDirection: 'row' }]} onPress={handleStudentCardUpload} disabled={isUploadingCard}>
              <View style={[s.cardIconContainer, { backgroundColor: colors.indigoPale }]}>
                {isUploadingCard ? <ActivityIndicator size={24} color={colors.indigo} /> : <Ionicons name="card-outline" size={24} color={colors.indigo} />}
              </View>
              <View style={{ alignItems: 'flex-start', flex: 1 }}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Student Card</Text>
                <Text style={[s.cardSubtitle, { color: colors.textMuted }]}>{isUploadingCard ? '...' : ''}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};

const StatCard = ({ icon, label, value, color, bgColor, onPress }: StatCardProps) => (
  <TouchableOpacity style={[s.statCard, { backgroundColor: bgColor }]} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
    <View style={[s.statIconWrap, { backgroundColor: color + '20' }]}><Feather name={icon} size={18} color={color} /></View>
    <Text style={[s.statValue, { color }]}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const ScheduleItem = ({ title, type, time, place, accentColor, colors, rowDir, alignText }: ScheduleItemProps & { rowDir: any, alignText: any }) => (
  <View style={[s.scheduleItem, { backgroundColor: colors.card, flexDirection: 'row' }]}>
    <View style={s.scheduleContent}>
      <View style={[s.scheduleHeaderRow, { flexDirection: 'row' }]}>
        <Text style={[s.scheduleTitle, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
        <View style={[s.sessionBadge, { backgroundColor: accentColor + '18' }]}><Text style={[s.sessionBadgeText, { color: accentColor }]}>{type}</Text></View>
      </View>
      <View style={[s.scheduleDetails, { flexDirection: 'row' }]}>
        <View style={[s.detailRow, { flexDirection: 'row' }]}><Feather name="clock" size={12} color={colors.textMuted} /><Text style={[s.detailText, { color: colors.textSecondary }]}>{time}</Text></View>
        <View style={[s.detailRow, { flexDirection: 'row' }]}><Ionicons name="location-outline" size={12} color={colors.textMuted} /><Text style={[s.detailText, { color: colors.textSecondary }]}>{place}</Text></View>
      </View>
    </View>
    <View style={[s.accentBar, { backgroundColor: accentColor }]} />
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 110 },
  header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 15, fontWeight: '500' },
  userName: { fontSize: 26, fontWeight: '800', marginTop: 2 },
  dateText: { fontSize: 13, marginTop: 2 },
  focusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 5, marginTop: 4 },
  focusChipText: { fontSize: 12, fontWeight: '600' },
  gpaCard: { borderRadius: 24, padding: 22, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  gpaCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  gpaLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600', letterSpacing: 0.5 },
  gpaValue: { fontSize: 48, fontWeight: '900', color: '#fff', lineHeight: 54, marginTop: 2 },
  gpaSubLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  gpaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, gap: 6 },
  gpaBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 3 },
  gpaCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  tapHint: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { width: '31%', padding: 14, borderRadius: 16, alignItems: 'center' },
  statIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionSub: { fontSize: 13, marginTop: 1 },
  addButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { alignItems: 'center', paddingVertical: 36 },
  loadingText: { marginTop: 10, fontSize: 14 },
  emptyCard: { alignItems: 'center', paddingVertical: 32, borderRadius: 16, marginBottom: 8, borderWidth: 1 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtext: { fontSize: 13, marginTop: 4 },
  scheduleItem: { borderRadius: 16, flexDirection: 'row', marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  accentBar: { width: 5 },
  scheduleContent: { flex: 1, padding: 14 },
  scheduleHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  scheduleTitle: { fontSize: 15, fontWeight: '700', flex: 1, marginLeft: 8 },
  scheduleCode: { fontSize: 12, marginBottom: 8 },
  sessionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sessionBadgeText: { fontSize: 11, fontWeight: '700' },
  scheduleDetails: { flexDirection: 'row', gap: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  quickCard: { width: (SCREEN_W - 52) / 2, paddingVertical: 20, paddingHorizontal: 18, borderRadius: 16, alignItems: 'flex-start', gap: 10, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  quickCardLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  studentCardContainer: { marginBottom: 8 },
  studentCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, gap: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  studentCardWithPhoto: { borderRadius: 16, padding: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  studentCardImage: { width: '100%', height: 180, borderRadius: 10, resizeMode: 'cover', marginBottom: 12 },
  updateCardButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  updateCardButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  progressBarOuter: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressBarInner: { height: '100%', borderRadius: 2 },
  cardIconContainer: { padding: 12, borderRadius: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalHandleBar: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalScroll: { flex: 1 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  modalInput: { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  col: { flex: 1 },
  pickerRow: { flexDirection: 'row', marginBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, marginRight: 8, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '500' },
  modalActions: { paddingTop: 14, borderTopWidth: 1 },
  saveButton: { paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  addClassModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '82%', padding: 20 },
});

export default HomeScreen;
