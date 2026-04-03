import { Tabs } from 'expo-router';
import React from 'react';
import { Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';

import { HapticTab } from "@/components/haptic-tab";
import { useAppTheme } from "@/constants/theme";

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.indigo,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.bg,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 18,
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: colors.card,
          borderRadius: 24,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
        },
        tabBarShowLabel: true,
        tabBarItemStyle: {},
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="HomePage"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="TimeTable"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="calendar-month"
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Generator"
        options={{
          title: "Generator",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="Questions"
        options={{
          title: "Library",
          tabBarIcon: ({ color }) => (
            <Feather name="book-open" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="GpaPlanner"
        options={{
          href: null,
          title: "GpaPlanner",
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />

    </Tabs>
  );
}
