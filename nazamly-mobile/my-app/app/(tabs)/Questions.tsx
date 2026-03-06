import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ListRenderItem } from 'react-native';
import { Feather, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';

// 1. تعريف هيكل البيانات المطابق تماماً للبيانات الموجودة في المصفوفة
interface CourseData {
  id: string;
  title: string;
  code: string;
  doctor: string;
  chapters: number;
  questions: number;
  color: string;
}

// 2. إزالة { item } من هنا، لأن هذه هي الشاشة الرئيسية وليست مكون الكارت
const QuestionsScreen = () => {
  // بياناتك كما هي
  const courses: CourseData[] = [
    { id: '1', title: 'Data Structures', code: 'CS201', doctor: 'Dr. Mohamed Ali', chapters: 4, questions: 3, color: '#3b82f6' },
    { id: '2', title: 'Linear Algebra', code: 'MATH301', doctor: 'Dr. Sara Ibrahim', chapters: 3, questions: 2, color: '#8b5cf6' },
    { id: '3', title: 'Digital Logic', code: 'CE101', doctor: 'Dr. Khaled Youssef', chapters: 3, questions: 2, color: '#f97316' },
    { id: '4', title: 'English II', code: 'ENG102', doctor: 'Dr. Nadia Mahmoud', chapters: 2, questions: 1, color: '#10b981' },
    { id: '5', title: 'Physics Lab', code: 'PHY201L', doctor: 'Dr. Omar Farid', chapters: 2, questions: 0, color: '#ec4899' },
  ];

  // 3. إضافة النوع ListRenderItem لضمان أن item يتعرف على خصائص CourseData
  const renderItem: ListRenderItem<CourseData> = ({ item }) => (
    <TouchableOpacity style={styles.courseCard}>
      {/* Icon Section */}
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <Feather name="book" size={24} color="#fff" />
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <Text style={styles.courseTitle}>{item.title}</Text>
        <Text style={styles.courseSubtitle}>{item.code} · {item.doctor}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="file-document-outline" size={14} color="#94a3b8" />
            <Text style={styles.detailText}>{item.chapters} chapters</Text>
          </View>
          <View style={styles.detailItem}>
            <Feather name="help-circle" size={14} color="#94a3b8" />
            <Text style={styles.detailText}>{item.questions} questions</Text>
          </View>
        </View>
      </View>

      {/* Arrow Section */}
      <Entypo name="chevron-small-right" size={24} color="#94a3b8" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Questions</Text>
        <Text style={styles.description}>Select a course to browse questions</Text>
      </View>

      <FlatList
        data={courses}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

// --- Styles (كما هي دون تغيير) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  description: { fontSize: 14, color: '#64748b', marginTop: 4 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoContainer: { flex: 1 },
  courseTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  courseSubtitle: { fontSize: 13, color: '#64748b', marginVertical: 4 },
  detailsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
  detailText: { fontSize: 12, color: '#94a3b8', marginLeft: 4 },
});

export default QuestionsScreen;