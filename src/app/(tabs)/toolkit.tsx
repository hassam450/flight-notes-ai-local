import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppUserHeader } from "@/components/app-user-header";
import { Colors } from "@/constants/theme";
import { usePaywallGuard } from "@/hooks/use-paywall";
import { listThreads } from "@/services/toolkit/aviation-chat-service";
import type { AviationChatThread } from "@/types/aviation-chat";

const SURFACE_BG = "#1E1C29";
const SURFACE_BORDER = "rgba(255,255,255,0.08)";
const HORIZONTAL_PADDING = 20;
const CARD_GAP = 12;

function formatRelativeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getActivityIcon(thread: AviationChatThread) {
  if (thread.sourceMode === "notes_ai") {
    return {
      name: "description" as const,
      color: "#5b13ec",
      backgroundColor: "rgba(91,19,236,0.16)",
    };
  }

  return {
    name: "smart-toy" as const,
    color: "#5b13ec",
    backgroundColor: "rgba(91,19,236,0.16)",
  };
}

export default function ToolkitScreen() {
  const router = useRouter();
  const { guardedNavigate } = usePaywallGuard();
  const insets = useSafeAreaInsets();
  const palette = Colors.dark;

  const [recentThreads, setRecentThreads] = useState<AviationChatThread[]>([]);

  const loadLatestThread = useCallback(async () => {
    try {
      const threads = await listThreads(2);
      setRecentThreads(threads);
    } catch {
      setRecentThreads([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLatestThread();
    }, [loadLatestThread]),
  );

  const toolCards: {
    title: string;
    description: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    iconColor: string;
    iconBackground: string;
    onPress: () => void;
  }[] = [
    {
      title: "CFI Assistant",
      description: "Talk to our CFI Assistant.",
      icon: "smart-toy",
      iconColor: "#5b13ec",
      iconBackground: "rgba(91,19,236,0.16)",
      onPress: () => guardedNavigate("/toolkit/threads"),
    },
    {
      title: "Library",
      description: "Access FAR/AIM & handbooks.",
      icon: "menu-book",
      iconColor: "#3b82f6",
      iconBackground: "rgba(59,130,246,0.16)",
      onPress: () => guardedNavigate("/toolkit/resources"),
    },
    {
      title: "Checklists",
      description: "Pre-flight, run-up, & emergency.",
      icon: "checklist",
      iconColor: "#10b981",
      iconBackground: "rgba(16,185,129,0.16)",
      onPress: () => guardedNavigate("/toolkit/checklists"),
    },
    {
      title: "WX Brief",
      description: "METARs & TAFs.",
      icon: "wb-sunny",
      iconColor: "#f97316",
      iconBackground: "rgba(249,115,22,0.16)",
      onPress: () => guardedNavigate("/toolkit/wx-brief"),
    },
  ];

  const toolRows = toolCards.reduce<typeof toolCards[]>((rows, item, index) => {
    if (index % 2 === 0) rows.push([item]);
    else rows[rows.length - 1].push(item);
    return rows;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: HORIZONTAL_PADDING,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 96,
          gap: 22,
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppUserHeader isDark palette={palette} />

        <View>
          {toolRows.map((row, rowIndex) => (
            <View
              key={`tool-row-${rowIndex}`}
              style={[styles.gridRow, rowIndex < toolRows.length - 1 && styles.gridRowGap]}
            >
              {row.map((item) => (
                <TouchableOpacity
                  key={item.title}
                  onPress={item.onPress}
                  activeOpacity={0.85}
                  style={styles.toolCardPressable}
                >
                  <View style={styles.surfaceCard}>
                    <View style={[styles.iconWrap, { backgroundColor: item.iconBackground }]}>
                      <MaterialIcons name={item.icon} size={22} color={item.iconColor} />
                    </View>
                    <View style={styles.toolTextWrap}>
                      <Text numberOfLines={1} style={[styles.cardTitle, { color: palette.text }]}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={2} style={[styles.cardSub, { color: palette.mutedText }]}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View>
          <View style={styles.activityHeaderRow}>
            <Text style={[styles.activityLabel, { color: palette.mutedText }]}>Recent Activity</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={() => guardedNavigate("/toolkit/threads")}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentThreads.length > 0 ? (
            <View style={styles.activityList}>
              {recentThreads.map((thread) => {
                const activityIcon = getActivityIcon(thread);

                return (
                  <TouchableOpacity
                    key={thread.id}
                    activeOpacity={0.85}
                    style={styles.activityCard}
                    onPress={() => guardedNavigate(`/toolkit/chat/${thread.id}`)}
                  >
                    <View
                      style={[
                        styles.activityIcon,
                        { backgroundColor: activityIcon.backgroundColor },
                      ]}
                    >
                      <MaterialIcons
                        name={activityIcon.name}
                        size={18}
                        color={activityIcon.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={[styles.activityTitle, { color: palette.text }]}
                      >
                        {thread.title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.activitySub, { color: palette.mutedText }]}
                      >
                        {formatRelativeLabel(thread.lastMessageAt)}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={palette.mutedText} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No conversations yet</Text>
              <Text style={[styles.emptySub, { color: palette.mutedText }]}>Start with CFI Assistant to create your first thread.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gridRow: {
    flexDirection: "row",
    gap: CARD_GAP,
  },
  gridRowGap: {
    marginBottom: CARD_GAP,
  },
  toolCardPressable: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  surfaceCard: {
    flex: 1,
    height: 156,
    backgroundColor: SURFACE_BG,
    borderColor: SURFACE_BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "flex-start",
  },

  iconWrap: {
    height: 40,
    width: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  toolTextWrap: {
    width: "100%",
    alignItems: "center",
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
    minHeight: 24,
  },
  cardSub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    minHeight: 36,
  },
  activityHeaderRow: {
    marginTop: 2,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activityLabel: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  viewAll: {
    color: "#6d28d9",
    fontSize: 12,
    fontWeight: "600",
  },
  activityList: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: SURFACE_BG,
    borderColor: SURFACE_BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  activityIcon: {
    height: 40,
    width: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  activityTitle: {
    fontSize: 21,
    fontWeight: "700",
  },
  activitySub: {
    fontSize: 12,
    marginTop: 3,
  },
  emptyCard: {
    backgroundColor: SURFACE_BG,
    borderColor: SURFACE_BORDER,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
  },
});
