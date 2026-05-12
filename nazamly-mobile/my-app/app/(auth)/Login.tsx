import { useState, useEffect, useCallback } from "react";
import {
  TouchableOpacity,
  ScrollView,
  View,
  Text,
  Alert,
  Pressable,
  Platform,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/constants/theme';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, API_URL, GOOGLE_WEB_CLIENT_ID, Google_Android_Id } from "@/firebase";

const getProfile = async (token: string) => {
  const res = await fetch(`${API_URL}/api/auth/get-profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
};
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setBackendUser } = useAuth();
  const { colors } = useAppTheme();


  // 🌟 إعداد OAuth للموبايل (Expo Go / React Native)
  const redirectUri = makeRedirectUri({
    scheme: "nazamly",
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: Google_Android_Id,
    redirectUri,
  });

  useEffect(() => {
    if (request) {
      console.log("[Login] Google OAuth redirectUri:", redirectUri);
    }
  }, [request, redirectUri]);

  // 🌟 جلب بيانات المستخدم من الباك إند
  const fetchUserProfile = useCallback(async (user: any) => {
    try {
      const token = await user.getIdToken();
      const response = await getProfile(token);

      if (response.success && response.data) {
        console.log("[Login] Profile fetched successfully:", response.data);
        setBackendUser(response.data);
        return response.data;
      } else {
        console.error("[Login] Failed to fetch profile:", response);
      }
    } catch (error) {
      console.error("[Login] Error fetching profile:", error);
    }
  }, [setBackendUser]);

  // 🌟 معالجة استجابة OAuth للموبايل
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      console.log("[Login] Mobile OAuth - id_token received:", id_token ? "yes" : "no");
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(async (result) => {

          await fetchUserProfile(result.user);
          Alert.alert("Success", "Logged in"); // Can omit translations for alerts or add to dict
          router.replace("/(tabs)/HomePage");
        })
        .catch((error: any) => {
          console.error("[Login] Firebase signIn error:", error.code, error.message);
          Alert.alert("Error", error.message || "Login failed");
        })
        .finally(() => setLoading(false));
    }
  }, [response, router, fetchUserProfile]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      await fetchUserProfile(result.user);
      router.replace("/(tabs)/HomePage");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Login failed",
      );
    } finally {
      setLoading(false);
    }
  };

  // 🌟 دالة تسجيل الدخول بجوجل للويب
  const handleGoogleWebLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      // 🌟 السطر السحري لإجبار جوجل على إظهار شاشة اختيار الحساب في كل مرة
      provider.setCustomParameters({ prompt: "select_account" });

      // الدالة دي هتفتح شاشة منبثقة (Popup) وتمنع الشاشة البيضاء اللي بتعلق
      const result = await signInWithPopup(auth, provider);

      await fetchUserProfile(result.user);

      router.replace("/(tabs)/HomePage");
    } catch (error: any) {
      console.error("[Login] Google Web Sign-in Error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 دالة تسجيل الدخول بجوجل للموبايل (Expo Go / React Native)
  const handleGoogleMobileLogin = () => {
    promptAsync();
  };

  // 🌟 اختيار الدالة المناسبة حسب المنصة
  const handleGoogleSignIn = Platform.OS === 'web'
    ? handleGoogleWebLogin
    : handleGoogleMobileLogin;

  const notRegistered = () => {
    router.push("/(auth)/Register");
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      {Platform.OS === 'web' && (
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Hero Section with App Icon */}
          <View style={s.heroSection}>
            <Image
              source={require('@/assets/images/Logo design for a mo.png')}
              style={{ width: 100, height: 100, borderRadius: 24, marginBottom: 24 }}
              resizeMode="contain"
            />
            <Text style={[s.welcomeText, { color: colors.textPrimary }]}>Welcome Back</Text>
            <Text style={[s.subtitleText, { color: colors.textMuted }]}>Log in to continue organizing your academic life</Text>
          </View>

          {/* Login Form Card */}
          <View style={[s.formCard, { backgroundColor: colors.card }]}>

            {/* Email Input */}
            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Email</Text>
              <View style={[s.inputContainer, { backgroundColor: colors.bg, borderColor: colors.border, flexDirection: 'row' }]}>
                <Feather name="mail" size={20} color={colors.textMuted} style={{ marginRight: 12 }} />
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

            {/* Password Input */}
            <View style={s.inputGroup}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Password</Text>
              <View style={[s.inputContainer, { backgroundColor: colors.bg, borderColor: colors.border, flexDirection: 'row' }]}>
                <Feather name="lock" size={20} color={colors.textMuted} style={{ marginRight: 12 }} />
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

            {/* Login Button */}
            <TouchableOpacity
              style={[s.loginButton, { backgroundColor: colors.indigo }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={[s.dividerContainer, { flexDirection: 'row' }]}>
              <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[s.dividerText, { color: colors.textMuted }]}>Or</Text>
              <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Google Sign In Button - Black with Colored Logo */}
            <TouchableOpacity
              style={[s.googleButton, { flexDirection: 'row' }]}
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

          {/* Footer */}
          <View style={[s.footer, { flexDirection: 'row' }]}>
            <Text style={[s.footerText, { color: colors.textMuted }]}>
              Don&apos;t have an account?
            </Text>
            <Pressable onPress={notRegistered}>
              <Text style={[s.footerLink, { color: colors.indigo }]}>Sign up now</Text>
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
    marginTop: 40,
    marginBottom: 40,
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
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    alignItems: 'center',
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
    fontWeight: '400',
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#3F51B5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dividerContainer: {
    alignItems: 'center',
    marginVertical: 28,
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
