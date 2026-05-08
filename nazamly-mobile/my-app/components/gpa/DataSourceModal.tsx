import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { DataSource } from './types';

interface DataSourceModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (src: DataSource) => void;
  colors: any;
}

const options: { src: DataSource; icon: string; title: string; desc: string }[] = [
  { src: 'history', icon: 'clock', title: 'From History', desc: 'Use a previously uploaded transcript' },
];

export default function DataSourceModal({ visible, onClose, onSelect, colors }: DataSourceModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <View style={[styles.handle, { backgroundColor: colors.divider }]} />
        <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>How do you want to add courses?</Text>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.src}
            style={[styles.option, { borderColor: colors.border }]}
            onPress={() => { onClose(); onSelect(opt.src); }}
          >
            <View style={[styles.optIcon, { backgroundColor: colors.indigoPale }]}>
              <Feather name={opt.icon as any} size={20} color={colors.indigo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optTitle, { color: colors.textPrimary }]}>{opt.title}</Text>
              <Text style={[styles.optDesc, { color: colors.textMuted }]}>{opt.desc}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 16 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  optIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  optDesc: { fontSize: 13 },
});
