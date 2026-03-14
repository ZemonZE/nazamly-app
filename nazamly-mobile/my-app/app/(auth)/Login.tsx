import { useState, useEffect } from "react";
import {
  TouchableOpacity,
  ScrollView,
  View,
  Text,
  Alert,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import styles from "./styles";
import Email_input from "@/components/ui/Email_input";
import Password_input from "@/components/ui/Password_input";
import Google_pressable from "@/components/ui/Google_pressable";
import Show_toggle from "@/components/ui/Show_toggle";
import Header from "@/components/ui/Header";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, API_URL, GOOGLE_WEB_CLIENT_ID } from "@/firebase";
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

  // 🌟 إعداد OAuth للموبايل (Expo Go / React Native)
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
      console.log("[Login] Google OAuth redirectUri:", redirectUri);
    }
  }, [request, redirectUri]);

  const syncWithBackend = async (user: any) => {
    const token = await user.getIdToken();
    const res = await fetch(`${API_URL}/api/auth/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        Alert.alert("Failed", "You are not authorized to login");
        router.replace("/(auth)/Login");
        return;
      }
      console.error("[Login] /api/auth/sync failed:", res.status, body);
    }
    return body;
  };

  // 🌟 جلب بيانات المستخدم من الباك إند
  const fetchUserProfile = async (user: any) => {
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
        console.log("[Login] Profile fetched successfully:", body.data);
        setBackendUser(body.data);
        return body.data;
      } else {
        console.error("[Login] Failed to fetch profile:", body);
      }
    } catch (error) {
      console.error("[Login] Error fetching profile:", error);
    }
  };

  // 🌟 معالجة استجابة OAuth للموبايل
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      console.log("[Login] Mobile OAuth - id_token received:", id_token ? "yes" : "no");
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(async (result) => {
          await syncWithBackend(result.user);
          await fetchUserProfile(result.user);
          Alert.alert("Success", "Login successfully");
          router.replace("/(tabs)/HomePage");
        })
        .catch((error: any) => {
          console.error("[Login] Firebase signIn error:", error.code, error.message);
          Alert.alert("Failed", error.message || "Google sign-in failed");
        })
        .finally(() => setLoading(false));
    }
  }, [response, router]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncWithBackend(result.user);
      await fetchUserProfile(result.user);
      Alert.alert("Success", "Login successfully");
      router.replace("/(tabs)/HomePage");
    } catch (error: any) {
      Alert.alert(
        "Failed",
        error.message || "Failed to login, check your data",
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
      await syncWithBackend(result.user);
      await fetchUserProfile(result.user);

      Alert.alert("Success", "Login successfully");
      router.replace("/(tabs)/HomePage");
    } catch (error: any) {
      console.error("[Login] Google Web Sign-in Error:", error);
      Alert.alert("Failed", error.message || "Google sign-in failed");
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
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Header />

      <View style={{ alignItems: "center", marginBottom: 20, marginTop: 4 }}>
        <Text style={styles.brandName}>Nazamly</Text>
        <Text style={styles.pageLabel}>Login</Text>
      </View>

      <Email_input email={email} setEmail={setEmail} />

      <Password_input
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
      />

      <Show_toggle
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />

      <TouchableOpacity
        style={[styles.button, styles.buttonGradientBg]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {loading ? "Loading..." : "Login"}
        </Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={{ color: "#5a8a6e", fontSize: 13 }}>Or Continue With</Text>
        <View style={styles.dividerLine} />
      </View>

      <Google_pressable onPress={handleGoogleSignIn} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{"Don't have an account?  "}</Text>
        <Pressable onPress={notRegistered}>
          <Text style={styles.link}>Register</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

