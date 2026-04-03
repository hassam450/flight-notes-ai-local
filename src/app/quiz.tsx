import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DEFAULT_QUIZ_COUNT, QUIZ_TIMER_SECONDS } from "@/constants/quiz-topics";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getPrebuiltMcqQuestions } from "@/services/quiz/prebuilt-assessments-service";
import { fetchQuizQuestions } from "@/services/quiz/quiz-service";
import type { AssessmentSourceMode } from "@/types/assessment";
import type { QuizAttempt, QuizQuestion } from "@/types/quiz";

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    topic?: string;
    sourceMode?: AssessmentSourceMode;
    noteIds?: string;
    targetCategory?: string;
    prebuiltSetId?: string;
    questionCount?: string;
  }>();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const isDark = colorScheme === "dark";
  const palette = Colors[colorScheme ?? "light"];
  const sourceMode: AssessmentSourceMode = params.sourceMode === "notes_ai" ? "notes_ai" : "prebuilt";
  const category = params.targetCategory || params.category || "PPL";
  const topic = params.topic || "";
  const prebuiltSetId = params.prebuiltSetId || "";
  const noteIdsParam = params.noteIds || "";
  const noteIds = useMemo(
    () =>
      noteIdsParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [noteIdsParam],
  );
  const requestedCount = Number(params.questionCount) || DEFAULT_QUIZ_COUNT;
  const timerSeconds = Math.round(QUIZ_TIMER_SECONDS * (requestedCount / DEFAULT_QUIZ_COUNT));

  // ── State ──────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(timerSeconds);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  // ── Load Questions ─────────────────────────────────────────────
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        sourceMode === "prebuilt"
          ? getPrebuiltMcqQuestions({
              category,
              prebuiltSetId: prebuiltSetId || undefined,
              topic: topic || undefined,
              count: requestedCount,
            })
          : await fetchQuizQuestions({
              category,
              count: requestedCount,
              topic: topic || undefined,
              sourceMode: "notes_ai",
              noteIds,
              targetCategory: category,
            });
      if (data.length === 0) {
        throw new Error(
          sourceMode === "prebuilt"
            ? "No prebuilt questions available for this category."
            : "No questions generated from the selected notes.",
        );
      }
      setQuestions(data);
      startTimeRef.current = Date.now();
      setTimeRemaining(timerSeconds);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load quiz.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [category, noteIds, prebuiltSetId, requestedCount, sourceMode, timerSeconds, topic]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  // ── Timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || error || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time up → go to results
          if (timerRef.current) clearInterval(timerRef.current);
          navigateToResults();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, questions.length]);

  // ── Helpers ────────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex];
  const progressPercent =
    questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (index: number) => {
    if (hasAnswered) return;
    setSelectedOption(index);
    setHasAnswered(true);

    const isCorrect = index === currentQuestion.correctIndex;
    setAttempts((prev) => [
      ...prev,
      {
        questionIndex: currentIndex,
        selectedIndex: index,
        correctIndex: currentQuestion.correctIndex,
        isCorrect,
      },
    ]);
  };

  const navigateToResults = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    const questionsJson = encodeURIComponent(JSON.stringify(questions));
    const attemptsJson = encodeURIComponent(JSON.stringify(attempts));
    router.replace(
      `/quiz-results?questions=${questionsJson}&attempts=${attemptsJson}&time=${elapsed}&category=${encodeURIComponent(category)}&topic=${encodeURIComponent(topic)}&sourceMode=${encodeURIComponent(sourceMode)}&prebuiltSetId=${encodeURIComponent(prebuiltSetId)}&noteIds=${encodeURIComponent(noteIds.join(","))}` as any,
    );
  }, [questions, attempts, category, topic, router, sourceMode, prebuiltSetId, noteIds]);

  const handleContinue = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setHasAnswered(false);
    } else {
      navigateToResults();
    }
  };

  const handleClose = () => {
    Alert.alert(
      "Quit Quiz?",
      "Your progress will be lost. Are you sure you want to quit?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Quit",
          style: "destructive",
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            router.back();
          },
        },
      ],
    );
  };

  // ── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <View
        style={[styles.container, styles.center, { backgroundColor: palette.background }]}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={[styles.loadingText, { color: palette.mutedText }]}>
          {sourceMode === "prebuilt" ? "Loading prebuilt quiz..." : "Generating quiz questions..."}
        </Text>
      </View>
    );
  }

  if (error || !currentQuestion) {
    return (
      <View
        style={[styles.container, styles.center, { backgroundColor: palette.background }]}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <MaterialIcons name="error-outline" size={48} color={palette.error} />
        <Text
          style={[styles.errorText, { color: palette.text, marginTop: 12 }]}
        >
          {error || "No questions available."}
        </Text>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.retryButton}
          onPress={() => void loadQuestions()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.retryButton, { backgroundColor: "transparent", marginTop: 8 }]}
          onPress={handleClose}
        >
          <Text style={[styles.retryButtonText, { color: palette.primary }]}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Top App Bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.closeButton}
          onPress={handleClose}
        >
          <MaterialIcons name="close" size={24} color={palette.mutedText} />
        </TouchableOpacity>

        <Text style={[styles.questionCounter, { color: palette.mutedText }]}>
          Question {currentIndex + 1} of {questions.length}
        </Text>

        <View
          style={[
            styles.timerBadge,
            {
              backgroundColor: isDark ? "rgba(91,19,236,0.1)" : "rgba(91,19,236,0.08)",
              borderColor: isDark ? "rgba(91,19,236,0.2)" : "rgba(91,19,236,0.15)",
            },
          ]}
        >
          <MaterialIcons name="timer" size={14} color="#5b13ec" />
          <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View
        style={[
          styles.progressBarTrack,
          {
            backgroundColor: isDark ? "rgba(91,19,236,0.2)" : "#e5e7eb",
          },
        ]}
      >
        <View
          style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
        />
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Card */}
        <View
          style={[
            styles.questionCard,
            {
              backgroundColor: isDark ? "rgba(91,19,236,0.05)" : "#ffffff",
              borderColor: isDark ? "rgba(91,19,236,0.2)" : "#e5e7eb",
            },
          ]}
        >
          <View style={styles.topicBadge}>
            <MaterialIcons name="flight-takeoff" size={12} color="#5b13ec" />
            <Text style={styles.topicBadgeText}>
              {currentQuestion.topic}
            </Text>
          </View>
          <Text style={[styles.questionText, { color: palette.text }]}>
            {currentQuestion.question}
          </Text>
          <Text style={[styles.questionHint, { color: palette.mutedText }]}>
            Select the most appropriate answer based on current FAA FAR/AIM regulations.
          </Text>
        </View>

        {/* Answer Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrect = index === currentQuestion.correctIndex;
            const isWrongSelection = hasAnswered && isSelected && !isCorrect;
            const isCorrectReveal = hasAnswered && isCorrect;
            const isDisabled = hasAnswered && !isSelected && !isCorrect;

            let borderColor = isDark ? "rgba(91,19,236,0.2)" : "#e5e7eb";
            let bgColor = isDark ? "rgba(91,19,236,0.05)" : "#ffffff";
            let indicatorBorder = isDark ? "rgba(91,19,236,0.4)" : "#d1d5db";
            let indicatorBg = "transparent";
            let indicatorContent: React.ReactNode = (
              <Text
                style={[
                  styles.optionLetter,
                  {
                    color: isDark ? "rgba(91,19,236,0.4)" : "#9ca3af",
                  },
                ]}
              >
                {OPTION_LETTERS[index]}
              </Text>
            );

            if (isWrongSelection) {
              borderColor = "#ef4444";
              bgColor = "rgba(239,68,68,0.05)";
              indicatorBorder = "#ef4444";
              indicatorBg = "#ef4444";
              indicatorContent = (
                <MaterialIcons name="close" size={14} color="#ffffff" />
              );
            } else if (isCorrectReveal) {
              borderColor = "#10b981";
              bgColor = "rgba(16,185,129,0.05)";
              indicatorBorder = "#10b981";
              indicatorBg = "#10b981";
              indicatorContent = (
                <MaterialIcons name="check" size={14} color="#ffffff" />
              );
            }

            return (
              <TouchableOpacity
                key={index}
                activeOpacity={hasAnswered ? 1 : 0.7}
                style={[
                  styles.optionButton,
                  {
                    borderColor,
                    backgroundColor: bgColor,
                    borderWidth: isWrongSelection || isCorrectReveal ? 2 : 1,
                    opacity: isDisabled ? 0.5 : 1,
                  },
                ]}
                onPress={() => handleSelectOption(index)}
                disabled={hasAnswered}
              >
                <View
                  style={[
                    styles.optionIndicator,
                    {
                      borderColor: indicatorBorder,
                      backgroundColor: indicatorBg,
                    },
                  ]}
                >
                  {indicatorContent}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    { color: palette.text },
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explanation (shown after answering) */}
        {hasAnswered && currentQuestion.explanation ? (
          <View
            style={[
              styles.explanationCard,
              {
                borderColor: isDark ? "rgba(91,19,236,0.3)" : "rgba(91,19,236,0.2)",
                backgroundColor: isDark ? "rgba(91,19,236,0.05)" : "rgba(91,19,236,0.03)",
              },
            ]}
          >
            <View style={styles.explanationHeader}>
              <View style={styles.explanationTitleRow}>
                <MaterialIcons name="auto-stories" size={18} color="#5b13ec" />
                <Text style={styles.explanationTitle}>EXPLANATION</Text>
              </View>
              {currentQuestion.reference ? (
                <View style={styles.referenceBadge}>
                  <Text style={styles.referenceText}>
                    {currentQuestion.reference}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[
                styles.explanationBody,
                { color: isDark ? "#cbd5e1" : "#475569" },
              ]}
            >
              {currentQuestion.explanation}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Bottom Actions ── */}
      {hasAnswered ? (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: palette.background,
              borderTopColor: isDark
                ? "rgba(91,19,236,0.2)"
                : "#e5e7eb",
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              {currentIndex < questions.length - 1 ? "Continue" : "View Results"}
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  scrollView: {
    flex: 1,
  },

  // Loading / Error
  loadingText: {
    fontSize: 14,
    marginTop: 16,
  },
  errorText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#5b13ec",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Top Bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    padding: 4,
  },
  questionCounter: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  timerText: {
    color: "#5b13ec",
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  // Progress Bar
  progressBarTrack: {
    height: 5,
    borderRadius: 999,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#5b13ec",
    borderRadius: 999,
  },

  // Question Card
  questionCard: {
    borderRadius: 14,
    padding: 22,
    borderWidth: 1,
    marginBottom: 20,
  },
  topicBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(91,19,236,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 14,
  },
  topicBadgeText: {
    color: "#5b13ec",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  questionText: {
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 26,
  },
  questionHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },

  // Options
  optionsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
  },
  optionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetter: {
    fontSize: 11,
    fontWeight: "700",
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },

  // Explanation
  explanationCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  explanationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  explanationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  explanationTitle: {
    color: "#5b13ec",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  referenceBadge: {
    backgroundColor: "rgba(91,19,236,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  referenceText: {
    color: "#5b13ec",
    fontSize: 9,
    fontWeight: "700",
  },
  explanationBody: {
    fontSize: 13,
    lineHeight: 20,
  },

  // Bottom Bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#5b13ec",
    height: 50,
    borderRadius: 14,
    shadowColor: "#5b13ec",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
