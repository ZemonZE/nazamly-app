import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  DataSourceModal, UploadFlow, HistoryFlow,
  Course, DataSource, classifyGpa, gradeLabel, computeStrategy,
} from '@/components/gpa';
import { API_URL } from '@/firebase';

const setupProfile = async (data: { currentCGPA: number; earnedCreditHours: number }, token: string) => {
  const res = await fetch(`${API_URL}/api/auth/setup-profile`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return res.json();
};


const STORAGE_KEY = '@nazamly_gpa_profile';
const COURSES_STORAGE_KEY = '@nazamly_gpa_courses';




export default function GpaPlannerScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();

  const [profile, setProfile] = useState<{ cgpa: number; hours: number } | null>(null);
  const [cgpaInput, setCgpaInput] = useState('');
  const [hoursInput, setHoursInput] = useState('');
  const [profileError, setProfileError] = useState('');

  const [activeTab, setActiveTab] = useState<'calculator' | 'planner'>('calculator');
  const [dataSource, setDataSource] = useState<DataSource>('manual');
  const [activeFlow, setActiveFlow] = useState<'none' | 'upload' | 'history'>('none');
  const [showSourceModal, setShowSourceModal] = useState(false);

  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [targetCgpa, setTargetCgpa] = useState('');
  const [strategy, setStrategy] = useState<any>(null);

  const cgpaClassification = useMemo(() => {
    const v = parseFloat(cgpaInput);
    if (!cgpaInput || isNaN(v) || v < 0 || v > 5) return null;
    return classifyGpa(v);
  }, [cgpaInput]);


  const getTermCourses = async (token: string) => {
    const res = await fetch(`${API_URL}/api/gpa/my-courses`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed');
    return res.json().then(d => d.data || []);
  };

  const addTermCourse = async (name: string, code: string, credits: number, token: string) => {
    await fetch(`${API_URL}/api/gpa/my-courses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseName: name, courseCode: code, creditHours: credits })
    });
  };

  const removeTermCourse = async (id: string, token: string) => {
    await fetch(`${API_URL}/api/gpa/my-courses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const generateTargetPlan = async (targetCGPA: number, currentCourses: any[], token: string) => {
    const res = await fetch(`${API_URL}/api/gpa/target-strategy`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCGPA, currentCourses })
    });
    if (!res.ok) throw new Error('Failed to generate plan');
    return res.json().then(d => d.data);
  };

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY).then(saved => {
        if (!saved) return;
        try {
          const p = JSON.parse(saved);
          if (p.cgpa !== undefined && p.hours !== undefined) setProfile(p);
        } catch { }
      }).catch(err => console.error('[GpaPlanner] Failed to load profile:', err));
      
      AsyncStorage.getItem(COURSES_STORAGE_KEY).then(saved => {
        if (!saved) return;
        try {
          const { courses: c, grades: g, dataSource: ds } = JSON.parse(saved);
          if (c) setCourses(c);
          if (g) setGrades(g);
          if (ds) setDataSource(ds);
        } catch { }
      }).catch(err => console.error('[GpaPlanner] Failed to load courses:', err));

      if (user) {
        (async () => {
          try {
            const token = await user.getIdToken();
            const backendCourses = await getTermCourses(token);
            if (backendCourses && backendCourses.length > 0) {
              const mapped = backendCourses.map((c: any) => ({
                id: c._id,
                name: c.name,
                code: c.courseCode,
                credits: c.creditHours,
              }));
              const localSaved = await AsyncStorage.getItem(COURSES_STORAGE_KEY);
              if (!localSaved) {
                setCourses(mapped);
                const defaultGrades: Record<string, number> = {};
                mapped.forEach((c: any) => { defaultGrades[c.id] = 4.0; });
                setGrades(defaultGrades);
              }
            }
          } catch (err) {
            console.log('Backend courses unavailable, using local:', err);
          }
        })();
      }
    }, [user])
  );

  const saveProfile = useCallback(async () => {
    const cgpa = parseFloat(cgpaInput);
    const hours = parseInt(hoursInput, 10);
    setProfileError('');
    if (isNaN(cgpa) || cgpa < 0 || cgpa > 5) return setProfileError('Invalid CGPA (0–5)');
    if (isNaN(hours) || hours < 0 || hours > 300) return setProfileError('Invalid hours (0–300)');
    const data = { cgpa, hours };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(err => console.error('[GpaPlanner] save profile error:', err));
    setProfile(data);
    // Sync profile to backend (fire-and-forget)
    if (user) {
      try {
        const token = await user.getIdToken();
        await setupProfile({ currentCGPA: cgpa, earnedCreditHours: hours }, token);
      } catch (err) {
        console.log('Failed to sync profile to backend:', err);
      }
    }
  }, [cgpaInput, hoursInput, user]);

  const editProfile = () => {
    if (profile) { setCgpaInput(String(profile.cgpa)); setHoursInput(String(profile.hours)); }
    setProfile(null);
    setStrategy(null);
    setCourses([]);
    setGrades({});
    AsyncStorage.removeItem(COURSES_STORAGE_KEY).catch(err => console.error('[GpaPlanner] remove courses error:', err));
  };

  const handleGradeChange = (id: string, value: string) => {
    let v = Math.max(0, Math.min(5, Math.round((parseFloat(value) || 0) * 100) / 100));
    const updatedGrades = { ...grades, [id]: v };
    setGrades(updatedGrades);
    AsyncStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify({ courses, grades: updatedGrades, dataSource })).catch(err => console.error('[GpaPlanner] save grades error:', err));
  };

  const handleSourceSelect = (src: DataSource) => {
    setDataSource(src);
    if (src === 'upload') setActiveFlow('upload');
    else if (src === 'history') setActiveFlow('history');
    else {
      setCourses([]);
      setGrades({});
    }
  };

  const handleFlowDone = (newCourses: Course[], newGrades: Record<string, number>) => {
    setCourses(newCourses);
    setGrades(newGrades);
    setActiveFlow('none');
    AsyncStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify({ courses: newCourses, grades: newGrades, dataSource })).catch(err => console.error('[GpaPlanner] save flow error:', err));
  };

  const addManualCourse = async () => {
    const id = `manual_${Date.now()}`;
    const newCourse: Course = { id, name: '', code: '', credits: 3 };
    const updatedCourses = [...courses, newCourse];
    const updatedGrades = { ...grades, [id]: 4.0 };
    setCourses(updatedCourses);
    setGrades(updatedGrades);
    AsyncStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify({ courses: updatedCourses, grades: updatedGrades, dataSource })).catch(err => console.error('[GpaPlanner] save add error:', err));
    
    if (user) {
      try {
        const token = await user.getIdToken();
        await addTermCourse('New Course', '', 3, token);
      } catch (err) {
        console.log('Failed to add course to backend:', err);
      }
    }
  };

  const updateManualCourse = (id: string, field: keyof Course, value: string) => {
    const updatedCourses = courses.map(c => c.id === id ? { ...c, [field]: field === 'credits' ? parseInt(value) || 0 : value } : c);
    setCourses(updatedCourses);
    AsyncStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify({ courses: updatedCourses, grades, dataSource })).catch(err => console.error('[GpaPlanner] save update error:', err));
  };

  const removeManualCourse = async (id: string) => {
    const updatedCourses = courses.filter(c => c.id !== id);
    const updatedGrades = { ...grades };
    delete updatedGrades[id];
    setCourses(updatedCourses);
    setGrades(updatedGrades);
    AsyncStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify({ courses: updatedCourses, grades: updatedGrades, dataSource })).catch(err => console.error('[GpaPlanner] save remove error:', err));
    
    if (user && !id.startsWith('manual_')) {
      try {
        const token = await user.getIdToken();
        await removeTermCourse(id, token);
      } catch (err) {
        console.log('Failed to remove course from backend:', err);
      }
    }
  };

  const calculations = useMemo(() => {
    if (!profile || courses.length === 0) return null;
    const termHours = courses.reduce((s, c) => s + c.credits, 0);
    const termPoints = courses.reduce((s, c) => s + (grades[c.id] ?? 0) * c.credits, 0);
    const termGpa = termHours ? termPoints / termHours : 0;
    const totalHours = profile.hours + termHours;
    const expectedCgpa = totalHours ? (profile.cgpa * profile.hours + termGpa * termHours) / totalHours : 0;
    const maxCgpa = totalHours ? (profile.cgpa * profile.hours + 5.0 * termHours) / totalHours : 0;
    return {
      termHours,
      termGpa: parseFloat(termGpa.toFixed(2)),
      totalHours,
      expectedCgpa: parseFloat(expectedCgpa.toFixed(2)),
      maxCgpa: parseFloat(Math.min(maxCgpa, 5.0).toFixed(2)),
    };
  }, [profile, courses, grades]);

  const computeTarget = useCallback(async () => {
    const target = parseFloat(targetCgpa);
    if (!profile || isNaN(target) || target < 0 || target > 5) {
      setStrategy({ error: 'Invalid Target CGPA' });
      return;
    }
    if (courses.length === 0) {
      setStrategy({ error: 'Add courses first' });
      return;
    }
    // Try backend first, fall back to local computation
    if (user) {
      try {
        const token = await user.getIdToken();
        const backendPlan = await generateTargetPlan(
          target,
          courses.map(c => ({ courseCode: c.code, creditHours: c.credits })),
          token,
        );
        setStrategy({
          possible: true,
          requiredTermGpa: backendPlan.requiredTermAverageGPA?.toFixed(2),
          ...backendPlan,
          plan: backendPlan.plan || [],
        });
        return;
      } catch (err) {
        console.log('Backend strategy unavailable, using local:', err);
      }
    }
    // Local fallback
    setStrategy(computeStrategy(courses, grades, profile.cgpa, profile.hours, target));
  }, [targetCgpa, profile, courses, grades, user]);

  const targetCls = useMemo(() => {
    const v = parseFloat(targetCgpa);
    if (!targetCgpa || isNaN(v) || v < 0 || v > 5) return null;
    return classifyGpa(v);
  }, [targetCgpa]);

  // ── Onboarding ──
  if (!profile) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[s.container, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={s.onboardCenter}>
          <View style={s.onboardIconWrap}><Text style={{ fontSize: 44 }}>🎓</Text></View>
          <Text style={[s.onboardTitle, { color: colors.textPrimary }]}>Smart GPA Planner</Text>
          <Text style={[s.onboardSub, { color: colors.textSecondary }]}>Plan and calculate your target CGPA accurately.</Text>

          {!!profileError && (
            <View style={[s.errorBox, { backgroundColor: colors.redLight }]}>
              <Text style={{ color: colors.red }}>{profileError}</Text>
            </View>
          )}

          <View style={[s.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.elegantInput, { backgroundColor: colors.indigoPale, borderColor: colors.indigoLight }]}>
              <View style={[s.elegantIconWrap, { backgroundColor: colors.card }]}>
                <Feather name="award" size={20} color={colors.indigo} />
              </View>
              <View style={s.elegantInputContent}>
                <Text style={[s.elegantLabel, { color: colors.textSecondary }]}>Current CGPA</Text>
                <TextInput style={[s.elegantField, { color: colors.textPrimary }]} keyboardType="decimal-pad" placeholder="e.g., 3.75" placeholderTextColor={colors.textMuted} value={cgpaInput} onChangeText={setCgpaInput} />
              </View>
              {cgpaClassification && (
                <View style={[s.badge, { backgroundColor: cgpaClassification.color + '20' }]}>
                  <Text style={[s.badgeText, { color: cgpaClassification.color }]}>{cgpaClassification.label}</Text>
                </View>
              )}
            </View>

            <View style={[s.elegantInput, { backgroundColor: colors.tealLight, borderColor: '#ccfbf1', marginTop: 16 }]}>
              <View style={[s.elegantIconWrap, { backgroundColor: colors.card }]}>
                <Feather name="clock" size={20} color={colors.teal} />
              </View>
              <View style={s.elegantInputContent}>
                <Text style={[s.elegantLabel, { color: colors.textSecondary }]}>Total Earned Hours</Text>
                <TextInput style={[s.elegantField, { color: colors.textPrimary }]} keyboardType="number-pad" placeholder="e.g., 90" placeholderTextColor={colors.textMuted} value={hoursInput} onChangeText={setHoursInput} />
              </View>
            </View>

            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.indigo, marginTop: 24 }]} onPress={saveProfile}>
              <Text style={s.primaryBtnText}>Save and Continue</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const profileCls = classifyGpa(profile.cgpa);

  // ── Inline flows ──
  if (activeFlow === 'upload') {
    return (
      <View style={[s.container, { backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 16 }]}>
        <UploadFlow colors={colors} user={user} onDone={handleFlowDone} onCancel={() => setActiveFlow('none')} />
      </View>
    );
  }

  if (activeFlow === 'history') {
    return (
      <View style={[s.container, { backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 16 }]}>
        <HistoryFlow colors={colors} user={user} onDone={handleFlowDone} onCancel={() => setActiveFlow('none')} />
      </View>
    );
  }

  // ── Main planner ──
  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <DataSourceModal visible={showSourceModal} onClose={() => setShowSourceModal(false)} onSelect={handleSourceSelect} colors={colors} />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.screenTitle, { color: colors.textPrimary }]}>Smart GPA Planner</Text>
          <Text style={[s.screenSubtitle, { color: colors.textMuted }]}>Plan your academics</Text>
        </View>
        <TouchableOpacity style={[s.editBtn, { borderColor: colors.indigo }]} onPress={editProfile}>
          <Text style={[s.editBtnText, { color: colors.indigo }]}>Edit Input</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Strip */}
      <View style={[s.strip, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {[
          { label: 'CGPA', value: profile.cgpa, sub: profileCls.label, subColor: profileCls.color },
          { label: 'Earned Hrs', value: profile.hours },
          { label: 'Term Hrs', value: calculations?.termHours ?? '—' },
          { label: 'Max CGPA', value: calculations?.maxCgpa ?? '—' },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <View style={s.stripItem}>
              <Text style={[s.stripLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[s.stripVal, { color: colors.textPrimary }]}>{item.value}</Text>
              {item.sub ? <Text style={{ color: item.subColor, fontSize: 10, fontWeight: '700' }}>{item.sub}</Text> : null}
            </View>
            {i < arr.length - 1 && <View style={[s.stripDiv, { backgroundColor: colors.divider }]} />}
          </React.Fragment>
        ))}
      </View>

      {/* Tabs */}
      <View style={[s.tabsRow]}>
        {(['calculator', 'planner'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tabBtn, { borderBottomColor: activeTab === tab ? colors.indigo : 'transparent' }]} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, { color: activeTab === tab ? colors.indigo : colors.textMuted }]}>
              {tab === 'calculator' ? 'Current Term' : 'Strategic Planner'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>

        {/* ── Calculator Tab ── */}
        {activeTab === 'calculator' && (
          <>
            {/* Data source selector */}
            <TouchableOpacity style={[s.sourceRow, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowSourceModal(true)}>
              <View style={[s.sourceIconWrap, { backgroundColor: colors.indigoPale }]}>
                <Feather name={dataSource === 'upload' ? 'upload' : dataSource === 'history' ? 'clock' : 'edit-3'} size={16} color={colors.indigo} />
              </View>
              <Text style={[s.sourceLabel, { color: colors.textPrimary }]}>
                {dataSource === 'upload' ? 'From Transcript Upload' : dataSource === 'history' ? 'From Transcript History' : 'Manual Entry'}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Results */}
            {calculations && (
              <View style={[s.resultCardsRow]}>
                <View style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.resultLabel, { color: colors.textSecondary }]}>Expected CGPA</Text>
                  <Text style={[s.resultVal, { color: classifyGpa(calculations.expectedCgpa).color }]}>{calculations.expectedCgpa}</Text>
                  <Text style={[s.resultCls, { color: classifyGpa(calculations.expectedCgpa).color }]}>{classifyGpa(calculations.expectedCgpa).label}</Text>
                </View>
                <View style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.resultLabel, { color: colors.textSecondary }]}>Term GPA</Text>
                  <Text style={[s.resultVal, { color: classifyGpa(calculations.termGpa).color }]}>{calculations.termGpa}</Text>
                  <Text style={[s.resultCls, { color: classifyGpa(calculations.termGpa).color }]}>{classifyGpa(calculations.termGpa).label}</Text>
                </View>
              </View>
            )}

            {/* Course list */}
            {courses.length > 0 ? (
              <View style={[s.courseListCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.courseListHeader, { borderBottomColor: colors.divider }]}>
                  <Text style={[s.courseListTitle, { color: colors.textPrimary }]}>Courses</Text>
                  <View style={[s.courseCountBadge, { backgroundColor: colors.indigoPale }]}>
                    <Text style={{ color: colors.indigo, fontSize: 12, fontWeight: '700' }}>{courses.length}</Text>
                  </View>
                </View>
                {courses.map(c => {
                  const gVal = grades[c.id] ?? 0;
                  const gCls = classifyGpa(gVal);
                  return (
                    <View key={c.id} style={[s.courseRow, { borderBottomColor: colors.divider }]}>
                      <View style={{ flex: 1, paddingLeft: 10 }}>
                        {dataSource === 'manual' ? (
                          <>
                            <TextInput style={[s.courseName, { color: colors.textPrimary }]} value={c.name} onChangeText={v => updateManualCourse(c.id, 'name', v)} placeholder="Course name" placeholderTextColor={colors.textMuted} />
                            <TextInput style={[s.courseMeta, { color: colors.textMuted }]} value={c.code} onChangeText={v => updateManualCourse(c.id, 'code', v)} placeholder="Code · Credits" placeholderTextColor={colors.textMuted} />
                          </>
                        ) : (
                          <>
                            <Text style={[s.courseName, { color: colors.textPrimary }]} numberOfLines={1}>{c.name || c.code}</Text>
                            <Text style={[s.courseMeta, { color: colors.textMuted }]}>{c.code} · {c.credits} Hrs</Text>
                          </>
                        )}
                      </View>
                      <View style={s.courseControls}>
                        <View style={[s.stepperWrap, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                          <TouchableOpacity style={s.stepperBtn} onPress={() => handleGradeChange(c.id, String(Math.max(0, gVal - 0.1)))}>
                            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>−</Text>
                          </TouchableOpacity>
                          <TextInput style={[s.stepperInput, { color: colors.textPrimary }]} keyboardType="numeric" value={String(gVal)} onChangeText={v => handleGradeChange(c.id, v)} />
                          <TouchableOpacity style={s.stepperBtn} onPress={() => handleGradeChange(c.id, String(Math.min(5, gVal + 0.1)))}>
                            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={[s.coursePts, { color: gCls.color }]}>{(gVal * c.credits).toFixed(1)} Pts</Text>
                      </View>
                      {dataSource === 'manual' && (
                        <TouchableOpacity onPress={() => removeManualCourse(c.id)} style={{ padding: 8 }}>
                          <Feather name="x" size={16} color={colors.red} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
                {dataSource === 'manual' && (
                  <TouchableOpacity style={[s.addCourseBtn, { borderTopColor: colors.divider }]} onPress={addManualCourse}>
                    <Feather name="plus" size={16} color={colors.indigo} />
                    <Text style={[s.addCourseBtnText, { color: colors.indigo }]}>Add Course</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[s.emptyCoursesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="book-open" size={32} color={colors.indigoLight} />
                <Text style={[s.emptyCoursesText, { color: colors.textMuted }]}>
                  {dataSource === 'manual' ? 'Tap "Add Course" to get started' : 'Select a data source above to load courses'}
                </Text>
                {dataSource === 'manual' && (
                  <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.indigo, paddingHorizontal: 24, marginTop: 8 }]} onPress={addManualCourse}>
                    <Text style={s.primaryBtnText}>Add Course</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={{ height: 110 }} />
          </>
        )}

        {/* ── Planner Tab ── */}
        {activeTab === 'planner' && (
          <>
            <View style={[s.targetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={s.targetIcon}>🎯</Text>
              <Text style={[s.targetTitle, { color: colors.textPrimary }]}>Set Your Target</Text>
              <Text style={[s.targetDesc, { color: colors.textSecondary }]}>Find out what grades you need to achieve your target CGPA.</Text>

              <View style={[s.elegantInput, { backgroundColor: colors.indigoPale, borderColor: colors.indigoLight, marginVertical: 20 }]}>
                <View style={[s.elegantIconWrap, { backgroundColor: colors.card }]}>
                  <Feather name="target" size={20} color={colors.indigo} />
                </View>
                <View style={s.elegantInputContent}>
                  <Text style={[s.elegantLabel, { color: colors.textSecondary }]}>Target CGPA</Text>
                  <TextInput style={[s.elegantField, { color: colors.textPrimary }]} keyboardType="decimal-pad" placeholder="e.g., 4.5" placeholderTextColor={colors.textMuted} value={targetCgpa} onChangeText={setTargetCgpa} />
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

            {strategy?.error && (
              <View style={[s.alertBox, { backgroundColor: colors.redLight }]}>
                <Text style={{ color: colors.red }}>{strategy.error}</Text>
              </View>
            )}

            {strategy && !strategy.error && !strategy.possible && (
              <View style={[s.alertBox, { backgroundColor: colors.redLight, padding: 20 }]}>
                <Text style={{ fontSize: 30, textAlign: 'center', marginBottom: 10 }}>⚠️</Text>
                <Text style={[s.alertTitle, { color: colors.red }]}>Target Impossible</Text>
                <Text style={[s.alertText, { color: colors.red }]}>
                  Max reachable is <Text style={{ fontWeight: '800' }}>{strategy.maxCgpa}</Text>. Try a lower target.
                </Text>
              </View>
            )}

            {strategy?.possible && strategy.plan && (
              <View style={[s.strategyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.stratHead]}>
                  <Text style={{ fontSize: 24, paddingRight: 10 }}>✅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.stratTitle, { color: colors.textPrimary }]}>Target Achievable</Text>
                    <Text style={[s.stratSub, { color: colors.textSecondary }]}>
                      Need term GPA of <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{strategy.requiredTermGpa}</Text>
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
                        <Text style={[s.courseName, { color: colors.textPrimary }]} numberOfLines={1}>{c.name || c.code}</Text>
                        <Text style={[s.courseMeta, { color: colors.textMuted }]}>{c.code} · {c.credits} Hrs</Text>
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
            <View style={{ height: 110 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  onboardCenter: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 110 },
  onboardIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(63,81,181,0.1)', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },
  onboardTitle: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  onboardSub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 30, paddingHorizontal: 10 },
  inputCard: { borderWidth: 1, borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  elegantInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 8, paddingRight: 16 },
  elegantIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  elegantInputContent: { flex: 1, marginLeft: 12, marginRight: 12 },
  elegantLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  elegantField: { fontSize: 17, fontWeight: '800', padding: 0 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  primaryBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  errorBox: { padding: 14, borderRadius: 12, marginBottom: 20 },
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
  tabText: { fontSize: 13, fontWeight: '700' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 16 },
  sourceIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sourceLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  resultCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  resultCard: { flex: 1, borderWidth: 1, borderRadius: 20, padding: 16, alignItems: 'center' },
  resultLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  resultVal: { fontSize: 32, fontWeight: '900', marginBottom: 4 },
  resultCls: { fontSize: 12, fontWeight: '700' },
  courseListCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  courseListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  courseListTitle: { fontSize: 16, fontWeight: '800' },
  courseCountBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  courseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  courseName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  courseMeta: { fontSize: 12 },
  courseControls: { alignItems: 'center', width: 110 },
  stepperWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 6 },
  stepperBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  stepperInput: { width: 40, textAlign: 'center', fontSize: 14, fontWeight: '700', paddingVertical: 4 },
  coursePts: { fontSize: 11, fontWeight: '700' },
  addCourseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderTopWidth: 1 },
  addCourseBtnText: { fontSize: 14, fontWeight: '700' },
  emptyCoursesCard: { borderWidth: 1, borderRadius: 20, padding: 40, alignItems: 'center', gap: 12, marginBottom: 16 },
  emptyCoursesText: { fontSize: 14, textAlign: 'center' },
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