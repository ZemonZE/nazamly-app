import { Pressable, Text, Image, ImageSourcePropType } from "react-native";
import styles from "@/app/(auth)/styles";
const googleIcon: ImageSourcePropType = require("@/assets/images/google.png");

interface Google_pressableProps {
  onPress?: () => void;
}

export default function Google_pressable({ onPress }: Google_pressableProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.googleButton,
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
    >
      <Image source={googleIcon} style={styles.googleIcon} />
      <Text style={styles.googleText}>Continue with Google</Text>
    </Pressable>
  );
}