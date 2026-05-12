import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Switch,
  useWindowDimensions,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { auth, API_URL } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter, useFocusEffect } from "expo-router";
import { useAppTheme } from "@/constants/theme";

const AVATAR_LOCAL_KEY = "@nazamly_avatar_local";
const STUDENT_CARD_FRONT_KEY = '@nazamly_student_card_front';
const STUDENT_CARD_BACK_KEY = '@nazamly_student_card_back';

const getProfile = async (token: string) => {
  const res = await fetch(`${API_URL}/api/auth/get-profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

const setupProfile = async (
  data: { currentCGPA: number; earnedCreditHours: number },
  token: string,
) => {
  const res = await fetch(`${API_URL}/api/auth/setup-profile`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return res.json();
};

const uploadPhoto = async (
  uri: string,
  token: string,
  mimeType: string,
  fileName: string,
) => {
  const formData = new FormData();
  formData.append("photo", {
    uri,
    type: mimeType,
    name: fileName,
  } as any);

  const res = await fetch(`${API_URL}/api/auth/upload-photo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  return res.json();
};
interface ProfileDetailProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  colors: any;
}

const ProfileScreen = () => {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { user, backendUser, setBackendUser, refreshProfile } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileLoading, setProfileLoading] = useState(!backendUser);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [cgpaInput, setCgpaInput] = useState(
    backendUser?.cgpa?.toString() || backendUser?.currentCGPA?.toString() || "",
  );
  const [creditsInput, setCreditsInput] = useState(
    backendUser?.completedHours?.toString() ||
      backendUser?.earnedCreditHours?.toString() ||
      "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [codingHistory, setCodingHistory] = useState<any[]>([]);
  const [codingLoading, setCodingLoading] = useState(false);
  const [codingError, setCodingError] = useState("");
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    try {
      setProfileLoading(true);
      const token = await user.getIdToken(true);
      const response = await getProfile(token);
      if (response.success && response.data) {
        setBackendUser(response.data);
        setCgpaInput(
          response.data.cgpa?.toString() ||
            response.data.currentCGPA?.toString() ||
            "",
        );
        setCreditsInput(
          response.data.completedHours?.toString() ||
            response.data.earnedCreditHours?.toString() ||
            "",
        );
      }
    } catch (err) {
      console.error("[Profile] fetch error:", err);
    } finally {
      setProfileLoading(false);
    }
  }, [user, setBackendUser]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      loadLocalAvatar();
      loadQuizHistory();
      loadCodingHistory();
      AsyncStorage.getItem(STUDENT_CARD_FRONT_KEY).then(v => setFrontUri(v));
      AsyncStorage.getItem(STUDENT_CARD_BACK_KEY).then(v => setBackUri(v));
    }, [fetchProfile]),
  );

  const loadLocalAvatar = async () => {
    const saved = await AsyncStorage.getItem(AVATAR_LOCAL_KEY);
    if (saved) setLocalPhotoUri(saved);
  };

  const loadQuizHistory = async () => {
    if (!user) return;
    setQuizLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/student/quizzes/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.history) setQuizHistory(data.history.slice(0, 4));
    } catch (err) {
      console.error("[Profile] quiz history error:", err);
    } finally {
      setQuizLoading(false);
    }
  };

  const loadCodingHistory = async () => {
    if (!user) return;
    setCodingLoading(true);
    setCodingError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/coding/history?limit=4`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setCodingHistory(data.data);
      } else if (!res.ok) {
        setCodingError(
          data.message || data.error || "Failed to load coding history",
        );
      }
    } catch (err: any) {
      setCodingError(err.message || "Failed to load coding history");
    } finally {
      setCodingLoading(false);
    }
  };
  useEffect(() => {
    if (backendUser) setProfileLoading(false);
  }, [backendUser]);
  useEffect(() => {
    if (backendUser) {
      setCgpaInput(
        backendUser.cgpa?.toString() ||
          backendUser.currentCGPA?.toString() ||
          "",
      );
      setCreditsInput(
        backendUser.completedHours?.toString() ||
          backendUser.earnedCreditHours?.toString() ||
          "",
      );
    }
  }, [backendUser]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      router.replace("/(auth)/Login");
    } catch {
      Alert.alert("Error", "Failed to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const cgpa = parseFloat(cgpaInput);
      const hours = parseInt(creditsInput, 10);
      if (isNaN(cgpa) || isNaN(hours)) {
        Alert.alert("Error", "Invalid CGPA or Hours");
        return;
      }
      const token = await user.getIdToken();
      const res = await setupProfile(
        { currentCGPA: cgpa, earnedCreditHours: hours },
        token,
      );
      if (res.success && res.data) {
        setBackendUser(res.data);
        setEditModalVisible(false);
      } else {
        Alert.alert("Error", res.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Save profile error:", err);
      Alert.alert("Error", "An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = async () => {
    if (!user) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setLocalPhotoUri(uri);
        await AsyncStorage.setItem(AVATAR_LOCAL_KEY, uri);
        setIsUploadingPhoto(true);

        const token = await user.getIdToken();

        // Extract filename and mime type dynamically
        const fileName = uri.split("/").pop() || "profile.jpg";
        const match = /\.(\w+)$/.exec(fileName);
        const mimeType = match ? `image/${match[1]}` : "image/jpeg";

        // Upload photo
        const res = await uploadPhoto(uri, token, mimeType, fileName);
        if (res.success && (res.photoURL || res.data?.photoURL)) {
          setBackendUser((prev: any) => ({
            ...prev,
            photoURL: res.photoURL || res.data.photoURL,
          }));
          if (refreshProfile) {
            await refreshProfile();
          }
        } else {
          Alert.alert("Error", res.message || "Failed to upload photo");
        }
      }
    } catch (err) {
      console.error("Image picker error:", err);
      Alert.alert("Error", "Failed to select image.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const displayName = user?.displayName || "Student";
  const displayEmail = user?.email || "No Email";
  const initial = displayName.charAt(0).toUpperCase();
  const currentGpa = backendUser?.cgpa ?? backendUser?.currentCGPA ?? 0;
  const isDeansList = currentGpa >= 3.7;

  s = createProfileStyles(isTablet);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {profileLoading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={colors.indigo} />
            <Text style={[s.loadingText, { color: colors.textMuted }]}>
              Loading Profile...
            </Text>
          </View>
        ) : (
          <>
            {/* Avatar Section */}
            <View style={s.avatarSection}>
              <TouchableOpacity
                style={s.avatarWrap}
                onPress={handlePickImage}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    s.avatar,
                    {
                      backgroundColor: colors.indigo,
                      borderColor: colors.indigoPale,
                    },
                  ]}
                >
                  {localPhotoUri || backendUser?.photoURL ? (
                    <Image
                      source={{ uri: localPhotoUri || backendUser.photoURL }}
                      style={s.avatarImage}
                    />
                  ) : (
                    <Text style={s.avatarInitial}>{initial}</Text>
                  )}
                  {isUploadingPhoto && (
                    <View style={s.avatarOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                </View>
                <View
                  style={[
                    s.cameraBtn,
                    { backgroundColor: colors.indigo, borderColor: colors.bg },
                  ]}
                >
                  <Feather name="camera" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
              <View
                style={[
                  s.studentIdBadge,
                  { backgroundColor: colors.indigoPale, flexDirection: "row" },
                ]}
              >
                <MaterialCommunityIcons
                  name="card-account-details"
                  size={13}
                  color={colors.indigo}
                />
                <Text style={[s.studentIdText, { color: colors.indigo }]}>
                  Student Code · {backendUser?.studentCode || "N/A"}
                </Text>
              </View>
              <Text style={[s.profileName, { color: colors.textPrimary }]}>
                {displayName}
              </Text>
              <Text style={[s.profileEmail, { color: colors.textSecondary }]}>
                {displayEmail}
              </Text>
            </View>

            {/* Dean's List Badge */}
            {isDeansList && (
              <View
                style={[
                  s.deansListCard,
                  {
                    backgroundColor: colors.tealLight,
                    borderColor: colors.teal + "40",
                    flexDirection: "row",
                  },
                ]}
              >
                <View style={[s.deansListLeft, { flexDirection: "row" }]}>
                  <MaterialCommunityIcons
                    name="trophy"
                    size={24}
                    color={colors.teal}
                  />
                  <View>
                    <Text style={[s.deansListTitle, { color: colors.teal }]}>
                      Dean&apos;s List
                    </Text>
                    <Text
                      style={[s.deansListSub, { color: colors.teal + "AA" }]}
                    >
                      Academic Excellence · GPA {currentGpa.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <Feather name="award" size={20} color={colors.teal} />
              </View>
            )}

            {/* Info Grid */}
            <View style={[s.infoGrid, { flexDirection: "row" }]}>
              {[
                {
                  icon: "book",
                  label: "GPA",
                  value: currentGpa.toFixed(2),
                  color: colors.indigo,
                },
                {
                  icon: "clock",
                  label: "Earned Hrs",
                  value: (
                    backendUser?.completedHours ??
                    backendUser?.earnedCreditHours ??
                    0
                  ).toString(),
                  color: colors.teal,
                },
                {
                  icon: "layers",
                  label: "Department",
                  value: backendUser?.department || "—",
                  color: colors.amber,
                },
                {
                  icon: "calendar",
                  label: "Year",
                  value: backendUser?.academicYear || "—",
                  color: colors.green,
                },
              ].map((item) => (
                <View
                  key={item.label}
                  style={[s.infoGridItem, { backgroundColor: colors.card }]}
                >
                  <Feather
                    name={item.icon as any}
                    size={18}
                    color={item.color}
                  />
                  <Text style={[s.infoGridLabel, { color: colors.textMuted }]}>
                    {item.label}
                  </Text>
                  <Text
                    style={[s.infoGridValue, { color: colors.textPrimary }]}
                  >
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Academic Details */}
            <View style={[s.detailsCard, { backgroundColor: colors.card }]}>
              <Text style={[s.detailsCardTitle, { color: colors.textMuted }]}>
                Academic Info
              </Text>
              <ProfileDetail
                icon="user"
                label="Full Name"
                value={displayName}
                colors={colors}
              />
              <View style={[s.divider, { backgroundColor: colors.divider }]} />
              <ProfileDetail
                icon="mail"
                label="Email"
                value={displayEmail}
                colors={colors}
              />
              <View style={[s.divider, { backgroundColor: colors.divider }]} />
              <ProfileDetail
                icon="shield"
                label="Role"
                value={
                  (backendUser?.role || "student").charAt(0).toUpperCase() +
                  (backendUser?.role || "student").slice(1)
                }
                colors={colors}
              />
              <View style={[s.divider, { backgroundColor: colors.divider }]} />
              <ProfileDetail
                icon="calendar"
                label="Member Since"
                value={
                  backendUser?.createdAt
                    ? new Date(backendUser.createdAt).getFullYear().toString()
                    : "—"
                }
                colors={colors}
              />
            </View>

            {/* Registered Courses */}
            <View style={[s.detailsCard, { backgroundColor: colors.card }]}>
              <Text style={[s.detailsCardTitle, { color: colors.textMuted }]}>
                Registered Courses
              </Text>
              {backendUser?.termCourses &&
              backendUser.termCourses.length > 0 ? (
                backendUser.termCourses.map((course: any, idx: number) => (
                  <View key={idx} style={s.courseRow}>
                    <View
                      style={[
                        s.courseIcon,
                        { backgroundColor: colors.indigoPale },
                      ]}
                    >
                      <Feather name="book" size={14} color={colors.indigo} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[s.courseTitle, { color: colors.textPrimary }]}
                      >
                        {course.name}
                      </Text>
                      <Text style={[s.courseMeta, { color: colors.textMuted }]}>
                        {course.courseCode} · {course.creditHours} Credits
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  No courses registered for this term.
                </Text>
              )}
            </View>

            {/* Student Card Photos */}
            {(frontUri || backUri) && (
              <View style={[s.detailsCard, { backgroundColor: colors.card }]}>
                <Text style={[s.detailsCardTitle, { color: colors.textMuted }]}>
                  Student Card
                </Text>
                
                {frontUri && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8, fontWeight: "500" }}>Front Side</Text>
                    <Image source={{ uri: frontUri }} style={{ width: '100%', height: 200, borderRadius: 12, backgroundColor: colors.border }} resizeMode="cover" />
                  </View>
                )}
                
                {backUri && (
                  <View>
                    <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8, fontWeight: "500" }}>Back Side</Text>
                    <Image source={{ uri: backUri }} style={{ width: '100%', height: 200, borderRadius: 12, backgroundColor: colors.border }} resizeMode="cover" />
                  </View>
                )}
              </View>
            )}

            {/* Latest Quiz Results */}
            <View style={[s.detailsCard, { backgroundColor: colors.card }]}>
              <Text style={[s.detailsCardTitle, { color: colors.textMuted }]}>
                Latest Quiz Results
              </Text>
              {quizLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.indigo}
                  style={{ marginVertical: 16 }}
                />
              ) : quizHistory.length > 0 ? (
                quizHistory.map((quiz: any, idx: number) => {
                  const percent =
                    quiz.totalQuestions > 0
                      ? Math.round((quiz.score / quiz.totalQuestions) * 100)
                      : 0;
                  return (
                    <View key={idx} style={s.quizRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[s.courseTitle, { color: colors.textPrimary }]}
                        >
                          {quiz.courseId?.courseName || "Unknown"}
                        </Text>
                        <Text
                          style={[s.courseMeta, { color: colors.textMuted }]}
                        >
                          {new Date(quiz.createdAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.quizScoreBadge,
                          {
                            backgroundColor:
                              percent >= 80
                                ? "#22c55e20"
                                : percent >= 50
                                  ? "#f59e0b20"
                                  : "#ef444420",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.quizScoreText,
                            {
                              color:
                                percent >= 80
                                  ? "#22c55e"
                                  : percent >= 50
                                    ? "#f59e0b"
                                    : "#ef4444",
                            },
                          ]}
                        >
                          {quiz.score}/{quiz.totalQuestions}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  No quiz activities recorded yet.
                </Text>
              )}
            </View>

            {/* Recent Coding Practice */}
            <View style={[s.detailsCard, { backgroundColor: colors.card }]}>
              <Text style={[s.detailsCardTitle, { color: colors.textMuted }]}>
                Recent Coding Practice
              </Text>
              {codingLoading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.indigo}
                  style={{ marginVertical: 16 }}
                />
              ) : codingHistory.length > 0 ? (
                codingHistory.map((entry: any, idx: number) => {
                  const verdict = entry.verdict || "N/A";
                  const badgeColor =
                    verdict === "AC"
                      ? "#22c55e"
                      : verdict === "WA"
                        ? "#f59e0b"
                        : "#ef4444";
                  const problem = entry.problemId || {};
                  const course = problem.courseId || {};
                  const dateLabel = entry.createdAt
                    ? new Date(entry.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "";
                  return (
                    <View key={entry._id || idx} style={s.codingRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[s.courseTitle, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {problem.title || "Coding Problem"}
                        </Text>
                        <Text
                          style={[s.courseMeta, { color: colors.textMuted }]}
                          numberOfLines={1}
                        >
                          {course.courseName ||
                            course.courseCode ||
                            "Unknown Course"}{" "}
                          · {(entry.language || "").toUpperCase()} · {dateLabel}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.codingBadge,
                          { backgroundColor: badgeColor + "20" },
                        ]}
                      >
                        <Text
                          style={[s.codingBadgeText, { color: badgeColor }]}
                        >
                          {verdict}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  {codingError || "No coding activity recorded yet."}
                </Text>
              )}

              <TouchableOpacity
                style={[
                  s.sectionButton,
                  {
                    borderColor: colors.indigo,
                    backgroundColor: colors.indigoPale,
                    flexDirection: "row",
                  },
                ]}
                onPress={() => router.push("/(tabs)/Coding" as any)}
              >
                <Feather name="code" size={16} color={colors.indigo} />
                <Text style={[s.sectionButtonText, { color: colors.indigo }]}>
                  View Coding History
                </Text>
              </TouchableOpacity>
            </View>

            {/* Preferences */}
            <View style={[s.settingsCard, { backgroundColor: colors.card }]}>
              <Text style={[s.detailsCardTitle, { color: colors.textMuted }]}>
                Preferences
              </Text>

              {/* Notifications Toggle */}
              <View style={[s.settingRow, { flexDirection: "row" }]}>
                <View style={[s.settingLeft, { flexDirection: "row" }]}>
                  <View
                    style={[
                      s.settingIcon,
                      { backgroundColor: colors.indigoPale },
                    ]}
                  >
                    <Feather name="bell" size={16} color={colors.indigo} />
                  </View>
                  <View>
                    <Text
                      style={[s.settingLabel, { color: colors.textPrimary }]}
                    >
                      Notifications
                    </Text>
                    <Text style={[s.settingSub, { color: colors.textMuted }]}>
                      Stay updated on schedule changes
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notifEnabled}
                  onValueChange={setNotifEnabled}
                  trackColor={{
                    false: colors.border,
                    true: colors.indigoLight,
                  }}
                  thumbColor={notifEnabled ? colors.indigo : colors.textMuted}
                />
              </View>

              <View style={[s.divider, { backgroundColor: colors.divider }]} />

              {/* Dark Mode Toggle */}
              <View style={[s.settingRow, { flexDirection: "row" }]}>
                <View style={[s.settingLeft, { flexDirection: "row" }]}>
                  <View
                    style={[
                      s.settingIcon,
                      { backgroundColor: colors.amberLight },
                    ]}
                  >
                    <Feather
                      name={isDark ? "sun" : "moon"}
                      size={16}
                      color={colors.amber}
                    />
                  </View>
                  <View>
                    <Text
                      style={[s.settingLabel, { color: colors.textPrimary }]}
                    >
                      Dark Mode
                    </Text>
                    <Text style={[s.settingSub, { color: colors.textMuted }]}>
                      {isDark ? "Dark Mode" : "Light Mode"}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: colors.amberLight }}
                  thumbColor={isDark ? colors.amber : colors.textMuted}
                />
              </View>

              <View style={[s.divider, { backgroundColor: colors.divider }]} />
            </View>

            {/* Edit & Logout */}
            <TouchableOpacity
              style={[
                s.editButton,
                {
                  borderColor: colors.indigo,
                  backgroundColor: colors.indigoPale,
                  flexDirection: "row",
                },
              ]}
              onPress={() => {
                setCgpaInput(
                  backendUser?.cgpa?.toString() ||
                    backendUser?.currentCGPA?.toString() ||
                    "",
                );
                setCreditsInput(
                  backendUser?.completedHours?.toString() ||
                    backendUser?.earnedCreditHours?.toString() ||
                    "",
                );
                setEditModalVisible(true);
              }}
            >
              <Feather name="edit-2" size={18} color={colors.indigo} />
              <Text style={[s.editButtonText, { color: colors.indigo }]}>
                Edit Academic Info
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.logoutButton,
                {
                  borderColor: colors.red + "40",
                  backgroundColor: colors.redLight,
                  flexDirection: "row",
                },
              ]}
              onPress={handleSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <ActivityIndicator color={colors.red} size="small" />
              ) : (
                <Feather name="log-out" size={18} color={colors.red} />
              )}
              <Text style={[s.logoutText, { color: colors.red }]}>
                {isSigningOut ? "Logging out..." : "Logout"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <View
              style={[s.modalHandleBar, { backgroundColor: colors.border }]}
            />
            <View style={[s.modalHeader, { flexDirection: "row" }]}>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>
                Edit Profile
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>
              Current CGPA
            </Text>
            <TextInput
              style={[
                s.modalInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                  color: colors.textPrimary,
                },
              ]}
              value={cgpaInput}
              onChangeText={setCgpaInput}
              keyboardType="numeric"
              placeholder="e.g. 3.75"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>
              Credit Hours Earned
            </Text>
            <TextInput
              style={[
                s.modalInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                  color: colors.textPrimary,
                },
              ]}
              value={creditsInput}
              onChangeText={setCreditsInput}
              keyboardType="numeric"
              placeholder="e.g. 60"
              placeholderTextColor={colors.textMuted}
            />
            <View style={[s.modalActions, { flexDirection: "row" }]}>
              <TouchableOpacity
                style={[s.cancelBtn, { backgroundColor: colors.bg }]}
                onPress={() => setEditModalVisible(false)}
                disabled={isSaving}
              >
                <Text
                  style={[s.cancelBtnText, { color: colors.textSecondary }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: colors.indigo }]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.saveBtnText}>Save Choices</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const ProfileDetail = ({ icon, label, value, colors }: ProfileDetailProps) => (
  <View style={[s.detailRow, { flexDirection: "row" }]}>
    <View style={[s.detailLeft, { flexDirection: "row" }]}>
      <Feather name={icon} size={16} color={colors.textMuted} />
      <Text style={[s.detailLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
    <Text
      style={[s.detailValue, { color: colors.textPrimary, textAlign: "right" }]}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

const createProfileStyles = (isTablet = false) => {
  const sf = isTablet ? 1.25 : 1;
  const fs = isTablet ? 1.18 : 1;
  const r = (v: number) => Math.round(v * sf);
  const f = (v: number) => Math.round(v * fs);

  return StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: r(20), paddingTop: r(10), paddingBottom: r(110) },
  centered: { alignItems: "center", paddingTop: 60 },
  loadingText: { marginTop: 10, fontSize: 14 },
  avatarSection: { alignItems: "center", paddingVertical: 28 },
  avatarWrap: { position: "relative", marginBottom: 16 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarInitial: { color: "#fff", fontSize: 36, fontWeight: "900" },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
  },
  studentIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  studentIdText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  profileName: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  profileEmail: { fontSize: 14 },
  progressBarOuter: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressBarInner: { height: "100%", borderRadius: 2 },
  deansListCard: {
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },
  deansListLeft: { alignItems: "center", gap: 14 },
  deansListTitle: { fontSize: 15, fontWeight: "800" },
  deansListSub: { fontSize: 12, marginTop: 2 },
  infoGrid: { flexWrap: "wrap", gap: 12, marginBottom: 16 },
  infoGridItem: {
    width: "47%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  infoGridLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
    textAlign: "center",
  },
  infoGridValue: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  detailsCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  detailsCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  divider: { height: 1, marginVertical: 12 },
  detailRow: { justifyContent: "space-between", alignItems: "center" },
  detailLeft: { alignItems: "center", gap: 10 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: "600", maxWidth: "55%" },
  settingsCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  settingRow: { alignItems: "center", justifyContent: "space-between" },
  settingLeft: { alignItems: "center", gap: 12 },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: { fontSize: 14, fontWeight: "600" },
  settingSub: { fontSize: 12, marginTop: 1 },
  editButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  editButtonText: { fontSize: 15, fontWeight: "700" },
  logoutButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  logoutText: { fontSize: 15, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 34,
  },
  modalHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 14,
  },
  modalInput: { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 15 },
  modalActions: { justifyContent: "flex-start", marginTop: 20, gap: 10 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  cancelBtnText: { fontWeight: "600" },
  saveBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  dropdownContent: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownOption: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    alignItems: "center",
  },
  dropdownText: { fontSize: 16, fontWeight: "700" },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  courseIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  courseTitle: { fontSize: 14, fontWeight: "600" },
  courseMeta: { fontSize: 12, marginTop: 2 },
  quizRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  codingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  codingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codingBadgeText: { fontSize: 12, fontWeight: "800" },
  sectionButton: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sectionButtonText: { fontSize: 14, fontWeight: "700" },
  quizScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quizScoreText: { fontSize: 13, fontWeight: "800" },
});
};

let s = createProfileStyles(false);

export default ProfileScreen;
