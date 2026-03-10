import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { Entypo, AntDesign, MaterialIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:
          Colors[colorScheme === "dark" ? "dark" : "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="HomePage"
        options={{
          title: "Home",
          tabBarIcon: ({ color }: { color: string }) => (
            <Entypo name="home" size={24} color="black" />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: "Profile",

          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons
              name="face-man-profile"
              size={24}
              color={"black"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="TimeTable"
        options={{
          title: "TimeTable",

          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialCommunityIcons name="calendar" size={24} color={"black"} />
          ),
        }}
      />
      <Tabs.Screen
        name="Questions"
        options={{
          title: "Questions",

          tabBarIcon: ({ color }: { color: string }) => (
            <MaterialIcons name="quiz" size={24} color="black" />
          ),
        }}
      />
    </Tabs>
  );
}
