import { useState, useEffect, useCallback } from "react";
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
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/constants/theme';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithCredential,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, API_URL, GOOGLE_WEB_CLIENT_ID } from "@/firebase";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

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

  const redirectUri = makeRedirectUri({
    scheme: "nazamly",
    path: "redirect",
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (request) {
      console.log("[Register] Google OAuth redirectUri:", redirectUri);
    }
  }, [request, redirectUri]);

  const syncWithBackend = useCallback(async (user: any) => {
    try {
      console.log("[Register] Getting fresh token for sync...");
      const token = await user.getIdToken(true);
      
      console.log("[Register] Calling /api/auth/sync...");
      const res = await fetch(`${API_URL}/api/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log("[Register] Sync response status:", res.status);
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("[Register] Non-JSON response from sync");
        throw new Error("Invalid response from server");
      }
      
      const body = await res.json();
      console.log("[Register] Sync response:", body);
      
      if (!res.ok) {
        if (res.status === 401) {
          Alert.alert("Failed", "You are not authorized to register");
          router.replace("/(auth)/Login");
          return null;
        }
        throw new Error(body.message || "Failed to sync with backend");
      }
      
      return body;
    } catch (error: any) {
      console.error("[Register] Sync error:", error);
      throw error;
    }
  }, [router]);

  const fetchUserProfile = useCallback(async (user: any) => {
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/auth/get-profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const body = await res.json();
      
      if (res.ok && body.success) {
        console.log("[Register] Profile fetched successfully:", body.data);
        setBackendUser(body.data);
        return body.data;
      } else {
        console.error("[Register] Failed to fetch profile:", body);
      }
    } catch (error) {
      console.error("[Register] Error fetching profile:", error);
    }
  }, [setBackendUser]);

  useEffect(() => {
    console.log("[Register] AuthSession response:", JSON.stringify(response, null, 2));
    if (response?.type === "success") {
      const { id_token } = response.params;
      console.log("[Register] id_token received:", id_token ? "yes" : "no");
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(async (result) => {
          await syncWithBackend(result.user);
          await fetchUserProfile(result.user);
          Alert.alert("Success", "Registration successful");
          router.replace("/(tabs)/HomePage");
        })
        .catch((error: any) => {
          console.error("[Register] Firebase signIn error:", error.code, error.message);
          Alert.alert("Failed", error.message || "Google sign-in failed");
        })
        .finally(() => setLoading(false));
    }
  }, [response, router, syncWithBackend, fetchUserProfile]);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Failed", "Passwords do not match", [
        { text: "Ok", onPress: () => console.log("ok") },
        { text: "Try again", onPress: () => router.reload() },
      ]);
      return;
    }
    
    setLoading(true);
    try {
      console.log("[Register] Creating user with email:", email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log("[Register] Firebase user created:", result.user.uid);
      
      await updateProfile(result.user, { displayName: name });
      console.log("[Register] Firebase profile updated with name:", name);
      
      await result.user.reload();
      await result.user.getIdToken(true);
      console.log("[Register] Token refreshed with updated profile");
      
      console.log("[Register] Syncing with backend...");
      const syncResult = await syncWithBackend(result.user);
      console.log("[Register] Sync result:", syncResult);
      
      console.log("[Register] Fetching profile from backend...");
      await fetchUserProfile(result.user);
      
      Alert.alert("Success", "Registration successful");
      router.replace("/(tabs)/HomePage");
    } catch (error: any) {
      console.error("[Register] Error:", error);
      Alert.alert("Failed", error.message || "Registration failed");
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
      Alert.alert("Success", "Registration successful");
      router.replace("/(tabs)/HomePage");
    } catch (error: any) {
      console.error("[Register] Google Web Sign-in Error:", error);
      Alert.alert("Failed", error.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleMobileSignIn = () => {
    promptAsync();
  };

  const handleGoogleSignIn = Platform.OS === 'web' 
    ? handleGoogleWebSignIn 
    : handleGoogleMobileSignIn;

  const goToLogin = () => {
    router.push("/(auth)/Login");
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={s.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <View style={s.heroSection}>
            <View style={[s.appIconContainer, { backgroundColor: colors.teal }]}>
              <MaterialCommunityIcons name="account-plus" size={56} color="#fff" />
            </View>
            <Text style={[s.welcomeText, { color: colors.textPrimary }]}>Join Nazamly</Text>
            <Text style={[s.subtitleText, { color: colors.textMuted }]}>Create your account to get started</Text>
          </View>

          <View style={[s.formCard, { backgroundColor: colors.card }]}>
            
            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Full Name</Text>
              <View style={[s.inputContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Feather name="user" size={20} color={colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.textInput, { color: colors.textPrimary }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Email</Text>
              <View style={[s.inputContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Feather name="mail" size={20} color={colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.textInput, { color: colors.textPrimary }]}
                  placeholder="Enter your email"
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
              <Text style={[s.label, { color: colors.textSecondary }]}>Password</Text>
              <View style={[s.inputContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Feather name="lock" size={20} color={colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.textInput, { color: colors.textPrimary }]}
                  placeholder="Create a password"
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
              <Text style={[s.label, { color: colors.textSecondary }]}>Confirm Password</Text>
              <View style={[s.inputContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Feather name="lock" size={20} color={colors.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.textInput, { color: colors.textPrimary }]}
                  placeholder="Confirm your password"
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
                <Text style={s.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={s.dividerContainer}>
              <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[s.dividerText, { color: colors.textMuted }]}>or</Text>
              <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={s.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Image 
                source={require('@/assets/images/google.png')} 
                style={s.googleLogo}
                resizeMode="contain"
              />
              <Text style={s.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

          </View>

          <View style={s.footer}>
            <Text style={[s.footerText, { color: colors.textMuted }]}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={goToLogin}>
              <Text style={[s.footerLink, { color: colors.teal }]}>Sign In</Text>
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
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 36,
  },
  appIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  formCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
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
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  eyeIcon: {
    padding: 4,
  },
  registerButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#26A69A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: '#000',
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '400',
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '700',
  },
});
