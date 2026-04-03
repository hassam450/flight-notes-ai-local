import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  createFlashcardsJob,
  getLatestFlashcardsJob,
  getNoteFlashcardsState,
  getNoteSummaryState,
  getNoteTranscriptionState,
  type AiJobRow,
  type NoteFlashcardsState,
  type NoteSummaryState,
  type NoteTranscriptionState,
} from "@/services/ai/ai-jobs-service";

const POLL_MS = 2500;

type FlashcardItem = {
  question: string;
  answer: string;
  keyPoints?: string[];
};

function isActiveStatus(status?: string | null) {
  return status === "queued" || status === "processing";
}

function parseFlashcardsFromResult(result: Record<string, unknown> | null) {
  const raw = result?.flashcards;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const question = typeof row.question === "string" ? row.question : null;
      const answer = typeof row.answer === "string" ? row.answer : null;
      if (!question || !answer) return null;
      const keyPoints = Array.isArray(row.keyPoints)
        ? row.keyPoints.filter((x): x is string => typeof x === "string")
        : [];
      return { question, answer, keyPoints };
    })
    .filter((item): item is FlashcardItem => !!item);
}

export default function FlashcardsScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const [flashcardsNote, setFlashcardsNote] =
    useState<NoteFlashcardsState | null>(null);
  const [flashcardsJob, setFlashcardsJob] = useState<AiJobRow | null>(null);
  const [summaryNote, setSummaryNote] = useState<NoteSummaryState | null>(null);
  const [transcriptionNote, setTranscriptionNote] =
    useState<NoteTranscriptionState | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mastered, setMastered] = useState<Record<number, boolean>>({});
  const [processingSince, setProcessingSince] = useState<number | null>(null);

  const listRef = useRef<FlatList<FlashcardItem> | null>(null);

  const sourceType =
    flashcardsNote?.sourceType ??
    summaryNote?.sourceType ??
    transcriptionNote?.sourceType;
  const noteRemotePath =
    flashcardsNote?.remotePath ??
    summaryNote?.remotePath ??
    transcriptionNote?.remotePath;

  const refresh = useCallback(async () => {
    if (!id?.trim()) {
      setRefreshError("Missing recording id.");
      setLoading(false);
      return;
    }

    try {
      const [
        nextFlashcardsNote,
        nextFlashcardsJob,
        nextSummaryNote,
        nextTranscriptionNote,
      ] = await Promise.all([
        getNoteFlashcardsState(id),
        getLatestFlashcardsJob(id),
        getNoteSummaryState(id),
        getNoteTranscriptionState(id),
      ]);
      setFlashcardsNote(nextFlashcardsNote);
      setFlashcardsJob(nextFlashcardsJob);
      setSummaryNote(nextSummaryNote);
      setTranscriptionNote(nextTranscriptionNote);
      setRefreshError(null);
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : "Could not refresh flashcards."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const cards = useMemo(() => {
    if (flashcardsNote?.flashcards?.length) return flashcardsNote.flashcards;
    return parseFlashcardsFromResult(flashcardsJob?.result_payload ?? null);
  }, [flashcardsJob?.result_payload, flashcardsNote?.flashcards]);

  const processing =
    cards.length === 0 &&
    (!flashcardsJob || isActiveStatus(flashcardsJob.status));
  const isQueued = flashcardsJob?.status === "queued";
  const isProcessingJob = flashcardsJob?.status === "processing";
  const isStalled = !!processingSince && Date.now() - processingSince > 20000;

  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [processing, refresh]);

  useEffect(() => {
    if (processing) {
      setProcessingSince((prev) => prev ?? Date.now());
      return;
    }
    setProcessingSince(null);
  }, [processing]);

  useEffect(() => {
    if (currentIndex > cards.length - 1) {
      setCurrentIndex(0);
      setFlipped(false);
    }
  }, [cards.length, currentIndex]);

  const onRetry = useCallback(async () => {
    if (!id?.trim() || !sourceType || !noteRemotePath) return;
    setRetrying(true);
    try {
      await createFlashcardsJob({
        noteId: id,
        sourceType,
        remotePath: noteRemotePath,
      });
      await refresh();
    } catch (error) {
      setRefreshError(
        error instanceof Error
          ? error.message
          : "Could not regenerate flashcards."
      );
    } finally {
      setRetrying(false);
    }
  }, [id, noteRemotePath, refresh, sourceType]);

  const onGenerate = useCallback(async () => {
    if (!id?.trim() || !sourceType || !noteRemotePath) return;
    setRetrying(true);
    try {
      await createFlashcardsJob({
        noteId: id,
        sourceType,
        remotePath: noteRemotePath,
      });
      await refresh();
    } catch (error) {
      setRefreshError(
        error instanceof Error
          ? error.message
          : "Could not generate flashcards."
      );
    } finally {
      setRetrying(false);
    }
  }, [id, noteRemotePath, refresh, sourceType]);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== currentIndex) {
      setCurrentIndex(next);
      setFlipped(false);
    }
  };

  const progress = cards.length ? ((currentIndex + 1) / cards.length) * 100 : 0;

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          {
            backgroundColor:
              colorScheme === "dark" ? "#161022" : palette.background,
          },
        ]}
      >
        <ActivityIndicator color={palette.primary} />
        <Text style={[styles.supportText, { color: palette.mutedText }]}>
          Loading flashcards...
        </Text>
      </View>
    );
  }

  if (!cards.length && processing) {
    return (
      <View
        style={[
          styles.centered,
          {
            backgroundColor:
              colorScheme === "dark" ? "#161022" : palette.background,
          },
        ]}
      >
        <ActivityIndicator color={palette.primary} />
        <Text style={[styles.supportText, { color: palette.mutedText }]}>
          {isQueued
            ? "Waiting for flashcards worker..."
            : isProcessingJob
              ? "Generating flashcards..."
              : "Preparing flashcards..."}
        </Text>
        {isStalled ? (
          <>
            <Text style={[styles.stalledText, { color: palette.mutedText }]}>
              This is taking longer than expected.
            </Text>
            <View style={styles.stalledActions}>
              <Pressable
                onPress={() => void onRetry()}
                disabled={retrying || !sourceType || !noteRemotePath}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { opacity: pressed || retrying ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {retrying ? "Retrying..." : "Retry Now"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.back()}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor:
            colorScheme === "dark" ? "#161022" : palette.background,
        },
      ]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <MaterialIcons
            name="close"
            size={22}
            color={
              colorScheme === "dark" ? "rgba(255,255,255,0.85)" : palette.text
            }
          />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.sessionLabel}>Study Session</Text>
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Card</Text>
            <Text style={styles.cardCountText}>
              {Math.min(currentIndex + 1, Math.max(cards.length, 1))} of{" "}
              {Math.max(cards.length, 1)}
            </Text>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressValue, { width: `${progress}%` }]} />
        </View>
      </View>

      {!cards.length ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No flashcards yet</Text>
          <Text style={styles.supportText}>
            Generate flashcards from your AI summary.
          </Text>
          <Pressable
            onPress={() => void onGenerate()}
            disabled={retrying || !sourceType || !noteRemotePath}
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: retrying || pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {retrying ? "Generating..." : "Generate Flashcards"}
            </Text>
          </Pressable>
          {refreshError ? (
            <Text style={styles.errorText}>{refreshError}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.mainArea}>
          <View style={styles.cardStackShadow} />
          <FlatList
            ref={listRef}
            data={cards}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            keyExtractor={(_, index) => `card-${index}`}
            renderItem={({ item }) => (
              <View style={[styles.cardPage, { width }]}>
                <Pressable
                  onPress={() => setFlipped((prev) => !prev)}
                  style={styles.flashcard}
                >
                  <View style={styles.glowOrb} />
                  <MaterialIcons
                    name={flipped ? "lightbulb" : "quiz"}
                    size={36}
                    color="rgba(124,69,240,0.75)"
                  />
                  <Text style={styles.flashcardBody}>
                    {flipped ? item.answer : item.question}
                  </Text>
                  <Text style={styles.keyPointHint}>
                    Tap to flip or use the button below
                  </Text>
                </Pressable>
              </View>
            )}
          />

          <View
            style={[
              styles.actions,
              { paddingBottom: Math.max(insets.bottom, 12) + 8 },
            ]}
          >
            <TouchableOpacity
              onPress={() => setFlipped((prev) => !prev)}
              activeOpacity={0.9}
              style={styles.cardActionPrimaryButton}
            >
              <MaterialIcons name="refresh" size={24} color="#fff" />
              <Text style={styles.cardActionPrimaryText}>
                {flipped ? "Show Question" : "Flip Card"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMastered((prev) => ({
                  ...prev,
                  [currentIndex]: !prev[currentIndex],
                }));
                if (currentIndex < cards.length - 1) {
                  listRef.current?.scrollToIndex({
                    index: currentIndex + 1,
                    animated: true,
                  });
                }
              }}
              activeOpacity={0.9}
              style={styles.cardActionSecondaryButton}
            >
              <MaterialIcons name="check-circle" size={24} color="#10b981" />
              <Text style={styles.cardActionSecondaryText}>
                {mastered[currentIndex] ? "Mastered" : "Mark as Mastered"}
              </Text>
            </TouchableOpacity>
          </View>

          {refreshError ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{refreshError}</Text>
              {sourceType && noteRemotePath ? (
                <Pressable
                  onPress={() => void onRetry()}
                  disabled={retrying}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { opacity: pressed || retrying ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.retryText}>
                    {retrying ? "Retrying..." : "Retry"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  supportText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#94a3b8",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerCenter: {
    alignItems: "center",
  },
  sessionLabel: {
    color: "#5b13ec",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 2,
  },
  countRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  countLabel: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  cardCountText: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  progressWrap: {
    paddingHorizontal: 40,
    marginTop: 4,
    marginBottom: 6,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  progressValue: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#5b13ec",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f8fafc",
  },
  stalledText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    color: "#94a3b8",
  },
  stalledActions: {
    marginTop: 8,
    gap: 8,
    width: "100%",
    maxWidth: 280,
  },
  mainArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cardStackShadow: {
    position: "absolute",
    width: "78%",
    height: 360,
    borderRadius: 32,
    backgroundColor: "rgba(91,19,236,0.10)",
    borderWidth: 1,
    borderColor: "rgba(91,19,236,0.22)",
    transform: [{ translateY: 14 }, { scale: 0.95 }],
    opacity: 0.45,
  },
  cardPage: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  flashcard: {
    width: "100%",
    maxWidth: 420,
    minHeight: 360,
    maxHeight: 420,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: "rgba(124,69,240,0.35)",
    backgroundColor: "#1e162e",
    paddingHorizontal: 24,
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    overflow: "hidden",
  },
  glowOrb: {
    position: "absolute",
    width: 128,
    height: 128,
    borderRadius: 999,
    top: -42,
    right: -42,
    backgroundColor: "rgba(91,19,236,0.22)",
  },
  flashcardBody: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "600",
  },
  keyPointHint: {
    marginTop: 4,
    fontSize: 13,
    color: "#94a3b8",
  },
  actions: {
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 18,
    gap: 12,
    marginBottom: 6,
  },
  cardActionPrimaryButton: {
    width: "100%",
    minHeight: 56,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: "#5b13ec",
    shadowColor: "#5b13ec",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },
  cardActionPrimaryText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  cardActionSecondaryButton: {
    width: "100%",
    minHeight: 56,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cardActionSecondaryText: {
    color: "#d1d5db",
    fontSize: 17,
    fontWeight: "600",
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#5b13ec",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#5b13ec",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "600",
  },
  errorWrap: {
    width: "100%",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#ef4444",
    textAlign: "center",
  },
  retryButton: {
    alignSelf: "center",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#5b13ec",
  },
  retryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
