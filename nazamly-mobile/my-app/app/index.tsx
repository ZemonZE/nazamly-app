import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // Redirect to HomePage if authenticated, otherwise to Login
  if (user) {
    return <Redirect href="/(tabs)/HomePage" />;
  } else {
    return <Redirect href="/(auth)/Login" />;
  }
}
