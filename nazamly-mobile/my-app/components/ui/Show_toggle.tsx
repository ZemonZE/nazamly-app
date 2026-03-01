import { Switch, Text, View } from "react-native";
import styles from "@/app/(auth)/styles";

interface Show_toggleProps {
  showPassword: boolean;
  setShowPassword: (showPassword: boolean) => void;
}

export default function Show_toggle({
  showPassword,
  setShowPassword,
}: Show_toggleProps) {
  return (
    <View style={styles.switchContainer}>
      <Switch
        value={showPassword}
        onValueChange={setShowPassword}
        trackColor={{ false: "rgba(34,200,116,0.15)", true: "#16a85e" }}
        thumbColor={showPassword ? "#22c874" : "#5a8a6e"}
      />
      <Text style={styles.switchLabel}>Show Password</Text>
    </View>
  );
}