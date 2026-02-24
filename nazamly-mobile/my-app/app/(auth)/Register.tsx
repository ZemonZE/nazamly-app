import { useState } from "react";
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

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleRegister = () => {
    if (password !== confirmPassword) {
      Alert.alert("Failed", "Passwords do not match", [
        { text: "Ok", onPress: () => console.log("ok") },
        { text: "Try again", onPress: () => router.reload() },
      ]);
      return;
    }
    Alert.alert("Success", "Registration successful");
    router.replace("/(tabs)");
  };

  const goToLogin = () => {
    router.push("/(auth)/Login");
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Header />

      <View
        style={{
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 10,
          marginTop: 10,
        }}
      >
        <Text style={styles.brandName}> Nazamly </Text>
        <Text style={{ color: "#999999", fontSize: 12 }}>Register </Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="الاسم الكامل"
        value={name}
        onChangeText={setName}
      />

      <Email_input email={email} setEmail={setEmail} />

      <Password_input
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
      />

      <Password_input
        password={confirmPassword}
        setPassword={setConfirmPassword}
        showPassword={showPassword}
      />

      <Show_toggle
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <View>
        <Text style={styles.orText}>Or Continue With</Text>
      </View>

      <Google_pressable />

      <View style={styles.footer}>
        <Text>Have Account Already? </Text>
        <Pressable onPress={goToLogin}>
          <Text style={styles.link}>Login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
