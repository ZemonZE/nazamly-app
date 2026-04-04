import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  TextInput, Dimensions, Linking,
} from 'react-native';
import { Feather, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { useAppTheme } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface FolderCardProps {
  name: string;
  fileCount: number;
  colorAccent: string;
  iconName: string;
  colors: any;
}

interface RecentFileProps {
  name: string;
  ext: 'pdf' | 'docx' | 'pptx' | 'xlsx';
  openedAt: string;
  colors: any;
  isLast?: boolean;
}

const EXT_META: Record<string, { color: string; icon: string }> = {
  pdf:  { color: '#EF4444', icon: 'pdffile1' },
  docx: { color: '#3B82F6', icon: 'wordfile' },
  pptx: { color: '#F97316', icon: 'pptfile' },
  xlsx: { color: '#22C55E', icon: 'exclfile' },
};

export default function MaterialsLibrary() {
  const { colors } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const FOLDERS = [
    { name: 'Biology',         fileCount: 12, colorAccent: colors.teal,   iconName: 'leaf' },
    { name: 'Calculus',   fileCount: 8,  colorAccent: colors.indigo, iconName: 'calculator' },
    { name: 'CS Concepts',    fileCount: 15, colorAccent: colors.amber,  iconName: 'laptop' },
    { name: 'History',         fileCount: 6,  colorAccent: colors.green,  iconName: 'book-open-variant' },
  ];

  const RECENT_FILES = [
    { name: 'Spring 2024 Plan',         ext: 'pdf'  as const, openedAt: '2 hours ago' },
    { name: 'Midterm Notes',        ext: 'docx' as const, openedAt: '5 hours ago' },
    { name: 'Lab #3 Report',        ext: 'pdf'  as const, openedAt: 'Yesterday' },
    { name: 'DS Slides', ext: 'pptx' as const, openedAt: 'Monday' },
  ];

  const filteredFolders = FOLDERS.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFiles = RECENT_FILES.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={[s.header, { flexDirection: 'row' }]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Library</Text>
            <Text style={[s.headerSub, { color: colors.textMuted }]}>Access your study materials</Text>
          </View>
          <View style={[s.headerBadge, { backgroundColor: colors.indigoPale }]}>
            <Feather name="archive" size={18} color={colors.indigo} />
          </View>
        </View>

        {/* Search */}
        <View style={[s.searchWrap, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row' }]}>
          <Feather name="search" size={16} color={colors.textMuted} style={s.searchIconLtr} />
          <TextInput
            style={[s.searchInput, { color: colors.textPrimary }]}
            placeholder="Search files..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={s.searchClear}>
              <Feather name="x" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Upload */}
        <TouchableOpacity style={[s.uploadBtn, { backgroundColor: colors.indigo, flexDirection: 'row' }]} activeOpacity={0.85}>
          <Feather name="upload-cloud" size={20} color="#fff" />
          <Text style={s.uploadBtnText}>Upload File</Text>
        </TouchableOpacity>

        {/* Folders */}
        <View style={[s.sectionHeader, { flexDirection: 'row' }]}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Cloud Folders</Text>
          <TouchableOpacity style={[s.driveLink, { flexDirection: 'row' }]} onPress={() => Linking.openURL('https://drive.google.com')}>
            <AntDesign name="google-plus" size={14} color={colors.indigo} />
            <Text style={[s.driveLinkText, { color: colors.indigo }]}>Connect Drive</Text>
          </TouchableOpacity>
        </View>

        <View style={[s.foldersGrid, { flexDirection: 'row' }]}>
          {filteredFolders.map(folder => (
            <FolderCard key={folder.name} {...folder} colors={colors} />
          ))}
        </View>

        {/* Recent Files */}
        <View style={[s.sectionHeader, { flexDirection: 'row' }]}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Recently Viewed</Text>
          <Text style={[s.seeAll, { color: colors.indigo, textAlign: 'right' }]}>See All</Text>
        </View>

        <View style={[s.recentList, { backgroundColor: colors.card }]}>
          {filteredFiles.map((file, i) => (
            <RecentFile key={i} {...file} colors={colors} isLast={i === filteredFiles.length - 1} />
          ))}
        </View>

        {filteredFolders.length === 0 && filteredFiles.length === 0 && (
          <View style={s.emptyState}>
            <Feather name="search" size={40} color={colors.indigoLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No results found for &quot;{searchQuery}&quot;</Text>
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const FolderCard = ({ name, fileCount, colorAccent, iconName, colors }: FolderCardProps) => (
  <TouchableOpacity style={[s.folderCard, { backgroundColor: colors.card, borderTopColor: colorAccent, alignItems: 'flex-start' }]} activeOpacity={0.8}>
    <View style={[s.folderIconWrap, { backgroundColor: colorAccent + '18' }]}>
      <MaterialCommunityIcons name={iconName as any} size={26} color={colorAccent} />
    </View>
    <Text style={[s.folderName, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
    <Text style={[s.folderCount, { color: colors.textMuted }]}>{fileCount} files</Text>
    <View style={[s.folderArrow, { right: 14 }]}><Feather name="chevron-right" size={14} color={colors.textMuted} /></View>
  </TouchableOpacity>
);

const RecentFile = ({ name, ext, openedAt, colors, isLast }: RecentFileProps) => {
  const meta = EXT_META[ext] || EXT_META.pdf;
  return (
    <View style={[s.recentRow, { flexDirection: 'row' }, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <View style={[s.fileIconWrap, { backgroundColor: meta.color + '12' }]}>
        <AntDesign name={meta.icon as any} size={22} color={meta.color} />
      </View>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <Text style={[s.fileName, { color: colors.textPrimary }]} numberOfLines={1}>{name}.{ext}</Text>
        <Text style={[s.fileTime, { color: colors.textMuted }]}>Opened {openedAt}</Text>
      </View>
      <TouchableOpacity style={s.moreBtn}><Feather name="more-horizontal" size={18} color={colors.textMuted} /></TouchableOpacity>
    </View>
  );
};

const FOLDER_W = (SCREEN_W - 52) / 2;

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 110 },
  header: { justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  headerTitle: { fontSize: 28, fontWeight: '900' },
  headerSub: { fontSize: 13, marginTop: 2 },
  headerBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { alignItems: 'center', borderRadius: 16, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1 },
  searchIcon: { marginLeft: 10 },
  searchIconLtr: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 13 },
  searchClear: { padding: 5 },
  uploadBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 10, marginBottom: 26, shadowColor: '#3F51B5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  uploadBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  sectionHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  driveLink: { alignItems: 'center', gap: 5 },
  driveLinkText: { fontSize: 12, fontWeight: '600' },
  foldersGrid: { flexWrap: 'wrap', gap: 12, marginBottom: 26 },
  folderCard: { width: FOLDER_W, borderRadius: 16, padding: 16, borderTopWidth: 3, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  folderIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  folderName: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  folderCount: { fontSize: 12 },
  folderArrow: { position: 'absolute', top: 14 },
  recentList: { borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  recentRow: { alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 14 },
  fileIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  fileTime: { fontSize: 11 },
  moreBtn: { padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, marginTop: 14, fontWeight: '500', textAlign: 'center' },
});