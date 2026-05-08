import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { API_URL } from '@/firebase';

type TranscriptHistoryItem = { id: string; _id?: string; fileName: string; status: string; createdAt: string; termGPA?: number; totalCreditHours?: number };

const getTranscriptHistory = async (token: string): Promise<TranscriptHistoryItem[]> => {
  const res = await fetch(`${API_URL}/api/gpa/transcripts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch history');
  const json = await res.json();
  return (json.data || []).map((item: any) => ({ ...item, id: item._id || item.id }));
};

const deleteTranscript = async (id: string, token: string) => {
  const res = await fetch(`${API_URL}/api/gpa/transcripts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete transcript');
  return res.json();
};

const getTranscriptById = async (id: string, token: string) => {
  const res = await fetch(`${API_URL}/api/gpa/transcripts/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load transcript');
  const json = await res.json();
  return json.data || json;
};

import { Course, extractedToCourses } from './types';

interface HistoryFlowProps {
  colors: any;
  user: any;
  onDone: (courses: Course[], grades: Record<string, number>) => void;
  onCancel: () => void;
}

export default function HistoryFlow({ colors, user, onDone, onCancel }: HistoryFlowProps) {
  const [history, setHistory] = useState<TranscriptHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        setHistory(await getTranscriptHistory(token));
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleDelete = (item: TranscriptHistoryItem) => {
    Alert.alert('Delete Transcript', `Delete "${item.fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(item.id);
            const token = await user!.getIdToken();
            await deleteTranscript(item.id, token);
            setHistory(prev => prev.filter(h => h.id !== item.id));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Delete failed');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const handleSelect = async (item: TranscriptHistoryItem) => {
    if (item.status !== 'completed') return;
    try {
      setLoadingId(item.id);
      const token = await user!.getIdToken();
      const full = await getTranscriptById(item.id, token);
      const { courses: c, grades: g } = extractedToCourses(full.extractedCourses || []);
      onDone(c, g);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load transcript');
    } finally {
      setLoadingId(null);
    }
  };

  const statusColor = (st: string) => st === 'completed' ? colors.teal : st === 'failed' ? colors.red : colors.amber;
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={s.topRow}>
        <TouchableOpacity onPress={onCancel} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[s.title, { color: colors.textPrimary }]}>Transcript History</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>Tap a completed transcript to use it</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.indigo} />
          <Text style={[s.loadingText, { color: colors.textMuted }]}>Loading...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={[s.emptyCard, { backgroundColor: colors.card }]}>
          <View style={[s.emptyIconWrap, { backgroundColor: colors.indigoPale }]}>
            <Feather name="file-text" size={36} color={colors.indigo} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No transcripts yet</Text>
          <Text style={[s.emptySub, { color: colors.textMuted }]}>
            Upload a transcript from the{'\n'} Upload Transcript option to get started
          </Text>
          <TouchableOpacity style={[s.emptyBtn, { backgroundColor: colors.indigo }]} onPress={onCancel}>
            <Feather name="arrow-left" size={15} color="#fff" />
            <Text style={s.emptyBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        history.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[s.card, { backgroundColor: colors.card, opacity: item.status !== 'completed' ? 0.5 : 1 }]}
            onPress={() => handleSelect(item)}
            disabled={item.status !== 'completed' || loadingId === item.id}
          >
            <View style={s.cardLeft}>
              <View style={[s.fileIcon, { backgroundColor: colors.indigoPale }]}>
                <Feather name="file-text" size={20} color={colors.indigo} />
              </View>
              <View style={s.cardInfo}>
                <Text style={[s.fileName, { color: colors.textPrimary }]} numberOfLines={1}>{item.fileName}</Text>
                <Text style={[s.fileDate, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
                <View style={s.metaRow}>
                  <View style={[s.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
                    <Text style={[s.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
                  </View>
                  {item.status === 'completed' && (
                    <Text style={[s.gpaText, { color: colors.textSecondary }]}>
                      GPA {item.termGPA?.toFixed(2)} · {item.totalCreditHours} hrs
                    </Text>
                  )}
                </View>
              </View>
            </View>
            <View style={s.cardRight}>
              {item.status === 'completed' && (
                <View style={[s.useBadge, { backgroundColor: colors.indigoPale }]}>
                  {loadingId === item.id
                    ? <ActivityIndicator size="small" color={colors.indigo} />
                    : <Text style={[s.useText, { color: colors.indigo }]}>Use</Text>
                  }
                </View>
              )}
              <TouchableOpacity onPress={() => handleDelete(item)} disabled={deletingId === item.id} style={s.deleteBtn}>
                {deletingId === item.id
                  ? <ActivityIndicator size="small" color={colors.red} />
                  : <Feather name="trash-2" size={16} color={colors.red} />}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  centered: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 14 },
  emptyCard: { borderRadius: 20, padding: 40, alignItems: 'center', gap: 16, marginTop: 20 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  fileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  fileDate: { fontSize: 12, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  gpaText: { fontSize: 12 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  useBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  useText: { fontSize: 12, fontWeight: '700' },
  deleteBtn: { padding: 8 },
});
