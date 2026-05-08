import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator, Image, Modal,
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Animated, Dimensions,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/constants/theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { API_URL } from '@/firebase';


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
  id: number | string;
  subject: string;
  type: string; // 'Lec' | 'Sec' | 'Lab'
  day: string;  // English day name
  slot: { start: string; end: string };
  group: string;
  place: string;
}

const SCHEDULE_STORAGE_KEY = '@nazamly_schedules';
const STUDENT_CARD_FRONT_KEY = '@nazamly_student_card_front';
const STUDENT_CARD_BACK_KEY = '@nazamly_student_card_back';

const DB_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];




const HomeScreen = () => {
  const { colors } = useAppTheme();
  const { user, backendUser, setBackendUser, refreshProfile } = useAuth();
  const router = useRouter();


  const [todayClasses, setTodayClasses] = useState<LocalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [localCardFront, setLocalCardFront] = useState<string | null>(null);
  const [localCardBack, setLocalCardBack] = useState<string | null>(null);
  const [viewingCard, setViewingCard] = useState<'front' | 'back' | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const today = new Date();
  const currentDayIndex = today.getDay();
  const firstName = user?.displayName?.split(' ')[0] || 'Student';
  const currentGpa = backendUser?.cgpa ?? backendUser?.currentCGPA ?? 0;
  const earnedHours = backendUser?.completedHours ?? backendUser?.earnedCreditHours ?? backendUser?.totalEarnedHours ?? 0;
  const targetGpa = 4.0;
  const gpaProgress = targetGpa > 0 ? Math.min(currentGpa / targetGpa, 1) : 0;
  const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    Animated.spring(progressAnim, { toValue: gpaProgress, useNativeDriver: false, tension: 60, friction: 8 }).start();
  }, [gpaProgress, progressAnim]);



  // Load today's schedule from DB & fallback to AsyncStorage
  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      let all: LocalEntry[] = [];
      let loadedFromDB = false;

      if (user) {
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${API_URL}/api/schedule/my-timetable`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const json = await res.json();
          if (json.success && json.data?.entries) {
            all = json.data.entries.map((e: any) => {
              // Normalize dayOfWeek: numeric → day name
              let dayName = e.dayOfWeek;
              if (typeof dayName === 'number') {
                dayName = DB_DAY_NAMES[dayName] || 'Sunday';
              }
              return {
                id: e._id || Date.now() + Math.random(),
                subject: e.courseCode || e.courseName || '',
                type: e.sessionType === 'Lecture' ? 'Lec' : e.sessionType === 'Section' ? 'Sec' : 'Lab',
                day: dayName,
                slot: { start: e.startTime, end: e.endTime },
                group: e.groupNumber || '',
                place: e.location || '',
              };
            });
            loadedFromDB = true;
            await AsyncStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(all));
          }
        } catch (dbErr) {
          console.error('[HomePage] DB Load error:', dbErr);
        }
      }

      if (!loadedFromDB) {
        const saved = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);
        if (saved) {
          all = JSON.parse(saved);
        }
      }

      if (all.length > 0) {
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
  }, [currentDayIndex, user]);


  useFocusEffect(
    useCallback(() => {
      fetchSchedule();
      if (refreshProfile) {
        refreshProfile();
      }
      // Load local student card images
      AsyncStorage.getItem(STUDENT_CARD_FRONT_KEY).then(v => setLocalCardFront(v));
      AsyncStorage.getItem(STUDENT_CARD_BACK_KEY).then(v => setLocalCardBack(v));
    }, [fetchSchedule, refreshProfile])
  );

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

  const navigateToStudentCard = () => router.push('/(tabs)/StudentCard' as any);

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
          <StatCard icon="clock" label="Total Earned Hrs" value={earnedHours.toString()} color={colors.teal} bgColor={colors.tealLight} />
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
            { icon: 'book', label: 'Quizzes', color: colors.amber, onPress: () => router.push('/(tabs)/Questions' as any) },
            { icon: 'code', label: 'Coding', color: colors.green, onPress: () => router.push('/(tabs)/Coding' as any) },
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
          {(localCardFront || localCardBack) ? (
            <View style={[s.studentCardWithPhoto, { backgroundColor: colors.card }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="shield-checkmark" size={18} color={colors.teal} />
                <Text style={{ fontSize: 12, color: colors.teal, marginLeft: 6, fontWeight: '600' }}>Saved on your device only</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {localCardFront && (
                  <TouchableOpacity style={[s.cardShowBtn, { backgroundColor: colors.indigo, flex: 1 }]} onPress={() => setViewingCard('front')}>
                    <Feather name="credit-card" size={16} color="#fff" />
                    <Text style={s.cardShowBtnText}>Show Front</Text>
                  </TouchableOpacity>
                )}
                {localCardBack && (
                  <TouchableOpacity style={[s.cardShowBtn, { backgroundColor: colors.teal, flex: 1 }]} onPress={() => setViewingCard('back')}>
                    <Feather name="credit-card" size={16} color="#fff" />
                    <Text style={s.cardShowBtnText}>Show Back</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={[s.updateCardButton, { backgroundColor: colors.indigoPale, flexDirection: 'row', marginTop: 10 }]} onPress={navigateToStudentCard}>
                <Feather name="edit-2" size={14} color={colors.indigo} />
                <Text style={[s.updateCardButtonText, { color: colors.indigo }]}>Update Card</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[s.studentCard, { backgroundColor: colors.card, flexDirection: 'row' }]} onPress={navigateToStudentCard}>
              <View style={[s.cardIconContainer, { backgroundColor: colors.indigoPale }]}>
                <Ionicons name="card-outline" size={24} color={colors.indigo} />
              </View>
              <View style={{ alignItems: 'flex-start', flex: 1 }}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Student Card</Text>
                <Text style={[s.cardSubtitle, { color: colors.textMuted }]}>Save your ID card for quick access</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Card Viewer Modal */}
        <Modal visible={viewingCard !== null} transparent animationType="fade">
          <TouchableOpacity style={s.cardViewerOverlay} activeOpacity={1} onPress={() => setViewingCard(null)}>
            <View style={s.cardViewerContent}>
              <Text style={s.cardViewerTitle}>{viewingCard === 'front' ? 'Front Side' : 'Back Side'}</Text>
              {viewingCard === 'front' && localCardFront && (
                <Image source={{ uri: localCardFront }} style={s.cardViewerImage} resizeMode="contain" />
              )}
              {viewingCard === 'back' && localCardBack && (
                <Image source={{ uri: localCardBack }} style={s.cardViewerImage} resizeMode="contain" />
              )}
              <TouchableOpacity style={s.cardViewerCloseBtn} onPress={() => setViewingCard(null)}>
                <Text style={s.cardViewerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
  updateCardButtonText: { fontSize: 14, fontWeight: '600' },
  cardShowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  cardShowBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cardViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardViewerContent: { width: '100%', alignItems: 'center' },
  cardViewerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  cardViewerImage: { width: '100%', height: 280, borderRadius: 16 },
  cardViewerCloseBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14 },
  cardViewerCloseText: { color: '#fff', fontSize: 15, fontWeight: '600' },
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
