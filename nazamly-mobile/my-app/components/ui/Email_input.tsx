import { TextInput, View, Text } from "react-native";
import styles from "@/app/(auth)/styles";

interface Email_inputProps {
  email: string;
  setEmail: (email: string) => void;
}

export default function Email_input({ email, setEmail }: Email_inputProps) {
  return (
    <View>
      <Text style={styles.inputLabel}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="example@email.com"
        placeholderTextColor="#5a8a6e"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        autoCapitalize="none"
      />
    </View>
  );
}
