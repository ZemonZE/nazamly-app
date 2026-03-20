import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/constants/theme';

const STORAGE_KEY = '@nazamly_gpa_profile';

const GRADE_OPTIONS = [
  { value: 4.0, label: 'High Distinction' },
  { value: 3.5, label: 'Distinction' },
  { value: 3.0, label: 'High Very Good' },
  { value: 2.5, label: 'Very Good' },
  { value: 2.0, label: 'High Good' },
  { value: 1.5, label: 'Good' },
];

const MOCK_SCHEDULE = [
  { id: 1, name: 'Analytical Math', code: 'MATH 232', credits: 4 },
  { id: 2, name: 'Advanced Programming', code: 'CS 301', credits: 4 },
  { id: 3, name: 'Databases', code: 'CS 302', credits: 3 },
  { id: 4, name: 'Linear Algebra', code: 'MATH 211', credits: 3 },
  { id: 5, name: 'Management Principles', code: 'MGT 101', credits: 2 },
];

function classifyGpa(v: number | string) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n) || n < 0) return { label: '', color: 'transparent' };
  if (n === 0) return { label: 'Fail', color: '#ef4444' };
  if (n < 1.5) return { label: 'Pass', color: '#ef4444' };
  if (n < 2.0) return { label: 'Good', color: '#f97316' };
  if (n < 2.5) return { label: 'High Good', color: '#eab308' };
  if (n < 3.0) return { label: 'Very Good', color: '#f59e0b' };
  if (n < 3.5) return { label: 'High Very Good', color: '#38bdf8' };
  if (n < 4.0) return { label: 'Distinction', color: '#3b82f6' };
  if (n <= 5.0) return { label: 'High Distinction', color: '#22c55e' };
  return { label: '', color: 'transparent' };
}

function gradeLabel(val: number) {
  const g = GRADE_OPTIONS.find(o => o.value === val);
  return g ? g.label : classifyGpa(val).label;
}

function computeStrategy(courses: any[], grades: Record<string, number>, oldCgpa: number, oldHours: number, target: number) {
  const termHours = courses.reduce((s, c) => s + c.credits, 0);
  const totalHours = oldHours + termHours;
  const neededPoints = target * totalHours - oldCgpa * oldHours;
  const maxPoints = courses.reduce((s, c) => s + 5.0 * c.credits, 0);
  const maxCgpa = (oldCgpa * oldHours + maxPoints) / totalHours;

  if (target > 5.0 || neededPoints > maxPoints) {
    return {
      possible: false,
      maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2),
      maxCls: classifyGpa(Math.min(maxCgpa, 5.0)),
    };
  }

  if (neededPoints <= 0) {
    return {
      possible: true,
      requiredTermGpa: '0.00',
      maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2),
      plan: courses.map((c) => ({ ...c, requiredGrade: 1.5 })),
      note: 'Your current CGPA already exceeds the target! Any passing grade will do.',
    };
  }

  let remaining = [...courses];
  let remainingPoints = neededPoints;
  const planGrades: Record<string, number> = {};

  while (remaining.length > 0) {
    const pointsPerCourse = remainingPoints / remaining.length;
    const overflow = remaining.filter((c) => pointsPerCourse / c.credits > 5.0);

    if (overflow.length === 0) {
      remaining.forEach((c) => {
        planGrades[c.id] = parseFloat((pointsPerCourse / c.credits).toFixed(2));
      });
      break;
    }

    overflow.forEach((c) => {
      planGrades[c.id] = 4.9;
      remainingPoints -= 4.9 * c.credits;
    });

    remaining = remaining.filter((c) => planGrades[c.id] === undefined);

    if (remaining.length === 0 && remainingPoints > 0.001) {
      return {
        possible: false,
        maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2),
        maxCls: classifyGpa(Math.min(maxCgpa, 5.0)),
      };
    }
  }

  const plan = courses.map((c) => ({
    ...c,
    requiredGrade: planGrades[c.id] ?? 0,
  }));

  const requiredTermGpa = termHours ? neededPoints / termHours : 0;

  return {
    possible: true,
    requiredTermGpa: requiredTermGpa.toFixed(2),
    maxCgpa: Math.min(maxCgpa, 5.0).toFixed(2),
    plan,
  };
}

