import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider, useThemeMode } from "@/context/ThemeContext";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";

export const unstable_settings = {
  initialRouteName: "(auth)",
  screens: {
    "(auth)": { initialRouteName: "Login" },
    "(tabs)": { initialRouteName: "HomePage" },
  },
};

function RootLayoutNav() {
  const { isDark } = useThemeMode();
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/Login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)/HomePage");
    }
  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: isDark ? '#0F1120' : '#F5F6FA' }}>
        <ActivityIndicator size="large" color="#7986CB" />
      </View>
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
