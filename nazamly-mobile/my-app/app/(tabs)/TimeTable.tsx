import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/constants/theme';

// ─── Constants (mirroring Generator.jsx exactly) ─────────────────────────────
const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const SLOTS: Record<number, { start: string; end: string }[]> = {
  2: [
    { start: '8:00 AM',  end: '10:00 AM' },
    { start: '10:00 AM', end: '12:00 PM' },
    { start: '12:00 PM', end: '2:00 PM'  },
    { start: '2:00 PM',  end: '4:00 PM'  },
    { start: '4:00 PM',  end: '6:00 PM'  },
    { start: '6:00 PM',  end: '8:00 PM'  },
  ],
  3: [
    { start: '8:00 AM',  end: '11:00 AM' },
    { start: '11:00 AM', end: '2:00 PM'  },
    { start: '2:00 PM',  end: '5:00 PM'  },
    { start: '5:00 PM',  end: '8:00 PM'  },
  ],
};

const TYPE_LABELS: Record<string, string> = { Lec: 'Lecture', Sec: 'Section', Lab: 'Lab' };
const TYPE_COLORS: Record<string, string> = { Lec: '#6366f1', Sec: '#14b8a6', Lab: '#f59e0b' };

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

interface ConflictState {
  type: string;
  msg: string;
}

const STORAGE_KEY = '@nazamly_schedules_v2';

