import { TextInput, View, Text } from "react-native";
import styles from "@/app/(auth)/styles";

interface Password_inputProps {
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  label?: string;
}

export default function Password_input({
  password,
  setPassword,
  showPassword,
  label = "Password",
}: Password_inputProps) {
  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder="••••••••"
        placeholderTextColor="#5a8a6e"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        autoComplete="password"
        textContentType="password"
        autoCapitalize="none"
      />
    </View>
  );
}