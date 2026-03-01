import {TextInput, View} from 'react-native';
import styles from '@/app/(auth)/styles';
interface Email_inputProps {
    email: string;
    setEmail: (email: string) => void;
}
export default function Email_input({ email, setEmail }: Email_inputProps) {
  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="البريد الالكتروني"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        autoCapitalize="none"
        />
    </View>
  );
}