const initialForm: FormState = {
  subject: '',
  type: 'Lec',
  day: DAYS[0],
  duration: 2,
  slotIndex: 0,
  group: '',
  place: '',
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const TimetableScreen = () => {
  const { colors } = useAppTheme();

  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [conflict, setConflict] = useState<ConflictState | null>(null);

  const slots = SLOTS[form.duration];

  // ── Load from AsyncStorage ──
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

  // ── Save to AsyncStorage whenever schedules change ──
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(schedules)).catch(console.error);
    }
  }, [schedules, loading]);

  const handleChange = (field: keyof FormState, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'duration' ? { slotIndex: 0 } : {}),
    }));
  };

  // ── Conflict validation — same logic as web Generator.jsx ──
  const validate = (): boolean => {
    const slot = slots[form.slotIndex];

    // 1. Time conflict — same day, same slot start
    const timeConflict = schedules.find(s => s.day === form.day && s.slot.start === slot.start);
    if (timeConflict) {
      setAddModalVisible(false);
      setTimeout(() => setConflict({ type: 'time', msg: `You already have "${timeConflict.subject}" at this time!` }), 300);
      return false;
    }

    // 2. Same subject + same type
    const sameType = schedules.find(
      s => s.subject.trim().toLowerCase() === form.subject.trim().toLowerCase() && s.type === form.type,
    );
    if (sameType) {
      setAddModalVisible(false);
      setTimeout(() => setConflict({ type: 'type', msg: `"${form.subject}" is already registered as ${TYPE_LABELS[form.type]}!` }), 300);
      return false;
    }

    // 3. Same subject max 2 entries
    const sameSubjectCount = schedules.filter(
      s => s.subject.trim().toLowerCase() === form.subject.trim().toLowerCase(),
    ).length;
    if (sameSubjectCount >= 2) {
      setAddModalVisible(false);
      setTimeout(() => setConflict({ type: 'limit', msg: `"${form.subject}" has reached the limit (2 entries max)!` }), 300);
      return false;
    }

    return true;
  };

  const addSchedule = () => {
    if (!form.subject.trim()) {
      setAddModalVisible(false);
      setTimeout(() => setConflict({ type: 'empty', msg: 'Please enter the subject name.' }), 300);
      return;
    }
    if (!validate()) return;

    const slot = slots[form.slotIndex];
    setSchedules(prev => [
      ...prev,
      {
        id: Date.now(),
        subject: form.subject.trim(),
        type: form.type,
        day: form.day,
        slot,
        group: form.group,
        place: form.place,
      },
    ]);
    setForm(initialForm);
    setAddModalVisible(false);
  };

  const removeSchedule = (id: number) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  // Group by day (same as web)
  const scheduleByDay: Record<string, ScheduleEntry[]> = DAYS.reduce((acc, day) => {
    acc[day] = schedules.filter(s => s.day === day).sort((a, b) => a.slot.start.localeCompare(b.slot.start));
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container}>
      {/* ── Conflict Popup (equivalent of conflict-overlay) ── */}
      <Modal visible={!!conflict} transparent animationType="fade">
        <TouchableOpacity style={s.conflictOverlay} activeOpacity={1} onPress={() => setConflict(null)}>
          <TouchableOpacity style={s.conflictPopup} activeOpacity={1} onPress={() => {}}>
            <Text style={s.conflictIcon}>⚠️</Text>
            <Text style={s.conflictTitle}>Schedule Conflict</Text>
            <Text style={s.conflictMsg}>{conflict?.msg}</Text>
            <TouchableOpacity style={s.conflictBtn} onPress={() => setConflict(null)}>
              <Text style={s.conflictBtnText}>OK</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.screenTitle}>Schedule</Text>
          <Text style={s.subtitle}>{schedules.length} {schedules.length === 1 ? 'Class' : 'Classes'}</Text>
        </View>
        <TouchableOpacity style={s.addButton} onPress={() => setAddModalVisible(true)}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={s.addButtonText}>Add Class</Text>
        </TouchableOpacity>
      </View>

      {/* ── Schedule list grouped by day ── */}
      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color={colors.indigo} /></View>
      ) : schedules.length === 0 ? (
        <View style={s.centered}>
          <Text style={{ fontSize: 40 }}>📅</Text>
          <Text style={s.emptyText}>Add classes to view your schedule</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          {DAYS.map(day => {
            const items = scheduleByDay[day];
            if (!items.length) return null;
            return (
              <View key={day} style={s.dayCard}>
                <Text style={s.dayTitle}>{day}</Text>

                {/* Column headers */}
                <View style={s.rowHeader}>
                  <Text style={[s.colHeader, { flex: 2 }]}>Time</Text>
                  <Text style={[s.colHeader, { flex: 3 }]}>Subject</Text>
                  <Text style={[s.colHeader, { flex: 1.5 }]}>Group</Text>
                  <Text style={[s.colHeader, { flex: 1.5 }]}>Place</Text>
                  <Text style={[s.colHeader, { width: 32 }]}> </Text>
                </View>

                {items.map(item => (
                  <View key={item.id} style={s.row}>
                    {/* Time column */}
                    <View style={[s.col, { flex: 2 }]}>
                      <Text style={s.timeText}>{item.slot.start}</Text>
                      <Text style={s.timeSep}>↓</Text>
                      <Text style={s.timeText}>{item.slot.end}</Text>
                    </View>

                    {/* Subject column */}
                    <View style={[s.col, { flex: 3, alignItems: 'flex-start' }]}>
                      <Text style={s.subjectText}>{item.subject}</Text>
                      <View style={[s.typeBadge, { backgroundColor: TYPE_COLORS[item.type] + '22', borderColor: TYPE_COLORS[item.type] }]}>
                        <Text style={[s.typeBadgeText, { color: TYPE_COLORS[item.type] }]}>{item.type}</Text>
                      </View>
                    </View>

                    {/* Group column */}
                    <Text style={[s.colValue, { flex: 1.5 }]}>{item.group || '—'}</Text>

                    {/* Place column */}
                    <Text style={[s.colValue, { flex: 1.5 }]}>{item.place || '—'}</Text>

                    {/* Delete button */}
                    <TouchableOpacity onPress={() => removeSchedule(item.id)} style={s.deleteBtn}>
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Add Class Modal (equivalent of the form card in web) ── */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {/* Modal Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Class</Text>
              <TouchableOpacity onPress={() => { setAddModalVisible(false); setForm(initialForm); }}>
                <Feather name="x" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Subject Name */}
              <Text style={s.label}>Subject Name</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Operating Systems"
                placeholderTextColor={colors.textMuted}
                value={form.subject}
                onChangeText={t => handleChange('subject', t)}
              />

              {/* Type selector */}
              <Text style={s.label}>Class Type</Text>
              <View style={s.typeRow}>
                {Object.entries(TYPE_LABELS).map(([key, val]) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.typeBtn, form.type === key && { backgroundColor: TYPE_COLORS[key], borderColor: TYPE_COLORS[key] }]}
                    onPress={() => handleChange('type', key)}
                  >
                    <Text style={[s.typeBtnCode, form.type === key && { color: '#fff' }]}>{key}</Text>
                    <Text style={[s.typeBtnLabel, form.type === key && { color: '#fff' }]}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Day picker */}
              <Text style={s.label}>Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
                {DAYS.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[s.chip, form.day === day && s.chipActive]}
                    onPress={() => handleChange('day', day)}
                  >
                    <Text style={[s.chipText, form.day === day && s.chipTextActive]}>{day.substring(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Duration selector */}
              <Text style={s.label}>Duration</Text>
              <View style={s.durationRow}>
                {([2, 3] as (2|3)[]).map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[s.durationBtn, form.duration === d && s.durationBtnActive]}
                    onPress={() => handleChange('duration', d)}
                  >
                    <Text style={[s.durationBtnText, form.duration === d && s.durationBtnTextActive]}>
                      {d === 2 ? '2 hours' : '3 hours'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Time slot picker */}
              <Text style={s.label}>Time Slot</Text>
              {slots.map((sl, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.slotBtn, form.slotIndex === i && s.slotBtnActive]}
                  onPress={() => handleChange('slotIndex', i)}
                >
                  <Text style={[s.slotBtnText, form.slotIndex === i && s.slotBtnTextActive]}>
                    {sl.start} — {sl.end}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Group */}
              <Text style={s.label}>Group Number</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. G1"
                placeholderTextColor={colors.textMuted}
                value={form.group}
                onChangeText={t => handleChange('group', t)}
              />

              {/* Place */}
              <Text style={s.label}>Location</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Hall 101"
                placeholderTextColor={colors.textMuted}
                value={form.place}
                onChangeText={t => handleChange('place', t)}
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Submit */}
            <TouchableOpacity style={s.submitBtn} onPress={addSchedule}>
              <Text style={s.submitBtnText}>+ Add to Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles factory ───────────────────────────────────────────────────────────
const styles = (colors: any) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  centered:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText:       { fontSize: 16, color: colors.textMuted, marginTop: 12, textAlign: 'center' },

  // Header
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 16 },
  screenTitle:     { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  subtitle:        { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  addButton:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.indigo, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, gap: 6 },
  addButtonText:   { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Day card / rows
  dayCard:         { backgroundColor: colors.card, borderRadius: 16, marginBottom: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  dayTitle:        { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, padding: 14, paddingBottom: 8 },
  rowHeader:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  colHeader:       { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  row:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  col:             { alignItems: 'center' },
  timeText:        { fontSize: 12, color: colors.textPrimary, fontWeight: '600' },
  timeSep:         { fontSize: 10, color: colors.textMuted },
  subjectText:     { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  typeBadge:       { marginTop: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  typeBadgeText:   { fontSize: 10, fontWeight: 'bold' },
  colValue:        { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  deleteBtn:       { width: 32, alignItems: 'center', justifyContent: 'center' },

  // Conflict popup
  conflictOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  conflictPopup:   { backgroundColor: colors.card, borderRadius: 20, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 10 },
  conflictIcon:    { fontSize: 40, marginBottom: 12 },
  conflictTitle:   { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  conflictMsg:     { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  conflictBtn:     { backgroundColor: colors.indigo, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  conflictBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Add class modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:    { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '88%', padding: 20 },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:      { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  label:           { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 14, marginBottom: 6 },
  input:           { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: colors.textPrimary },

  // Type selector (matches web type-btn)
  typeRow:         { flexDirection: 'row', gap: 10 },
  typeBtn:         { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bg },
  typeBtnCode:     { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  typeBtnLabel:    { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  // Day chips
  chipRow:         { flexDirection: 'row', marginBottom: 4 },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  chipActive:      { backgroundColor: colors.indigo, borderColor: colors.indigo },
  chipText:        { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  chipTextActive:  { color: '#fff', fontWeight: '700' },

  // Duration buttons
  durationRow:     { flexDirection: 'row', gap: 10 },
  durationBtn:     { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.bg },
  durationBtnActive:     { borderColor: colors.indigo, backgroundColor: colors.indigo + '18' },
  durationBtnText:       { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  durationBtnTextActive: { color: colors.indigo, fontWeight: '700' },

  // Time slot picker
  slotBtn:         { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 6, backgroundColor: colors.bg },
  slotBtnActive:   { borderColor: colors.indigo, backgroundColor: colors.indigo + '15' },
  slotBtnText:     { fontSize: 14, color: colors.textMuted },
  slotBtnTextActive: { color: colors.indigo, fontWeight: '700' },

  // Submit button
  submitBtn:       { backgroundColor: colors.indigo, paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  submitBtnText:   { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default TimetableScreen;
