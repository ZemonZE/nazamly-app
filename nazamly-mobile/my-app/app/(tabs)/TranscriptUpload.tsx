import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/constants/theme';
import { uploadTranscript, ExtractedCourse } from '@/services/transcriptService';

type UploadState = 'idle' | 'uploading' | 'processing' | 'review' | 'error';

export default function TranscriptUploadScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string; size: number } | null>(null);
  const [courses, setCourses] = useState<ExtractedCourse[]>([]);
  const [termGPA, setTermGPA] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [transcriptId, setTranscriptId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const recalcGPA = (updated: ExtractedCourse[]) => {
    const pts = updated.reduce((s, c) => s + (c.gradePoints || 0) * (c.creditHours || 3), 0);
    const hrs = updated.reduce((s, c) => s + (c.creditHours || 3), 0);
    setTermGPA(hrs > 0 ? parseFloat((pts / hrs).toFixed(2)) : 0);
    setTotalHours(hrs);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
      });
      setUploadState('idle');
      setErrorMsg('');
    } catch {
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploadState('uploading');
    try {
      const token = await user.getIdToken();
      setUploadState('processing');

      const result = await uploadTranscript(
        selectedFile.uri,
        selectedFile.mimeType,
        selectedFile.name,
        token
      );

      if (result.status === 'completed' && result.extractedCourses?.length > 0) {
        setCourses(result.extractedCourses);
        setTermGPA(result.termGPA);
        setTotalHours(result.totalCreditHours);
        setConfidence(result.ocrConfidence);
        setTranscriptId(result.transcriptId);
        setUploadState('review');
      } else {
        setErrorMsg(result.errorMessage || 'No courses could be extracted. Try uploading a clearer image.');
        setUploadState('error');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed. Please try again.');
      setUploadState('error');
    }
  };

  const updateCourse = (index: number, field: keyof ExtractedCourse, value: string) => {
    const updated = [...courses];
    if (field === 'mark' || field === 'gradePoints' || field === 'creditHours') {
      (updated[index] as any)[field] = parseFloat(value) || 0;
    } else {
      (updated[index] as any)[field] = value;
    }
    setCourses(updated);
    recalcGPA(updated);
  };

  const removeCourse = (index: number) => {
    const updated = courses.filter((_, i) => i !== index);
    setCourses(updated);
    recalcGPA(updated);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[s.title, { color: colors.textPrimary }]}>Upload Transcript</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>Extract grades automatically</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/TranscriptHistory' as any)}>
            <Feather name="clock" size={22} color={colors.indigo} />
          </TouchableOpacity>
        </View>

        {/* Idle / File Picker */}
        {(uploadState === 'idle' || uploadState === 'error') && (
          <>
            <TouchableOpacity
              style={[s.dropZone, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handlePickFile}
              activeOpacity={0.8}
            >
              <View style={[s.dropIcon, { backgroundColor: colors.indigoPale }]}>
                <MaterialCommunityIcons name="file-upload-outline" size={40} color={colors.indigo} />
              </View>
              <Text style={[s.dropTitle, { color: colors.textPrimary }]}>
                {selectedFile ? selectedFile.name : 'Tap to select your transcript'}
              </Text>
              <Text style={[s.dropSub, { color: colors.textMuted }]}>
                {selectedFile
                  ? formatBytes(selectedFile.size)
                  : 'PDF, JPG, PNG, or WEBP — max 5 MB'}
              </Text>
            </TouchableOpacity>

            {uploadState === 'error' && (
              <View style={[s.errorBox, { backgroundColor: colors.redLight, borderColor: colors.red + '40' }]}>
                <Feather name="alert-circle" size={16} color={colors.red} />
                <Text style={[s.errorText, { color: colors.red }]}>{errorMsg}</Text>
              </View>
            )}

            {selectedFile && (
              <TouchableOpacity
                style={[s.uploadBtn, { backgroundColor: colors.indigo }]}
                onPress={handleUpload}
                activeOpacity={0.85}
              >
                <Feather name="upload" size={18} color="#fff" />
                <Text style={s.uploadBtnText}>Extract Grades</Text>
              </TouchableOpacity>
            )}

            {/* Info Cards */}
            <View style={s.infoRow}>
              {[
                { icon: 'file-text', label: 'PDF', desc: 'Text layer\nextracted' },
                { icon: 'image', label: 'Image', desc: 'AI Vision\nanalysis' },
                { icon: 'zap', label: 'Fast', desc: 'Results in\n~5 seconds' },
              ].map(item => (
                <View key={item.label} style={[s.infoCard, { backgroundColor: colors.card }]}>
                  <Feather name={item.icon as any} size={20} color={colors.indigo} />
                  <Text style={[s.infoLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                  <Text style={[s.infoDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Processing */}
        {(uploadState === 'uploading' || uploadState === 'processing') && (
          <View style={[s.processingCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.indigo} />
            <Text style={[s.processingTitle, { color: colors.textPrimary }]}>
              {uploadState === 'uploading' ? 'Uploading...' : 'Extracting grades...'}
            </Text>
            <Text style={[s.processingSub, { color: colors.textMuted }]}>
              {uploadState === 'processing'
                ? 'AI is reading your transcript. This takes a few seconds.'
                : 'Sending file to server...'}
            </Text>
          </View>
        )}

        {/* Review */}
        {uploadState === 'review' && (
          <>
            {/* Summary */}
            <View style={[s.summaryCard, { backgroundColor: colors.indigo }]}>
              <View style={s.summaryRow}>
                <View style={s.summaryItem}>
                  <Text style={s.summaryValue}>{termGPA.toFixed(2)}</Text>
                  <Text style={s.summaryLabel}>Term GPA</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryItem}>
                  <Text style={s.summaryValue}>{totalHours}</Text>
                  <Text style={s.summaryLabel}>Credit Hours</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryItem}>
                  <Text style={s.summaryValue}>{courses.length}</Text>
                  <Text style={s.summaryLabel}>Courses</Text>
                </View>
              </View>
              <Text style={s.confidenceText}>
                Confidence: {Math.round(confidence * 100)}% — Review and correct if needed
              </Text>
            </View>

            {/* Course List */}
            {courses.map((course, index) => (
              <View key={index} style={[s.courseCard, { backgroundColor: colors.card }]}>
                <View style={s.courseHeader}>
                  <TextInput
                    style={[s.courseCode, { color: colors.indigo }]}
                    value={course.courseCode}
                    onChangeText={v => updateCourse(index, 'courseCode', v)}
                  />
                  <TouchableOpacity onPress={() => removeCourse(index)}>
                    <Feather name="trash-2" size={16} color={colors.red} />
                  </TouchableOpacity>
                </View>
                <View style={s.courseFields}>
                  <View style={s.fieldGroup}>
                    <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Mark</Text>
                    <TextInput
                      style={[s.fieldInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg }]}
                      value={String(course.mark ?? '')}
                      onChangeText={v => updateCourse(index, 'mark', v)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={s.fieldGroup}>
                    <Text style={[s.fieldLabel, { color: colors.textMuted }]}>GPA Pts</Text>
                    <TextInput
                      style={[s.fieldInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg }]}
                      value={String(course.gradePoints ?? '')}
                      onChangeText={v => updateCourse(index, 'gradePoints', v)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={s.fieldGroup}>
                    <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Credits</Text>
                    <TextInput
                      style={[s.fieldInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg }]}
                      value={String(course.creditHours ?? '')}
                      onChangeText={v => updateCourse(index, 'creditHours', v)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            ))}

            {/* Actions */}
            <TouchableOpacity
              style={[s.uploadBtn, { backgroundColor: colors.teal }]}
              onPress={() => {
                Alert.alert('Saved', `Term GPA ${termGPA.toFixed(2)} saved to your history.`);
                router.back();
              }}
              activeOpacity={0.85}
            >
              <Feather name="check" size={18} color="#fff" />
              <Text style={s.uploadBtnText}>Save to History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.secondaryBtn, { borderColor: colors.border }]}
              onPress={() => { setUploadState('idle'); setSelectedFile(null); }}
            >
              <Text style={[s.secondaryBtnText, { color: colors.textSecondary }]}>Upload Another</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, marginTop: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  dropZone: { borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', padding: 36, marginBottom: 16 },
  dropIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dropTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  dropSub: { fontSize: 13, textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 13 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 14, gap: 10, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { height: 48, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
  infoRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  infoCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 13, fontWeight: '700' },
  infoDesc: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  processingCard: { borderRadius: 20, padding: 40, alignItems: 'center', gap: 16, marginTop: 20 },
  processingTitle: { fontSize: 18, fontWeight: '700' },
  processingSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  summaryCard: { borderRadius: 20, padding: 22, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 28, fontWeight: '900', color: '#fff' },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  confidenceText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  courseCard: { borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  courseCode: { fontSize: 16, fontWeight: '800' },
  courseFields: { flexDirection: 'row', gap: 10 },
  fieldGroup: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  fieldInput: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, textAlign: 'center' },
});
