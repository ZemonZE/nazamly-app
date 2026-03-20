import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/constants/theme';

// ─────────────────────────────────────────
// Constants — mirroring nazamly-front exactly
// ─────────────────────────────────────────
const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const SLOTS: Record<number, { start: string; end: string }[]> = {
  2: [
    { start: '8:00 AM', end: '10:00 AM' },
    { start: '10:00 AM', end: '12:00 PM' },
    { start: '12:00 PM', end: '2:00 PM' },
    { start: '2:00 PM', end: '4:00 PM' },
    { start: '4:00 PM', end: '6:00 PM' },
    { start: '6:00 PM', end: '8:00 PM' },
  ],
  3: [
    { start: '8:00 AM', end: '11:00 AM' },
    { start: '11:00 AM', end: '2:00 PM' },
    { start: '2:00 PM', end: '5:00 PM' },
    { start: '5:00 PM', end: '8:00 PM' },
  ],
};

const TYPE_LABELS: Record<string, string> = { Lec: 'Lecture', Sec: 'Section', Lab: 'Laboratory' };

const STORAGE_KEY = '@nazamly_schedules';

interface ScheduleEntry {
  id: number;
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

const initialForm: FormState = {
  subject: '',
  type: 'Lec',
  day: 'Saturday',
  duration: 2,
  slotIndex: 0,
  group: '',
  place: '',
};

// ─────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────
const TimetableScreen = () => {
  const { colors } = useAppTheme();
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [conflict, setConflict] = useState<string | null>(null);

  const slots = SLOTS[form.duration];

  // ── Load from AsyncStorage (equivalent to localStorage.getItem in web) ──
  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) setSchedules(JSON.parse(saved));
    } catch (err) {
      console.error('[Timetable] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  // ── Save to AsyncStorage whenever schedules change (same as useEffect → localStorage.setItem) ──
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(schedules)).catch(console.error);
    }
  }, [schedules, loading]);

  // ── Field updater ──
  const handleChange = (field: keyof FormState, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'duration' ? { slotIndex: 0 } : {}),
    }));
  };

  // ── Conflict validation — exact same logic as web Generator.jsx ──
  const validate = (): boolean => {
    const slot = slots[form.slotIndex];

    // 1. Time conflict — same day, same slot start
    const timeConflict = schedules.find(s => s.day === form.day && s.slot.start === slot.start);
    if (timeConflict) {
      setConflict(`You already have "${timeConflict.subject}" at this time!`);
      return false;
    }

    // 2. Same subject + same type already exists
    const sameType = schedules.find(
      s => s.subject.trim().toLowerCase() === form.subject.trim().toLowerCase() && s.type === form.type,
    );
    if (sameType) {
      setConflict(`"${form.subject}" is already registered as a ${TYPE_LABELS[form.type]}!`);
      return false;
    }

    // 3. Same subject registered more than twice (max 2 entries)
    const sameSubjectCount = schedules.filter(
      s => s.subject.trim().toLowerCase() === form.subject.trim().toLowerCase(),
    ).length;
    if (sameSubjectCount >= 2) {
      setConflict(`"${form.subject}" has reached the maximum limit (two entries only)!`);
      return false;
    }

    return true;
  };

  // ── Add entry ──
  const addSchedule = () => {
    if (!form.subject.trim()) {
      setConflict('Please enter a subject name');
      return;
    }
    if (!validate()) return;

    const slot = slots[form.slotIndex];
    const newEntry: ScheduleEntry = {
      id: Date.now(),
      subject: form.subject.trim(),
      type: form.type,
      day: form.day,
      slot,
      group: form.group,
      place: form.place,
    };
    setSchedules(prev => [...prev, newEntry]);
    setForm(initialForm);
    setAddModalVisible(false);
  };

  // ── Remove entry ──
  const removeSchedule = (id: number) => {
    Alert.alert('Delete Class', 'Are you sure you want to delete this class?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => setSchedules(prev => prev.filter(s => s.id !== id)),
      },
    ]);
  };

  // ── Group by day ──
  const scheduleByDay = DAYS.reduce<Record<string, ScheduleEntry[]>>((acc, day) => {
    acc[day] = schedules.filter(s => s.day === day).sort((a, b) =>
      a.slot.start.localeCompare(b.slot.start),
    );
    return acc;
  }, {});

  const typeAccent: Record<string, string> = {
    Lec: colors.indigo,
    Sec: colors.teal,
    Lab: colors.amber,
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[s.screenTitle, { color: colors.textPrimary }]}>Timetable</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>
            {schedules.length} {schedules.length === 1 ? 'class' : 'classes'}
          </Text>
        </View>
        <TouchableOpacity style={[s.addButton, { backgroundColor: colors.indigo }]} onPress={() => setAddModalVisible(true)}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={s.addButtonText}>Add Class</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.indigo} />
        </View>
      ) : schedules.length === 0 ? (
        <View style={s.centered}>
          <View style={[s.emptyIconWrap, { backgroundColor: colors.indigoPale }]}>
            <Feather name="calendar" size={40} color={colors.indigoLight} />
          </View>
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>Add classes to build your schedule</Text>
          <Text style={[s.emptySubtext, { color: colors.textMuted }]}>Tap &quot;Add Class&quot; to start</Text>
          <TouchableOpacity
            style={[s.emptyAddBtn, { backgroundColor: colors.indigoPale, borderColor: colors.indigo }]}
            onPress={() => setAddModalVisible(true)}
          >
            <Feather name="plus" size={16} color={colors.indigo} />
            <Text style={[s.emptyAddBtnText, { color: colors.indigo }]}>Add first class</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {DAYS.map(day => {
            const items = scheduleByDay[day];
            if (!items || items.length === 0) return null;
            return (
              <View key={day} style={s.daySection}>
                {/* Day Header */}
                <View style={s.daySectionHeader}>
                  <View style={[s.daySectionDot, { backgroundColor: colors.indigo }]} />
                  <Text style={[s.daySectionTitle, { color: colors.textPrimary }]}>{day}</Text>
                  <View style={[s.dayCountBadge, { backgroundColor: colors.indigoPale }]}>
                    <Text style={[s.dayCountText, { color: colors.indigo }]}>{items.length}</Text>
                  </View>
                </View>

                {items.map(item => {
                  const accent = typeAccent[item.type] || colors.indigo;
                  return (
                    <View key={item.id} style={[s.classCard, { backgroundColor: colors.card }]}>
                      <View style={[s.accentBar, { backgroundColor: accent }]} />
                      <View style={s.cardBody}>
                        {/* Top row */}
                        <View style={s.cardTop}>
                          <View style={s.titleRow}>
                            <View style={[s.courseIconWrap, { backgroundColor: accent + '20' }]}>
                              <Feather name="book" size={15} color={accent} />
                            </View>
                            <Text style={[s.classTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                              {item.subject}
                            </Text>
                          </View>
                          <View style={[s.typeBadge, { backgroundColor: accent + '20' }]}>
                            <Text style={[s.typeBadgeText, { color: accent }]}>
                              {item.type} — {TYPE_LABELS[item.type]}
                            </Text>
                          </View>
                        </View>

                        <View style={[s.cardDivider, { backgroundColor: colors.divider }]} />

                        {/* Bottom row */}
                        <View style={s.cardFooter}>
                          <View style={s.infoRow}>
                            <Feather name="clock" size={13} color={colors.textMuted} />
                            <Text style={[s.infoText, { color: colors.textSecondary }]}>
                              {item.slot.start} — {item.slot.end}
                            </Text>
                            {item.place ? (
                              <>
                                <Ionicons name="location-outline" size={13} color={colors.textMuted} style={{ marginLeft: 10 }} />
                                <Text style={[s.infoText, { color: colors.textSecondary }]}>{item.place}</Text>
                              </>
                            ) : null}
                            {item.group ? (
                              <>
                                <Feather name="users" size={13} color={colors.textMuted} style={{ marginLeft: 10 }} />
                                <Text style={[s.infoText, { color: colors.textSecondary }]}>{item.group}</Text>
                              </>
                            ) : null}
                          </View>
                          <TouchableOpacity
                            style={[s.deleteBtn, { backgroundColor: colors.redLight }]}
                            onPress={() => removeSchedule(item.id)}
                          >
                            <Feather name="trash-2" size={15} color={colors.red} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Conflict Popup ── */}
      {conflict && (
        <Modal transparent animationType="fade" visible={!!conflict}>
          <TouchableOpacity style={s.conflictOverlay} activeOpacity={1} onPress={() => setConflict(null)}>
            <View style={[s.conflictPopup, { backgroundColor: colors.card }]}>
              <Text style={s.conflictIcon}>⚠️</Text>
              <Text style={[s.conflictTitle, { color: colors.textPrimary }]}>Schedule Conflict</Text>
              <Text style={[s.conflictMsg, { color: colors.textSecondary }]}>{conflict}</Text>
              <TouchableOpacity style={[s.conflictBtn, { backgroundColor: colors.indigo }]} onPress={() => setConflict(null)}>
                <Text style={s.conflictBtnText}>Okay</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ── Add Modal ── */}
      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <View style={[s.modalHandleBar, { backgroundColor: colors.border }]} />
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Add Class</Text>
              <TouchableOpacity onPress={() => { setAddModalVisible(false); setForm(initialForm); }}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Subject */}
              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Subject Name</Text>
              <TextInput
                style={[s.modalInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
                value={form.subject}
                onChangeText={t => handleChange('subject', t)}
                placeholder="e.g. Operating Systems"
                placeholderTextColor={colors.textMuted}
              />

              {/* Type selector */}
              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Subject Type</Text>
              <View style={s.chipRow}>
                {Object.entries(TYPE_LABELS).map(([key, val]) => {
                  const active = form.type === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[s.chip, { backgroundColor: active ? colors.indigoPale : colors.divider, borderColor: active ? colors.indigo : 'transparent' }]}
                      onPress={() => handleChange('type', key)}
                    >
                      <Text style={[s.chipCode, { color: active ? colors.indigo : colors.textMuted }]}>{key}</Text>
                      <Text style={[s.chipVal, { color: active ? colors.indigo : colors.textSecondary }]}>{val}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Day selector */}
              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scrollRow}>
                {DAYS.map(day => {
                  const active = form.day === day;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[s.dayChip, { backgroundColor: active ? colors.indigoPale : colors.divider, borderColor: active ? colors.indigo : 'transparent' }]}
                      onPress={() => handleChange('day', day)}
                    >
                      <Text style={[s.dayChipText, { color: active ? colors.indigo : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Duration selector */}
              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>
                Duration {form.type === 'Lec' ? '(Lecture)' : form.type === 'Lab' ? '(Lab)' : '(Section)'}
              </Text>
              <View style={s.chipRow}>
                {([2, 3] as const).map(dur => {
                  const active = form.duration === dur;
                  return (
                    <TouchableOpacity
                      key={dur}
                      style={[s.durChip, { backgroundColor: active ? colors.indigoPale : colors.divider, borderColor: active ? colors.indigo : 'transparent' }]}
                      onPress={() => handleChange('duration', dur)}
                    >
                      <Text style={[s.durChipText, { color: active ? colors.indigo : colors.textSecondary }]}>
                        {dur === 2 ? '2 Hours' : '3 Hours'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Slot selector */}
              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Time Slot</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scrollRow}>
                {slots.map((slot, i) => {
                  const active = form.slotIndex === i;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[s.slotChip, { backgroundColor: active ? colors.indigoPale : colors.divider, borderColor: active ? colors.indigo : 'transparent' }]}
                      onPress={() => handleChange('slotIndex', i)}
                    >
                      <Text style={[s.slotChipText, { color: active ? colors.indigo : colors.textSecondary }]}>
                        {slot.start}
                      </Text>
                      <Text style={[s.slotChipSep, { color: active ? colors.indigoLight : colors.textMuted }]}>↓</Text>
                      <Text style={[s.slotChipText, { color: active ? colors.indigo : colors.textSecondary }]}>
                        {slot.end}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Group */}
              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Group Number (Optional)</Text>
              <TextInput
                style={[s.modalInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
                value={form.group}
                onChangeText={t => handleChange('group', t)}
                placeholder="e.g. G1"
                placeholderTextColor={colors.textMuted}
              />

              {/* Place */}
              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Location (Optional)</Text>
              <TextInput
                style={[s.modalInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
                value={form.place}
                onChangeText={t => handleChange('place', t)}
                placeholder="e.g. Hall 101"
                placeholderTextColor={colors.textMuted}
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={[s.modalActions, { borderTopColor: colors.divider }]}>
              <TouchableOpacity style={[s.saveButton, { backgroundColor: colors.indigo }]} onPress={addSchedule}>
                <Text style={s.saveButtonText}>+ Add to Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  screenTitle: { fontSize: 26, fontWeight: '900' },
  subtitle: { fontSize: 13, marginTop: 3 },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, gap: 6 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtext: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  emptyAddBtnText: { fontSize: 14, fontWeight: '700' },

  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30 },
  daySection: { marginBottom: 26 },
  daySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  daySectionDot: { width: 8, height: 8, borderRadius: 4 },
  daySectionTitle: { fontSize: 17, fontWeight: '800', flex: 1 },
  dayCountBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  dayCountText: { fontSize: 12, fontWeight: '700' },

  classCard: {
    borderRadius: 16, flexDirection: 'row', marginBottom: 12, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
  },
  accentBar: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  courseIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  classTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  cardDivider: { height: 1, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  infoText: { fontSize: 12, marginLeft: 4 },
  deleteBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Conflict popup
  conflictOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  conflictPopup: { borderRadius: 20, padding: 28, alignItems: 'center', width: '100%' },
  conflictIcon: { fontSize: 40, marginBottom: 12 },
  conflictTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  conflictMsg: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  conflictBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  conflictBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Add Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '88%', padding: 20 },
  modalHandleBar: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalScroll: { flex: 1 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 14 },
  modalInput: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 15 },
  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 4, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, flex: 1 },
  chipCode: { fontSize: 16, fontWeight: '800' },
  chipVal: { fontSize: 13, fontWeight: '600' },
  scrollRow: { marginBottom: 4 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, marginRight: 8, borderWidth: 1.5 },
  dayChipText: { fontSize: 13 },
  durChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, flex: 1 },
  durChipText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  slotChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginRight: 8, borderWidth: 1.5, minWidth: 90 },
  slotChipText: { fontSize: 12, fontWeight: '600' },
  slotChipSep: { fontSize: 14 },
  modalActions: { paddingTop: 14, borderTopWidth: 1, marginTop: 8 },
  saveButton: { borderRadius: 14, padding: 16, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default TimetableScreen;
