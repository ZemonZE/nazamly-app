import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  useWindowDimensions,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/constants/theme";
import { useRouter, useFocusEffect } from "expo-router";
import { API_URL } from "@/firebase";

interface StatCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
  bgColor: string;
  onPress?: () => void;
}

interface ScheduleItemProps {
  title: string;
  type: string;
  time: string;
  place: string;
  accentColor: string;
  colors: any;
}

// Matches the AsyncStorage model from TimeTable.tsx (web-parity format)
interface LocalEntry {
  id: number | string;
  subject: string;
  type: string; // 'Lec' | 'Sec' | 'Lab'
  day: string; // English day name
  slot: { start: string; end: string };
  group: string;
  place: string;
}

const SCHEDULE_STORAGE_KEY = "@nazamly_schedules";
const STUDENT_CARD_FRONT_KEY = "@nazamly_student_card_front";
const STUDENT_CARD_BACK_KEY = "@nazamly_student_card_back";

const DB_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

let s: any = {};

const HomeScreen = () => {
  const { colors } = useAppTheme();
  const { user, backendUser, setBackendUser, refreshProfile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Determine if it's a tablet (width >= 768px)
  const isTablet = width >= 768;

  // Base values for mobile
  const baseValues = {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
    headerMarginBottom: 20,
    greetingFontSize: 15,
    userNameFontSize: 26,
    dateTextFontSize: 13,
    focusChipPaddingHorizontal: 10,
    focusChipPaddingVertical: 6,
    focusChipGap: 5,
    focusChipMarginTop: 4,
    focusChipTextFontSize: 12,
    gpaCardBorderRadius: 24,
    gpaCardPadding: 22,
    gpaCardMarginBottom: 18,
    gpaLabelFontSize: 13,
    gpaValueFontSize: 48,
    gpaSubLabelFontSize: 13,
    gpaBadgePaddingHorizontal: 12,
    gpaBadgePaddingVertical: 7,
    gpaBadgeGap: 6,
    gpaBadgeTextFontSize: 13,
    progressTrackHeight: 6,
    progressLabelFontSize: 12,
    tapHintFontSize: 12,
    statsRowMarginBottom: 24,
    statCardWidth: "31%",
    statCardPadding: 14,
    statCardBorderRadius: 16,
    statIconWrapWidth: 38,
    statIconWrapHeight: 38,
    statIconWrapBorderRadius: 12,
    statIconWrapMarginBottom: 8,
    statValueFontSize: 20,
    statLabelFontSize: 11,
    sectionHeaderMarginBottom: 12,
    sectionTitleFontSize: 17,
    sectionSubFontSize: 13,
    addButtonWidth: 34,
    addButtonHeight: 34,
    addButtonBorderRadius: 17,
    loadingContainerPaddingVertical: 36,
    loadingTextMarginTop: 10,
    loadingTextFontSize: 14,
    emptyCardPaddingVertical: 32,
    emptyCardBorderRadius: 16,
    emptyCardMarginBottom: 8,
    emptyTextFontSize: 16,
    emptySubtextFontSize: 13,
    scheduleItemBorderRadius: 16,
    scheduleItemMarginBottom: 12,
    scheduleItemShadowOpacity: 0.06,
    scheduleItemShadowRadius: 6,
    accentBarWidth: 5,
    scheduleContentPadding: 14,
    scheduleHeaderRowMarginBottom: 4,
    scheduleTitleFontSize: 15,
    scheduleCodeFontSize: 12,
    scheduleCodeMarginBottom: 8,
    sessionBadgePaddingHorizontal: 8,
    sessionBadgePaddingVertical: 3,
    sessionBadgeBorderRadius: 8,
    sessionBadgeTextFontSize: 11,
    scheduleDetailsGap: 14,
    detailRowGap: 4,
    detailTextFontSize: 12,
    quickGridGap: 12,
    quickGridMarginBottom: 4,
    quickCardPaddingVertical: 20,
    quickCardPaddingHorizontal: 18,
    quickCardBorderRadius: 16,
    quickCardShadowOpacity: 0.25,
    quickCardShadowRadius: 8,
    quickCardLabelFontSize: 14,
    studentCardContainerMarginBottom: 8,
    studentCardPadding: 18,
    studentCardBorderRadius: 16,
    studentCardGap: 14,
    studentCardShadowOpacity: 0.05,
    studentCardShadowRadius: 5,
    studentCardWithPhotoPadding: 15,
    studentCardImageHeight: 180,
    studentCardImageBorderRadius: 10,
    updateCardButtonPaddingVertical: 12,
    updateCardButtonBorderRadius: 10,
    updateCardButtonGap: 8,
    updateCardButtonTextFontSize: 14,
    cardShowBtnPaddingVertical: 12,
    cardShowBtnBorderRadius: 12,
    cardShowBtnGap: 8,
    cardShowBtnTextFontSize: 14,
    cardViewerOverlayPadding: 20,
    cardViewerTitleFontSize: 18,
    cardViewerImageHeight: 280,
    cardViewerImageBorderRadius: 16,
    cardViewerCloseBtnMarginTop: 20,
    cardViewerCloseBtnPaddingVertical: 12,
    cardViewerCloseBtnPaddingHorizontal: 32,
    cardViewerCloseBtnBorderRadius: 14,
    cardViewerCloseTextFontSize: 15,
    cardIconContainerPadding: 12,
    cardIconContainerBorderRadius: 10,
    cardTitleFontSize: 15,
    cardSubtitleFontSize: 12,
  };

  // Tablet values (increased for better readability on larger screens)
  const tabletValues = {
    paddingHorizontal: 32,
    paddingTop: 15,
    paddingBottom: 140,
    headerMarginBottom: 30,
    greetingFontSize: 18,
    userNameFontSize: 32,
    dateTextFontSize: 16,
    focusChipPaddingHorizontal: 14,
    focusChipPaddingVertical: 8,
    focusChipGap: 7,
    focusChipMarginTop: 6,
    focusChipTextFontSize: 14,
    gpaCardBorderRadius: 28,
    gpaCardPadding: 28,
    gpaCardMarginBottom: 24,
    gpaLabelFontSize: 16,
    gpaValueFontSize: 56,
    gpaSubLabelFontSize: 16,
    gpaBadgePaddingHorizontal: 16,
    gpaBadgePaddingVertical: 9,
    gpaBadgeGap: 8,
    gpaBadgeTextFontSize: 16,
    progressTrackHeight: 8,
    progressLabelFontSize: 14,
    tapHintFontSize: 14,
    statsRowMarginBottom: 32,
    statCardWidth: "30%",
    statCardPadding: 18,
    statCardBorderRadius: 20,
    statIconWrapWidth: 48,
    statIconWrapHeight: 48,
    statIconWrapBorderRadius: 16,
    statIconWrapMarginBottom: 12,
    statValueFontSize: 24,
    statLabelFontSize: 13,
    sectionHeaderMarginBottom: 16,
    sectionTitleFontSize: 20,
    sectionSubFontSize: 16,
    addButtonWidth: 42,
    addButtonHeight: 42,
    addButtonBorderRadius: 21,
    loadingContainerPaddingVertical: 48,
    loadingTextMarginTop: 14,
    loadingTextFontSize: 16,
    emptyCardPaddingVertical: 40,
    emptyCardBorderRadius: 20,
    emptyCardMarginBottom: 12,
    emptyTextFontSize: 20,
    emptySubtextFontSize: 16,
    scheduleItemBorderRadius: 20,
    scheduleItemMarginBottom: 16,
    scheduleItemShadowOpacity: 0.08,
    scheduleItemShadowRadius: 8,
    accentBarWidth: 6,
    scheduleContentPadding: 18,
    scheduleHeaderRowMarginBottom: 6,
    scheduleTitleFontSize: 18,
    scheduleCodeFontSize: 14,
    scheduleCodeMarginBottom: 10,
    sessionBadgePaddingHorizontal: 10,
    sessionBadgePaddingVertical: 4,
    sessionBadgeBorderRadius: 10,
    sessionBadgeTextFontSize: 13,
    scheduleDetailsGap: 18,
    detailRowGap: 6,
    detailTextFontSize: 14,
    quickGridGap: 16,
    quickGridMarginBottom: 6,
    quickCardPaddingVertical: 24,
    quickCardPaddingHorizontal: 22,
    quickCardBorderRadius: 20,
    quickCardShadowOpacity: 0.3,
    quickCardShadowRadius: 10,
    quickCardLabelFontSize: 16,
    studentCardContainerMarginBottom: 12,
    studentCardPadding: 24,
    studentCardBorderRadius: 20,
    studentCardGap: 18,
    studentCardShadowOpacity: 0.08,
    studentCardShadowRadius: 6,
    studentCardWithPhotoPadding: 20,
    studentCardImageHeight: 220,
    studentCardImageBorderRadius: 12,
    updateCardButtonPaddingVertical: 16,
    updateCardButtonBorderRadius: 12,
    updateCardButtonGap: 10,
    updateCardButtonTextFontSize: 16,
    cardShowBtnPaddingVertical: 16,
    cardShowBtnBorderRadius: 16,
    cardShowBtnGap: 10,
    cardShowBtnTextFontSize: 16,
    cardViewerOverlayPadding: 24,
    cardViewerTitleFontSize: 22,
    cardViewerImageHeight: 320,
    cardViewerImageBorderRadius: 20,
    cardViewerCloseBtnMarginTop: 24,
    cardViewerCloseBtnPaddingVertical: 16,
    cardViewerCloseBtnPaddingHorizontal: 40,
    cardViewerCloseBtnBorderRadius: 16,
    cardViewerCloseTextFontSize: 18,
    cardIconContainerPadding: 16,
    cardIconContainerBorderRadius: 12,
    cardTitleFontSize: 18,
    cardSubtitleFontSize: 14,
  };

  // Select values based on device type
  const values = isTablet ? tabletValues : baseValues;

  // Calculate quickCard width based on screen width
  const quickCardWidth = (width - 52) / 2;

  // Adjust quickCard width for tablets (make it smaller relative to screen width)
  const adjustedQuickCardWidth = isTablet ? (width - 100) / 3 : quickCardWidth;

  const [todayClasses, setTodayClasses] = useState<LocalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [localCardFront, setLocalCardFront] = useState<string | null>(null);
  const [localCardBack, setLocalCardBack] = useState<string | null>(null);
  const [viewingCard, setViewingCard] = useState<"front" | "back" | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const today = new Date();
  const currentDayIndex = today.getDay();
  const firstName = user?.displayName?.split(" ")[0] || "Student";
  const currentGpa = backendUser?.cgpa ?? backendUser?.currentCGPA ?? 0;
  const earnedHours =
    backendUser?.completedHours ??
    backendUser?.earnedCreditHours ??
    backendUser?.totalEarnedHours ??
    0;
  const targetGpa = 4.0;
  const gpaProgress = targetGpa > 0 ? Math.min(currentGpa / targetGpa, 1) : 0;
  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: gpaProgress,
      useNativeDriver: false,
      tension: 60,
      friction: 8,
    }).start();
  }, [gpaProgress, progressAnim]);

  // Load today's schedule from DB & fallback to AsyncStorage
  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      let all: LocalEntry[] = [];
      let loadedFromDB = false;

      if (user) {
        try {
          const token = await user.getIdToken();
          const res = await fetch(`${API_URL}/api/schedule/my-timetable`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const json = await res.json();
          if (json.success && json.data?.entries) {
            all = json.data.entries.map((e: any) => {
              // Normalize dayOfWeek: numeric → day name
              let dayName = e.dayOfWeek;
              if (typeof dayName === "number") {
                dayName = DB_DAY_NAMES[dayName] || "Sunday";
              }
              return {
                id: e._id || Date.now() + Math.random(),
                subject: e.courseCode || e.courseName || "",
                type:
                  e.sessionType === "Lecture"
                    ? "Lec"
                    : e.sessionType === "Section"
                      ? "Sec"
                      : "Lab",
                day: dayName,
                slot: { start: e.startTime, end: e.endTime },
                group: e.groupNumber || "",
                place: e.location || "",
              };
            });
            loadedFromDB = true;
            await AsyncStorage.setItem(
              SCHEDULE_STORAGE_KEY,
              JSON.stringify(all),
            );
          }
        } catch (dbErr) {
          console.error("[HomePage] DB Load error:", dbErr);
        }
      }

      if (!loadedFromDB) {
        const saved = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);
        if (saved) {
          all = JSON.parse(saved);
        }
      }

      if (all.length > 0) {
        // We match by DB_DAY_NAMES or fallback to index.
        const todayDayNameEN = DB_DAY_NAMES[currentDayIndex];
        // In case old data is saved in Arabic.
        const allDaysAr = [
          "الأحد",
          "الإثنين",
          "الثلاثاء",
          "الأربعاء",
          "الخميس",
          "الجمعة",
          "السبت",
        ];
        const todayDayNameAR = allDaysAr[currentDayIndex];
        const todayEntries = all.filter(
          (e) => e.day === todayDayNameEN || e.day === todayDayNameAR,
        );
        todayEntries.sort((a, b) => a.slot.start.localeCompare(b.slot.start));
        setTodayClasses(todayEntries);
      } else {
        setTodayClasses([]);
      }
    } catch (err) {
      console.error("[HomePage] AsyncStorage load error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentDayIndex, user]);

  useFocusEffect(
    useCallback(() => {
      fetchSchedule();
      if (refreshProfile) {
        refreshProfile();
      }
      // Load local student card images
      AsyncStorage.getItem(STUDENT_CARD_FRONT_KEY).then((v) =>
        setLocalCardFront(v),
      );
      AsyncStorage.getItem(STUDENT_CARD_BACK_KEY).then((v) =>
        setLocalCardBack(v),
      );
    }, [fetchSchedule, refreshProfile]),
  );

  const getGreeting = () => {
    const h = today.getHours();
    if (h < 12) return "Good Morning,";
    if (h < 18) return "Good Afternoon,";
    return "Good Evening,";
  };

  const getDayDisplayName = () => {
    const arr = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
    return arr[(currentDayIndex + 1) % 7];
  };

  const getTotalCourses = () => todayClasses.length;

  const navigateToTimetable = () => router.push("/(tabs)/TimeTable" as any);

  const navigateToStudentCard = () => router.push("/(tabs)/StudentCard" as any);

  const navigateToGpa = () => router.push("/(tabs)/GpaPlanner" as any);
  const typeAccent: Record<string, string> = {
    Lec: colors.indigo,
    Sec: colors.teal,
    Lab: colors.amber,
  };

  s = createStyles(values, adjustedQuickCardWidth);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={{ alignItems: "flex-start" }}>
            <Text style={[s.greeting, { color: colors.textSecondary }]}>
              {getGreeting()} 👋
            </Text>
            <Text style={[s.userName, { color: colors.textPrimary }]}>
              {firstName}
            </Text>
            <Text style={[s.dateText, { color: colors.textMuted }]}>
              {todayStr}
            </Text>
          </View>
          <View
            style={[
              s.focusChip,
              { backgroundColor: colors.indigoPale, flexDirection: "row" },
            ]}
          >
            <MaterialCommunityIcons
              name="brain"
              size={14}
              color={colors.indigo}
            />
            <Text style={[s.focusChipText, { color: colors.indigo }]}>
              Deep Work
            </Text>
          </View>
        </View>

        {/* GPA Hero Card */}
        <TouchableOpacity
          style={[s.gpaCard, { backgroundColor: colors.indigo }]}
          activeOpacity={0.85}
          onPress={navigateToGpa}
        >
          <View style={s.gpaCardTop}>
            <View style={{ alignItems: "flex-start", flex: 1 }}>
              <Text style={s.gpaLabel}>GPA Overview</Text>
              <Text style={s.gpaValue}>{currentGpa.toFixed(2)}</Text>
              <Text style={s.gpaSubLabel}>Target {targetGpa.toFixed(1)}</Text>
            </View>
            <View style={[s.gpaBadge, { flexDirection: "row" }]}>
              <Feather name="award" size={20} color={colors.teal} />
              <Text style={s.gpaBadgeText}>Dean&apos;s List</Text>
            </View>
          </View>
          <View style={s.progressTrack}>
            <Animated.View
              style={[
                s.progressFill,
                {
                  backgroundColor: colors.teal,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
          <View style={[s.gpaCardFooter, { flexDirection: "row" }]}>
            <Text style={s.progressLabel}>
              {Math.round(gpaProgress * 100)}%
            </Text>
            <Text style={s.tapHint}>View Details -{">"}</Text>
          </View>
        </TouchableOpacity>

        {/* Stats */}
        <View style={[s.statsRow, { flexDirection: "row" }]}>
          <StatCard
            icon="book-open"
            label="Schedule"
            value={getTotalCourses().toString()}
            color={colors.indigo}
            bgColor={colors.indigoPale}
          />
          <StatCard
            icon="clock"
            label="Total Earned Hrs"
            value={earnedHours.toString()}
            color={colors.teal}
            bgColor={colors.tealLight}
          />
          <StatCard
            icon="trending-up"
            label="CGPA"
            value={currentGpa.toFixed(2)}
            color={colors.amber}
            bgColor={colors.amberLight}
            onPress={navigateToGpa}
          />
        </View>

        {/* Schedule */}
        <View style={[s.sectionHeader, { flexDirection: "row" }]}>
          <View style={{ alignItems: "flex-start", flex: 1 }}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
              Upcoming Classes
            </Text>
            <Text style={[s.sectionSub, { color: colors.textMuted }]}>
              {getDayDisplayName()}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.addButton, { backgroundColor: colors.indigo }]}
            onPress={navigateToTimetable}
          >
            <Feather name="plus" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={colors.indigo} />
            <Text style={[s.loadingText, { color: colors.textMuted }]}>
              ...
            </Text>
          </View>
        ) : todayClasses.length === 0 ? (
          <View
            style={[
              s.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="calendar" size={36} color={colors.indigoLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              No classes today
            </Text>
            <Text style={[s.emptySubtext, { color: colors.textMuted }]}>
              Enjoy your free time!
            </Text>
          </View>
        ) : (
          todayClasses.slice(0, 3).map((entry) => {
            const accent = typeAccent[entry.type] || colors.indigo;
            let displayType = entry.type;
            if (entry.type === "Lec") displayType = "Lecture";
            else if (entry.type === "Sec") displayType = "Section";
            else if (entry.type === "Lab") displayType = "Lab";
            return (
              <ScheduleItem
                key={entry.id}
                title={entry.subject}
                type={displayType}
                time={`${entry.slot.start} – ${entry.slot.end}`}
                place={entry.place || "TBD"}
                accentColor={accent}
                colors={colors}
                rowDir="row"
                alignText="left"
              />
            );
          })
        )}

        {/* Quick Actions */}
        <Text
          style={[
            s.sectionTitle,
            { marginTop: 24, marginBottom: 14, color: colors.textPrimary },
          ]}
        >
          Quick Actions
        </Text>
        <View style={[s.quickGrid, { flexDirection: "row" }]}>
          {[
            {
              icon: "calendar",
              label: "Schedule",
              color: colors.indigo,
              onPress: navigateToTimetable,
            },
            {
              icon: "pie-chart",
              label: "Planner",
              color: colors.teal,
              onPress: navigateToGpa,
            },
            {
              icon: "book",
              label: "Quizzes",
              color: colors.amber,
              onPress: () => router.push("/(tabs)/Questions" as any),
            },
            {
              icon: "code",
              label: "Coding",
              color: colors.green,
              onPress: () => router.push("/(tabs)/Coding" as any),
            },
          ].map(({ icon, label, color, onPress }) => (
            <TouchableOpacity
              key={label}
              style={[s.quickCard, { backgroundColor: color }]}
              activeOpacity={0.85}
              onPress={onPress}
            >
              <Feather name={icon as any} size={22} color="#fff" />
              <Text style={s.quickCardLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Student Card */}
        <Text
          style={[
            s.sectionTitle,
            { marginTop: 24, marginBottom: 14, color: colors.textPrimary },
          ]}
        >
          Student Card
        </Text>
        <View style={s.studentCardContainer}>
          {localCardFront || localCardBack ? (
            <View
              style={[s.studentCardWithPhoto, { backgroundColor: colors.card }]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={colors.teal}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.teal,
                    marginLeft: 6,
                    fontWeight: "600",
                  }}
                >
                  Saved on your device only
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {localCardFront && (
                  <TouchableOpacity
                    style={[
                      s.cardShowBtn,
                      { backgroundColor: colors.indigo, flex: 1 },
                    ]}
                    onPress={() => setViewingCard("front")}
                  >
                    <Feather name="credit-card" size={16} color="#fff" />
                    <Text style={s.cardShowBtnText}>Show Front</Text>
                  </TouchableOpacity>
                )}
                {localCardBack && (
                  <TouchableOpacity
                    style={[
                      s.cardShowBtn,
                      { backgroundColor: colors.teal, flex: 1 },
                    ]}
                    onPress={() => setViewingCard("back")}
                  >
                    <Feather name="credit-card" size={16} color="#fff" />
                    <Text style={s.cardShowBtnText}>Show Back</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  s.updateCardButton,
                  {
                    backgroundColor: colors.indigoPale,
                    flexDirection: "row",
                    marginTop: 10,
                  },
                ]}
                onPress={navigateToStudentCard}
              >
                <Feather name="edit-2" size={14} color={colors.indigo} />
                <Text
                  style={[s.updateCardButtonText, { color: colors.indigo }]}
                >
                  Update Card
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                s.studentCard,
                { backgroundColor: colors.card, flexDirection: "row" },
              ]}
              onPress={navigateToStudentCard}
            >
              <View
                style={[
                  s.cardIconContainer,
                  { backgroundColor: colors.indigoPale },
                ]}
              >
                <Ionicons name="card-outline" size={24} color={colors.indigo} />
              </View>
              <View style={{ alignItems: "flex-start", flex: 1 }}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                  Student Card
                </Text>
                <Text style={[s.cardSubtitle, { color: colors.textMuted }]}>
                  Save your ID card for quick access
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Card Viewer Modal */}
        <Modal visible={viewingCard !== null} transparent animationType="fade">
          <TouchableOpacity
            style={s.cardViewerOverlay}
            activeOpacity={1}
            onPress={() => setViewingCard(null)}
          >
            <View style={s.cardViewerContent}>
              <Text style={s.cardViewerTitle}>
                {viewingCard === "front" ? "Front Side" : "Back Side"}
              </Text>
              {viewingCard === "front" && localCardFront && (
                <Image
                  source={{ uri: localCardFront }}
                  style={s.cardViewerImage}
                  resizeMode="contain"
                />
              )}
              {viewingCard === "back" && localCardBack && (
                <Image
                  source={{ uri: localCardBack }}
                  style={s.cardViewerImage}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity
                style={s.cardViewerCloseBtn}
                onPress={() => setViewingCard(null)}
              >
                <Text style={s.cardViewerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  color,
  bgColor,
  onPress,
}: StatCardProps) => (
  <TouchableOpacity
    style={[s.statCard, { backgroundColor: bgColor }]}
    onPress={onPress}
    activeOpacity={onPress ? 0.75 : 1}
  >
    <View style={[s.statIconWrap, { backgroundColor: color + "20" }]}>
      <Feather name={icon} size={18} color={color} />
    </View>
    <Text style={[s.statValue, { color }]}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const ScheduleItem = ({
  title,
  type,
  time,
  place,
  accentColor,
  colors,
  rowDir,
  alignText,
}: ScheduleItemProps & { rowDir: any; alignText: any }) => (
  <View
    style={[
      s.scheduleItem,
      { backgroundColor: colors.card, flexDirection: "row" },
    ]}
  >
    <View style={s.scheduleContent}>
      <View style={[s.scheduleHeaderRow, { flexDirection: "row" }]}>
        <Text
          style={[s.scheduleTitle, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={[s.sessionBadge, { backgroundColor: accentColor + "18" }]}>
          <Text style={[s.sessionBadgeText, { color: accentColor }]}>
            {type}
          </Text>
        </View>
      </View>
      <View style={[s.scheduleDetails, { flexDirection: "row" }]}>
        <View style={[s.detailRow, { flexDirection: "row" }]}>
          <Feather name="clock" size={12} color={colors.textMuted} />
          <Text style={[s.detailText, { color: colors.textSecondary }]}>
            {time}
          </Text>
        </View>
        <View style={[s.detailRow, { flexDirection: "row" }]}>
          <Ionicons
            name="location-outline"
            size={12}
            color={colors.textMuted}
          />
          <Text style={[s.detailText, { color: colors.textSecondary }]}>
            {place}
          </Text>
        </View>
      </View>
    </View>
    <View style={[s.accentBar, { backgroundColor: accentColor }]} />
  </View>
);

const createStyles = (values: any, adjustedQuickCardWidth: number) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
      paddingHorizontal: values.paddingHorizontal,
      paddingTop: values.paddingTop,
      paddingBottom: values.paddingBottom,
    },
    header: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: values.headerMarginBottom,
    },
    greeting: {
      fontSize: values.greetingFontSize,
      fontWeight: "500",
    },
    userName: {
      fontSize: values.userNameFontSize,
      fontWeight: "800",
      marginTop: 2,
    },
    dateText: {
      fontSize: values.dateTextFontSize,
      marginTop: 2,
    },
    focusChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: values.focusChipPaddingHorizontal,
      paddingVertical: values.focusChipPaddingVertical,
      borderRadius: 20,
      gap: values.focusChipGap,
      marginTop: values.focusChipMarginTop,
    },
    focusChipText: {
      fontSize: values.focusChipTextFontSize,
      fontWeight: "600",
    },
    gpaCard: {
      borderRadius: values.gpaCardBorderRadius,
      padding: values.gpaCardPadding,
      marginBottom: values.gpaCardMarginBottom,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 8,
    },
    gpaCardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    },
    gpaLabel: {
      fontSize: values.gpaLabelFontSize,
      color: "rgba(255,255,255,0.75)",
      fontWeight: "600",
      letterSpacing: 0.5,
    },
    gpaValue: {
      fontSize: values.gpaValueFontSize,
      fontWeight: "900",
      color: "#fff",
      lineHeight: 54,
      marginTop: 2,
    },
    gpaSubLabel: {
      fontSize: values.gpaSubLabelFontSize,
      color: "rgba(255,255,255,0.6)",
      marginTop: 2,
    },
    gpaBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 20,
      paddingHorizontal: values.gpaBadgePaddingHorizontal,
      paddingVertical: values.gpaBadgePaddingVertical,
      gap: values.gpaBadgeGap,
    },
    gpaBadgeText: {
      color: "#fff",
      fontSize: values.gpaBadgeTextFontSize,
      fontWeight: "700",
    },
    progressTrack: {
      height: values.progressTrackHeight,
      backgroundColor: "rgba(255,255,255,0.25)",
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: 10,
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
    },
    gpaCardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressLabel: {
      fontSize: values.progressLabelFontSize,
      color: "rgba(255,255,255,0.7)",
    },
    tapHint: {
      fontSize: values.tapHintFontSize,
      color: "rgba(255,255,255,0.85)",
      fontWeight: "600",
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: values.statsRowMarginBottom,
    },
    statCard: {
      width: values.statCardWidth,
      padding: values.statCardPadding,
      borderRadius: values.statCardBorderRadius,
      alignItems: "center",
    },
    statIconWrap: {
      width: values.statIconWrapWidth,
      height: values.statIconWrapHeight,
      borderRadius: values.statIconWrapBorderRadius,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: values.statIconWrapMarginBottom,
    },
    statValue: {
      fontSize: values.statValueFontSize,
      fontWeight: "800",
      marginBottom: 2,
    },
    statLabel: {
      fontSize: values.statLabelFontSize,
      color: "#94A3B8",
      fontWeight: "500",
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: values.sectionHeaderMarginBottom,
    },
    sectionTitle: {
      fontSize: values.sectionTitleFontSize,
      fontWeight: "700",
    },
    sectionSub: {
      fontSize: values.sectionSubFontSize,
      marginTop: 1,
    },
    addButton: {
      width: values.addButtonWidth,
      height: values.addButtonHeight,
      borderRadius: values.addButtonBorderRadius,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingContainer: {
      alignItems: "center",
      paddingVertical: values.loadingContainerPaddingVertical,
    },
    loadingText: {
      marginTop: values.loadingTextMarginTop,
      fontSize: values.loadingTextFontSize,
    },
    emptyCard: {
      alignItems: "center",
      paddingVertical: values.emptyCardPaddingVertical,
      borderRadius: values.emptyCardBorderRadius,
      marginBottom: values.emptyCardMarginBottom,
      borderWidth: 1,
    },
    emptyText: {
      fontSize: values.emptyTextFontSize,
      fontWeight: "600",
      marginTop: 12,
    },
    emptySubtext: {
      fontSize: values.emptySubtextFontSize,
      marginTop: 4,
    },
    scheduleItem: {
      borderRadius: values.scheduleItemBorderRadius,
      flexDirection: "row",
      marginBottom: values.scheduleItemMarginBottom,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: values.scheduleItemShadowOpacity,
      shadowRadius: values.scheduleItemShadowRadius,
      elevation: 2,
    },
    accentBar: {
      width: values.accentBarWidth,
    },
    scheduleContent: {
      flex: 1,
      padding: values.scheduleContentPadding,
    },
    scheduleHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: values.scheduleHeaderRowMarginBottom,
    },
    scheduleTitle: {
      fontSize: values.scheduleTitleFontSize,
      fontWeight: "700",
      flex: 1,
      marginLeft: 8,
    },
    scheduleCode: {
      fontSize: values.scheduleCodeFontSize,
      marginBottom: 8,
    },
    sessionBadge: {
      paddingHorizontal: values.sessionBadgePaddingHorizontal,
      paddingVertical: values.sessionBadgePaddingVertical,
      borderRadius: values.sessionBadgeBorderRadius,
    },
    sessionBadgeText: {
      fontSize: values.sessionBadgeTextFontSize,
      fontWeight: "700",
    },
    scheduleDetails: {
      flexDirection: "row",
      gap: values.scheduleDetailsGap,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: values.detailRowGap,
    },
    detailText: {
      fontSize: values.detailTextFontSize,
    },
    quickGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: values.quickGridGap,
      marginBottom: values.quickGridMarginBottom,
    },
    quickCard: {
      width: adjustedQuickCardWidth,
      paddingVertical: values.quickCardPaddingVertical,
      paddingHorizontal: values.quickCardPaddingHorizontal,
      borderRadius: values.quickCardBorderRadius,
      alignItems: "flex-start",
      gap: 10,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: values.quickCardShadowOpacity,
      shadowRadius: values.quickCardShadowRadius,
      elevation: 5,
    },
    quickCardLabel: {
      fontSize: values.quickCardLabelFontSize,
      fontWeight: "700",
      color: "#fff",
    },
    studentCardContainer: {
      marginBottom: values.studentCardContainerMarginBottom,
    },
    studentCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: values.studentCardPadding,
      borderRadius: values.studentCardBorderRadius,
      gap: values.studentCardGap,
      shadowColor: "#000",
      shadowOpacity: values.studentCardShadowOpacity,
      shadowRadius: values.studentCardShadowRadius,
      elevation: 2,
    },
    studentCardWithPhoto: {
      borderRadius: 16,
      padding: values.studentCardWithPhotoPadding,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    studentCardImage: {
      width: "100%",
      height: values.studentCardImageHeight,
      borderRadius: values.studentCardImageBorderRadius,
      resizeMode: "cover",
      marginBottom: 12,
    },
    updateCardButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: values.updateCardButtonPaddingVertical,
      borderRadius: values.updateCardButtonBorderRadius,
      gap: values.updateCardButtonGap,
    },
    updateCardButtonText: {
      fontSize: values.updateCardButtonTextFontSize,
      fontWeight: "600",
    },
    cardShowBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: values.cardShowBtnPaddingVertical,
      borderRadius: values.cardShowBtnBorderRadius,
      gap: values.cardShowBtnGap,
    },
    cardShowBtnText: {
      color: "#fff",
      fontSize: values.cardShowBtnTextFontSize,
      fontWeight: "700",
    },
    cardViewerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.85)",
      justifyContent: "center",
      alignItems: "center",
      padding: values.cardViewerOverlayPadding,
    },
    cardViewerContent: {
      width: "100%",
      alignItems: "center",
    },
    cardViewerTitle: {
      color: "#fff",
      fontSize: values.cardViewerTitleFontSize,
      fontWeight: "700",
      marginBottom: 16,
    },
    cardViewerImage: {
      width: "100%",
      height: values.cardViewerImageHeight,
      borderRadius: values.cardViewerImageBorderRadius,
    },
    cardViewerCloseBtn: {
      marginTop: values.cardViewerCloseBtnMarginTop,
      paddingVertical: values.cardViewerCloseBtnPaddingVertical,
      paddingHorizontal: values.cardViewerCloseBtnPaddingHorizontal,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: values.cardViewerCloseBtnBorderRadius,
    },
    cardViewerCloseText: {
      color: "#fff",
      fontSize: values.cardViewerCloseTextFontSize,
      fontWeight: "600",
    },
    cardIconContainer: {
      padding: values.cardIconContainerPadding,
      borderRadius: values.cardIconContainerBorderRadius,
    },
    cardTitle: {
      fontSize: values.cardTitleFontSize,
      fontWeight: "700",
    },
    cardSubtitle: {
      fontSize: values.cardSubtitleFontSize,
      marginTop: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    modalHandleBar: {
      width: 38,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 16,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
    },
    modalScroll: { flex: 1 },
    inputLabel: {
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 8,
      marginTop: 14,
    },
    modalInput: {
      borderWidth: 1.5,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    col: { flex: 1 },
    pickerRow: { flexDirection: "row", marginBottom: 4 },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 22,
      marginRight: 8,
      borderWidth: 1.5,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "500",
    },
    modalActions: {
      paddingTop: 14,
      borderTopWidth: 1,
    },
    saveButton: {
      paddingVertical: 15,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 10,
    },
    saveButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
    addClassModalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: "82%",
      padding: 20,
    },
  });

export default HomeScreen;
