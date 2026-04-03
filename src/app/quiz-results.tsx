import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { saveSession } from "@/services/quiz/learning-sessions-service";
import { calculateQuizResult } from "@/services/quiz/quiz-service";
import type { AssessmentSourceMode } from "@/types/assessment";
import type { QuizAttempt, QuizQuestion } from "@/types/quiz";

export default function QuizResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    questions?: string;
    attempts?: string;
    time?: string;
    category?: string;
    topic?: string;
    sourceMode?: AssessmentSourceMode;
    prebuiltSetId?: string;
    noteIds?: string;
    // Oral exam mode params (pre-calculated)
    mode?: string;
    score?: string;
    total?: string;
    percentage?: string;
    timeTaken?: string;
    strengths?: string;
    weaknesses?: string;
    feedback?: string;
    // History mode (view-only, session already saved)
    fromHistory?: string;
  }>();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const isDark = colorScheme === "dark";
  const palette = Colors[colorScheme ?? "light"];
  const category = params.category || "PPL";
  const topic = params.topic || "";
  const sourceMode: AssessmentSourceMode = params.sourceMode === "notes_ai" ? "notes_ai" : "prebuilt";
  const prebuiltSetId = params.prebuiltSetId || "";
  const noteIds = params.noteIds || "";
  const isOralExam = params.mode === "oral_exam";
  const fromHistory = params.fromHistory === "true";
  const { user } = useAuth();
  const hasSavedRef = useRef(false);

  // ── Parse data from params ────────────────────────────────────
  const result = useMemo(() => {
    if (isOralExam || fromHistory) {
      // Oral exam or history review: results are pre-calculated
      const score = parseInt(params.score || "0", 10);
      const total = parseInt(params.total || "0", 10);
      const percentage = parseInt(params.percentage || "0", 10);
      const timeTakenSeconds = parseInt(params.timeTaken || "0", 10);

      let strengths: { topic: string; correct: number; total: number; percentage: number }[] = [];
      let weaknesses: { topic: string; correct: number; total: number; percentage: number }[] = [];

      try {
        const rawStrengths = JSON.parse(params.strengths || "[]");
        strengths = rawStrengths.map((s: { topic: string; percentage: number }) => ({
          topic: s.topic,
          correct: Math.round((s.percentage / 100) * total),
          total,
          percentage: s.percentage,
        }));
      } catch { /* ignore */ }

      try {
        const rawWeaknesses = JSON.parse(params.weaknesses || "[]");
        weaknesses = rawWeaknesses.map((w: { topic: string; percentage: number }) => ({
          topic: w.topic,
          correct: Math.round((w.percentage / 100) * total),
          total,
          percentage: w.percentage,
        }));
      } catch { /* ignore */ }

      return {
        score,
        total,
        percentage,
        attempts: [],
        strengths,
        weaknesses,
        timeTakenSeconds,
      };
    }

    // MCQ mode: parse questions + attempts
    let parsedQuestions: QuizQuestion[] = [];
    let parsedAttempts: QuizAttempt[] = [];

    try {
      parsedQuestions = JSON.parse(
        decodeURIComponent(params.questions || "[]"),
      );
    } catch {
      parsedQuestions = [];
    }

    try {
      parsedAttempts = JSON.parse(
        decodeURIComponent(params.attempts || "[]"),
      );
    } catch {
      parsedAttempts = [];
    }

    const timeTaken = parseInt(params.time || "0", 10);
    return calculateQuizResult(parsedQuestions, parsedAttempts, timeTaken);
  }, [isOralExam, fromHistory, params]);

  const oralFeedback = params.feedback || "";


  // ── Persist result to learning_sessions (MCQ only; oral exam saves in its own screen) ──
  useEffect(() => {
    if (isOralExam || fromHistory) return; // Oral exam session already saved; history already persisted
    if (hasSavedRef.current || !user || !result || result.total === 0) return;
    hasSavedRef.current = true;

    void saveSession({
      user_id: user.id,
      mode: "mcq",
      category,
      topic: topic || null,
      score: result.score,
      total: result.total,
      percentage: result.percentage,
      time_taken_seconds: result.timeTakenSeconds,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
    }).catch((err) =>
      console.warn("Could not save learning session:", err),
    );
  }, [user, result, category, topic, isOralExam, fromHistory]);

  const getScoreMessage = (pct: number) => {
    if (pct >= 90) return "Outstanding, Captain!";
    if (pct >= 75) return "Great progress, Captain!";
    if (pct >= 50) return "Good effort, keep studying!";
    return "Keep practicing, you'll get there!";
  };

  const getScoreIcon = (pct: number): keyof typeof MaterialIcons.glyphMap => {
    if (pct >= 75) return "auto-awesome";
    if (pct >= 50) return "thumb-up";
    return "trending-up";
  };

  const handleRetry = () => {
    const sourceParams =
      `&sourceMode=${encodeURIComponent(sourceMode)}` +
      `&prebuiltSetId=${encodeURIComponent(prebuiltSetId)}` +
      `&noteIds=${encodeURIComponent(noteIds)}`;
    if (isOralExam) {
      const topicParam = topic ? `&topic=${encodeURIComponent(topic)}` : "";
      router.replace(`/oral-exam?category=${encodeURIComponent(category)}${topicParam}${sourceParams}` as any);
    } else {
      const topicParam = topic ? `&topic=${encodeURIComponent(topic)}` : "";
      router.replace(`/quiz?category=${encodeURIComponent(category)}${topicParam}${sourceParams}` as any);
    }
  };

  const handleGoBack = () => {
    if (fromHistory) {
      router.back();
    } else {
      router.replace("/(tabs)/tutor");
    }
  };

  // ── Circular progress SVG dimensions (simplified with View) ──
  const scorePercentage = result.percentage;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Header ── */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 4,
            borderBottomColor: isDark ? "rgba(91,19,236,0.1)" : "#e5e7eb",
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.headerButton}
          onPress={handleGoBack}
        >
          <MaterialIcons name="arrow-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.text }]}>
          Session Results
        </Text>
        <View style={styles.headerButton}>
          <MaterialIcons name="share" size={24} color={palette.text} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Score Section ── */}
        <View style={styles.heroSection}>
          <View style={styles.scoreCircleOuter}>
            {/* Background ring */}
            <View
              style={[
                styles.scoreRingBg,
                { borderColor: isDark ? "rgba(91,19,236,0.1)" : "rgba(91,19,236,0.08)" },
              ]}
            />
            {/* Score text */}
            <View style={styles.scoreTextWrap}>
              <Text style={[styles.scorePercentage, { color: "#5b13ec" }]}>
                {scorePercentage}%
              </Text>
              <Text style={[styles.scoreSubtitle, { color: palette.mutedText }]}>
                Checkride Readiness
              </Text>
            </View>
          </View>

          {/* Score message badge */}
          <View style={styles.scoreBadge}>
            <MaterialIcons
              name={getScoreIcon(scorePercentage)}
              size={18}
              color="#5b13ec"
            />
            <Text style={styles.scoreBadgeText}>
              {getScoreMessage(scorePercentage)}
            </Text>
          </View>

          {/* Quick stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={[styles.quickStatValue, { color: palette.text }]}>
                {result.score}/{result.total}
              </Text>
              <Text style={[styles.quickStatLabel, { color: palette.mutedText }]}>
                Correct
              </Text>
            </View>
            <View
              style={[
                styles.quickStatDivider,
                { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" },
              ]}
            />
            <View style={styles.quickStatItem}>
              <Text style={[styles.quickStatValue, { color: palette.text }]}>
                {formatDuration(result.timeTakenSeconds)}
              </Text>
              <Text style={[styles.quickStatLabel, { color: palette.mutedText }]}>
                Time
              </Text>
            </View>
          </View>
        </View>

        {/* ── Strengths Section ── */}
        {result.strengths.length > 0 ? (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="check-circle" size={22} color="#10b981" />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Strengths
              </Text>
            </View>
            <View
              style={[
                styles.feedbackCard,
                {
                  backgroundColor: isDark ? "rgba(91,19,236,0.05)" : "#f8fafc",
                  borderColor: isDark ? "rgba(91,19,236,0.1)" : "rgba(91,19,236,0.08)",
                },
              ]}
            >
              <View style={styles.topicTags}>
                {result.strengths.map((s) => (
                  <View key={s.topic} style={styles.strengthTag}>
                    <Text style={styles.strengthTagText}>
                      {s.topic.toUpperCase()} ({s.percentage}%)
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.feedbackBody, { color: isDark ? "#cbd5e1" : "#475569" }]}>
                You demonstrated strong knowledge in{" "}
                {result.strengths.map((s) => s.topic).join(", ")}.
                Keep up the great work!
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Weaknesses Section ── */}
        {result.weaknesses.length > 0 ? (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="warning" size={22} color="#f59e0b" />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Weaknesses
              </Text>
            </View>
            <View
              style={[
                styles.feedbackCard,
                {
                  backgroundColor: isDark ? "rgba(91,19,236,0.05)" : "#f8fafc",
                  borderColor: isDark ? "rgba(91,19,236,0.1)" : "rgba(91,19,236,0.08)",
                },
              ]}
            >
              <View style={styles.topicTags}>
                {result.weaknesses.map((w) => (
                  <View key={w.topic} style={styles.weaknessTag}>
                    <Text style={styles.weaknessTagText}>
                      {w.topic.toUpperCase()} ({w.percentage}%)
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.feedbackBody, { color: isDark ? "#cbd5e1" : "#475569" }]}>
                Focus on{" "}
                {result.weaknesses.map((w) => w.topic).join(", ")} to improve
                your overall score. Review related study materials and practice
                more questions in these areas.
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Oral Exam Feedback ── */}
        {isOralExam && oralFeedback ? (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="chat" size={22} color="#5b13ec" />
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                Examiner Feedback
              </Text>
            </View>
            <View
              style={[
                styles.feedbackCard,
                {
                  backgroundColor: isDark ? "rgba(91,19,236,0.05)" : "#f8fafc",
                  borderColor: isDark ? "rgba(91,19,236,0.1)" : "rgba(91,19,236,0.08)",
                },
              ]}
            >
              <Text style={[styles.feedbackBody, { color: isDark ? "#cbd5e1" : "#475569" }]}>
                {oralFeedback}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Action Buttons ── */}
        <View style={styles.actionsWrap}>
          {!fromHistory ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.primaryAction}
              onPress={handleRetry}
            >
              <Text style={styles.primaryActionText}>Retry Session</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              fromHistory ? styles.primaryAction : styles.secondaryAction,
              !fromHistory && { borderColor: "#5b13ec" },
            ]}
            onPress={handleGoBack}
          >
            <Text style={fromHistory ? styles.primaryActionText : styles.secondaryActionText}>
              {fromHistory ? "Back to History" : "Back to Topics"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // Header
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // Hero Score
  heroSection: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  scoreCircleOuter: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  scoreRingBg: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 10,
  },
  scoreTextWrap: {
    alignItems: "center",
  },
  scorePercentage: {
    fontSize: 48,
    fontWeight: "700",
  },
  scoreSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(91,19,236,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  scoreBadgeText: {
    color: "#5b13ec",
    fontSize: 13,
    fontWeight: "600",
  },
  quickStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 24,
  },
  quickStatItem: {
    alignItems: "center",
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 32,
  },

  // Sections
  sectionWrap: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  feedbackCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  topicTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  strengthTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16,185,129,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  strengthTagText: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  weaknessTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245,158,11,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  weaknessTagText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  feedbackBody: {
    fontSize: 13,
    lineHeight: 20,
  },

  // Actions
  actionsWrap: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  primaryAction: {
    backgroundColor: "#5b13ec",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5b13ec",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryAction: {
    height: 54,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: "#5b13ec",
    fontSize: 16,
    fontWeight: "700",
  },
});
