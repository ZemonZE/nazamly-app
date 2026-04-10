import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/constants/theme';
import { getTranscriptHistory, deleteTranscript, TranscriptHistoryItem } from '@/services/transcriptService';

export default function TranscriptHistoryScreen() {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState<TranscriptHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const data = await getTranscriptHistory(token);
      setHistory(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = (item: TranscriptHistoryItem) => {
    Alert.alert(
      'Delete Transcript',
      `Delete "${item.fileName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
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
      ]
    );
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return colors.teal;
    if (status === 'failed') return colors.red;
    return colors.amber;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            <Text style={[s.title, { color: colors.textPrimary }]}>Transcript History</Text>
            <Text style={[s.subtitle, { color: colors.textMuted }]}>{history.length} uploads</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/TranscriptUpload' as any)}>
            <Feather name="plus" size={22} color={colors.indigo} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={colors.indigo} />
            <Text style={[s.loadingText, { color: colors.textMuted }]}>Loading history...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: colors.card }]}>
            <Feather name="file-text" size={40} color={colors.indigoLight} />
            <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No transcripts yet</Text>
            <Text style={[s.emptySub, { color: colors.textMuted }]}>Upload your first transcript to get started</Text>
            <TouchableOpacity
              style={[s.uploadBtn, { backgroundColor: colors.indigo }]}
              onPress={() => router.push('/(tabs)/TranscriptUpload' as any)}
            >
              <Feather name="upload" size={16} color="#fff" />
              <Text style={s.uploadBtnText}>Upload Transcript</Text>
            </TouchableOpacity>
          </View>
        ) : (
          history.map(item => (
            <View key={item.id} style={[s.card, { backgroundColor: colors.card }]}>
              <View style={s.cardLeft}>
                <View style={[s.fileIcon, { backgroundColor: colors.indigoPale }]}>
                  <Feather name="file-text" size={20} color={colors.indigo} />
                </View>
                <View style={s.cardInfo}>
                  <Text style={[s.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.fileName}
                  </Text>
                  <Text style={[s.fileDate, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
                  <View style={s.metaRow}>
                    <View style={[s.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
                      <Text style={[s.statusText, { color: statusColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                    {item.status === 'completed' && (
                      <Text style={[s.gpaText, { color: colors.textSecondary }]}>
                        GPA {item.termGPA?.toFixed(2)} · {item.totalCreditHours} hrs
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                disabled={deletingId === item.id}
                style={s.deleteBtn}
              >
                {deletingId === item.id
                  ? <ActivityIndicator size="small" color={colors.red} />
                  : <Feather name="trash-2" size={18} color={colors.red} />
                }
              </TouchableOpacity>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 8 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  centered: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 14 },
  emptyCard: { borderRadius: 20, padding: 40, alignItems: 'center', gap: 12, marginTop: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  fileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  fileDate: { fontSize: 12, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  gpaText: { fontSize: 12 },
  deleteBtn: { padding: 8 },
});
