import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="Login">
      <Stack.Screen name="Login" />
      <Stack.Screen name="Register" />
    </Stack>
  );
}