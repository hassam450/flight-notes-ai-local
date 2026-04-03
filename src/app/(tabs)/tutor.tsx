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
import CategoryPickerModal from "@/components/category-picker-modal";
import TopicModePickerModal from "@/components/topic-mode-picker-modal";
import { STUDY_TOPICS, type StudyTopic } from "@/constants/quiz-topics";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePaywallGuard } from "@/hooks/use-paywall";
import {
  fetchReadiness,
  fetchTopicMastery,
  fetchTotalPracticeTime,
} from "@/services/quiz/learning-sessions-service";
import type {
  CategoryReadiness,
  TopicMastery,
} from "@/types/learning-session";

export default function TutorScreen() {
  const router = useRouter();
  const { guardedNavigate } = usePaywallGuard();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const isDark = colorScheme === "dark";
  const palette = Colors[colorScheme ?? "light"];

  // ── State ──────────────────────────────────────────────────────
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showOralCategoryPicker, setShowOralCategoryPicker] = useState(false);
  const [showReadinessModePicker, setShowReadinessModePicker] = useState(false);
  const [selectedReadinessCategory, setSelectedReadinessCategory] = useState("");
  const [selectedStudyTopic, setSelectedStudyTopic] = useState<StudyTopic | null>(null);
  const [selectedStudyMode, setSelectedStudyMode] = useState<"mcq" | "oral_exam" | null>(null);
  const [showStudyModePicker, setShowStudyModePicker] = useState(false);
  const [showStudyCategoryPicker, setShowStudyCategoryPicker] = useState(false);
  const [readiness, setReadiness] = useState<CategoryReadiness[]>([]);
  const [topicMastery, setTopicMastery] = useState<TopicMastery[]>([]);
  const [totalPracticeTime, setTotalPracticeTime] = useState(0);

  // ── Load live data on focus ────────────────────────────────────
  const loadData = useCallback(async () => {
    const [r, m, t] = await Promise.all([
      fetchReadiness(),
      fetchTopicMastery(),
      fetchTotalPracticeTime(),
    ]);
    setReadiness(r);
    setTopicMastery(m);
    setTotalPracticeTime(t);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  // ── Helpers ────────────────────────────────────────────────────
  const getReadiness = (category: string) => {
    const found = readiness.find((r) => r.category === category);
    return found ? found.averagePercentage : 0;
  };

  const getMastery = (topicLabel: string) => {
    const found = topicMastery.find(
      (m) => m.topic.toLowerCase() === topicLabel.toLowerCase(),
    );
    return found ? found.averagePercentage : 0;
  };

  const handleCategorySelect = (category: string) => {
    setShowCategoryPicker(false);
    guardedNavigate(`/test-setup?mode=mcq&category=${encodeURIComponent(category)}`);
  };

  const handleOralCategorySelect = (category: string) => {
    setShowOralCategoryPicker(false);
    guardedNavigate(`/test-setup?mode=oral_exam&category=${encodeURIComponent(category)}`);
  };

  const formatPracticeTime = (seconds: number) => {
    if (seconds <= 0) return "0m";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const handleReadinessCardPress = (category: string) => {
    setSelectedReadinessCategory(category);
    setShowReadinessModePicker(true);
  };

  const handleReadinessModeSelect = (mode: "mcq" | "oral_exam") => {
    const category = selectedReadinessCategory;
    if (!category) return;

    setShowReadinessModePicker(false);
    setSelectedReadinessCategory("");

    if (mode === "mcq") {
      guardedNavigate(`/test-setup?mode=mcq&category=${encodeURIComponent(category)}`);
      return;
    }

    guardedNavigate(`/test-setup?mode=oral_exam&category=${encodeURIComponent(category)}`);
  };

  const openStudyModePicker = (topic: StudyTopic) => {
    setSelectedStudyTopic(topic);
    setShowStudyModePicker(true);
  };

  const handleStudyModeSelect = (mode: "mcq" | "oral_exam") => {
    setSelectedStudyMode(mode);
    setShowStudyModePicker(false);
    setShowStudyCategoryPicker(true);
  };

  const handleStudyCategorySelect = (category: string) => {
    if (!selectedStudyTopic || !selectedStudyMode) return;

    const encodedCategory = encodeURIComponent(category);
    const encodedTopic = encodeURIComponent(selectedStudyTopic.label);
    const mode = selectedStudyMode;

    setShowStudyCategoryPicker(false);
    setSelectedStudyMode(null);
    setSelectedStudyTopic(null);

    guardedNavigate(`/test-setup?mode=${mode}&category=${encodedCategory}&topic=${encodedTopic}`);
  };

  const closeStudyCategoryPicker = () => {
    setShowStudyCategoryPicker(false);
    setSelectedStudyMode(null);
    setSelectedStudyTopic(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <AppUserHeader isDark={isDark} palette={palette} />

          {/* ── Certification Readiness ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: palette.mutedText }]}>
              CERTIFICATION READINESS
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => guardedNavigate("/certification-readiness")}
            >
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressGrid}>
            <ProgressCircle
              label="PPL"
              percentage={getReadiness("PPL")}
              change={`${readiness.find((r) => r.category === "PPL")?.totalSessions ?? 0} sessions`}
              isDark={isDark}
              palette={palette}
              onPress={() => handleReadinessCardPress("PPL")}
            />
            <ProgressCircle
              label="Instrument"
              percentage={getReadiness("Instrument")}
              change={`${readiness.find((r) => r.category === "Instrument")?.totalSessions ?? 0} sessions`}
              isDark={isDark}
              palette={palette}
              onPress={() => handleReadinessCardPress("Instrument")}
            />
          </View>

          {/* ── Learning Modes ── */}
          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <Text style={[styles.sectionLabel, { color: palette.mutedText }]}>
              LEARNING MODES
            </Text>
          </View>

          {/* AI Oral Prep Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.oralPrepCard}
            onPress={() => setShowOralCategoryPicker(true)}
          >
            {/* Decorative icon */}
            <View style={styles.oralPrepBgIcon}>
              <MaterialIcons name="record-voice-over" size={64} color="rgba(255,255,255,0.12)" />
            </View>
            <View style={styles.oralPrepContent}>
              <View style={styles.aiPoweredBadge}>
                <Text style={styles.aiPoweredText}>AI POWERED</Text>
              </View>
              <Text style={styles.oralPrepTitle}>AI Oral Prep</Text>
              <Text style={styles.oralPrepDescription}>
                Simulate a real FAA checkride with voice AI.
              </Text>
              <View style={styles.oralPrepButton}>
                <Text style={styles.oralPrepButtonText}>Start Session</Text>
                <MaterialIcons name="arrow-forward" size={14} color="#5b13ec" />
              </View>
            </View>
          </TouchableOpacity>

          {/* MCQ Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.mcqCard,
              {
                backgroundColor: isDark ? "rgba(15,15,23,0.5)" : "#ffffff",
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
              },
            ]}
            onPress={() => setShowCategoryPicker(true)}
          >
            <View style={styles.mcqCardRow}>
              <View style={styles.mcqCardText}>
                <Text style={[styles.mcqTitle, { color: palette.text }]}>
                  Topic Quizzes (MCQs)
                </Text>
                <Text style={[styles.mcqSubtitle, { color: palette.mutedText }]}>
                  Master 500+ FAA practice questions.
                </Text>
                <View style={styles.mcqStatsRow}>
                  <View style={styles.mcqStat}>
                    <MaterialIcons name="check-circle" size={14} color="#5b13ec" />
                    <Text style={styles.mcqStatTextPrimary}>
                      {readiness.reduce((sum, r) => sum + r.totalSessions, 0)} Completed
                    </Text>
                  </View>
                  <View style={styles.mcqStat}>
                    <MaterialIcons name="schedule" size={14} color={palette.mutedText} />
                    <Text style={[styles.mcqStatText, { color: palette.mutedText }]}>
                      {formatPracticeTime(totalPracticeTime)} total
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.mcqIconWrap}>
                <MaterialIcons name="quiz" size={24} color="#5b13ec" />
              </View>
            </View>
          </TouchableOpacity>

          {/* ── Study Topics Grid ── */}
          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <Text style={[styles.sectionLabel, { color: palette.mutedText }]}>
              STUDY TOPICS
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => guardedNavigate("/topics")}
            >
              <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.topicsGrid}>
            {STUDY_TOPICS.slice(0, 4).map((topic) => (
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
                onPress={() => openStudyModePicker(topic)}
              >
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
                <Text style={[styles.topicLabel, { color: palette.text }]}>
                  {topic.label}
                </Text>
                <Text style={[styles.topicMastery, { color: palette.mutedText }]}>
                  {getMastery(topic.label)}% Mastery
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Category Picker Modals ── */}
      <CategoryPickerModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelect={handleCategorySelect}
      />
      <CategoryPickerModal
        visible={showOralCategoryPicker}
        onClose={() => setShowOralCategoryPicker(false)}
        onSelect={handleOralCategorySelect}
      />
      <TopicModePickerModal
        visible={showReadinessModePicker}
        topicLabel={selectedReadinessCategory}
        onClose={() => {
          setShowReadinessModePicker(false);
          setSelectedReadinessCategory("");
        }}
        onSelect={handleReadinessModeSelect}
      />
      <TopicModePickerModal
        visible={showStudyModePicker}
        topicLabel={selectedStudyTopic?.label ?? ""}
        onClose={() => {
          setShowStudyModePicker(false);
          setSelectedStudyMode(null);
          setSelectedStudyTopic(null);
        }}
        onSelect={handleStudyModeSelect}
      />
      <CategoryPickerModal
        visible={showStudyCategoryPicker}
        onClose={closeStudyCategoryPicker}
        onSelect={handleStudyCategorySelect}
      />
    </View>
  );
}

// ── Progress Circle Component ──────────────────────────────────────────────

type ProgressCircleProps = {
  label: string;
  percentage: number;
  change: string;
  isDark: boolean;
  palette: (typeof Colors)["light"];
  onPress?: () => void;
};

function ProgressCircle({
  label,
  percentage,
  change,
  isDark,
  palette,
  onPress,
}: ProgressCircleProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.progressCard,
        {
          backgroundColor: isDark ? "rgba(91,19,236,0.05)" : "#ffffff",
          borderColor: isDark ? "rgba(91,19,236,0.2)" : "#e5e7eb",
        },
      ]}
    >
      {/* Simple text-only progress display */}
      <View style={styles.progressCircle}>
        <View
          style={[
            styles.progressRingOuter,
            { borderColor: isDark ? "#1e162e" : "#e5e7eb" },
          ]}
        />
        <View
          style={[
            styles.progressRingActive,
            {
              borderColor: "#5b13ec",
              borderTopColor: "transparent",
              borderRightColor: percentage > 25 ? "#5b13ec" : "transparent",
              borderBottomColor: percentage > 50 ? "#5b13ec" : "transparent",
              borderLeftColor: percentage > 75 ? "#5b13ec" : "transparent",
              transform: [{ rotate: `${(percentage / 100) * 360 - 90}deg` }],
            },
          ]}
        />
        <Text style={[styles.progressText, { color: palette.text }]}>
          {percentage}%
        </Text>
      </View>
      <Text style={[styles.progressLabel, { color: palette.text }]}>
        {label}
      </Text>
      <Text style={styles.progressChange}>{change}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5b13ec",
    letterSpacing: 0.5,
  },

  // Progress
  progressGrid: {
    flexDirection: "row",
    gap: 14,
  },
  progressCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  progressCircle: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  progressRingOuter: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 5,
  },
  progressRingActive: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 5,
  },
  progressText: {
    fontSize: 18,
    fontWeight: "700",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressChange: {
    fontSize: 10,
    color: "#5b13ec",
    fontWeight: "500",
    marginTop: 2,
  },

  // AI Oral Prep Card
  oralPrepCard: {
    borderRadius: 16,
    overflow: "hidden",
    padding: 22,
    marginBottom: 12,
    backgroundColor: "#5b13ec",
    // Gradient simulation via shadow
    shadowColor: "#5b13ec",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  oralPrepBgIcon: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 16,
  },
  oralPrepContent: {
    zIndex: 1,
  },
  aiPoweredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 10,
  },
  aiPoweredText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  oralPrepTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  oralPrepDescription: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 220,
  },
  oralPrepButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  oralPrepButtonText: {
    color: "#5b13ec",
    fontSize: 13,
    fontWeight: "700",
  },

  // MCQ Card
  mcqCard: {
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    marginBottom: 4,
  },
  mcqCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  mcqCardText: {
    flex: 1,
    marginRight: 12,
  },
  mcqTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  mcqSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  mcqStatsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 14,
  },
  mcqStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mcqStatTextPrimary: {
    fontSize: 11,
    color: "#5b13ec",
    fontWeight: "500",
  },
  mcqStatText: {
    fontSize: 11,
    fontWeight: "500",
  },
  mcqIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(91,19,236,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Study Topics Grid
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  topicCard: {
    width: "47%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  topicIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  topicLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  topicMastery: {
    fontSize: 10,
    marginTop: 3,
  },
});
