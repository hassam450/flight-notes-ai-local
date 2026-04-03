import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";

type Palette = typeof Colors.light;

type AppUserHeaderProps = {
  palette: Palette;
  isDark: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppUserHeader({ palette, isDark, style }: AppUserHeaderProps) {
  const { user } = useAuth();

  const displayName =
    user?.user_metadata?.full_name?.toString().trim() ||
    user?.email?.split("@")[0] ||
    "Pilot";
  const avatarUrl = user?.user_metadata?.avatar_url?.toString();

  return (
    <View style={[styles.header, style]}>
      <View style={styles.profileRow}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarFallbackText}>
              {displayName.slice(0, 1).toUpperCase()}
            </Text>
          )}
        </View>
        <View>
          <Text style={[styles.welcomeLabel, { color: palette.mutedText }]}>
            Welcome back,
          </Text>
          <Text style={[styles.welcomeTitle, { color: palette.text }]}>
            {displayName}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.notificationButton,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb",
          },
        ]}
      >
        <MaterialIcons
          name="notifications-none"
          size={22}
          color={isDark ? "#d1d5db" : "#4b5563"}
        />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(91,19,236,0.5)",
    backgroundColor: "rgba(91,19,236,0.16)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallbackText: {
    color: "#5b13ec",
    fontSize: 18,
    fontWeight: "700",
  },
  welcomeLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  welcomeTitle: {
    fontSize: 31,
    lineHeight: 35,
    fontWeight: "700",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
});
