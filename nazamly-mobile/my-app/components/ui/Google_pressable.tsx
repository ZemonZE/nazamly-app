import { Pressable , Text , Image , ImageSourcePropType} from "react-native";
import styles from "@/app/(auth)/styles";
const googleIcon: ImageSourcePropType = require("@/assets/images/google.png");

export default function Google_pressable() {
    return (
        <Pressable style={styles.googleButton}>
            <Image source={googleIcon} style={styles.googleIcon} />
            <Text style={styles.googleText}>Google Sign In </Text>
        </Pressable>
    );
}