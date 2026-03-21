import { useState, useEffect } from "react";
import {
  TouchableOpacity,
  ScrollView,
  View,
  Text,
  Alert,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import styles from "./styles";
import Email_input from "@/components/ui/Email_input";
import Password_input from "@/components/ui/Password_input";
import Show_toggle from "@/components/ui/Show_toggle";
import Header from "@/components/ui/Header";
import {
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, API_URL, GOOGLE_WEB_CLIENT_ID } from "@/firebase";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

// SDK 55 removed makeRedirectUri proxy support; auth.expo.io proxy still works at runtime
const redirectUri = "https://auth.expo.io/@ZemonZE/my-app";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (request) {
      console.log("[Login] Google OAuth redirectUri:", request.redirectUri);
    }
  }, [request]);

  const syncWithBackend = async (user: any) => {
    const token = await user.getIdToken(true);
    const res = await fetch(`${API_URL}/api/auth/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await res.json();
    if (!res.ok) {
      console.error("[Login] /api/auth/sync failed:", res.status, body);
    }
    return body;
  };

  useEffect(() => {
    console.log(
      "[Login] AuthSession response:",
      JSON.stringify(response, null, 2),
    );
    if (response?.type === "success") {
      const { id_token } = response.params;
      console.log("[Login] id_token received:", id_token ? "yes" : "no");
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(async (result) => {
          await syncWithBackend(result.user);
          Alert.alert("Success", "Login successfully");
          router.replace("/(tabs)/HomePage");
        })
        .catch((error: any) => {
          console.error(
            "[Login] Firebase signIn error:",
            error.code,
            error.message,
          );
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

      <View style={styles.footer}>
        <Text style={styles.footerText}>{"Don't have an account?  "}</Text>
        <Pressable onPress={notRegistered}>
          <Text style={styles.link}>Register</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
