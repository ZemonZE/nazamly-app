import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { API_URL } from '@/firebase';

type ExtractedCourse = { courseCode: string; courseName?: string; mark?: number; gradePoints?: number; creditHours?: number };

const uploadTranscript = async (uri: string, mimeType: string, name: string, token: string) => {
  const formData = new FormData();
  formData.append('transcript', { uri, type: mimeType, name } as any);
  const res = await fetch(`${API_URL}/api/gpa/upload-transcript`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const json = await res.json();
  if (!res.ok && !json.data) throw new Error(json.message || 'Upload failed');
  return json.data || json;
};

const updateTranscript = async (id: string, courses: ExtractedCourse[], token: string) => {
  const res = await fetch(`${API_URL}/api/gpa/transcripts/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ extractedCourses: courses }),
  });
  return res.json();
};

import { Course, extractedToCourses } from './types';

interface UploadFlowProps {
  colors: any;
  user: any;
  onDone: (courses: Course[], grades: Record<string, number>) => void;
  onCancel: () => void;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'review' | 'error';

export default function UploadFlow({ colors, user, onDone, onCancel }: UploadFlowProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType: string; size: number; file?: any } | null>(null);
  const [courses, setCourses] = useState<ExtractedCourse[]>([]);
  const [termGPA, setTermGPA] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [transcriptId, setTranscriptId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const recalc = (updated: ExtractedCourse[]) => {
    const pts = updated.reduce((s, c) => s + (c.gradePoints || 0) * (c.creditHours || 3), 0);
    const hrs = updated.reduce((s, c) => s + (c.creditHours || 3), 0);
    setTermGPA(hrs > 0 ? parseFloat((pts / hrs).toFixed(2)) : 0);
    setTotalHours(hrs);
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || 'application/octet-stream', size: asset.size || 0, file: asset.file });
      setUploadState('idle');
      setErrorMsg('');
    } catch {
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const doUpload = async () => {
    if (!selectedFile || !user) return;
    setUploadState('uploading');
    try {
      const token = await user.getIdToken();
      setUploadState('processing');
      const result = await uploadTranscript(selectedFile.uri, selectedFile.mimeType, selectedFile.name, token, selectedFile.file);
      if (result.status === 'completed' && result.extractedCourses?.length > 0) {
        setTranscriptId(result.transcriptId);
        setCourses(result.extractedCourses);
        setTermGPA(result.termGPA);
        setTotalHours(result.totalCreditHours);
        setConfidence(result.ocrConfidence);
        setUploadState('review');
      } else {
        setErrorMsg(result.errorMessage || 'No courses extracted. Try a clearer image.');
        setUploadState('error');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed.');
      setUploadState('error');
    }
  };

  const updateCourse = (i: number, field: keyof ExtractedCourse, val: string) => {
    const updated = [...courses];
    if (field === 'mark' || field === 'gradePoints' || field === 'creditHours')
      (updated[i] as any)[field] = parseFloat(val) || 0;
    else (updated[i] as any)[field] = val;
    setCourses(updated);
    recalc(updated);
  };

  const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={s.topRow}>
        <TouchableOpacity onPress={onCancel} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>Upload Transcript</Text>
        <View style={{ width: 28 }} />
      </View>

      {(uploadState === 'idle' || uploadState === 'error') && (
        <>
          <TouchableOpacity style={[s.dropZone, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickFile} activeOpacity={0.8}>
            <View style={[s.dropIcon, { backgroundColor: colors.indigoPale }]}>
              <MaterialCommunityIcons name="file-upload-outline" size={38} color={colors.indigo} />
            </View>
            <Text style={[s.dropTitle, { color: colors.textPrimary }]}>
              {selectedFile ? selectedFile.name : 'Tap to select your transcript'}
            </Text>
            <Text style={[s.dropSub, { color: colors.textMuted }]}>
              {selectedFile ? formatBytes(selectedFile.size) : 'PDF, JPG, PNG, or WEBP'}
            </Text>
          </TouchableOpacity>

          {uploadState === 'error' && (
            <View style={[s.errorBox, { backgroundColor: colors.redLight, borderColor: colors.red + '40' }]}>
              <Feather name="alert-circle" size={16} color={colors.red} />
              <Text style={[s.errorText, { color: colors.red }]}>{errorMsg}</Text>
            </View>
          )}

          {selectedFile && (
            <TouchableOpacity style={[s.btn, { backgroundColor: colors.indigo }]} onPress={doUpload}>
              <Feather name="upload" size={18} color="#fff" />
              <Text style={s.btnText}>Extract Grades</Text>
            </TouchableOpacity>
          )}

          <View style={s.infoRow}>
            {[{ icon: 'file-text', label: 'PDF' }, { icon: 'image', label: 'Image' }].map(item => (
              <View key={item.label} style={[s.infoCard, { backgroundColor: colors.card }]}>
                <Feather name={item.icon as any} size={20} color={colors.indigo} />
                <Text style={[s.infoLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {(uploadState === 'uploading' || uploadState === 'processing') && (
        <View style={[s.processingCard, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="large" color={colors.indigo} />
          <Text style={[s.processingTitle, { color: colors.textPrimary }]}>
            {uploadState === 'uploading' ? 'Uploading...' : 'Extracting grades...'}
          </Text>
          <Text style={[s.processingSub, { color: colors.textMuted }]}>
            {uploadState === 'processing' ? 'AI is reading your transcript.' : 'Sending file to server...'}
          </Text>
        </View>
      )}

      {uploadState === 'review' && (
        <>
          <View style={[s.summaryCard, { backgroundColor: colors.indigo }]}>
            <View style={s.summaryRow}>
              <View style={s.summaryItem}><Text style={s.summaryVal}>{termGPA.toFixed(2)}</Text><Text style={s.summaryLbl}>Term GPA</Text></View>
              <View style={s.summaryDiv} />
              <View style={s.summaryItem}><Text style={s.summaryVal}>{totalHours}</Text><Text style={s.summaryLbl}>Credit Hrs</Text></View>
              <View style={s.summaryDiv} />
              <View style={s.summaryItem}><Text style={s.summaryVal}>{courses.length}</Text><Text style={s.summaryLbl}>Courses</Text></View>
            </View>
            <Text style={s.confidenceText}>Confidence: {Math.round(confidence * 100)}% — Review and correct if needed</Text>
          </View>

          {courses.map((course, i) => (
            <View key={i} style={[s.courseCard, { backgroundColor: colors.card }]}>
              <View style={s.courseHeader}>
                <TextInput style={[s.courseCode, { color: colors.indigo }]} value={course.courseCode} onChangeText={v => updateCourse(i, 'courseCode', v)} />
                <TouchableOpacity onPress={() => { const upd = courses.filter((_, j) => j !== i); setCourses(upd); recalc(upd); }}>
                  <Feather name="trash-2" size={16} color={colors.red} />
                </TouchableOpacity>
              </View>
              <View style={s.courseFields}>
                {(['mark', 'gradePoints', 'creditHours'] as (keyof ExtractedCourse)[]).map(field => (
                  <View key={field} style={s.fieldGroup}>
                    <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{field === 'gradePoints' ? 'GPA Pts' : field === 'creditHours' ? 'Credits' : 'Mark'}</Text>
                    <TextInput
                      style={[s.fieldInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg }]}
                      value={String((course as any)[field] ?? '')}
                      onChangeText={v => updateCourse(i, field, v)}
                      keyboardType="numeric"
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity style={[s.btn, { backgroundColor: colors.teal }]} onPress={async () => {
            try {
              if (user && transcriptId) {
                const token = await user.getIdToken();
                await updateTranscript(transcriptId, courses, token);
              }
            } catch (err: any) {
              console.error('Failed to save corrections to history:', err);
            }
            const { courses: c, grades: g } = extractedToCourses(courses);
            onDone(c, g);
          }}>
            <Feather name="check" size={18} color="#fff" />
            <Text style={s.btnText}>Use These Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.secondaryBtn, { borderColor: colors.border }]} onPress={() => { setUploadState('idle'); setSelectedFile(null); }}>
            <Text style={[s.secondaryBtnText, { color: colors.textSecondary }]}>Upload Another</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '800' },
  dropZone: { borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', padding: 36, marginBottom: 16 },
  dropIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dropTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  dropSub: { fontSize: 13, textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 14, gap: 10, marginBottom: 12 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { height: 48, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
  infoRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  infoCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 13, fontWeight: '700' },
  processingCard: { borderRadius: 20, padding: 40, alignItems: 'center', gap: 16, marginTop: 20 },
  processingTitle: { fontSize: 18, fontWeight: '700' },
  processingSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  summaryCard: { borderRadius: 20, padding: 22, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: 28, fontWeight: '900', color: '#fff' },
  summaryLbl: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  summaryDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  confidenceText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  courseCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  courseCode: { fontSize: 16, fontWeight: '800' },
  courseFields: { flexDirection: 'row', gap: 10 },
  fieldGroup: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  fieldInput: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, textAlign: 'center' },
});
