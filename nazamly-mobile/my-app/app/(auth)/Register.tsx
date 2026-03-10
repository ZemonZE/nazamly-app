import { useState, useEffect } from "react";
import {
  TextInput,
  TouchableOpacity,
  ScrollView,
  Text,
  Alert,
  Pressable,
  View,
} from "react-native";
import { useRouter } from "expo-router";
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
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, API_URL, GOOGLE_WEB_CLIENT_ID } from "@/firebase";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

// SDK 55 removed makeRedirectUri proxy support; auth.expo.io proxy still works at runtime
const redirectUri = "https://auth.expo.io/@ZemonZE/my-app";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (request) {
      console.log("[Register] Google OAuth redirectUri:", request.redirectUri);
    }
  }, [request]);

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
      console.error("[Register] /api/auth/sync failed:", res.status, body);
    }
    return body;
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
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(result.user, { displayName: name });
      await syncWithBackend(result.user);
      Alert.alert("Success", "Registration successful");
      router.replace("/(tabs)/HomePage");
    } catch (error: any) {
      Alert.alert("Failed", error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

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

      <Google_pressable onPress={() => promptAsync()} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Have Account Already? </Text>
        <Pressable onPress={goToLogin}>
          <Text style={styles.link}>Login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
