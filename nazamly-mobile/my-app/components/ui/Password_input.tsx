import { TextInput, View } from 'react-native';
import styles from '@/app/(auth)/styles';
interface Password_inputProps {
    password: string;
    setPassword: (password: string) => void;
    showPassword: boolean;
}
export default function Password_input({ password, setPassword, showPassword }: Password_inputProps) {
    return (
        <View>
            <TextInput
                style={styles.input}
                placeholder="كلمة المرور"
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