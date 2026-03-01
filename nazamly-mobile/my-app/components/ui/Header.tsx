import { View, Text, Image, ImageSourcePropType } from "react-native";
import styles from "@/app/(auth)/styles";
const Logo: ImageSourcePropType = require("@/assets/images/Logo design for a mo.png");

export default function Header() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={Logo} style={styles.logoImage} />
      </View>
      <Text style={{ color: "#e8f9f0", fontSize: 15, fontWeight: "600" }}>
        Learn With No Limits
      </Text>
      <Text style={styles.headerSubtitle}>
        Start your journey with Nazamly now
      </Text>
    </View>
  );
}