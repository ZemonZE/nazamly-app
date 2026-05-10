import { Redirect, router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  ToastAndroid,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";

import { API_URL } from "@/firebase";

const getProfile = async (token: string) => {
  const res = await fetch(`${API_URL}/api/auth/get-profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};
export default function Index() {
  const { user, setBackendUser, isLoading, error } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCompleted, setSyncCompleted] = useState(false);

  useEffect(() => {
    if (error) {
      console.error("Auth check failed:", error);
      if (Platform.OS === "android") {
        ToastAndroid.showWithGravity(
          "Auth check failed",
          ToastAndroid.LONG,
          ToastAndroid.BOTTOM,
        );
      }
    }
  }, [error]);

  useEffect(() => {
    const syncUserAuth = async () => {
      if (user) {
        setIsSyncing(true);
        try {
          const token = await user.getIdToken();
          const response = await getProfile(token);
          if (response.success && response.data) {
            setBackendUser(response.data);
          } else {
            console.log("Failed to get profile:", response);
          }
        } catch (err) {
          console.error("Profile fetch error:", err);
          if (Platform.OS === "android") {
            ToastAndroid.showWithGravity(
              "Failed to load user data",
              ToastAndroid.SHORT,
              ToastAndroid.BOTTOM,
            );
          }
        } finally {
          setIsSyncing(false);
          setSyncCompleted(true);
        }
      } else if (!isLoading) {
        // Not loading and no user, no need to sync
        setSyncCompleted(true);
      }
    };

    if (!isLoading) {
      syncUserAuth();
    }
  }, [user, isLoading, setBackendUser]);

  if (isLoading || isSyncing || !syncCompleted) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return user ? (
    <Redirect href="/(tabs)/HomePage" />
  ) : (
    <Redirect href="/(auth)/Login" />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
});
