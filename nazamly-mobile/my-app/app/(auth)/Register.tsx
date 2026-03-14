import { useState, useEffect } from "react";
import {
  TextInput,
  TouchableOpacity,
  ScrollView,
  Text,
  Alert,
  Pressable,
  View,
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
      console.log("[Register] Google OAuth redirectUri:", redirectUri);
    }
  }, [request, redirectUri]);

  const syncWithBackend = async (user: any) => {
    try {
      console.log("[Register] Getting fresh token for sync...");
      const token = await user.getIdToken(true); // Force refresh
      
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
        console.log("[Register] Profile fetched successfully:", body.data);
        setBackendUser(body.data);
        return body.data;
      } else {
        console.error("[Register] Failed to fetch profile:", body);
      }
    } catch (error) {
      console.error("[Register] Error fetching profile:", error);
    }
  };

  useEffect(() => {
    console.log(
      "[Register] AuthSession response:",
      JSON.stringify(response, null, 2),
    );
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
          console.error(
            "[Register] Firebase signIn error:",
            error.code,
            error.message,
          );
          Alert.alert("Failed", error.message || "Google sign-in failed");
        })
        .finally(() => setLoading(false));
    }
  }, [response, router]);

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
      
      // 1. Create Firebase user
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      console.log("[Register] Firebase user created:", result.user.uid);
      
      // 2. Update Firebase profile with display name
      await updateProfile(result.user, { displayName: name });
      console.log("[Register] Firebase profile updated with name:", name);
      
      // 3. Force token refresh to include updated profile
      await result.user.reload();
      const freshToken = await result.user.getIdToken(true);
      console.log("[Register] Token refreshed with updated profile");
      
      // 4. Sync with backend (creates user in MongoDB)
      console.log("[Register] Syncing with backend...");
      const syncResult = await syncWithBackend(result.user);
      console.log("[Register] Sync result:", syncResult);
      
      // 5. Fetch complete profile from backend
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

  // 🌟 دالة تسجيل الدخول بجوجل للويب
  const handleGoogleWebSignIn = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      // 🌟 السطر السحري لإجبار جوجل على إظهار شاشة اختيار الحساب في كل مرة
      provider.setCustomParameters({ prompt: "select_account" });

      // الدالة دي هتفتح شاشة منبثقة (Popup) وتمنع الشاشة البيضاء اللي بتعلق
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

  // 🌟 دالة تسجيل الدخول بجوجل للموبايل (Expo Go / React Native)
  const handleGoogleMobileSignIn = () => {
    promptAsync();
  };

  // 🌟 اختيار الدالة المناسبة حسب المنصة
  const handleGoogleSignIn = Platform.OS === 'web' 
    ? handleGoogleWebSignIn 
    : handleGoogleMobileSignIn;

  const goToLogin = () => {
    router.push("/(auth)/Login");
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Header />

      <View style={{ alignItems: "center", marginBottom: 20, marginTop: 4 }}>
        <Text style={styles.brandName}>Nazamly</Text>
        <Text style={styles.pageLabel}>Register</Text>
      </View>

      <Text style={styles.inputLabel}>Full Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Your full name"
        placeholderTextColor="#5a8a6e"
        value={name}
        onChangeText={setName}
      />

      <Email_input email={email} setEmail={setEmail} />

      <Password_input
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        label="Password"
      />

      <Password_input
        password={confirmPassword}
        setPassword={setConfirmPassword}
        showPassword={showPassword}
        label="Confirm Password"
      />

      <Show_toggle
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />

      <TouchableOpacity
        style={[styles.button, styles.buttonGradientBg]}
        onPress={handleRegister}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>
          {loading ? "Loading..." : "Register"}
        </Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={{ color: "#5a8a6e", fontSize: 13 }}>Or Continue With</Text>
        <View style={styles.dividerLine} />
      </View>

      <Google_pressable onPress={handleGoogleSignIn} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Have Account Already? </Text>
        <Pressable onPress={goToLogin}>
          <Text style={styles.link}>Login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
