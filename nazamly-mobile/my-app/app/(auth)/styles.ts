import { StyleSheet } from "react-native";

// ── Design tokens (matching web glassmorphism theme) ──
const C = {
  bgDeep: "#061a10",
  bgCard: "rgba(10, 36, 22, 0.85)",
  green700: "#0d7a44",
  green500: "#16a85e",
  green400: "#22c874",
  green300: "#5ee09a",
  glassBorder: "rgba(34, 200, 116, 0.18)",
  glassStrong: "rgba(34, 200, 116, 0.08)",
  inputBg: "rgba(255, 255, 255, 0.06)",
  inputBorder: "rgba(34, 200, 116, 0.20)",
  inputFocusBorder: "#16a85e",
  textPrimary: "#e8f9f0",
  textSecondary: "#a3c9b4",
  textMuted: "#5a8a6e",
  white: "#ffffff",
  error: "#f87171",
};

const Style = StyleSheet.create({
  // ── Screen background ──
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingBottom: 40,
    backgroundColor: C.bgDeep,
  },

  // ── Header banner ──
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.glassBorder,
    marginBottom: 28,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: C.green400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    borderRadius: 24,
  },

  // ── Brand ──
  brandName: {
    fontSize: 30,
    fontWeight: "800",
    color: C.green400,
    marginBottom: 4,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: C.textMuted,
    marginTop: 2,
  },

  // ── Page label (Login / Register) ──
  pageLabel: {
    fontSize: 12,
    color: C.textMuted,
    letterSpacing: 0.5,
  },

  // ── Section title ──
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },

  // ── Input label ──
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
  },

  // ── Input field ──
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 15,
    color: C.textPrimary,
  },

  // ── Show password toggle ──
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  switchLabel: {
    fontSize: 13,
    color: C.textSecondary,
  },

  // ── Primary button ──
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: C.green700,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
    overflow: "hidden",
  },
  buttonGradientBg: {
    backgroundColor: C.green500,
  },
  buttonText: {
    color: C.white,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Divider ──
  orText: {
    textAlign: "center",
    marginVertical: 18,
    fontSize: 13,
    color: C.textMuted,
    letterSpacing: 0.5,
  },
  dividerLine: {
    height: 1,
    flex: 1,
    backgroundColor: C.glassBorder,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 18,
  },

  // ── Google button ──
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.glassBorder,
    borderRadius: 14,
    gap: 12,
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  googleText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textSecondary,
  },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: C.textMuted,
  },
  link: {
    color: C.green400,
    fontWeight: "700",
    fontSize: 14,
  },

  // ── Tags (onboarding chips) ──
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 32,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.glassStrong,
    borderWidth: 1,
    borderColor: C.glassBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  tagDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green400,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
  },
});

export default Style;