import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopicModePickerModal from "@/components/topic-mode-picker-modal";
import { NOTE_CATEGORIES } from "@/constants/categories";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchReadiness } from "@/services/quiz/learning-sessions-service";
import type { CategoryReadiness } from "@/types/learning-session";

type TopicMode = "mcq" | "oral_exam";

const CATEGORY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  PPL: "flight-takeoff",
  Instrument: "speed",
  Commercial: "local-airport",
  "Multi-Engine": "connecting-airports",
  CFI: "school",
};

export default function CertificationReadinessScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const isDark = colorScheme === "dark";
  const palette = Colors[colorScheme ?? "light"];

  const [readiness, setReadiness] = useState<CategoryReadiness[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showModePicker, setShowModePicker] = useState(false);

  const loadData = useCallback(async () => {
    const rows = await fetchReadiness();
    setReadiness(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const readinessMap = useMemo(() => {
    const map = new Map<string, CategoryReadiness>();
    for (const row of readiness) {
      map.set(row.category, row);
    }
    return map;
  }, [readiness]);

  const openModePicker = (category: string) => {
    setSelectedCategory(category);
    setShowModePicker(true);
  };

  const closeModePicker = () => {
    setShowModePicker(false);
    setSelectedCategory("");
  };

  const handleSelectMode = (mode: TopicMode) => {
    if (!selectedCategory) return;

    setShowModePicker(false);
    const categoryToUse = selectedCategory;
    setSelectedCategory("");

    const encodedCategory = encodeURIComponent(categoryToUse);
    if (mode === "mcq") {
      router.push(`/test-setup?mode=mcq&category=${encodedCategory}`);
      return;
    }

    router.push(`/test-setup?mode=oral_exam&category=${encodedCategory}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}> 
      <StatusBar style={isDark ? "light" : "dark"} />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: isDark ? "rgba(91,19,236,0.1)" : "#e5e7eb",
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="chevron-left" size={28} color="#5b13ec" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Certification Readiness</Text>
          <Text style={styles.headerSubtitle}>All training tracks</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 18,
          paddingBottom: insets.bottom + 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsWrap}>
          {NOTE_CATEGORIES.map((category) => {
            const row = readinessMap.get(category);
            const percentage = row?.averagePercentage ?? 0;
            const sessions = row?.totalSessions ?? 0;

            return (
              <TouchableOpacity
                key={category}
                activeOpacity={0.9}
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? "rgba(15,15,23,0.5)" : "#ffffff",
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
                  },
                ]}
                onPress={() => openModePicker(category)}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.iconWrap}>
                    <MaterialIcons
                      name={CATEGORY_ICONS[category] || "quiz"}
                      size={20}
                      color="#5b13ec"
                    />
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={palette.mutedText} />
                </View>

                <Text style={[styles.categoryLabel, { color: palette.text }]}>{category}</Text>

                <View style={styles.metricsRow}>
                  <Text style={styles.percentText}>{percentage}% Ready</Text>
                  <Text style={[styles.sessionsText, { color: palette.mutedText }]}>
                    {sessions} sessions
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <TopicModePickerModal
        visible={showModePicker}
        topicLabel={selectedCategory}
        onClose={closeModePicker}
        onSelect={handleSelectMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 68,
  },
  backText: {
    color: "#5b13ec",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: -2,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#5b13ec",
    fontWeight: "500",
  },
  headerSpacer: {
    width: 68,
  },
  scrollView: {
    flex: 1,
  },
  cardsWrap: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(91,19,236,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
  },
  metricsRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  percentText: {
    color: "#5b13ec",
    fontSize: 13,
    fontWeight: "700",
  },
  sessionsText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
