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

import CategoryPickerModal from "@/components/category-picker-modal";
import TopicModePickerModal from "@/components/topic-mode-picker-modal";
import { STUDY_TOPICS, type StudyTopic } from "@/constants/quiz-topics";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchTopicMastery } from "@/services/quiz/learning-sessions-service";
import type { TopicMastery } from "@/types/learning-session";

type TopicMode = "mcq" | "oral_exam";

export default function TopicsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const isDark = colorScheme === "dark";
  const palette = Colors[colorScheme ?? "light"];

  const [topicMastery, setTopicMastery] = useState<TopicMastery[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<StudyTopic | null>(null);
  const [selectedMode, setSelectedMode] = useState<TopicMode | null>(null);
  const [showModePicker, setShowModePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const loadData = useCallback(async () => {
    const mastery = await fetchTopicMastery();
    setTopicMastery(mastery);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const topicMap = useMemo(() => {
    const map = new Map<string, TopicMastery>();
    for (const entry of topicMastery) {
      map.set(entry.topic.toLowerCase(), entry);
    }
    return map;
  }, [topicMastery]);

  const openModePicker = (topic: StudyTopic) => {
    setSelectedTopic(topic);
    setShowModePicker(true);
  };

  const handleSelectMode = (mode: TopicMode) => {
    setSelectedMode(mode);
    setShowModePicker(false);
    setShowCategoryPicker(true);
  };

  const handleCategorySelect = (category: string) => {
    if (!selectedTopic || !selectedMode) return;

    const encodedCategory = encodeURIComponent(category);
    const encodedTopic = encodeURIComponent(selectedTopic.label);

    setShowCategoryPicker(false);
    setSelectedMode(null);
    setSelectedTopic(null);

    if (selectedMode === "mcq") {
      router.push(`/test-setup?mode=mcq&category=${encodedCategory}&topic=${encodedTopic}`);
      return;
    }

    router.push(`/test-setup?mode=oral_exam&category=${encodedCategory}&topic=${encodedTopic}`);
  };

  const closeCategoryPicker = () => {
    setShowCategoryPicker(false);
    setSelectedMode(null);
    setSelectedTopic(null);
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
          <Text style={[styles.headerTitle, { color: palette.text }]}>All Topics</Text>
          <Text style={styles.headerSubtitle}>Choose topic, then mode</Text>
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
        <View style={styles.topicsGrid}>
          {STUDY_TOPICS.map((topic) => {
            const mastery = topicMap.get(topic.label.toLowerCase());
            const percentage = mastery?.averagePercentage ?? 0;
            const sessions = mastery?.totalSessions ?? 0;

            return (
              <TouchableOpacity
                key={topic.id}
                activeOpacity={0.9}
                style={[
                  styles.topicCard,
                  {
                    backgroundColor: isDark ? "rgba(15,15,23,0.5)" : "#ffffff",
                    borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
                  },
                ]}
                onPress={() => openModePicker(topic)}
              >
                <View style={styles.topicTopRow}>
                  <View
                    style={[
                      styles.topicIconWrap,
                      { backgroundColor: topic.bgColor },
                    ]}
                  >
                    <MaterialIcons
                      name={topic.icon as keyof typeof MaterialIcons.glyphMap}
                      size={24}
                      color={topic.color}
                    />
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={palette.mutedText} />
                </View>

                <Text style={[styles.topicLabel, { color: palette.text }]}>{topic.label}</Text>

                <View style={styles.topicStatsRow}>
                  <Text style={[styles.topicMastery, { color: palette.mutedText }]}>
                    {percentage}% Mastery
                  </Text>
                  <Text style={styles.topicSessions}>{sessions} sessions</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <TopicModePickerModal
        visible={showModePicker}
        topicLabel={selectedTopic?.label ?? ""}
        onClose={() => {
          setShowModePicker(false);
          setSelectedMode(null);
          setSelectedTopic(null);
        }}
        onSelect={handleSelectMode}
      />

      <CategoryPickerModal
        visible={showCategoryPicker}
        onClose={closeCategoryPicker}
        onSelect={handleCategorySelect}
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
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  topicCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  topicTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  topicIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  topicLabel: {
    fontSize: 15,
    fontWeight: "700",
    minHeight: 38,
  },
  topicStatsRow: {
    marginTop: 10,
  },
  topicMastery: {
    fontSize: 12,
    fontWeight: "500",
  },
  topicSessions: {
    marginTop: 2,
    color: "#5b13ec",
    fontSize: 11,
    fontWeight: "600",
  },
});
