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
import Google_pressable from "@/components/ui/Google_pressable";
import Show_toggle from "@/components/ui/Show_toggle";
import Header from "@/components/ui/Header";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      
      Alert.alert("Success", "Login successfully");
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Failed", "Failed to login, check your data");
      console.log(error);
    }
  };  


  const notRegistered = () => {
    router.push("/(auth)/Register");
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
        <Text style={{ color: "#999999", fontSize: 12 }}>Login </Text>
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

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <View>
        <Text style={styles.orText}>Or Continue With</Text>
      </View>
      <Google_pressable />


      <View style={styles.footer}>
        <Text>{"Don't have an account?  "}</Text>
        <Pressable onPress={notRegistered}>
          <Text style={styles.link}>Register</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
