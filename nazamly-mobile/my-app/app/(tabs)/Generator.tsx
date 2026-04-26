import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  ActivityIndicator, Alert, Platform, TextInput, Dimensions,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/firebase';
import { useAppTheme } from '@/constants/theme';
import { generateSchedule, saveAISchedule } from '@/services/scheduleService';

const { width: SCREEN_W } = Dimensions.get('window');
const SCHEDULE_STORAGE_KEY = '@nazamly_schedules_v2';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const TYPE_COLORS: Record<string, string> = { Lec: '#6366f1', Sec: '#14b8a6', Lab: '#f59e0b' };
const TYPE_LABELS: Record<string, string> = { Lec: 'Lecture', Sec: 'Section', Lab: 'Lab' };

function to12h(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${suffix}`;
}

function aiTypeToShort(type: string): string {
  if (!type) return 'Lec';
  const lower = type.toLowerCase();
  if (lower.includes('lec')) return 'Lec';
  if (lower.includes('sec')) return 'Sec';
  if (lower.includes('lab')) return 'Lab';
  return 'Lec';
}

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

interface AIScheduleEntry {
  courseCode: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  type: string;
  group: string;
  location: string;
}

interface AIScheduleResult {
  score: number;
  schedule: AIScheduleEntry[];
}

interface AIResultsData {
  success: boolean;
  metadata: {
    aiModelUsed: string;
    totalSessionsExtracted: number;
    uniqueCoursesIdentified: string[];
  };
  generatedSchedules: AIScheduleResult[];
}

export default function GeneratorScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();

  // ── File picker state ──
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [courseNumbers, setCourseNumbers] = useState('');

  // ── AI state ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AIResultsData | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  // ── File pickers ──
  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets) {
      const newFiles: PickedFile[] = result.assets.map(a => ({
        uri: a.uri,
        name: a.fileName || 'schedule.jpg',
        mimeType: a.mimeType || 'image/jpeg',
      }));
      setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setFiles(prev => [...prev, { uri: a.uri, name: a.fileName || 'photo.jpg', mimeType: a.mimeType || 'image/jpeg' }].slice(0, 5));
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setFiles(prev => [...prev, { uri: a.uri, name: a.name || 'file.pdf', mimeType: a.mimeType || 'application/pdf' }].slice(0, 5));
    }
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  // ── Generate schedules (POST /api/ai/generate) ──
  const handleGenerate = useCallback(async () => {
    if (files.length === 0) {
      Alert.alert('No files', 'Please upload at least one schedule image.');
      return;
    }
    if (!user) {
      Alert.alert('Not logged in', 'Please sign in first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const token = await user.getIdToken(true);
      const targetCourses = courseNumbers.trim() ? courseNumbers.split(/[,،\s]+/).map(s => s.trim()).filter(Boolean) : [];
      const response = await generateSchedule(files, targetCourses, token);
      setResults(response);
      setSelectedIdx(0);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [files, courseNumbers, user]);

  // ── Save to local timetable + backend ──
  const handleSave = useCallback(async () => {
    if (!results || !user) return;
    const chosen = results.generatedSchedules?.[selectedIdx]?.schedule || [];
    if (chosen.length === 0) return;

    setSaving(true);
    try {
      const token = await user.getIdToken(true);
      const response = await saveAISchedule({ schedule: chosen, title: `Smart Schedule #${selectedIdx + 1}` }, token);
      if (!response.success) {
        throw new Error(response.message || 'Failed to save');
      }

      // 2) Also save to local AsyncStorage (so TimeTable picks them up)
      const localEntries = chosen.map((entry: AIScheduleEntry, idx: number) => ({
        id: Date.now() + idx,
        subject: entry.courseCode,
        type: aiTypeToShort(entry.type),
        day: entry.dayOfWeek,
        slot: { start: to12h(entry.startTime), end: to12h(entry.endTime) },
        group: entry.group || '',
        place: entry.location || '',
      }));

      const existing = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);
      const prev = existing ? JSON.parse(existing) : [];
      await AsyncStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify([...prev, ...localEntries]));

      Alert.alert('Success', 'Schedule saved! Check your Timetable.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  }, [results, selectedIdx, user]);

  const resetAll = () => {
    setResults(null);
    setFiles([]);
    setCourseNumbers('');
    setError(null);
  };

  // ── Group schedule entries by day ──
  const groupByDay = (schedule: AIScheduleEntry[]) => {
    const map: Record<string, AIScheduleEntry[]> = {};
    DAYS.forEach(d => (map[d] = []));
    schedule.forEach(s => {
      if (map[s.dayOfWeek]) map[s.dayOfWeek].push(s);
    });
    return map;
  };

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ alignItems: 'flex-start', flex: 1 }}>
            <Text style={s.screenTitle}>Smart Schedule</Text>
            <Text style={s.subtitle}>AI-powered schedule generation from images</Text>
          </View>
          <View style={[s.headerBadge, { backgroundColor: colors.indigoPale }]}>
            <MaterialCommunityIcons name="robot" size={20} color={colors.indigo} />
          </View>
        </View>

        {/* ═══════════════════════════════════
            UPLOAD (shown when no results)
        ═══════════════════════════════════ */}
        {!results && (
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Upload Schedule Images</Text>
            <Text style={[s.cardDesc, { color: colors.textMuted }]}>
              Upload your college schedule images and optionally enter course numbers — {"we'll"} generate the best schedules without conflicts.
            </Text>

            {/* Source buttons */}
            <View style={s.sourceRow}>
              <TouchableOpacity style={[s.sourceBtn, { backgroundColor: colors.indigo }]} onPress={pickFromGallery}>
                <Feather name="image" size={18} color="#fff" />
                <Text style={s.sourceBtnText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.sourceBtn, { backgroundColor: '#14b8a6' }]} onPress={pickFromCamera}>
                <Feather name="camera" size={18} color="#fff" />
                <Text style={s.sourceBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.sourceBtn, { backgroundColor: '#f59e0b' }]} onPress={pickDocument}>
                <Feather name="file-text" size={18} color="#fff" />
                <Text style={s.sourceBtnText}>PDF</Text>
              </TouchableOpacity>
            </View>

            {/* File list */}
            {files.length > 0 && (
              <View style={s.filesList}>
                {files.map((f, i) => (
                  <View key={i} style={[s.fileItem, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Feather name="file" size={14} color={colors.textMuted} />
                    <Text style={[s.fileName, { color: colors.textPrimary }]} numberOfLines={1}>{f.name}</Text>
                    <TouchableOpacity onPress={() => removeFile(i)}>
                      <Feather name="x" size={16} color={colors.red || '#ef4444'} />
                    </TouchableOpacity>
                  </View>
                ))}
                <Text style={[s.filesCount, { color: colors.textMuted }]}>{files.length}/5 files</Text>
              </View>
            )}

            {/* Course numbers */}
            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Course Numbers (Optional)</Text>
            <TextInput
              style={[s.input, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.textPrimary }]}
              placeholder="e.g. 402, 407, 408, 490"
              placeholderTextColor={colors.textMuted}
              value={courseNumbers}
              onChangeText={setCourseNumbers}
            />
            <Text style={[s.inputHint, { color: colors.textMuted }]}>Separate with commas — leave empty to show all</Text>

            {/* Error */}
            {error && (
              <View style={[s.errorCard, { backgroundColor: (colors.red || '#ef4444') + '12' }]}>
                <Feather name="alert-circle" size={18} color={colors.red || '#ef4444'} />
                <Text style={[s.errorText, { color: colors.red || '#ef4444' }]}>{error}</Text>
              </View>
            )}

            {/* Generate button */}
            <TouchableOpacity
              style={[s.generateBtn, { backgroundColor: colors.indigo, opacity: loading || files.length === 0 ? 0.6 : 1 }]}
              onPress={handleGenerate}
              disabled={loading || files.length === 0}
              activeOpacity={0.85}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={s.generateBtnText}>Analyzing with AI...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="rocket-launch" size={20} color="#fff" />
                  <Text style={s.generateBtnText}>Generate Schedules</Text>
                </>
              )}
            </TouchableOpacity>

            {loading && (
              <View style={[s.loadingBar, { backgroundColor: colors.border }]}>
                <View style={[s.loadingFill, { backgroundColor: colors.indigo }]} />
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════
            RESULTS
        ═══════════════════════════════════ */}
        {results && (
          <>
            {/* Metadata bar */}
            <View style={[s.metaBar, { backgroundColor: colors.card }]}>
              <View style={s.metaItem}>
                <Text style={[s.metaLabel, { color: colors.textMuted }]}>Model</Text>
                <Text style={[s.metaValue, { color: colors.textPrimary }]}>{results.metadata?.aiModelUsed || 'AI'}</Text>
              </View>
              <View style={[s.metaDivider, { backgroundColor: colors.border }]} />
              <View style={s.metaItem}>
                <Text style={[s.metaLabel, { color: colors.textMuted }]}>Sessions</Text>
                <Text style={[s.metaValue, { color: colors.textPrimary }]}>{results.metadata?.totalSessionsExtracted || 0}</Text>
              </View>
              <View style={[s.metaDivider, { backgroundColor: colors.border }]} />
              <View style={s.metaItem}>
                <Text style={[s.metaLabel, { color: colors.textMuted }]}>Courses</Text>
                <Text style={[s.metaValue, { color: colors.textPrimary }]}>{(results.metadata?.uniqueCoursesIdentified || []).length}</Text>
              </View>
            </View>

            {/* Schedule selector pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsScroll} contentContainerStyle={s.pillsContent}>
              {(results.generatedSchedules || []).map((sched, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.pill, selectedIdx === i && { backgroundColor: colors.indigo }]}
                  onPress={() => setSelectedIdx(i)}
                >
                  <Text style={[s.pillRank, selectedIdx === i && { color: '#fff' }]}>#{i + 1}</Text>
                  <Text style={[s.pillScore, selectedIdx === i && { color: 'rgba(255,255,255,0.8)' }]}>Score: {Math.round(sched.score)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Render chosen schedule */}
            {(() => {
              const chosen = results.generatedSchedules?.[selectedIdx]?.schedule || [];
              const byDay = groupByDay(chosen);
              if (chosen.length === 0) {
                return (
                  <View style={[s.emptyCard, { backgroundColor: colors.card }]}>
                    <Feather name="calendar" size={36} color={colors.textMuted} />
                    <Text style={[s.emptyText, { color: colors.textSecondary }]}>No suitable schedules found</Text>
                  </View>
                );
              }

              return (
                <>
                  {DAYS.map(day => {
                    const items = byDay[day];
                    if (!items || items.length === 0) return null;
                    return (
                      <View key={day} style={[s.dayCard, { backgroundColor: colors.card }]}>
                        <View style={s.dayHeader}>
                          <Text style={[s.dayTitle, { color: colors.textPrimary }]}>{day}</Text>
                          <View style={[s.dayBadge, { backgroundColor: colors.indigo + '20' }]}>
                            <Text style={[s.dayBadgeText, { color: colors.indigo }]}>{items.length}</Text>
                          </View>
                        </View>
                        {items
                          .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                          .map((entry, idx) => {
                            const typeShort = aiTypeToShort(entry.type);
                            return (
                              <View key={idx} style={s.classRow}>
                                <View style={[s.classAccent, { backgroundColor: TYPE_COLORS[typeShort] || '#6366f1' }]} />
                                <View style={s.classContent}>
                                  <View style={s.classTopRow}>
                                    <Text style={[s.classSubject, { color: colors.textPrimary }]} numberOfLines={1}>{entry.courseCode}</Text>
                                    <View style={[s.typeBadge, { backgroundColor: (TYPE_COLORS[typeShort] || '#6366f1') + '18', borderColor: TYPE_COLORS[typeShort] || '#6366f1' }]}>
                                      <Text style={[s.typeBadgeText, { color: TYPE_COLORS[typeShort] || '#6366f1' }]}>{TYPE_LABELS[typeShort] || entry.type}</Text>
                                    </View>
                                  </View>
                                  <View style={s.classInfoRow}>
                                    <View style={s.infoItem}>
                                      <Feather name="clock" size={11} color={colors.textMuted} />
                                      <Text style={[s.infoText, { color: colors.textMuted }]}>{to12h(entry.startTime)} – {to12h(entry.endTime)}</Text>
                                    </View>
                                    {entry.group ? (
                                      <View style={s.infoItem}>
                                        <Feather name="users" size={11} color={colors.textMuted} />
                                        <Text style={[s.infoText, { color: colors.textMuted }]}>{entry.group}</Text>
                                      </View>
                                    ) : null}
                                    {entry.location ? (
                                      <View style={s.infoItem}>
                                        <Feather name="map-pin" size={11} color={colors.textMuted} />
                                        <Text style={[s.infoText, { color: colors.textMuted }]}>{entry.location}</Text>
                                      </View>
                                    ) : null}
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                      </View>
                    );
                  })}
                </>
              );
            })()}

            {/* Action buttons */}
            <View style={s.actionsRow}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.indigo }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="save" size={18} color="#fff" />
                )}
                <Text style={s.actionBtnText}>{saving ? 'Saving...' : 'Save to Timetable'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                onPress={resetAll}
              >
                <Feather name="refresh-cw" size={18} color={colors.textSecondary} />
                <Text style={[s.actionBtnText, { color: colors.textSecondary }]}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 110 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  screenTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  headerBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  card: { borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  cardDesc: { fontSize: 13, lineHeight: 19, marginBottom: 18 },

  sourceRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  sourceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14 },
  sourceBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  filesList: { marginBottom: 16 },
  fileItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  fileName: { flex: 1, fontSize: 13 },
  filesCount: { fontSize: 12, marginTop: 4, textAlign: 'right' },

  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 4 },
  inputHint: { fontSize: 11, marginBottom: 16 },

  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 13, fontWeight: '500' },

  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  loadingBar: { height: 4, borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  loadingFill: { height: '100%', width: '60%', borderRadius: 2 },

  // Results
  metaBar: { flexDirection: 'row', borderRadius: 16, padding: 16, marginBottom: 14, alignItems: 'center' },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  metaDivider: { width: 1, height: 30 },

  pillsScroll: { marginBottom: 14 },
  pillsContent: { gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#6366f120' },
  pillRank: { fontSize: 14, fontWeight: '800', color: '#6366f1' },
  pillScore: { fontSize: 12, fontWeight: '500', color: '#6366f1' },

  dayCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  dayTitle: { fontSize: 16, fontWeight: 'bold' },
  dayBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  dayBadgeText: { fontSize: 11, fontWeight: 'bold' },

  classRow: { flexDirection: 'row', overflow: 'hidden', borderTopWidth: 1, borderTopColor: '#00000008' },
  classAccent: { width: 4 },
  classContent: { flex: 1, padding: 12, paddingLeft: 14 },
  classTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  classSubject: { fontSize: 14, fontWeight: '700', flex: 1, marginBottom: 4 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold' },
  classInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 11 },

  emptyCard: { alignItems: 'center', paddingVertical: 40, borderRadius: 16 },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
