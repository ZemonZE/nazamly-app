import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/constants/theme';

type Intensity = 'Low' | 'Medium' | 'High';

const SUBJECTS = ['Biology', 'Calculus', 'Physics', 'History', 'CS', 'Chemistry', 'English', 'Economics'];
const FREE_SLOTS = [
  { id: 'lunch', label: 'Lunch Break', icon: 'food-apple', time: '12:00 – 13:00' },
  { id: 'gym', label: 'Gym Session', icon: 'dumbbell', time: '17:00 – 18:00' },
  { id: 'evening', label: 'Evening Free', icon: 'weather-sunset', time: '19:00 – 21:00' },
  { id: 'weekend', label: 'Weekend Time', icon: 'calendar-weekend', time: 'Sat & Sun' },
] as const;

type BlockType = 'Deep Work' | 'Cognitive Reset' | 'Admin' | 'Free';

interface TimelineBlock {
  time: string;
  label: string;
  type: BlockType;
  subject?: string;
}

const getBlockMeta = (type: BlockType, colors: any) => ({
  'Deep Work': { bg: colors.indigoPale, border: colors.indigo, text: colors.indigo, icon: 'brain' },
  'Cognitive Reset': { bg: colors.tealLight, border: colors.teal, text: colors.teal, icon: 'leaf' },
  'Admin': { bg: colors.amberLight, border: colors.amber, text: colors.amber, icon: 'clipboard-text' },
  'Free': { bg: colors.greenLight, border: colors.green, text: colors.green, icon: 'coffee' },
}[type]);

const generateSchedule = (intensity: Intensity, subjects: string[], freeSlots: string[]): TimelineBlock[] => {
  const intensityMap: Record<Intensity, number> = { Low: 2, Medium: 3, High: 5 };
  const deepWorkCount = intensityMap[intensity];
  const schedule: TimelineBlock[] = [{ time: '07:00 – 08:00', label: 'Morning Routine', type: 'Free' }];
  const subjectQueue = [...subjects, ...subjects].slice(0, deepWorkCount);
  const hours = [8, 9, 10, 11, 13, 14, 15, 16, 17, 20];
  let subjectIdx = 0;
  hours.forEach(h => {
    const timeStr = `${h.toString().padStart(2, '0')}:00 – ${(h + 1).toString().padStart(2, '0')}:00`;
    const isFree = freeSlots.some(fs => (fs === 'lunch' && h === 12) || (fs === 'gym' && h === 17) || (fs === 'evening' && (h === 19 || h === 20)));
    if (isFree) {
      schedule.push({ time: timeStr, label: freeSlots.includes('gym') && h === 17 ? 'Gym Session' : 'Break / Reset', type: 'Cognitive Reset' });
    } else if (subjectIdx < subjectQueue.length) {
      schedule.push({ time: timeStr, label: `${subjectQueue[subjectIdx]} Study`, type: 'Deep Work', subject: subjectQueue[subjectIdx] });
      subjectIdx++;
    } else if (h >= 18) {
      schedule.push({ time: timeStr, label: 'Review & Recap', type: 'Admin' });
    }
  });
  schedule.push({ time: '22:00 – 23:00', label: 'Wind Down', type: 'Free' });
  return schedule;
};

