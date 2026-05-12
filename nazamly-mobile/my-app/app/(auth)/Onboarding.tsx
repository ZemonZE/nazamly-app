import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/constants/theme";
import { auth, API_URL } from "@/firebase";

const DEPARTMENTS = ["General", "CS", "IT", "MATH", "PHYS"];
const YEARS = [
  { label: "Year 1", value: 1 },
  { label: "Year 2", value: 2 },
  { label: "Year 3", value: 3 },
  { label: "Year 4", value: 4 },
];

export default function MobileOnboarding() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user, setBackendUser } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [fullName, setFullName] = useState(user?.displayName || "");
  const [studentCode, setStudentCode] = useState("");
  const [completedHours, setCompletedHours] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [academicYear, setAcademicYear] = useState<number | null>(null);
  const [department, setDepartment] = useState("");

  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Modals state
  const [showYearModal, setShowYearModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Server error: non-JSON response");
        }
        const json = await res.json();
        if (res.ok) setAvailableCourses(json.data || []);
      } catch (err) {
        console.error("Could not load courses:", err);
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [user]);

  const toggleCourse = (id: string) => {
    if (selectedCourses.includes(id)) {
      setSelectedCourses(selectedCourses.filter((c) => c !== id));
    } else {
      setSelectedCourses([...selectedCourses, id]);
    }
  };

  const getCourseLabel = (id: string) => {
    const c = availableCourses.find((x) => x._id === id);
    return c ? `${c.courseCode}` : id;
  };

  const filteredCourses = availableCourses.filter((c) => {
    if (selectedCourses.includes(c._id)) return false;
    if (!courseSearch) return true;
    const q = courseSearch.toLowerCase();
    return (
      c.courseName?.toLowerCase().includes(q) ||
      c.courseCode?.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async () => {
    if (!/^\d{7}$/.test(studentCode)) {
      Alert.alert("Validation Error", "Student code must be exactly 7 digits.");
      return;
    }
    if (!academicYear) {
      Alert.alert("Validation Error", "Please select an academic year.");
      return;
    }
    if (academicYear > 1 && !department) {
      Alert.alert("Validation Error", "Please select a department.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        studentCode: studentCode.trim(),
        completedHours: Number(completedHours) || 0,
        cgpa: Number(cgpa) || 0,
        academicYear,
        department: academicYear === 1 ? "General" : department,
        registeredCourses: selectedCourses,
      };

      if (!user) throw new Error("Not logged in");
      const token = await user.getIdToken(true);

      const res = await fetch(`${API_URL}/api/students/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Server returned non-JSON:", text.substring(0, 200));
        throw new Error("Server error: Expected JSON but got HTML.");
      }

      const data = await res.json();

      if (res.status === 201) {
        setBackendUser((prev: any) => ({ ...prev, ...data.data, isProfileComplete: true }));
        Alert.alert("Success", "Profile completed successfully!");
        router.replace("/(tabs)/HomePage");
      } else if (res.status === 409) {
        Alert.alert("Error", data.message || "Student code already exists.");
      } else {
        Alert.alert("Error", data.errors?.join("\n") || "Failed to register profile.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors, isTablet);

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scrollContent}>
          <View style={s.header}>
            <Text style={s.title}>Student Onboarding</Text>
            <Text style={s.subtitle}>
              Fill in your academic data to get started
            </Text>
          </View>

          <View style={s.card}>
            {/* Full Name */}
            <View style={s.inputGroup}>
              <Text style={s.label}>Full Name</Text>
              <View style={s.inputContainer}>
                <Feather name="user" size={18} color={colors.textMuted} />
                <TextInput
                  style={s.input}
                  placeholder="e.g. Ahmed Mohamed"
                  placeholderTextColor={colors.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            {/* Student Code */}
            <View style={s.inputGroup}>
              <Text style={s.label}>Student Code (7 Digits)</Text>
              <View style={s.inputContainer}>
                <Feather name="credit-card" size={18} color={colors.textMuted} />
                <TextInput
                  style={s.input}
                  placeholder="e.g. 2327482"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={7}
                  value={studentCode}
                  onChangeText={setStudentCode}
                />
              </View>
            </View>

            {/* Hours & CGPA */}
            <View style={s.row}>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Completed Hours</Text>
                <View style={s.inputContainer}>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. 92"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={completedHours}
                    onChangeText={setCompletedHours}
                  />
                </View>
              </View>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>CGPA</Text>
                <View style={s.inputContainer}>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. 3.84"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={cgpa}
                    onChangeText={setCgpa}
                  />
                </View>
              </View>
            </View>

            {/* Year & Dept */}
            <View style={s.row}>
              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Academic Year</Text>
                <TouchableOpacity
                  style={s.dropdownBtn}
                  onPress={() => setShowYearModal(true)}
                >
                  <Text
                    style={{
                      color: academicYear ? colors.textPrimary : colors.textMuted,
                    }}
                  >
                    {academicYear ? `Year ${academicYear}` : "Select"}
                  </Text>
                  <Feather name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[s.inputGroup, { flex: 1 }]}>
                <Text style={s.label}>Department</Text>
                <TouchableOpacity
                  style={[
                    s.dropdownBtn,
                    academicYear === 1 && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    if (academicYear !== 1) setShowDeptModal(true);
                  }}
                  disabled={academicYear === 1}
                >
                  <Text
                    style={{
                      color:
                        academicYear === 1 || department
                          ? colors.textPrimary
                          : colors.textMuted,
                    }}
                  >
                    {academicYear === 1
                      ? "General"
                      : department || "Select"}
                  </Text>
                  <Feather name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Courses */}
            <View style={s.inputGroup}>
              <Text style={s.label}>Registered Courses (Optional)</Text>
              <TouchableOpacity
                style={s.dropdownBtn}
                onPress={() => setShowCourseModal(true)}
              >
                <Text style={{ color: colors.textPrimary }}>
                  {selectedCourses.length > 0
                    ? `${selectedCourses.length} Selected`
                    : "Select Courses"}
                </Text>
                <Feather name="plus" size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <View style={s.chipContainer}>
                {selectedCourses.map((id) => (
                  <View key={id} style={s.chip}>
                    <Text style={s.chipText}>{getCourseLabel(id)}</Text>
                    <TouchableOpacity onPress={() => toggleCourse(id)}>
                      <Feather name="x" size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={s.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitBtnText}>Complete Profile</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 20, alignItems: "center" }}
              onPress={() => {
                auth.signOut();
                setBackendUser(null);
                router.replace("/(auth)/Login");
              }}
            >
              <Text style={{ color: colors.red, fontSize: 14, fontWeight: "600" }}>
                Wrong account? Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Year Modal */}
      <Modal visible={showYearModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Select Academic Year</Text>
            {YEARS.map((y) => (
              <TouchableOpacity
                key={y.value}
                style={s.modalOption}
                onPress={() => {
                  setAcademicYear(y.value);
                  if (y.value === 1) setDepartment("General");
                  setShowYearModal(false);
                }}
              >
                <Text style={s.modalOptionText}>{y.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={s.modalClose}
              onPress={() => setShowYearModal(false)}
            >
              <Text style={s.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Dept Modal */}
      <Modal visible={showDeptModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Select Department</Text>
            {DEPARTMENTS.map((d) => (
              <TouchableOpacity
                key={d}
                style={s.modalOption}
                onPress={() => {
                  setDepartment(d);
                  setShowDeptModal(false);
                }}
              >
                <Text style={s.modalOptionText}>{d}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={s.modalClose}
              onPress={() => setShowDeptModal(false)}
            >
              <Text style={s.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Course Modal */}
      <Modal visible={showCourseModal} transparent animationType="slide">
        <View style={[s.modalOverlay, { justifyContent: "flex-end" }]}>
          <View style={[s.modalContent, { height: "70%" }]}>
            <Text style={s.modalTitle}>Select Courses</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search courses..."
              placeholderTextColor={colors.textMuted}
              value={courseSearch}
              onChangeText={setCourseSearch}
            />
            <FlatList
              data={filteredCourses}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.courseOption}
                  onPress={() => toggleCourse(item._id)}
                >
                  <Text style={s.courseCode}>{item.courseCode}</Text>
                  <Text style={s.courseName} numberOfLines={1}>
                    {item.courseName}
                  </Text>
                  <Feather name="plus-circle" size={20} color={colors.teal} />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={s.submitBtn}
              onPress={() => {
                setCourseSearch("");
                setShowCourseModal(false);
              }}
            >
              <Text style={s.submitBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (colors: any, isTablet: boolean) => {
  const sf = isTablet ? 1.25 : 1;
  const fs = isTablet ? 1.18 : 1;
  const r = (v: number) => Math.round(v * sf);
  const f = (v: number) => Math.round(v * fs);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { padding: r(24) },
    header: { marginTop: r(40), marginBottom: r(24), alignItems: "center" },
    title: { fontSize: f(28), fontWeight: "800", color: colors.textPrimary },
    subtitle: { fontSize: f(14), color: colors.textMuted, marginTop: r(8) },

    card: {
      backgroundColor: colors.card,
      borderRadius: r(20),
      padding: r(24),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },
    row: { flexDirection: "row", gap: r(12) },
    inputGroup: { marginBottom: r(16) },
    label: {
      fontSize: f(13),
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: r(6),
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: r(12),
      paddingHorizontal: r(12),
      height: r(50),
      backgroundColor: colors.bg,
    },
    input: { flex: 1, marginLeft: r(8), fontSize: f(15), color: colors.textPrimary },
    dropdownBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: r(12),
      paddingHorizontal: r(12),
      height: r(50),
      backgroundColor: colors.bg,
    },
    chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: r(8), marginTop: r(8) },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.tealLight,
      paddingHorizontal: r(10),
      paddingVertical: r(6),
      borderRadius: r(16),
      gap: r(6),
    },
    chipText: { fontSize: f(12), fontWeight: "600", color: colors.teal },

    submitBtn: {
      backgroundColor: colors.indigo,
      height: r(54),
      borderRadius: r(14),
      alignItems: "center",
      justifyContent: "center",
      marginTop: r(10),
    },
    submitBtnText: { color: "#fff", fontSize: f(16), fontWeight: "700" },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: r(20),
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: r(20),
      padding: r(20),
    },
    modalTitle: { fontSize: f(18), fontWeight: "700", marginBottom: r(16), color: colors.textPrimary },
    modalOption: {
      paddingVertical: r(14),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalOptionText: { fontSize: f(16), color: colors.textPrimary, textAlign: "center" },
    modalClose: { marginTop: r(16), padding: r(12), alignItems: "center" },
    modalCloseText: { color: colors.red, fontSize: f(16), fontWeight: "600" },

    searchInput: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: r(12),
      padding: r(12),
      marginBottom: r(12),
      fontSize: f(15),
      color: colors.textPrimary,
    },
    courseOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: r(12),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    courseCode: { fontSize: f(14), fontWeight: "700", color: colors.textPrimary, width: r(80) },
    courseName: { flex: 1, fontSize: f(13), color: colors.textSecondary },
  });
};
