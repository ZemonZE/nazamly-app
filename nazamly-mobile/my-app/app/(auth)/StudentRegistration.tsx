import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/constants/theme";
import {
  registerStudentProfile,
  StudentRegistrationData,
} from "@/utils/studentService";

const StudentRegistrationScreen = () => {
  const router = useRouter();
  const { colors } = useAppTheme();

  const [form, setForm] = useState<StudentRegistrationData>({
    fullName: "",
    studentCode: "",
    completedHours: 0,
    cgpa: 0,
    academicYear: 1,
    department: "General",
    registeredCourses: [],
  });

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.fullName || !form.studentCode) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await registerStudentProfile(form);
      if (response.success) {
        Alert.alert("Success", "Student profile registered successfully!");
        router.replace("/(tabs)/HomePage");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof StudentRegistrationData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Student Registration
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Complete your profile to generate your smart schedule
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Full Name
            </Text>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.bg, borderColor: colors.border },
              ]}
            >
              <Feather name="user" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Enter full name"
                placeholderTextColor={colors.textMuted}
                value={form.fullName}
                onChangeText={(t) => updateField("fullName", t)}
              />
            </View>
          </View>

          {/* Student Code */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Student Code
            </Text>
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.bg, borderColor: colors.border },
              ]}
            >
              <Feather name="hash" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="e.g. CS-2024-001"
                placeholderTextColor={colors.textMuted}
                value={form.studentCode}
                onChangeText={(t) => updateField("studentCode", t)}
              />
            </View>
          </View>

          <View style={styles.row}>
            {/* Completed Hours */}
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Hours
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.bg, borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={form.completedHours.toString()}
                  onChangeText={(t) =>
                    updateField("completedHours", parseInt(t) || 0)
                  }
                />
              </View>
            </View>

            {/* CGPA */}
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                CGPA
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.bg, borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={form.cgpa.toString()}
                  onChangeText={(t) => updateField("cgpa", parseFloat(t) || 0)}
                />
              </View>
            </View>
          </View>

          <View style={styles.row}>
            {/* Academic Year */}
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Year
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.bg, borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="1-5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={form.academicYear?.toString()}
                  onChangeText={(t) =>
                    updateField("academicYear", parseInt(t) || 1)
                  }
                />
              </View>
            </View>

            {/* Department */}
            <View style={[styles.inputGroup, { flex: 2, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Dept
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.bg, borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="e.g. CS"
                  placeholderTextColor={colors.textMuted}
                  value={form.department}
                  onChangeText={(t) => updateField("department", t)}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.indigo }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Register Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});

export default StudentRegistrationScreen;
