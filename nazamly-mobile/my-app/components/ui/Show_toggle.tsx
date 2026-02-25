import { Switch , Text , View } from "react-native";
import styles from "@/app/(auth)/styles";
interface Show_toggleProps {
    showPassword: boolean;
    setShowPassword: (showPassword: boolean) => void;
}
export default function Show_toggle({ showPassword, setShowPassword }: Show_toggleProps) {
    return (
        <View style={styles.switchContainer}>
            <Switch value={showPassword} onValueChange={setShowPassword} />
            <Text>show Password</Text>
          </View>
    );
}