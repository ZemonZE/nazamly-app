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
          <View style={s.emptyWrap}>
            {/* Decorative blurred circles */}
            <View style={[s.blob1, { backgroundColor: colors.indigo + '18' }]} />
            <View style={[s.blob2, { backgroundColor: colors.teal + '12' }]} />

            {/* Icon container */}
            <View style={[s.emptyIconRing, { borderColor: colors.indigoLight + '40', backgroundColor: colors.indigoPale }]}>
              <View style={[s.emptyIconInner, { backgroundColor: colors.indigo + '20' }]}>
                <Feather name="file-text" size={36} color={colors.indigo} />
              </View>
            </View>

            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No transcripts yet</Text>
            <Text style={[s.emptySub, { color: colors.textMuted }]}>
              Upload your academic transcript and let AI extract your grades automatically
            </Text>

            {/* Feature pills */}
            <View style={s.pillRow}>
              {[
                { icon: 'cpu', label: 'AI Powered' },
                { icon: 'zap', label: 'Instant' },
                { icon: 'shield', label: 'Secure' },
              ].map(p => (
                <View key={p.label} style={[s.pill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name={p.icon as any} size={12} color={colors.indigo} />
                  <Text style={[s.pillText, { color: colors.textSecondary }]}>{p.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[s.uploadBtn, { backgroundColor: colors.indigo }]}
              onPress={() => router.push('/(tabs)/TranscriptUpload' as any)}
              activeOpacity={0.85}
            >
              <Feather name="upload" size={16} color="#fff" />
              <Text style={s.uploadBtnText}>Upload Your First Transcript</Text>
            </TouchableOpacity>

            <Text style={[s.emptyHint, { color: colors.textMuted }]}>
              Supports PDF, JPG, PNG and WEBP
            </Text>
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
  emptyWrap: { alignItems: 'center', paddingTop: 32, paddingBottom: 20, paddingHorizontal: 8, overflow: 'hidden' },
  blob1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -20, left: -60 },
  blob2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, top: 60, right: -40 },
  emptyIconRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyIconInner: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16, marginBottom: 24 },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: '600' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  emptyHint: { fontSize: 12, marginTop: 14 },
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
