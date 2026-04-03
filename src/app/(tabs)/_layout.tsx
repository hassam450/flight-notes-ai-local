import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.mutedText,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          backgroundColor:
            colorScheme === "dark" ? "rgba(22,16,34,0.8)" : "#f6f6f8",
          borderTopColor:
            colorScheme === "dark" ? "rgba(255,255,255,0.05)" : "#e5e7eb",
          position: "absolute",
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={22} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tutor"
        options={{
          title: "Testing",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={22} name="psychology" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="toolkit"
        options={{
          title: "Toolkit",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={22} name="construction" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={22} name="history" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={22} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