export default function GpaPlannerScreen() {
  const { colors } = useAppTheme();
  const [profile, setProfile] = useState<{ cgpa: number; hours: number } | null>(null);
  const [cgpaInput, setCgpaInput] = useState('');
  const [hoursInput, setHoursInput] = useState('');
  const [profileError, setProfileError] = useState('');
  const [activeTab, setActiveTab] = useState<'calculator' | 'planner'>('calculator');
  const [grades, setGrades] = useState<Record<string, number>>(() =>
    Object.fromEntries(MOCK_SCHEDULE.map((c) => [c.id, 4.0]))
  );
  const [targetCgpa, setTargetCgpa] = useState('');
  const [strategy, setStrategy] = useState<any>(null);

  const cgpaClassification = useMemo(() => {
    const v = parseFloat(cgpaInput);
    if (cgpaInput === '' || isNaN(v) || v < 0 || v > 5) return null;
    return classifyGpa(v);
  }, [cgpaInput]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.cgpa !== undefined && parsed.hours !== undefined) setProfile(parsed);
        } catch { }
      }
    });
  }, []);

  const saveProfile = useCallback(() => {
    const cgpa = parseFloat(cgpaInput);
    const hours = parseInt(hoursInput, 10);
    setProfileError('');
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 5) return setProfileError('CGPA must be between 0 and 5');
    if (isNaN(hours) || hours < 0 || hours > 300) return setProfileError('Invalid earned hours');
    
    const data = { cgpa, hours };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setProfile(data);
  }, [cgpaInput, hoursInput]);

  const editProfile = () => {
    if (profile) {
      setCgpaInput(String(profile.cgpa));
      setHoursInput(String(profile.hours));
    }
    setProfile(null);
    setStrategy(null);
  };

  const handleGradeChange = (courseId: number, value: string) => {
    let v = parseFloat(value);
    if (isNaN(v)) v = 0;
    v = Math.round(v * 100) / 100;
    v = Math.max(0, Math.min(5, v));
    setGrades(prev => ({ ...prev, [courseId]: v }));
  };

  const incrementGrade = (courseId: number) => {
    setGrades(prev => {
      const cur = prev[courseId] ?? 0;
      return { ...prev, [courseId]: Math.min(5, Math.round((cur + 0.1) * 100) / 100) };
    });
  };

  const decrementGrade = (courseId: number) => {
    setGrades(prev => {
      const cur = prev[courseId] ?? 0;
      return { ...prev, [courseId]: Math.max(0, Math.round((cur - 0.1) * 100) / 100) };
    });
  };

  const calculations = useMemo(() => {
    if (!profile) return null;
    const termHours = MOCK_SCHEDULE.reduce((s, c) => s + c.credits, 0);
    const termPoints = MOCK_SCHEDULE.reduce((s, c) => s + grades[c.id] * c.credits, 0);
    const termGpa = termHours ? termPoints / termHours : 0;
    const totalHours = profile.hours + termHours;
    const expectedCgpa = totalHours ? (profile.cgpa * profile.hours + termGpa * termHours) / totalHours : 0;
    const maxCgpa = totalHours ? (profile.cgpa * profile.hours + 5.0 * termHours) / totalHours : 0;

    return {
      termHours,
      termPoints,
      termGpa: parseFloat(termGpa.toFixed(2)),
      totalHours,
      expectedCgpa: parseFloat(expectedCgpa.toFixed(2)),
      maxCgpa: parseFloat(Math.min(maxCgpa, 5.0).toFixed(2)),
    };
  }, [profile, grades]);

  const computeTarget = useCallback(() => {
    const target = parseFloat(targetCgpa);
    if (!profile || isNaN(target) || target < 0 || target > 5) {
      setStrategy({ error: 'Please enter a target CGPA between 0 and 5' });
      return;
    }
    setStrategy(computeStrategy(MOCK_SCHEDULE, grades, profile.cgpa, profile.hours, target));
  }, [targetCgpa, profile, grades]);

  const targetCls = useMemo(() => {
    const v = parseFloat(targetCgpa);
    if (targetCgpa === '' || isNaN(v) || v < 0 || v > 5) return null;
    return classifyGpa(v);
  }, [targetCgpa]);

  if (!profile) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.onboardCenter}>
            <View style={s.onboardIconWrap}>
              <Text style={{ fontSize: 44 }}>🎓</Text>
            </View>
            <Text style={[s.onboardTitle, { color: colors.textPrimary }]}>Smart GPA Planner</Text>
            <Text style={[s.onboardSub, { color: colors.textSecondary }]}>Enter your current academic standing to start planning your grades.</Text>

            {profileError ? (
              <View style={[s.errorBox, { backgroundColor: colors.redLight }]}>
                <Text style={{ color: colors.red }}>{profileError}</Text>
              </View>
            ) : null}

            <View style={[s.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[s.elegantInput, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <View style={[s.elegantIconWrap, { backgroundColor: colors.indigoPale }]}>
                  <Feather name="award" size={20} color={colors.indigo} />
                </View>
                <View style={s.elegantInputContent}>
                  <Text style={[s.elegantLabel, { color: colors.textSecondary }]}>Current CGPA</Text>
                  <TextInput
                    style={[s.elegantField, { color: colors.textPrimary }]}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 3.75"
                    placeholderTextColor={colors.textMuted}
                    value={cgpaInput}
                    onChangeText={setCgpaInput}
                  />
                </View>
                {cgpaClassification && (
                  <View style={[s.badge, { backgroundColor: cgpaClassification.color + '20' }]}>
                    <Text style={[s.badgeText, { color: cgpaClassification.color }]}>{cgpaClassification.label}</Text>
                  </View>
                )}
              </View>

              <View style={[s.elegantInput, { backgroundColor: colors.bg, borderColor: colors.border, marginTop: 16 }]}>
                <View style={[s.elegantIconWrap, { backgroundColor: colors.tealLight }]}>
                  <Feather name="clock" size={20} color={colors.teal} />
                </View>
                <View style={s.elegantInputContent}>
                  <Text style={[s.elegantLabel, { color: colors.textSecondary }]}>Total Earned Hours</Text>
                  <TextInput
                    style={[s.elegantField, { color: colors.textPrimary }]}
                    keyboardType="number-pad"
                    placeholder="e.g. 90"
                    placeholderTextColor={colors.textMuted}
                    value={hoursInput}
                    onChangeText={setHoursInput}
                  />
                </View>
              </View>

              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.indigo, marginTop: 24 }]} onPress={saveProfile}>
                <Text style={s.primaryBtnText}>Save and Continue</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const profileCls = classifyGpa(profile.cgpa);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.screenTitle, { color: colors.textPrimary }]}>Smart GPA Planner</Text>
          <Text style={[s.screenSubtitle, { color: colors.textMuted }]} numberOfLines={1}>Plan your academics</Text>
        </View>
        <TouchableOpacity style={[s.editBtn, { borderColor: colors.indigo }]} onPress={editProfile}>
          <Text style={[s.editBtnText, { color: colors.indigo }]}>Edit Input</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Strip */}
      <View style={[s.strip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={s.stripItem}>
          <Text style={[s.stripLabel, { color: colors.textSecondary }]}>CGPA</Text>
          <Text style={[s.stripVal, { color: colors.textPrimary }]}>{profile.cgpa}</Text>
          <Text style={{ color: profileCls.color, fontSize: 10, fontWeight: '700' }}>{profileCls.label}</Text>
        </View>
        <View style={[s.stripDiv, { backgroundColor: colors.divider }]} />
        <View style={s.stripItem}>
          <Text style={[s.stripLabel, { color: colors.textSecondary }]}>Earned Hrs</Text>
          <Text style={[s.stripVal, { color: colors.textPrimary }]}>{profile.hours}</Text>
        </View>
        <View style={[s.stripDiv, { backgroundColor: colors.divider }]} />
        <View style={s.stripItem}>
          <Text style={[s.stripLabel, { color: colors.textSecondary }]}>Term Hrs</Text>
          <Text style={[s.stripVal, { color: colors.textPrimary }]}>{calculations?.termHours}</Text>
        </View>
        <View style={[s.stripDiv, { backgroundColor: colors.divider }]} />
        <View style={s.stripItem}>
          <Text style={[s.stripLabel, { color: colors.textSecondary }]}>Max CGPA</Text>
          <Text style={[s.stripVal, { color: colors.textPrimary }]}>{calculations?.maxCgpa}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'calculator' ? { borderBottomColor: colors.indigo } : { borderBottomColor: 'transparent' }]}
          onPress={() => setActiveTab('calculator')}
        >
          <Text style={[s.tabText, { color: activeTab === 'calculator' ? colors.indigo : colors.textMuted }]}>Current Term</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'planner' ? { borderBottomColor: colors.indigo } : { borderBottomColor: 'transparent' }]}
          onPress={() => setActiveTab('planner')}
        >
          <Text style={[s.tabText, { color: activeTab === 'planner' ? colors.indigo : colors.textMuted }]}>Strategic Planner</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {activeTab === 'calculator' && calculations && (
          <>
            <View style={[s.resultCardsRow]}>
              <View style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.resultLabel, { color: colors.textSecondary }]}>Expected CGPA</Text>
                <Text style={[s.resultVal, { color: classifyGpa(calculations.expectedCgpa).color }]}>
                  {calculations.expectedCgpa}
                </Text>
                <Text style={[s.resultCls, { color: classifyGpa(calculations.expectedCgpa).color }]}>
                  {classifyGpa(calculations.expectedCgpa).label}
                </Text>
              </View>
              <View style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.resultLabel, { color: colors.textSecondary }]}>Term GPA</Text>
                <Text style={[s.resultVal, { color: classifyGpa(calculations.termGpa).color }]}>
                  {calculations.termGpa}
                </Text>
                <Text style={[s.resultCls, { color: classifyGpa(calculations.termGpa).color }]}>
                  {classifyGpa(calculations.termGpa).label}
                </Text>
              </View>
            </View>

            <View style={[s.courseListCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[s.courseListHeader, { borderBottomColor: colors.divider }]}>
                <Text style={[s.courseListTitle, { color: colors.textPrimary }]}>Current Courses</Text>
                <View style={[s.courseCountBadge, { backgroundColor: colors.indigoPale }]}>
                  <Text style={{ color: colors.indigo, fontSize: 12, fontWeight: '700' }}>{MOCK_SCHEDULE.length}</Text>
                </View>
              </View>
              {MOCK_SCHEDULE.map(c => {
                const gVal = grades[c.id];
                const gCls = classifyGpa(gVal);
                return (
                  <View key={c.id} style={[s.courseRow, { borderBottomColor: colors.divider }]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={[s.courseName, { color: colors.textPrimary }]} numberOfLines={1}>{c.name}</Text>
                      <Text style={[s.courseMeta, { color: colors.textMuted }]}>{c.code} • {c.credits} hrs</Text>
                    </View>
                    <View style={s.courseControls}>
                      <View style={[s.stepperWrap, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                        <TouchableOpacity style={s.stepperBtn} onPress={() => decrementGrade(c.id)}>
                          <Text style={{ color: colors.textSecondary, fontSize: 18 }}>−</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={[s.stepperInput, { color: colors.textPrimary }]}
                          keyboardType="numeric"
                          value={String(gVal)}
                          onChangeText={t => handleGradeChange(c.id, t)}
                        />
                        <TouchableOpacity style={s.stepperBtn} onPress={() => incrementGrade(c.id)}>
                          <Text style={{ color: colors.textSecondary, fontSize: 18 }}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={[s.coursePts, { color: gCls.color }]}>{(gVal * c.credits).toFixed(1)} pts</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={{ height: 20 }} />
          </>
        )}

        {activeTab === 'planner' && (
          <View>
            <View style={[s.targetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.targetIcon]}>🎯</Text>
              <Text style={[s.targetTitle, { color: colors.textPrimary }]}>Set Your Target</Text>
              <Text style={[s.targetDesc, { color: colors.textSecondary }]}>Enter the CGPA you want to reach, and we&apos;ll calculate the needed term GPA.</Text>

              <View style={[s.elegantInput, { backgroundColor: colors.bg, borderColor: colors.border, marginVertical: 20 }]}>
                <View style={[s.elegantIconWrap, { backgroundColor: colors.indigoPale }]}>
                  <Feather name="target" size={20} color={colors.indigo} />
                </View>
                <View style={s.elegantInputContent}>
                  <Text style={[s.elegantLabel, { color: colors.textSecondary }]}>Target CGPA</Text>
                  <TextInput
                    style={[s.elegantField, { color: colors.textPrimary }]}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 4.50"
                    placeholderTextColor={colors.textMuted}
                    value={targetCgpa}
                    onChangeText={setTargetCgpa}
                  />
                </View>
                {targetCls && (
                  <View style={[s.badge, { backgroundColor: targetCls.color + '20' }]}>
                    <Text style={[s.badgeText, { color: targetCls.color }]}>{targetCls.label}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.indigo }]} onPress={computeTarget}>
                <Text style={s.primaryBtnText}>Calculate Plan</Text>
              </TouchableOpacity>
              
              {calculations && (
                <Text style={[s.maxInfo, { color: colors.textMuted }]}>
                  Max possible this term: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{calculations.maxCgpa}</Text>
                </Text>
              )}
            </View>

            {strategy && strategy.error && (
              <View style={[s.alertBox, { backgroundColor: colors.redLight }]}>
                <Text style={{ color: colors.red }}>{strategy.error}</Text>
              </View>
            )}

            {strategy && !strategy.error && !strategy.possible && (
              <View style={[s.alertBox, { backgroundColor: colors.redLight, padding: 20 }]}>
                <Text style={{ fontSize: 30, textAlign: 'center', marginBottom: 10 }}>⚠️</Text>
                <Text style={[s.alertTitle, { color: colors.red }]}>Target Impossible</Text>
                <Text style={[s.alertText, { color: colors.red }]}>
                  The maximum CGPA you can reach is <Text style={{ fontWeight: '800' }}>{strategy.maxCgpa}</Text>. Try a lower target.
                </Text>
              </View>
            )}

            {strategy && strategy.possible && strategy.plan && (
              <View style={[s.strategyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.stratHead}>
                  <Text style={{ fontSize: 24, marginRight: 12 }}>✅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.stratTitle, { color: colors.textPrimary }]}>Target is Achievable!</Text>
                    <Text style={[s.stratSub, { color: colors.textSecondary }]}>
                      You need a Term GPA of <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{strategy.requiredTermGpa}</Text> to reach your target.
                    </Text>
                  </View>
                </View>

                {strategy.note && (
                  <View style={[s.alertBox, { backgroundColor: colors.indigoPale, marginHorizontal: 20, marginBottom: 16 }]}>
                    <Text style={{ color: colors.indigo }}>{strategy.note}</Text>
                  </View>
                )}

                <View style={[s.courseListHeader, { borderBottomColor: colors.divider, paddingHorizontal: 20 }]}>
                  <Text style={[s.courseListTitle, { color: colors.textPrimary }]}>Suggested Grades</Text>
                </View>
                {strategy.plan.map((c: any) => {
                  const gi = classifyGpa(c.requiredGrade);
                  return (
                    <View key={c.id} style={[s.courseRow, { borderBottomColor: colors.divider, paddingHorizontal: 20 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.courseName, { color: colors.textPrimary }]} numberOfLines={1}>{c.name}</Text>
                        <Text style={[s.courseMeta, { color: colors.textMuted }]}>{c.code} • {c.credits} hrs</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.stratReqGrade, { color: gi.color || colors.textPrimary }]}>{c.requiredGrade}</Text>
                        <Text style={[s.stratReqName, { color: colors.textSecondary }]}>{gradeLabel(c.requiredGrade)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={{ height: 40 }} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  // Onboard
  onboardCenter: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  onboardIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(63, 81, 181, 0.1)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },
  onboardTitle: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  onboardSub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 30, paddingHorizontal: 10 },
  inputCard: { borderWidth: 1, borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  elegantInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 8, paddingRight: 16, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  elegantIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  elegantInputContent: { flex: 1, marginLeft: 12 },
  elegantLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  elegantField: { fontSize: 17, fontWeight: '800', padding: 0 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  primaryBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  errorBox: { padding: 14, borderRadius: 12, marginBottom: 20 },
  
  // Dashboard / Layout
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1 },
  screenTitle: { fontSize: 22, fontWeight: '800' },
  screenSubtitle: { fontSize: 13, marginTop: 2 },
  editBtn: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: '700' },
  
  strip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  stripVal: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  stripDiv: { width: 1, height: 24 },
  
  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 10 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2 },
  tabText: { fontSize: 14, fontWeight: '700' },
  
  // Calculator
  resultCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  resultCard: { flex: 1, borderWidth: 1, borderRadius: 20, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  resultLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  resultVal: { fontSize: 32, fontWeight: '900', marginBottom: 4 },
  resultCls: { fontSize: 12, fontWeight: '700' },
  
  courseListCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  courseListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  courseListTitle: { fontSize: 16, fontWeight: '800' },
  courseCountBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  courseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  courseName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  courseMeta: { fontSize: 12 },
  courseControls: { alignItems: 'flex-end', width: 110 },
  stepperWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 6 },
  stepperBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  stepperInput: { width: 40, textAlign: 'center', fontSize: 14, fontWeight: '700', paddingVertical: 4 },
  coursePts: { fontSize: 11, fontWeight: '700', marginRight: 4 },

  // Target Planner
  targetCard: { borderWidth: 1, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20 },
  targetIcon: { fontSize: 40, marginBottom: 12 },
  targetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  targetDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  maxInfo: { fontSize: 13, marginTop: 16 },
  alertBox: { padding: 16, borderRadius: 16, marginBottom: 20 },
  alertTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  alertText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  strategyCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  stratHead: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  stratTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  stratSub: { fontSize: 13 },
  stratReqGrade: { fontSize: 18, fontWeight: '900' },
  stratReqName: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
