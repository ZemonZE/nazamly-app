import { useState, useCallback } from "react";
import {
  TextInput,
  TouchableOpacity,
  ScrollView,
  Text,
  Alert,
  Pressable,
  View,
  Platform,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "@/constants/theme";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithCredential,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  auth,
  API_URL,
} from "@/firebase";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

const getProfile = async (token: string) => {
  const res = await fetch(`${API_URL}/api/auth/get-profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

const syncUser = async (token: string) => {
  const res = await fetch(`${API_URL}/api/auth/sync-user`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setBackendUser } = useAuth();
  const { colors } = useAppTheme();

  const syncWithBackend = useCallback(
    async (user: any) => {
      try {
        console.log("[Register] Getting fresh token for sync...");
        const token = await user.getIdToken(true);

        console.log("[Register] Calling syncUser...");
        const response = await syncUser(token);
        console.log("[Register] Sync response:", response);

        if (response.message === "unauthorized") {
          Alert.alert("Cancel", "Cancel");
          router.replace("/(auth)/Login");
          return null;
        }

        return response;
      } catch (error: any) {
        console.error("[Register] Sync error:", error);
        throw error;
      }
    },
    [router],
  );

  const fetchUserProfile = useCallback(
    async (user: any) => {
      try {
        const token = await user.getIdToken();
        const response = await getProfile(token);

        if (response.success && response.data) {
          console.log(
            "[Register] Profile fetched successfully:",
            response.data,
          );
          setBackendUser(response.data);
          return response.data;
        } else {
          console.error("[Register] Failed to fetch profile:", response);
        }
      } catch (error) {
        console.error("[Register] Error fetching profile:", error);
      }
    },
    [setBackendUser],
  );

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(result.user, { displayName: name });
      await result.user.reload();
      await syncWithBackend(result.user);
      await fetchUserProfile(result.user);

      Alert.alert("Success", "Account created successfully");
      router.replace("/(tabs)/HomePage");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;

    if (Platform.OS === "web") {
      await handleGoogleWebSignIn();
      return;
    }

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const signInResult = await GoogleSignin.signIn();

      let idToken;
      if ((signInResult as any).data?.idToken) {
        idToken = (signInResult as any).data.idToken;
      } else if ((signInResult as any).idToken) {
        idToken = (signInResult as any).idToken;
      } else {
        throw new Error("No ID token found");
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, googleCredential);

      await syncWithBackend(result.user);
      await fetchUserProfile(result.user);

      Alert.alert("Success", "Account created successfully");
      router.replace("/(tabs)/HomePage");
    } catch (error: any) {
      console.error("[Register] Google Sign-In Error:", error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("[Register] User cancelled Google Sign-In");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log("[Register] Google Sign-In already in progress");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Error", "Google Play Services not available");
      } else {
        Alert.alert("Error", error.message || "Failed to sign up with Google");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleWebSignIn = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      await syncWithBackend(result.user);
      await fetchUserProfile(result.user);
      Alert.alert("Success", "Account created successfully");
      router.replace("/(tabs)/HomePage");
    } catch (error: any) {
      console.error("[Register] Google Web Sign-in Error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.push("/(auth)/Login");
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      {Platform.OS === "web" && (
        <style type="text/css">{`
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus, 
          input:-webkit-autofill:active {
              -webkit-box-shadow: 0 0 0 30px ${colors.bg} inset !important;
              -webkit-text-fill-color: ${colors.textPrimary} !important;
              font-family: inherit !important;
          }
        `}</style>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.heroSection}>
            <Image
              source={require("@/assets/images/Logo design for a mo.png")}
              style={{
                width: 100,
                height: 100,
                borderRadius: 24,
                marginBottom: 24,
              }}
              resizeMode="contain"
            />
            <Text style={[s.welcomeText, { color: colors.textPrimary }]}>
              Create Account
            </Text>
            <Text style={[s.subtitleText, { color: colors.textMuted }]}>
              Join Nazamly and take control of your study schedule
            </Text>
          </View>

          <View style={[s.formCard, { backgroundColor: colors.card }]}>
            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>
                Full Name
              </Text>
              <View
                style={[
                  s.inputContainer,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    flexDirection: "row",
                  },
                ]}
              >
                <Feather
                  name="user"
                  size={20}
                  color={colors.textMuted}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={[s.textInput, { color: colors.textPrimary }]}
                  placeholder="Full Name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>
                Email
              </Text>
              <View
                style={[
                  s.inputContainer,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    flexDirection: "row",
                  },
                ]}
              >
                <Feather
                  name="mail"
                  size={20}
                  color={colors.textMuted}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={[s.textInput, { color: colors.textPrimary }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>
                Password
              </Text>
              <View
                style={[
                  s.inputContainer,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    flexDirection: "row",
                  },
                ]}
              >
                <Feather
                  name="lock"
                  size={20}
                  color={colors.textMuted}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={[s.textInput, { color: colors.textPrimary }]}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={s.eyeIcon}
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>
                Confirm Password
              </Text>
              <View
                style={[
                  s.inputContainer,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    flexDirection: "row",
                  },
                ]}
              >
                <Feather
                  name="lock"
                  size={20}
                  color={colors.textMuted}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={[s.textInput, { color: colors.textPrimary }]}
                  placeholder="Confirm Password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[s.registerButton, { backgroundColor: colors.teal }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.registerButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={[s.dividerContainer, { flexDirection: "row" }]}>
              <View
                style={[s.dividerLine, { backgroundColor: colors.border }]}
              />
              <Text style={[s.dividerText, { color: colors.textMuted }]}>
                Or
              </Text>
              <View
                style={[s.dividerLine, { backgroundColor: colors.border }]}
              />
            </View>

            <TouchableOpacity
              style={[s.googleButton, { flexDirection: "row" }]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Image
                source={require("@/assets/images/google.png")}
                style={s.googleLogo}
                resizeMode="contain"
              />
              <Text style={s.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={[s.footer, { flexDirection: "row" }]}>
            <Text style={[s.footerText, { color: colors.textMuted }]}>
              Already have an account?
            </Text>
            <Pressable onPress={goToLogin}>
              <Text style={[s.footerLink, { color: colors.teal }]}>
                Log in now
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 36,
  },
  appIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
  },
  formCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputContainer: {
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginLeft: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
  },
  eyeIcon: {
    padding: 4,
  },
  registerButton: {
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#26A69A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  dividerContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: "500",
    marginHorizontal: 16,
  },
  googleButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    backgroundColor: "#000",
    borderRadius: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  googleLogo: {
    width: 24,
    height: 24,
  },
  googleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
    fontWeight: "400",
  },
  footerLink: {
    fontSize: 15,
    fontWeight: "700",
  },
});