export default function GeneratorScreen() {
  const { colors, isDark } = useAppTheme();
  const [intensity, setIntensity] = useState<Intensity>('Medium');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Biology', 'Calculus']);
  const [selectedSlots, setSelectedSlots] = useState<string[]>(['lunch']);
  const [generated, setGenerated] = useState<TimelineBlock[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleSubject = (s: string) => { setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]); setGenerated(null); };
  const toggleSlot = (id: string) => { setSelectedSlots(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); setGenerated(null); };

  const handleGenerate = async () => {
    setIsGenerating(true); setGenerated(null);
    await new Promise(r => setTimeout(r, 1000));
    setGenerated(generateSchedule(intensity, selectedSubjects, selectedSlots));
    setIsGenerating(false);
  };

  const intensityMeta: Record<Intensity, { color: string; bg: string; desc: string }> = {
    Low: { color: colors.teal, bg: colors.tealLight, desc: '2 deep work blocks' },
    Medium: { color: colors.indigo, bg: colors.indigoPale, desc: '3 deep work blocks' },
    High: { color: colors.amber, bg: colors.amberLight, desc: '5 deep work blocks' },
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={[s.header, { backgroundColor: colors.indigoPale }]}>
          <MaterialCommunityIcons name="lightning-bolt" size={28} color={colors.indigo} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Optimize Your Flow</Text>
            <Text style={[s.headerSub, { color: colors.textSecondary }]}>AI-curated 24h schedule built around you</Text>
          </View>
        </View>

        {/* Study Intensity */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Study Intensity</Text>
          <View style={s.intensityRow}>
            {(['Low', 'Medium', 'High'] as Intensity[]).map(lvl => {
              const meta = intensityMeta[lvl];
              const active = intensity === lvl;
              return (
                <TouchableOpacity key={lvl} style={[s.intensityBtn, { borderColor: active ? meta.color : colors.border }, active && { backgroundColor: meta.bg }]}
                  onPress={() => { setIntensity(lvl); setGenerated(null); }} activeOpacity={0.75}>
                  <Text style={[s.intensityLabel, { color: active ? meta.color : colors.textSecondary }]}>{lvl}</Text>
                  {active && <Text style={[s.intensityDesc, { color: meta.color }]}>{meta.desc}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Priority Subjects */}
        <View style={[s.card, { backgroundColor: colors.card }]}>
          <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Priority Subjects</Text>
          <Text style={[s.cardSub, { color: colors.textMuted }]}>Select subjects to focus on today</Text>
          <View style={s.chipsWrap}>
            {SUBJECTS.map(sub => {
              const active = selectedSubjects.includes(sub);
              return (
                <TouchableOpacity key={sub} style={[s.subjectChip, { backgroundColor: active ? colors.indigoPale : colors.bg, borderColor: active ? colors.indigo : colors.border }]}
                  onPress={() => toggleSubject(sub)} activeOpacity={0.75}>
                  <Text style={[s.subjectChipText, { color: active ? colors.indigo : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>{sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Free Time Slots */}
        <View style={[s.card, { backgroundColor: colors.card }]}>
          <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Free Time Slots</Text>
          <Text style={[s.cardSub, { color: colors.textMuted }]}>Block out time you want to protect</Text>
          {FREE_SLOTS.map(slot => {
            const active = selectedSlots.includes(slot.id);
            return (
              <TouchableOpacity key={slot.id} style={[s.slotRow, active && { backgroundColor: colors.tealLight }]} onPress={() => toggleSlot(slot.id)} activeOpacity={0.8}>
                <View style={[s.slotIcon, { backgroundColor: active ? colors.teal : colors.bg }]}>
                  <MaterialCommunityIcons name={slot.icon as any} size={18} color={active ? '#fff' : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.slotLabel, { color: active ? colors.textPrimary : colors.textSecondary }]}>{slot.label}</Text>
                  <Text style={[s.slotTime, { color: colors.textMuted }]}>{slot.time}</Text>
                </View>
                <View style={[s.slotCheck, { backgroundColor: active ? colors.teal : 'transparent', borderColor: active ? colors.teal : colors.border }]}>
                  {active && <Feather name="check" size={12} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA */}
        <TouchableOpacity style={[s.generateBtn, { backgroundColor: colors.indigo, opacity: isGenerating ? 0.7 : 1 }]}
          onPress={handleGenerate} activeOpacity={0.85} disabled={isGenerating || selectedSubjects.length === 0}>
          <MaterialCommunityIcons name="lightning-bolt" size={22} color="#fff" />
          <Text style={s.generateBtnText}>{isGenerating ? 'Generating...' : '✨ Generate Schedule'}</Text>
        </TouchableOpacity>

        {/* Legend */}
        {generated && (
          <View style={s.legendRow}>
            {(['Deep Work', 'Cognitive Reset', 'Admin', 'Free'] as BlockType[]).map(type => {
              const meta = getBlockMeta(type, colors)!;
              return (
                <View key={type} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: meta.border }]} />
                  <Text style={[s.legendText, { color: colors.textSecondary }]}>{type}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Timeline */}
        {generated && (
          <View style={s.timelineContainer}>
            <Text style={[s.timelineTitle, { color: colors.textPrimary }]}>🗓 Curated 24h Timetable</Text>
            {generated.map((block, i) => {
              const meta = getBlockMeta(block.type, colors)!;
              return (
                <View key={i} style={s.timelineRow}>
                  <View style={s.timelineLeft}>
                    <Text style={[s.blockTime, { color: colors.textMuted }]}>{block.time}</Text>
                  </View>
                  <View style={[s.timelineBlock, { backgroundColor: meta.bg, borderLeftColor: meta.border }]}>
                    <View style={s.timelineBlockHeader}>
                      <MaterialCommunityIcons name={meta.icon as any} size={15} color={meta.text} />
                      <Text style={[s.blockLabel, { color: meta.text }]}>{block.label}</Text>
                    </View>
                    <Text style={[s.blockType, { color: meta.text + 'AA' }]}>{block.type}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 18, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 13, marginTop: 2 },
  card: { borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 12, marginBottom: 14 },
  intensityRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  intensityBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  intensityLabel: { fontSize: 14, fontWeight: '700' },
  intensityDesc: { fontSize: 10, fontWeight: '500', marginTop: 3 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  subjectChipText: { fontSize: 13 },
  slotRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderRadius: 10, marginBottom: 6, paddingHorizontal: 4, gap: 12 },
  slotIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  slotLabel: { fontSize: 14, fontWeight: '600' },
  slotTime: { fontSize: 12, marginTop: 1 },
  slotCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, borderRadius: 24, gap: 10, marginBottom: 20, shadowColor: '#3F51B5', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  generateBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '500' },
  timelineContainer: { marginBottom: 10 },
  timelineTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  timelineLeft: { width: 92, alignItems: 'flex-end', paddingTop: 8 },
  blockTime: { fontSize: 11, fontWeight: '600', textAlign: 'right' },
  timelineBlock: { flex: 1, borderRadius: 10, padding: 12, borderLeftWidth: 3, marginBottom: 4 },
  timelineBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  blockLabel: { fontSize: 14, fontWeight: '700', flex: 1 },
  blockType: { fontSize: 11, fontWeight: '500', marginLeft: 22 },
});
