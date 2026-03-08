import { useState } from "react";
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
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, API_URL } from "@/firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      console.error("[Login] /api/auth/sync failed:", res.status, body);
    }
    return body;
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncWithBackend(result.user);
      Alert.alert("Success", "Login successfully");
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Failed", error.message || "Failed to login, check your data");
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
        <Text style={styles.buttonText}>{loading ? "Loading..." : "Login"}</Text>
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
